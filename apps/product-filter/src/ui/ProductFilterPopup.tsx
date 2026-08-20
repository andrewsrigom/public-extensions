import {
  AppFooter,
  AppHeader,
  AppIcon,
  Button,
  Card,
  Input,
  PreferencesMenu,
  PopupShell,
  Section,
  SelectField,
  SettingToggle,
  useExtensionTheme,
  type ThemeSelectorLabels,
  type LanguageSelectorOption
} from "@browser-extensions/ui";
import { Plus, X } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";

import {
  loadSettings,
  normalizeSettings,
  requestSettingsMutation,
  type ProductFilterSettingsMutation
} from "../core/storage";
import { getProductPlatformAdapterForUrl } from "../platforms";
import { getLocale, LANGUAGE_OPTIONS, resolveLanguage, t } from "../shared/i18n";
import { MESSAGE_GET_STATE, MESSAGE_UPDATE_SETTINGS } from "../shared/messages";
import type { LanguagePreference, ProductFilterSettings, RuntimeStats, RuntimeState } from "../shared/types";

type ProductLanguage = Exclude<LanguagePreference, "auto">;

type ActivePage = {
  canMessage: boolean;
  platformId: string | null;
  platformLabel: string | null;
  stats: RuntimeStats | null;
  tabId: number | null;
};

const PRODUCT_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS satisfies ReadonlyArray<LanguageSelectorOption<ProductLanguage>>;

const INITIAL_ACTIVE_PAGE: ActivePage = {
  canMessage: false,
  platformId: null,
  platformLabel: null,
  stats: null,
  tabId: null
};

