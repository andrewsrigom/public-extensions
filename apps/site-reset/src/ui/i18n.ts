export type SiteResetLanguage = "en" | "pt-BR" | "es";

export type SiteResetMessages = {
  appSubtitle: string;
  appTitle: string;
  cache: string;
  cacheDescription: string;
  cancel: string;
  cleanSelected: string;
  cleanSelectedConfirmDescription: (selectedTypes: string) => string;
  cleaning: string;
  cleanupFailed: string;
  cookies: string;
  cookiesDescription: string;
  currentSite: string;
  done: string;
  language: string;
  localStorage: string;
  localStorageDescription: string;
  moreActions: string;
  noSite: string;
  offlineData: string;
  offlineDataDescription: string;
  permissions: string;
  permissionsDescription: string;
  privacy: string;
  siteChanged: string;
  selectAll: string;
  siteSettings: string;
  siteSettingsDescription: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  unavailable: string;
  versionLabel: (version: string) => string;
  whatToClear: string;
};

export const SITE_RESET_LANGUAGE_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt-BR", label: "PT" }
] satisfies ReadonlyArray<{ label: string; value: SiteResetLanguage }>;

const MESSAGES: Record<SiteResetLanguage, SiteResetMessages> = {
  en: {
    appSubtitle: "Reset this website safely",
    appTitle: "Site Reset",
    cache: "Browser cache",
    cacheDescription: "Remove browser-cached files for this site",
    cancel: "Cancel",
    cleanSelected: "Clear selected data",
    cleanSelectedConfirmDescription: (selectedTypes) =>
      "Clear " + selectedTypes + " for this site? This cannot be undone.",
    cleaning: "Cleaning...",
    cleanupFailed: "Some selected data could not be cleared. No success was reported.",
    cookies: "Cookies",
    cookiesDescription: "Remove site cookies and cookie-based sessions",
    currentSite: "Current site",
    done: "Selected data was cleared.",
    language: "Language",
    localStorage: "localStorage & sessionStorage",
    localStorageDescription: "Delete localStorage for this site and sessionStorage for this tab",
    moreActions: "More actions",
    noSite: "Open an http or https website to reset its data.",
    offlineData: "Cache Storage, IndexedDB & service workers",
    offlineDataDescription: "Delete offline caches, databases, and service worker registrations",
    permissions: "Permissions",
    permissionsDescription: "Reset notifications and site permissions",
    privacy: "No data leaves your browser",
    siteChanged: "The tab changed websites. Review the current site and confirm again.",
    selectAll: "Select all",
    siteSettings: "Site settings",
    siteSettingsDescription: "Reset site-specific browser settings",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    unavailable: "Not available safely yet",
    versionLabel: (version) => `Site Reset ${version}`,
    whatToClear: "Choose what to clear"
  },
  "pt-BR": {
    appSubtitle: "Redefina este site com segurança",
    appTitle: "Site Reset",
    cache: "Cache do navegador",
    cacheDescription: "Remove arquivos armazenados no cache do navegador para este site",
    cancel: "Cancelar",
    cleanSelected: "Limpar dados selecionados",
    cleanSelectedConfirmDescription: (selectedTypes) =>
      "Limpar " + selectedTypes + " deste site? Esta ação não pode ser desfeita.",
    cleaning: "Limpando...",
    cleanupFailed: "Não foi possível limpar todos os dados selecionados. Nenhum sucesso foi informado.",
    cookies: "Cookies",
    cookiesDescription: "Remove cookies do site e sessões baseadas em cookies",
    currentSite: "Site atual",
    done: "Os dados selecionados foram limpos.",
    language: "Idioma",
    localStorage: "localStorage e sessionStorage",
    localStorageDescription: "Exclui localStorage deste site e sessionStorage desta aba",
    moreActions: "Mais ações",
    noSite: "Abra um site http ou https para redefinir seus dados.",
    offlineData: "Cache Storage, IndexedDB e service workers",
    offlineDataDescription: "Exclui caches offline, bancos de dados e registros de service workers",
    permissions: "Permissões",
    permissionsDescription: "Redefine notificações e permissões do site",
    privacy: "Nenhum dado sai do seu navegador",
    siteChanged: "A aba mudou de site. Revise o site atual e confirme novamente.",
    selectAll: "Selecionar tudo",
    siteSettings: "Configurações do site",
    siteSettingsDescription: "Redefine configurações específicas do navegador",
    theme: "Tema",
    themeDark: "Escuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    unavailable: "Ainda indisponível com segurança",
    versionLabel: (version) => `Site Reset ${version}`,
    whatToClear: "Escolha o que limpar"
  },
  es: {
    appSubtitle: "Restablece este sitio de forma segura",
    appTitle: "Site Reset",
    cache: "Caché del navegador",
    cacheDescription: "Elimina archivos guardados en la caché del navegador para este sitio",
    cancel: "Cancelar",
    cleanSelected: "Borrar datos seleccionados",
    cleanSelectedConfirmDescription: (selectedTypes) =>
      "¿Borrar " + selectedTypes + " de este sitio? Esta acción no se puede deshacer.",
    cleaning: "Limpiando...",
    cleanupFailed:
      "No se pudieron borrar todos los datos seleccionados. No se informó que la operación terminó correctamente.",
    cookies: "Cookies",
    cookiesDescription: "Elimina cookies del sitio y sesiones basadas en cookies",
    currentSite: "Sitio actual",
    done: "Los datos seleccionados se limpiaron.",
    language: "Idioma",
    localStorage: "localStorage y sessionStorage",
    localStorageDescription: "Elimina localStorage de este sitio y sessionStorage de esta pestaña",
    moreActions: "Más acciones",
    noSite: "Abre un sitio http o https para restablecer sus datos.",
    offlineData: "Cache Storage, IndexedDB y service workers",
    offlineDataDescription: "Elimina cachés sin conexión, bases de datos y registros de service workers",
    permissions: "Permisos",
    permissionsDescription: "Restablece notificaciones y permisos del sitio",
    privacy: "Ningún dato sale de tu navegador",
    siteChanged: "La pestaña cambió de sitio. Revisa el sitio actual y confirma de nuevo.",
    selectAll: "Seleccionar todo",
    siteSettings: "Configuración del sitio",
    siteSettingsDescription: "Restablece configuración específica del navegador",
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    unavailable: "Aún no disponible de forma segura",
    versionLabel: (version) => `Site Reset ${version}`,
    whatToClear: "Elige qué limpiar"
  }
};

export function getSiteResetMessages(language: SiteResetLanguage): SiteResetMessages {
  return MESSAGES[language];
}

export function formatSiteResetDataTypes(dataTypes: readonly string[], language: SiteResetLanguage): string {
  return new Intl.ListFormat(language, {
    style: "long",
    type: "conjunction"
  }).format([...dataTypes]);
}

export function getDefaultSiteResetLanguage(): SiteResetLanguage {
  const language = typeof navigator === "undefined" ? undefined : navigator.language;

  if (language === "pt-BR" || language?.toLowerCase() === "pt-br" || language?.toLowerCase() === "pt") return "pt-BR";
  if (language === "es" || language?.toLowerCase().startsWith("es-")) return "es";
  return "en";
}
