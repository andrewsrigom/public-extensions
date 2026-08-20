export type TimeZoneLanguage = "pt-BR" | "en" | "es";

export type TimeZoneMessageKey =
  | "add"
  | "appTitle"
  | "cancel"
  | "convert"
  | "convertDate"
  | "convertSourceLabel"
  | "convertTime"
  | "convertToLocal"
  | "emptyConversion"
  | "emptyMonitors"
  | "emptyTimeZone"
  | "invalidTimeZone"
  | "languageLabel"
  | "localClock"
  | "localTimeZoneOption"
  | "localZone"
  | "monitorLabel"
  | "monitorName"
  | "monitorNamePlaceholder"
  | "monitors"
  | "removeMonitor"
  | "save"
  | "storageError"
  | "searchTimeZone"
  | "selectTimeZone"
  | "theme"
  | "themeDark"
  | "themeLight"
  | "themeSystem"
  | "unavailableTime";

const DICTIONARIES: Record<TimeZoneLanguage, Record<TimeZoneMessageKey, string>> = {
  "pt-BR": {
    add: "Adicionar",
    appTitle: "Time Zone Helper",
    cancel: "Cancelar",
    convert: "Converter",
    convertDate: "Data",
    convertSourceLabel: "Fuso da hora digitada",
    convertTime: "Hora",
    convertToLocal: "para seu fuso",
    emptyConversion: "Aguardando hora.",
    emptyMonitors: "Nenhum fuso monitorado.",
    emptyTimeZone: "Nenhum fuso horário encontrado.",
    invalidTimeZone: "Use um fuso horário válido, como America/Los_Angeles.",
    languageLabel: "Idioma",
    localClock: "Agora",
    localTimeZoneOption: "Seu fuso local",
    localZone: "Seu fuso: {timeZone}",
    monitorLabel: "Fuso horário",
    monitorName: "Nome",
    monitorNamePlaceholder: "Trabalho, cliente...",
    monitors: "Monitorados",
    removeMonitor: "Remover monitor",
    save: "Salvar",
    storageError: "Não foi possível salvar suas preferências. Mantenha o popup aberto e tente novamente.",
    searchTimeZone: "Buscar fusos horários...",
    selectTimeZone: "Escolha um fuso horário.",
    theme: "Tema",
    themeDark: "Escuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    unavailableTime: "Horário indisponível nesse fuso."
  },
  en: {
    add: "Add",
    appTitle: "Time Zone Helper",
    cancel: "Cancel",
    convert: "Convert",
    convertDate: "Date",
    convertSourceLabel: "Source time zone",
    convertTime: "Time",
    convertToLocal: "to your local time",
    emptyConversion: "Waiting for a time.",
    emptyMonitors: "No monitored time zones.",
    emptyTimeZone: "No time zone found.",
    invalidTimeZone: "Use a valid time zone, like America/Los_Angeles.",
    languageLabel: "Language",
    localClock: "Now",
    localTimeZoneOption: "Your local time zone",
    localZone: "Your time zone: {timeZone}",
    monitorLabel: "Time zone",
    monitorName: "Name",
    monitorNamePlaceholder: "Work, client...",
    monitors: "Monitored",
    removeMonitor: "Remove monitor",
    save: "Save",
    storageError: "Your preferences could not be saved. Keep the popup open and try again.",
    searchTimeZone: "Search time zones...",
    selectTimeZone: "Choose a time zone.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    unavailableTime: "This time is unavailable in that time zone."
  },
  es: {
    add: "Agregar",
    appTitle: "Time Zone Helper",
    cancel: "Cancelar",
    convert: "Convertir",
    convertDate: "Fecha",
    convertSourceLabel: "Zona horaria de la hora escrita",
    convertTime: "Hora",
    convertToLocal: "a tu horario local",
    emptyConversion: "Esperando una hora.",
    emptyMonitors: "No hay zonas horarias monitoreadas.",
    emptyTimeZone: "No se encontró ninguna zona horaria.",
    invalidTimeZone: "Usa una zona horaria válida, como America/Los_Angeles.",
    languageLabel: "Idioma",
    localClock: "Ahora",
    localTimeZoneOption: "Tu zona horaria local",
    localZone: "Tu zona horaria: {timeZone}",
    monitorLabel: "Zona horaria",
    monitorName: "Nombre",
    monitorNamePlaceholder: "Trabajo, cliente...",
    monitors: "Monitoreadas",
    removeMonitor: "Eliminar monitor",
    save: "Guardar",
    storageError: "No se pudieron guardar tus preferencias. Mantén abierto el popup e inténtalo de nuevo.",
    searchTimeZone: "Buscar zona horaria...",
    selectTimeZone: "Elige una zona horaria.",
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    unavailableTime: "Ese horario no está disponible en esa zona horaria."
  }
};

export const TIME_ZONE_LANGUAGE_OPTIONS: Array<{ value: TimeZoneLanguage; label: string }> = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt-BR", label: "PT" }
];

export function getDefaultTimeZoneLanguage(): TimeZoneLanguage {
  const locale = getBrowserLanguage().replace("_", "-").toLowerCase();
  if (locale.startsWith("pt")) return "pt-BR";
  if (locale.startsWith("es")) return "es";
  return "en";
}

export function isTimeZoneLanguage(value: unknown): value is TimeZoneLanguage {
  return value === "pt-BR" || value === "en" || value === "es";
}

export function getTimeZoneLocale(language: TimeZoneLanguage): string {
  return language === "pt-BR" ? "pt-BR" : language;
}

export function t(
  key: TimeZoneMessageKey,
  language: TimeZoneLanguage,
  replacements: Record<string, string | number> = {}
): string {
  const message = DICTIONARIES[language][key] || DICTIONARIES.en[key] || key;

  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    message
  );
}

function getBrowserLanguage(): string {
  try {
    return navigator.language || "en";
  } catch {
    return "en";
  }
}
