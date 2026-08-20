#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

const publicComponents = [
  "apps/watched-filter",
  "apps/product-filter",
  "apps/quick-notes",
  "apps/time-zone-helper",
  "apps/site-reset",
  "apps/pathswitch",
  "packages/ui",
  "packages/ui-tokens"
];

const licenseOverridePaths = [
  "docs/license-overrides/react-remove-scroll-bar-2.3.8-LICENSE.txt",
  "docs/license-overrides/wxt-0.21.3-LICENSE.txt"
];
const publicLegalEmailPaths = new Set([
  ...publicComponents
    .filter((component) => component.startsWith("apps/"))
    .map((component) => `${component}/public/THIRD_PARTY_NOTICES.txt`),
  ...licenseOverridePaths
]);

const preservedFiles = [
  ".editorconfig",
  ".gitattributes",
  ".nvmrc",
  "AGENTS.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "eslint.config.mjs",
  "prettier.config.mjs",
  ".github/CODEOWNERS",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/dependabot.yml",
  "docs/asset-provenance.md",
  "docs/chrome-web-store-publishing.md",
  ...licenseOverridePaths,
  "docs/third-party-licenses.md",
  "docs/public/OPEN_SOURCE_READINESS.md",
  "scripts/check-public-release-licenses.mjs",
  "scripts/check-public-boundary.mjs",
  "scripts/export-public-workspace.mjs",
  "scripts/export-public-workspace.test.mjs",
  "scripts/generate-public-license-notices.mjs",
  "docs/public/LICENSE",
  "docs/public/README.md",
  "docs/public/package.json",
  "docs/public/pnpm-workspace.yaml",
  "docs/public/.gitignore",
  "docs/public/.prettierignore",
  "docs/public/ci.yml"
];

const rootTemplateMappings = [
  ["docs/public/LICENSE", "LICENSE"],
  ["docs/public/README.md", "README.md"],
  ["docs/public/package.json", "package.json"],
  ["docs/public/pnpm-workspace.yaml", "pnpm-workspace.yaml"],
  ["docs/public/.gitignore", ".gitignore"],
  ["docs/public/.prettierignore", ".prettierignore"],
  ["docs/public/ci.yml", ".github/workflows/ci.yml"],
  ["docs/public/OPEN_SOURCE_READINESS.md", "docs/open-source-readiness.md"]
];

