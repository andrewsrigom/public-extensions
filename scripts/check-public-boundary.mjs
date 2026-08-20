#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT_TEMPLATE_MAPPINGS } from "./export-public-workspace.mjs";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const modeArgument = process.argv[2];

if (modeArgument === "--help") {
  console.log("Usage: node scripts/check-public-boundary.mjs [--export|--workspace]");
  console.log("  --export     Validate a publication snapshot (default).");
  console.log("  --workspace  Validate public paths while private workspace products remain present.");
  process.exit(0);
}

if (process.argv.length > 3 || ![undefined, "--export", "--workspace"].includes(modeArgument)) {
  console.error("Usage: node scripts/check-public-boundary.mjs [--export|--workspace]");
  process.exit(2);
}

const mode = modeArgument === "--workspace" ? "workspace" : "export";
const isWorkspaceMode = mode === "workspace";

const publicApps = ["watched-filter", "product-filter", "quick-notes", "time-zone-helper", "site-reset", "pathswitch"];
const publicPackages = ["ui", "ui-tokens"];
const publicComponents = [
  ...publicApps.map((name) => `apps/${name}`),
  ...publicPackages.map((name) => `packages/${name}`)
];
const licenseGeneratorPath = "scripts/generate-public-license-notices.mjs";
const releaseLicenseCheckerPath = "scripts/check-public-release-licenses.mjs";
const releaseManifestCheckerPath = "scripts/check-public-release-manifests.mjs";
const publicExtensionSmokePath = "scripts/smoke-public-extensions.mjs";
const licenseOverridePaths = [
  "docs/license-overrides/react-remove-scroll-bar-2.3.8-LICENSE.txt",
  "docs/license-overrides/wxt-0.21.3-LICENSE.txt"
];
const publicLegalEmailPaths = new Set([
  ...publicApps.map((app) => `apps/${app}/public/THIRD_PARTY_NOTICES.txt`),
  ...licenseOverridePaths
]);
const requiredRepositoryFiles = [
  "AGENTS.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".editorconfig",
  ".gitattributes",
  ".github/CODEOWNERS",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/dependabot.yml",
  ...licenseOverridePaths,
  "docs/asset-provenance.md",
  "docs/third-party-licenses.md",
  "docs/release-checklist.md"
];
const requiredAppDocuments = ["README.md", "PRIVACY.md", "CHANGELOG.md"];
const requiredAppLegalDocuments = ["public/LICENSE", "public/TRADEMARKS.md", "public/THIRD_PARTY_NOTICES.txt"];
const publicRootScripts = [
  "build:public:extensions",
  "format:check:public",
  "licenses:check:release",
  "licenses:check:public",
  "lint:public",
  "manifests:check:release",
  "quality:public",
  "playwright:install:public",
  "release:preflight:public",
  "release:check:public",
  "test:e2e:public",
  "test:e2e:public:built"
];
const expectedAppReleaseCommand = "pnpm typecheck && pnpm test:run && pnpm zip";
const expectedPublicReleasePreflightCommand =
  "pnpm check:public-boundary && pnpm licenses:check:public && pnpm format:check:public && pnpm lint:public && pnpm ui:quality";
const publicAppReleaseCommand = `pnpm ${publicApps
  .map((app) => `--filter ${app}`)
  .join(" ")} --recursive --workspace-concurrency=4 release:check`;
const expectedPublicReleaseCommand = `pnpm release:preflight:public && ${publicAppReleaseCommand} && pnpm manifests:check:release && pnpm licenses:check:release`;
const expectedPublicBuildCommand = `pnpm ${publicApps
  .map((app) => `--filter ${app}`)
  .join(" ")} --recursive --workspace-concurrency=4 build`;
const expectedPublicE2eBuiltCommand = `node ${publicExtensionSmokePath}`;
const expectedPublicE2eCommand = "pnpm build:public:extensions && pnpm test:e2e:public:built";
const expectedPlaywrightInstallCommand = "playwright install chromium";
const expectedPlaywrightVersion = "1.62.1";
const workspaceQualityAllScripts = ["check:public-boundary", "test:public-export", "licenses:check:public"];
const workspaceMetadataFiles = ["pnpm-workspace.yaml", "pnpm-lock.yaml"];
const privateProductPattern =
  /(?:job[\s_.:/-]*apply(?:[\s_.:/-]*assistant)?|inbox[\s_.:/-]*cleaner|email[\s_.:/-]*assistant)/i;
