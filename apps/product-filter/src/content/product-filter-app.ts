import { browser } from "wxt/browser";
import { matchProduct } from "../core/matcher";
import { loadSettings, normalizeSettings, requestSettingsMutation } from "../core/storage";
import { RULES_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "../shared/defaults";
import {
  MESSAGE_ADD_ASIN,
  MESSAGE_ADD_PRODUCT_ID,
  MESSAGE_ADD_TERM,
  MESSAGE_GET_STATE,
  MESSAGE_RESCAN,
  MESSAGE_UPDATE_SETTINGS,
  isProductFilterMessage
} from "../shared/messages";
import type { ProductFilterMessage } from "../shared/messages";
import type {
  ProductCandidate,
  ProductFilterSettings,
  ProductPlatformAdapter,
  RuntimeState,
  RuntimeStats
} from "../shared/types";

const STYLE_ID = "hup-product-filter-styles";
const HIDDEN_CLASS = "hup-product-hidden";
const DIMMED_CLASS = "hup-product-dimmed";
const OVERLAY_HOST_CLASS = "hup-product-overlay-host";
const OVERLAY_CLASS = "hup-product-overlay";
const DATA_REASON = "hupReason";
const SCAN_DEBOUNCE_MS = 120;

export class ProductFilterApp {
  private observer: MutationObserver | null = null;
  private ignoreMutations = false;
  private scanTimer: number | null = null;
  private settings: ProductFilterSettings | null = null;
  private stats: RuntimeStats = {
    candidates: 0,
    hidden: 0,
    lastScanAt: null
  };

  constructor(private readonly adapter: ProductPlatformAdapter) {}

  async start(): Promise<void> {
    injectStyles();
    this.settings = await loadSettings();
    this.bindMessages();
    this.bindStorageChanges();
    this.observe();
    this.scan();
  }

  getState(): RuntimeState {
    return {
      platformId: this.adapter.id,
      platformLabel: this.adapter.label,
      settings: this.getSettings(),
      stats: this.stats
    };
  }

  scan(): RuntimeState {
    const settings = this.getSettings();
    const candidates = this.adapter.collectCandidates();
    let hidden = 0;

    this.ignoreMutations = true;
    try {
      for (const candidate of candidates) {
        clearCandidateTreatment(candidate);
        const match = matchProduct(candidate, settings, this.adapter.id);

        if (!match.blocked) continue;

        hidden += 1;
        applyTreatment(candidate, settings, match.reasons);
      }
    } finally {
      window.setTimeout(() => {
        this.ignoreMutations = false;
      }, 0);
    }

    this.stats = {
      candidates: candidates.length,
      hidden,
      lastScanAt: new Date().toISOString()
    };

    return this.getState();
  }

  private getSettings(): ProductFilterSettings {
    return this.settings || normalizeSettings();
  }

  private bindMessages(): void {
    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isProductFilterMessage(message)) return undefined;

      void this.handleMessage(message)
        .then(sendResponse)
        .catch(() => sendResponse(undefined));
      return true;
    });
  }

  private bindStorageChanges(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      const preferencesChanged = areaName === "sync" && Boolean(changes[SETTINGS_STORAGE_KEY]);
      const rulesChanged = areaName === "local" && Boolean(changes[RULES_STORAGE_KEY]);
      if (!preferencesChanged && !rulesChanged) return;

      void this.reloadSettingsAndScan();
    });
  }

  private observe(): void {
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => {
      if (this.ignoreMutations) return;
      this.queueScan();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private queueScan(): void {
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
    }

    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = null;
      this.scan();
    }, SCAN_DEBOUNCE_MS);
  }

  private async reloadSettingsAndScan(): Promise<RuntimeState> {
    this.settings = await loadSettings();
    return this.scan();
  }

  private async handleMessage(message: ProductFilterMessage): Promise<RuntimeState> {
    if (message.type === MESSAGE_GET_STATE) {
      return this.getState();
    }

    if (message.type === MESSAGE_RESCAN) {
      return this.scan();
    }

    if (message.type === MESSAGE_UPDATE_SETTINGS) {
      this.settings = normalizeSettings({
        ...this.getSettings(),
        ...message.settings
      });
      return this.scan();
    }

    if (message.type === MESSAGE_ADD_TERM) {
      const term = message.term.trim();
      if (term) {
        this.settings = await requestSettingsMutation({ kind: "add-global-term", term });
      }
      return this.scan();
    }

    if (message.type === MESSAGE_ADD_ASIN || message.type === MESSAGE_ADD_PRODUCT_ID) {
      const productId = (message.type === MESSAGE_ADD_ASIN ? message.asin : message.productId).trim().toUpperCase();
      if (productId) {
        this.settings = await requestSettingsMutation({ kind: "add-product-id", productId });
      }
      return this.scan();
    }

    return this.getState();
  }
}

function clearCandidateTreatment(candidate: ProductCandidate): void {
  candidate.element.classList.remove(HIDDEN_CLASS);
  candidate.visualHost.classList.remove(HIDDEN_CLASS, DIMMED_CLASS, OVERLAY_HOST_CLASS);
  candidate.visualHost.querySelectorAll<HTMLElement>(`.${OVERLAY_CLASS}`).forEach((overlay) => overlay.remove());
  delete candidate.element.dataset[DATA_REASON];
  delete candidate.visualHost.dataset[DATA_REASON];
}

function applyTreatment(candidate: ProductCandidate, settings: ProductFilterSettings, reasons: string[]): void {
  const reason = reasons.join(" | ");
  candidate.element.dataset[DATA_REASON] = reason;

  if (settings.mode === "hide") {
    candidate.element.classList.add(HIDDEN_CLASS);
    return;
  }

  if (settings.mode === "dim") {
    candidate.visualHost.classList.add(DIMMED_CLASS);
    return;
  }

  candidate.visualHost.classList.add(OVERLAY_HOST_CLASS);
  candidate.visualHost.append(createOverlay(reason));
}

function createOverlay(reason: string): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;
  overlay.textContent = reason || "Bloqueado";
  return overlay;
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIDDEN_CLASS} {
      display: none !important;
    }

    .${DIMMED_CLASS} {
      opacity: 0.18 !important;
      filter: grayscale(0.85) saturate(0.45) !important;
      transition: opacity 120ms ease, filter 120ms ease;
    }

    .${OVERLAY_HOST_CLASS} {
      position: relative !important;
    }

    .${OVERLAY_CLASS} {
      position: absolute;
      inset: 0;
      z-index: 2147483646;
      display: grid;
      place-items: center;
      padding: 12px;
      border-radius: inherit;
      background: rgba(3, 7, 18, 0.78);
      color: #fff;
      font: 700 13px/1.25 Arial, sans-serif;
      text-align: center;
      pointer-events: none;
      box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.55);
    }
  `;
  document.documentElement.append(style);
}
