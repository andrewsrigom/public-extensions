export interface SupportedPlatform {
  id: string;
  label: string;
}

export const SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  { id: "prime-video", label: "Prime Video" },
  { id: "netflix", label: "Netflix" },
  { id: "disney-plus", label: "Disney+" },
  { id: "max", label: "Max/HBO Max" },
  { id: "youtube", label: "YouTube" },
  { id: "globoplay", label: "Globoplay" },
  { id: "paramount-plus", label: "Paramount+" },
  { id: "apple-tv", label: "Apple TV" },
  { id: "crunchyroll", label: "Crunchyroll" },
  { id: "iqiyi", label: "iQIYI" }
];

export const DEFAULT_PLATFORM_SETTINGS: Record<string, boolean> = Object.fromEntries(
  SUPPORTED_PLATFORMS.map(({ id }) => [id, true])
);

export function getPlatformLabel(platform: string): string {
  return SUPPORTED_PLATFORMS.find(({ id }) => id === platform)?.label || platform;
}

export function normalizePlatformSettings(value: unknown): Record<string, boolean> {
  const stored = isRecord(value) ? value : {};

  return Object.fromEntries(
    SUPPORTED_PLATFORMS.map(({ id }) => [id, typeof stored[id] === "boolean" ? stored[id] : true])
  );
}

export function isPlatformEnabled(
  settings: { platforms?: Record<string, boolean> | undefined },
  platform: string
): boolean {
  return settings.platforms?.[platform] ?? true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
