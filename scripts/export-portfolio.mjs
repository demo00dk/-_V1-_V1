import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(await readFile(join(root, "data/site.seed.json"), "utf8"));
if (
  seed.leads?.length ||
  seed.brand?.name !== "demo" ||
  seed.consultant?.wechat !== "demo" ||
  seed.consultant?.qrTarget !== "https://example.org/demo"
) {
  throw new Error("公开样例含非演示联系信息，导出已停止。");
}
// An allowlist deliberately excludes historical PDFs, spreadsheets, private stores and accounts.
const entries = [
  "src",
  "tests",
  "docs",
  "data/site.seed.json",
  "data/README.md",
  "server/app.mjs",
  "server/repository.mjs",
  "server/index.mjs",
  "scripts/export-portfolio.mjs",
  ".github",
  ".gitignore",
  ".gitattributes",
  ".env.example",
  ".prettierrc.json",
  ".prettierignore",
  "package.json",
  "package-lock.json",
  "index.html",
  "tsconfig.json",
  "tsconfig.app.json",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "README.md",
  "TESTING.md",
];
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = join(root, "output", "portfolio", `demo-study-${timestamp}`);
await mkdir(destination, { recursive: true });
for (const entry of entries) {
  const target = join(destination, entry);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, entry), target, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}
async function filesIn(directory) {
  const files = [];
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    if ((await stat(path)).isDirectory()) files.push(...(await filesIn(path)));
    else files.push(path);
  }
  return files;
}
const manifest = [];
const privatePath = new RegExp(
  ["[A-Z]:[\\\\/](?:Users|WORK)", "wx" + "id_"].join("|"),
  "i",
);
for (const path of (await filesIn(destination)).sort()) {
  const bytes = await readFile(path);
  if (
    /\.(?:json|tsx?|mjs|css|md|html|yml)$/.test(path) &&
    privatePath.test(bytes.toString())
  ) {
    // The cross-platform browser test has one intentional generic Edge executable path.
    throw new Error(`发现本机信息，请核查 ${relative(destination, path)}`);
  }
  manifest.push({
    path: relative(destination, path).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  join(destination, "EXPORT-MANIFEST.json"),
  JSON.stringify({ createdAt: new Date().toISOString(), files: manifest }, null, 2) +
    "\n",
);
console.log(`已导出 ${manifest.length} 个文件：${destination}`);
console.log(
  "目录不含账号库、咨询记录或私人原始文件。可在此目录独立安装、测试，再上传 GitHub。",
);
