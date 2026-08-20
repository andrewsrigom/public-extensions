export type ContentState = "unwatched" | "in-progress" | "watched";

export type VisualMode = "overlay" | "dim" | "hide";

export type WatchedSource = "manual" | "auto";

export type MarkerPlacement = "cover-top-left" | "host-bottom-left" | "page-action";

export type SupportedLanguage = "pt-BR" | "en" | "es";

export type LanguagePreference = "auto" | SupportedLanguage;

export type PlatformSettings = Record<string, boolean>;

export type SectionHideReason = "channel-content" | "live-event" | "paid-content";

export interface ExtensionSettings {
  enabled: boolean;
  showManualMarker: boolean;
  autoDetectWatched: boolean;
  hideCompleted: boolean;
  hideInProgress: boolean;
  hidePaidContent: boolean;
  hideLiveEvents: boolean;
  hideChannelContent: boolean;
  completedThreshold: number;
  mode: VisualMode;
  language: LanguagePreference;
  platforms: PlatformSettings;
  debug: boolean;
}

export interface ContentItem {
  key: string;
  platform: string;
  title: string;
  url?: string;
  element: HTMLElement;
  visualElement?: HTMLElement;
  visualHost?: HTMLElement;
  markerHost?: HTMLElement;
  markerPlacement?: MarkerPlacement;
  dimModeFallback?: "overlay";
  isLiveEvent?: boolean;
  requiresAdditionalSubscription?: boolean;
  requiresChannelSubscription?: boolean;
  sectionElement?: HTMLElement;
  sectionHideReason?: SectionHideReason;
}

export interface AutoDetectionResult {
  state: ContentState;
  progress?: number | null;
  reasons: string[];
}

export interface CardAnalysis extends ContentItem {
  manualWatched: boolean;
  state: ContentState;
  progress?: number | null;
  reasons: string[];
}

export interface StoredWatchedItem {
  key: string;
  platform: string;
  title: string;
  url?: string;
  markedAt: string;
  source: WatchedSource;
}

export type WatchedItemsByKey = Record<string, StoredWatchedItem>;

export interface RuntimeStats {
  candidates: number;
  hidden: number;
  dimmed: number;
  overlaid: number;
  completed: number;
  inProgress: number;
  manualWatched: number;
  lastScanAt: string | null;
  sample: Array<{
    title: string;
    platform: string;
    state: ContentState;
    progress?: number | null;
    manualWatched: boolean;
    reasons: string[];
  }>;
}

export interface PlatformAdapter {
  id: string;
  displayName: string;
  hosts: string[];
  matchesLocation(location: Location): boolean;
  getCards(): HTMLElement[];
  getItem(card: HTMLElement): ContentItem | null;
  getAutoState?(item: ContentItem, settings: ExtensionSettings): AutoDetectionResult;
  shouldIgnoreMutation?(mutation: MutationRecord): boolean;
}

export interface ContentRuntimeState {
  settings: ExtensionSettings;
  stats: RuntimeStats;
  watchedCount: number;
  platform?: string;
}
