import type { PathSwitchLanguage } from "./types";

export type PathSwitchMessageKey =
  | "active"
  | "addRule"
  | "appSubtitle"
  | "appTitle"
  | "cancel"
  | "condition"
  | "conditionExactSourceHost"
  | "conditionNone"
  | "delete"
  | "destinationHint"
  | "destinationLabel"
  | "disabled"
  | "dismissQuickTip"
  | "edit"
  | "editRule"
  | "enabled"
  | "emptyRules"
  | "exactHostDescription"
  | "globalEnabledDescription"
  | "globalEnabledTitle"
  | "ignoreIfAtDestination"
  | "language"
  | "newRule"
  | "optional"
  | "paused"
  | "privacyLocal"
  | "quickTipText"
  | "quickTipTitle"
  | "rules"
  | "saveRule"
  | "sourceHint"
  | "sourceLabel"
  | "sourcePreview"
  | "theme"
  | "themeDark"
  | "themeLight"
  | "themeSystem"
  | "validationCycle"
  | "validationDestination"
  | "validationSource"
  | "versionLabel";

const DICTIONARIES: Record<PathSwitchLanguage, Record<PathSwitchMessageKey, string>> = {
  en: {
    active: "Active",
    addRule: "New Rule",
    appSubtitle: "Sites, your way.",
    appTitle: "PathSwitch",
    cancel: "Cancel",
    condition: "Condition",
    conditionExactSourceHost: "Only exact source host",
    conditionNone: "Any matching URL",
    delete: "Delete",
    destinationHint: "Use a full URL like https://www.amazon.com.br/",
    destinationLabel: "Destination URL",
    disabled: "Disabled",
    dismissQuickTip: "Dismiss quick tip",
    edit: "Edit",
    editRule: "Edit Rule",
    enabled: "Enabled",
    emptyRules: "No redirect rules yet.",
    exactHostDescription: "Avoid redirecting unexpected subdomains.",
    globalEnabledDescription: "Redirect matching pages automatically.",
    globalEnabledTitle: "Navigate your way",
    ignoreIfAtDestination: "Ignore if already at the destination",
    language: "Language",
    newRule: "New Rule",
    optional: "optional",
    paused: "Paused",
    privacyLocal: "Private and local",
    quickTipText: "Use * to match any path, for example amazon.com/*.",
    quickTipTitle: "Quick tip",
    rules: "Rules",
    saveRule: "Save Rule",
    sourceHint: "Use * to match any path. Example: amazon.com/*",
    sourceLabel: "Source URL",
    sourcePreview: "Matches {examples}.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    validationCycle: "These enabled rules create a redirect loop. Change a source or destination before saving.",
    validationDestination: "Enter a valid destination URL.",
    validationSource: "Enter a source pattern.",
    versionLabel: "PathSwitch {version}"
  },
  es: {
    active: "Activo",
    addRule: "Nueva regla",
    appSubtitle: "Sitios a tu manera.",
    appTitle: "PathSwitch",
    cancel: "Cancelar",
    condition: "Condicion",
    conditionExactSourceHost: "Solo dominio de origen exacto",
    conditionNone: "Cualquier URL compatible",
    delete: "Eliminar",
    destinationHint: "Usa una URL completa como https://www.amazon.com.br/",
    destinationLabel: "URL de destino",
    disabled: "Desactivado",
    dismissQuickTip: "Ocultar consejo rapido",
    edit: "Editar",
    editRule: "Editar regla",
    enabled: "Activo",
    emptyRules: "Aun no hay reglas de redireccion.",
    exactHostDescription: "Evita redireccionar subdominios inesperados.",
    globalEnabledDescription: "Redirecciona paginas compatibles automaticamente.",
    globalEnabledTitle: "Navega a tu manera",
    ignoreIfAtDestination: "Ignorar si ya esta en el destino",
    language: "Idioma",
    newRule: "Nueva regla",
    optional: "opcional",
    paused: "Pausado",
    privacyLocal: "Privado y local",
    quickTipText: "Usa * para combinar cualquier ruta, por ejemplo amazon.com/*.",
    quickTipTitle: "Consejo rapido",
    rules: "Reglas",
    saveRule: "Guardar regla",
    sourceHint: "Usa * para combinar cualquier ruta. Ejemplo: amazon.com/*",
    sourceLabel: "URL de origen",
    sourcePreview: "Coincide con {examples}.",
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    validationCycle: "Estas reglas activas crean un bucle de redireccion. Cambia un origen o destino antes de guardar.",
    validationDestination: "Ingresa una URL de destino valida.",
    validationSource: "Ingresa un patron de origen.",
    versionLabel: "PathSwitch {version}"
  },
  "pt-BR": {
    active: "Ativo",
    addRule: "Nova regra",
    appSubtitle: "Sites do seu jeito.",
    appTitle: "PathSwitch",
    cancel: "Cancelar",
    condition: "Condicao",
    conditionExactSourceHost: "Somente dominio de origem exato",
    conditionNone: "Qualquer URL correspondente",
    delete: "Excluir",
    destinationHint: "Use uma URL completa como https://www.amazon.com.br/",
    destinationLabel: "URL de destino",
    disabled: "Desativado",
    dismissQuickTip: "Ocultar dica rapida",
    edit: "Editar",
    editRule: "Editar regra",
    enabled: "Ativo",
    emptyRules: "Nenhuma regra de redirecionamento ainda.",
    exactHostDescription: "Evita redirecionar subdominios inesperados.",
    globalEnabledDescription: "Redirecione paginas correspondentes automaticamente.",
    globalEnabledTitle: "Navegue do seu jeito",
    ignoreIfAtDestination: "Ignorar se ja estiver no destino",
    language: "Idioma",
    newRule: "Nova Regra",
    optional: "opcional",
    paused: "Pausado",
    privacyLocal: "Privado e local",
    quickTipText: "Use * para combinar qualquer caminho, por exemplo amazon.com/*.",
    quickTipTitle: "Dica rapida",
    rules: "Regras",
    saveRule: "Salvar Regra",
    sourceHint: "Use * para combinar qualquer caminho. Exemplo: amazon.com/*",
    sourceLabel: "URL de origem",
    sourcePreview: "Corresponde a {examples}.",
    theme: "Tema",
    themeDark: "Escuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    validationCycle:
      "Estas regras ativas criam um loop de redirecionamento. Altere uma origem ou destino antes de salvar.",
    validationDestination: "Informe uma URL de destino valida.",
    validationSource: "Informe um padrao de origem.",
    versionLabel: "PathSwitch {version}"
  }
};

export const PATHSWITCH_LANGUAGE_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt-BR", label: "PT" }
] satisfies ReadonlyArray<{ value: PathSwitchLanguage; label: string }>;

export function getDefaultPathSwitchLanguage(): PathSwitchLanguage {
  const locale = getBrowserLanguage().replace("_", "-").toLowerCase();
  if (locale.startsWith("pt")) return "pt-BR";
  if (locale.startsWith("es")) return "es";
  return "en";
}

export function t(
  key: PathSwitchMessageKey,
  language: PathSwitchLanguage,
  replacements: Record<string, string | number> = {}
): string {
  const message = DICTIONARIES[language][key] || DICTIONARIES.en[key] || key;

  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    message
  );
}

function getBrowserLanguage(): string {
  const maybeChrome = (globalThis as { chrome?: { i18n?: { getUILanguage?: () => string } } }).chrome;

  try {
    return maybeChrome?.i18n?.getUILanguage?.() || navigator.language || "en";
  } catch (_error) {
    return navigator.language || "en";
  }
}
