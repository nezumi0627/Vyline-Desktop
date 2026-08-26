import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getClient, getLoggedInAt } from "../line/clientManager.js";
import { getToken } from "../storage/tokenStore.js";
import { accountDir } from "../storage/accountDirs.js";

const DATA_DIR =
  process.env.VYLINE_DATA_DIR ?? fileURLToPath(new URL("../../data", import.meta.url));

async function directoryBytes(target: string): Promise<number> {
  if (!existsSync(target)) return 0;
  let total = 0;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const path = join(target, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(path);
    else {
      try {
        total += (await stat(path)).size;
      } catch {
        // Files can disappear while the status is being read.
      }
    }
  }
  return total;
}

export async function getAccountStatus(accountId: string) {
  const token = await getToken(accountId);
  const accountPath = accountDir(accountId);
  const legacyFiles = [
    join(DATA_DIR, `storage-${accountId}.json`),
    join(DATA_DIR, `chatdb-${accountId}.json`),
    join(DATA_DIR, `vyline-${accountId}.json`),
  ];
  const accountBytes =
    (await directoryBytes(accountPath)) +
    (
      await Promise.all(
        legacyFiles.map(async (path) => (existsSync(path) ? (await stat(path)).size : 0)),
      )
    ).reduce((sum, size) => sum + size, 0);

  return {
    ok: true,
    accountId,
    dataBytes: accountBytes,
    dataDirectoryBytes: await directoryBytes(DATA_DIR),
    session: {
      loggedIn: Boolean(getClient(accountId)),
      saved: Boolean(token?.authToken),
      savedAt: token?.savedAt ?? null,
      loggedInAt: getLoggedInAt(accountId),
    },
  };
}
