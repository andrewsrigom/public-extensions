#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicApps = ["watched-filter", "product-filter", "quick-notes", "time-zone-helper", "site-reset", "pathswitch"];
const canonicalLicensePath = existsSync(join(repositoryRoot, "LICENSE"))
  ? join(repositoryRoot, "LICENSE")
  : join(repositoryRoot, "docs/public/LICENSE");
const canonicalTrademarkPath = existsSync(join(repositoryRoot, "TRADEMARKS.md"))
  ? join(repositoryRoot, "TRADEMARKS.md")
  : join(repositoryRoot, "docs/public/TRADEMARKS.md");

function main() {
  const expectedLicense = readFileSync(canonicalLicensePath);
  const expectedTrademarkPolicy = readFileSync(canonicalTrademarkPath);
  const failures = [];

  for (const app of publicApps) {
    try {
      checkApplicationRelease(app, expectedLicense, expectedTrademarkPolicy);
    } catch (error) {
      failures.push(`${app}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("Public release license check");
  if (failures.length > 0) {
    console.error(
      `FAIL: ${failures.length} release artifact${failures.length === 1 ? "" : "s"} failed license checks.`
    );
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS: LICENSE and TRADEMARKS.md are present and byte-identical in all ${publicApps.length} builds and Chrome ZIPs.`
    );
  }
}

function checkApplicationRelease(app, license, trademarkPolicy) {
  const applicationRoot = join(repositoryRoot, "apps", app);
  const manifest = JSON.parse(readFileSync(join(applicationRoot, "package.json"), "utf8"));
  if (manifest.name !== app || typeof manifest.version !== "string" || !/^[0-9A-Za-z.+-]+$/.test(manifest.version)) {
    throw new Error("package name or version cannot identify the release ZIP safely");
  }

  const publicLicensePath = join(applicationRoot, "public", "LICENSE");
  assertLicenseBytes(readFileSync(publicLicensePath), license, "public/LICENSE");
  const publicTrademarkPath = join(applicationRoot, "public", "TRADEMARKS.md");
  assertLicenseBytes(readFileSync(publicTrademarkPath), trademarkPolicy, "public/TRADEMARKS.md");

  const buildLicensePath = join(applicationRoot, ".output", "chrome-mv3", "LICENSE");
  assertLicenseBytes(readFileSync(buildLicensePath), license, ".output/chrome-mv3/LICENSE");
  const buildTrademarkPath = join(applicationRoot, ".output", "chrome-mv3", "TRADEMARKS.md");
  assertLicenseBytes(readFileSync(buildTrademarkPath), trademarkPolicy, ".output/chrome-mv3/TRADEMARKS.md");

  const zipPath = join(applicationRoot, ".output", `${manifest.name}-${manifest.version}-chrome.zip`);
  const zipLicense = readZipEntry(readFileSync(zipPath), "LICENSE");
  assertLicenseBytes(zipLicense, license, `${manifest.name}-${manifest.version}-chrome.zip!/LICENSE`);
  const zipTrademarkPolicy = readZipEntry(readFileSync(zipPath), "TRADEMARKS.md");
  assertLicenseBytes(
    zipTrademarkPolicy,
    trademarkPolicy,
    `${manifest.name}-${manifest.version}-chrome.zip!/TRADEMARKS.md`
  );
}

function assertLicenseBytes(actual, expected, location) {
  if (!actual.equals(expected)) throw new Error(`${location} differs from the repository LICENSE`);
}

function readZipEntry(archive, requestedName) {
  const endOffset = findEndOfCentralDirectory(archive);
  const diskNumber = readUInt16(archive, endOffset + 4);
  const centralDisk = readUInt16(archive, endOffset + 6);
  const diskEntries = readUInt16(archive, endOffset + 8);
  const totalEntries = readUInt16(archive, endOffset + 10);
  const centralSize = readUInt32(archive, endOffset + 12);
  const centralOffset = readUInt32(archive, endOffset + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error("multi-disk ZIPs are not supported");
  }
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 release artifacts are not supported");
  }
  if (centralOffset + centralSize > endOffset) throw new Error("ZIP central directory is outside the archive");

  let cursor = centralOffset;
  let match;
  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(archive, cursor) !== 0x02014b50) throw new Error("ZIP central directory is corrupt");
    const flags = readUInt16(archive, cursor + 8);
    const method = readUInt16(archive, cursor + 10);
    const checksum = readUInt32(archive, cursor + 16);
    const compressedSize = readUInt32(archive, cursor + 20);
    const uncompressedSize = readUInt32(archive, cursor + 24);
    const filenameLength = readUInt16(archive, cursor + 28);
    const extraLength = readUInt16(archive, cursor + 30);
    const commentLength = readUInt16(archive, cursor + 32);
    const localOffset = readUInt32(archive, cursor + 42);
    const entryEnd = cursor + 46 + filenameLength + extraLength + commentLength;
    if (entryEnd > centralOffset + centralSize) throw new Error("ZIP central entry is truncated");
    const name = archive.subarray(cursor + 46, cursor + 46 + filenameLength).toString("utf8");
    if (name === requestedName) {
      if (match) throw new Error(`ZIP contains duplicate ${requestedName} entries`);
      match = { checksum, compressedSize, flags, localOffset, method, name, uncompressedSize };
    }
    cursor = entryEnd;
  }
  if (cursor !== centralOffset + centralSize) throw new Error("ZIP central directory size is inconsistent");
  if (!match) throw new Error(`ZIP is missing ${requestedName}`);
  if ((match.flags & 1) !== 0) throw new Error(`${requestedName} must not be encrypted inside the ZIP`);

  const localOffset = match.localOffset;
  if (readUInt32(archive, localOffset) !== 0x04034b50) throw new Error(`${requestedName} local header is corrupt`);
  const localMethod = readUInt16(archive, localOffset + 8);
  const filenameLength = readUInt16(archive, localOffset + 26);
  const extraLength = readUInt16(archive, localOffset + 28);
  const localName = archive.subarray(localOffset + 30, localOffset + 30 + filenameLength).toString("utf8");
  if (localName !== match.name || localMethod !== match.method) {
    throw new Error(`${requestedName} local and central headers disagree`);
  }
  const dataOffset = localOffset + 30 + filenameLength + extraLength;
  const dataEnd = dataOffset + match.compressedSize;
  if (dataEnd > archive.length) throw new Error(`${requestedName} data is truncated`);
  const compressed = archive.subarray(dataOffset, dataEnd);
  const content =
    match.method === 0
      ? Buffer.from(compressed)
      : match.method === 8
        ? inflateRawSync(compressed)
        : (() => {
            throw new Error(`${requestedName} uses unsupported ZIP compression method ${match.method}`);
          })();
  if (content.length !== match.uncompressedSize) throw new Error(`${requestedName} size is inconsistent`);
  if (crc32(content) !== match.checksum) throw new Error(`${requestedName} checksum is invalid`);
  return content;
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

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let checksum = 0xffffffff;
  for (const byte of buffer) checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  return (checksum ^ 0xffffffff) >>> 0;
}

main();
