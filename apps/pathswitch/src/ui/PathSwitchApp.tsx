import {
  ActionFooter,
  AppFooter,
  AppHeader,
  AppIcon,
  Button,
  Card,
  CheckboxField,
  Combobox,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSwitchItem,
  EmptyState,
  Field,
  FormScreenShell,
  Input,
  PreferencesMenu,
  PopupShell,
  Section,
  SettingToggle,
  StatusNotice,
  useExtensionTheme,
  type ThemeSelectorLabels
} from "@browser-extensions/ui";
import { ArrowLeft, ExternalLink, Globe2, Lightbulb, Link2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";

import { PATHSWITCH_LANGUAGE_OPTIONS, t } from "../pathswitch/i18n";
import {
  findRedirectCycle,
  getRedirectPreview,
  getSourcePatternExamples,
  getSourcePatternFromUrl,
  isValidSourcePattern,
  normalizeDestinationUrl
} from "../pathswitch/matcher";
import {
  createRedirectRule,
  getDefaultPathSwitchSettings,
  loadQuickTipDismissed,
  loadSettings,
  saveQuickTipDismissed,
  saveSettings
} from "../pathswitch/storage";
import type { RedirectCondition, RedirectRule, PathSwitchLanguage, PathSwitchSettings } from "../pathswitch/types";

type View = "list" | "form";

type RuleDraft = {
  condition: RedirectCondition;
  destinationUrl: string;
  enabled: boolean;
  id?: string;
  ignoreIfAtDestination: boolean;
  sourcePattern: string;
};

const EMPTY_DRAFT: RuleDraft = {
  condition: "exact-source-host",
  destinationUrl: "",
  enabled: true,
  ignoreIfAtDestination: true,
  sourcePattern: ""
};

export function PathSwitchApp(): ReactElement {
  const [settings, setSettings] = useState<PathSwitchSettings>(() => getDefaultPathSwitchSettings());
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<View>("list");
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [showQuickTip, setShowQuickTip] = useState(false);
  const sourcePrefillRequestRef = useRef(0);
  const { setTheme, theme } = useExtensionTheme({ storageKey: "pathswitch:theme" });

  const language = settings.language;

  useEffect(() => {
    let mounted = true;

    void loadSettings().then((storedSettings) => {
      if (!mounted) return;
      setSettings(storedSettings);
      setError(findRedirectCycle(storedSettings) ? t("validationCycle", storedSettings.language) : "");
      document.documentElement.lang = storedSettings.language;
      setIsReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void loadQuickTipDismissed()
      .then((dismissed) => {
        if (mounted) {
          setShowQuickTip(!dismissed);
        }
      })
      .catch(() => {
        if (mounted) {
          setShowQuickTip(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("appTitle", language);
  }, [language]);

  function commitSettings(nextSettings: PathSwitchSettings): void {
    if (!isReady) return;

    setSettings(nextSettings);
    void saveSettings(nextSettings).catch(() => undefined);
  }

  function updateSettings(patch: Partial<PathSwitchSettings>): void {
    const nextSettings = {
      ...settings,
      ...patch
    };

    if (patch.enabled === true && findRedirectCycle(nextSettings)) {
      setError(t("validationCycle", language));
      return;
    }

    setError("");
    commitSettings(nextSettings);
  }

  function openNewRule(): void {
    if (!isReady) return;

    const requestId = sourcePrefillRequestRef.current + 1;
    sourcePrefillRequestRef.current = requestId;
    setDraft(EMPTY_DRAFT);
    setError("");
    setView("form");

    void getActiveTabSourcePattern()
      .then((sourcePattern) => {
        if (!sourcePattern || sourcePrefillRequestRef.current !== requestId) return;
        setDraft((currentDraft) =>
          currentDraft.id || currentDraft.sourcePattern
            ? currentDraft
            : {
                ...currentDraft,
                sourcePattern
              }
        );
      })
      .catch(() => undefined);
  }

  function openEditRule(rule: RedirectRule): void {
    sourcePrefillRequestRef.current += 1;
    setDraft({
      condition: rule.condition,
      destinationUrl: rule.destinationUrl,
      enabled: rule.enabled,
      id: rule.id,
      ignoreIfAtDestination: rule.ignoreIfAtDestination,
      sourcePattern: rule.sourcePattern
    });
    setError("");
    setView("form");
  }

  function closeForm(): void {
    sourcePrefillRequestRef.current += 1;
    setDraft(EMPTY_DRAFT);
    setError("");
    setView("list");
  }

  function toggleRule(ruleId: string, enabled: boolean): void {
    const nextSettings = {
      ...settings,
      rules: settings.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              enabled,
              updatedAt: Date.now()
            }
          : rule
      )
    };

    if (enabled && findRedirectCycle(nextSettings)) {
      setError(t("validationCycle", language));
      return;
    }

    setError("");
    commitSettings(nextSettings);
  }

  function deleteRule(ruleId: string): void {
    setError("");
    commitSettings({
      ...settings,
      rules: settings.rules.filter((rule) => rule.id !== ruleId)
    });
  }

  function dismissQuickTip(): void {
    setShowQuickTip(false);
    void saveQuickTipDismissed(true).catch(() => undefined);
  }

  function saveRule(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isValidSourcePattern(draft.sourcePattern)) {
      setError(t("validationSource", language));
      return;
    }

    const destinationUrl = normalizeDestinationUrl(draft.destinationUrl);
    if (!destinationUrl) {
      setError(t("validationDestination", language));
      return;
    }

    let nextSettings: PathSwitchSettings;

    if (draft.id) {
      const now = Date.now();
      nextSettings = {
        ...settings,
        rules: settings.rules.map((rule) =>
          rule.id === draft.id
            ? {
                ...rule,
                condition: draft.condition,
                destinationUrl,
                enabled: draft.enabled,
                ignoreIfAtDestination: draft.ignoreIfAtDestination,
                name: "",
                sourcePattern: draft.sourcePattern.trim(),
                updatedAt: now
              }
            : rule
        )
      };
    } else {
      nextSettings = {
        ...settings,
        rules: [
          ...settings.rules,
          createRedirectRule({
            condition: draft.condition,
            destinationUrl,
            enabled: draft.enabled,
            ignoreIfAtDestination: draft.ignoreIfAtDestination,
            sourcePattern: draft.sourcePattern
          })
        ]
      };
    }

    if (findRedirectCycle(nextSettings)) {
      setError(t("validationCycle", language));
      return;
    }

    commitSettings(nextSettings);
    closeForm();
  }

  if (view === "form") {
    return (
      <RuleForm
        draft={draft}
        error={error}
        language={language}
        onCancel={closeForm}
        onChangeDraft={setDraft}
        onSubmit={saveRule}
      />
    );
  }

  return (
    <PopupShell aria-busy={!isReady} className="content-start gap-2.5 pb-6">
      <AppHeader
        actions={
          isReady ? (
            <PreferencesMenu
              aria-label="Menu"
              childrenBefore={
                <DropdownMenuSwitchItem
                  checked={settings.enabled}
                  label={settings.enabled ? t("active", language) : t("disabled", language)}
                  onCheckedChange={(enabled) => updateSettings({ enabled })}
                />
              }
              language={language}
              languageLabel={t("language", language)}
              languageOptions={PATHSWITCH_LANGUAGE_OPTIONS}
              panelClassName="w-52"
              theme={theme}
              themeLabel={t("theme", language)}
              themeLabels={getThemeLabels(language)}
              onChangeLanguage={(nextLanguage) => updateSettings({ language: nextLanguage })}
              onChangeTheme={setTheme}
            />
          ) : null
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={t("appSubtitle", language)}
        title={t("appTitle", language)}
      />

      <Section
        actions={
          <Button disabled={!isReady} onClick={openNewRule} size="sm" type="button">
            <Plus aria-hidden size={16} />
            {t("addRule", language)}
          </Button>
        }
        title={
          <span className="inline-flex items-center gap-2">
            {t("rules", language)}
            <span className="rounded-full bg-[color-mix(in_srgb,var(--extension-primary)_18%,transparent)] px-2 py-0.5 text-xs text-[var(--extension-primary)]">
              {settings.rules.length}
            </span>
          </span>
        }
      >
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}

        {settings.rules.length ? (
          <div className="grid gap-2">
            {settings.rules.map((rule) => (
              <RuleItem
                key={rule.id}
                language={language}
                onDelete={() => {
                  deleteRule(rule.id);
                }}
                onEdit={() => {
                  openEditRule(rule);
                }}
                onToggle={(enabled) => {
                  toggleRule(rule.id, enabled);
                }}
                rule={rule}
              />
            ))}
          </div>
        ) : (
          <EmptyState>{t("emptyRules", language)}</EmptyState>
        )}
      </Section>

      {isReady && showQuickTip ? <QuickTipCard language={language} onDismiss={dismissQuickTip} /> : null}

      <AppFooter
        privacy={t("privacyLocal", language)}
        version={t("versionLabel", language, { version: browser.runtime.getManifest().version })}
      />
    </PopupShell>
  );
}

function RuleForm({
  draft,
  error,
  language,
  onCancel,
  onChangeDraft,
  onSubmit
}: {
  draft: RuleDraft;
  error: string;
  language: PathSwitchLanguage;
  onCancel: () => void;
  onChangeDraft: (draft: RuleDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): ReactElement {
  const sourceExamples = useMemo(() => getSourcePatternExamples(draft.sourcePattern), [draft.sourcePattern]);
  const redirectPreview = useMemo(
    () => getRedirectPreview(draft.sourcePattern, draft.destinationUrl),
    [draft.destinationUrl, draft.sourcePattern]
  );
  const title = draft.id ? t("editRule", language) : t("newRule", language);

  function updateDraft(patch: Partial<RuleDraft>): void {
    onChangeDraft({
      ...draft,
      ...patch
    });
  }

  return (
    <PopupShell className="gap-0 p-0">
      <FormScreenShell
        footer={
          <ActionFooter>
            <Button onClick={onCancel} type="button" variant="subtle">
              {t("cancel", language)}
            </Button>
            <Button type="submit">{t("saveRule", language)}</Button>
          </ActionFooter>
        }
        header={
          <header className="grid min-h-[62px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--extension-border)] px-3.5">
            <Button aria-label="Voltar" onClick={onCancel} size="icon" type="button" variant="ghost">
              <ArrowLeft aria-hidden size={18} />
            </Button>
            <h1 className="truncate text-center text-base font-bold text-[var(--extension-text)]">{title}</h1>
            <Button aria-label="Fechar" onClick={onCancel} size="icon" type="button" variant="ghost">
              <X aria-hidden size={18} />
            </Button>
          </header>
        }
        onSubmit={onSubmit}
      >
        <Section title={t("sourceLabel", language)}>
          <Field label={t("sourceLabel", language)}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 text-[var(--extension-muted)] focus-within:border-[var(--extension-focus)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)]">
              <Globe2 aria-hidden size={17} />
              <Input
                autoComplete="off"
                className="border-0 bg-transparent focus:border-0 focus:ring-0"
                onChange={(event) => {
                  updateDraft({ sourcePattern: event.target.value });
                }}
                placeholder="amazon.com/*"
                value={draft.sourcePattern}
              />
            </div>
          </Field>
          <p className="text-xs font-medium leading-snug text-[var(--extension-muted)]">{t("sourceHint", language)}</p>
          {sourceExamples.length ? (
            <div className="rounded-[7px] bg-[var(--extension-surface-subtle)] px-2.5 py-2 text-xs font-semibold text-[var(--extension-muted-strong)]">
              {t("sourcePreview", language, { examples: sourceExamples.join(", ") })}
            </div>
          ) : null}
        </Section>

        <Section title={t("destinationLabel", language)}>
          <Field label={t("destinationLabel", language)}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 text-[var(--extension-muted)] focus-within:border-[var(--extension-focus)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)]">
              <Link2 aria-hidden size={17} />
              <Input
                autoComplete="off"
                className="border-0 bg-transparent focus:border-0 focus:ring-0"
                onChange={(event) => {
                  updateDraft({ destinationUrl: event.target.value });
                }}
                placeholder="https://www.amazon.com.br/"
                value={draft.destinationUrl}
              />
              <ExternalLink aria-hidden size={16} />
            </div>
          </Field>
          <p className="text-xs font-medium leading-snug text-[var(--extension-muted)]">
            {t("destinationHint", language)}
          </p>
          {redirectPreview ? (
            <div className="grid gap-1 rounded-[7px] bg-[var(--extension-surface-subtle)] px-2.5 py-2">
              <span className="text-[11px] font-bold uppercase tracking-normal text-[var(--extension-muted)]">
                {t("redirectPreviewTitle", language)}
              </span>
              <code className="break-all text-xs font-semibold text-[var(--extension-muted-strong)]">
                {t("redirectPreview", language, {
                  destination: redirectPreview.destinationUrl,
                  source: redirectPreview.sourcePattern
                })}
              </code>
            </div>
          ) : null}
        </Section>

        <Section title={`${t("condition", language)} (${t("optional", language)})`}>
          <Field label={t("condition", language)}>
            <Combobox<RedirectCondition>
              aria-label={t("condition", language)}
              onValueChange={(condition) => {
                updateDraft({ condition });
              }}
              options={[
                { value: "none", label: t("conditionNone", language) },
                { value: "exact-source-host", label: t("conditionExactSourceHost", language) }
              ]}
              searchPlaceholder={t("condition", language)}
              value={draft.condition}
            />
          </Field>
          <p className="text-xs font-medium leading-snug text-[var(--extension-muted)]">
            {t("exactHostDescription", language)}
          </p>
          <CheckboxField
            checked={draft.ignoreIfAtDestination}
            label={t("ignoreIfAtDestination", language)}
            onCheckedChange={(ignoreIfAtDestination) => {
              updateDraft({ ignoreIfAtDestination });
            }}
          />
        </Section>

        <Card className="p-0">
          <SettingToggle
            checked={draft.enabled}
            description={t("globalEnabledDescription", language)}
            label={t("enabled", language)}
            onCheckedChange={(enabled) => {
              updateDraft({ enabled });
            }}
          />
        </Card>

        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
      </FormScreenShell>
    </PopupShell>
  );
}

function RuleItem({
  language,
  onDelete,
  onEdit,
  onToggle,
  rule
}: {
  language: PathSwitchLanguage;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  rule: RedirectRule;
}): ReactElement {
  return (
    <Card className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 p-2.5">
      <button className="min-w-0 text-left" onClick={onEdit} type="button">
        <strong className="block truncate text-sm text-[var(--extension-text)]">{rule.sourcePattern}</strong>
        <span className="mt-0.5 block truncate text-xs font-medium text-[var(--extension-muted)]">
          → {formatDestination(rule.destinationUrl)}
        </span>
      </button>
      <CompactSwitch checked={rule.enabled} label={rule.sourcePattern} onChange={onToggle} />
      <DropdownMenu aria-label="Menu" trigger={<MoreVertical aria-hidden size={17} />}>
        <DropdownMenuItem icon={<Pencil aria-hidden size={15} />} onClick={onEdit}>
          {t("edit", language)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger icon={<Trash2 aria-hidden size={15} />} onClick={onDelete}>
          {t("delete", language)}
        </DropdownMenuItem>
      </DropdownMenu>
    </Card>
  );
}

function CompactSwitch({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <label className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center">
      <span className="sr-only">{label}</span>
      <input
        checked={checked}
        className="peer sr-only"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        type="checkbox"
      />
      <span className="h-7 w-12 rounded-full border border-[var(--extension-border-strong)] bg-[var(--extension-field)] transition-colors peer-checked:border-[var(--extension-primary)] peer-checked:bg-[var(--extension-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--extension-focus)]" />
      <span className="absolute left-1 size-5 rounded-full bg-[var(--extension-muted-strong)] transition-transform peer-checked:translate-x-5 peer-checked:bg-[var(--extension-primary-contrast)]" />
    </label>
  );
}

function QuickTipCard({ language, onDismiss }: { language: PathSwitchLanguage; onDismiss: () => void }): ReactElement {
  return (
    <Card className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 p-2.5">
      <span className="grid size-8 place-items-center rounded-[7px] bg-[var(--extension-surface-subtle)] text-[var(--extension-primary)]">
        <Lightbulb aria-hidden size={17} />
      </span>
      <div className="min-w-0">
        <strong className="block text-sm text-[var(--extension-text)]">{t("quickTipTitle", language)}</strong>
        <p className="mt-0.5 text-xs font-medium leading-snug text-[var(--extension-muted)]">
          {t("quickTipText", language)}
        </p>
      </div>
      <Button aria-label={t("dismissQuickTip", language)} onClick={onDismiss} size="icon" type="button" variant="ghost">
        <X aria-hidden size={15} />
      </Button>
    </Card>
  );
}

function formatDestination(destinationUrl: string): string {
  try {
    return new URL(destinationUrl).href;
  } catch (_error) {
    return destinationUrl;
  }
}

async function getActiveTabSourcePattern(): Promise<string> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  return getSourcePatternFromUrl(activeTab?.url ?? "");
}

function getThemeLabels(language: PathSwitchLanguage): ThemeSelectorLabels {
  return {
    dark: t("themeDark", language),
    light: t("themeLight", language),
    system: t("themeSystem", language)
  };
}
