import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, parse, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateProductFilterManifest } from "./check-public-release-manifests.mjs";
import { parseExportArguments, ROOT_TEMPLATE_MAPPINGS, resolveSafeSourcePath } from "./export-public-workspace.mjs";
import { parseSmokeArguments } from "./smoke-public-extensions.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exporterPath = join(repositoryRoot, "scripts/export-public-workspace.mjs");
const temporaryRoot = mkdtempSync(join(tmpdir(), "browser-extensions-public-export-"));
const publicApps = ["watched-filter", "product-filter", "quick-notes", "time-zone-helper", "site-reset", "pathswitch"];
const expectedAppReleaseCommand = "pnpm typecheck && pnpm test:run && pnpm zip";
const expectedReleasePreflightCommand =
  "pnpm check:public-boundary && pnpm licenses:check:public && pnpm format:check:public && pnpm lint:public && pnpm ui:quality";
const expectedReleaseCommand = `pnpm release:preflight:public && pnpm ${publicApps
  .map((app) => `--filter ${app}`)
  .join(
    " "
  )} --recursive --workspace-concurrency=4 release:check && pnpm manifests:check:release && pnpm licenses:check:release`;
const expectedPublicBuildCommand = `pnpm ${publicApps
  .map((app) => `--filter ${app}`)
  .join(" ")} --recursive --workspace-concurrency=4 build`;
const expectedPublicE2eCommand = "pnpm build:public:extensions && pnpm test:e2e:public:built";

after(() => {
  rmSync(temporaryRoot, { force: true, recursive: true });
});

function runExporter(arguments_, options = {}) {
  return spawnSync(process.execPath, [exporterPath, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: options.env ?? process.env
  });
}

function combinedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function assertRefused(arguments_, expectedMessage) {
  const result = runExporter(arguments_);
  assert.notEqual(result.status, 0, combinedOutput(result));
  assert.match(combinedOutput(result), expectedMessage);
}

function writeMinimalPublicLock(destination) {
  writeFileSync(
    join(destination, "pnpm-lock.yaml"),
    `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      '@eslint/js':
        specifier: 9.0.0
        version: 9.0.0

  apps/pathswitch: {}
  apps/product-filter: {}
  apps/quick-notes: {}
  apps/site-reset: {}
  apps/time-zone-helper: {}
  apps/watched-filter: {}
  packages/ui: {}
  packages/ui-tokens: {}

packages:

  '@eslint/js@9.0.0':
    resolution: {integrity: sha512-placeholder}
`,
    "utf8"
  );
}

