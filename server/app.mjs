import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createRepository } from "./repository.mjs";

const scrypt = promisify(scryptCallback);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const fail = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });
const send = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw fail(413, "提交内容超过 5 MB。");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch {
    throw fail(400, "请求内容不是有效的 JSON 对象。");
  }
}

export function createApp({
  root,
  storePath,
  accountsPath,
  seedPath,
  adminUsername = "admin",
  adminPassword,
  sessionTtl = 8 * 60 * 60 * 1000,
}) {
  if (!adminPassword || adminPassword.length < 12)
    throw new Error("管理员密码至少需要 12 位。");
  const repository = createRepository({ storePath, accountsPath, seedPath });
  const sessions = new Map();
  const failures = new Map();
  const tokenOf = (req) =>
    String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  function userOf(req) {
    const token = tokenOf(req);
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(token);
      return null;
    }
    return session.user;
  }
  function authenticate(account) {
    for (const [token, session] of sessions)
      if (session.expiresAt < Date.now()) sessions.delete(token);
    const token = randomUUID();
    const user = { username: account.username, role: account.role };
    sessions.set(token, { user, expiresAt: Date.now() + sessionTtl });
    return { token, user };
  }
  async function validPassword(password, account) {
    if (!account?.hash || !account?.salt) return false;
    const expected = Buffer.from(account.hash, "hex");
    const actual = await scrypt(password, account.salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  return createServer(async (req, res) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "same-origin");
    res.setHeader("cache-control", "no-store");
    try {
      const url = new URL(req.url || "/", "http://localhost");
      if (url.pathname === "/api/health") return send(res, 200, { ok: true });
      if (url.pathname === "/api/site" && req.method === "GET") {
        const site = await repository.site();
        return send(
          res,
          200,
          userOf(req)?.role === "admin" ? site : { ...site, leads: [] },
        );
      }
      if (url.pathname === "/api/site" && req.method === "PUT") {
        if (userOf(req)?.role !== "admin")
          throw fail(401, "请使用管理员账号登录后保存。");
        const next = await bodyOf(req);
        const requiredArrays = [
          "schools",
          "recommendationRules",
          "journeyMap",
          "serviceSteps",
          "checklists",
          "resources",
          "faqs",
        ];
        if (
          !next.brand?.name ||
          !next.consultant ||
          requiredArrays.some((key) => !Array.isArray(next[key]))
        )
          throw fail(400, "内容结构不完整，未保存。");
        if (
          next.schools.some(
            (school) =>
              !school?.id ||
              !school.name ||
              !["degrees", "majors", "tags"].every((key) => Array.isArray(school[key])),
          )
        )
          throw fail(400, "院校字段不完整。");
        const saved = await repository.updateSite((current) => {
          if (!next.meta?.updatedAt || next.meta.updatedAt !== current.meta.updatedAt)
            throw fail(409, "后台内容已有更新，请载入最新版本。", {
              latest: current,
            });
          // Leads are append-only via their own endpoint, never overwritten by a CMS snapshot.
          return { ...next, leads: current.leads || [] };
        });
        return send(res, 200, saved);
      }
      if (url.pathname === "/api/lead" && req.method === "POST") {
        const body = await bodyOf(req);
        const name = String(body.name || "")
          .trim()
          .slice(0, 80);
        const contact = String(body.contact || "")
          .trim()
          .slice(0, 160);
        if (!name || !contact) throw fail(400, "请填写称呼与联系方式。");
        await repository.updateSite((site) => ({
          ...site,
          leads: [
            {
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              name,
              contact,
              intent: String(body.intent || "").slice(0, 2000),
            },
            ...(site.leads || []),
          ],
        }));
        return send(res, 201, { ok: true });
      }
      if (
        ["/api/auth/login", "/api/auth/register"].includes(url.pathname) &&
        req.method === "POST"
      ) {
        const ip = req.socket.remoteAddress;
        const attempt = failures.get(ip);
        if (attempt?.until > Date.now() && attempt.count >= 15)
          throw fail(429, "尝试过于频繁，请十分钟后重试。");
        const body = await bodyOf(req);
        const username = String(body.username || "")
          .trim()
          .toLowerCase();
        const password = String(body.password || "");
        if (
          !/^[a-z0-9_.-]{3,40}$/.test(username) ||
          password.length < 6 ||
          password.length > 256
        )
          throw fail(400, "账号需为 3–40 位字母、数字或 . _ -，密码需为 6–256 位。");
        if (url.pathname.endsWith("/register")) {
          if (username === adminUsername.toLowerCase())
            throw fail(409, "该账号不可注册。");
          const salt = randomUUID();
          const hash = (await scrypt(password, salt, 64)).toString("hex");
          const account = {
            id: randomUUID(),
            username,
            role: "user",
            salt,
            hash,
            createdAt: new Date().toISOString(),
          };
          await repository.updateAccounts((accounts) => {
            if (accounts.users.some((user) => user.username === username))
              throw fail(409, "该账号已注册。");
            return { users: [...accounts.users, account] };
          });
          return send(res, 201, authenticate(account));
        }
        if (username === adminUsername.toLowerCase() && password === adminPassword) {
          failures.delete(ip);
          return send(res, 200, authenticate({ username, role: "admin" }));
        }
        const account = (await repository.accounts()).users.find(
          (user) => user.username === username,
        );
        if (!account || !(await validPassword(password, account))) {
          for (const [key, value] of failures)
            if (value.until <= Date.now()) failures.delete(key);
          failures.set(ip, {
            count: (attempt?.until > Date.now() ? attempt.count : 0) + 1,
            until: Date.now() + 600000,
          });
          throw fail(401, "账号或密码不正确。");
        }
        failures.delete(ip);
        return send(res, 200, authenticate(account));
      }
      if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        sessions.delete(tokenOf(req));
        return send(res, 200, { ok: true });
      }
      if (url.pathname.startsWith("/api/")) throw fail(404, "未找到接口。");
      if (!["GET", "HEAD"].includes(req.method)) throw fail(405, "请求方法不支持。");
      const dist = resolve(root, "dist");
      const requested = decodeURIComponent(
        url.pathname === "/" ? "/index.html" : url.pathname,
      );
      const file = resolve(dist, "." + requested);
      if (!file.startsWith(dist + sep)) throw fail(403, "路径不可访问。");
      let bytes;
      try {
        bytes = await readFile(file);
      } catch (error) {
        if (error.code === "ENOENT")
          throw fail(404, "文件不存在，请先运行 npm run build。");
        throw error;
      }
      res.writeHead(200, {
        "content-type": mime[extname(file)] || "application/octet-stream",
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch (error) {
      send(res, error.status || 500, {
        message: error.status ? error.message : "服务暂时不可用，请重试。",
        ...(error.latest ? { latest: error.latest } : {}),
      });
    }
  });
}