export function ProductFilterPopup(): ReactElement {
  const [settings, setSettings] = useState<ProductFilterSettings>(() => normalizeSettings());
  const [activePage, setActivePage] = useState<ActivePage>(INITIAL_ACTIVE_PAGE);
  const [globalTerm, setGlobalTerm] = useState("");
  const [siteTerm, setSiteTerm] = useState("");
  const { setTheme, theme } = useExtensionTheme({ storageKey: "product-filter:theme" });

  const activeLanguage = resolveLanguage(settings.language) as ProductLanguage;
  const siteTerms = activePage.platformId ? getPlatformTerms(settings, activePage.platformId) : [];
  const status = useMemo(() => getStatusText(activePage, settings.language), [activePage, settings.language]);

  useEffect(() => {
    let mounted = true;

    void initializePopup().then((state) => {
      if (!mounted) return;
      setSettings(state.settings);
      setActivePage(state.activePage);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = getLocale(settings.language);
    document.title = t("appTitle", settings.language);
  }, [settings.language]);

  async function applyMutation(mutation: ProductFilterSettingsMutation): Promise<void> {
    const nextSettings = await requestSettingsMutation(mutation);
    setSettings(nextSettings);

    if (activePage.canMessage && activePage.tabId) {
      try {
        const runtimeState = await sendMessage<RuntimeState>(activePage.tabId, {
          type: MESSAGE_UPDATE_SETTINGS,
          settings: nextSettings
        });
        setSettings(runtimeState.settings);
        setActivePage((current) => mergeRuntimeState(current, runtimeState, true));
        return;
      } catch (_error) {
        setActivePage((current) => ({
          ...current,
          canMessage: false,
          stats: null
        }));
      }
    }
  }

  function updateSettings(
    preferences: Partial<Pick<ProductFilterSettings, "enabled" | "language" | "mode">>
  ): Promise<void> {
    return applyMutation({ kind: "update-preferences", preferences });
  }

  function addGlobalTerm(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const term = globalTerm.trim();

    if (!term) return;

    setGlobalTerm("");
    void applyMutation({ kind: "add-global-term", term }).catch(() => undefined);
  }

  function addSiteTerm(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const term = siteTerm.trim();

    if (!term || !activePage.platformId) return;

    setSiteTerm("");
    void applyMutation({ kind: "add-platform-term", platformId: activePage.platformId, term }).catch(() => undefined);
  }

  function removeGlobalTerm(rule: string): void {
    void applyMutation({ kind: "remove-global-term", term: rule }).catch(() => undefined);
  }

  function removeSiteTerm(rule: string): void {
    if (!activePage.platformId) return;

    void applyMutation({ kind: "remove-platform-term", platformId: activePage.platformId, term: rule }).catch(
      () => undefined
    );
  }

  return (
    <PopupShell>
      <AppHeader
        actions={
          <PreferencesMenu
            aria-label={t("languageLabel", settings.language)}
            language={activeLanguage}
            languageLabel={t("languageLabel", settings.language)}
            languageOptions={PRODUCT_LANGUAGE_OPTIONS}
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
        subtitle={t("appSubtitle", settings.language)}
        title={t("appTitle", settings.language)}
      />

      <StatusCard activePage={activePage} language={settings.language} status={status} />

      <Section title={t("globalTerms", settings.language)}>
        <RuleForm
          buttonLabel={t("add", settings.language)}
          inputValue={globalTerm}
          onChangeInput={setGlobalTerm}
          onSubmit={addGlobalTerm}
          placeholder={t("globalPlaceholder", settings.language)}
        />
        <RuleList
          emptyLabel={t("emptyRules", settings.language)}
          onRemove={removeGlobalTerm}
          removeLabel={(rule) => t("removeRule", settings.language, { rule })}
          rules={settings.blockedTerms}
        />
      </Section>

      <Section
        title={
          activePage.platformLabel
            ? t("siteTermsWithName", settings.language, { site: activePage.platformLabel })
            : t("siteTerms", settings.language)
        }
      >
        <RuleForm
          buttonLabel={t("add", settings.language)}
          disabled={!activePage.platformId}
          inputValue={siteTerm}
          onChangeInput={setSiteTerm}
          onSubmit={addSiteTerm}
          placeholder={t("sitePlaceholder", settings.language)}
        />
        <RuleList
          emptyLabel={t("emptyRules", settings.language)}
          onRemove={removeSiteTerm}
          removeLabel={(rule) => t("removeRule", settings.language, { rule })}
          rules={siteTerms}
        />
      </Section>

      <Card className="grid gap-3 p-3">
        <SettingToggle
          checked={settings.enabled}
          description={t("toggleHint", settings.language)}
          label={t("toggleLabel", settings.language)}
          onCheckedChange={(enabled) => {
            void updateSettings({ enabled }).catch(() => undefined);
          }}
        />

        <SelectField<ProductFilterSettings["mode"]>
          label={t("modeLabel", settings.language)}
          onValueChange={(mode) => {
            void updateSettings({ mode }).catch(() => undefined);
          }}
          options={[
            { label: t("modeHide", settings.language), value: "hide" },
            { label: t("modeDim", settings.language), value: "dim" },
            { label: t("modeOverlay", settings.language), value: "overlay" }
          ]}
          value={settings.mode}
        />
      </Card>

      <AppFooter
        privacy={t("privacyLocal", settings.language)}
        version={t("versionLabel", settings.language, {
          version: browser.runtime.getManifest().version
        })}
      />
    </PopupShell>
  );
}

function StatusCard({
  activePage,
  language,
  status
}: {
  activePage: ActivePage;
  language: LanguagePreference;
  status: string;
}): ReactElement {
  return (
    <Card className="grid gap-1.5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-normal text-[var(--extension-muted)]">
          {t("marketplace", language)}
        </span>
        {activePage.platformLabel ? (
          <span className="truncate text-right text-xs font-bold text-[var(--extension-muted-strong)]">
            {activePage.platformLabel}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium leading-snug text-[var(--extension-text)]">{status}</p>
      {activePage.stats ? (
        <p className="text-xs font-semibold text-[var(--extension-primary)]">
          {t("blockedSummary", language, { count: activePage.stats.hidden })}
        </p>
      ) : null}
    </Card>
  );
}

function RuleForm({
  buttonLabel,
  disabled = false,
  inputValue,
  onChangeInput,
  onSubmit,
  placeholder
}: {
  buttonLabel: string;
  disabled?: boolean;
  inputValue: string;
  onChangeInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
}): ReactElement {
  return (
    <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={onSubmit}>
      <Input
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => {
          onChangeInput(event.target.value);
        }}
        placeholder={placeholder}
        value={inputValue}
      />
      <Button disabled={disabled} type="submit">
        <Plus aria-hidden="true" size={16} strokeWidth={2.35} />
        {buttonLabel}
      </Button>
    </form>
  );
}

function RuleList({
  emptyLabel,
  onRemove,
  removeLabel,
  rules
}: {
  emptyLabel: string;
  onRemove: (rule: string) => void;
  removeLabel: (rule: string) => string;
  rules: string[];
}): ReactElement {
  if (rules.length === 0) {
    return <p className="min-h-6 text-xs font-medium text-[var(--extension-muted)]">{emptyLabel}</p>;
  }

  return (
    <div aria-live="polite" className="flex min-h-6 flex-wrap gap-1.5">
      {rules.map((rule) => (
        <span
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--extension-border-strong)] bg-[var(--extension-surface-subtle)] py-1 pl-2.5 pr-1 text-xs font-semibold text-[var(--extension-text)]"
          key={rule}
        >
          <span className="min-w-0 truncate">{rule}</span>
          <button
            aria-label={removeLabel(rule)}
            className="inline-grid size-5 place-items-center rounded-full text-[var(--extension-danger)] transition-colors hover:bg-[var(--extension-danger-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)]"
            onClick={() => {
              onRemove(rule);
            }}
            title={removeLabel(rule)}
            type="button"
          >
            <X aria-hidden="true" size={13} strokeWidth={2.5} />
          </button>
        </span>
      ))}
    </div>
  );
}

async function initializePopup(): Promise<{ activePage: ActivePage; settings: ProductFilterSettings }> {
  const [settings, tab] = await Promise.all([loadSettings(), getActiveTab()]);
  const adapter = tab?.url ? getProductPlatformAdapterForUrl(tab.url) : null;
  const activePage: ActivePage = {
    canMessage: Boolean(tab?.id && adapter),
    platformId: adapter?.id || null,
    platformLabel: adapter?.label || null,
    stats: null,
    tabId: tab?.id || null
  };

  if (!activePage.canMessage || !activePage.tabId) {
    return { activePage, settings };
  }

  try {
    const runtimeState = await sendMessage<RuntimeState>(activePage.tabId, { type: MESSAGE_GET_STATE });
    return {
      activePage: mergeRuntimeState(activePage, runtimeState, true),
      settings: runtimeState.settings
    };
  } catch (_error) {
    return {
      activePage: {
        ...activePage,
        canMessage: false,
        stats: null
      },
      settings
    };
  }
}

async function getActiveTab(): Promise<{ id?: number; url?: string } | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function sendMessage<TResponse>(tabId: number, message: unknown): Promise<TResponse> {
  return browser.tabs.sendMessage(tabId, message) as Promise<TResponse>;
}

function mergeRuntimeState(activePage: ActivePage, runtimeState: RuntimeState, canMessage: boolean): ActivePage {
  return {
    ...activePage,
    canMessage,
    platformId: runtimeState.platformId || activePage.platformId,
    platformLabel: runtimeState.platformLabel || activePage.platformLabel,
    stats: runtimeState.stats
  };
}

function getPlatformTerms(settings: ProductFilterSettings, platformId: string): string[] {
  return settings.blockedTermsByPlatform[platformId] || [];
}

function getStatusText(activePage: ActivePage, language: LanguagePreference): string {
  if (activePage.canMessage && activePage.platformLabel) {
    return t("statusApplied", language, { site: activePage.platformLabel });
  }

  if (activePage.platformLabel) {
    return t("statusReload", language);
  }

  return t("statusUnsupported", language);
}

function getThemeLabels(language: LanguagePreference): ThemeSelectorLabels {
  return {
    dark: t("themeDark", language),
    light: t("themeLight", language),
    system: t("themeSystem", language)
  };
}
