import type { CardAnalysis, ExtensionSettings } from "../shared/types";
import { t } from "../shared/i18n";

const CLASS_INSTRUMENTED = "hwc-card-instrumented";
const CLASS_SURFACE = "hwc-card-surface";
const CLASS_HIDDEN = "hwc-card-hidden";
const CLASS_DIMMED = "hwc-card-dimmed";
const CLASS_OVERLAY_LAYER = "hwc-card-overlay-layer";
const CLASS_DEBUG = "hwc-debug-card";
const CLASS_MARKER = "hwc-watch-marker";
const CLASS_MARKER_HOST = "hwc-card-marker-host";
const CLASS_SECTION_HIDDEN = "hwc-section-hidden";
const ATTRIBUTE_REASON = "data-hwc-reason";
const ATTRIBUTE_MANAGED = "data-hwc-managed";
const MARKER_BLOCKED_EVENTS = ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "auxclick"] as const;

export type AppliedVisualState = "visible" | "hidden" | "dimmed" | "overlaid";

export const MANAGED_CARD_SELECTOR = `[${ATTRIBUTE_MANAGED}="true"]`;

export interface RendererOptions {
  onToggleWatched(key: string): void;
}

export class CardRenderer {
  private readonly onToggleWatched: (key: string) => void;
  private readonly visualHostTargets = new WeakMap<HTMLElement, HTMLElement>();
  private readonly markerHostTargets = new WeakMap<HTMLElement, HTMLElement>();

  constructor(options: RendererOptions) {
    this.onToggleWatched = options.onToggleWatched;
    this.bindGlobalMarkerEvents();
    this.injectStyles();
  }

  apply(analysis: CardAnalysis, settings: ExtensionSettings): AppliedVisualState {
    const { element } = analysis;
    const visualHost = this.getVisualHostElement(analysis);
    const markerHost = this.getMarkerHostElement(analysis);

    element.dataset.hwcManaged = "true";
    element.classList.add(CLASS_INSTRUMENTED);
    element.classList.remove(CLASS_HIDDEN, CLASS_DIMMED, CLASS_DEBUG);
    element.removeAttribute(ATTRIBUTE_REASON);

    this.prepareHosts(element, visualHost, markerHost);
    this.updateMarker(analysis, settings, markerHost);

    const forcedHideReason = this.getForcedHideReason(analysis, settings);

    if (forcedHideReason) {
      this.removeOverlayLayer(visualHost);
      element.setAttribute(ATTRIBUTE_REASON, [...analysis.reasons, forcedHideReason].filter(Boolean).join(", "));
      element.classList.add(CLASS_HIDDEN);
      return "hidden";
    }

    const suppress = this.shouldApplyVisualState(analysis, settings);

    if (!suppress) {
      this.removeOverlayLayer(visualHost);

      if (settings.debug && analysis.state !== "unwatched") {
        element.classList.add(CLASS_DEBUG);
        element.setAttribute(ATTRIBUTE_REASON, analysis.reasons.join(", "));
      }
      return "visible";
    }

    const mode = this.getEffectiveMode(analysis, settings);
    element.setAttribute(ATTRIBUTE_REASON, analysis.reasons.join(", "));

    if (mode === "hide") {
      this.removeOverlayLayer(visualHost);
      element.classList.add(CLASS_HIDDEN);
      return "hidden";
    }

    if (mode === "dim") {
      this.removeOverlayLayer(visualHost);
      element.classList.add(CLASS_DIMMED);
      return "dimmed";
    }

    this.ensureOverlayLayer(visualHost);
    return "overlaid";
  }

  clearSectionVisibility(): void {
    for (const section of document.querySelectorAll<HTMLElement>(`.${CLASS_SECTION_HIDDEN}`)) {
      section.classList.remove(CLASS_SECTION_HIDDEN);
      section.removeAttribute(ATTRIBUTE_REASON);
    }
  }

  hideSection(section: HTMLElement, reason: string): void {
    section.classList.add(CLASS_SECTION_HIDDEN);
    section.setAttribute(ATTRIBUTE_REASON, reason);
  }