const scannerRelativePath = "scripts/check-public-boundary.mjs";
const workspacePublicFiles = new Set([
  ...requiredRepositoryFiles,
  "docs/public/LICENSE",
  "docs/public/TRADEMARKS.md",
  "README.md",
  "package.json",
  "docs/chrome-web-store-publishing.md",
  licenseGeneratorPath,
  releaseManifestCheckerPath,
  publicExtensionSmokePath,
  scannerRelativePath
]);
const incompleteMarkerName = ".public-export-incomplete";
const expectedExportFiles = new Set([
  ".editorconfig",
  ".gitattributes",
  ".github/CODEOWNERS",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".gitignore",
  ".nvmrc",
  ".prettierignore",
  "AGENTS.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "TRADEMARKS.md",
  "README.md",
  "SECURITY.md",
  "docs/asset-provenance.md",
  "docs/chrome-web-store-publishing.md",
  ...licenseOverridePaths,
  "docs/release-checklist.md",
  "docs/third-party-licenses.md",
  "docs/public/.gitignore",
  "docs/public/.prettierignore",
  "docs/public/ci.yml",
  "docs/public/LICENSE",
  "docs/public/TRADEMARKS.md",
  "docs/public/RELEASE_CHECKLIST.md",
  "docs/public/package.json",
  "docs/public/pnpm-workspace.yaml",
  "docs/public/README.md",
  "eslint.config.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "prettier.config.mjs",
  licenseGeneratorPath,
  releaseLicenseCheckerPath,
  releaseManifestCheckerPath,
  publicExtensionSmokePath,
  scannerRelativePath,
  "scripts/export-public-workspace.mjs",
  "scripts/export-public-workspace.test.mjs"
]);
const expectedExportImporters = [".", ...publicComponents];
const expectedExportPrefixes = publicComponents.map((component) => `${component}/`);
const expectedExportLocalLinks = new Set(["link:../../packages/ui"]);

const errors = [];
const notes = [];

function normalizePath(value) {
  return value.split(sep).join("/").replace(/^\.\//, "");
}

function absolutePath(relativePath) {
  const candidatePath = resolve(repositoryRoot, ...relativePath.split("/"));
  const pathFromRoot = relative(repositoryRoot, candidatePath);
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`Unsafe repository path: ${relativePath}`);
  }
  return candidatePath;
}

function addError(category, message) {
  errors.push(`[${category}] ${message}`);
}

function formatList(values, maximum = 12) {
  const sorted = [...new Set(values)].sort();
  if (sorted.length <= maximum) {
    return sorted.join(", ");
  }

  return `${sorted.slice(0, maximum).join(", ")} (+${sorted.length - maximum} more)`;
}

function walkFallback(directory, collected = []) {
  const ignoredInstallationEntries = new Set([".git", ".pnpm-store", "node_modules"]);
  const skippedDirectoryContents = new Set([".local", ".idea", ".output", ".wxt", "coverage", ".vscode", "dist"]);

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    const relativeEntryPath = normalizePath(relative(repositoryRoot, entryPath));

    // Source archives legitimately gain dependency directories and workspace
    // symlinks after `pnpm install`. Ignore them by name before inspecting the
    // Dirent type so package-level `node_modules` symlinks are handled too.
    if (ignoredInstallationEntries.has(entry.name)) continue;

    if (entry.isDirectory() && skippedDirectoryContents.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      walkFallback(entryPath, collected);
    } else {
      collected.push(relativeEntryPath);
    }
  }

  return collected;
}

