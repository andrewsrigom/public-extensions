export type TimeZoneGroup = "America" | "Europa" | "Asia" | "Pacifico" | "Universal" | "Outros";

export type TimeZoneOption = {
  timeZone: string;
  label: string;
  aliases: string;
  group: TimeZoneGroup;
};

export const DEFAULT_MONITOR_TIME_ZONE = "America/Los_Angeles";

export const TIME_ZONE_OPTIONS = [
  {
    timeZone: "America/Los_Angeles",
    label: "Pacific Time",
    aliases: "PST/PDT",
    group: "America"
  },
  {
    timeZone: "America/New_York",
    label: "Eastern Time",
    aliases: "EST/EDT",
    group: "America"
  },
  {
    timeZone: "America/Chicago",
    label: "Central Time",
    aliases: "CST/CDT",
    group: "America"
  },
  {
    timeZone: "America/Denver",
    label: "Mountain Time",
    aliases: "MST/MDT",
    group: "America"
  },
  {
    timeZone: "America/Phoenix",
    label: "Arizona",
    aliases: "MST",
    group: "America"
  },
  {
    timeZone: "America/Sao_Paulo",
    label: "Brasilia",
    aliases: "BRT",
    group: "America"
  },
  {
    timeZone: "America/Mexico_City",
    label: "Mexico City",
    aliases: "CST/CDT",
    group: "America"
  },
  {
    timeZone: "UTC",
    label: "UTC",
    aliases: "UTC",
    group: "Universal"
  },
  {
    timeZone: "Europe/London",
    label: "London",
    aliases: "GMT/BST",
    group: "Europa"
  },
  {
    timeZone: "Europe/Lisbon",
    label: "Lisbon",
    aliases: "WET/WEST",
    group: "Europa"
  },
  {
    timeZone: "Europe/Berlin",
    label: "Central Europe",
    aliases: "CET/CEST",
    group: "Europa"
  },
  {
    timeZone: "Europe/Paris",
    label: "Paris",
    aliases: "CET/CEST",
    group: "Europa"
  },
  {
    timeZone: "Europe/Madrid",
    label: "Madrid",
    aliases: "CET/CEST",
    group: "Europa"
  },
  {
    timeZone: "Asia/Dubai",
    label: "Dubai",
    aliases: "GST",
    group: "Asia"
  },
  {
    timeZone: "Asia/Kolkata",
    label: "India",
    aliases: "IST",
    group: "Asia"
  },
  {
    timeZone: "Asia/Singapore",
    label: "Singapore",
    aliases: "SGT",
    group: "Asia"
  },
  {
    timeZone: "Asia/Shanghai",
    label: "China",
    aliases: "CST",
    group: "Asia"
  },
  {
    timeZone: "Asia/Tokyo",
    label: "Japan",
    aliases: "JST",
    group: "Asia"
  },
  {
    timeZone: "Australia/Sydney",
    label: "Sydney",
    aliases: "AEST/AEDT",
    group: "Pacifico"
  },
  {
    timeZone: "Pacific/Auckland",
    label: "Auckland",
    aliases: "NZST/NZDT",
    group: "Pacifico"
  }
] satisfies TimeZoneOption[];

export function findTimeZoneOption(timeZone: string): TimeZoneOption | undefined {
  return TIME_ZONE_OPTIONS.find((item) => item.timeZone === timeZone);
}

export function getTimeZoneOptionLabel(option: TimeZoneOption): string {
  return `${option.label} (${option.aliases})`;
}

export function getTimeZoneDisplayName(timeZone: string): string {
  const option = findTimeZoneOption(timeZone);
  return option ? getTimeZoneOptionLabel(option) : timeZone;
}

export function resolveTimeZoneAlias(value: string): string | null {
  const normalizedValue = normalizeAlias(value);
  if (!normalizedValue) return null;

  for (const option of TIME_ZONE_OPTIONS) {
    const aliases = [option.timeZone, option.label, option.aliases, ...option.aliases.split("/")];

    if (aliases.some((alias) => normalizeAlias(alias) === normalizedValue)) {
      return option.timeZone;
    }
  }

  return null;
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}
