import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { createApp } from "./app.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const local = process.argv.includes("--local");
const directory = local ? resolve(root, "server") : resolve(root, ".local");
const password = process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
const server = createApp({
  root,
  storePath: resolve(directory, "store.json"),
  accountsPath: resolve(directory, "accounts.json"),
  seedPath: resolve(root, "data/site.seed.json"),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: password,
});
const port = Number(process.env.PORT || 8787);
server.listen(port, "127.0.0.1", () => {
  console.log(`demo · ${local ? "本地资料" : "作品集演示"} · http://localhost:${port}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`本次启动的临时管理员密码：${password}`);
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
