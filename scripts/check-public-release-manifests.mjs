#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, inflateRawSync } from "node:zlib";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const productFilterRoot = join(repositoryRoot, "apps", "product-filter");
const maximumArchiveBytes = 100 * 1024 * 1024;
const maximumManifestBytes = 1024 * 1024;

export function validateProductFilterManifest(manifest, sourceLabel) {
  assert.ok(manifest && typeof manifest === "object" && !Array.isArray(manifest), `${sourceLabel} is not an object.`);
  assert.deepEqual(
    manifest.options_ui,
    {
      open_in_tab: true,
      page: "options.html"
    },
    `${sourceLabel} must declare exactly options_ui={page:"options.html",open_in_tab:true}.`
  );
}

export function readZipEntry(archivePath, requestedEntryName) {
  const archiveSize = statSync(archivePath).size;
  assert.ok(archiveSize <= maximumArchiveBytes, `${archivePath} exceeds the release archive review limit.`);
  const archive = readFileSync(archivePath);
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(archive);

  const diskNumber = archive.readUInt16LE(endOfCentralDirectoryOffset + 4);
  const centralDirectoryDisk = archive.readUInt16LE(endOfCentralDirectoryOffset + 6);
  const entriesOnDisk = archive.readUInt16LE(endOfCentralDirectoryOffset + 8);
  const totalEntries = archive.readUInt16LE(endOfCentralDirectoryOffset + 10);
  const centralDirectorySize = archive.readUInt32LE(endOfCentralDirectoryOffset + 12);
  const centralDirectoryOffset = archive.readUInt32LE(endOfCentralDirectoryOffset + 16);

  assert.equal(diskNumber, 0, `${archivePath} is a multi-disk ZIP, which is not supported.`);
  assert.equal(centralDirectoryDisk, 0, `${archivePath} is a multi-disk ZIP, which is not supported.`);
  assert.equal(entriesOnDisk, totalEntries, `${archivePath} has an incomplete central directory.`);
  assert.notEqual(totalEntries, 0xffff, `${archivePath} uses ZIP64, which is not supported by this release gate.`);
  assert.notEqual(
    centralDirectorySize,
    0xffffffff,
    `${archivePath} uses ZIP64, which is not supported by this release gate.`
  );
  assert.notEqual(
    centralDirectoryOffset,
    0xffffffff,
    `${archivePath} uses ZIP64, which is not supported by this release gate.`
  );

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  assert.ok(
    centralDirectoryOffset >= 0 &&
      centralDirectoryEnd >= centralDirectoryOffset &&
      centralDirectoryEnd <= endOfCentralDirectoryOffset,
    `${archivePath} has an invalid central-directory range.`
  );

  let cursor = centralDirectoryOffset;
  let matchedEntry;
  for (let index = 0; index < totalEntries; index += 1) {
    assertRange(archive, cursor, 46, `${archivePath} central-directory entry ${index}`);
    assert.equal(
      archive.readUInt32LE(cursor),
      0x02014b50,
      `${archivePath} central-directory entry ${index} has an invalid signature.`
    );

    const flags = archive.readUInt16LE(cursor + 8);
    const compressionMethod = archive.readUInt16LE(cursor + 10);
    const expectedCrc32 = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const fileNameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const diskStart = archive.readUInt16LE(cursor + 34);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const entryLength = 46 + fileNameLength + extraLength + commentLength;
    assertRange(archive, cursor, entryLength, `${archivePath} central-directory entry ${index}`);

    const fileName = archive.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");
    if (fileName === requestedEntryName) {
      assert.equal(matchedEntry, undefined, `${archivePath} contains duplicate ${requestedEntryName} entries.`);
      assert.equal(flags & 0x1, 0, `${archivePath} encrypts ${requestedEntryName}, which is not supported.`);
      assert.equal(diskStart, 0, `${archivePath} stores ${requestedEntryName} on another disk.`);
      assert.ok(
        compressedSize !== 0xffffffff && uncompressedSize !== 0xffffffff && localHeaderOffset !== 0xffffffff,
        `${archivePath} stores ${requestedEntryName} with ZIP64 metadata, which is not supported.`
      );
      assert.ok(
        uncompressedSize <= maximumManifestBytes,
        `${archivePath} ${requestedEntryName} exceeds the manifest review limit.`
      );
      matchedEntry = {
        compressedSize,
        compressionMethod,
        expectedCrc32,
        fileName,
        flags,
        localHeaderOffset,
        uncompressedSize
      };
    }

    cursor += entryLength;
  }

  assert.equal(cursor, centralDirectoryEnd, `${archivePath} has inconsistent central-directory metadata.`);
  assert.ok(matchedEntry, `${archivePath} does not contain ${requestedEntryName}.`);
  return extractZipEntry(archive, archivePath, matchedEntry, centralDirectoryOffset);
}

