/**
 * line/pluginManager.ts — プラグインレジストリ
 *
 * マニフェスト検出 + アカウント単位の有効/無効状態の永続化 + 実行ランタイムの起動。
 * プラグインの実行詳細は pluginRuntime.ts、
 * ユーザー向けガイドは docs/developer-guide/plugin-system.md を参照。
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import type { PluginManifest } from "@vyline/plugin-sdk";
import { childLogger } from "../logger.js";
import { BUNDLED_PLUGIN_DIR, DATA_DIR, PLUGIN_DIR } from "./pluginPaths.js";
import { activatePlugin, deactivatePlugin, resolvePluginEntry } from "./pluginRuntime.js";

const log = childLogger("plugins");

const STATES_PATH = join(DATA_DIR, "plugin-states.json");
const MAX_PLUGIN_FILES = 128;
const MAX_PLUGIN_SIZE = 10 * 1024 * 1024;
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface PluginEntry extends PluginManifest {
  /** プラグインディレクトリ名（= manifest の置かれたフォルダ） */
  dir: string;
  /** エントリファイルが存在し実行可能か */
  loadable: boolean;
  sourceDir: string;
  main?: string;
  /** ZIP または同梱プラグインなどの取得元 */
  source: "installed" | "bundled";
}

type PluginStates = Record<string, Record<string, boolean>>;

function loadStates(): PluginStates {
  try {
    return JSON.parse(readFileSync(STATES_PATH, "utf8")) as PluginStates;
  } catch {
    return {};
  }
}

function saveStates(states: PluginStates): void {
  try {
    writeFileSync(STATES_PATH, JSON.stringify(states, null, 2), "utf8");
  } catch (err) {
    log.warn({ err }, "failed to save plugin states");
  }
}

/** プラグインディレクトリを走査し manifest.json を読む（この関数自体はコードを実行しない） */
export function listPlugins(): PluginEntry[] {
  const roots = [PLUGIN_DIR, BUNDLED_PLUGIN_DIR].filter(
    (root, i, all) => existsSync(root) && all.indexOf(root) === i,
  );
  const out: PluginEntry[] = [];
  for (const root of roots) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || out.some((p) => p.id === entry.name)) continue;
      const manifestPath = join(root, entry.name, "manifest.json");
      if (!existsSync(manifestPath)) continue;
      try {
        const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<PluginManifest> & {
          main?: string;
        };
        if (!raw.id || !raw.name) continue;
        out.push({
          id: raw.id,
          name: raw.name,
          version: raw.version ?? "0.0.0",
          ...(raw.description ? { description: raw.description } : {}),
          permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
          dir: entry.name,
          sourceDir: join(root, entry.name),
          source: root === BUNDLED_PLUGIN_DIR ? "bundled" : "installed",
          ...(raw.main ? { main: raw.main } : {}),
          loadable: resolvePluginEntry(entry.name, raw.main, root) != null,
        });
      } catch (err) {
        log.warn({ plugin: entry.name, err }, "invalid plugin manifest");
      }
    }
  }
  return out;
}

export async function installPluginArchive(file: File): Promise<PluginEntry> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("プラグインは ZIP ファイルで指定してください");
  }
  if (file.size > MAX_PLUGIN_SIZE) throw new Error("ZIP ファイルが大きすぎます（最大 10 MB）");

  const archive = new Bun.Archive(await file.arrayBuffer());
  const files = await archive.files();
  const names = [...files.keys()].filter((name) => !name.endsWith("/"));
  if (names.length === 0 || names.length > MAX_PLUGIN_FILES) {
    throw new Error("ZIP 内のファイル数が不正です");
  }

  const safeNames = names.map((name) => {
    const normalized = name.replaceAll("\\", "/");
    const target = resolve(PLUGIN_DIR, normalized);
    const segments = normalized.split("/");
    if (
      normalized.startsWith("/") ||
      /^[a-zA-Z]:/.test(normalized) ||
      segments.includes("..") ||
      segments.includes(".") ||
      relative(PLUGIN_DIR, target).startsWith("..")
    ) {
      throw new Error("ZIP に安全でないパスが含まれています");
    }
    return normalized;
  });
  const root = findArchiveRoot(safeNames);
  if (root && safeNames.some((name) => !name.startsWith(root))) {
    throw new Error("ZIP は 1 つのプラグインフォルダだけを含めてください");
  }
  const manifestName = `${root}manifest.json`;
  if (!safeNames.includes(manifestName)) throw new Error("manifest.json が見つかりません");

  const manifestBytes = files.get(manifestName);
  if (!manifestBytes) throw new Error("manifest.json を読み込めません");
  const manifestRaw = await bytesToText(manifestBytes);
  let manifest: Partial<PluginManifest> & { main?: string };
  try {
    manifest = JSON.parse(manifestRaw) as Partial<PluginManifest> & { main?: string };
  } catch {
    throw new Error("manifest.json が不正な JSON です");
  }
  validateManifest(manifest);
  const main = manifest.main;
  if (
    main &&
    (main.includes("\\") ||
      main.startsWith("/") ||
      main.split("/").some((part) => part === "." || part === ".."))
  ) {
    throw new Error("manifest の main が不正です");
  }
  const mainName = `${root}${main ?? "index.ts"}`;
  const hasEntry = main
    ? safeNames.includes(mainName)
    : safeNames.includes(`${root}index.ts`) || safeNames.includes(`${root}index.js`);
  if (!hasEntry) {
    throw new Error("manifest のエントリファイルが見つかりません");
  }
  if (listPlugins().some((plugin) => plugin.id === manifest.id)) {
    throw new Error(`同じ ID のプラグインが既に存在します: ${manifest.id}`);
  }

  const totalSize = await archiveSize(files);
  if (totalSize > MAX_PLUGIN_SIZE) throw new Error("展開後のサイズが大きすぎます（最大 10 MB）");
  mkdirSync(PLUGIN_DIR, { recursive: true });
  const destination = join(PLUGIN_DIR, manifest.id);
  const temporary = `${destination}.install-${crypto.randomUUID()}`;
  try {
    mkdirSync(temporary, { recursive: true });
    for (const name of safeNames) {
      const output = join(temporary, name.slice(root.length));
      mkdirSync(join(output, ".."), { recursive: true });
      const value = files.get(name);
      if (!value) continue;
      writeFileSync(
        output,
        value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : value,
      );
    }
    renameSync(temporary, destination);
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
  return listPlugins().find((plugin) => plugin.id === manifest.id)!;
}

