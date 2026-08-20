import {
  AppHeader,
  AppIcon,
  Button,
  Card,
  Combobox,
  DatePicker,
  EmptyState,
  Field,
  Input,
  PreferencesMenu,
  PopupShell,
  Section,
  StatusNotice,
  cn,
  useExtensionTheme,
  type ThemeSelectorLabels,
  type ComboboxOption
} from "@browser-extensions/ui";
import { ArrowRightLeft, CalendarClock, Clock, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getTimeZoneDisplayName,
  getTimeZoneOptionLabel,
  resolveTimeZoneAlias,
  type TimeZoneOption
} from "../timezones/catalog";
import { TIME_ZONE_LANGUAGE_OPTIONS, getTimeZoneLocale, t, type TimeZoneLanguage } from "../timezones/i18n";
import { getTimeZoneDatalistOptions } from "../timezones/select";
import {
  createMonitor,
  getFallbackSettings,
  isValidTimeZoneSetting,
  loadSettings,
  saveSettings,
  type Monitor,
  type Settings
} from "../timezones/storage";
import {
  formatClockTime,
  formatDateLabel,
  getLocalTimeZone,
  getTimeZoneAbbreviation,
  isValidDateInput,
  isValidTimeInput,
  wallTimeToInstant
} from "../timezones/time";

type ConversionState =
  | {
      message: string;
      status: "empty";
    }
  | {
      localAbbreviation: string;
      sourceTime: string;
      status: "ready";
      targetDate: string;
      targetTime: string;
    };