function repositoryFiles() {
  try {
    const gitTopLevel = execFileSync("git", ["-C", repositoryRoot, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    if (!gitTopLevel || realpathSync(gitTopLevel) !== repositoryRoot) {
      throw new Error("The publication snapshot is not the root of its own Git worktree.");
    }

    const output = execFileSync(
      "git",
      ["-C", repositoryRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    notes.push("File inventory: Git tracked files plus non-ignored untracked files.");
    return [
      ...new Set(
        output
          .split("\0")
          .filter(Boolean)
          .map(normalizePath)
          // `git ls-files --cached` still reports paths deleted in the working
          // tree. Validate the snapshot on disk so legitimate renames can run
          // the boundary gate before they are staged.
          .filter((relativePath) => existsSync(absolutePath(relativePath)))
      )
    ];
  } catch {
    notes.push("File inventory: filesystem fallback; generated directory contents were not traversed.");
    return walkFallback(repositoryRoot);
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(absolutePath(relativePath), "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError("manifest", `${relativePath} is missing or invalid JSON: ${detail}`);
    return undefined;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalJson(nestedValue)])
    );
  }
  return value;
}

function checkPublicTemplateManifestDrift() {
  const rootManifest = readJson("package.json");
  const templateManifest = readJson("docs/public/package.json");
  if (!rootManifest || !templateManifest) {
    return;
  }

  for (const field of ["license", "packageManager", "engines", "devDependencies"]) {
    const rootValue = JSON.stringify(canonicalJson(rootManifest[field]));
    const templateValue = JSON.stringify(canonicalJson(templateManifest[field]));
    if (rootValue !== templateValue) {
      addError("metadata", `docs/public/package.json field ${field} has drifted from the tested root package.json.`);
    }
  }

  const templateScripts = templateManifest.scripts ?? {};
  const rootPublicScripts = Object.fromEntries(
    Object.keys(templateScripts).map((name) => [name, rootManifest.scripts?.[name]])
  );
  if (JSON.stringify(canonicalJson(rootPublicScripts)) !== JSON.stringify(canonicalJson(templateScripts))) {
    addError("metadata", "docs/public/package.json public scripts have drifted from the tested root package.json.");
  }
}

function checkRootTemplateMappingDrift() {
  if (isWorkspaceMode) {
    return;
  }

  for (const [templatePath, rootPath] of ROOT_TEMPLATE_MAPPINGS) {
    try {
      const template = readFileSync(absolutePath(templatePath));
      const rootFile = readFileSync(absolutePath(rootPath));
      if (!template.equals(rootFile)) {
        addError(
          "metadata",
          `${rootPath} has drifted from ${templatePath}; publication would replace the reviewed root file.`
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError("metadata", `${templatePath} and ${rootPath} could not be compared: ${detail}`);
    }
  }
}

function checkRequiredFile(relativePath, category = "documentation") {
  const fullPath = absolutePath(relativePath);
  if (!existsSync(fullPath)) {
    addError(category, `${relativePath} is missing.`);
    return;
  }

  try {
    if (readFileSync(fullPath, "utf8").trim().length < 40) {
      addError(category, `${relativePath} is empty or appears to be a placeholder.`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(category, `${relativePath} could not be read: ${detail}`);
  }
}

function componentNames(files, parent) {
  const prefix = `${parent}/`;
  const names = new Set();

  for (const file of files) {
    if (!file.startsWith(prefix)) {
      continue;
    }

    const name = file.slice(prefix.length).split("/", 1)[0];
    if (name) {
      names.add(name);
    }
  }

  return names;
}

function checkExactExportFileAllowlist(files) {
  if (isWorkspaceMode) {
    return;
  }

  if (files.includes(incompleteMarkerName)) {
    addError("incomplete", `${incompleteMarkerName} is present; regenerate the snapshot without --skip-install.`);
  }

  const unexpectedFiles = files.filter(
    (relativePath) =>
      relativePath !== incompleteMarkerName &&
      !expectedExportFiles.has(relativePath) &&
      !expectedExportPrefixes.some((prefix) => relativePath.startsWith(prefix))
  );
  if (unexpectedFiles.length > 0) {
    addError("allowlist", `Files outside the exact publication manifest are present: ${formatList(unexpectedFiles)}.`);
  }

  const availableFiles = new Set(files);
  const missingFiles = [...expectedExportFiles].filter((relativePath) => !availableFiles.has(relativePath));
  if (missingFiles.length > 0) {
    addError("allowlist", `Required publication files are missing: ${formatList(missingFiles)}.`);
  }
}
function checkComponentAllowlist(files) {
  const actualApps = componentNames(files, "apps");
  const actualPackages = componentNames(files, "packages");
  const unexpectedApps = [...actualApps].filter((name) => !publicApps.includes(name));
  const unexpectedPackages = [...actualPackages].filter((name) => !publicPackages.includes(name));

  if (!isWorkspaceMode) {
    if (unexpectedApps.length > 0) {
      addError("allowlist", `Non-public app directories are present: ${formatList(unexpectedApps)}.`);
    }
    if (unexpectedPackages.length > 0) {
      addError("allowlist", `Non-public package directories are present: ${formatList(unexpectedPackages)}.`);
    }
  }

  for (const component of publicComponents) {
    if (!existsSync(absolutePath(component))) {
      addError("allowlist", `Required public component ${component} is missing.`);
    }
  }
}

function checkLicenseBoundary() {
  const sourceLicensePath = "docs/public/LICENSE";
  const publicLicensePath = "LICENSE";
  const sourceLicenseExists = existsSync(absolutePath(sourceLicensePath));
  const publicLicenseExists = existsSync(absolutePath(publicLicensePath));

  if (isWorkspaceMode) {
    checkRequiredFile(sourceLicensePath, "license");
    if (publicLicenseExists) {
      addError("license", "A root LICENSE must not cover the mixed public/private internal hub.");
    }
  } else {
    checkRequiredFile(publicLicensePath, "license");

    if (sourceLicenseExists && publicLicenseExists) {
      compareLicenseBytes(sourceLicensePath, publicLicensePath);
    }
  }

  const canonicalLicensePath = isWorkspaceMode ? sourceLicensePath : publicLicensePath;
  for (const app of publicApps) {
    compareLicenseBytes(canonicalLicensePath, `apps/${app}/public/LICENSE`);
  }
}

function checkTrademarkBoundary() {
  const sourcePolicyPath = "docs/public/TRADEMARKS.md";
  const publicPolicyPath = "TRADEMARKS.md";
  const sourcePolicyExists = existsSync(absolutePath(sourcePolicyPath));
  const publicPolicyExists = existsSync(absolutePath(publicPolicyPath));

  if (isWorkspaceMode) {
    checkRequiredFile(sourcePolicyPath, "license");
  } else {
    checkRequiredFile(publicPolicyPath, "license");
    if (sourcePolicyExists && publicPolicyExists) {
      compareLicenseBytes(sourcePolicyPath, publicPolicyPath);
    }
  }

  const canonicalPolicyPath = isWorkspaceMode ? sourcePolicyPath : publicPolicyPath;
  for (const app of publicApps) {
    compareLicenseBytes(canonicalPolicyPath, `apps/${app}/public/TRADEMARKS.md`);
  }
}

function compareLicenseBytes(expectedPath, actualPath) {
  try {
    const expected = readFileSync(absolutePath(expectedPath));
    const actual = readFileSync(absolutePath(actualPath));
    if (!expected.equals(actual)) {
      addError("license", `${actualPath} must be byte-for-byte identical to ${expectedPath}.`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError("license", `${expectedPath} and ${actualPath} could not be compared: ${detail}`);
  }
}

function checkManifest(relativePath) {
  const manifest = readJson(relativePath);
  if (!manifest) {
    return undefined;
  }

  if (manifest.private !== true) {
    addError("manifest", `${relativePath} must set "private": true to prevent accidental registry publication.`);
  }

  if (!isWorkspaceMode && relativePath === "package.json" && manifest.license !== "SEE LICENSE IN LICENSE") {
    addError("license", 'package.json must declare "license": "SEE LICENSE IN LICENSE" in the public export.');
  }

  return manifest;
}

function checkDocumentation() {
  for (const file of requiredRepositoryFiles) {
    checkRequiredFile(file);
  }
  checkRequiredFile(licenseGeneratorPath, "licenses");
  checkRequiredFile(releaseLicenseCheckerPath, "licenses");
  checkRequiredFile(releaseManifestCheckerPath, "release");
  checkRequiredFile(publicExtensionSmokePath, "tests");

  for (const app of publicApps) {
    for (const document of [...requiredAppDocuments, ...requiredAppLegalDocuments]) {
      checkRequiredFile(`apps/${app}/${document}`);
    }
  }
}

function checkPackageScripts(manifests) {
  const references = [];

  for (const [manifestPath, manifest] of manifests) {
    if (!manifest || typeof manifest.scripts !== "object" || manifest.scripts === null) {
      continue;
    }

    let scripts = Object.entries(manifest.scripts);
    if (manifestPath === "package.json") {
      const missingScripts = publicRootScripts.filter((name) => typeof manifest.scripts[name] !== "string");
      if (missingScripts.length > 0) {
        addError("scripts", `Required root public scripts are missing: ${formatList(missingScripts)}.`);
      }

      const licenseCheckCommand = manifest.scripts["licenses:check:public"];
      const expectedLicenseCheckCommand = `node ${licenseGeneratorPath} --check`;
      if (typeof licenseCheckCommand === "string" && licenseCheckCommand !== expectedLicenseCheckCommand) {
        addError("scripts", `licenses:check:public must be exactly "${expectedLicenseCheckCommand}".`);
      }

      const releaseLicenseCheckCommand = manifest.scripts["licenses:check:release"];
      const expectedReleaseLicenseCheckCommand = `node ${releaseLicenseCheckerPath}`;
      if (
        typeof releaseLicenseCheckCommand === "string" &&
        releaseLicenseCheckCommand !== expectedReleaseLicenseCheckCommand
      ) {
        addError("scripts", `licenses:check:release must be exactly "${expectedReleaseLicenseCheckCommand}".`);
      }

      const releaseManifestCheckCommand = manifest.scripts["manifests:check:release"];
      const expectedReleaseManifestCheckCommand = `node ${releaseManifestCheckerPath}`;
      if (
        typeof releaseManifestCheckCommand === "string" &&
        releaseManifestCheckCommand !== expectedReleaseManifestCheckCommand
      ) {
        addError("scripts", `manifests:check:release must be exactly "${expectedReleaseManifestCheckCommand}".`);
      }

      const releasePreflightCommand = manifest.scripts["release:preflight:public"];
      if (
        typeof releasePreflightCommand === "string" &&
        releasePreflightCommand !== expectedPublicReleasePreflightCommand
      ) {
        addError("scripts", `release:preflight:public must be exactly "${expectedPublicReleasePreflightCommand}".`);
      }

      const releaseCommand = manifest.scripts["release:check:public"];
      if (typeof releaseCommand === "string" && releaseCommand !== expectedPublicReleaseCommand) {
        addError("scripts", `release:check:public must be exactly "${expectedPublicReleaseCommand}".`);
      } else if (typeof releaseCommand === "string" && !/\bpnpm\s+licenses:check:release\b/.test(releaseCommand)) {
        addError("scripts", "release:check:public must run pnpm licenses:check:release after creating the ZIPs.");
      }

      const qualityCommand = manifest.scripts["quality:public"];
      if (typeof qualityCommand === "string" && !/\bpnpm\s+licenses:check:public\b/.test(qualityCommand)) {
        addError("scripts", "quality:public must run pnpm licenses:check:public before publication.");
      }

      const publicBuildCommand = manifest.scripts["build:public:extensions"];
      if (typeof publicBuildCommand === "string" && publicBuildCommand !== expectedPublicBuildCommand) {
        addError("scripts", `build:public:extensions must be exactly "${expectedPublicBuildCommand}".`);
      }

      const playwrightInstallCommand = manifest.scripts["playwright:install:public"];
      if (
        typeof playwrightInstallCommand === "string" &&
        playwrightInstallCommand !== expectedPlaywrightInstallCommand
      ) {
        addError("scripts", `playwright:install:public must be exactly "${expectedPlaywrightInstallCommand}".`);
      }

      const playwrightVersion = manifest.devDependencies?.["@playwright/test"];
      if (playwrightVersion !== expectedPlaywrightVersion) {
        addError(
          "metadata",
          `@playwright/test must be pinned exactly to ${expectedPlaywrightVersion}; found ${JSON.stringify(playwrightVersion)}.`
        );
      }

      const e2eBuiltCommand = manifest.scripts["test:e2e:public:built"];
      if (typeof e2eBuiltCommand === "string" && e2eBuiltCommand !== expectedPublicE2eBuiltCommand) {
        addError("scripts", `test:e2e:public:built must be exactly "${expectedPublicE2eBuiltCommand}".`);
      }

      const e2eCommand = manifest.scripts["test:e2e:public"];
      if (typeof e2eCommand === "string" && e2eCommand !== expectedPublicE2eCommand) {
        addError("scripts", `test:e2e:public must be exactly "${expectedPublicE2eCommand}".`);
      }

      if (isWorkspaceMode) {
        const qualityAllCommand = manifest.scripts["quality:all"];
        if (typeof qualityAllCommand !== "string") {
          addError("scripts", "Required root script quality:all is missing.");
        } else {
          const qualityAllCommands = new Set(qualityAllCommand.split("&&").map((command) => command.trim()));
          const missingQualityAllCommands = workspaceQualityAllScripts
            .map((name) => `pnpm ${name}`)
            .filter((command) => !qualityAllCommands.has(command));
          if (missingQualityAllCommands.length > 0) {
            addError("scripts", `quality:all must directly run: ${formatList(missingQualityAllCommands)}.`);
          }
        }

        scripts = publicRootScripts
          .filter((name) => typeof manifest.scripts[name] === "string")
          .map((name) => [name, manifest.scripts[name]]);
      }
    }

    if (publicApps.some((app) => manifestPath === `apps/${app}/package.json`)) {
      const releaseCommand = manifest.scripts["release:check"];
      if (releaseCommand !== expectedAppReleaseCommand) {
        addError(
          "scripts",
          `${manifestPath} release:check must be exactly "${expectedAppReleaseCommand}" so CI runs each test, typecheck, and ZIP build once.`
        );
      }
    }

    for (const [name, command] of scripts) {
      if (privateProductPattern.test(`${name} ${String(command)}`)) {
        references.push(`${manifestPath}#${name}`);
      }
    }
  }

  if (references.length > 0) {
    addError("scripts", `Checked package scripts reference private products: ${formatList(references)}.`);
  }
}

function isAutomationFile(relativePath) {
  if (relativePath === scannerRelativePath) {
    return false;
  }

  if (relativePath.startsWith("scripts/")) {
    return true;
  }

  return /^\.github\/workflows\/[^/]+\.(?:ya?ml)$/i.test(relativePath);
}

function checkAutomation(files) {
  const references = [];

  for (const relativePath of files.filter(isAutomationFile)) {
    if (privateProductPattern.test(relativePath)) {
      references.push(relativePath);
      continue;
    }

    try {
      if (privateProductPattern.test(readFileSync(absolutePath(relativePath), "utf8"))) {
        references.push(relativePath);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError("scripts", `${relativePath} could not be inspected: ${detail}`);
    }
  }

  if (references.length > 0) {
    addError("scripts", `Public automation references private products: ${formatList(references)}.`);
  }
}

function checkWorkflowSecurity() {
  if (isWorkspaceMode) {
    return;
  }

  const workflowPath = ".github/workflows/ci.yml";
  let content;
  try {
    content = readFileSync(absolutePath(workflowPath), "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError("ci", `${workflowPath} could not be inspected: ${detail}`);
    return;
  }

  const unpinnedActions = [];
  for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    const action = match[1];
    if (action.startsWith("./")) {
      continue;
    }

    const separatorIndex = action.lastIndexOf("@");
    const reference = separatorIndex >= 0 ? action.slice(separatorIndex + 1) : "";
    if (!/^[0-9a-f]{40}$/i.test(reference)) {
      unpinnedActions.push(action);
    }
  }
  if (unpinnedActions.length > 0) {
    addError("ci", `GitHub Actions are not pinned to full commit SHAs: ${formatList(unpinnedActions)}.`);
  }

  const requiredPatterns = [
    ["pull request trigger", /^ {2}pull_request:\s*$/m],
    ["manual trigger", /^ {2}workflow_dispatch:\s*$/m],
    ["required check name", /^\s{4}name:\s*Validate public workspace\s*$/m],
    ["concurrent run cancellation", /^\s+cancel-in-progress:\s*true\s*$/m],
    ["read-only contents permission", /^permissions:\s*\n\s+contents:\s+read\s*$/m],
    ["checkout credential isolation", /persist-credentials:\s*false/],
    ["frozen lockfile install", /pnpm install --frozen-lockfile/],
    ["public exporter test", /pnpm test:public-export/],
    ["public release artifact gate", /pnpm release:check:public/],
    ["high-severity full dependency audit", /pnpm audit --audit-level[= ]high/]
  ];
  for (const [label, pattern] of requiredPatterns) {
    if (!pattern.test(content)) {
      addError("ci", `${workflowPath} is missing ${label}.`);
    }
  }
  if (/pnpm audit --prod(?:\s|$)/.test(content)) {
    addError("ci", `${workflowPath} must not limit the publication audit to production dependencies.`);
  }
}
function checkWorkspaceMetadata() {
  const references = [];

  for (const relativePath of workspaceMetadataFiles) {
    try {
      if (privateProductPattern.test(readFileSync(absolutePath(relativePath), "utf8"))) {
        references.push(relativePath);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError("metadata", `${relativePath} could not be inspected: ${detail}`);
    }
  }

  if (references.length > 0) {
    addError("metadata", `Workspace metadata references private products: ${formatList(references)}.`);
  }
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"')))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function compareExactValues(actualValues, expectedValues, label) {
  const actual = new Set(actualValues);
  const expected = new Set(expectedValues);
  const missing = [...expected].filter((value) => !actual.has(value));
  const unexpected = [...actual].filter((value) => !expected.has(value));

  if (missing.length > 0) {
    addError("metadata", `${label} is missing: ${formatList(missing)}.`);
  }
  if (unexpected.length > 0) {
    addError("metadata", `${label} contains unexpected entries: ${formatList(unexpected)}.`);
  }
  if (actualValues.length !== actual.size) {
    addError("metadata", `${label} contains duplicate entries.`);
  }
}

function workspacePackageEntries(content) {
  const lines = content.split(/\r?\n/);
  const packagesIndex = lines.findIndex((line) => line.trim() === "packages:");
  if (packagesIndex < 0) {
    return [];
  }

  const packages = [];
  for (const line of lines.slice(packagesIndex + 1)) {
    if (line.trim() === "") {
      continue;
    }
    if (!/^\s/.test(line)) {
      break;
    }

    const match = line.match(/^\s{2}-\s+(.+?)\s*$/);
    if (match) {
      packages.push(unquoteYamlScalar(match[1]));
    }
  }
  return packages;
}

function lockfileImporters(content) {
  const lines = content.split(/\r?\n/);
  const importersIndex = lines.findIndex((line) => line.trim() === "importers:");
  if (importersIndex < 0) {
    return [];
  }

  const importers = [];
  for (const line of lines.slice(importersIndex + 1)) {
    if (line.trim() === "") {
      continue;
    }
    if (!/^\s/.test(line)) {
      break;
    }

    // pnpm emits empty workspace importers as `path: {}`. Match exactly two
    // spaces so nested dependency/package keys cannot be mistaken for importers.
    const match = line.match(/^ {2}(\S[^:]*):(?:\s+\{\})?\s*$/);
    if (match) {
      importers.push(unquoteYamlScalar(match[1]));
    }
  }
  return importers;
}

function checkExportMetadataStructure() {
  if (isWorkspaceMode) {
    return;
  }

  let workspaceContent;
  let lockfileContent;
  try {
    workspaceContent = readFileSync(absolutePath("pnpm-workspace.yaml"), "utf8");
    lockfileContent = readFileSync(absolutePath("pnpm-lock.yaml"), "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError("metadata", `Public workspace metadata could not be read: ${detail}`);
    return;
  }

  compareExactValues(
    workspacePackageEntries(workspaceContent),
    expectedExportImporters,
    "pnpm-workspace.yaml packages"
  );

  if (!/^lockfileVersion:\s*['"]?9(?:\.\d+)?['"]?\s*$/m.test(lockfileContent)) {
    addError("metadata", "pnpm-lock.yaml does not declare the expected v9 lockfile format.");
  }
  compareExactValues(lockfileImporters(lockfileContent), expectedExportImporters, "pnpm-lock.yaml importers");

  const localReferences = [...lockfileContent.matchAll(/^\s+(?:version|resolution):\s+((?:file|link):[^\s]+)\s*$/gm)];
  for (const match of localReferences) {
    const reference = unquoteYamlScalar(match[1]);
    if (reference.startsWith("file:")) {
      addError("metadata", `pnpm-lock.yaml contains unsupported local file dependency ${reference}.`);
      continue;
    }

    const target = reference.slice("link:".length);
    if (isAbsolute(target) || target.includes("\\")) {
      addError("metadata", `pnpm-lock.yaml contains non-portable local link ${reference}.`);
    } else if (!expectedExportLocalLinks.has(reference)) {
      addError("metadata", `pnpm-lock.yaml contains unapproved workspace link ${reference}.`);
    }
  }
}
function belongsToPublicSurface(relativePath) {
  const [parent, component] = relativePath.split("/");
  if (parent === "apps") {
    return publicApps.includes(component);
  }
  if (parent === "packages") {
    return publicPackages.includes(component);
  }

  if (!isWorkspaceMode) {
    return true;
  }

  return workspacePublicFiles.has(relativePath) || relativePath.startsWith("docs/public/");
}

const maximumPublicFileBytes = 20 * 1024 * 1024;
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

const prohibitedArtifactDirectories = new Set([
  ".idea",
  ".local",
  ".output",
  ".pnpm-store",
  ".vscode",
  ".wxt",
  "coverage",
  "dist",
  "node_modules"
]);

function hasProhibitedArtifactPath(relativePath) {
  const segments = relativePath.split("/").map((segment) => segment.toLowerCase());
  const name = segments.at(-1) ?? "";
  return (
    segments.some((segment) => prohibitedArtifactDirectories.has(segment)) ||
    sensitiveExtensions.has(extname(name)) ||
    name.endsWith(":zone.identifier")
  );
}
function hasNonPortablePath(relativePath) {
  return relativePath.split("/").some((segment) => {
    const portableSegment = segment.normalize("NFKC");
    return (
      [...portableSegment].some((character) => (character.codePointAt(0) ?? 0) < 32) ||
      /[<>:"|?*]/.test(portableSegment) ||
      /[. ]$/.test(portableSegment) ||
      /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(portableSegment)
    );
  });
}
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

function checkSensitivePublicFiles(files) {
  const publicFiles = files.filter(belongsToPublicSurface);
  const sensitiveNames = [];
  const symlinks = [];
  const secretMatches = [];
  const oversizedFiles = [];
  const privateReferences = [];
  const personalIdentifiers = [];
  const prohibitedArtifacts = [];
  const nonPortablePaths = [];

  for (const relativePath of publicFiles) {
    if (hasProhibitedArtifactPath(relativePath)) {
      prohibitedArtifacts.push(relativePath);
    }
    if (hasNonPortablePath(relativePath)) {
      nonPortablePaths.push(relativePath);
    }
    const fullPath = absolutePath(relativePath);
    let fileStat;

    try {
      fileStat = lstatSync(fullPath);
      if (fileStat.isSymbolicLink()) {
        symlinks.push(relativePath);
        continue;
      }
      if (!fileStat.isFile()) {
        addError("files", `${relativePath} is not a regular file.`);
        continue;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError("files", `${relativePath} could not be inspected: ${detail}`);
      continue;
    }

    if (hasSensitiveFilename(relativePath)) {
      sensitiveNames.push(relativePath);
    }
    if (fileStat.size > maximumPublicFileBytes) {
      oversizedFiles.push(`${relativePath} (${fileStat.size} bytes)`);
      continue;
    }

    try {
      const content = readFileSync(fullPath, "utf8");
      for (const [label, pattern] of recognizableSecretPatterns) {
        if (pattern.test(content)) {
          secretMatches.push(`${relativePath} (${label})`);
        }
      }
      if (!isWorkspaceMode && relativePath !== scannerRelativePath && privateProductPattern.test(content)) {
        privateReferences.push(relativePath);
      }

      const emails = content.match(/\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi) ?? [];
      if (
        !publicLegalEmailPaths.has(relativePath) &&
        emails.some((email) => {
          const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
          return !["example.com", "example.org", "example.net", "example.invalid"].includes(domain);
        })
      ) {
        personalIdentifiers.push(`${relativePath} (email address)`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError("files", `${relativePath} could not be scanned: ${detail}`);
    }
  }

  if (prohibitedArtifacts.length > 0) {
    addError(
      "artifacts",
      `Generated, local, document, dump, or archive paths are forbidden: ${formatList(prohibitedArtifacts)}.`
    );
  }
  if (nonPortablePaths.length > 0) {
    addError("files", `Non-portable public paths exist: ${formatList(nonPortablePaths)}.`);
  }
  if (sensitiveNames.length > 0) {
    addError("sensitive", `Sensitive filenames exist inside public paths: ${formatList(sensitiveNames)}.`);
  }
  if (oversizedFiles.length > 0) {
    addError(
      "sensitive",
      `Files exceed the ${maximumPublicFileBytes}-byte public review limit: ${formatList(oversizedFiles)}.`
    );
  }
  if (secretMatches.length > 0) {
    addError("sensitive", `Recognizable secret material exists inside public paths: ${formatList(secretMatches)}.`);
  }
  if (privateReferences.length > 0) {
    addError("confidentiality", `Private-product references exist in the export: ${formatList(privateReferences)}.`);
  }
  if (personalIdentifiers.length > 0) {
    addError(
      "privacy",
      `Non-placeholder personal identifiers require explicit removal or review: ${formatList(personalIdentifiers)}.`
    );
  }
  if (symlinks.length > 0) {
    addError("sensitive", `Symlinks inside public paths require explicit review: ${formatList(symlinks)}.`);
  }
}

const files = repositoryFiles();
checkExactExportFileAllowlist(files);
checkPublicTemplateManifestDrift();
checkRootTemplateMappingDrift();

checkComponentAllowlist(files);
checkLicenseBoundary();
checkTrademarkBoundary();
checkDocumentation();

const manifests = new Map();
manifests.set("package.json", checkManifest("package.json"));
for (const component of publicComponents) {
  const manifestPath = `${component}/package.json`;
  manifests.set(manifestPath, checkManifest(manifestPath));
}

checkPackageScripts(manifests);
if (!isWorkspaceMode) {
  checkAutomation(files);
  checkWorkflowSecurity();
  checkWorkspaceMetadata();
  checkExportMetadataStructure();
}
checkSensitivePublicFiles(files);

console.log("Public boundary check");
console.log(`Mode: ${mode}`);
console.log(`Allowed components: ${publicComponents.join(", ")}`);
for (const note of notes) {
  console.log(note);
}

if (errors.length > 0) {
  console.error(`\nFAIL: ${errors.length} publication blocker${errors.length === 1 ? "" : "s"} found.`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error(
    isWorkspaceMode
      ? "\nThe public workspace surface is not ready until every blocker is resolved."
      : "\nThe repository is not safe to publish until every blocker is resolved."
  );
  process.exitCode = 1;
} else {
  console.log(`\nPASS: the declared public ${isWorkspaceMode ? "workspace surface" : "export boundary"} is clean.`);
  if (!isWorkspaceMode) {
    console.log("Run full quality, dependency, license, and Git-history secret checks before publication.");
  }
}
