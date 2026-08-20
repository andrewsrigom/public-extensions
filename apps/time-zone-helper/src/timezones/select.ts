import { TIME_ZONE_OPTIONS, getTimeZoneOptionLabel, type TimeZoneGroup, type TimeZoneOption } from "./catalog";
import { isSupportedTimeZone } from "./time";

export type AdditionalTimeZoneOption = {
  timeZone: string;
  label?: string;
  aliases?: string;
  group?: TimeZoneGroup;
};

export type PopulateTimeZoneSelectOptions = {
  selectedTimeZone?: string;
  additionalTimeZones?: readonly AdditionalTimeZoneOption[];
};

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const GROUP_ORDER = ["America", "Universal", "Europa", "Asia", "Pacifico", "Outros"] satisfies TimeZoneGroup[];

export function populateTimeZoneSelect(select: HTMLSelectElement, options: PopulateTimeZoneSelectOptions = {}): void {
  const timeZoneOptions = getTimeZoneSelectOptions(options.additionalTimeZones);
  const groups = groupTimeZoneOptions(timeZoneOptions);
  const nodes = GROUP_ORDER.flatMap((group) => {
    const groupOptions = groups.get(group);
    if (!groupOptions?.length) return [];

    const optgroup = document.createElement("optgroup");
    optgroup.label = group;
    optgroup.replaceChildren(...groupOptions.map(createOption));
    return [optgroup];
  });

  select.replaceChildren(...nodes);

  if (options.selectedTimeZone && timeZoneOptions.some((item) => item.timeZone === options.selectedTimeZone)) {
    select.value = options.selectedTimeZone;
  }
}

export function getTimeZoneSelectOptions(
  additionalTimeZones: readonly AdditionalTimeZoneOption[] = []
): TimeZoneOption[] {
  const knownTimeZones = new Set(TIME_ZONE_OPTIONS.map((option) => option.timeZone));
  const customOptions = additionalTimeZones.flatMap((option) => {
    if (knownTimeZones.has(option.timeZone) || !isSupportedTimeZone(option.timeZone)) {
      return [];
    }

    knownTimeZones.add(option.timeZone);

    return [
      {
        timeZone: option.timeZone,
        label: option.label ?? option.timeZone,
        aliases: option.aliases ?? option.timeZone,
        group: option.group ?? "Outros"
      } satisfies TimeZoneOption
    ];
  });

  return [...TIME_ZONE_OPTIONS, ...customOptions];
}

export function populateTimeZoneDatalist(
  datalist: HTMLDataListElement,
  options: Omit<PopulateTimeZoneSelectOptions, "selectedTimeZone"> = {}
): void {
  datalist.replaceChildren(...getTimeZoneDatalistOptions(options.additionalTimeZones).map(createDatalistOption));
}

export function getTimeZoneDatalistOptions(
  additionalTimeZones: readonly AdditionalTimeZoneOption[] = []
): TimeZoneOption[] {
  const knownTimeZones = new Set<string>();
  const options: TimeZoneOption[] = [];

  for (const option of getTimeZoneSelectOptions(additionalTimeZones)) {
    addOption(options, knownTimeZones, option);
  }

  for (const timeZone of getSupportedTimeZoneIds()) {
    addOption(options, knownTimeZones, {
      timeZone,
      label: timeZone,
      aliases: timeZone,
      group: "Outros"
    });
  }

  return options;
}

function createOption(timeZoneOption: TimeZoneOption): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = timeZoneOption.timeZone;
  option.textContent = getTimeZoneOptionLabel(timeZoneOption);
  return option;
}

function createDatalistOption(timeZoneOption: TimeZoneOption): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = timeZoneOption.timeZone;
  option.label = getTimeZoneOptionLabel(timeZoneOption);
  return option;
}

function addOption(options: TimeZoneOption[], knownTimeZones: Set<string>, option: TimeZoneOption): void {
  if (knownTimeZones.has(option.timeZone)) {
    return;
  }

  knownTimeZones.add(option.timeZone);
  options.push(option);
}

function getSupportedTimeZoneIds(): string[] {
  const supportedValuesOf = (Intl as IntlWithSupportedValues).supportedValuesOf;

  if (!supportedValuesOf) {
    return [];
  }

  return supportedValuesOf("timeZone")
    .filter(isSupportedTimeZone)
    .sort((left, right) => left.localeCompare(right));
}

function groupTimeZoneOptions(options: readonly TimeZoneOption[]): Map<TimeZoneGroup, TimeZoneOption[]> {
  const groups = new Map<TimeZoneGroup, TimeZoneOption[]>();

  for (const option of options) {
    const group = groups.get(option.group) ?? [];
    group.push(option);
    groups.set(option.group, group);
  }

  return groups;
}
