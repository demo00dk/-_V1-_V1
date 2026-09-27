import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import type { Server } from "node:http";
import { createApp } from "../../server/app.mjs";

let server: Server;
let directory: string;
let url: string;
const password = "integration-test-only-password";

test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "demo-browser-test-"));
  const seed = JSON.parse(await readFile("data/site.seed.json", "utf8"));
  seed.leads = [{ id: "private", name: "test-only", contact: "private-contact" }];
  await writeFile(join(directory, "seed.json"), JSON.stringify(seed));
  server = createApp({
    root: resolve("."),
    storePath: join(directory, "store.json"),
    accountsPath: join(directory, "accounts.json"),
    seedPath: join(directory, "seed.json"),
    adminPassword: password,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(async () => {
  if (server)
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  if (directory?.startsWith(join(tmpdir(), "demo-browser-test-")))
    await rm(directory, { recursive: true, force: true });
});

test("真实前后端：管理员登录、保存、匿名读取与退出权限", async ({ page, request }) => {
  await page.goto(url);
  await page.locator(".nav-actions").getByRole("button", { name: "登录 / 注册" }).click();
  await page.getByLabel("账号", { exact: true }).fill("admin");
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/#home$/);
  await page.getByRole("button", { name: "后台管理", exact: true }).click();
  await page.getByRole("button", { name: "品牌与顾问", exact: true }).click();
  await page.getByLabel("首页主标题").fill("真实接口保存验收");
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("已保存");
  const publicSite = await (await request.get(url + "/api/site")).json();
  expect(publicSite.brand.heroTitle).toBe("真实接口保存验收");
  expect(publicSite.leads).toEqual([]);
  await page.getByRole("button", { name: "前台预览" }).click();
  await expect(page.locator("main h1")).toHaveText("真实接口保存验收");
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await expect(page.getByRole("button", { name: "后台管理", exact: true })).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => localStorage.getItem("demo-session"))).toBeNull();
});