const skippedDirectoryNames = new Set([
  ".git",
  ".local",
  ".idea",
  ".output",
  ".pnpm-store",
  ".wxt",
  "coverage",
  ".vscode",
  "dist",
  "node_modules"
]);
const incompleteMarkerName = ".public-export-incomplete";
const maximumSourceFileBytes = 20 * 1024 * 1024;
const sensitiveExtensions = new Set([
  ".7z",
  ".bak",
  ".bz2",
  ".cer",
  ".crt",
  ".code-workspace",
  ".csr",
  ".db",
  ".db3",
  ".der",
  ".dmp",
  ".doc",
  ".docx",
  ".dump",
  ".eml",
  ".gz",
  ".har",
  ".jks",
  ".kdbx",
  ".key",
  ".keystore",
  ".ldb",
  ".log",
  ".mbox",
  ".mobileprovision",
  ".ods",
  ".odp",
  ".ost",
  ".ovpn",
  ".p12",
  ".pdf",
  ".pem",
  ".pfx",
  ".ppk",
  ".ppt",
  ".pptx",
  ".pst",
  ".rar",
  ".sql",
  ".sqlite",
  ".sqlite3",
  ".tar",
  ".tgz",
  ".tsbuildinfo",
  ".xls",
  ".xlsx",
  ".xz",
  ".zip"
]);
const recognizableSecretPatterns = [
  ["private key", /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["GitLab token", /\bglpat-[A-Za-z0-9_-]{20,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Google OAuth secret", /\bGOCSPX-[0-9A-Za-z_-]{20,}\b/],
  ["npm access token", /\bnpm_[A-Za-z0-9]{30,}\b/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["Stripe live secret", /\bsk_live_[0-9A-Za-z]{20,}\b/],
  ["literal npm auth token", /\/\/[^\s:]+\/:_authToken\s*=\s*(?!\$\{)[^\s]+/],
  ["credential-bearing URL", /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:]+:[^\s/@]+@[^\s]+/i],
  ["local home path", /(?:\b[A-Za-z]:\\Users\\[^\\\s]+|\/home\/[^/\s]+|\/Users\/[^/\s]+)/]
];
const privateProductTokenGroups = [
  ["job", "apply"],
  ["inbox", "cleaner"],
  ["email", "assistant"]
];

class ExportError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    "Usage: node scripts/export-public-workspace.mjs <empty-destination> [--skip-install]",
    "",
    "Creates a new public-only workspace by copying an explicit allowlist.",
    "The destination must be outside this repository and either absent or empty.",
    "",
    "Options:",
    "  --skip-install  Copy only and leave a fail-closed incomplete marker; do not generate a lockfile.",
    "                  This mode exists only for offline structural tests and is not publication-ready.",
    "  --help          Show this help."
  ].join("\n");
}

function parseArguments(arguments_) {
  const positional = [];
  let skipInstall = false;

  for (const argument of arguments_) {
    if (argument === "--") {
      continue;
    }
    if (argument === "--help") {
      return { help: true, skipInstall: false };
    }
    if (argument === "--skip-install") {
      skipInstall = true;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new ExportError(`Unknown option: ${argument}\n\n${usage()}`, 2);
    }
    positional.push(argument);
  }

  if (positional.length !== 1) {
    throw new ExportError(`An explicit destination is required.\n\n${usage()}`, 2);
  }

  return { destination: positional[0], help: false, skipInstall };
}

function canonicalizePotentialPath(targetPath) {
  const missingSegments = [];
  let cursor = targetPath;

  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) {
      break;
    }
    missingSegments.unshift(basename(cursor));
    cursor = parent;
  }

  if (!existsSync(cursor)) {
    return targetPath;
  }

  return resolve(realpathSync(cursor), ...missingSegments);
}

function isPathInside(parentPath, candidatePath) {
  const pathFromParent = relative(parentPath, candidatePath);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== ".." && !isAbsolute(pathFromParent))
  );
}

function validateDestination(rawDestination) {
  const requestedDestination = resolve(rawDestination);

  if (existsSync(requestedDestination) && lstatSync(requestedDestination).isSymbolicLink()) {
    throw new ExportError("The export destination must not be a symbolic link.", 2);
  }

  const destination = canonicalizePotentialPath(requestedDestination);
  if (destination === parse(destination).root) {
    throw new ExportError("Refusing to export into a filesystem root.", 2);
  }

  if (isPathInside(repositoryRoot, destination)) {
    throw new ExportError("Refusing to export into the current repository or one of its subdirectories.", 2);
  }

  if (existsSync(destination)) {
    const destinationStat = lstatSync(destination);
    if (!destinationStat.isDirectory()) {
      throw new ExportError("The export destination exists and is not a directory.", 2);
    }
    if (readdirSync(destination).length > 0) {
      throw new ExportError(
        "The export destination must be empty; existing files are never removed or overwritten.",
        2
      );
    }
  }

  return destination;
}

function pathParts(relativePath) {
  if (!relativePath || isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.includes("\0")) {
    throw new ExportError(`Unsafe configured path: ${relativePath}`);
  }

  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new ExportError(`Unsafe configured path: ${relativePath}`);
  }
  return parts;
}

export function resolveSafeSourcePath(rootPath, relativePath) {
  const canonicalRoot = realpathSync(rootPath);
  const parts = pathParts(relativePath);
  let sourcePath = canonicalRoot;

  for (const [index, part] of parts.entries()) {
    sourcePath = join(sourcePath, part);
    const sourceStat = lstatSync(sourcePath);
    if (sourceStat.isSymbolicLink()) {
      throw new ExportError(`Refusing symbolic-link source path segment: ${relativePath}`);
    }
    if (index < parts.length - 1 && !sourceStat.isDirectory()) {
      throw new ExportError(`Public source ancestor is not a directory: ${relativePath}`);
    }
  }

  const canonicalSource = realpathSync(sourcePath);
  if (!isPathInside(canonicalRoot, canonicalSource)) {
    throw new ExportError(`Configured source escapes the repository: ${relativePath}`);
  }
  return sourcePath;
}

