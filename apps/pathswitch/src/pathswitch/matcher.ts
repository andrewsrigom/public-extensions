import type { RedirectMatch, PathSwitchSettings } from "./types";

const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

export type RedirectCycle = {
  ruleIds: string[];
  urls: string[];
};

export type RedirectPreview = {
  destinationUrl: string;
  sourcePattern: string;
};

export function getRedirectForUrl(url: string, settings: PathSwitchSettings): RedirectMatch | null {
  if (!settings.enabled) return null;

  for (const rule of settings.rules) {
    if (!rule.enabled) continue;
    if (!matchesSourcePattern(rule.sourcePattern, url, rule.condition)) continue;

    const targetUrl = normalizeDestinationUrl(rule.destinationUrl);
    if (!targetUrl) continue;
    if (rule.ignoreIfAtDestination && isAtDestination(url, targetUrl)) continue;
    if (normalizeUrl(url) === normalizeUrl(targetUrl)) continue;

    return {
      rule,
      targetUrl
    };
  }

  return null;
}

export function findRedirectCycle(settings: PathSwitchSettings): RedirectCycle | null {
  const enabledRules = settings.rules.filter((rule) => rule.enabled);
  const runtimeSettings: PathSwitchSettings = {
    ...settings,
    enabled: true,
    rules: enabledRules
  };

  for (const seedRule of enabledRules) {
    const seedUrl = normalizeDestinationUrl(seedRule.destinationUrl);
    if (!seedUrl) continue;

    const visitedUrls = new Map<string, number>();
    const redirectSteps: Array<{ ruleId: string; sourceUrl: string }> = [];
    let currentUrl = seedUrl;

    for (let hop = 0; hop <= enabledRules.length; hop += 1) {
      const normalizedUrl = normalizeUrl(currentUrl);
      const cycleStart = visitedUrls.get(normalizedUrl);

      if (cycleStart !== undefined) {
        return {
          ruleIds: redirectSteps.slice(cycleStart).map(({ ruleId }) => ruleId),
          urls: [...redirectSteps.slice(cycleStart).map(({ sourceUrl }) => sourceUrl), normalizedUrl]
        };
      }

      visitedUrls.set(normalizedUrl, redirectSteps.length);

      const redirect = getRedirectForUrl(currentUrl, runtimeSettings);
      if (!redirect) break;

      redirectSteps.push({
        ruleId: redirect.rule.id,
        sourceUrl: normalizedUrl
      });
      currentUrl = redirect.targetUrl;
    }
  }

  return null;
}

export function matchesSourcePattern(sourcePattern: string, url: string, condition = "none"): boolean {
  const pattern = sourcePattern.trim();
  if (!pattern) return false;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return false;
  }

  if (SCHEME_PATTERN.test(pattern)) {
    return wildcardToRegExp(pattern).test(parsedUrl.href);
  }

  const { hostPattern, pathPattern } = splitHostPattern(pattern);
  if (!hostPattern) return false;
  if (!matchesHostPattern(hostPattern, parsedUrl.hostname, condition === "exact-source-host")) return false;
  if (!pathPattern) return true;

  return wildcardToRegExp(pathPattern).test(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`);
}

export function normalizeDestinationUrl(destinationUrl: string): string | null {
  const value = destinationUrl.trim();
  if (!value) return null;

  try {
    const url = new URL(SCHEME_PATTERN.test(value) ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

export function getSourcePatternFromUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.username || url.password) return "";

    const safePattern = `${url.origin}${url.pathname}`;
    return url.search || url.hash ? `${safePattern}*` : safePattern;
  } catch (_error) {
    return "";
  }
}

export function isValidSourcePattern(sourcePattern: string): boolean {
  const pattern = sourcePattern.trim();
  if (!pattern || /\s/.test(pattern)) return false;

  try {
    const example = pattern.replaceAll("*", "pathswitch-example");
    const url = new URL(SCHEME_PATTERN.test(pattern) ? example : `https://${example}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!url.hostname || url.username || url.password) return false;

    return matchesSourcePattern(pattern, url.href);
  } catch (_error) {
    return false;
  }
}

export function getRedirectPreview(sourcePattern: string, destinationUrl: string): RedirectPreview | null {
  const normalizedSource = sourcePattern.trim();
  const normalizedDestination = normalizeDestinationUrl(destinationUrl);
  if (!isValidSourcePattern(normalizedSource) || !normalizedDestination) return null;

  return {
    destinationUrl: normalizedDestination,
    sourcePattern: normalizedSource
  };
}

export function getSourcePatternExamples(sourcePattern: string): string[] {
  const pattern = sourcePattern.trim();
  if (!pattern || SCHEME_PATTERN.test(pattern)) return [];

  const { hostPattern } = splitHostPattern(pattern);
  if (!hostPattern || hostPattern.includes("*")) return [];
  if (hostPattern.startsWith("www.")) return [hostPattern];
  return [hostPattern, `www.${hostPattern}`];
}

function splitHostPattern(pattern: string): { hostPattern: string; pathPattern: string } {
  const normalizedPattern = pattern.replace(/^\/+/, "");
  const slashIndex = normalizedPattern.indexOf("/");

  if (slashIndex === -1) {
    return {
      hostPattern: normalizedPattern.toLowerCase(),
      pathPattern: ""
    };
  }

  return {
    hostPattern: normalizedPattern.slice(0, slashIndex).toLowerCase(),
    pathPattern: normalizedPattern.slice(slashIndex) || "/"
  };
}

function matchesHostPattern(hostPattern: string, hostname: string, exactSourceHost: boolean): boolean {
  const normalizedHost = hostname.toLowerCase();
  if (wildcardToRegExp(hostPattern).test(normalizedHost)) return true;

  if (exactSourceHost || hostPattern.includes("*") || hostPattern.startsWith("www.")) return false;
  return normalizedHost === `www.${hostPattern}`;
}

function isAtDestination(url: string, destinationUrl: string): boolean {
  return normalizeUrl(url) === normalizeUrl(destinationUrl);
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch (_error) {
    return url.trim();
  }
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`, "i");
}
