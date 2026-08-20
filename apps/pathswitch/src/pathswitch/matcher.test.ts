import { describe, expect, it } from "vitest";

import {
  findRedirectCycle,
  getRedirectForUrl,
  getSourcePatternExamples,
  matchesSourcePattern,
  normalizeDestinationUrl
} from "./matcher";
import type { RedirectRule, PathSwitchSettings } from "./types";

describe("pathswitch matcher", () => {
  it("matches host patterns without a scheme against http and https URLs", () => {
    expect(matchesSourcePattern("amazon.com/*", "https://amazon.com/deals")).toBe(true);
    expect(matchesSourcePattern("amazon.com/*", "https://www.amazon.com/deals")).toBe(true);
    expect(matchesSourcePattern("amazon.com/*", "http://amazon.com/deals")).toBe(true);
    expect(matchesSourcePattern("amazon.com/*", "https://amazon.com.br/deals")).toBe(false);
  });

  it("can require the exact source host", () => {
    expect(matchesSourcePattern("amazon.com/*", "https://www.amazon.com/deals", "exact-source-host")).toBe(false);
    expect(matchesSourcePattern("amazon.com/*", "https://amazon.com/deals", "exact-source-host")).toBe(true);
  });

  it("matches full URL wildcard patterns", () => {
    expect(matchesSourcePattern("https://*.example.com/docs/*", "https://app.example.com/docs/start")).toBe(true);
    expect(matchesSourcePattern("https://*.example.com/docs/*", "https://app.example.com/blog/start")).toBe(false);
  });

  it("normalizes destination URLs", () => {
    const authoritySeparator = String.fromCharCode(64);
    const credentialSeparator = String.fromCharCode(58);
    const deceptiveAuthority = ["example.com", "redirect.test"].join(authoritySeparator);
    const credentials = [["fixture", "identity"].join("-"), ["fixture", "value"].join("-")].join(credentialSeparator);
    const credentialedUrl = ["https://", credentials, authoritySeparator, "redirect.test/"].join("");

    expect(normalizeDestinationUrl("amazon.com.br")).toBe("https://amazon.com.br/");
    expect(normalizeDestinationUrl("ftp://example.com")).toBeNull();
    expect(normalizeDestinationUrl(deceptiveAuthority)).toBeNull();
    expect(normalizeDestinationUrl(credentialedUrl)).toBeNull();
  });

  it("returns the first enabled matching redirect", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://www.amazon.com.br/",
        sourcePattern: "amazon.com/*"
      })
    ]);

    expect(getRedirectForUrl("https://www.amazon.com/deals", settings)?.targetUrl).toBe("https://www.amazon.com.br/");
  });

  it("skips disabled settings and rules", () => {
    const rule = createRule({
      destinationUrl: "https://www.amazon.com.br/",
      sourcePattern: "amazon.com/*"
    });

    expect(getRedirectForUrl("https://amazon.com/deals", createSettings([rule], false))).toBeNull();
    expect(getRedirectForUrl("https://amazon.com/deals", createSettings([{ ...rule, enabled: false }]))).toBeNull();
  });

  it("skips URLs that are already at the destination", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://www.amazon.com.br/",
        sourcePattern: "www.amazon.com.br/*"
      })
    ]);

    expect(getRedirectForUrl("https://www.amazon.com.br/", settings)).toBeNull();
  });

  it("builds pattern examples", () => {
    expect(getSourcePatternExamples("amazon.com/*")).toEqual(["amazon.com", "www.amazon.com"]);
  });

  it("does not treat a same-host canonical destination as a cycle", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://example.com/preferred",
        sourcePattern: "example.com/*"
      })
    ]);

    expect(findRedirectCycle(settings)).toBeNull();
  });

  it("detects direct cycles between enabled rules", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://b.example/",
        id: "rule-a",
        sourcePattern: "a.example/*"
      }),
      createRule({
        destinationUrl: "https://a.example/",
        id: "rule-b",
        sourcePattern: "b.example/*"
      })
    ]);

    const cycle = findRedirectCycle(settings);

    expect(new Set(cycle?.ruleIds)).toEqual(new Set(["rule-a", "rule-b"]));
    expect(cycle?.urls.at(0)).toBe(cycle?.urls.at(-1));
  });

  it("detects indirect cycles across multiple enabled rules", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://b.example/",
        id: "rule-a",
        sourcePattern: "a.example/*"
      }),
      createRule({
        destinationUrl: "https://c.example/",
        id: "rule-b",
        sourcePattern: "b.example/*"
      }),
      createRule({
        destinationUrl: "https://a.example/",
        id: "rule-c",
        sourcePattern: "c.example/*"
      })
    ]);

    expect(new Set(findRedirectCycle(settings)?.ruleIds)).toEqual(new Set(["rule-a", "rule-b", "rule-c"]));
  });

  it("ignores cycles broken by a disabled rule", () => {
    const settings = createSettings([
      createRule({
        destinationUrl: "https://b.example/",
        id: "rule-a",
        sourcePattern: "a.example/*"
      }),
      createRule({
        destinationUrl: "https://a.example/",
        enabled: false,
        id: "rule-b",
        sourcePattern: "b.example/*"
      })
    ]);

    expect(findRedirectCycle(settings)).toBeNull();
  });
});

function createSettings(rules: RedirectRule[], enabled = true): PathSwitchSettings {
  return {
    enabled,
    language: "en",
    rules
  };
}

function createRule(
  rule: Pick<RedirectRule, "destinationUrl" | "sourcePattern"> & Partial<RedirectRule>
): RedirectRule {
  return {
    condition: "none",
    createdAt: 1,
    enabled: true,
    id: "rule-1",
    ignoreIfAtDestination: true,
    name: "",
    updatedAt: 1,
    ...rule
  };
}
