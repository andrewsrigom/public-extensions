import { browser } from "wxt/browser";
import { EMPTY_STATS, WATCHED_STORAGE_KEY } from "../shared/defaults";
import { t } from "../shared/i18n";
import { isPlatformEnabled } from "../shared/platforms";
import type {
  AutoDetectionResult,
  CardAnalysis,
  ContentItem,
  ContentRuntimeState,
  ExtensionSettings,
  PlatformAdapter,
  RuntimeStats,
  StoredWatchedItem,
  WatchedItemsByKey
} from "../shared/types";
import { CardRenderer } from "../core/renderer";
import { loadSettings, loadWatchedItems, saveSettings } from "../core/storage";
import { requestWatchedItemsMutation } from "../core/watched-items";

type RuntimeMessage =
  | { type: "HWC_GET_STATE" }
  | { type: "HWC_UPDATE_SETTINGS"; settings: Partial<ExtensionSettings> }
  | { type: "HWC_RESCAN" }
  | { type: "HWC_TOGGLE_CONTEXT_ITEM" };

const EMPTY_AUTO_STATE: AutoDetectionResult = {
  progress: null,
  reasons: [],
  state: "unwatched"
};

export class ContentApp {
  private settings!: ExtensionSettings;
  private watchedItems: WatchedItemsByKey = {};
  private readonly renderer: CardRenderer;
  private observer: MutationObserver | null = null;
  private scanTimer = 0;
  private stats: RuntimeStats = { ...EMPTY_STATS };
  private lastContextItemKey: string | null = null;
  private lastContextPoint: { x: number; y: number } | null = null;

  constructor(private readonly adapter: PlatformAdapter) {
    this.renderer = new CardRenderer({
      onToggleWatched: (key) => {
        void this.toggleManualWatched(key);
      }
    });
  }

  async start(): Promise<void> {
    this.settings = await loadSettings();
    this.watchedItems = await loadWatchedItems();
    this.bindMessages();
    this.bindContextMenu();
    this.bindStorageChanges();
    this.scan();
    this.startObserver();
  }

  private bindMessages(): void {
    browser.runtime.onMessage.addListener((rawMessage: unknown, _sender, sendResponse) => {
      const message = rawMessage as RuntimeMessage;
      let operation: Promise<ContentRuntimeState> | null = null;

      if (message?.type === "HWC_GET_STATE") {
        operation = Promise.resolve(this.getRuntimeState());
      }

      if (message?.type === "HWC_UPDATE_SETTINGS") {
        operation = this.updateSettings(message.settings).then(() => this.getRuntimeState());
      }

      if (message?.type === "HWC_RESCAN") {
        this.scan();
        operation = Promise.resolve(this.getRuntimeState());
      }

      if (message?.type === "HWC_TOGGLE_CONTEXT_ITEM") {
        operation = this.toggleLastContextItem().then(() => this.getRuntimeState());
      }

      if (!operation) return undefined;

      void operation.then(sendResponse).catch(() => sendResponse(undefined));
      return true;
    });
  }

