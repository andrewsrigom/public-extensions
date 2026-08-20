import { getRedirectForUrl } from "./matcher";
import type { RedirectHopGuard } from "./redirect-guard";
import type { PathSwitchSettings } from "./types";

export type NavigationDetails = {
  frameId: number;
  tabId: number;
  url: string;
};

export type NavigationResult = "blocked" | "ignored" | "no-match" | "redirected";

export type NavigationRuntimeDependencies = {
  guard: Pick<RedirectHopGuard, "check" | "observe" | "reset">;
  isNavigationCurrent: () => boolean;
  loadSettings: () => Promise<PathSwitchSettings>;
  updateTab: (tabId: number, targetUrl: string) => Promise<void>;
};

export async function handleNavigation(
  details: NavigationDetails,
  { guard, isNavigationCurrent, loadSettings, updateTab }: NavigationRuntimeDependencies
): Promise<NavigationResult> {
  if (details.frameId !== 0 || details.tabId < 0) return "ignored";

  if (!details.url.startsWith("http://") && !details.url.startsWith("https://")) {
    guard.reset(details.tabId);
    return "ignored";
  }

  const settings = await loadSettings();
  if (!isNavigationCurrent()) return "ignored";

  const redirect = getRedirectForUrl(details.url, settings);

  if (!redirect) {
    if (guard.observe(details.tabId, details.url) === "unrelated") {
      guard.reset(details.tabId);
    }
    return "no-match";
  }

  if (guard.check(details.tabId, details.url, redirect.targetUrl) !== "allow") {
    return "blocked";
  }

  try {
    await updateTab(details.tabId, redirect.targetUrl);
  } catch (error) {
    guard.reset(details.tabId);
    throw error;
  }
  return "redirected";
}