  clear(): void {
    for (const marker of document.querySelectorAll<HTMLElement>(`.${CLASS_MARKER}`)) {
      marker.remove();
    }

    for (const layer of document.querySelectorAll<HTMLElement>(`.${CLASS_OVERLAY_LAYER}`)) {
      layer.remove();
    }

    for (const element of document.querySelectorAll<HTMLElement>(
      [
        MANAGED_CARD_SELECTOR,
        `.${CLASS_INSTRUMENTED}`,
        `.${CLASS_SURFACE}`,
        `.${CLASS_MARKER_HOST}`,
        `.${CLASS_HIDDEN}`,
        `.${CLASS_DIMMED}`,
        `.${CLASS_DEBUG}`,
        `.${CLASS_SECTION_HIDDEN}`
      ].join(",")
    )) {
      element.classList.remove(
        CLASS_INSTRUMENTED,
        CLASS_SURFACE,
        CLASS_MARKER_HOST,
        CLASS_HIDDEN,
        CLASS_DIMMED,
        CLASS_DEBUG,
        CLASS_SECTION_HIDDEN
      );
      element.removeAttribute(ATTRIBUTE_MANAGED);
      element.removeAttribute(ATTRIBUTE_REASON);
    }
  }

  private shouldApplyVisualState(analysis: CardAnalysis, settings: ExtensionSettings): boolean {
    if (analysis.markerPlacement === "page-action") return false;
    if (!settings.enabled) return false;
    if (analysis.state === "watched") return settings.hideCompleted;
    if (analysis.state === "in-progress") return settings.hideInProgress;
    return false;
  }

  private getForcedHideReason(analysis: CardAnalysis, settings: ExtensionSettings): string | null {
    if (analysis.markerPlacement === "page-action") return null;
    if (!settings.enabled) return null;
    if (settings.hidePaidContent && analysis.requiresAdditionalSubscription) {
      return t("reasonPaidContent", settings.language);
    }
    if (settings.hideLiveEvents && analysis.isLiveEvent) {
      return t("reasonLiveEvent", settings.language);
    }
    if (settings.hideChannelContent && analysis.requiresChannelSubscription) {
      return t("reasonChannelContent", settings.language);
    }
    return null;
  }

  private getEffectiveMode(analysis: CardAnalysis, settings: ExtensionSettings): ExtensionSettings["mode"] {
    return settings.mode === "dim" && analysis.dimModeFallback ? analysis.dimModeFallback : settings.mode;
  }

  private getVisualHostElement(analysis: CardAnalysis): HTMLElement {
    return analysis.visualHost || analysis.visualElement?.parentElement || analysis.element;
  }

  private getMarkerHostElement(analysis: CardAnalysis): HTMLElement {
    if (analysis.markerHost) return analysis.markerHost;

    const card = analysis.element;

    if (card.tagName !== "A" && !card.closest("a[href]")) {
      return card;
    }

    return this.getVisualHostElement(analysis);
  }

  private prepareHosts(card: HTMLElement, visualHost: HTMLElement, markerHost: HTMLElement): void {
    const previousVisualHost = this.visualHostTargets.get(card);
    const previousMarkerHost = this.markerHostTargets.get(card);

    if (previousVisualHost && previousVisualHost !== visualHost) {
      this.removeMarker(previousVisualHost);
      this.removeOverlayLayer(previousVisualHost);
      previousVisualHost.classList.remove(CLASS_SURFACE);
    }

    if (previousMarkerHost && previousMarkerHost !== markerHost) {
      this.removeMarker(previousMarkerHost);
      previousMarkerHost.classList.remove(CLASS_MARKER_HOST);
    }

    this.removeDetachedManagedChildren(card, visualHost, markerHost);
    visualHost.classList.add(CLASS_SURFACE);
    markerHost.classList.add(CLASS_MARKER_HOST);
    this.visualHostTargets.set(card, visualHost);
    this.markerHostTargets.set(card, markerHost);
  }

  private removeDetachedManagedChildren(card: HTMLElement, visualHost: HTMLElement, markerHost: HTMLElement): void {
    for (const marker of card.querySelectorAll<HTMLElement>(`.${CLASS_MARKER}`)) {
      if (marker.parentElement !== markerHost) marker.remove();
    }

    for (const layer of card.querySelectorAll<HTMLElement>(`.${CLASS_OVERLAY_LAYER}`)) {
      if (layer.parentElement !== visualHost) layer.remove();
    }
  }

