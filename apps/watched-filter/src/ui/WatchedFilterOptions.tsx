import {
  AppHeader,
  AppIcon,
  Button,
  Card,
  CheckboxField,
  ConfirmAction,
  EmptyState,
  Field,
  Input,
  PageShell,
  PreferencesMenu,
  Section,
  SelectField,
  StatusNotice,
  useExtensionTheme,
  type ThemeSelectorLabels,
  type LanguageSelectorOption
} from "@browser-extensions/ui";
import { Download, Trash2, Upload } from "lucide-react";
import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  assertBackupFileSize,
  BackupImportError,
  createBackupFile,
  getBackupFilename,
  importBackupPayload
} from "../core/backup";
import { loadSettings, loadWatchedItems, saveSettings } from "../core/storage";
import { requestWatchedItemsMutation } from "../core/watched-items";
import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { formatDateTime, getLocale, LANGUAGE_OPTIONS, t } from "../shared/i18n";
import { getPlatformLabel, normalizePlatformSettings, SUPPORTED_PLATFORMS } from "../shared/platforms";
import type { ExtensionSettings, LanguagePreference, StoredWatchedItem, WatchedItemsByKey } from "../shared/types";
import { normalizeHttpUrl } from "../shared/url";

const ITEMS_PER_PAGE = 50;
const ALL_PLATFORMS_VALUE = "__all__";

type SortKey = "newest" | "oldest" | "title" | "platform";
type StatusTone = "danger" | "neutral" | "success";

type BackupStatus = {
  message: string;
  tone: StatusTone;
};