export function TimeZoneHelperApp() {
  const localTimeZone = useMemo(() => getLocalTimeZone(), []);
  const [settings, setSettings] = useState<Settings>(() => getFallbackSettings(localTimeZone));
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [hasStorageError, setHasStorageError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [isMonitorFormOpen, setIsMonitorFormOpen] = useState(false);
  const [monitorLabel, setMonitorLabel] = useState("");
  const [monitorTimeZone, setMonitorTimeZone] = useState("");
  const [monitorError, setMonitorError] = useState("");
  const { setTheme, theme } = useExtensionTheme({ storageKey: "time-zone-helper:theme" });

  const locale = getTimeZoneLocale(settings.language);
  const normalizedConvertTimeZone = normalizeTimeZoneInput(settings.convertTimeZone);
  const isConvertZoneValid = isValidTimeZoneSetting(normalizedConvertTimeZone);
  const conversion = getConversionState({
    localTimeZone,
    locale,
    normalizedConvertTimeZone,
    settings
  });

  const timeZoneOptions = useMemo(
    () =>
      getTimeZoneDatalistOptions([
        {
          aliases: localTimeZone,
          label: t("localTimeZoneOption", settings.language),
          timeZone: localTimeZone
        },
        ...settings.monitors.map((monitor) => ({
          aliases: monitor.timeZone,
          label: monitor.label || monitor.timeZone,
          timeZone: monitor.timeZone
        }))
      ]),
    [localTimeZone, settings.language, settings.monitors]
  );
  const timeZoneComboboxOptions = useMemo(() => timeZoneOptions.map(toTimeZoneComboboxOption), [timeZoneOptions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void loadSettings(localTimeZone)
      .then((storedSettings) => {
        if (!mounted) return;
        setSettings(storedSettings);
      })
      .finally(() => {
        if (mounted) {
          setIsSettingsLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [localTimeZone]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.title = t("appTitle", settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (!isSettingsLoaded) return undefined;

    let active = true;
    void saveSettings(settings).then(
      () => {
        if (active) setHasStorageError(false);
      },
      () => {
        if (active) setHasStorageError(true);
      }
    );

    return () => {
      active = false;
    };
  }, [isSettingsLoaded, settings]);

  function updateSettings(patch: Partial<Settings>): void {
    setSettings((current) => ({
      ...current,
      ...patch
    }));
  }

  function openMonitorForm(): void {
    setIsMonitorFormOpen(true);
    setMonitorLabel("");
    setMonitorTimeZone("");
    setMonitorError("");
  }

  function closeMonitorForm(): void {
    setIsMonitorFormOpen(false);
    setMonitorLabel("");
    setMonitorTimeZone("");
    setMonitorError("");
  }

  function addMonitor(): void {
    const timeZone = normalizeTimeZoneInput(monitorTimeZone);

    if (!isValidTimeZoneSetting(timeZone)) {
      setMonitorError(t("invalidTimeZone", settings.language));
      return;
    }

    setSettings((current) => ({
      ...current,
      monitors: [
        ...current.monitors,
        createMonitor({
          label: monitorLabel,
          timeZone
        })
      ]
    }));
    closeMonitorForm();
  }

  function removeMonitor(monitorId: string): void {
    setSettings((current) => ({
      ...current,
      monitors: current.monitors.filter((monitor) => monitor.id !== monitorId)
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
            languageOptions={TIME_ZONE_LANGUAGE_OPTIONS}
            theme={theme}
            themeLabel={t("theme", settings.language)}
            themeLabels={getThemeLabels(settings.language)}
            onChangeLanguage={(language) => {
              updateSettings({ language });
            }}
            onChangeTheme={setTheme}
          />
        }
        icon={<AppIcon src="/icons/icon-128.png" />}
        subtitle={t("localZone", settings.language, { timeZone: localTimeZone })}
        title={t("appTitle", settings.language)}
      />

      {hasStorageError ? <StatusNotice tone="danger">{t("storageError", settings.language)}</StatusNotice> : null}

      <LocalClock language={settings.language} locale={locale} now={now} timeZone={localTimeZone} />

      <Section
        actions={
          isMonitorFormOpen ? null : (
            <Button onClick={openMonitorForm} size="sm" type="button" variant="secondary">
              <Plus aria-hidden size={16} />
              {t("add", settings.language)}
            </Button>
          )
        }
        title={t("monitors", settings.language)}
      >
        {isMonitorFormOpen ? (
          <form
            className="grid gap-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              addMonitor();
            }}
          >
            <Field label={t("monitorName", settings.language)}>
              <Input
                autoComplete="off"
                onChange={(event) => {
                  setMonitorLabel(event.target.value);
                }}
                placeholder={t("monitorNamePlaceholder", settings.language)}
                value={monitorLabel}
              />
            </Field>

            <Field label={t("monitorLabel", settings.language)}>
              <Combobox
                aria-label={t("monitorLabel", settings.language)}
                emptyLabel={t("emptyTimeZone", settings.language)}
                onValueChange={(timeZone) => {
                  setMonitorTimeZone(timeZone);
                  setMonitorError("");
                }}
                options={timeZoneComboboxOptions}
                placeholder="America/Los_Angeles"
                searchPlaceholder={t("searchTimeZone", settings.language)}
                value={monitorTimeZone}
              />
            </Field>

            {monitorError ? <StatusNotice tone="danger">{monitorError}</StatusNotice> : null}

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button type="submit">{t("save", settings.language)}</Button>
              <Button onClick={closeMonitorForm} type="button" variant="ghost">
                {t("cancel", settings.language)}
              </Button>
            </div>
          </form>
        ) : null}

        {settings.monitors.length > 0 ? (
          <div aria-live="polite" className="grid gap-2">
            {settings.monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                language={settings.language}
                locale={locale}
                monitor={monitor}
                now={now}
                onRemove={removeMonitor}
              />
            ))}
          </div>
        ) : (
          <EmptyState>{t("emptyMonitors", settings.language)}</EmptyState>
        )}
      </Section>

      <Section
        subtitle={
          isConvertZoneValid
            ? `${getTimeZoneDisplayName(normalizedConvertTimeZone)} -> ${t("convertToLocal", settings.language)}`
            : t("convertToLocal", settings.language)
        }
        title={
          <span className="inline-flex items-center gap-2">
            <ArrowRightLeft aria-hidden className="text-[var(--extension-primary)]" size={18} />
            {t("convert", settings.language)}
          </span>
        }
      >
        <Field label={t("convertSourceLabel", settings.language)}>
          <Combobox
            aria-label={t("convertSourceLabel", settings.language)}
            emptyLabel={t("emptyTimeZone", settings.language)}
            onValueChange={(timeZone) => {
              updateSettings({ convertTimeZone: normalizeTimeZoneInput(timeZone) });
            }}
            options={timeZoneComboboxOptions}
            placeholder="America/New_York"
            searchPlaceholder={t("searchTimeZone", settings.language)}
            value={settings.convertTimeZone}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("convertDate", settings.language)}>
            <DatePicker
              aria-label={t("convertDate", settings.language)}
              locale={locale}
              onValueChange={(convertDate) => {
                updateSettings({ convertDate });
              }}
              placeholder={t("convertDate", settings.language)}
              value={settings.convertDate}
            />
          </Field>

          <Field label={t("convertTime", settings.language)}>
            <Input
              onChange={(event) => {
                updateSettings({ convertTime: event.target.value });
              }}
              step={60}
              type="time"
              value={settings.convertTime}
            />
          </Field>
        </div>

        {conversion.status === "ready" ? (
          <Card className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-[color-mix(in_srgb,var(--extension-primary)_28%,var(--extension-border))] bg-[color-mix(in_srgb,var(--extension-primary)_10%,var(--extension-surface))] p-3">
            <div className="row-span-3 grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--extension-primary)_22%,transparent)] text-[var(--extension-primary)]">
              <CalendarClock aria-hidden size={20} />
            </div>
            <span className="truncate text-sm font-semibold text-[var(--extension-muted)]">
              {conversion.sourceTime}
            </span>
            <ZonedTime
              abbreviation={conversion.localAbbreviation}
              className="text-[30px]"
              time={conversion.targetTime}
            />
            <span className="truncate text-xs font-semibold text-[var(--extension-muted)]">
              {conversion.targetDate}
            </span>
          </Card>
        ) : (
          <EmptyState>{conversion.message}</EmptyState>
        )}
      </Section>
    </PopupShell>
  );
}

function LocalClock({
  language,
  locale,
  now,
  timeZone
}: {
  language: TimeZoneLanguage;
  locale: string;
  now: Date;
  timeZone: string;
}) {
  return (
    <Card className="grid gap-2 p-3">
      <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--extension-muted-strong)]">
        <Clock aria-hidden className="text-[var(--extension-primary)]" size={18} />
        {t("localClock", language)}
      </span>
      <ZonedTime
        abbreviation={getTimeZoneAbbreviation(now, timeZone)}
        className="text-[30px]"
        time={formatClockTime(now, timeZone, true, locale)}
      />
      <span className="truncate text-xs font-semibold text-[var(--extension-muted)]">
        {formatDateLabel(now, timeZone, locale)}
      </span>
    </Card>
  );
}

