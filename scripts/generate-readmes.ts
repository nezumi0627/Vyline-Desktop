#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w):/, "$1:");
const sourcePath = `${root}/README.src.md`;
const check = process.argv.includes("--check");
const source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
const languages = source.match(/^<!--@languages=(.+)-->$/m)?.[1].split(",") ?? [];
const defaultLanguage = source.match(/^<!--@default=(.+)-->$/m)?.[1] ?? languages[0];

if (languages.length === 0 || !languages.includes(defaultLanguage)) throw new Error("README.src.md must declare @languages and a valid @default");

const body = source.split("\n").filter((line) => !/^<!--@(languages|default)=/.test(line));
for (const language of languages) {
  const output = body.flatMap((line) => {
    const match = line.match(/^(.*)<!--([a-z-]+)-->$/);
    return !match || match[2] === language ? [match ? match[1] : line] : [];
  }).join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "").concat("\n");
  const outputPath = language === defaultLanguage ? `${root}/README.md` : `${root}/README.${language}.md`;
  const generated = `<!-- GENERATED FILE. Edit README.src.md, then run bun run docs:readme. -->\n<!-- Language: ${language} -->\n\n${output}`;
  if (check) {
    if (readFileSync(outputPath, "utf8") !== generated) { console.error(`${outputPath} is out of date`); process.exitCode = 1; }
  } else writeFileSync(outputPath, generated);
}

if (!check) console.log("Generated README language variants.");