export function WatchedFilterOptions(): ReactElement {
  const [watchedItems, setWatchedItems] = useState<WatchedItemsByKey>({});
  const [settings, setSettings] = useState<ExtensionSettings>(() => normalizeSettings());
  const [query, setQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(ALL_PLATFORMS_VALUE);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ message: "", tone: "neutral" });
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const { setTheme, theme } = useExtensionTheme({ storageKey: "watched-filter:theme" });
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const knownPlatforms = useMemo(() => getKnownPlatforms(watchedItems), [watchedItems]);
  const filteredItems = useMemo(
    () => getFilteredItems({ items: watchedItems, query, selectedPlatform, sortKey }),
    [query, selectedPlatform, sortKey, watchedItems]
  );
  const totalItems = Object.keys(watchedItems).length;
  const pageCount = getPageCount(filteredItems.length);
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const visibleItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((option) => ({
        label: t(option.labelKey, settings.language),
        value: option.value
      })) satisfies Array<LanguageSelectorOption<LanguagePreference>>,
    [settings.language]
  );

  useEffect(() => {
    let mounted = true;

    void Promise.all([loadSettings(), loadWatchedItems()]).then(([loadedSettings, loadedItems]) => {
      if (!mounted) return;
      setSettings(normalizeSettings(loadedSettings));
      setWatchedItems(loadedItems);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = getLocale(settings.language);
    document.title = t("optionsTitle", settings.language);
  }, [settings.language]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, getPageCount(filteredItems.length)));
  }, [filteredItems.length]);

  useEffect(() => {
    if (selectedPlatform === ALL_PLATFORMS_VALUE || knownPlatforms.includes(selectedPlatform)) return;
    setSelectedPlatform(ALL_PLATFORMS_VALUE);
  }, [knownPlatforms, selectedPlatform]);

  async function updateSettings(nextSettings: ExtensionSettings): Promise<void> {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    await saveSettings(normalized);
  }

  async function updatePlatform(platformId: string, enabled: boolean): Promise<void> {
    await updateSettings({
      ...settings,
      platforms: {
        ...settings.platforms,
        [platformId]: enabled
      }
    });
  }

  async function removeItem(itemKey: string): Promise<void> {
    const result = await requestWatchedItemsMutation({ kind: "remove", key: itemKey });
    setWatchedItems(result.watchedItems);
  }

  async function clearAll(): Promise<void> {
    const result = await requestWatchedItemsMutation({ kind: "clear" });
    setWatchedItems(result.watchedItems);
  }

  async function exportJson(): Promise<void> {
    setIsBackupBusy(true);

    try {
      const backup = await createBackupFile();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getBackupFilename();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setBackupStatus({
        message: t("backupExported", settings.language, { count: backup.watchedItems.length }),
        tone: "success"
      });
    } catch (error) {
      setBackupStatus({
        message: error instanceof Error ? error.message : t("exportFailed", settings.language),
        tone: "danger"
      });
    } finally {
      setIsBackupBusy(false);
    }
  }

  async function importJson(file: File): Promise<void> {
    setIsBackupBusy(true);

    try {
      assertBackupFileSize(file.size);
      const text = await file.text();
      const result = await importBackupPayload(JSON.parse(text));
      const nextSettings = normalizeSettings(await loadSettings());
      setWatchedItems(result.watchedItems);
      setSettings(nextSettings);
      setBackupStatus({
        message: [
          t("backupImportedRead", nextSettings.language, { count: result.importedItems }),
          t("backupImportedAdded", nextSettings.language, { count: result.addedItems }),
          t("backupImportedUpdated", nextSettings.language, { count: result.updatedItems }),
          t("backupImportedUnchanged", nextSettings.language, { count: result.unchangedItems }),
          result.restoredSettings ? t("backupSettingsRestored", nextSettings.language) : ""
        ]
          .filter(Boolean)
          .join(" - "),
        tone: "success"
      });
    } catch (error) {
      setBackupStatus({
        message: getBackupImportErrorMessage(error, settings.language),
        tone: "danger"
      });
    } finally {
      if (importFileRef.current) {
        importFileRef.current.value = "";
      }
      setIsBackupBusy(false);
    }
  }

  return (
    <PageShell width="md">
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
              void updateSettings({ ...settings, language }).catch(() => undefined);
            }}
            onChangeTheme={setTheme}
          />
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={`${t("optionsSubtitle", settings.language)} · ${t(
          totalItems === 1 ? "itemCountOne" : "itemCountOther",
          settings.language,
          { count: totalItems }
        )}`}
        title={t("appName", settings.language)}
      />

      <Card className="grid grid-cols-[minmax(240px,1fr)_minmax(160px,auto)_minmax(160px,auto)] gap-2.5 p-3 max-[720px]:grid-cols-1">
        <Field label={t("searchLabel", settings.language)}>
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("searchPlaceholder", settings.language)}
            type="search"
            value={query}
          />
        </Field>

        <SelectField
          label={t("platformFilterLabel", settings.language)}
          onValueChange={(value) => {
            setSelectedPlatform(value);
            setCurrentPage(1);
          }}
          options={[
            { label: t("allPlatforms", settings.language), value: ALL_PLATFORMS_VALUE },
            ...knownPlatforms.map((platform) => ({ label: getPlatformLabel(platform), value: platform }))
          ]}
          value={selectedPlatform}
        />

        <SelectField<SortKey>
          label={t("sortLabel", settings.language)}
          onValueChange={(value) => {
            setSortKey(value);
            setCurrentPage(1);
          }}
          options={[
            { label: t("sortNewest", settings.language), value: "newest" },
            { label: t("sortOldest", settings.language), value: "oldest" },
            { label: t("sortTitle", settings.language), value: "title" },
            { label: t("sortPlatform", settings.language), value: "platform" }
          ]}
          value={sortKey}
        />
      </Card>

      <Section
        subtitle={t("platformSettingsDescription", settings.language)}
        title={t("platformSettingsTitle", settings.language)}
      >
        <Card className="grid grid-cols-2 gap-2 p-3 max-[720px]:grid-cols-1">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <CheckboxField
              checked={settings.platforms[platform.id] ?? true}
              description={t("platformEnabledDescription", settings.language)}
              key={platform.id}
              label={platform.label}
              onCheckedChange={(checked) => {
                void updatePlatform(platform.id, checked).catch(() => undefined);
              }}
            />
          ))}
        </Card>
      </Section>

      <Card className="grid gap-3 p-3">
        <div className="flex flex-wrap gap-2 max-[720px]:grid max-[720px]:grid-cols-1">
          <Button
            disabled={isBackupBusy}
            onClick={() => {
              void exportJson();
            }}
            type="button"
          >
            <Download aria-hidden="true" size={16} strokeWidth={2.35} />
            {t("exportBackup", settings.language)}
          </Button>
          <Button
            disabled={isBackupBusy}
            onClick={() => {
              importFileRef.current?.click();
            }}
            type="button"
            variant="secondary"
          >
            <Upload aria-hidden="true" size={16} strokeWidth={2.35} />
            {t("importBackup", settings.language)}
          </Button>
          <ConfirmAction
            aria-label={t("clearAll", settings.language)}
            cancelLabel={t("cancel", settings.language)}
            confirmLabel={t("clearAll", settings.language)}
            description={t("confirmClear", settings.language)}
            onConfirm={clearAll}
            onConfirmError={(error) => {
              setBackupStatus({
                message: error instanceof Error ? error.message : t("clearAllFailed", settings.language),
                tone: "danger"
              });
            }}
            title={t("clearAll", settings.language)}
            triggerSize="default"
            triggerVariant="danger"
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={2.35} />
            {t("clearAll", settings.language)}
          </ConfirmAction>
          <input
            accept="application/json,.json"
            hidden
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (file) {
                void importJson(file);
              }
            }}
            ref={importFileRef}
            type="file"
          />
        </div>
        {backupStatus.message ? (
          <StatusNotice className="min-h-5" role="status" tone={backupStatus.tone}>
            {backupStatus.message}
          </StatusNotice>
        ) : null}
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyState>{t(totalItems === 0 ? "emptyState" : "emptySearchState", settings.language)}</EmptyState>
      ) : (
        <section aria-live="polite" className="grid gap-2.5">
          {visibleItems.map((item) => (
            <WatchedItemRow
              item={item}
              key={item.key}
              language={settings.language}
              onRemove={() => {
                void removeItem(item.key).catch(() => undefined);
              }}
            />
          ))}
        </section>
      )}

      {filteredItems.length > 0 ? (
        <footer className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--extension-muted)] max-[720px]:grid">
          <span>
            {t("pageItemsSummary", settings.language, {
              page: safeCurrentPage,
              pages: pageCount,
              shown: visibleItems.length,
              total: filteredItems.length,
              from: filteredItems.length === 0 ? 0 : startIndex + 1,
              to: startIndex + visibleItems.length
            })}
          </span>
          <div className="flex gap-2 max-[720px]:grid max-[720px]:grid-cols-2">
            <Button
              disabled={safeCurrentPage <= 1}
              onClick={() => {
                setCurrentPage((page) => Math.max(1, page - 1));
              }}
              type="button"
              variant="secondary"
            >
              {t("previousPage", settings.language)}
            </Button>
            <Button
              disabled={safeCurrentPage >= pageCount}
              onClick={() => {
                setCurrentPage((page) => Math.min(pageCount, page + 1));
              }}
              type="button"
              variant="secondary"
            >
              {t("nextPage", settings.language)}
            </Button>
          </div>
        </footer>
      ) : null}
    </PageShell>
  );
}

