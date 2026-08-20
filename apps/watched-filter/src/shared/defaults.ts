import type { ExtensionSettings, RuntimeStats } from "./types";
import { DEFAULT_PLATFORM_SETTINGS } from "./platforms";

export const SETTINGS_DEFAULTS: ExtensionSettings = {
  enabled: true,
  showManualMarker: true,
  autoDetectWatched: true,
  hideCompleted: true,
  hideInProgress: false,
  hidePaidContent: false,
  hideLiveEvents: false,
  hideChannelContent: false,
  completedThreshold: 90,
  mode: "overlay",
  language: "auto",
  platforms: DEFAULT_PLATFORM_SETTINGS,
  debug: false
};

export const EMPTY_STATS: RuntimeStats = {
  candidates: 0,
  hidden: 0,
  dimmed: 0,
  overlaid: 0,
  completed: 0,
  inProgress: 0,
  manualWatched: 0,
  lastScanAt: null,
  sample: []
};

export const WATCHED_STORAGE_KEY = "hideWatchedContentWatchedItems";
