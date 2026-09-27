import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

// Serialize read-modify-write operations so concurrent submissions cannot erase one another.
export function createRepository({ storePath, accountsPath, seedPath }) {
  let queue = Promise.resolve();
  async function read(path, fallback) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return fallback();
    }
  }
  const site = () =>
    read(storePath, async () => JSON.parse(await readFile(seedPath, "utf8")));
  const accounts = () => read(accountsPath, () => ({ users: [] }));
  async function atomicWrite(path, value) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = path + "." + randomUUID() + ".tmp";
    await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", {
      mode: 0o600,
    });
    await rename(temporary, path);
    return value;
  }
  function transaction(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }
  return {
    site,
    accounts,
    updateSite: (update) =>
      transaction(async () => {
        const current = await site();
        const next = await update(current);
        const timestamp = Math.max(
          Date.now(),
          Date.parse(current.meta?.updatedAt || "") + 1 || 0,
        );
        next.meta = {
          ...next.meta,
          updatedAt: new Date(timestamp).toISOString(),
          schemaVersion: 1,
        };
        return atomicWrite(storePath, next);
      }),
    updateAccounts: (update) =>
      transaction(async () => atomicWrite(accountsPath, await update(await accounts()))),
  };
}