function getBackupImportErrorMessage(error: unknown, language: LanguagePreference): string {
  if (!(error instanceof BackupImportError)) return t("importFailed", language);

  if (error.code === "file-too-large") return t("backupFileTooLarge", language);
  if (error.code === "invalid-envelope") return t("backupInvalidEnvelope", language);
  if (error.code === "unsupported-version") return t("backupUnsupportedVersion", language);
  if (error.code === "too-many-items") return t("backupTooManyItems", language);
  if (error.code === "invalid-item") return t("backupInvalidItem", language);
  return t("backupInvalidMissingItems", language);
}

function WatchedItemRow({
  item,
  language,
  onRemove
}: {
  item: StoredWatchedItem;
  language: LanguagePreference;
  onRemove: () => void;
}): ReactElement {
  const safeUrl = normalizeHttpUrl(item.url);

  return (
    <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-3.5 max-[720px]:grid-cols-1">
      <div className="grid min-w-0 gap-1">
        <strong className="truncate text-sm text-[var(--extension-text)]">{item.title}</strong>
        <span className="truncate text-xs font-medium text-[var(--extension-muted)]">
          {t("itemMeta", language, {
            platform: getPlatformLabel(item.platform),
            date: formatDateTime(item.markedAt, language),
            source: t(item.source === "auto" ? "sourceAuto" : "sourceManual", language)
          })}
        </span>
        {safeUrl ? (
          <a
            className="truncate text-xs font-medium text-[var(--extension-muted)] no-underline hover:text-[var(--extension-primary)]"
            href={safeUrl}
            rel="noreferrer"
            target="_blank"
          >
            {safeUrl}
          </a>
        ) : null}
      </div>
      <Button onClick={onRemove} type="button" variant="secondary">
        {t("remove", language)}
      </Button>
    </Card>
  );
}

function getFilteredItems({
  items,
  query,
  selectedPlatform,
  sortKey
}: {
  items: WatchedItemsByKey;
  query: string;
  selectedPlatform: string;
  sortKey: SortKey;
}): StoredWatchedItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  let filteredItems = Object.values(items);

  if (selectedPlatform !== ALL_PLATFORMS_VALUE) {
    filteredItems = filteredItems.filter((item) => item.platform === selectedPlatform);
  }

  if (normalizedQuery) {
    filteredItems = filteredItems.filter((item) =>
      [item.title, item.platform, getPlatformLabel(item.platform), item.url, item.key].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    );
  }

  return sortItems(filteredItems, sortKey);
}

function sortItems(items: StoredWatchedItem[], sortKey: SortKey): StoredWatchedItem[] {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });

  return [...items].sort((left, right) => {
    if (sortKey === "oldest") return left.markedAt.localeCompare(right.markedAt);
    if (sortKey === "title") return collator.compare(left.title, right.title);
    if (sortKey === "platform") {
      const platformCompare = collator.compare(getPlatformLabel(left.platform), getPlatformLabel(right.platform));
      return platformCompare || collator.compare(left.title, right.title);
    }
    return right.markedAt.localeCompare(left.markedAt);
  });
}

function getKnownPlatforms(watchedItems: WatchedItemsByKey): string[] {
  const platformIds = new Set(SUPPORTED_PLATFORMS.map(({ id }) => id));

  for (const item of Object.values(watchedItems)) {
    platformIds.add(item.platform);
  }

  return Array.from(platformIds).sort((left, right) => getPlatformLabel(left).localeCompare(getPlatformLabel(right)));
}

function getPageCount(totalItems: number): number {
  return Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
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
