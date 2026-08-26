import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const output = join(import.meta.dir, "dist");
const assets = ["index.html", "styles.css", "main.js"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(
  assets.map((asset) => copyFile(join(import.meta.dir, asset), join(output, asset))),
);
await copyFile(join(import.meta.dir, "index.html"), join(output, "404.html"));

console.log(`Vyline landing page built at ${output}`);
