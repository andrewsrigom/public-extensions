import type { LanguagePreference } from "./types";

type ResolvedLanguage = "pt-BR" | "en" | "es";

export type I18nKey =
  | "add"
  | "appSubtitle"
  | "appTitle"
  | "blockedSummary"
  | "emptyRules"
  | "globalPlaceholder"
  | "globalTerms"
  | "languageLabel"
  | "marketplace"
  | "modeDim"
  | "modeHide"
  | "modeLabel"
  | "modeOverlay"
  | "optionsScopeText"
  | "optionsScopeTitle"
  | "optionsSubtitle"
  | "optionsTitle"
  | "privacyLocal"
  | "reasonId"
  | "reasonPlatformTerm"
  | "reasonTerm"
  | "removeRule"
  | "sitePlaceholder"
  | "siteTerms"
  | "siteTermsWithName"
  | "statusApplied"
  | "statusConnected"
  | "statusReload"
  | "statusSavedReload"
  | "statusUnsupported"
  | "theme"
  | "themeDark"
  | "themeLight"
  | "themeSystem"
  | "toggleHint"
  | "toggleLabel"
  | "termsHint"
  | "rulesLoaded"
  | "rulesSaved"
  | "saveRules"
  | "exportJson"
  | "importJson"
  | "jsonExported"
  | "jsonImported"
  | "invalidJson"
  | "importFileTooLarge"
  | "cancel"
  | "clearRules"
  | "clearRulesConfirmDescription"
  | "clearRulesFailed"
  | "versionLabel";

