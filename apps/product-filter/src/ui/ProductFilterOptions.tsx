import {
  AppFooter,
  AppHeader,
  AppIcon,
  Button,
  Card,
  ConfirmAction,
  Field,
  PageShell,
  PreferencesMenu,
  Section,
  SelectField,
  SettingToggle,
  StatusNotice,
  Textarea,
  useExtensionTheme,
  type ThemeSelectorLabels
} from "@browser-extensions/ui";
import { Download, Save, Trash2, Upload } from "lucide-react";
import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";

import {
  isSettingsImportFileSizeAllowed,
  loadSettings,
  normalizeSettings,
  requestSettingsMutation
} from "../core/storage";
import { getLocale, LANGUAGE_OPTIONS, resolveLanguage, t } from "../shared/i18n";
import type { LanguagePreference, ProductFilterSettings } from "../shared/types";

type ProductLanguage = Exclude<LanguagePreference, "auto">;
type PreferenceKey = keyof Pick<ProductFilterSettings, "enabled" | "language" | "mode">;
type StatusTone = "danger" | "neutral" | "success";

type OptionsStatus = {
  message: string;
  tone: StatusTone;
};

const PRODUCT_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;

export function ProductFilterOptions(): ReactElement {
  const [settings, setSettings] = useState<ProductFilterSettings>(() => normalizeSettings());
  const [termsText, setTermsText] = useState("");
  const [status, setStatus] = useState<OptionsStatus>({ message: "", tone: "neutral" });
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const dirtyPreferencesRef = useRef<Set<PreferenceKey>>(new Set());
  const loadedTermsRef = useRef<string[]>([]);
  const { setTheme, theme } = useExtensionTheme({ storageKey: "product-filter:theme" });

  const activeLanguage = resolveLanguage(settings.language) as ProductLanguage;

  useEffect(() => {
    let mounted = true;

    void loadSettings().then((loadedSettings) => {
      if (!mounted) return;
      const normalizedSettings = normalizeSettings(loadedSettings);
      loadedTermsRef.current = normalizedSettings.blockedTerms;
      setSettings(normalizedSettings);
      setTermsText(normalizedSettings.blockedTerms.join("\n"));
      setStatus({ message: t("rulesLoaded", normalizedSettings.language), tone: "success" });
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = getLocale(settings.language);
    document.title = t("optionsTitle", settings.language);
  }, [settings.language]);

  function updateDraft(patch: Partial<ProductFilterSettings>): void {
    for (const key of ["enabled", "language", "mode"] as const) {
      if (key in patch) dirtyPreferencesRef.current.add(key);
    }

    setSettings((current) =>
      normalizeSettings({
        ...current,
        ...patch
      })
    );
  }

  function getDraftSettings(): ProductFilterSettings {
    return normalizeSettings({
      ...settings,
      blockedTerms: parseTextarea(termsText)
    });
  }

  async function persistDraft(messageKey: "rulesSaved" | "jsonImported"): Promise<ProductFilterSettings> {
    const draftSettings = getDraftSettings();
    const termChanges = getRuleChanges(loadedTermsRef.current, draftSettings.blockedTerms);
    const nextSettings = await requestSettingsMutation({
      addedTerms: termChanges.added,
      kind: "save-options-draft",
      preferences: getDirtyPreferences(draftSettings, dirtyPreferencesRef.current),
      removedTerms: termChanges.removed
    });
    dirtyPreferencesRef.current.clear();
    loadedTermsRef.current = nextSettings.blockedTerms;
    setSettings(nextSettings);
    setTermsText(nextSettings.blockedTerms.join("\n"));
    setStatus({ message: t(messageKey, nextSettings.language), tone: "success" });
    return nextSettings;
  }

  function changeLanguage(language: ProductLanguage): void {
    const nextSettings = normalizeSettings({
      ...getDraftSettings(),
      language
    });

    setSettings(nextSettings);
    setStatus({ message: t("rulesSaved", nextSettings.language), tone: "success" });
    void requestSettingsMutation({ kind: "update-preferences", preferences: { language } })
      .then((savedSettings) => {
        setSettings((current) => normalizeSettings({ ...current, language: savedSettings.language }));
      })
      .catch(() => undefined);
  }

  async function resetRules(): Promise<void> {
    const nextSettings = await requestSettingsMutation({
      kind: "reset-rules",
      preferences: getDirtyPreferences(getDraftSettings(), dirtyPreferencesRef.current)
    });
    dirtyPreferencesRef.current.clear();
    loadedTermsRef.current = nextSettings.blockedTerms;
    setSettings(nextSettings);
    setTermsText("");
    setStatus({ message: t("rulesSaved", nextSettings.language), tone: "success" });
  }

  function exportSettings(): void {
    const draftSettings = getDraftSettings();
    const payload = JSON.stringify(draftSettings, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hide-unwanted-products-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ message: t("jsonExported", settings.language), tone: "success" });
  }

  async function importSettings(file: File): Promise<void> {
    if (!isSettingsImportFileSizeAllowed(file.size)) {
      setStatus({ message: t("importFileTooLarge", settings.language), tone: "danger" });
      return;
    }

    try {
      const raw = await file.text();
      const importedSettings = normalizeSettings(JSON.parse(raw) as Partial<ProductFilterSettings>);
      const nextSettings = await requestSettingsMutation({ kind: "replace-all", settings: importedSettings });
      dirtyPreferencesRef.current.clear();
      loadedTermsRef.current = nextSettings.blockedTerms;
      setSettings(nextSettings);
      setTermsText(nextSettings.blockedTerms.join("\n"));
      setStatus({ message: t("jsonImported", nextSettings.language), tone: "success" });
    } catch (_error) {
      setStatus({ message: t("invalidJson", settings.language), tone: "danger" });
    }
  }

  return (
    <PageShell width="md">
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
            onChangeLanguage={changeLanguage}
            onChangeTheme={setTheme}
          />
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={t("optionsSubtitle", settings.language)}
        title={t("appTitle", settings.language)}
      />

      {status.message ? <StatusNotice tone={status.tone}>{status.message}</StatusNotice> : null}

      <Card className="grid gap-0 overflow-hidden p-0">
        <SettingToggle
          checked={settings.enabled}
          description={t("toggleHint", settings.language)}
          label={t("toggleLabel", settings.language)}
          onCheckedChange={(enabled) => {
            updateDraft({ enabled });
          }}
        />
        <div className="border-t border-[var(--extension-border)] p-3">
          <SelectField<ProductFilterSettings["mode"]>
            label={t("modeLabel", settings.language)}
            onValueChange={(mode) => {
              updateDraft({ mode });
            }}
            options={[
              { label: t("modeHide", settings.language), value: "hide" },
              { label: t("modeDim", settings.language), value: "dim" },
              { label: t("modeOverlay", settings.language), value: "overlay" }
            ]}
            value={settings.mode}
          />
        </div>
      </Card>

      <Section title={t("globalTerms", settings.language)}>
        <Card className="p-3">
          <Field label={t("globalTerms", settings.language)}>
            <Textarea
              className="min-h-[260px]"
              onChange={(event) => {
                setTermsText(event.target.value);
              }}
              placeholder={t("globalPlaceholder", settings.language)}
              spellCheck={false}
              value={termsText}
            />
          </Field>
          <p className="mt-2 text-xs font-medium leading-snug text-[var(--extension-muted)]">
            {t("termsHint", settings.language)}
          </p>
        </Card>
      </Section>

      <Card className="flex flex-wrap gap-2 p-3 max-[720px]:grid">
        <Button
          onClick={() => {
            void persistDraft("rulesSaved");
          }}
          type="button"
        >
          <Save aria-hidden size={16} strokeWidth={2.35} />
          {t("saveRules", settings.language)}
        </Button>
        <Button onClick={exportSettings} type="button" variant="secondary">
          <Download aria-hidden size={16} strokeWidth={2.35} />
          {t("exportJson", settings.language)}
        </Button>
        <Button
          onClick={() => {
            importFileRef.current?.click();
          }}
          type="button"
          variant="secondary"
        >
          <Upload aria-hidden size={16} strokeWidth={2.35} />
          {t("importJson", settings.language)}
        </Button>
        <ConfirmAction
          aria-label={t("clearRules", settings.language)}
          cancelLabel={t("cancel", settings.language)}
          confirmLabel={t("clearRules", settings.language)}
          description={t("clearRulesConfirmDescription", settings.language)}
          onConfirm={resetRules}
          onConfirmError={(error) => {
            setStatus({
              message: error instanceof Error ? error.message : t("clearRulesFailed", settings.language),
              tone: "danger"
            });
          }}
          title={t("clearRules", settings.language)}
          triggerSize="default"
          triggerVariant="danger"
        >
          <Trash2 aria-hidden size={16} strokeWidth={2.35} />
          {t("clearRules", settings.language)}
        </ConfirmAction>
        <input
          accept="application/json,.json"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void importSettings(file);
            }
          }}
          ref={importFileRef}
          type="file"
        />
      </Card>

      <Section title={t("optionsScopeTitle", settings.language)}>
        <Card className="p-3">
          <p className="text-sm font-medium leading-relaxed text-[var(--extension-muted)]">
            {t("optionsScopeText", settings.language)}
          </p>
        </Card>
      </Section>

      <AppFooter
        privacy={t("privacyLocal", settings.language)}
        version={t("versionLabel", settings.language, {
          version: browser.runtime.getManifest().version
        })}
      />
    </PageShell>
  );
}

function parseTextarea(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getDirtyPreferences(
  settings: ProductFilterSettings,
  dirtyKeys: ReadonlySet<PreferenceKey>
): Partial<Pick<ProductFilterSettings, "enabled" | "language" | "mode">> {
  const preferences: Partial<Pick<ProductFilterSettings, "enabled" | "language" | "mode">> = {};
  for (const key of dirtyKeys) {
    Object.assign(preferences, { [key]: settings[key] });
  }
  return preferences;
}

function getRuleChanges(
  loadedTerms: readonly string[],
  draftTerms: readonly string[]
): { added: string[]; removed: string[] } {
  const loaded = new Set(loadedTerms);
  const draft = new Set(draftTerms);

  return {
    added: draftTerms.filter((term) => !loaded.has(term)),
    removed: loadedTerms.filter((term) => !draft.has(term))
  };
}

function getThemeLabels(language: LanguagePreference): ThemeSelectorLabels {
  return {
    dark: t("themeDark", language),
    light: t("themeLight", language),
    system: t("themeSystem", language)
  };
}