  private updateMarker(analysis: CardAnalysis, settings: ExtensionSettings, host: HTMLElement): void {
    if (!settings.enabled || !settings.showManualMarker) {
      this.removeMarker(host);
      return;
    }

    let marker = host.querySelector<HTMLButtonElement>(`:scope > .${CLASS_MARKER}`);

    if (!marker) {
      marker = document.createElement("button");
      marker.type = "button";
      marker.className = CLASS_MARKER;
      this.bindMarkerFallbackEvents(marker);
      host.appendChild(marker);
    }

    marker.dataset.hwcKey = analysis.key;
    this.positionMarker(marker, analysis, host);
    this.setAttributeIfChanged(marker, "aria-pressed", analysis.manualWatched ? "true" : "false");
    this.setAttributeIfChanged(
      marker,
      "aria-label",
      analysis.manualWatched
        ? t("markerUnmarkAria", settings.language, { title: analysis.title })
        : t("markerMarkAria", settings.language, { title: analysis.title })
    );
    marker.title = analysis.manualWatched
      ? t("markerMarkedTitle", settings.language)
      : t("markerMarkTitle", settings.language);
  }

  private removeMarker(host: HTMLElement): void {
    host.querySelector(`:scope > .${CLASS_MARKER}`)?.remove();
  }

  private ensureOverlayLayer(host: HTMLElement): HTMLElement {
    let layer = host.querySelector<HTMLElement>(`:scope > .${CLASS_OVERLAY_LAYER}`);

    if (!layer) {
      layer = document.createElement("div");
      layer.className = CLASS_OVERLAY_LAYER;
      layer.setAttribute("aria-hidden", "true");
      host.prepend(layer);
    }

    return layer;
  }

  private removeOverlayLayer(host: HTMLElement): void {
    host.querySelector(`:scope > .${CLASS_OVERLAY_LAYER}`)?.remove();
  }

  private bindGlobalMarkerEvents(): void {
    for (const eventName of MARKER_BLOCKED_EVENTS) {
      document.addEventListener(eventName, (event) => this.blockIfMarkerEvent(event), true);
    }

    document.addEventListener("click", (event) => this.activateIfMarkerEvent(event), true);
  }

  private bindMarkerFallbackEvents(marker: HTMLButtonElement): void {
    for (const eventName of MARKER_BLOCKED_EVENTS) {
      marker.addEventListener(eventName, (event) => this.blockMarkerEvent(event), true);
      marker.addEventListener(eventName, (event) => this.blockMarkerEvent(event));
    }

    marker.addEventListener("click", (event) => this.activateIfMarkerEvent(event), true);
    marker.addEventListener("click", (event) => this.activateIfMarkerEvent(event));
  }

  private blockIfMarkerEvent(event: Event): void {
    if (!this.getMarkerFromEvent(event)) return;
    this.blockMarkerEvent(event);
  }

  private activateIfMarkerEvent(event: Event): void {
    const marker = this.getMarkerFromEvent(event);
    if (!marker) return;

    this.blockMarkerEvent(event);
    this.onToggleWatched(marker.dataset.hwcKey || "");
  }

  private blockMarkerEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  private getMarkerFromEvent(event: Event): HTMLButtonElement | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;

