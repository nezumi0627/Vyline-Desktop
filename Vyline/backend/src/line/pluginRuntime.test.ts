import { describe, expect, test } from "bun:test";
import { resolvePluginEntry } from "./pluginRuntime.js";
import { BUNDLED_PLUGIN_DIR } from "./pluginPaths.js";

describe("plugin runtime", () => {
  test("discovers the bundled example plugin", () => {
    expect(resolvePluginEntry("example-plugin", undefined, BUNDLED_PLUGIN_DIR)).toEndWith(
      "example-plugin\\index.ts",
    );
  });

  test("rejects manifest entry paths outside the plugin directory", () => {
    expect(resolvePluginEntry("example-plugin", "../index.ts", BUNDLED_PLUGIN_DIR)).toBeNull();
  });
});
