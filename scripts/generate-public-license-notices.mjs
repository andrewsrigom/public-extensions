#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const applications = [
  "watched-filter",
  "product-filter",
  "quick-notes",
  "time-zone-helper",
  "site-reset",
  "pathswitch"
];
const sharedInventoryFilters = ["@browser-extensions/ui", "@browser-extensions/ui-tokens"];
const distributedToolchainPackages = new Map([
  [
    "@wxt-dev/browser",
    {
      allowAdditionalVersions: true,
      basis: "Browser runtime selected by WXT and emitted into extension bootstrap code.",
      version: "0.2.5"
    }
  ],
  [
    "esbuild",
    {
      basis: "Build transformer; included because transformation helpers appear in emitted JavaScript.",
      version: "0.25.12"
    }
  ],
  [
    "rollup",
    {
      basis: "Bundler used to emit module runtime and helper code.",
      version: "4.62.4"
    }
  ],
  [
    "tailwindcss",
    {
      basis: "CSS compiler whose preflight and generated styles enter the distributed CSS.",
      version: "4.3.2"
    }
  ],
  [
    "vite",
    {
      basis: "Build pipeline that emits the modulepreload polyfill and runtime helpers.",
      version: "6.4.3"
    }
  ],
  [
    "wxt",
    {
      basis: "Extension framework that emits content-script and bootstrap runtime code.",
      version: "0.21.3"
    }
  ]
]);
const distributedToolchainIds = [...distributedToolchainPackages.entries()]
  .map(([packageName, configuration]) => packageName + "@" + configuration.version)
  .sort();
const legalFilePattern = /^(?:licen[sc]e|copying|notice)(?:$|[._-].*)/i;
const inventoryCache = new Map();
const installedPackageCache = new Map();
let toolchainRecordsCache;
const licenseSelections = new Map([
  [
    "type-fest@5.8.0",
    {
      files: ["license-mit"],
      license: "MIT"
    }
  ]
]);
const legalDocumentOverrides = new Map([
  [
    "@wxt-dev/browser@0.2.5",
    {
      documents: [
        {
          fileName: "LICENSE",
          path: "docs/license-overrides/wxt-0.21.3-LICENSE.txt",
          sha256: "7b0b00fcdbc6a036078aad84d0bc0fae240ac67144b86c911149c2daa37c9f85",
          source: "https://github.com/wxt-dev/wxt/blob/c9520b688d49bd4296d89ff5dcc6cd7fc2a8c5f1/LICENSE"
        }
      ],
      license: "MIT",
      repository: "https://github.com/wxt-dev/wxt"
    }
  ],
  [
    "react-remove-scroll-bar@2.3.8",
    {
      documents: [
        {
          fileName: "LICENSE",
          path: "docs/license-overrides/react-remove-scroll-bar-2.3.8-LICENSE.txt",
          sha256: "a79aae0c0f21990d9d963bb3c5a79cdcea9a46f8523ba55c58d7fe776b6ebc84",
          source:
            "https://github.com/theKashey/react-remove-scroll-bar/blob/7301c160fda44cb8cf2b9fdfde61efad35736196/LICENSE"
        }
      ],
      license: "MIT",
      repository: "https://github.com/theKashey/react-remove-scroll-bar"
    }
  ],
  [
    "wxt@0.21.3",
    {
      documents: [
        {
          fileName: "LICENSE",
          path: "docs/license-overrides/wxt-0.21.3-LICENSE.txt",
          sha256: "7b0b00fcdbc6a036078aad84d0bc0fae240ac67144b86c911149c2daa37c9f85",
          source: "https://github.com/wxt-dev/wxt/blob/c9520b688d49bd4296d89ff5dcc6cd7fc2a8c5f1/LICENSE"
        }
      ],
      license: "MIT",
      repository: "https://github.com/wxt-dev/wxt"
    }
  ]
]);

function normalizeText(value) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trimEnd();
}

function normalizeLicense(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeLicense).filter(Boolean).join(" OR ");
  }

  if (value && typeof value === "object" && "type" in value) {
    return normalizeLicense(value.type);
  }

  return "";
}