function MonitorCard({
  language,
  locale,
  monitor,
  now,
  onRemove
}: {
  language: TimeZoneLanguage;
  locale: string;
  monitor: Monitor;
  now: Date;
  onRemove: (monitorId: string) => void;
}) {
  return (
    <Card className="grid gap-1.5 bg-[var(--extension-surface-subtle)] p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <strong className="truncate text-sm font-bold text-[var(--extension-text)]">
          {monitor.label.trim() || getTimeZoneDisplayName(monitor.timeZone)}
        </strong>
        <Button
          aria-label={t("removeMonitor", language)}
          className="-mr-1 -mt-1"
          onClick={() => {
            onRemove(monitor.id);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden size={16} />
        </Button>
      </div>
      <ZonedTime
        abbreviation={getTimeZoneAbbreviation(now, monitor.timeZone)}
        className="text-[26px]"
        time={formatClockTime(now, monitor.timeZone, true, locale)}
      />
      <span className="truncate text-xs font-semibold text-[var(--extension-muted)]">{monitor.timeZone}</span>
      <span className="truncate text-xs font-semibold text-[var(--extension-muted)]">
        {formatDateLabel(now, monitor.timeZone, locale)}
      </span>
    </Card>
  );
}

function ZonedTime({ abbreviation, className, time }: { abbreviation: string; className?: string; time: string }) {
  return (
    <strong
      className={cn(
        "min-w-0 [overflow-wrap:anywhere] font-[840] leading-none tracking-normal text-[var(--extension-text)] [font-variant-numeric:tabular-nums]",
        className
      )}
    >
      {time} <span className="text-[0.58em] font-extrabold text-[var(--extension-primary)]">{abbreviation}</span>
    </strong>
  );
}

function getConversionState({
  localTimeZone,
  locale,
  normalizedConvertTimeZone,
  settings
}: {
  localTimeZone: string;
  locale: string;
  normalizedConvertTimeZone: string;
  settings: Settings;
}): ConversionState {
  if (!isValidTimeZoneSetting(normalizedConvertTimeZone)) {
    return {
      message: t("selectTimeZone", settings.language),
      status: "empty"
    };
  }

  if (!isValidDateInput(settings.convertDate) || !isValidTimeInput(settings.convertTime)) {
    return {
      message: t("emptyConversion", settings.language),
      status: "empty"
    };
  }

  try {
    const instant = wallTimeToInstant({
      date: settings.convertDate,
      time: settings.convertTime,
      timeZone: normalizedConvertTimeZone
    });
    const sourceAbbreviation = getTimeZoneAbbreviation(instant, normalizedConvertTimeZone);
    const localAbbreviation = getTimeZoneAbbreviation(instant, localTimeZone);

    return {
      localAbbreviation,
      sourceTime: `${formatClockTime(
        instant,
        normalizedConvertTimeZone,
        false,
        locale
      )} ${sourceAbbreviation} -> ${t("convertToLocal", settings.language)}`,
      status: "ready",
      targetDate: `${formatDateLabel(instant, localTimeZone, locale)} (${localAbbreviation})`,
      targetTime: formatClockTime(instant, localTimeZone, false, locale)
    };
  } catch {
    return {
      message: t("unavailableTime", settings.language),
      status: "empty"
    };
  }
}

function toTimeZoneComboboxOption(option: TimeZoneOption): ComboboxOption<string> {
  const label = getTimeZoneOptionLabel(option);

  return {
    keywords: [option.timeZone, option.label, option.aliases, option.group],
    label,
    searchValue: `${label} ${option.timeZone} ${option.group}`,
    value: option.timeZone
  };
}

function normalizeTimeZoneInput(value: string): string {
  const trimmedValue = value.trim();
  return resolveTimeZoneAlias(trimmedValue) ?? trimmedValue;
}

function getThemeLabels(language: TimeZoneLanguage): ThemeSelectorLabels {
  return {
    dark: t("themeDark", language),
    light: t("themeLight", language),
    system: t("themeSystem", language)
  };
}
