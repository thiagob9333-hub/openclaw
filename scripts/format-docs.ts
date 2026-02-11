#!/usr/bin/env -S node --import tsx

import { spawnSync } from "node:child_process";

const pnpm = "pnpm";
const formatMode = process.argv.includes("--write") ? "--write" : "--check";
const maxChunkArgChars = process.platform === "win32" ? 1800 : 30000;

function listDocFiles(): string[] {
  const result = spawnSync(
    "git",
    ["ls-files", "--", "docs/**/*.md", "docs/**/*.mdx", "README.md"],
    { encoding: "utf-8" },
  );

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    console.error(stderr || "format-docs: failed to list documentation files.");
    process.exit(result.status ?? 1);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runOxfmt(files: string[]): void {
  const result = spawnSync(pnpm, ["exec", "oxfmt", formatMode, ...files], {
    stdio: "inherit",
    encoding: "utf-8",
  });
  if (result.error) {
    console.error(`format-docs: failed to run oxfmt: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function chunkFiles(files: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const file of files) {
    const nextChars = currentChars + file.length + 1;
    if (current.length > 0 && nextChars > maxChunkArgChars) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(file);
    currentChars += file.length + 1;
  }

  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function main(): void {
  const files = listDocFiles();
  if (files.length === 0) {
    console.log("format-docs: no documentation files found.");
    return;
  }

  for (const chunk of chunkFiles(files)) {
    runOxfmt(chunk);
  }
}

main();
