import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

import { checkReleaseAssets } from "./check-release-assets.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

test("accepts a build and ZIP without bundled fonts", async () => {
  const fixture = await createReleaseFixture(["manifest.json", "assets/app.js"]);

  await assert.doesNotReject(() =>
    checkReleaseAssets({ buildDirectory: fixture.buildDirectory, zipFile: fixture.zipFile })
  );
});

test("rejects an undeclared font in the build", async () => {
  const fixture = await createReleaseFixture(["manifest.json", "assets/app.js"]);
  await writeFile(join(fixture.buildDirectory, "assets", "custom-font.ttf"), "font");

  await assert.rejects(
    () => checkReleaseAssets({ buildDirectory: fixture.buildDirectory, zipFile: fixture.zipFile }),
    /Chrome build contains undeclared font assets: assets\/custom-font\.ttf/
  );
});

test("rejects the BlockNote Inter WOFF and WOFF2 fonts in the ZIP", async () => {
  const fixture = await createReleaseFixture([
    "manifest.json",
    "assets/app.js",
    "assets/inter-v12-latin-400.woff",
    "assets/inter-v12-latin-500.woff2"
  ]);

  await assert.rejects(
    () => checkReleaseAssets({ buildDirectory: fixture.buildDirectory, zipFile: fixture.zipFile }),
    /Chrome ZIP contains undeclared font assets: assets\/inter-v12-latin-400\.woff, assets\/inter-v12-latin-500\.woff2/
  );
});

async function createReleaseFixture(zipEntries) {
  const root = await mkdtemp(join(tmpdir(), "quick-notes-release-assets-"));
  temporaryRoots.push(root);
  const buildDirectory = join(root, "build");
  const zipFile = join(root, "quick-notes.zip");
  await mkdir(join(buildDirectory, "assets"), { recursive: true });
  await writeFile(join(buildDirectory, "manifest.json"), "{}");
  await writeFile(join(buildDirectory, "assets", "app.js"), "");
  await writeFile(zipFile, createCentralDirectoryFixture(zipEntries));
  return { buildDirectory, zipFile };
}

function createCentralDirectoryFixture(entries) {
  const centralEntries = entries.map((entry) => {
    const name = Buffer.from(entry, "utf8");
    const header = Buffer.alloc(46 + name.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(name.length, 28);
    name.copy(header, 46);
    return header;
  });
  const centralDirectory = Buffer.concat(centralEntries);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(0, 16);
  return Buffer.concat([centralDirectory, endRecord]);
}
