export const NOTE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt-BR", label: "Português" },
  { code: "es", label: "Español" }
] as const;

export type NoteLanguage = (typeof NOTE_LANGUAGES)[number]["code"];

export interface NoteMessages {
  active: string;
  appTitle: string;
  archive: string;
  archivedNotes: string;
  archived: string;
  archivedEmpty: string;
  confirmDelete: string;
  copy: string;
  copied: string;
  conflictCopySaved: string;
  deleteConflict: string;
  loadFailed: string;
  saveFailed: string;
  delete: string;
  global: string;
  globalNote: string;
  language: string;
  languageSaved: string;
  moreActions: string;
  newNote: string;
  noNotes: string;
  noPageContext: string;
  noteActions: string;
  noteFilters: string;
  pin: string;
  pinnedNotes: string;
  pinned: string;
  restore: string;
  restored: string;
  saved: string;
  savedNotes: string;
  searchNotes: string;
  tagged: (siteKey: string) => string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  thisSite: string;
  unpin: string;
  unpinned: string;
  viewAll: string;
  visibleNotes: string;
  visibility: string;
}

const MESSAGES: Record<NoteLanguage, NoteMessages> = {
  en: {
    active: "Active",
    appTitle: "Quick Notes",
    archive: "Archive",
    archivedNotes: "Archived notes",
    archived: "Archived",
    archivedEmpty: "No archived notes.",
    confirmDelete: "Confirm delete",
    copy: "Copy",
    copied: "Copied",
    conflictCopySaved: "Another view changed this note. Your edit was saved as a separate note.",
    deleteConflict: "Another view changed this note, so it was not deleted.",
    loadFailed: "Could not load notes.",
    saveFailed: "Could not save changes. They will be retried before this view closes.",
    delete: "Delete",
    global: "Global",
    globalNote: "Global note",
    language: "Language",
    languageSaved: "Language saved",
    moreActions: "More actions",
    newNote: "New",
    noNotes: "No notes yet.",
    noPageContext: "No page context",
    noteActions: "Note actions",
    noteFilters: "Note filters",
    pin: "Pin",
    pinnedNotes: "Pinned",
    pinned: "Pinned",
    restore: "Restore",
    restored: "Restored",
    saved: "Saved",
    savedNotes: "Saved notes",
    searchNotes: "Search notes",
    tagged: (siteKey) => `Tagged ${siteKey}`,
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    thisSite: "This site",
    unpin: "Unpin",
    unpinned: "Unpinned",
    viewAll: "View all",
    visibleNotes: "Visible notes",
    visibility: "Visibility"
  },
  "pt-BR": {
    active: "Ativas",
    appTitle: "Quick Notes",
    archive: "Arquivar",
    archivedNotes: "Notas arquivadas",
    archived: "Arquivadas",
    archivedEmpty: "Nenhuma nota arquivada.",
    confirmDelete: "Confirmar exclusão",
    copy: "Copiar",
    copied: "Copiada",
    conflictCopySaved: "Outra tela alterou esta nota. Sua edição foi salva como uma nota separada.",
    deleteConflict: "Outra tela alterou esta nota, então ela não foi excluída.",
    loadFailed: "Não foi possível carregar as notas.",
    saveFailed: "Não foi possível salvar. Uma nova tentativa ocorrerá antes de fechar esta tela.",
    delete: "Excluir",
    global: "Global",
    globalNote: "Nota global",
    language: "Idioma",
    languageSaved: "Idioma salvo",
    moreActions: "Mais ações",
    newNote: "Nova",
    noNotes: "Nenhuma nota ainda.",
    noPageContext: "Sem contexto da página",
    noteActions: "Ações da nota",
    noteFilters: "Filtros de notas",
    pin: "Fixar",
    pinnedNotes: "Fixadas",
    pinned: "Fixada",
    restore: "Restaurar",
    restored: "Restaurada",
    saved: "Salva",
    savedNotes: "Notas salvas",
    searchNotes: "Buscar notas",
    tagged: (siteKey) => `Marcada ${siteKey}`,
    theme: "Tema",
    themeDark: "Escuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    thisSite: "Este site",
    unpin: "Desfixar",
    unpinned: "Desfixada",
    viewAll: "Ver tudo",
    visibleNotes: "Notas visíveis",
    visibility: "Visibilidade"
  },
  es: {
    active: "Activas",
    appTitle: "Quick Notes",
    archive: "Archivar",
    archivedNotes: "Notas archivadas",
    archived: "Archivadas",
    archivedEmpty: "No hay notas archivadas.",
    confirmDelete: "Confirmar eliminación",
    copy: "Copiar",
    copied: "Copiada",
    conflictCopySaved: "Otra vista cambió esta nota. Tu edición se guardó como una nota separada.",
    deleteConflict: "Otra vista cambió esta nota, por lo que no se eliminó.",
    loadFailed: "No se pudieron cargar las notas.",
    saveFailed: "No se pudieron guardar los cambios. Se reintentará antes de cerrar esta vista.",
    delete: "Eliminar",
    global: "Global",
    globalNote: "Nota global",
    language: "Idioma",
    languageSaved: "Idioma guardado",
    moreActions: "Más acciones",
    newNote: "Nueva",
    noNotes: "Todavía no hay notas.",
    noPageContext: "Sin contexto de página",
    noteActions: "Acciones de la nota",
    noteFilters: "Filtros de notas",
    pin: "Fijar",
    pinnedNotes: "Fijadas",
    pinned: "Fijada",
    restore: "Restaurar",
    restored: "Restaurada",
    saved: "Guardada",
    savedNotes: "Notas guardadas",
    searchNotes: "Buscar notas",
    tagged: (siteKey) => `Marcada ${siteKey}`,
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    thisSite: "Este sitio",
    unpin: "Desfijar",
    unpinned: "Sin fijar",
    viewAll: "Ver todo",
    visibleNotes: "Notas visibles",
    visibility: "Visibilidad"
  }
};

export function getNoteMessages(language: NoteLanguage): NoteMessages {
  return MESSAGES[language];
}

export function resolveNoteLanguage(value: string | null | undefined): NoteLanguage {
  if (value === "pt-BR" || value?.toLowerCase() === "pt-br" || value?.toLowerCase() === "pt") return "pt-BR";
  if (value === "es" || value?.toLowerCase().startsWith("es-")) return "es";
  return "en";
}