function absoluteSourcePath(relativePath) {
  return resolveSafeSourcePath(repositoryRoot, relativePath);
}
function publicGitInventory() {
  let output;
  try {
    output = execFileSync(
      "git",
      ["-C", repositoryRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...publicComponents],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ExportError(`Git candidate inventory failed; refusing to walk ignored workspace files: ${detail}`);
  }

  const files = new Set();
  const directories = new Set();

  for (const rawPath of output.split("\0").filter(Boolean)) {
    const relativePath = rawPath.replace(/^\.\//, "");
    pathParts(relativePath);

    if (!publicComponents.some((component) => relativePath.startsWith(`${component}/`))) {
      throw new ExportError(`Git returned a path outside the public component allowlist: ${relativePath}`);
    }

    files.add(relativePath);
    let cursor = relativePath;
    while (cursor.includes("/")) {
      cursor = cursor.slice(0, cursor.lastIndexOf("/"));
      directories.add(cursor);
    }
  }

  if (files.size === 0) {
    throw new ExportError("Git returned no public component files.");
  }

  return { directories, files };
}

function containsPrivateProductReference(value) {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return privateProductTokenGroups.some((tokens) => normalized.includes(tokens.join("")));
}

function hasSensitiveFilename(relativePath) {
  const name = relativePath.split("/").at(-1)?.toLowerCase() ?? "";
  const extension = extname(name);
  if (name === ".ds_store" || name === "thumbs.db" || name.endsWith(":zone.identifier")) {
    return true;
  }

  if ([".npmrc", ".pnpmfile.cjs", ".yarnrc", ".yarnrc.yml"].includes(name)) {
    return true;
  }

  if (/^\.env(?:\..+)?$/.test(name) && !/\.(?:example|sample|template)$/.test(name)) {
    return true;
  }
  if (/^(?:credentials?|secrets?|service[-_.]?account|oauth[-_.]?client|tokens?)(?:\..+)?$/.test(name)) {
    return true;
  }
  if (
    /^(?:bookmarks|cookies|history|id_rsa|id_ed25519|login data|local state|secure preferences|visited links|web data)$/.test(
      name
    )
  ) {
    return true;
  }

  return sensitiveExtensions.has(extension);
}

function sourceIdentity(sourceStat) {
  return {
    dev: sourceStat.dev,
    ino: sourceStat.ino,
    mode: sourceStat.mode,
    mtimeMs: sourceStat.mtimeMs,
    size: sourceStat.size
  };
}

function sourceDigest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function readStableSource(entry) {
  const revalidatedSourcePath = absoluteSourcePath(entry.sourceRelativePath);
  if (revalidatedSourcePath !== entry.sourcePath) {
    throw new ExportError(`Public source path changed after preflight: ${entry.sourceRelativePath}`);
  }

  const noFollow = constants.O_NOFOLLOW ?? 0;
  const descriptor = openSync(entry.sourcePath, constants.O_RDONLY | noFollow);

  try {
    const currentStat = fstatSync(descriptor);
    const expected = entry.identity;
    if (
      !currentStat.isFile() ||
      currentStat.dev !== expected.dev ||
      currentStat.ino !== expected.ino ||
      currentStat.mode !== expected.mode ||
      currentStat.mtimeMs !== expected.mtimeMs ||
      currentStat.size !== expected.size
    ) {
      throw new ExportError(
        `Public source changed after preflight; retry from a stable working tree: ${entry.sourceRelativePath}`
      );
    }

    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function inspectCopyPlan(plan) {
  const portableTargets = new Map();

  for (const entry of plan) {
    const portableTarget = entry.targetRelativePath.normalize("NFKC").toLowerCase();
    const previousTarget = portableTargets.get(portableTarget);
    if (previousTarget && previousTarget !== entry.targetRelativePath) {
      throw new ExportError(
        `Public targets collide on case-insensitive filesystems: ${previousTarget} and ${entry.targetRelativePath}`
      );
    }
    portableTargets.set(portableTarget, entry.targetRelativePath);

    for (const segment of entry.targetRelativePath.split("/")) {
      const portableSegment = segment.normalize("NFKC");
      if (
        [...portableSegment].some((character) => (character.codePointAt(0) ?? 0) < 32) ||
        /[<>:"|?*]/.test(portableSegment) ||
        /[. ]$/.test(portableSegment) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(portableSegment)
      ) {
        throw new ExportError(
          `Public target is not portable across supported filesystems: ${entry.targetRelativePath}`
        );
      }
    }

    if (entry.identity.size > maximumSourceFileBytes) {
      throw new ExportError(
        `Public source exceeds the ${maximumSourceFileBytes}-byte review limit: ${entry.sourceRelativePath}`
      );
    }
    if (hasSensitiveFilename(entry.sourceRelativePath)) {
      throw new ExportError(`Sensitive filename is not allowed in the public snapshot: ${entry.sourceRelativePath}`);
    }

    const content = readStableSource(entry);
    entry.contentSha256 = sourceDigest(content);
    const textContent = content.toString("utf8");
    for (const [label, pattern] of recognizableSecretPatterns) {
      if (pattern.test(textContent)) {
        throw new ExportError(`Recognizable ${label} material exists in ${entry.sourceRelativePath}`);
      }
    }

    if (
      !["scripts/check-public-boundary.mjs", "scripts/export-public-workspace.mjs"].includes(
        entry.targetRelativePath
      ) &&
      containsPrivateProductReference(textContent)
    ) {
      throw new ExportError(`Private-product reference exists in ${entry.sourceRelativePath}`);
    }

    const emails = textContent.match(/\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi) ?? [];
    const nonPlaceholderEmail = emails.find((email) => {
      const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
      return !["example.com", "example.org", "example.net", "example.invalid"].includes(domain);
    });
    if (nonPlaceholderEmail && !publicLegalEmailPaths.has(entry.targetRelativePath)) {
      throw new ExportError(`Non-placeholder email address exists in ${entry.sourceRelativePath}`);
    }
  }
}

function shouldSkipEntry(relativePath, directoryEntry) {
  const name = directoryEntry.name;
  if (directoryEntry.isDirectory() && skippedDirectoryNames.has(name)) {
    return true;
  }
  if (name === ".env" || (name.startsWith(".env.") && !/\.(?:example|sample|template)$/.test(name))) {
    return true;
  }
  if (/\.(?:docx|log|pdf|tsbuildinfo|zip)$/i.test(name) || name.endsWith(":Zone.Identifier")) {
    return true;
  }
  return relativePath.split("/").includes(".git");
}

function createCopyPlan() {
  const gitInventory = publicGitInventory();
  const plan = [];
  const targetSources = new Map();

  function addFile(sourceRelativePath, targetRelativePath) {
    const sourcePath = absoluteSourcePath(sourceRelativePath);
    const sourceStat = lstatSync(sourcePath);
    if (sourceStat.isSymbolicLink()) {
      throw new ExportError(`Refusing public source symlink: ${sourceRelativePath}`);
    }
    if (!sourceStat.isFile()) {
      throw new ExportError(`Required public source file is missing or not regular: ${sourceRelativePath}`);
    }

    pathParts(targetRelativePath);
    const previousSource = targetSources.get(targetRelativePath);
    if (previousSource && previousSource !== sourceRelativePath) {
      throw new ExportError(
        `Two public sources map to ${targetRelativePath}: ${previousSource} and ${sourceRelativePath}`
      );
    }

    targetSources.set(targetRelativePath, sourceRelativePath);
    plan.push({
      identity: sourceIdentity(sourceStat),
      sourcePath,
      sourceRelativePath,
      targetRelativePath
    });
  }

  function addDirectory(sourceRelativePath, targetRelativePath) {
    const sourceDirectory = absoluteSourcePath(sourceRelativePath);
    const sourceStat = lstatSync(sourceDirectory);
    if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
      throw new ExportError(`Required public source directory is missing or unsafe: ${sourceRelativePath}`);
    }

    function visit(currentSourcePath, currentSourceRelativePath, currentTargetRelativePath) {
      const entries = readdirSync(currentSourcePath, { withFileTypes: true }).sort((left, right) =>
        left.name.localeCompare(right.name)
      );

      for (const entry of entries) {
        const childSourceRelativePath = `${currentSourceRelativePath}/${entry.name}`;
        const isSelectedFile = gitInventory.files.has(childSourceRelativePath);
        const isSelectedDirectory = gitInventory.directories.has(childSourceRelativePath);
        if (!isSelectedFile && !isSelectedDirectory) {
          continue;
        }

        if (shouldSkipEntry(childSourceRelativePath, entry)) {
          throw new ExportError(
            `Tracked or candidate public file is prohibited from export: ${childSourceRelativePath}`
          );
        }

        const childSourcePath = join(currentSourcePath, entry.name);
        const childTargetRelativePath = `${currentTargetRelativePath}/${entry.name}`;
        if (entry.isSymbolicLink()) {
          throw new ExportError(`Refusing public source symlink: ${childSourceRelativePath}`);
        }
        if (entry.isDirectory() && isSelectedDirectory) {
          visit(childSourcePath, childSourceRelativePath, childTargetRelativePath);
        } else if (entry.isFile() && isSelectedFile) {
          addFile(childSourceRelativePath, childTargetRelativePath);
        } else {
          throw new ExportError(`Git candidate inventory disagrees with the filesystem: ${childSourceRelativePath}`);
        }
      }
    }

    visit(sourceDirectory, sourceRelativePath, targetRelativePath);
  }

  for (const component of publicComponents) {
    addDirectory(component, component);
  }
  const plannedComponentSources = new Set(plan.map((entry) => entry.sourceRelativePath));
  const unplannedGitCandidates = [...gitInventory.files].filter(
    (relativePath) => !plannedComponentSources.has(relativePath)
  );
  if (unplannedGitCandidates.length > 0) {
    throw new ExportError(
      `Git candidates were missing or could not be materialized: ${unplannedGitCandidates.join(", ")}`
    );
  }

  for (const file of preservedFiles) {
    addFile(file, file);
  }
  for (const [source, target] of rootTemplateMappings) {
    addFile(source, target);
  }

  return plan.sort((left, right) => left.targetRelativePath.localeCompare(right.targetRelativePath));
}

function copyPlanToDestination(plan, destination) {
  for (const entry of plan) {
    const targetPath = resolve(destination, ...pathParts(entry.targetRelativePath));
    if (!isPathInside(destination, targetPath)) {
      throw new ExportError(`Configured target escapes the destination: ${entry.targetRelativePath}`);
    }

    const content = readStableSource(entry);
    if (typeof entry.contentSha256 !== "string" || sourceDigest(content) !== entry.contentSha256) {
      throw new ExportError(
        `Public source content changed after inspection; retry from a stable working tree: ${entry.sourceRelativePath}`
      );
    }

    const mode = entry.identity.mode & 0o111 ? 0o755 : 0o644;
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, { flag: "wx", mode });
    chmodSync(targetPath, mode);
  }
}

function writeIncompleteMarker(destination) {
  writeFileSync(
    join(destination, incompleteMarkerName),
    [
      "INCOMPLETE PUBLIC EXPORT",
      "",
      "This snapshot did not pass lockfile generation and the final publication boundary gate.",
      "Delete it and rerun the exporter without --skip-install before publishing.",
      ""
    ].join("\n"),
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
}

function assertNoGeneratedInstallArtifacts(destination) {
  for (const relativePath of ["node_modules", ".pnpm-store", ".npmrc"]) {
    if (existsSync(join(destination, relativePath))) {
      throw new ExportError(`Dependency tooling created an unexpected export artifact: ${relativePath}`);
    }
  }
}

function finishPublicationExport(destination) {
  const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const pnpmEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/^npm_config_(?:registry|userconfig)$/i.test(name))
  );
  pnpmEnvironment.CI = "true";
  pnpmEnvironment.npm_config_registry = "https://registry.npmjs.org/";
  pnpmEnvironment.npm_config_userconfig = process.platform === "win32" ? "NUL" : "/dev/null";
  execFileSync(pnpmExecutable, ["install", "--lockfile-only", "--ignore-scripts"], {
    cwd: destination,
    env: pnpmEnvironment,
    stdio: "inherit"
  });

  assertNoGeneratedInstallArtifacts(destination);
  const lockfilePath = join(destination, "pnpm-lock.yaml");
  if (!existsSync(lockfilePath) || readFileSync(lockfilePath, "utf8").trim().length === 0) {
    throw new ExportError("pnpm did not generate a usable public lockfile.");
  }

  const markerPath = join(destination, incompleteMarkerName);
  unlinkSync(markerPath);
  try {
    execFileSync(process.execPath, [join(destination, "scripts/check-public-boundary.mjs"), "--export"], {
      cwd: destination,
      stdio: "inherit"
    });
  } catch (error) {
    writeIncompleteMarker(destination);
    throw error;
  }
}

function createStagingDirectory(destination) {
  const destinationParent = dirname(destination);
  mkdirSync(destinationParent, { recursive: true });
  return mkdtempSync(join(destinationParent, `.${basename(destination)}.public-export-`));
}

function publishStagingDirectory(stagingDirectory, destination) {
  if (existsSync(destination)) {
    const destinationStat = lstatSync(destination);
    if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory() || readdirSync(destination).length > 0) {
      throw new ExportError("The export destination changed after validation; no content was overwritten.");
    }

    const preservedEmptyDestination = `${stagingDirectory}.original-empty-destination`;
    renameSync(destination, preservedEmptyDestination);
    try {
      renameSync(stagingDirectory, destination);
    } catch (error) {
      renameSync(preservedEmptyDestination, destination);
      throw error;
    }

    try {
      rmSync(preservedEmptyDestination);
    } catch {
      console.warn(`WARNING: could not remove preserved empty directory ${preservedEmptyDestination}.`);
    }
    return;
  }

  renameSync(stagingDirectory, destination);
}

function discardStagingDirectory(stagingDirectory, destination) {
  if (!existsSync(stagingDirectory)) {
    return;
  }

  const stagingStat = lstatSync(stagingDirectory);
  const expectedPrefix = `.${basename(destination)}.public-export-`;
  if (
    stagingStat.isSymbolicLink() ||
    !stagingStat.isDirectory() ||
    dirname(stagingDirectory) !== dirname(destination) ||
    !basename(stagingDirectory).startsWith(expectedPrefix)
  ) {
    console.error(`Refusing to remove unexpected staging path: ${stagingDirectory}`);
    return;
  }

  rmSync(stagingDirectory, { force: true, recursive: true });
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const destination = validateDestination(options.destination);
  const plan = createCopyPlan();
  inspectCopyPlan(plan);

  const stagingDirectory = createStagingDirectory(destination);
  let published = false;
  try {
    writeIncompleteMarker(stagingDirectory);
    copyPlanToDestination(plan, stagingDirectory);

    if (options.skipInstall) {
      publishStagingDirectory(stagingDirectory, destination);
      published = true;
      console.log(`Copied ${plan.length} allowlisted files to ${destination}.`);
      console.warn(`WARNING: --skip-install left ${incompleteMarkerName}; this snapshot is not ready to publish.`);
      return;
    }

    finishPublicationExport(stagingDirectory);
    publishStagingDirectory(stagingDirectory, destination);
    published = true;
    console.log(`Copied ${plan.length} allowlisted files to ${destination}.`);
    console.log("Public export completed: lockfile generated and export boundary validated.");
  } finally {
    if (!published) {
      discardStagingDirectory(stagingDirectory, destination);
    }
  }
}

const invokedAsScript =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedAsScript) {
  try {
    main();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Public export failed: ${detail}`);
    process.exitCode = error instanceof ExportError ? error.exitCode : 1;
  }
}
