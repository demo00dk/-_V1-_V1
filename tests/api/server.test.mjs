import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApp } from "../../server/app.mjs";

const password = "test-only-password-123";
const seed = JSON.parse(
  await readFile(new URL("../../data/site.seed.json", import.meta.url), "utf8"),
);
let directory, server, url;
const request = (path, options = {}) => fetch(url + path, options);
const json = (method, body, token) => ({
  method,
  headers: {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});
async function login(username = "admin", pass = password) {
  return (
    await request("/api/auth/login", json("POST", { username, password: pass }))
  ).json();
}
async function start(ttl = 100000) {
  server = createApp({
    root: directory,
    storePath: join(directory, "store.json"),
    accountsPath: join(directory, "accounts.json"),
    seedPath: join(directory, "seed.json"),
    adminPassword: password,
    sessionTtl: ttl,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = `http://127.0.0.1:${server.address().port}`;
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "demo-api-test-"));
  await mkdir(join(directory, "dist"));
  await writeFile(join(directory, "dist", "index.html"), "<h1>demo</h1>");
  await writeFile(
    join(directory, "seed.json"),
    JSON.stringify({ ...seed, leads: [{ name: "private", contact: "do-not-leak" }] }),
  );
  await start();
});
afterEach(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  // Only this test's explicitly created temporary directory is eligible for cleanup.
  if (directory.startsWith(join(tmpdir(), "demo-api-test-")))
    await rm(directory, { recursive: true, force: true });
});

describe("real HTTP API boundaries", () => {
  it("serves the build and health endpoint without exposing storage or source", async () => {
    expect(await (await request("/api/health")).json()).toEqual({ ok: true });
    expect(await (await request("/")).text()).toContain("demo");
    expect((await request("/", { method: "HEAD" })).status).toBe(200);
    for (const path of [
      "/store.json",
      "/seed.json",
      "/server/accounts.json",
      "/src/App.tsx",
      "/api/missing",
    ])
      expect((await request(path)).status).toBe(404);
    expect((await request("/", { method: "POST" })).status).toBe(405);
    expect([403, 404]).toContain((await request("/..%2fseed.json")).status);
  });
  it("never includes consultation records in anonymous or ordinary-user responses", async () => {
    const response = await request("/api/site");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).leads).toEqual([]);
    const registered = await request(
      "/api/auth/register",
      json("POST", { username: "student", password: "secret-123", role: "admin" }),
    );
    expect(registered.status).toBe(201);
    const student = await registered.json();
    expect(student.user.role).toBe("user");
    expect(
      (
        await (
          await request("/api/site", {
            headers: { authorization: `Bearer ${student.token}` },
          })
        ).json()
      ).leads,
    ).toEqual([]);
    const admin = await login();
    expect(
      (
        await (
          await request("/api/site", {
            headers: { authorization: `Bearer ${admin.token}` },
          })
        ).json()
      ).leads[0].contact,
    ).toBe("do-not-leak");
    expect((await request("/api/site", json("PUT", seed, student.token))).status).toBe(
      401,
    );
    expect((await request("/api/site", json("PUT", seed, "forged-token"))).status).toBe(
      401,
    );
  });
  it("uses salted passwords, logs out, and rejects duplicate/reserved registrations", async () => {
    const response = await request(
      "/api/auth/register",
      json("POST", { username: "Student", password: "secret-123" }),
    );
    const student = await response.json();
    expect(student.user.username).toBe("student");
    const stored = JSON.parse(await readFile(join(directory, "accounts.json"), "utf8"));
    expect(stored.users[0].hash).toHaveLength(128);
    expect(JSON.stringify(stored)).not.toContain("secret-123");
    expect((await login("student", "secret-123")).user.role).toBe("user");
    expect(
      (
        await request(
          "/api/auth/register",
          json("POST", { username: "student", password: "secret-123" }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "/api/auth/register",
          json("POST", { username: "admin", password: "secret-123" }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "/api/auth/login",
          json("POST", { username: "student", password: "incorrect" }),
        )
      ).status,
    ).toBe(401);
    const admin = await login();
    expect(
      (await request("/api/auth/logout", json("POST", {}, admin.token))).status,
    ).toBe(200);
    expect((await request("/api/site", json("PUT", seed, admin.token))).status).toBe(401);
  });
  it("protects simultaneous saves with version checks and never lets CMS erase leads", async () => {
    const { token } = await login();
    const edit = {
      ...seed,
      brand: { ...seed.brand, heroTitle: "保存后的标题" },
      leads: [],
    };
    const results = await Promise.all([
      request("/api/site", json("PUT", edit, token)),
      request("/api/site", json("PUT", edit, token)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const saved = await results.find((r) => r.status === 200).json();
    expect(saved.leads).toHaveLength(1);
    expect(saved.meta.updatedAt).not.toBe(seed.meta.updatedAt);
    const conflict = await results.find((r) => r.status === 409).json();
    expect(conflict.latest.meta.updatedAt).toBe(saved.meta.updatedAt);
    expect((await (await request("/api/site")).json()).brand.heroTitle).toBe(
      "保存后的标题",
    );
  });
  it("preserves every concurrent lead and discards unapproved fields", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        request(
          "/api/lead",
          json("POST", {
            name: `student-${index}`,
            contact: "test-contact",
            intent: "硕士",
            role: "admin",
          }),
        ),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const stored = JSON.parse(await readFile(join(directory, "store.json"), "utf8"));
    expect(stored.leads).toHaveLength(9);
    expect(new Set(stored.leads.slice(0, 8).map((l) => l.id)).size).toBe(8);
    expect(stored.leads[0]).not.toHaveProperty("role");
    expect(
      (await request("/api/lead", json("POST", { name: " ", contact: " " }))).status,
    ).toBe(400);
  });
  it("validates malformed bodies, field structure and account constraints", async () => {
    const { token } = await login();
    expect((await request("/api/site", json("PUT", {}, token))).status).toBe(400);
    expect(
      (
        await request(
          "/api/site",
          json("PUT", { ...seed, schools: [{ id: "x", name: "x" }] }, token),
        )
      ).status,
    ).toBe(400);
    for (const body of ["{", "null", "[]"])
      expect((await request("/api/lead", { method: "POST", body })).status).toBe(400);
    expect(
      (
        await request(
          "/api/auth/register",
          json("POST", { username: "x", password: "x" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "/api/lead",
          json("POST", { name: "test", contact: "x".repeat(5 * 1024 * 1024) }),
        )
      ).status,
    ).toBe(413);
  });
  it("rate-limits repeated failed passwords", async () => {
    for (let i = 0; i < 15; i++)
      expect(
        (
          await request(
            "/api/auth/login",
            json("POST", { username: "missing", password: "wrong-password" }),
          )
        ).status,
      ).toBe(401);
    expect(
      (await request("/api/auth/login", json("POST", { username: "admin", password })))
        .status,
    ).toBe(429);
  });
  it("rejects expired sessions and a weak admin configuration", async () => {
    await new Promise((resolve) => server.close(resolve));
    await start(-1);
    const { token } = await login();
    expect((await request("/api/site", json("PUT", seed, token))).status).toBe(401);
    expect(() => createApp({ adminPassword: "short" })).toThrow("12");
  });
  it("recovers its transaction queue after a failed save", async () => {
    const { token } = await login();
    expect(
      (await request("/api/site", json("PUT", { ...seed, meta: {} }, token))).status,
    ).toBe(409);
    expect((await request("/api/site", json("PUT", seed, token))).status).toBe(200);
  });
});