const DICTIONARIES: Record<ResolvedLanguage, Record<I18nKey, string>> = {
  "pt-BR": {
    add: "Adicionar",
    appSubtitle: "Oculta produtos por termo.",
    appTitle: "Hide Products",
    blockedSummary: "Bloqueados {count}",
    emptyRules: "Nenhuma regra ainda.",
    globalPlaceholder: "vaporizador, smart tv...",
    globalTerms: "Termos globais",
    languageLabel: "Idioma",
    marketplace: "Marketplace",
    modeDim: "Deixar opaco",
    modeHide: "Ocultar card",
    modeLabel: "Modo visual",
    modeOverlay: "Overlay escuro",
    optionsScopeText:
      "Esta versao suporta Amazon Brasil e Estados Unidos, Mercado Livre, AliExpress e Temu. Novos marketplaces devem entrar por adapters especificos, mantendo seletores fora do core. Termos especificos por site sao adicionados pelo popup quando voce estiver no marketplace.",
    optionsScopeTitle: "Escopo do POC",
    optionsSubtitle: "Configure regras para ocultar cards de produtos em marketplaces suportados.",
    optionsTitle: "Hide Products - Opcoes",
    privacyLocal: "Privado e local",
    reasonId: "ID: {id}",
    reasonPlatformTerm: "Termo do site: {term}",
    reasonTerm: "Termo: {term}",
    removeRule: "Remover {rule}",
    sitePlaceholder: "corda, cosplay...",
    siteTerms: "Termos deste site",
    siteTermsWithName: "Termos só no {site}",
    statusApplied: "Regras aplicadas em {site}.",
    statusConnected: "Conectado a {site}.",
    statusReload: "Recarregue a pagina do marketplace para ativar o filtro.",
    statusSavedReload: "Configuracao salva. Recarregue a pagina para aplicar.",
    statusUnsupported:
      "Abra Amazon Brasil ou Estados Unidos, Mercado Livre, AliExpress ou Temu para aplicar as regras.",
    theme: "Tema",
    themeDark: "Escuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    toggleHint: "Aplica as regras nesta pagina.",
    toggleLabel: "Ativo",
    termsHint: "Um termo por linha. A busca ignora maiusculas e acentos.",
    rulesLoaded: "Regras carregadas.",
    rulesSaved: "Regras salvas.",
    saveRules: "Salvar regras",
    exportJson: "Exportar JSON",
    importJson: "Importar JSON",
    jsonExported: "Arquivo JSON exportado.",
    jsonImported: "JSON importado.",
    invalidJson: "JSON invalido.",
    importFileTooLarge: "O arquivo JSON excede o limite de 1 MB.",
    cancel: "Cancelar",
    clearRules: "Limpar regras",
    clearRulesConfirmDescription: "Remove todos os termos salvos e restaura as configuracoes padrao.",
    clearRulesFailed: "Nao consegui limpar as regras.",
    versionLabel: "Hide Products {version}"
  },
  en: {
    add: "Add",
    appSubtitle: "Hides products by term.",
    appTitle: "Hide Products",
    blockedSummary: "Blocked {count}",
    emptyRules: "No rules yet.",
    globalPlaceholder: "vaporizer, smart tv...",
    globalTerms: "Global terms",
    languageLabel: "Language",
    marketplace: "Marketplace",
    modeDim: "Dim",
    modeHide: "Hide card",
    modeLabel: "Visual mode",
    modeOverlay: "Dark overlay",
    optionsScopeText:
      "This version supports Amazon Brazil and US, Mercado Livre, AliExpress, and Temu. New marketplaces should be added through specific adapters, keeping selectors out of the core. Site-specific terms are added from the popup while you are on a marketplace.",
    optionsScopeTitle: "POC scope",
    optionsSubtitle: "Configure rules to hide product cards on supported marketplaces.",
    optionsTitle: "Hide Products - Options",
    privacyLocal: "Private and local",
    reasonId: "ID: {id}",
    reasonPlatformTerm: "Site term: {term}",
    reasonTerm: "Term: {term}",
    removeRule: "Remove {rule}",
    sitePlaceholder: "rope, cosplay...",
    siteTerms: "Terms for this site",
    siteTermsWithName: "{site} terms",
    statusApplied: "Rules applied on {site}.",
    statusConnected: "Connected to {site}.",
    statusReload: "Reload the marketplace page to activate the filter.",
    statusSavedReload: "Settings saved. Reload the page to apply.",
    statusUnsupported: "Open Amazon Brazil or US, Mercado Livre, AliExpress, or Temu to apply rules.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    toggleHint: "Applies rules on this page.",
    toggleLabel: "Enabled",
    termsHint: "One term per line. Matching ignores uppercase letters and accents.",
    rulesLoaded: "Rules loaded.",
    rulesSaved: "Rules saved.",
    saveRules: "Save rules",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    jsonExported: "JSON file exported.",
    jsonImported: "JSON imported.",
    invalidJson: "Invalid JSON.",
    importFileTooLarge: "The JSON file exceeds the 1 MB limit.",
    cancel: "Cancel",
    clearRules: "Clear rules",
    clearRulesConfirmDescription: "Remove every saved term and restore default settings.",
    clearRulesFailed: "Could not clear rules.",
    versionLabel: "Hide Products {version}"
  },
  es: {
    add: "Agregar",
    appSubtitle: "Oculta productos por termino.",
    appTitle: "Hide Products",
    blockedSummary: "Bloqueados {count}",
    emptyRules: "Aun no hay reglas.",
    globalPlaceholder: "vaporizador, smart tv...",
    globalTerms: "Terminos globales",
    languageLabel: "Idioma",
    marketplace: "Marketplace",
    modeDim: "Atenuar",
    modeHide: "Ocultar tarjeta",
    modeLabel: "Modo visual",
    modeOverlay: "Overlay oscuro",
    optionsScopeText:
      "Esta version soporta Amazon Brasil y Estados Unidos, Mercado Livre, AliExpress y Temu. Los nuevos marketplaces deben agregarse mediante adapters especificos, manteniendo selectores fuera del core. Los terminos especificos por sitio se agregan desde el popup mientras estas en el marketplace.",
    optionsScopeTitle: "Alcance del POC",
    optionsSubtitle: "Configura reglas para ocultar tarjetas de productos en marketplaces compatibles.",
    optionsTitle: "Hide Products - Opciones",
    privacyLocal: "Privado y local",
    reasonId: "ID: {id}",
    reasonPlatformTerm: "Termino del sitio: {term}",
    reasonTerm: "Termino: {term}",
    removeRule: "Eliminar {rule}",
    sitePlaceholder: "cuerda, cosplay...",
    siteTerms: "Terminos de este sitio",
    siteTermsWithName: "Terminos solo en {site}",
    statusApplied: "Reglas aplicadas en {site}.",
    statusConnected: "Conectado a {site}.",
    statusReload: "Recarga la pagina del marketplace para activar el filtro.",
    statusSavedReload: "Configuracion guardada. Recarga la pagina para aplicar.",
    statusUnsupported: "Abre Amazon Brasil o Estados Unidos, Mercado Livre, AliExpress o Temu para aplicar reglas.",
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    toggleHint: "Aplica las reglas en esta pagina.",
    toggleLabel: "Activo",
    termsHint: "Un termino por linea. La busqueda ignora mayusculas y acentos.",
    rulesLoaded: "Reglas cargadas.",
    rulesSaved: "Reglas guardadas.",
    saveRules: "Guardar reglas",
    exportJson: "Exportar JSON",
    importJson: "Importar JSON",
    jsonExported: "Archivo JSON exportado.",
    jsonImported: "JSON importado.",
    invalidJson: "JSON invalido.",
    importFileTooLarge: "El archivo JSON supera el limite de 1 MB.",
    cancel: "Cancelar",
    clearRules: "Limpiar reglas",
    clearRulesConfirmDescription: "Elimina todos los terminos guardados y restaura la configuracion predeterminada.",
    clearRulesFailed: "No pude limpiar las reglas.",
    versionLabel: "Hide Products {version}"
  }
};

export const LANGUAGE_OPTIONS: Array<{ value: Exclude<LanguagePreference, "auto">; label: string }> = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt-BR", label: "PT" }
];

export function resolveLanguage(preference: LanguagePreference): ResolvedLanguage {
  if (preference === "pt-BR" || preference === "en" || preference === "es") return preference;

  const locale = getBrowserLanguage().replace("_", "-").toLowerCase();
  if (locale.startsWith("pt")) return "pt-BR";
  if (locale.startsWith("es")) return "es";
  return "en";
}

export function getLocale(preference: LanguagePreference): string {
  const language = resolveLanguage(preference);
  return language === "pt-BR" ? "pt-BR" : language;
}

export function t(
  key: I18nKey,
  preference: LanguagePreference,
  replacements: Record<string, string | number> = {}
): string {
  const language = resolveLanguage(preference);
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
