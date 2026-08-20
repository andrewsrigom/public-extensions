export type VisualMode = "hide" | "dim" | "overlay";
export type LanguagePreference = "auto" | "pt-BR" | "en" | "es";

export interface ProductFilterSettings {
  enabled: boolean;
  mode: VisualMode;
  language: LanguagePreference;
  blockedTerms: string[];
  blockedTermsByPlatform: Record<string, string[]>;
  blockedProductIds: string[];
}

export interface ProductCandidate {
  productId: string;
  title: string;
  url?: string;
  element: HTMLElement;
  visualHost: HTMLElement;
}

export interface ProductPlatformAdapter {
  id: string;
  label: string;
  matches(url: URL): boolean;
  collectCandidates(): ProductCandidate[];
}

export interface ProductMatch {
  blocked: boolean;
  reasons: string[];
}

export interface RuntimeState {
  platformId?: string;
  platformLabel?: string;
  settings: ProductFilterSettings;
  stats: RuntimeStats;
}

export interface RuntimeStats {
  candidates: number;
  hidden: number;
  lastScanAt: string | null;
}
