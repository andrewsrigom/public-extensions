#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const applicationRoot = resolve(dirname(scriptPath), "..");
const outputRoot = join(applicationRoot, ".output");
const buildRoot = join(outputRoot, "chrome-mv3");

// A font must have an exact archive-relative path here only after its license and
// provenance have been declared. Quick Notes intentionally ships no webfonts.
const declaredFontAssets = new Set();
const fontAssetPattern = /\.(?:dfont|eot|fnt|fon|otc|otf|pfa|pfb|ttc|ttf|woff2?)$/i;
const bundledInterPattern = /(?:^|\/)inter-v12-latin-[^/]+\.woff2?$/i;

export async function checkReleaseAssets({ buildDirectory, zipFile }) {
  const buildEntries = await listFiles(buildDirectory);
  assertReleaseManifest(buildEntries, "Chrome build");
  assertNoUndeclaredFontAssets(buildEntries, "Chrome build");

  const zipEntries = listZipEntryNames(await readFile(zipFile));
  assertReleaseManifest(zipEntries, "Chrome ZIP");
  assertNoUndeclaredFontAssets(zipEntries, "Chrome ZIP");

  return { buildEntries: buildEntries.length, zipEntries: zipEntries.length };
}

function assertReleaseManifest(entries, location) {
  if (!entries.map(normalizeArchivePath).includes("manifest.json")) {
    throw new Error(`${location} is missing manifest.json`);
  }
}

export function assertNoUndeclaredFontAssets(entries, location, declared = declaredFontAssets) {
  const undeclared = entries
    .map(normalizeArchivePath)
    .filter((entry) => fontAssetPattern.test(entry) || bundledInterPattern.test(entry))
    .filter((entry) => !declared.has(entry));

  if (undeclared.length > 0) {
    throw new Error(`${location} contains undeclared font assets: ${undeclared.join(", ")}`);
  }
}

export function listZipEntryNames(archive) {
  const endOffset = findEndOfCentralDirectory(archive);
  const diskNumber = readUInt16(archive, endOffset + 4);
  const centralDisk = readUInt16(archive, endOffset + 6);
  const diskEntries = readUInt16(archive, endOffset + 8);
  const totalEntries = readUInt16(archive, endOffset + 10);
  const centralSize = readUInt32(archive, endOffset + 12);
  const centralOffset = readUInt32(archive, endOffset + 16);

  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error("Multi-disk ZIPs are not supported");
  }
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 release artifacts are not supported");
  }
  if (centralOffset + centralSize > endOffset) {
    throw new Error("ZIP central directory is outside the archive");
  }

  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(archive, cursor) !== 0x02014b50) {
      throw new Error("ZIP central directory is corrupt");
    }
    const filenameLength = readUInt16(archive, cursor + 28);
    const extraLength = readUInt16(archive, cursor + 30);
    const commentLength = readUInt16(archive, cursor + 32);
    const entryEnd = cursor + 46 + filenameLength + extraLength + commentLength;
    if (entryEnd > centralOffset + centralSize) {
      throw new Error("ZIP central directory entry is truncated");
    }
    entries.push(normalizeArchivePath(archive.subarray(cursor + 46, cursor + 46 + filenameLength).toString("utf8")));
    cursor = entryEnd;
  }
  if (cursor !== centralOffset + centralSize) {
    throw new Error("ZIP central directory size is inconsistent");
  }
  return entries;
}

async function main() {
  const manifest = JSON.parse(await readFile(join(applicationRoot, "package.json"), "utf8"));
  if (
    typeof manifest.name !== "string" ||
    typeof manifest.version !== "string" ||
    !/^[0-9A-Za-z.+-]+$/.test(manifest.name) ||
    !/^[0-9A-Za-z.+-]+$/.test(manifest.version)
  ) {
    throw new Error("package name or version cannot identify the release ZIP safely");
  }

  const zipFile = join(outputRoot, `${manifest.name}-${manifest.version}-chrome.zip`);
  const result = await checkReleaseAssets({ buildDirectory: buildRoot, zipFile });
  console.log(
    `PASS: Quick Notes ships no undeclared fonts (${result.buildEntries} build entries, ${result.zipEntries} ZIP entries checked).`
  );
}

async function listFiles(root, baseRoot = root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, baseRoot)));
    } else if (entry.isFile()) {
      files.push(normalizeArchivePath(relative(baseRoot, absolutePath)));
    } else {
      throw new Error(`Unsupported release asset entry: ${absolutePath}`);
    }
  }
  return files;
}

function findEndOfCentralDirectory(archive) {
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUInt32(archive, offset) !== 0x06054b50) continue;
    const commentLength = readUInt16(archive, offset + 20);
    if (offset + 22 + commentLength === archive.length) return offset;
  }
  throw new Error("ZIP end-of-central-directory record is missing");
}

function readUInt16(buffer, offset) {
  if (offset < 0 || offset + 2 > buffer.length) throw new Error("ZIP structure is truncated");
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  if (offset < 0 || offset + 4 > buffer.length) throw new Error("ZIP structure is truncated");
  return buffer.readUInt32LE(offset);
}

function normalizeArchivePath(path) {
  return path.split(sep).join("/").replaceAll("\\", "/");
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