    const marker = target.closest(`.${CLASS_MARKER}`);
    return marker instanceof HTMLButtonElement ? marker : null;
  }

  private positionMarker(marker: HTMLButtonElement, analysis: CardAnalysis, host: HTMLElement): void {
    marker.dataset.hwcPlacement = analysis.markerPlacement || "";

    if (analysis.markerPlacement === "page-action") {
      this.setStyleIfChanged(marker, "position", "relative");
      this.setStyleIfChanged(marker, "top", "auto");
      this.setStyleIfChanged(marker, "right", "auto");
      this.setStyleIfChanged(marker, "bottom", "auto");
      this.setStyleIfChanged(marker, "left", "auto");
      return;
    }

    this.setStyleIfChanged(marker, "position", "absolute");
    this.setStyleIfChanged(marker, "right", "auto");

    if (analysis.markerPlacement === "host-bottom-left") {
      this.setStyleIfChanged(marker, "top", "auto");
      this.setStyleIfChanged(marker, "bottom", "0px");
      this.setStyleIfChanged(marker, "left", "0px");
      return;
    }

    const visualRect = analysis.visualElement?.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    this.setStyleIfChanged(marker, "bottom", "auto");

    if (!visualRect || !hostRect.width || !hostRect.height) {
      this.setStyleIfChanged(marker, "top", "10px");
      this.setStyleIfChanged(marker, "left", "10px");
      return;
    }

    this.setStyleIfChanged(marker, "top", `${Math.max(6, Math.round(visualRect.top - hostRect.top + 10))}px`);
    this.setStyleIfChanged(marker, "left", `${Math.max(6, Math.round(visualRect.left - hostRect.left + 10))}px`);
  }

  private setAttributeIfChanged(node: HTMLElement, name: string, value: string): void {
    if (node.getAttribute(name) !== value) {
      node.setAttribute(name, value);
    }
  }

  private setStyleIfChanged(node: HTMLElement, name: string, value: string): void {
    if (node.style.getPropertyValue(name) !== value) {
      node.style.setProperty(name, value);
    }
  }

  private injectStyles(): void {
    if (document.getElementById("watched-filter-style")) return;

    const style = document.createElement("style");
    style.id = "watched-filter-style";
    style.textContent = `
      .${CLASS_INSTRUMENTED} {
        position: relative !important;
      }

      .${CLASS_SURFACE} {
        position: relative !important;
        isolation: isolate !important;
      }

      .${CLASS_MARKER_HOST} {
        position: relative !important;
      }

      .${CLASS_HIDDEN} {
        display: none !important;
      }

      .${CLASS_SECTION_HIDDEN} {
        display: none !important;
      }

      .${CLASS_DIMMED} {
        opacity: 0.22 !important;
        filter: grayscale(0.85) !important;
        transition: opacity 140ms ease, filter 140ms ease;
      }

      .${CLASS_DIMMED}:hover {
        opacity: 0.9 !important;
        filter: none !important;
      }

      .${CLASS_OVERLAY_LAYER} {
        position: absolute;
        inset: 0;
        z-index: 2;
        border-radius: inherit;
        background: rgba(0, 0, 0, 0.68);
        pointer-events: none;
      }

      .${CLASS_DEBUG} {
        outline: 3px solid #f59e0b !important;
        outline-offset: 3px !important;
      }

      .${CLASS_MARKER} {
        position: absolute;
        z-index: 2147483646;
        top: 10px;
        left: 10px;
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 4px;
        appearance: none;
        background: rgba(127, 14, 14, 0.98);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.58);
        cursor: pointer;
        pointer-events: auto !important;
        touch-action: manipulation;
        user-select: none;
      }

      .${CLASS_MARKER}::before {
        content: "";
        width: 16px;
        height: 16px;
        border: 2px solid #f8fafc;
        border-radius: 1px;
        background: rgba(15, 23, 42, 0.18);
      }

      .${CLASS_MARKER}[aria-pressed="true"] {
        background: rgba(5, 122, 45, 0.98);
      }

      .${CLASS_MARKER}[aria-pressed="true"]::before {
        content: "\\2713";
        display: grid;
        place-items: center;
        width: 18px;
        height: 18px;
        border-color: #dcfce7;
        color: #ffffff;
        background: rgba(22, 163, 74, 0.95);
        font: 800 17px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .${CLASS_MARKER}:focus-visible {
        outline: 3px solid #38bdf8;
        outline-offset: 2px;
      }

      .${CLASS_MARKER}[data-hwc-placement="page-action"] {
        width: 36px;
        height: 36px;
        margin-left: 8px;
        border-radius: 18px;
        box-shadow: none;
      }

      #hwc-status {
        position: fixed;
        z-index: 2147483647;
        right: 16px;
        bottom: 16px;
        max-width: 360px;
        padding: 10px 12px;
        border-radius: 8px;
        color: #f8fafc;
        background: rgba(15, 23, 42, 0.92);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
        font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: none;
      }
    `;
    document.documentElement.appendChild(style);
  }
}