test("the checked-in CI contract avoids duplicate release work", () => {
  const rootPackage = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  const packageTemplate = JSON.parse(readFileSync(join(repositoryRoot, "docs/public/package.json"), "utf8"));
  assert.equal(rootPackage.scripts["release:preflight:public"], expectedReleasePreflightCommand);
  assert.equal(rootPackage.scripts["release:check:public"], expectedReleaseCommand);
  assert.equal(packageTemplate.scripts["release:preflight:public"], expectedReleasePreflightCommand);
  assert.equal(packageTemplate.scripts["release:check:public"], expectedReleaseCommand);
  assert.equal(rootPackage.scripts["build:public:extensions"], expectedPublicBuildCommand);
  assert.equal(packageTemplate.scripts["build:public:extensions"], expectedPublicBuildCommand);
  assert.equal(rootPackage.scripts["test:e2e:public"], expectedPublicE2eCommand);
  assert.equal(packageTemplate.scripts["test:e2e:public"], expectedPublicE2eCommand);
  assert.equal(rootPackage.scripts["test:e2e:public:built"], "node scripts/smoke-public-extensions.mjs");
  assert.equal(packageTemplate.scripts["test:e2e:public:built"], "node scripts/smoke-public-extensions.mjs");
  assert.equal(rootPackage.scripts["playwright:install:public"], "playwright install chromium");
  assert.equal(packageTemplate.scripts["playwright:install:public"], "playwright install chromium");
  assert.equal(rootPackage.devDependencies["@playwright/test"], "1.62.1");
  assert.equal(packageTemplate.devDependencies["@playwright/test"], "1.62.1");
  assert.equal(rootPackage.scripts["manifests:check:release"], "node scripts/check-public-release-manifests.mjs");
  assert.equal(packageTemplate.scripts["manifests:check:release"], "node scripts/check-public-release-manifests.mjs");

  for (const app of publicApps) {
    const appPackage = JSON.parse(readFileSync(join(repositoryRoot, "apps", app, "package.json"), "utf8"));
    assert.equal(appPackage.scripts["release:check"], expectedAppReleaseCommand, app);
  }

  const workflow = readFileSync(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");
  const workflowTemplate = readFileSync(join(repositoryRoot, "docs/public/ci.yml"), "utf8");
  assert.equal(workflowTemplate, workflow);
  assert.match(workflow, /^ {2}pull_request:\s*$/m);
  assert.match(workflow, /^ {2}workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s{4}name:\s*Validate public workspace\s*$/m);
  assert.match(workflow, /^\s+cancel-in-progress:\s*true\s*$/m);
  assert.match(workflow, /^\s+timeout-minutes:\s*15\s*$/m);
  assert.doesNotMatch(workflow, /^ {2}push:\s*$/m);
});

test("the smoke CLI rejects ambiguous or unknown arguments", () => {
  assert.deepEqual(parseSmokeArguments(["--headed", "--app", "quick-notes"]), {
    headed: true,
    selectedApps: ["quick-notes"]
  });
  assert.deepEqual(parseSmokeArguments(["--app=time-zone-helper"]), {
    headed: process.env.PW_HEADED === "1",
    selectedApps: ["time-zone-helper"]
  });
  assert.throws(() => parseSmokeArguments(["--app"]), /requires one public extension name/i);
  assert.throws(() => parseSmokeArguments(["--app="]), /requires one public extension name/i);
  assert.throws(() => parseSmokeArguments(["--app", "quick-notes", "--app", "site-reset"]), /only be provided once/i);
  assert.throws(() => parseSmokeArguments(["--app", "private-extension"]), /unknown public extension/i);
  assert.throws(() => parseSmokeArguments(["quick-notes"]), /unknown smoke option/i);
  assert.throws(() => parseSmokeArguments(["--headless"]), /unknown smoke option/i);
});

test("the product-filter release manifest contract is exact", () => {
  assert.doesNotThrow(() =>
    validateProductFilterManifest(
      {
        options_ui: {
          page: "options.html",
          open_in_tab: true
        }
      },
      "test manifest"
    )
  );
  assert.throws(
    () => validateProductFilterManifest({ options_ui: { page: "options.html", open_in_tab: false } }, "test manifest"),
    /must declare exactly options_ui/i
  );
  assert.throws(
    () =>
      validateProductFilterManifest(
        { options_ui: { page: "options.html", open_in_tab: true, unexpected: true } },
        "test manifest"
      ),
    /must declare exactly options_ui/i
  );
});

test("requires one explicit destination", () => {
  assertRefused([], /explicit destination is required/i);
  assertRefused([join(temporaryRoot, "one"), join(temporaryRoot, "two")], /explicit destination is required/i);
});

test("the exporter CLI rejects ambiguous option combinations", () => {
  assert.deepEqual(parseExportArguments(["--skip-install", "destination"]), {
    destination: "destination",
    help: false,
    skipInstall: true
  });
  assert.deepEqual(parseExportArguments(["--", "--destination"]), {
    destination: "--destination",
    help: false,
    skipInstall: false
  });
  assert.throws(
    () => parseExportArguments(["--skip-install", "--skip-install", "destination"]),
    /only be provided once/i
  );
  assert.throws(() => parseExportArguments(["--help", "destination"]), /cannot be combined/i);
  assert.throws(() => parseExportArguments(["--unknown", "destination"]), /unknown option/i);
});

test("refuses a source file reached through an ancestor symlink", () => {
  const sourceRoot = join(temporaryRoot, "synthetic-source-root");
  const outsideRoot = join(temporaryRoot, "synthetic-outside-root");
  mkdirSync(join(sourceRoot, "docs"), { recursive: true });
  mkdirSync(outsideRoot);
  writeFileSync(join(outsideRoot, "LICENSE"), "outside content\n", "utf8");
  symlinkSync(outsideRoot, join(sourceRoot, "docs/public"), "dir");

  assert.throws(() => resolveSafeSourcePath(sourceRoot, "docs/public/LICENSE"), /symbolic-link source path segment/i);
});
test("refuses filesystem roots and the source repository", () => {
  assertRefused([parse(repositoryRoot).root, "--skip-install"], /filesystem root/i);
  assertRefused([repositoryRoot, "--skip-install"], /current repository/i);

  const nestedDestination = join(repositoryRoot, ".public-export-test");
  assertRefused([nestedDestination, "--skip-install"], /current repository/i);
  assert.equal(existsSync(nestedDestination), false);
});

test("refuses a symbolic-link destination without touching its target", () => {
  const target = join(temporaryRoot, "symlink-target");
  const destination = join(temporaryRoot, "symlink-destination");
  mkdirSync(target);
  symlinkSync(target, destination, "dir");

  assertRefused([destination, "--skip-install"], /symbolic link/i);
  assert.deepEqual(readdirSync(target), []);
});
test("refuses a non-empty destination without deleting or overwriting it", () => {
  const destination = join(temporaryRoot, "non-empty");
  const marker = join(destination, "keep-me.txt");
  mkdirSync(destination);
  writeFileSync(marker, "preserve this file\n", "utf8");

  assertRefused([destination, "--skip-install"], /must be empty/i);
  assert.equal(readFileSync(marker, "utf8"), "preserve this file\n");
  assert.deepEqual(readdirSync(destination), ["keep-me.txt"]);
});

test("offline mode copies exactly the declared public workspace surface", () => {
  const destination = join(temporaryRoot, "allowlisted-export");
  const result = runExporter([destination, "--skip-install"]);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(combinedOutput(result), /not ready to publish/i);

  assert.deepEqual(readdirSync(join(destination, "apps")).sort(), [
    "pathswitch",
    "product-filter",
    "quick-notes",
    "site-reset",
    "time-zone-helper",
    "watched-filter"
  ]);
  assert.deepEqual(readdirSync(join(destination, "packages")).sort(), ["ui", "ui-tokens"]);
  assert.deepEqual(readdirSync(destination).sort(), [
    ".editorconfig",
    ".gitattributes",
    ".github",
    ".gitignore",
    ".nvmrc",
    ".prettierignore",
    ".public-export-incomplete",
    "AGENTS.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "TRADEMARKS.md",
    "apps",
    "docs",
    "eslint.config.mjs",
    "package.json",
    "packages",
    "pnpm-workspace.yaml",
    "prettier.config.mjs",
    "scripts"
  ]);

  assert.equal(existsSync(join(destination, ".public-export-incomplete")), true);
  assert.equal(existsSync(join(destination, ".git")), false);
  assert.equal(
    readFileSync(join(destination, "AGENTS.md"), "utf8"),
    readFileSync(join(repositoryRoot, "AGENTS.md"), "utf8")
  );
  assert.equal(existsSync(join(destination, "roadmap.md")), false);
  assert.equal(existsSync(join(destination, "pnpm-lock.yaml")), false);
  assert.equal(existsSync(join(destination, "apps/watched-filter/node_modules")), false);
  assert.equal(existsSync(join(destination, "apps/watched-filter/.output")), false);
  assert.equal(existsSync(join(destination, "apps/watched-filter/.wxt")), false);
  assert.equal(existsSync(join(destination, "scripts/smoke-public-extensions.mjs")), true);
  assert.equal(existsSync(join(destination, "scripts/check-public-release-manifests.mjs")), true);

  assert.equal(
    readFileSync(join(destination, "LICENSE"), "utf8"),
    readFileSync(join(repositoryRoot, "docs/public/LICENSE"), "utf8")
  );
  assert.equal(
    readFileSync(join(destination, "TRADEMARKS.md"), "utf8"),
    readFileSync(join(repositoryRoot, "docs/public/TRADEMARKS.md"), "utf8")
  );
  for (const app of publicApps) {
    assert.deepEqual(
      readFileSync(join(destination, "apps", app, "public/LICENSE")),
      readFileSync(join(destination, "LICENSE"))
    );
    assert.deepEqual(
      readFileSync(join(destination, "apps", app, "public/TRADEMARKS.md")),
      readFileSync(join(destination, "TRADEMARKS.md"))
    );
  }

  assert.equal(
    readFileSync(join(destination, "docs/release-checklist.md"), "utf8"),
    readFileSync(join(repositoryRoot, "docs/public/RELEASE_CHECKLIST.md"), "utf8")
  );
  assert.equal(
    readFileSync(join(destination, ".prettierignore"), "utf8"),
    readFileSync(join(repositoryRoot, "docs/public/.prettierignore"), "utf8")
  );
  for (const document of ["asset-provenance.md", "third-party-licenses.md"]) {
    assert.equal(
      readFileSync(join(destination, "docs", document), "utf8"),
      readFileSync(join(repositoryRoot, "docs", document), "utf8")
    );
  }
  for (const file of [
    "docs/license-overrides/react-remove-scroll-bar-2.3.8-LICENSE.txt",
    "docs/license-overrides/wxt-0.21.3-LICENSE.txt",
    "scripts/check-public-release-manifests.mjs",
    "scripts/check-public-release-licenses.mjs",
    "scripts/generate-public-license-notices.mjs"
  ]) {
    assert.equal(readFileSync(join(destination, file), "utf8"), readFileSync(join(repositoryRoot, file), "utf8"));
  }

  const publicPackage = JSON.parse(readFileSync(join(destination, "package.json"), "utf8"));
  assert.equal(publicPackage.private, true);
  assert.equal(publicPackage.license, "SEE LICENSE IN LICENSE");
  assert.equal(publicPackage.scripts["check:public-boundary"], "node scripts/check-public-boundary.mjs --export");
  assert.equal(
    publicPackage.scripts["licenses:check:public"],
    "node scripts/generate-public-license-notices.mjs --check"
  );
  assert.equal(publicPackage.scripts["licenses:check:release"], "node scripts/check-public-release-licenses.mjs");
  assert.match(publicPackage.scripts["quality:public"], /\bpnpm\s+licenses:check:public\b/);
  assert.match(publicPackage.scripts["release:check:public"], /\bpnpm\s+licenses:check:release\b/);

  const publicWorkflow = readFileSync(join(destination, ".github/workflows/ci.yml"), "utf8");
  assert.match(publicWorkflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(publicWorkflow, /pnpm\/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86/);
  assert.match(publicWorkflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(publicWorkflow, /pnpm audit --audit-level high/);
  assert.match(publicWorkflow, /pnpm release:check:public/);

  writeFileSync(join(destination, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    {
      cwd: destination,
      encoding: "utf8"
    }
  );
  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /public-export-incomplete/i);
  assert.match(combinedOutput(boundaryCheck), /pnpm-lock\.yaml importers/i);
});

test("the export checker parses empty importers without treating nested keys as importers", () => {
  const destination = join(temporaryRoot, "valid-lockfile-importers");
  const result = runExporter([destination, "--skip-install"]);
  assert.equal(result.status, 0, combinedOutput(result));
  rmSync(join(destination, ".public-export-incomplete"));
  writeMinimalPublicLock(destination);

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );
  assert.equal(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
});

test("the export checker requires byte-identical root template mappings", () => {
  const destination = join(temporaryRoot, "checker-root-template-mappings");
  const result = runExporter([destination, "--skip-install"]);
  assert.equal(result.status, 0, combinedOutput(result));
  rmSync(join(destination, ".public-export-incomplete"));
  writeMinimalPublicLock(destination);

  for (const [, rootPath] of ROOT_TEMPLATE_MAPPINGS) {
    const fullPath = join(destination, rootPath);
    writeFileSync(fullPath, Buffer.concat([readFileSync(fullPath), Buffer.from("\n")]));
  }

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );
  const output = combinedOutput(boundaryCheck);
  assert.notEqual(boundaryCheck.status, 0, output);
  for (const [templatePath, rootPath] of ROOT_TEMPLATE_MAPPINGS) {
    assert.ok(output.includes(`${rootPath} has drifted from ${templatePath}`), `${rootPath}:\n${output}`);
  }
});

test("the export checker pins the Playwright install contract", () => {
  const destination = join(temporaryRoot, "checker-playwright-contract");
  const result = runExporter([destination, "--skip-install"]);
  assert.equal(result.status, 0, combinedOutput(result));
  rmSync(join(destination, ".public-export-incomplete"));
  writeMinimalPublicLock(destination);

  for (const packagePath of ["package.json", "docs/public/package.json"]) {
    const fullPath = join(destination, packagePath);
    const manifest = JSON.parse(readFileSync(fullPath, "utf8"));
    manifest.scripts["playwright:install:public"] = "playwright install";
    manifest.devDependencies["@playwright/test"] = "^1.62.1";
    writeFileSync(fullPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );
  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(
    combinedOutput(boundaryCheck),
    /playwright:install:public must be exactly "playwright install chromium"/i
  );
  assert.match(combinedOutput(boundaryCheck), /@playwright\/test must be pinned exactly to 1\.62\.1/i);
});

test("the filesystem fallback accepts an installed source archive without Git metadata", () => {
  const outerRepository = join(temporaryRoot, "installed-source-parent-repository");
  const destination = join(outerRepository, "installed-source-archive");
  mkdirSync(outerRepository);
  const initResult = spawnSync("git", ["-C", outerRepository, "init", "--quiet"], { encoding: "utf8" });
  assert.equal(initResult.status, 0, combinedOutput(initResult));
  const result = runExporter([destination, "--skip-install"]);
  assert.equal(result.status, 0, combinedOutput(result));
  rmSync(join(destination, ".public-export-incomplete"));
  writeMinimalPublicLock(destination);

  mkdirSync(join(destination, "node_modules/.pnpm"), { recursive: true });
  writeFileSync(join(destination, "node_modules/.pnpm/installation-marker"), "generated\n", "utf8");
  symlinkSync("../../node_modules", join(destination, "apps/watched-filter/node_modules"), "dir");
  for (const generatedPath of [
    "apps/watched-filter/.output/chrome-mv3/manifest.json",
    "apps/watched-filter/.wxt/types.d.ts",
    "apps/watched-filter/coverage/index.html",
    "apps/watched-filter/dist/bundle.js",
    "dist/release-summary.txt"
  ]) {
    mkdirSync(dirname(join(destination, generatedPath)), { recursive: true });
    writeFileSync(join(destination, generatedPath), "generated\n", "utf8");
  }

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.equal(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /filesystem fallback/i);
});

test("a dependency-tool failure leaves an existing empty destination untouched", () => {
  const fakeBin = join(temporaryRoot, "failing-pnpm-bin");
  const destination = join(temporaryRoot, "atomic-failure");
  mkdirSync(fakeBin);
  mkdirSync(destination);

  const fakePnpm = join(fakeBin, "pnpm");
  writeFileSync(fakePnpm, "#!/bin/sh\nexit 19\n", "utf8");
  chmodSync(fakePnpm, 0o755);
  writeFileSync(join(fakeBin, "pnpm.cmd"), "@exit /b 19\r\n", "utf8");

  const result = runExporter([destination], {
    env: {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`
    }
  });

  assert.notEqual(result.status, 0, combinedOutput(result));
  assert.deepEqual(readdirSync(destination), []);
  assert.equal(
    readdirSync(temporaryRoot).some((name) => name.startsWith(".atomic-failure.public-export-")),
    false
  );
});

test("the export checker rejects unexpected files and symlinks", () => {
  const destination = join(temporaryRoot, "checker-allowlist");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const unexpectedDirectory = join(destination, "unapproved-source");
  mkdirSync(unexpectedDirectory);
  writeFileSync(join(unexpectedDirectory, "README.md"), "must not be published\n", "utf8");
  symlinkSync("../README.md", join(destination, "docs/review-link"));
  writeFileSync(join(destination, "apps/watched-filter/profile-export.pdf"), Buffer.from([0, 1, 2, 3]));
  writeFileSync(join(destination, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /outside the exact publication manifest/i);
  assert.match(combinedOutput(boundaryCheck), /unapproved-source\/README\.md/);
  assert.match(combinedOutput(boundaryCheck), /symlinks inside public paths/i);
  assert.match(combinedOutput(boundaryCheck), /generated, local, document, dump, or archive/i);
  assert.match(combinedOutput(boundaryCheck), /profile-export\.pdf/);
});

test("the export checker rejects a force-tracked generated artifact", () => {
  const destination = join(temporaryRoot, "checker-force-tracked");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const generatedDirectory = join(destination, "apps/watched-filter/.output");
  mkdirSync(generatedDirectory, { recursive: true });
  writeFileSync(join(generatedDirectory, "forced.js"), "generated\n", "utf8");

  const initResult = spawnSync("git", ["-C", destination, "init", "--quiet"], { encoding: "utf8" });
  assert.equal(initResult.status, 0, combinedOutput(initResult));
  const addResult = spawnSync("git", ["-C", destination, "add", "--force", "apps/watched-filter/.output/forced.js"], {
    encoding: "utf8"
  });
  assert.equal(addResult.status, 0, combinedOutput(addResult));

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /Git tracked files plus non-ignored untracked files/i);
  assert.match(combinedOutput(boundaryCheck), /generated, local, document, dump, or archive/i);
  assert.match(combinedOutput(boundaryCheck), /apps\/watched-filter\/\.output\/forced\.js/);
});

test("the export checker detects public template toolchain drift", () => {
  const destination = join(temporaryRoot, "checker-template-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const templatePath = join(destination, "docs/public/package.json");
  const templatePackage = JSON.parse(readFileSync(templatePath, "utf8"));
  templatePackage.devDependencies.wxt = "0.0.0-drift";
  writeFileSync(templatePath, `${JSON.stringify(templatePackage, null, 2)}\n`, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /devDependencies has drifted/i);
});

test("the export checker detects public template license drift", () => {
  const destination = join(temporaryRoot, "checker-template-license-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const templatePath = join(destination, "docs/public/package.json");
  const templatePackage = JSON.parse(readFileSync(templatePath, "utf8"));
  templatePackage.license = "MIT";
  writeFileSync(templatePath, `${JSON.stringify(templatePackage, null, 2)}\n`, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /license has drifted/i);
});

test("the export checker detects public workflow template drift", () => {
  const destination = join(temporaryRoot, "checker-workflow-template-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const templatePath = join(destination, "docs/public/ci.yml");
  const template = readFileSync(templatePath, "utf8");
  writeFileSync(templatePath, template.replace("timeout-minutes: 15", "timeout-minutes: 30"), "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /\.github\/workflows\/ci\.yml has drifted from docs\/public\/ci\.yml/i);
});

test("the export checker detects public script template drift", () => {
  const destination = join(temporaryRoot, "checker-script-template-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const templatePath = join(destination, "docs/public/package.json");
  const templatePackage = JSON.parse(readFileSync(templatePath, "utf8"));
  templatePackage.scripts["release:check:public"] = "pnpm quality:public";
  writeFileSync(templatePath, `${JSON.stringify(templatePackage, null, 2)}\n`, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /public scripts have drifted/i);
});

test("the export checker requires both public license-check scripts", () => {
  const destination = join(temporaryRoot, "checker-license-script");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const packagePath = join(destination, "package.json");
  const publicPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  delete publicPackage.scripts["licenses:check:public"];
  delete publicPackage.scripts["licenses:check:release"];
  writeFileSync(packagePath, JSON.stringify(publicPackage, null, 2) + "\n", "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /required root public scripts are missing:.*licenses:check:public/is);
  assert.match(combinedOutput(boundaryCheck), /required root public scripts are missing:.*licenses:check:release/is);
});

test("the export checker requires byte-identical first-party licenses in every app", () => {
  const destination = join(temporaryRoot, "checker-app-license-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  writeFileSync(
    join(destination, "apps/watched-filter/public/LICENSE"),
    "MIT License\n\nThis deliberately drifted release license must fail the publication gate.\n",
    "utf8"
  );
  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /watched-filter\/public\/LICENSE must be byte-for-byte identical/i);
});

test("the export checker requires byte-identical trademark policies in every app", () => {
  const destination = join(temporaryRoot, "checker-app-trademark-drift");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  writeFileSync(
    join(destination, "apps/watched-filter/public/TRADEMARKS.md"),
    "# Trademark drift\n\nThis deliberately drifted policy must fail the publication gate.\n",
    "utf8"
  );
  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(
    combinedOutput(boundaryCheck),
    /watched-filter\/public\/TRADEMARKS\.md must be byte-for-byte identical/i
  );
});

test("the export checker scans binary assets for embedded credentials", () => {
  const destination = join(temporaryRoot, "checker-binary-secret");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const fakeAwsAccessKey = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
  const assetPath = join(destination, "apps/watched-filter/assets/icon-master.png");
  writeFileSync(assetPath, Buffer.from("\0PNG metadata " + fakeAwsAccessKey + "\0", "utf8"));
  writeFileSync(join(destination, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /recognizable secret material/i);
  assert.match(combinedOutput(boundaryCheck), /icon-master\.png \(AWS access key\)/i);
});

test("the legal-notice email exemption is exact and path-specific", () => {
  const destination = join(temporaryRoot, "checker-legal-notice-email");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const upstreamEmail = ["upstream", "dependency.test"].join("@");
  const noticePath = join(destination, "apps/quick-notes/public/THIRD_PARTY_NOTICES.txt");
  writeFileSync(noticePath, readFileSync(noticePath, "utf8") + "\nAuthor: " + upstreamEmail + "\n", "utf8");
  writeFileSync(join(destination, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

  const legalNoticeCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(legalNoticeCheck.status, 0, combinedOutput(legalNoticeCheck));
  assert.doesNotMatch(combinedOutput(legalNoticeCheck), /THIRD_PARTY_NOTICES\.txt \(email address\)/i);

  const unrelatedPath = join(destination, "apps/watched-filter/README.md");
  writeFileSync(unrelatedPath, readFileSync(unrelatedPath, "utf8") + "\nContact: " + upstreamEmail + "\n", "utf8");
  const unrelatedFileCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(unrelatedFileCheck.status, 0, combinedOutput(unrelatedFileCheck));
  assert.match(combinedOutput(unrelatedFileCheck), /watched-filter\/README\.md \(email address\)/i);
});

test("the export checker rejects a production-only dependency audit", () => {
  const destination = join(temporaryRoot, "checker-prod-only-audit");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const workflowPath = join(destination, ".github/workflows/ci.yml");
  const workflow = readFileSync(workflowPath, "utf8");
  const weakenedWorkflow = workflow.replace("pnpm audit --audit-level high", "pnpm audit --prod --audit-level high");
  assert.notEqual(weakenedWorkflow, workflow);
  writeFileSync(workflowPath, weakenedWorkflow, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /must not limit.*audit to production dependencies/i);
});

test("the export checker keeps Git-backed exporter tests in CI", () => {
  const destination = join(temporaryRoot, "checker-exporter-ci-gate");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const workflowPath = join(destination, ".github/workflows/ci.yml");
  const workflow = readFileSync(workflowPath, "utf8");
  const weakenedWorkflow = workflow.replace("pnpm test:public-export", "node --test");
  assert.notEqual(weakenedWorkflow, workflow);
  writeFileSync(workflowPath, weakenedWorkflow, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /missing public exporter test/i);
});

test("the export checker rejects duplicate app release work", () => {
  const destination = join(temporaryRoot, "checker-duplicate-release-work");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const packagePath = join(destination, "apps/watched-filter/package.json");
  const appPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  appPackage.scripts["release:check"] = "pnpm quality && pnpm zip";
  writeFileSync(packagePath, `${JSON.stringify(appPackage, null, 2)}\n`, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /release:check must be exactly.*typecheck.*test:run.*zip/i);
});

test("the export checker preserves the required CI check name", () => {
  const destination = join(temporaryRoot, "checker-required-check-name");
  const exportResult = runExporter([destination, "--skip-install"]);
  assert.equal(exportResult.status, 0, combinedOutput(exportResult));

  const workflowPath = join(destination, ".github/workflows/ci.yml");
  const workflow = readFileSync(workflowPath, "utf8");
  const renamedWorkflow = workflow.replace("name: Validate public workspace", "name: Validate release");
  assert.notEqual(renamedWorkflow, workflow);
  writeFileSync(workflowPath, renamedWorkflow, "utf8");

  const boundaryCheck = spawnSync(
    process.execPath,
    [join(destination, "scripts/check-public-boundary.mjs"), "--export"],
    { cwd: destination, encoding: "utf8" }
  );

  assert.notEqual(boundaryCheck.status, 0, combinedOutput(boundaryCheck));
  assert.match(combinedOutput(boundaryCheck), /missing required check name/i);
});
