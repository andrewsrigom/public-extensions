import {
  AppFooter,
  AppHeader,
  AppIcon,
  Card,
  CheckboxField,
  ConfirmAction,
  PreferencesMenu,
  PopupShell,
  Section,
  StatusNotice,
  useExtensionTheme,
  type ThemeSelectorLabels
} from "@browser-extensions/ui";
import { Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";

import { getActiveSite, resetSite, SiteResetError } from "../reset/browser-api";
import {
  getDefaultSelectedCategories,
  getSupportedResetCategories,
  getSupportedSelectedCategories,
  type ActiveSite,
  type ResetCategoryId
} from "../reset/model";
import {
  formatSiteResetDataTypes,
  getDefaultSiteResetLanguage,
  getSiteResetMessages,
  SITE_RESET_LANGUAGE_OPTIONS,
  type SiteResetLanguage,
  type SiteResetMessages
} from "./i18n";

type ResetStatus = "idle" | "loading" | "cleaning" | "done" | "error";

const LANGUAGE_STORAGE_KEY = "site-reset:language";
const SUPPORTED_RESET_CATEGORIES = getSupportedResetCategories();

export function SiteResetApp(): ReactElement {
  const languageRevisionRef = useRef(0);
  const [site, setSite] = useState<ActiveSite | null>(null);
  const [selected, setSelected] = useState<ResetCategoryId[]>(() => getDefaultSelectedCategories());
  const [status, setStatus] = useState<ResetStatus>("loading");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<SiteResetLanguage>(() => getDefaultSiteResetLanguage());
  const { setTheme, theme } = useExtensionTheme({ storageKey: "site-reset:theme" });
  const messages = useMemo(() => getSiteResetMessages(language), [language]);
  const selectedSupported = getSupportedSelectedCategories(selected);
  const actionableSelectedCount = selectedSupported.length;
  const selectedDataTypes = formatSiteResetDataTypes(
    selectedSupported.map((categoryId) => getCategoryTitle(categoryId, messages)),
    language
  );
  const confirmationDescription = messages.cleanSelectedConfirmDescription(selectedDataTypes);

  useEffect(() => {
    let mounted = true;
    const languageRevision = languageRevisionRef.current;

    void loadLanguagePreference().then((storedLanguage) => {
      if (mounted && languageRevisionRef.current === languageRevision) {
        setLanguage(storedLanguage);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = messages.appTitle;
  }, [language, messages.appTitle]);

  useEffect(() => {
    let mounted = true;

    void getActiveSite().then((activeSite) => {
      if (!mounted) return;
      setSite(activeSite);
      setStatus(activeSite ? "idle" : "error");
      setError(activeSite ? "" : messages.noSite);
    });

    return () => {
      mounted = false;
    };
  }, [messages.noSite]);

  function changeLanguage(nextLanguage: SiteResetLanguage): void {
    languageRevisionRef.current += 1;
    setLanguage(nextLanguage);
    void saveLanguagePreference(nextLanguage);
  }

  function toggleCategory(categoryId: ResetCategoryId, checked: boolean): void {
    setSelected((current) =>
      checked ? [...new Set([...current, categoryId])] : current.filter((id) => id !== categoryId)
    );
  }

  function selectAll(): void {
    setSelected(SUPPORTED_RESET_CATEGORIES.map(({ id }) => id));
  }

  async function cleanSelected(): Promise<void> {
    if (!site || actionableSelectedCount === 0) return;

    setStatus("cleaning");
    setError("");

    try {
      await resetSite(site, selectedSupported);
      setStatus("done");
    } catch (unknownError) {
      setStatus("error");
      setError(getResetErrorMessage(unknownError, messages));
    }
  }

  return (
    <PopupShell className="content-start gap-2.5">
      <AppHeader
        actions={
          <PreferencesMenu
            aria-label={messages.moreActions}
            language={language}
            languageLabel={messages.language}
            languageOptions={SITE_RESET_LANGUAGE_OPTIONS}
            theme={theme}
            themeLabel={messages.theme}
            themeLabels={getThemeLabels(messages)}
            onChangeLanguage={changeLanguage}
            onChangeTheme={setTheme}
          />
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={messages.appSubtitle}
        title={messages.appTitle}
      />

      {site ? <CurrentSiteCard messages={messages} site={site} /> : <UnavailableSiteCard message={error} />}

      <Section
        actions={
          <button
            className="text-sm font-bold text-[var(--extension-primary)] hover:text-[var(--extension-primary-hover)]"
            onClick={selectAll}
            type="button"
          >
            {messages.selectAll}
          </button>
        }
        title={messages.whatToClear}
      >
        <Card className="divide-y divide-[var(--extension-border)] overflow-hidden">
          {SUPPORTED_RESET_CATEGORIES.map((category) => (
            <ResetCategoryRow
              key={category.id}
              checked={selected.includes(category.id)}
              categoryId={category.id}
              messages={messages}
              onCheckedChange={(checked) => {
                toggleCategory(category.id, checked);
              }}
            />
          ))}
        </Card>

        <ConfirmAction
          aria-label={messages.cleanSelected}
          cancelLabel={messages.cancel}
          className="w-full"
          confirmLabel={messages.cleanSelected}
          description={confirmationDescription}
          disabled={!site || actionableSelectedCount === 0 || status === "cleaning"}
          onConfirm={cleanSelected}
          onConfirmError={(unknownError) => {
            setStatus("error");
            setError(getResetErrorMessage(unknownError, messages));
          }}
          title={messages.cleanSelected}
          triggerClassName="w-full"
          triggerSize="default"
          triggerVariant="danger"
        >
          <Trash2 aria-hidden size={16} strokeWidth={2.35} />
          {status === "cleaning" ? messages.cleaning : messages.cleanSelected}
        </ConfirmAction>
      </Section>

      {status === "done" ? <StatusNotice tone="success">{messages.done}</StatusNotice> : null}
      {status === "error" && error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}

      <AppFooter privacy={messages.privacy} version={messages.versionLabel(browser.runtime.getManifest().version)} />
    </PopupShell>
  );
}

function getResetErrorMessage(error: unknown, messages: SiteResetMessages): string {
  if (error instanceof SiteResetError) {
    return error.code === "site-changed" ? messages.siteChanged : messages.cleanupFailed;
  }

  return messages.cleanupFailed;
}

function CurrentSiteCard({ messages, site }: { messages: SiteResetMessages; site: ActiveSite }): ReactElement {
  return (
    <Card className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 p-2.5">
      <div className="grid size-9 place-items-center overflow-hidden rounded-[7px] border border-[var(--extension-border)] bg-[var(--extension-field)]">
        {site.favIconUrl ? (
          <img alt="" className="size-5" src={site.favIconUrl} />
        ) : (
          <span className="text-sm font-black text-[var(--extension-text)]">
            {site.hostname.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-normal text-[var(--extension-muted)]">
            {messages.currentSite}
          </span>
        </div>
        <h2 className="truncate text-sm font-bold leading-tight text-[var(--extension-text)]">{site.hostname}</h2>
        <p className="truncate text-xs font-medium text-[var(--extension-muted)]">{site.origin}</p>
      </div>
    </Card>
  );
}

function UnavailableSiteCard({ message }: { message: string }): ReactElement {
  return <Card className="p-3 text-sm font-semibold text-[var(--extension-muted)]">{message}</Card>;
}

function ResetCategoryRow({
  categoryId,
  checked,
  messages,
  onCheckedChange
}: {
  categoryId: ResetCategoryId;
  checked: boolean;
  messages: SiteResetMessages;
  onCheckedChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <CheckboxField
      checked={checked}
      className="rounded-none border-0 bg-transparent"
      description={getCategoryDescription(categoryId, messages)}
      label={getCategoryTitle(categoryId, messages)}
      onCheckedChange={onCheckedChange}
    />
  );
}

async function loadLanguagePreference(): Promise<SiteResetLanguage> {
  try {
    const stored = await browser.storage.sync.get(LANGUAGE_STORAGE_KEY);
    const language = stored[LANGUAGE_STORAGE_KEY];
    return isSiteResetLanguage(language) ? language : getDefaultSiteResetLanguage();
  } catch (_error) {
    return getDefaultSiteResetLanguage();
  }
}

async function saveLanguagePreference(language: SiteResetLanguage): Promise<void> {
  await browser.storage.sync.set({ [LANGUAGE_STORAGE_KEY]: language });
}

function isSiteResetLanguage(value: unknown): value is SiteResetLanguage {
  return value === "en" || value === "pt-BR" || value === "es";
}

function getCategoryTitle(categoryId: ResetCategoryId, messages: SiteResetMessages): string {
  return {
    cache: messages.cache,
    cookies: messages.cookies,
    localStorage: messages.localStorage,
    offlineData: messages.offlineData,
    permissions: messages.permissions,
    siteSettings: messages.siteSettings
  }[categoryId];
}

function getCategoryDescription(categoryId: ResetCategoryId, messages: SiteResetMessages): string {
  return {
    cache: messages.cacheDescription,
    cookies: messages.cookiesDescription,
    localStorage: messages.localStorageDescription,
    offlineData: messages.offlineDataDescription,
    permissions: messages.permissionsDescription,
    siteSettings: messages.siteSettingsDescription
  }[categoryId];
}

function getThemeLabels(messages: SiteResetMessages): ThemeSelectorLabels {
  return {
    dark: messages.themeDark,
    light: messages.themeLight,
    system: messages.themeSystem
  };
}
