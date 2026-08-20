export type PathSwitchLanguage = "en" | "es" | "pt-BR";

export type RedirectCondition = "none" | "exact-source-host";

export type RedirectRule = {
  condition: RedirectCondition;
  createdAt: number;
  destinationUrl: string;
  enabled: boolean;
  id: string;
  ignoreIfAtDestination: boolean;
  name: string;
  sourcePattern: string;
  updatedAt: number;
};

export type PathSwitchSettings = {
  enabled: boolean;
  language: PathSwitchLanguage;
  rules: RedirectRule[];
};

export type RedirectMatch = {
  rule: RedirectRule;
  targetUrl: string;
};