function formatPerson(value) {
  if (typeof value === "string") {
    return value
      .replace(/\s*<[^<>\s@]+@[^<>\s]+>\s*/g, " ")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return [value.name, value.url].filter((part) => typeof part === "string" && part.trim()).join(" | ");
}

function repositoryUrl(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && typeof value.url === "string") {
    return value.url;
  }

  return "";
}

function normalizeProjectUrl(value) {
  let normalized = value.trim().replace(/^git\+/, "");
  normalized = normalized.replace(/^git@([^:]+):/, "https://$1/");
  normalized = normalized.replace(/^ssh:\/\/(?:git@)?([^/]+)\//, "https://$1/");
  normalized = normalized.replace(/^git:\/\//, "https://");
  normalized = normalized.replace(/^(https?:\/\/)[^/@\s]+@/i, "$1");
  normalized = normalized.replace(/^github:([^/]+\/.+)$/, "https://github.com/$1");
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
    normalized = "https://github.com/" + normalized;
  }
  return normalized.replace(/\.git(?:#.*)?$/, "");
}

function npmPackageUrl(packageName) {
  return "https://www.npmjs.com/package/" + packageName.split("/").map(encodeURIComponent).join("/");
}

function assertInsideRepository(targetPath) {
  const pathFromRoot = relative(repositoryRoot, targetPath);
  if (!pathFromRoot || isAbsolute(pathFromRoot) || pathFromRoot === ".." || pathFromRoot.startsWith(".." + sep)) {
    throw new Error("Path is outside the repository or resolves to its root: " + targetPath);
  }
}

function runPnpmLicenseInventory(filterName, dependencyMode = "prod") {
  const cacheKey = dependencyMode + ":" + filterName;
  if (inventoryCache.has(cacheKey)) {
    return inventoryCache.get(cacheKey);
  }

  const dependencyFlag = dependencyMode === "dev" ? "--dev" : "--prod";
  if (dependencyMode !== "prod" && dependencyMode !== "dev") {
    throw new Error("Unsupported dependency inventory mode: " + dependencyMode);
  }

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  let output;

  try {
    output = execFileSync(command, ["--filter", filterName, "licenses", "list", dependencyFlag, "--json"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const detail =
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? normalizeText(String(error.stderr))
        : String(error);
    throw new Error("Unable to read pnpm " + dependencyMode + " license inventory for " + filterName + ": " + detail);
  }

  const trimmed = output.trim();
  if (!trimmed || trimmed === "No licenses in packages found") {
    inventoryCache.set(cacheKey, []);
    return [];
  }

  const jsonStart = trimmed.indexOf("{");
  if (jsonStart < 0) {
    throw new Error("Unexpected pnpm license output for " + filterName + ": " + trimmed);
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed.slice(jsonStart));
  } catch (error) {
    throw new Error("Invalid pnpm license JSON for " + filterName + ": " + String(error));
  }

  const inventoryEntries = [];
  for (const [groupLicense, packages] of Object.entries(parsed)) {
    if (!Array.isArray(packages)) {
      throw new Error("Invalid pnpm license group for " + filterName + ": " + groupLicense);
    }

    for (const packageEntry of packages) {
      if (!packageEntry || !Array.isArray(packageEntry.paths) || packageEntry.paths.length === 0) {
        throw new Error("Package without an install path in pnpm license inventory for " + filterName);
      }

      for (const packagePath of packageEntry.paths) {
        if (typeof packagePath !== "string" || !packagePath) {
          throw new Error("Package with an invalid install path in pnpm license inventory for " + filterName);
        }
        inventoryEntries.push({
          declaredLicense: packageEntry.license || groupLicense,
          packagePath
        });
      }
    }
  }

  inventoryCache.set(cacheKey, inventoryEntries);
  return inventoryEntries;
}

function installedPackageFor(inventoryEntry) {
  if (installedPackageCache.has(inventoryEntry.packagePath)) {
    return installedPackageCache.get(inventoryEntry.packagePath);
  }

  const packageRoot = realpathSync(inventoryEntry.packagePath);
  assertInsideRepository(packageRoot);

  const manifestPath = join(packageRoot, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error("Dependency path has no package.json: " + packageRoot);
  }

  const manifestStat = lstatSync(manifestPath);
  if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) {
    throw new Error("Dependency package.json must be a regular non-symlink file: " + manifestPath);
  }

  const packageManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (typeof packageManifest.name !== "string" || typeof packageManifest.version !== "string") {
    throw new Error("Dependency package.json lacks name/version: " + manifestPath);
  }

  const installedPackage = { packageManifest, packageRoot };
  installedPackageCache.set(inventoryEntry.packagePath, installedPackage);
  return installedPackage;
}

function readLegalDocumentOverride(packageId, declaredLicense, packageManifest) {
  const override = legalDocumentOverrides.get(packageId);
  if (!override) {
    return undefined;
  }

  if (declaredLicense.toUpperCase() !== override.license.toUpperCase()) {
    throw new Error(
      packageId + " legal override expects " + override.license + " but the package declares " + declaredLicense
    );
  }

  const actualRepository = normalizeProjectUrl(repositoryUrl(packageManifest.repository));
  if (actualRepository !== override.repository) {
    throw new Error(
      packageId + " legal override expects repository " + override.repository + " but found " + actualRepository
    );
  }

  const documents = override.documents.map((document) => {
    const sourcePath = join(repositoryRoot, document.path);
    if (!existsSync(sourcePath)) {
      throw new Error(packageId + " legal override is missing: " + document.path);
    }

    const sourceStat = lstatSync(sourcePath);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
      throw new Error(packageId + " legal override must be a regular non-symlink file: " + document.path);
    }

    const canonicalSourcePath = realpathSync(sourcePath);
    assertInsideRepository(canonicalSourcePath);
    const sourceBytes = readFileSync(canonicalSourcePath);
    const actualHash = createHash("sha256").update(sourceBytes).digest("hex");
    if (actualHash !== document.sha256) {
      throw new Error(packageId + " legal override hash mismatch for " + document.path);
    }

    const text = normalizeText(sourceBytes.toString("utf8"));
    if (!text) {
      throw new Error(packageId + " legal override is empty: " + document.path);
    }

    return {
      fileName: document.fileName,
      source: document.source,
      text
    };
  });

  return { documents, selectedLicense: override.license };
}

function readLegalDocuments(packageRoot, packageId, declaredLicense, packageManifest) {
  const legalEntries = readdirSync(packageRoot, { withFileTypes: true }).filter((entry) =>
    legalFilePattern.test(entry.name)
  );

  const invalidLegalEntries = legalEntries.filter((entry) => !entry.isFile() || entry.isSymbolicLink());
  if (invalidLegalEntries.length > 0) {
    throw new Error(
      packageId +
        " legal entries must be regular non-symlink files: " +
        invalidLegalEntries
          .map((entry) => entry.name)
          .sort()
          .join(", ")
    );
  }

  const candidates = legalEntries
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

  if (candidates.length === 0) {
    const override = readLegalDocumentOverride(packageId, declaredLicense, packageManifest);
    if (override) {
      return override;
    }
    throw new Error(packageId + " has no regular LICENSE/LICENCE/COPYING/NOTICE file at " + packageRoot);
  }

  const selection = licenseSelections.get(packageId);
  let selectedLicense = declaredLicense;
  let selectedFiles = candidates;

  if (/\bOR\b/i.test(declaredLicense) && !selection) {
    throw new Error(packageId + " has a choice of licenses but no explicit selection: " + declaredLicense);
  }

  if (selection) {
    if (!declaredLicense.toUpperCase().includes(selection.license.toUpperCase())) {
      throw new Error(
        packageId + " selects " + selection.license + " but declares an incompatible expression: " + declaredLicense
      );
    }

    const selectedNames = new Set(selection.files.map((fileName) => fileName.toLowerCase()));
    selectedFiles = candidates.filter((fileName) => {
      const lowerName = fileName.toLowerCase();
      return selectedNames.has(lowerName) || /^(?:copying|notice)(?:$|[._-])/i.test(fileName);
    });
    const missingFiles = [...selectedNames].filter(
      (fileName) => !candidates.some((candidate) => candidate.toLowerCase() === fileName)
    );
    if (missingFiles.length > 0) {
      throw new Error(packageId + " is missing selected license file(s): " + missingFiles.join(", "));
    }
    selectedLicense = selection.license;
  }

  const documents = selectedFiles.map((fileName) => {
    const legalPath = join(packageRoot, fileName);
    const legalStat = lstatSync(legalPath);
    if (!legalStat.isFile() || legalStat.isSymbolicLink()) {
      throw new Error(packageId + " legal file must be a regular non-symlink file: " + fileName);
    }

    const canonicalLegalPath = realpathSync(legalPath);
    assertInsideRepository(canonicalLegalPath);
    const text = normalizeText(readFileSync(canonicalLegalPath, "utf8"));
    if (!text) {
      throw new Error(packageId + " has an empty legal file: " + fileName);
    }
    return { fileName, text };
  });

  if (selectedLicense === "MPL-2.0") {
    const fullTextPresent = documents.some((document) =>
      /Mozilla Public License(?:,? version| Version) 2\.0/i.test(document.text)
    );
    if (!fullTextPresent) {
      throw new Error(packageId + " does not provide the full Mozilla Public License 2.0 text");
    }
  }

  return { documents, selectedLicense };
}

function readPackageRecord(inventoryEntry, distributionBasis) {
  const { packageManifest, packageRoot } = installedPackageFor(inventoryEntry);
  const packageId = packageManifest.name + "@" + packageManifest.version;
  const declaredLicense =
    normalizeLicense(packageManifest.license) ||
    normalizeLicense(packageManifest.licenses) ||
    normalizeLicense(inventoryEntry.declaredLicense);
  if (!declaredLicense) {
    throw new Error(packageId + " has no declared license");
  }

  const { documents, selectedLicense } = readLegalDocuments(packageRoot, packageId, declaredLicense, packageManifest);
  const homepageSource =
    (typeof packageManifest.homepage === "string" && packageManifest.homepage) ||
    repositoryUrl(packageManifest.repository) ||
    npmPackageUrl(packageManifest.name);
  let homepage = normalizeProjectUrl(homepageSource);
  if (!/^https?:\/\//i.test(homepage)) {
    homepage = npmPackageUrl(packageManifest.name);
  }

  return {
    author: formatPerson(packageManifest.author),
    declaredLicense,
    distributionBasis,
    documents,
    homepage,
    name: packageManifest.name,
    selectedLicense,
    version: packageManifest.version
  };
}

function comparePackageRecords(left, right) {
  const nameOrder = left.name.localeCompare(right.name, "en", { sensitivity: "base" });
  if (nameOrder !== 0) {
    return nameOrder;
  }
  return left.version.localeCompare(right.version, "en", { numeric: true, sensitivity: "base" });
}

function addPackageRecord(recordsByPackage, record) {
  const packageId = record.name + "@" + record.version;
  const existingRecord = recordsByPackage.get(packageId);

  if (existingRecord && JSON.stringify(existingRecord) !== JSON.stringify(record)) {
    throw new Error("Conflicting legal metadata for duplicate dependency " + packageId);
  }
  recordsByPackage.set(packageId, record);
}

function assertWxtBrowserRuntimeSelection(entriesByNameAndVersion) {
  const wxtEntries = entriesByNameAndVersion.get("wxt")?.get("0.21.3");
  if (!wxtEntries || wxtEntries.length === 0) {
    throw new Error("Distributed toolchain inventory is missing wxt@0.21.3");
  }
  const { packageRoot } = installedPackageFor(wxtEntries[0]);
  let linkedManifestPath;

  try {
    const requireFromWxt = createRequire(join(packageRoot, "package.json"));
    linkedManifestPath = requireFromWxt.resolve("@wxt-dev/browser/package.json");
  } catch (error) {
    throw new Error("wxt@0.21.3 cannot resolve its selected @wxt-dev/browser package: " + String(error));
  }

  const canonicalManifestPath = realpathSync(linkedManifestPath);
  assertInsideRepository(canonicalManifestPath);
  const manifestStat = lstatSync(canonicalManifestPath);
  if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) {
    throw new Error("WXT browser runtime manifest is not a regular file: " + canonicalManifestPath);
  }

  const linkedManifest = JSON.parse(readFileSync(canonicalManifestPath, "utf8"));
  if (linkedManifest.name !== "@wxt-dev/browser" || linkedManifest.version !== "0.2.5") {
    throw new Error(
      "wxt@0.21.3 must resolve @wxt-dev/browser@0.2.5, found " +
        String(linkedManifest.name) +
        "@" +
        String(linkedManifest.version)
    );
  }
}

function recordsForDistributedToolchain() {
  if (toolchainRecordsCache) {
    return toolchainRecordsCache;
  }

  const entriesByNameAndVersion = new Map(
    [...distributedToolchainPackages.keys()].map((packageName) => [packageName, new Map()])
  );

  // `.` follows the workspace root across the private source hub and the
  // renamed public export; a hard-coded package name silently returns no data.
  for (const inventoryEntry of runPnpmLicenseInventory(".", "dev")) {
    const { packageManifest } = installedPackageFor(inventoryEntry);
    if (!distributedToolchainPackages.has(packageManifest.name)) {
      continue;
    }

    const versions = entriesByNameAndVersion.get(packageManifest.name);
    if (!versions.has(packageManifest.version)) {
      versions.set(packageManifest.version, []);
    }
    versions.get(packageManifest.version).push(inventoryEntry);
  }

  assertWxtBrowserRuntimeSelection(entriesByNameAndVersion);

  const recordsByPackage = new Map();
  for (const packageName of [...distributedToolchainPackages.keys()].sort()) {
    const configuration = distributedToolchainPackages.get(packageName);
    const versions = entriesByNameAndVersion.get(packageName);
    const expectedEntries = versions.get(configuration.version);
    if (!expectedEntries || expectedEntries.length === 0) {
      throw new Error(
        "Distributed toolchain package is missing pinned version " +
          packageName +
          "@" +
          configuration.version +
          "; observed: " +
          ([...versions.keys()].sort().join(", ") || "none")
      );
    }

    const additionalVersions = [...versions.keys()].filter((version) => version !== configuration.version);
    if (additionalVersions.length > 0 && !configuration.allowAdditionalVersions) {
      throw new Error(
        "Distributed toolchain package resolves to unreviewed additional versions: " +
          packageName +
          " (" +
          additionalVersions.sort().join(", ") +
          ")"
      );
    }

    for (const inventoryEntry of expectedEntries) {
      addPackageRecord(recordsByPackage, readPackageRecord(inventoryEntry, configuration.basis));
    }
  }

  toolchainRecordsCache = [...recordsByPackage.values()].sort(comparePackageRecords);
  return toolchainRecordsCache;
}

function recordsForApplication(application) {
  const recordsByPackage = new Map();
  const productionBasis = "Production dependency closure for the app and shared UI.";

  for (const filterName of [application, ...sharedInventoryFilters]) {
    for (const inventoryEntry of runPnpmLicenseInventory(filterName, "prod")) {
      addPackageRecord(recordsByPackage, readPackageRecord(inventoryEntry, productionBasis));
    }
  }

  for (const toolchainRecord of recordsForDistributedToolchain()) {
    addPackageRecord(recordsByPackage, toolchainRecord);
  }

  return [...recordsByPackage.values()].sort(comparePackageRecords);
}

function renderNotice(application, records) {
  if (records.length === 0) {
    throw new Error(application + " produced an empty third-party dependency inventory");
  }

  const separator = "=".repeat(79);
  const lines = [
    "THIRD-PARTY NOTICES",
    "",
    "Application: " + application,
    "Generated by: scripts/generate-public-license-notices.mjs",
    "Production inputs: " + [application, ...sharedInventoryFilters].join(", "),
    "Distributed toolchain inputs: " + distributedToolchainIds.join(", "),
    "",
    "This deterministic file is generated from installed dependency metadata and regular",
    "legal files at pnpm-reported paths, plus explicitly reviewed, offline, hash-pinned",
    "fallbacks. Do not edit it manually. Regenerate it after dependency or lockfile changes.",
    ""
  ];

  for (const record of records) {
    lines.push(separator);
    lines.push(record.name + "@" + record.version);
    lines.push("Declared license: " + record.declaredLicense);
    if (record.selectedLicense !== record.declaredLicense) {
      lines.push("Selected license: " + record.selectedLicense);
    }
    lines.push("Distribution basis: " + record.distributionBasis);
    lines.push("Homepage: " + record.homepage);
    if (record.author) {
      lines.push("Author: " + record.author);
    }
    lines.push("");

    for (const document of record.documents) {
      lines.push("--- " + document.fileName + " ---");
      if (document.source) {
        lines.push("Audited fallback source: " + document.source);
      }
      lines.push("");
      lines.push(document.text);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function outputPathForApplication(application) {
  return join(repositoryRoot, "apps", application, "public", "THIRD_PARTY_NOTICES.txt");
}

function validateOutputPath(outputPath) {
  const outputParent = dirname(outputPath);
  if (!existsSync(outputParent)) {
    throw new Error("Notice output directory does not exist: " + relative(repositoryRoot, outputParent));
  }

  const parentFromRoot = relative(repositoryRoot, outputParent);
  if (
    !parentFromRoot ||
    isAbsolute(parentFromRoot) ||
    parentFromRoot === ".." ||
    parentFromRoot.startsWith(".." + sep)
  ) {
    throw new Error("Notice output directory is outside the repository: " + outputParent);
  }

  let cursor = repositoryRoot;
  for (const segment of parentFromRoot.split(sep)) {
    cursor = join(cursor, segment);
    const segmentStat = lstatSync(cursor);
    if (!segmentStat.isDirectory() || segmentStat.isSymbolicLink()) {
      throw new Error("Notice output path contains a symlink or non-directory segment: " + cursor);
    }
  }

  if (existsSync(outputPath)) {
    const outputStat = lstatSync(outputPath);
    if (!outputStat.isFile() || outputStat.isSymbolicLink()) {
      throw new Error("Notice output must be a regular non-symlink file: " + outputPath);
    }
  }
}

function writeNoticeAtomically(outputPath, notice) {
  validateOutputPath(outputPath);
  const temporaryPath = outputPath + ".tmp-" + process.pid;
  if (existsSync(temporaryPath)) {
    throw new Error("Refusing to replace an existing temporary notice: " + temporaryPath);
  }

  let fileDescriptor;
  try {
    fileDescriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(fileDescriptor, notice, "utf8");
    closeSync(fileDescriptor);
    fileDescriptor = undefined;
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (fileDescriptor !== undefined) {
      closeSync(fileDescriptor);
    }
    if (existsSync(temporaryPath)) {
      const temporaryStat = lstatSync(temporaryPath);
      if (temporaryStat.isFile() && !temporaryStat.isSymbolicLink()) {
        unlinkSync(temporaryPath);
      }
    }
    throw error;
  }
}

function parseMode(arguments_) {
  if (arguments_.length === 0) {
    return "write";
  }
  if (arguments_.length === 1 && arguments_[0] === "--check") {
    return "check";
  }
  throw new Error("Usage: node scripts/generate-public-license-notices.mjs [--check]");
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  const expectedNotices = applications.map((application) => ({
    application,
    notice: renderNotice(application, recordsForApplication(application)),
    outputPath: outputPathForApplication(application)
  }));

  for (const { outputPath } of expectedNotices) {
    validateOutputPath(outputPath);
  }

  if (mode === "check") {
    const staleFiles = expectedNotices
      .filter(({ notice, outputPath }) => !existsSync(outputPath) || readFileSync(outputPath, "utf8") !== notice)
      .map(({ outputPath }) => relative(repositoryRoot, outputPath));

    if (staleFiles.length > 0) {
      throw new Error(
        "Third-party notices are missing or stale:\n- " +
          staleFiles.join("\n- ") +
          "\nRun pnpm licenses:generate:public and commit the results."
      );
    }

    console.log("Third-party notices are complete and current for all six public extensions.");
    return;
  }

  for (const { notice, outputPath } of expectedNotices) {
    writeNoticeAtomically(outputPath, notice);
    console.log("Generated " + relative(repositoryRoot, outputPath));
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