function findArchiveRoot(names: string[]): string {
  if (names.includes("manifest.json")) return "";
  const first = names[0]?.split("/")[0];
  if (!first || !names.includes(`${first}/manifest.json`))
    throw new Error("ZIP のルートに manifest.json が必要です");
  return `${first}/`;
}

function validateManifest(
  manifest: Partial<PluginManifest>,
): asserts manifest is PluginManifest & { main?: string } {
  if (typeof manifest.id !== "string" || !PLUGIN_ID_PATTERN.test(manifest.id)) {
    throw new Error("manifest の id が不正です（英小文字・数字・._-、最大 64 文字）");
  }
  if (typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
    throw new Error("manifest の name が必要です");
  }
  if (typeof manifest.version !== "string" || manifest.version.trim().length === 0) {
    throw new Error("manifest の version が必要です");
  }
  if (manifest.permissions !== undefined && !Array.isArray(manifest.permissions)) {
    throw new Error("manifest の permissions が不正です");
  }
}

async function bytesToText(value: Blob | Uint8Array): Promise<string> {
  return new TextDecoder().decode(value instanceof Blob ? await value.arrayBuffer() : value);
}

async function archiveSize(files: Map<string, File>): Promise<number> {
  let size = 0;
  for (const value of files.values()) {
    size += value.size;
    if (size > MAX_PLUGIN_SIZE) break;
  }
  return size;
}

function findPluginDir(pluginId: string): string | null {
  return listPlugins().find((p) => p.id === pluginId)?.dir ?? null;
}

export function getPluginStates(accountId: string): Record<string, boolean> {
  return loadStates()[accountId] ?? {};
}

/** ログイン復元時に、保存済みの有効状態をランタイムへ反映する。 */
export async function activateConfiguredPlugins(accountId: string): Promise<void> {
  const states = getPluginStates(accountId);
  await Promise.all(
    Object.entries(states)
      .filter(([, enabled]) => enabled)
      .map(async ([pluginId]) => {
        try {
          await setPluginState(accountId, pluginId, true);
        } catch (err) {
          log.warn({ accountId, pluginId, err }, "configured plugin activation skipped");
        }
      }),
  );
}

/**
 * 有効/無効を永続化し、ランタイムへも反映する。
 * activate 失敗時は状態を disabled に戻してエラーを返す（本体は落とさない）。
 */
export async function setPluginState(
  accountId: string,
  pluginId: string,
  enabled: boolean,
): Promise<void> {
  const entry = listPlugins().find((p) => p.id === pluginId);
  if (!entry) throw new Error(`unknown plugin: ${pluginId}`);

  if (enabled) {
    if (!entry.loadable) throw new Error("plugin has no index.ts / index.js entry");
    const ok = await activatePlugin(
      accountId,
      pluginId,
      entry.dir,
      entry.permissions ?? [],
      undefined,
      entry.sourceDir,
      entry.main,
    );
    if (!ok) throw new Error("plugin activation failed (see backend logs)");
  } else {
    await deactivatePlugin(accountId, pluginId);
  }

  const states = loadStates();
  states[accountId] = states[accountId] ?? {};
  states[accountId]![pluginId] = enabled;
  saveStates(states);
}
