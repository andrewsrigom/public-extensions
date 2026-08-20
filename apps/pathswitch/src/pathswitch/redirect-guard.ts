export type RedirectGuardResult = "allow" | "cycle" | "hop-limit";
export type RedirectObservation = "expected-target" | "unrelated";

type RedirectChain = {
  expectedUrl: string;
  hopCount: number;
  lastRedirectAt: number;
  visitedUrls: Set<string>;
};

export type RedirectHopGuardOptions = {
  maxHops?: number;
  ttlMs?: number;
};

const DEFAULT_MAX_HOPS = 8;
const DEFAULT_TTL_MS = 10_000;

export class RedirectHopGuard {
  private readonly chains = new Map<number, RedirectChain>();
  private readonly maxHops: number;
  private readonly ttlMs: number;

  constructor({ maxHops = DEFAULT_MAX_HOPS, ttlMs = DEFAULT_TTL_MS }: RedirectHopGuardOptions = {}) {
    this.maxHops = maxHops;
    this.ttlMs = ttlMs;
  }

  check(tabId: number, sourceUrl: string, targetUrl: string, now = Date.now()): RedirectGuardResult {
    const normalizedSource = normalizeUrl(sourceUrl);
    const normalizedTarget = normalizeUrl(targetUrl);
    const existingChain = this.chains.get(tabId);
    const existingChainIsFresh = existingChain !== undefined && now - existingChain.lastRedirectAt <= this.ttlMs;
    const continuesExistingChain = existingChainIsFresh && existingChain.expectedUrl === normalizedSource;

    if (existingChainIsFresh && !continuesExistingChain && existingChain.visitedUrls.has(normalizedSource)) {
      this.chains.delete(tabId);
      return "cycle";
    }

    const chain: RedirectChain = continuesExistingChain
      ? existingChain
      : {
          expectedUrl: normalizedSource,
          hopCount: 0,
          lastRedirectAt: now,
          visitedUrls: new Set([normalizedSource])
        };

    if (chain.visitedUrls.has(normalizedTarget)) {
      this.chains.delete(tabId);
      return "cycle";
    }

    if (chain.hopCount >= this.maxHops) {
      this.chains.delete(tabId);
      return "hop-limit";
    }

    chain.expectedUrl = normalizedTarget;
    chain.hopCount += 1;
    chain.lastRedirectAt = now;
    chain.visitedUrls.add(normalizedTarget);
    this.chains.set(tabId, chain);
    return "allow";
  }

  reset(tabId: number): void {
    this.chains.delete(tabId);
  }

  observe(tabId: number, url: string, now = Date.now()): RedirectObservation {
    const chain = this.chains.get(tabId);
    if (!chain) return "unrelated";

    if (now - chain.lastRedirectAt > this.ttlMs) {
      this.chains.delete(tabId);
      return "unrelated";
    }

    return chain.expectedUrl === normalizeUrl(url) ? "expected-target" : "unrelated";
  }
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch (_error) {
    return url.trim();
  }
}
