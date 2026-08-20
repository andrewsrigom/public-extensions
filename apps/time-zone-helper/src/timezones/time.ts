export type WallTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const MINUTE_MS = 60_000;
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_INPUT_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const wallTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getTimeZoneAbbreviation(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short"
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName");

  return part?.value ?? timeZone;
}

export function formatClockTime(date: Date, timeZone: string, includeSeconds = false, locale = "pt-BR"): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };

  if (includeSeconds) {
    options.second = "2-digit";
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateLabel(date: Date, timeZone: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateForInput(date: Date, timeZone: string): string {
  const parts = getWallTimeParts(date, timeZone);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatTimeForInput(date: Date, timeZone: string): string {
  const parts = getWallTimeParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function isValidDateInput(value: string): boolean {
  return parseDateInput(value) !== null;
}

export function isValidTimeInput(value: string): boolean {
  return parseTimeInput(value) !== null;
}

export function wallTimeToInstant(input: { date: string; time: string; timeZone: string }): Date {
  const dateParts = parseDateInput(input.date);
  const timeParts = parseTimeInput(input.time);

  if (!dateParts || !timeParts) {
    throw new Error("Invalid date or time input.");
  }

  const desiredParts: WallTimeParts = {
    ...dateParts,
    ...timeParts
  };
  const desiredUtcMs = Date.UTC(
    desiredParts.year,
    desiredParts.month - 1,
    desiredParts.day,
    desiredParts.hour,
    desiredParts.minute,
    desiredParts.second
  );

  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(desiredUtcMs), input.timeZone);
  let instant = new Date(desiredUtcMs - offsetMinutes * MINUTE_MS);
  const correctedOffsetMinutes = getTimeZoneOffsetMinutes(instant, input.timeZone);

  if (correctedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = correctedOffsetMinutes;
    instant = new Date(desiredUtcMs - offsetMinutes * MINUTE_MS);
  }

  if (!isSameWallMinute(getWallTimeParts(instant, input.timeZone), desiredParts)) {
    throw new Error("Selected time does not exist in this time zone.");
  }

  return instant;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = getWallTimeParts(date, timeZone);
  const wallTimeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (wallTimeAsUtc - date.getTime()) / MINUTE_MS;
}

export function getWallTimeParts(date: Date, timeZone: string): WallTimeParts {
  const parts = getWallTimeFormatter(timeZone).formatToParts(date);

  return {
    year: Number(getPartValue(parts, "year")),
    month: Number(getPartValue(parts, "month")),
    day: Number(getPartValue(parts, "day")),
    hour: normalizeHour(Number(getPartValue(parts, "hour"))),
    minute: Number(getPartValue(parts, "minute")),
    second: Number(getPartValue(parts, "second"))
  };
}

function getWallTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const formatter = wallTimeFormatters.get(timeZone);

  if (formatter) {
    return formatter;
  }

  const nextFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  wallTimeFormatters.set(timeZone, nextFormatter);
  return nextFormatter;
}

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day" | "hour" | "minute" | "second"
): string {
  return parts.find((part) => part.type === type)?.value ?? "0";
}

function parseDateInput(value: string): Pick<WallTimeParts, "year" | "month" | "day"> | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function parseTimeInput(value: string): Pick<WallTimeParts, "hour" | "minute" | "second"> | null {
  const match = TIME_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  return { hour, minute, second };
}

function isSameWallMinute(left: WallTimeParts, right: WallTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function normalizeHour(hour: number): number {
  return hour === 24 ? 0 : hour;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}