  private bindContextMenu(): void {
    document.addEventListener(
      "contextmenu",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        this.lastContextPoint = { x: event.clientX, y: event.clientY };

        const item = target
          ? this.findItemForElement(target) || this.findItemFromPoint(event.clientX, event.clientY)
          : null;
        this.lastContextItemKey = item?.key || null;
      },
      true
    );
  }

  private bindStorageChanges(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && WATCHED_STORAGE_KEY in changes) {
        const change = changes[WATCHED_STORAGE_KEY] as { newValue?: WatchedItemsByKey } | undefined;
        this.watchedItems = change?.newValue || {};
        this.scan();
        return;
      }

      if (areaName !== "sync" || !this.hasSettingsChange(changes)) return;

      void loadSettings().then((settings) => {
        this.settings = settings;
        this.scan();
      });
    });
  }

  private hasSettingsChange(changes: Record<string, unknown>): boolean {
    return [
      "enabled",
      "showManualMarker",
      "autoDetectWatched",
      "hideCompleted",
      "hideInProgress",
      "hidePaidContent",
      "hideLiveEvents",
      "hideChannelContent",
      "completedThreshold",
      "mode",
      "language",
      "platforms",
      "debug"
    ].some((key) => key in changes);
  }

  private async updateSettings(partialSettings: Partial<ExtensionSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partialSettings };
    await saveSettings(this.settings);
    this.scan();
  }

  private getRuntimeState(): ContentRuntimeState {
    return {
      settings: this.settings,
      stats: this.stats,
      watchedCount: Object.keys(this.watchedItems).length,
      platform: this.adapter.id
    };
  }

  private scan(): RuntimeStats {
    if (!isPlatformEnabled(this.settings, this.adapter.id)) {
      this.renderer.clear();
      this.stats = {
        ...EMPTY_STATS,
        lastScanAt: new Date().toISOString(),
        sample: []
      };
      this.renderDebugPanel();
      return this.stats;
    }

    this.renderer.clearSectionVisibility();

    const cards = this.getAdapterCards();
    const sectionsToHide = new Map<HTMLElement, string>();
    const nextStats: RuntimeStats = {
      candidates: 0,
      hidden: 0,
      dimmed: 0,
      overlaid: 0,
      completed: 0,
      inProgress: 0,
      manualWatched: 0,
      lastScanAt: new Date().toISOString(),
      sample: []
    };

    for (const card of cards) {
      const item = this.getAdapterItem(card);
      if (!item) continue;

      nextStats.candidates += 1;

      const analysis = this.analyzeItem(item);
      const applied = this.renderer.apply(analysis, this.settings);
      const sectionReason = this.getSectionHideReason(analysis);

      if (sectionReason && analysis.sectionElement) {
        sectionsToHide.set(analysis.sectionElement, sectionReason);
      }

      if (analysis.manualWatched) nextStats.manualWatched += 1;
      if (analysis.state === "watched") nextStats.completed += 1;
      if (analysis.state === "in-progress") nextStats.inProgress += 1;
      if (applied === "hidden") nextStats.hidden += 1;
      if (applied === "dimmed") nextStats.dimmed += 1;
      if (applied === "overlaid") nextStats.overlaid += 1;

      if (analysis.state !== "unwatched" && nextStats.sample.length < 8) {
        nextStats.sample.push({
          title: analysis.title,
          platform: analysis.platform,
          state: analysis.state,
          progress: analysis.progress,
          manualWatched: analysis.manualWatched,
          reasons: analysis.reasons
        });
      }
    }

    for (const [section, reason] of sectionsToHide) {
      this.renderer.hideSection(section, reason);
    }

    this.stats = nextStats;
    this.renderDebugPanel();
    return this.stats;
  }

  private analyzeItem(item: ContentItem): CardAnalysis {
    const manualWatched = Boolean(this.watchedItems[item.key]);
    const autoState = this.getAdapterAutoState(item);

    if (manualWatched) {
      return {
        ...item,
        manualWatched,
        state: "watched",
        progress: autoState.progress,
        reasons: [t("reasonManual", this.settings.language), ...autoState.reasons]
      };
    }

    return {
      ...item,
      manualWatched,
      state: autoState.state,
      progress: autoState.progress,
      reasons: autoState.reasons
    };
  }

  private getSectionHideReason(analysis: CardAnalysis): string | null {
    if (!this.settings.enabled) return null;

    if (analysis.sectionHideReason === "paid-content" && this.settings.hidePaidContent) {
      return t("reasonPaidContent", this.settings.language);
    }

    if (analysis.sectionHideReason === "live-event" && this.settings.hideLiveEvents) {
      return t("reasonLiveEvent", this.settings.language);
    }

    if (analysis.sectionHideReason === "channel-content" && this.settings.hideChannelContent) {
      return t("reasonChannelContent", this.settings.language);
    }

    return null;
  }

  private async toggleManualWatched(key: string): Promise<void> {
    if (!key) return;

    const item = this.findCurrentItemByKey(key);
    const result = await requestWatchedItemsMutation({
      kind: "toggle",
      item: this.createStoredWatchedItem(key, item)
    });
    this.watchedItems = result.watchedItems;
    this.scan();
  }

  private async toggleLastContextItem(): Promise<void> {
    const key = this.lastContextItemKey || this.findItemFromLastContextPoint()?.key || null;
    if (!key) return;
    await this.toggleManualWatched(key);
  }

  private findItemForElement(target: Element): ContentItem | null {
    for (const card of this.getAdapterCards()) {
      if (!card.contains(target)) continue;

      const item = this.getAdapterItem(card);
      if (item) return item;
    }

    let current = target instanceof HTMLElement ? target : target.parentElement;
    let depth = 0;

    while (current && current !== document.documentElement && depth < 8) {
      const item = this.getAdapterItem(current);
      if (item) return item;

      current = current.parentElement;
      depth += 1;
    }

    return null;
  }

  private findItemFromLastContextPoint(): ContentItem | null {
    if (!this.lastContextPoint) return null;
    return this.findItemFromPoint(this.lastContextPoint.x, this.lastContextPoint.y);
  }

  private findItemFromPoint(x: number, y: number): ContentItem | null {
    const target = document.elementFromPoint(x, y);
    return target ? this.findItemForElement(target) : null;
  }

  private findCurrentItemByKey(key: string): ContentItem | null {
    for (const card of this.getAdapterCards()) {
      const item = this.getAdapterItem(card);
      if (item?.key === key) return item;
    }

    return null;
  }

  private getAdapterCards(): HTMLElement[] {
    try {
      return this.adapter.getCards();
    } catch {
      return [];
    }
  }

  private getAdapterItem(card: HTMLElement): ContentItem | null {
    try {
      return this.adapter.getItem(card);
    } catch {
      return null;
    }
  }

  private getAdapterAutoState(item: ContentItem): AutoDetectionResult {
    if (!this.settings.autoDetectWatched || !this.adapter.getAutoState) {
      return EMPTY_AUTO_STATE;
    }

    try {
      return this.adapter.getAutoState(item, this.settings);
    } catch {
      return EMPTY_AUTO_STATE;
    }
  }

  private createStoredWatchedItem(key: string, item: ContentItem | null): StoredWatchedItem {
    return {
      key,
      platform: item?.platform || this.adapter.id,
      title: item?.title || t("untitled", this.settings.language),
      url: item?.url,
      markedAt: new Date().toISOString(),
      source: "manual"
    };
  }

  private scheduleScan(): void {
    window.clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => this.scan(), 250);
  }

  private startObserver(): void {
    this.observer?.disconnect();
    this.observer = new MutationObserver((mutations) => {
      if (this.shouldIgnoreMutations(mutations)) return;
      this.scheduleScan();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-label", "aria-valuenow", "aria-valuetext"]
    });
  }

  private shouldIgnoreMutations(mutations: MutationRecord[]): boolean {
    const shouldIgnoreMutation = this.adapter.shouldIgnoreMutation;
    return Boolean(shouldIgnoreMutation && mutations.length > 0 && mutations.every(shouldIgnoreMutation));
  }

  private renderDebugPanel(): void {
    let panel = document.getElementById("hwc-status");

    if (!this.settings.debug) {
      panel?.remove();
      return;
    }

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "hwc-status";
      document.documentElement.appendChild(panel);
    }

    panel.textContent = [
      `Watched Filter`,
      t("debugPanelSite", this.settings.language, { site: this.adapter.displayName }),
      t("debugPanelCards", this.settings.language, { count: this.stats.candidates }),
      t("debugPanelMarked", this.settings.language, { count: this.stats.manualWatched }),
      t("debugPanelOverlay", this.settings.language, { count: this.stats.overlaid }),
      t("debugPanelHidden", this.settings.language, { count: this.stats.hidden }),
      t("debugPanelDimmed", this.settings.language, { count: this.stats.dimmed }),
      t("debugPanelWatched", this.settings.language, { count: this.stats.completed }),
      t("debugPanelPartial", this.settings.language, { count: this.stats.inProgress })
    ].join(" | ");
  }
}