function findEndOfCentralDirectory(archive) {
  assert.ok(archive.length >= 22, "Release archive is too short to be a ZIP file.");
  const earliestOffset = Math.max(0, archive.length - 22 - 0xffff);

  for (let offset = archive.length - 22; offset >= earliestOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) !== 0x06054b50) continue;
    const commentLength = archive.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === archive.length) return offset;
  }

  throw new Error("Release archive has no valid end-of-central-directory record.");
}

function extractZipEntry(archive, archivePath, entry, centralDirectoryOffset) {
  const localHeaderOffset = entry.localHeaderOffset;
  assertRange(archive, localHeaderOffset, 30, `${archivePath} local header for ${entry.fileName}`);
  assert.equal(
    archive.readUInt32LE(localHeaderOffset),
    0x04034b50,
    `${archivePath} local header for ${entry.fileName} has an invalid signature.`
  );

  const localFlags = archive.readUInt16LE(localHeaderOffset + 6);
  const localCompressionMethod = archive.readUInt16LE(localHeaderOffset + 8);
  const fileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
  const extraLength = archive.readUInt16LE(localHeaderOffset + 28);
  const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataOffset + entry.compressedSize;
  assertRange(archive, localHeaderOffset, 30 + fileNameLength + extraLength, `${archivePath} local header`);
  assert.ok(dataEnd >= dataOffset && dataEnd <= centralDirectoryOffset, `${archivePath} has an invalid entry range.`);
  assert.equal(localFlags & 0x1, 0, `${archivePath} encrypts ${entry.fileName}, which is not supported.`);
  assert.equal(
    localCompressionMethod,
    entry.compressionMethod,
    `${archivePath} has mismatched compression metadata for ${entry.fileName}.`
  );

  const localFileName = archive
    .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + fileNameLength)
    .toString("utf8");
  assert.equal(localFileName, entry.fileName, `${archivePath} has mismatched file names for ${entry.fileName}.`);

  const compressed = archive.subarray(dataOffset, dataEnd);
  let content;
  if (entry.compressionMethod === 0) {
    content = Buffer.from(compressed);
  } else if (entry.compressionMethod === 8) {
    content = inflateRawSync(compressed, { maxOutputLength: maximumManifestBytes });
  } else {
    throw new Error(`${archivePath} uses unsupported compression method ${entry.compressionMethod}.`);
  }

  assert.equal(content.length, entry.uncompressedSize, `${archivePath} has an invalid size for ${entry.fileName}.`);
  assert.equal(crc32(content) >>> 0, entry.expectedCrc32, `${archivePath} failed the CRC check for ${entry.fileName}.`);
  return content;
}

function assertRange(buffer, offset, length, label) {
  assert.ok(
    Number.isSafeInteger(offset) &&
      Number.isSafeInteger(length) &&
      offset >= 0 &&
      length >= 0 &&
      offset + length >= offset &&
      offset + length <= buffer.length,
    `${label} is outside the ZIP file.`
  );
}

function readJsonFile(filePath, sourceLabel) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${sourceLabel} is missing or invalid JSON: ${detail}`, { cause: error });
  }
}

export function checkProductFilterReleaseManifests() {
  const packageManifest = readJsonFile(join(productFilterRoot, "package.json"), "product-filter package.json");
  assert.match(packageManifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Invalid product-filter version.");

  const unpackedManifestPath = join(productFilterRoot, ".output", "chrome-mv3", "manifest.json");
  const archivePath = join(productFilterRoot, ".output", `product-filter-${packageManifest.version}-chrome.zip`);
  validateProductFilterManifest(
    readJsonFile(unpackedManifestPath, "unpacked product-filter manifest"),
    "unpacked manifest"
  );

  let archivedManifest;
  try {
    archivedManifest = JSON.parse(readZipEntry(archivePath, "manifest.json").toString("utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`product-filter release ZIP manifest is missing or invalid: ${detail}`, { cause: error });
  }
  validateProductFilterManifest(archivedManifest, "release ZIP manifest");
}

const invokedAsScript =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedAsScript) {
  try {
    checkProductFilterReleaseManifests();
    console.log("PASS product-filter unpacked and ZIP manifests open options.html in a browser tab.");
  } catch (error) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  }
}
