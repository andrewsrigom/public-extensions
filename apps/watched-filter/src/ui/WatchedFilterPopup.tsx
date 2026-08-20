import {
  AppFooter,
  AppHeader,
  AppIcon,
  Button,
  Card,
  PreferencesMenu,
  PopupShell,
  Section,
  SelectField,
  SettingToggle,
  SliderField,
  StatusNotice,
  useExtensionTheme,
  type ThemeSelectorLabels,
  type LanguageSelectorOption
} from "@browser-extensions/ui";
import { ChevronDown, PanelTopOpen, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";

import { loadSettings, saveSettings } from "../core/storage";
import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { getLocale, LANGUAGE_OPTIONS, t } from "../shared/i18n";
import { getPlatformLabel, normalizePlatformSettings } from "../shared/platforms";
import type {
  ContentRuntimeState,
  ExtensionSettings,
  LanguagePreference,
  RuntimeStats,
  VisualMode
} from "../shared/types";

type SettingSwitchKey =
  | "enabled"
  | "showManualMarker"
  | "autoDetectWatched"
  | "hideCompleted"
  | "hideInProgress"
  | "hidePaidContent"
  | "hideLiveEvents"
  | "hideChannelContent";

type ActivePage = {
  canMessage: boolean;
  isSupported: boolean;
  platform: string | null;
  stats: RuntimeStats | null;
  tabId: number | null;
  watchedCount: number | null;
};

const INITIAL_ACTIVE_PAGE: ActivePage = {
  canMessage: false,
  isSupported: false,
  platform: null,
  stats: null,
  tabId: null,
  watchedCount: null
};

const SUPPORTED_HOST_PATTERNS = [
  "primevideo.com",
  "netflix.com",
  "disneyplus.com",
  "max.com",
  "hbomax.com",
  "youtube.com",
  "youtu.be",
  "globoplay.globo.com",
  "paramountplus.com",
  "tv.apple.com",
  "crunchyroll.com",
  "iq.com"
];

type SettingsSwitch = {
  descriptionKey: Parameters<typeof t>[0];
  key: SettingSwitchKey;
  titleKey: Parameters<typeof t>[0];
  tone?: "default" | "neutral" | "success" | "warning";
};

const CORE_SWITCHES = [
  {
    descriptionKey: "enabledDescription",
    key: "enabled",
    titleKey: "enabledTitle"
  },
  {
    descriptionKey: "manualMarkerDescription",
    key: "showManualMarker",
    titleKey: "manualMarkerTitle"
  },
  {
    descriptionKey: "autoDetectDescription",
    key: "autoDetectWatched",
    titleKey: "autoDetectTitle"
  },
  {
    descriptionKey: "hideCompletedDescription",
    key: "hideCompleted",
    tone: "success",
    titleKey: "hideCompletedTitle"
  },
  {
    descriptionKey: "hideInProgressDescription",
    key: "hideInProgress",
    tone: "warning",
    titleKey: "hideInProgressTitle"
  }
] satisfies SettingsSwitch[];

const ADVANCED_SWITCHES = [
  {
    descriptionKey: "hidePaidContentDescription",
    key: "hidePaidContent",
    tone: "neutral",
    titleKey: "hidePaidContentTitle"
  },
  {
    descriptionKey: "hideLiveEventsDescription",
    key: "hideLiveEvents",
    tone: "warning",
    titleKey: "hideLiveEventsTitle"
  },
  {
    descriptionKey: "hideChannelContentDescription",
    key: "hideChannelContent",
    tone: "neutral",
    titleKey: "hideChannelContentTitle"
  }
] satisfies SettingsSwitch[];

export function WatchedFilterPopup(): ReactElement {
  const [settings, setSettings] = useState<ExtensionSettings>(() => normalizeSettings());
  const [activePage, setActivePage] = useState<ActivePage>(INITIAL_ACTIVE_PAGE);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const { setTheme, theme } = useExtensionTheme({ storageKey: "watched-filter:theme" });

  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((option) => ({
        label: t(option.labelKey, settings.language),
        value: option.value
      })) satisfies Array<LanguageSelectorOption<LanguagePreference>>,
    [settings.language]
  );
  const pageStatus = getPageStatus(activePage, isReady, settings.language);
  const optionsUrl = browser.runtime.getURL("/options.html");

  useEffect(() => {
    let mounted = true;

    void initializePopup().then((state) => {
      if (!mounted) return;
      setSettings(state.settings);
      setActivePage(state.activePage);
      setIsReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = getLocale(settings.language);
    document.title = t("appName", settings.language);
  }, [settings.language]);

  async function updateSettings(partialSettings: Partial<ExtensionSettings>): Promise<void> {
    if (!isReady) return;

    const nextSettings = normalizeSettings({
      ...settings,
      ...partialSettings
    });

    setSettings(nextSettings);
    setStatusMessage("");

    if (activePage.canMessage && activePage.tabId) {
      try {
        const response = await sendMessage<ContentRuntimeState>(activePage.tabId, {
          type: "HWC_UPDATE_SETTINGS",
          settings: nextSettings
        });
        applyRuntimeState(response, true);
        return;
      } catch (_error) {
        setActivePage((current) => ({
          ...current,
          canMessage: false,
          stats: null
        }));
        setStatusMessage(t("updateFailed", settings.language));
      }
    }

    await saveSettings(nextSettings);
  }

  async function rescanPage(): Promise<void> {
    if (!activePage.canMessage || !activePage.tabId) return;

    try {
      const response = await sendMessage<ContentRuntimeState>(activePage.tabId, { type: "HWC_RESCAN" });
      applyRuntimeState(response, true);
      setStatusMessage("");
    } catch (_error) {
      setActivePage((current) => ({
        ...current,
        canMessage: false,
        stats: null
      }));
      setStatusMessage(t("rescanFailed", settings.language));
    }
  }

  function applyRuntimeState(response: ContentRuntimeState, canMessage: boolean): void {
    setSettings(normalizeSettings(response.settings));
    setActivePage((current) => ({
      ...current,
      canMessage,
      platform: response.platform || current.platform,
      stats: response.stats,
      watchedCount: response.watchedCount
    }));
  }

  return (
    <PopupShell>
      <AppHeader
        actions={
          <PreferencesMenu
            aria-label={t("languageLabel", settings.language)}
            language={settings.language}
            languageLabel={t("languageLabel", settings.language)}
            languageOptions={languageOptions}
            theme={theme}
            themeLabel={t("theme", settings.language)}
            themeLabels={getThemeLabels(settings.language)}
            onChangeLanguage={(language) => {
              void updateSettings({ language }).catch(() => undefined);
            }}
            onChangeTheme={setTheme}
          />
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={t("popupSubtitle", settings.language)}
        title={t("popupTitle", settings.language)}
      />

      <Card className="grid gap-2.5 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[var(--extension-text)]">
              {t("pageStatusTitle", settings.language)}
            </h2>
            <p className="mt-1 text-xs font-medium leading-snug text-[var(--extension-muted)]">{pageStatus}</p>
          </div>
          <Button
            aria-label={t("rescanPage", settings.language)}
            disabled={!activePage.canMessage}
            onClick={() => {
              void rescanPage();
            }}
            size="icon"
            type="button"
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" size={16} strokeWidth={2.4} />
          </Button>
        </div>

        {activePage.stats ? <StatsGrid activePage={activePage} language={settings.language} /> : null}
        {statusMessage ? <StatusNotice tone="danger">{statusMessage}</StatusNotice> : null}
      </Card>

      <Section title={t("mainSettingsTitle", settings.language)}>
        <Card className="divide-y divide-[var(--extension-border)] overflow-hidden">
          {CORE_SWITCHES.map((item) => (
            <SettingToggle
              checked={settings[item.key]}
              description={t(item.descriptionKey, settings.language)}
              disabled={!isReady}
              key={item.key}
              label={t(item.titleKey, settings.language)}
              onCheckedChange={(checked) => {
                void updateSettings({ [item.key]: checked }).catch(() => undefined);
              }}
              tone={item.tone}
            />
          ))}
        </Card>
      </Section>

      <Card className="overflow-hidden">
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-bold text-[var(--extension-text)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--extension-focus)] [&::-webkit-details-marker]:hidden">
            <span>{t("advancedSettingsTitle", settings.language)}</span>
            <ChevronDown
              aria-hidden="true"
              className="shrink-0 text-[var(--extension-muted)] transition-transform group-open:rotate-180"
              size={17}
              strokeWidth={2.4}
            />
          </summary>
          <div className="divide-y divide-[var(--extension-border)] border-t border-[var(--extension-border)]">
            {ADVANCED_SWITCHES.map((item) => (
              <SettingToggle
                checked={settings[item.key]}
                description={t(item.descriptionKey, settings.language)}
                disabled={!isReady}
                key={item.key}
                label={t(item.titleKey, settings.language)}
                onCheckedChange={(checked) => {
                  void updateSettings({ [item.key]: checked }).catch(() => undefined);
                }}
                tone={item.tone}
              />
            ))}
          </div>
        </details>
      </Card>

      <Card className="grid gap-3 p-3">
        <SliderField
          disabled={!isReady}
          label={t("thresholdPrefix", settings.language)}
          marks={[
            { label: "50%", value: 50 },
            { label: "75%", value: 75 },
            { label: "100%", value: 100 }
          ]}
          max={100}
          min={50}
          onValueChange={(completedThreshold) => {
            void updateSettings({ completedThreshold }).catch(() => undefined);
          }}
          step={5}
          value={settings.completedThreshold}
          valueLabel={`${settings.completedThreshold}%`}
        />

        <SelectField<VisualMode>
          disabled={!isReady}
          label={t("modeLabel", settings.language)}
          onValueChange={(mode) => {
            void updateSettings({ mode }).catch(() => undefined);
          }}
          options={[
            { label: t("modeOverlay", settings.language), value: "overlay" },
            { label: t("modeHide", settings.language), value: "hide" },
            { label: t("modeDim", settings.language), value: "dim" }
          ]}
          value={settings.mode}
        />
      </Card>

      <Button asChild variant="secondary">
        <a href={optionsUrl} rel="noreferrer" target="_blank">
          <PanelTopOpen aria-hidden="true" size={16} strokeWidth={2.3} />
          {t("manageWatched", settings.language)}
        </a>
      </Button>

      <AppFooter
        privacy={t("privacyLocal", settings.language)}
        version={t("versionLabel", settings.language, {
          version: browser.runtime.getManifest().version
        })}
      />
    </PopupShell>
  );
}

function StatsGrid({ activePage, language }: { activePage: ActivePage; language: LanguagePreference }): ReactElement {
  const stats = activePage.stats;

  if (!stats) {
    return <></>;
  }

  const affected = stats.hidden + stats.dimmed + stats.overlaid;
  const items = [
    { label: t("statCards", language), value: stats.candidates },
    { label: t("statMarked", language), value: activePage.watchedCount ?? stats.manualWatched },
    { label: t("statWatched", language), value: stats.completed },
    { label: t("statPartial", language), value: stats.inProgress },
    { label: t("statAffected", language), value: affected }
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {items.map((item) => (
        <div
          className="grid min-w-0 gap-0.5 rounded-[7px] border border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] p-1.5 text-center"
          key={item.label}
        >
          <span className="truncate text-[10px] font-bold text-[var(--extension-muted)]">{item.label}</span>
          <span className="truncate text-sm font-extrabold text-[var(--extension-text)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

async function initializePopup(): Promise<{ activePage: ActivePage; settings: ExtensionSettings }> {
  const [settings, tab] = await Promise.all([loadSettings(), queryActiveTab()]);
  const hostname = getHostname(tab?.url);
  const activePage: ActivePage = {
    ...INITIAL_ACTIVE_PAGE,
    isSupported: Boolean(hostname && isSupportedHostname(hostname)),
    tabId: tab?.id || null
  };

  if (!activePage.isSupported || !activePage.tabId) {
    return { activePage, settings };
  }

  try {
    const response = await sendMessage<ContentRuntimeState>(activePage.tabId, { type: "HWC_GET_STATE" });
    return {
      activePage: runtimeStateToActivePage(activePage, response, true),
      settings: normalizeSettings(response.settings)
    };
  } catch (_error) {
    return { activePage, settings };
  }
}

async function queryActiveTab(): Promise<{ id?: number; url?: string } | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function sendMessage<TResponse>(tabId: number, message: unknown): Promise<TResponse> {
  return browser.tabs.sendMessage(tabId, message) as Promise<TResponse>;
}

function runtimeStateToActivePage(
  activePage: ActivePage,
  response: ContentRuntimeState,
  canMessage: boolean
): ActivePage {
  return {
    ...activePage,
    canMessage,
    platform: response.platform || activePage.platform,
    stats: response.stats,
    watchedCount: response.watchedCount
  };
}

function getPageStatus(activePage: ActivePage, isReady: boolean, language: LanguagePreference): string {
  if (!isReady) {
    return t("pageStatusReading", language);
  }

  if (activePage.canMessage && activePage.platform) {
    return t("connectedPage", language, { platform: getPlatformLabel(activePage.platform) });
  }

  if (activePage.isSupported) {
    return t("reloadPage", language);
  }

  return t("unsupportedPage", language);
}

function getHostname(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname : "";
  } catch (_error) {
    return "";
  }
}

function isSupportedHostname(hostname: string): boolean {
  return SUPPORTED_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`));
}

function normalizeSettings(settings: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    ...SETTINGS_DEFAULTS,
    ...settings,
    platforms: normalizePlatformSettings(settings.platforms)
  };
}

function getThemeLabels(language: LanguagePreference): ThemeSelectorLabels {
  return {
    dark: t("themeDark", language),
    light: t("themeLight", language),
    system: t("themeSystem", language)
  };
}
