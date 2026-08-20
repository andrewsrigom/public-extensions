import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView, type Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  AppIcon,
  Button,
  DropdownMenu,
  DropdownMenuConfirmItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  SearchField,
  SegmentedControl,
  PreferencesMenu,
  useExtensionTheme,
  type ThemeSelectorLabels,
  type LanguageSelectorOption
} from "@browser-extensions/ui";
import { useCreateBlockNote } from "@blocknote/react";
import {
  Archive,
  Copy,
  MoreHorizontal,
  PanelTopOpen,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Trash2,
  type LucideIcon
} from "lucide-react";
import type { FocusEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import {
  createPageContext,
  createQuickNote,
  filterNotes,
  getNoteBlocks,
  isBlankNoteContent,
  noteBlocksToPlainText,
  setNoteArchived,
  setNotePinned,
  updateNoteBlocks,
  type NoteBlock,
  type NoteScopeFilter,
  type NoteVisibilityFilter,
  type PageContext,
  type QuickNote
} from "../notes/model";
import { requestNotes } from "../notes/storage";
import { useNotePersistence } from "../notes/use-note-persistence";
import { getNoteMessages, resolveNoteLanguage, type NoteLanguage, type NoteMessages } from "./i18n";
import { loadNoteLanguage, saveNoteLanguage, SETTINGS_STORAGE_KEY } from "./preferences";

const FILTERS = [{ value: "global" }, { value: "site" }] satisfies {
  value: NoteScopeFilter;
}[];

const VISIBILITY_FILTERS = [{ value: "active" }, { value: "archived" }] satisfies {
  value: NoteVisibilityFilter;
}[];

const NOTE_LANGUAGE_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt-BR", label: "PT" }
] satisfies ReadonlyArray<LanguageSelectorOption<NoteLanguage>>;

const blockNoteThemes = {
  dark: {
    colors: {
      editor: {
        text: "#f7f9fd",
        background: "#151e29"
      },
      menu: {
        text: "#f7f9fd",
        background: "#111922"
      },
      tooltip: {
        text: "#f7f9fd",
        background: "#111922"
      },
      hovered: {
        text: "#f7f9fd",
        background: "rgba(166, 176, 191, 0.1)"
      },
      selected: {
        text: "#f7f9fd",
        background: "rgba(166, 176, 191, 0.14)"
      },
      disabled: {
        text: "#748091",
        background: "#0f1620"
      },
      shadow: "0 14px 32px rgba(0, 0, 0, 0.28)",
      border: "#344154",
      sideMenu: "#a6b0bf"
    },
    borderRadius: 7,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  light: {
    colors: {
      editor: {
        text: "#111827",
        background: "#ffffff"
      },
      menu: {
        text: "#111827",
        background: "#ffffff"
      },
      tooltip: {
        text: "#111827",
        background: "#ffffff"
      },
      hovered: {
        text: "#111827",
        background: "rgba(31, 111, 229, 0.08)"
      },
      selected: {
        text: "#111827",
        background: "rgba(31, 111, 229, 0.12)"
      },
      disabled: {
        text: "#8793a4",
        background: "#f6f8fb"
      },
      shadow: "0 18px 50px rgba(36, 55, 83, 0.22)",
      border: "#b9c3d1",
      sideMenu: "#5f6b7d"
    },
    borderRadius: 7,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
} satisfies Record<"dark" | "light", Theme>;

interface QuickNotesAppProps {
  defaultFilter: NoteScopeFilter;
  trackActivePage: boolean;
  variant: "panel" | "page";
}

export function QuickNotesApp({ defaultFilter, trackActivePage, variant }: QuickNotesAppProps): ReactElement {
  const [context, setContext] = useState<PageContext | null>(null);
  const [scopeFilter, setScopeFilter] = useState<NoteScopeFilter>(defaultFilter);
  const [visibilityFilter, setVisibilityFilter] = useState<NoteVisibilityFilter>("active");
  const [language, setLanguage] = useState<NoteLanguage>(() => getDefaultLanguage());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const { resolvedTheme, setTheme, theme } = useExtensionTheme({ storageKey: "quick-notes:theme" });
  const messages = useMemo(() => getNoteMessages(language), [language]);
  const {
    notes,
    createDraft,
    deleteNote: deletePersistedNote,
    replaceFromStorage,
    updateNote: updatePersistedNote
  } = useNotePersistence({
    messages,
    onStatus: setStatus
  });
  useEffect(() => {
    let mounted = true;

    void Promise.all([
      requestNotes(),
      trackActivePage ? getActivePageContext() : Promise.resolve(getInitialPageContext()),
      loadNoteLanguage()
    ])
      .then(([storedNotes, pageContext, storedLanguage]) => {
        if (!mounted) return;
        replaceFromStorage(storedNotes);
        setContext(pageContext);
        if (storedLanguage) {
          setLanguage(storedLanguage);
        }
        setStatus("");
      })
      .catch(() => {
        if (mounted) setStatus(messages.loadFailed);
      });

    return () => {
      mounted = false;
    };
  }, [trackActivePage]);

  useEffect(() => {
    if (!trackActivePage) return undefined;

    const refreshContext = (): void => {
      void getActivePageContext().then(setContext);
    };
    const handleTabUpdated = (_tabId: number, changeInfo: { title?: string; url?: string }): void => {
      if (!changeInfo.url && !changeInfo.title) return;
      refreshContext();
    };

    browser.tabs.onActivated.addListener(refreshContext);
    browser.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      browser.tabs.onActivated.removeListener(refreshContext);
      browser.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [trackActivePage]);

  useEffect(() => {
    const handleStorageChanged = (changes: Record<string, unknown>, areaName: string): void => {
      if (areaName !== "sync" || !changes[SETTINGS_STORAGE_KEY]) return;

      void loadNoteLanguage()
        .then((storedLanguage) => {
          if (storedLanguage) {
            setLanguage(storedLanguage);
          }
        })
        .catch(() => {
          setStatus(messages.loadFailed);
        });
    };

    browser.storage.onChanged.addListener(handleStorageChanged);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChanged);
    };
  }, [messages.loadFailed]);

  const visibleNotes = useMemo(
    () =>
      filterNotes(notes, {
        context,
        query,
        scope: scopeFilter,
        visibility: visibilityFilter
      }),
    [context, notes, query, scopeFilter, visibilityFilter]
  );
  const pinnedNotes = visibleNotes.filter((note) => note.pinned);
  const regularNotes = visibleNotes.filter((note) => !note.pinned);

  function createNote(): void {
    const note = createQuickNote({ context });

    createDraft(note);
    setFocusedNoteId(note.id);
    setStatus(note.siteKey ? messages.tagged(note.siteKey) : messages.globalNote);
  }

  function updateBlocks(noteId: string, blocks: NoteBlock[]): void {
    updatePersistedNote(noteId, (note) => updateNoteBlocks(note, blocks), {
      successStatus: messages.saved
    });
  }

  function deleteNote(noteId: string): void {
    deletePersistedNote(noteId, {
      immediate: true,
      successStatus: messages.saved
    });
  }

  function togglePinned(noteId: string): void {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;

    const pinned = !note.pinned;
    updatePersistedNote(noteId, (currentNote) => setNotePinned(currentNote, pinned), {
      immediate: true,
      successStatus: pinned ? messages.pinned : messages.unpinned
    });
  }

  function toggleArchived(noteId: string): void {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;

    const archived = !note.archived;
    updatePersistedNote(noteId, (currentNote) => setNoteArchived(currentNote, archived), {
      immediate: true,
      successStatus: archived ? messages.archived : messages.restored
    });
  }

  function removeBlankNote(noteId: string): void {
    const note = notes.find((item) => item.id === noteId);
    if (!note || !isBlankNoteContent(note.content)) return;

    deletePersistedNote(noteId, {
      immediate: true,
      successStatus: messages.saved
    });
  }

  function copyNote(note: QuickNote): void {
    const text = noteBlocksToPlainText(getNoteBlocks(note));
    if (!text) return;

    void navigator.clipboard.writeText(text).then(() => {
      setStatus(messages.copied);
    });
  }

  function changeLanguage(nextLanguage: NoteLanguage): void {
    setLanguage(nextLanguage);
    void saveNoteLanguage(nextLanguage)
      .then(() => {
        setStatus(getNoteMessages(nextLanguage).languageSaved);
      })
      .catch(() => {
        setStatus(getNoteMessages(nextLanguage).saveFailed);
      });
  }

  function openAllNotes(): void {
    const notesUrl = new URL(browser.runtime.getURL("/notes.html"));
    if (context?.url) {
      notesUrl.searchParams.set("pageUrl", context.url);
      notesUrl.searchParams.set("pageTitle", context.title);
    }

    void browser.tabs.create({
      url: notesUrl.toString()
    });
  }

  return (
    <main className={`app app--${variant}`}>
      <header className="header">
        <div className="title-block">
          <div className="title-row">
            <AppIcon size={variant === "page" ? "page" : "panel"} src="/icons/icon-128.png" />
            <div>
              <h1>{messages.appTitle}</h1>
              <p className="page-context">{context?.displayLabel ?? messages.noPageContext}</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Button className="quick-notes-new-button" type="button" onClick={createNote}>
            <Plus aria-hidden="true" size={15} strokeWidth={2.4} />
            {messages.newNote}
          </Button>
          <AppMenu
            language={language}
            messages={messages}
            onChangeLanguage={changeLanguage}
            onChangeTheme={setTheme}
            onOpenAllNotes={variant === "panel" ? openAllNotes : undefined}
            theme={theme}
          />
        </div>
      </header>

      <section className="filters" aria-label={messages.noteFilters}>
        <SearchField
          placeholder={messages.searchNotes}
          value={query}
          wrapperClassName="quick-notes-search"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {variant === "page" ? (
          <VisibilityTabs messages={messages} selected={visibilityFilter} onSelect={setVisibilityFilter} />
        ) : null}
        <FilterTabs context={context} messages={messages} selected={scopeFilter} onSelect={setScopeFilter} />
      </section>

      <p className="status" role="status" aria-live="polite">
        {status}
      </p>

      {visibleNotes.length === 0 ? (
        <section className="empty-state">
          {visibilityFilter === "archived" ? messages.archivedEmpty : messages.noNotes}
        </section>
      ) : (
        <NotesLayout
          focusedNoteId={focusedNoteId}
          language={language}
          messages={messages}
          pinnedNotes={pinnedNotes}
          regularNotes={regularNotes}
          editorTheme={blockNoteThemes[resolvedTheme]}
          variant={variant}
          visibilityFilter={visibilityFilter}
          onBlurNote={removeBlankNote}
          onChange={updateBlocks}
          onCopy={copyNote}
          onDelete={deleteNote}
          onFocused={() => setFocusedNoteId(null)}
          onToggleArchived={toggleArchived}
          onTogglePinned={togglePinned}
        />
      )}
    </main>
  );
}

interface FilterTabsProps {
  context: PageContext | null;
  messages: NoteMessages;
  selected: NoteScopeFilter;
  onSelect: (filter: NoteScopeFilter) => void;
}

function AppMenu({
  language,
  messages,
  onChangeLanguage,
  onChangeTheme,
  onOpenAllNotes,
  theme
}: {
  language: NoteLanguage;
  messages: NoteMessages;
  onChangeLanguage: (language: NoteLanguage) => void;
  onChangeTheme: (theme: "dark" | "light" | "system") => void;
  onOpenAllNotes?: () => void;
  theme: "dark" | "light" | "system";
}): ReactElement {
  return (
    <PreferencesMenu
      aria-label={messages.moreActions}
      childrenBefore={
        onOpenAllNotes ? (
          <DropdownMenuItem
            icon={<PanelTopOpen aria-hidden="true" size={15} strokeWidth={2.3} />}
            onClick={onOpenAllNotes}
          >
            {messages.viewAll}
          </DropdownMenuItem>
        ) : null
      }
      language={language}
      languageLabel={messages.language}
      languageOptions={NOTE_LANGUAGE_OPTIONS}
      onChangeLanguage={onChangeLanguage}
      onChangeTheme={onChangeTheme}
      panelClassName="app-menu-panel"
      summaryClassName="quick-notes-settings-button"
      theme={theme}
      themeLabel={messages.theme}
      themeLabels={getThemeLabels(messages)}
    />
  );
}

function VisibilityTabs({
  messages,
  selected,
  onSelect
}: {
  messages: NoteMessages;
  selected: NoteVisibilityFilter;
  onSelect: (filter: NoteVisibilityFilter) => void;
}): ReactElement {
  return (
    <SegmentedControl
      aria-label={messages.visibility}
      className="visibility-tabs"
      onValueChange={onSelect}
      options={VISIBILITY_FILTERS.map((filter) => ({
        label: filter.value === "archived" ? messages.archived : messages.active,
        value: filter.value
      }))}
      value={selected}
    />
  );
}

function FilterTabs({ context, messages, selected, onSelect }: FilterTabsProps): ReactElement {
  return (
    <SegmentedControl
      aria-label={messages.visibleNotes}
      className="scope-tabs"
      onValueChange={onSelect}
      options={FILTERS.map((filter) => ({
        disabled: filter.value === "site" && !context?.siteKey,
        label: getScopeFilterLabel(filter.value, messages),
        value: filter.value
      }))}
      value={selected}
    />
  );
}

function getScopeFilterLabel(filter: NoteScopeFilter, messages: NoteMessages): string {
  return filter === "site" ? messages.thisSite : messages.global;
}

function NotesLayout({
  focusedNoteId,
  language,
  messages,
  pinnedNotes,
  regularNotes,
  editorTheme,
  variant,
  visibilityFilter,
  onBlurNote,
  onChange,
  onCopy,
  onDelete,
  onFocused,
  onToggleArchived,
  onTogglePinned
}: {
  focusedNoteId: string | null;
  language: NoteLanguage;
  messages: NoteMessages;
  pinnedNotes: QuickNote[];
  regularNotes: QuickNote[];
  editorTheme: Theme;
  variant: "panel" | "page";
  visibilityFilter: NoteVisibilityFilter;
  onBlurNote: (noteId: string) => void;
  onChange: (noteId: string, blocks: NoteBlock[]) => void;
  onCopy: (note: QuickNote) => void;
  onDelete: (noteId: string) => void;
  onFocused: () => void;
  onToggleArchived: (noteId: string) => void;
  onTogglePinned: (noteId: string) => void;
}): ReactElement {
  const showPinnedSection = variant === "panel" && visibilityFilter === "active" && pinnedNotes.length > 0;
  const pageNotes = [...pinnedNotes, ...regularNotes];

  if (variant === "page") {
    return (
      <section className="note-section" aria-label={messages.visibleNotes}>
        <SectionLabel label={visibilityFilter === "archived" ? messages.archivedNotes : messages.savedNotes} />
        <div className="notes">
          {pageNotes.map((note) => (
            <NoteCard
              key={note.id}
              autoFocus={focusedNoteId === note.id}
              language={language}
              messages={messages}
              note={note}
              editorTheme={editorTheme}
              variant={variant}
              onBlur={() => onBlurNote(note.id)}
              onChange={onChange}
              onCopy={() => onCopy(note)}
              onDelete={() => onDelete(note.id)}
              onFocused={onFocused}
              onToggleArchived={() => onToggleArchived(note.id)}
              onTogglePinned={() => onTogglePinned(note.id)}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="note-section" aria-label={messages.visibleNotes}>
      {showPinnedSection ? <SectionLabel icon={Pin} label={messages.pinnedNotes} /> : null}
      <div className="notes">
        {[...pinnedNotes, ...regularNotes].map((note) => (
          <NoteCard
            key={note.id}
            autoFocus={focusedNoteId === note.id}
            language={language}
            messages={messages}
            note={note}
            editorTheme={editorTheme}
            variant={variant}
            onBlur={() => onBlurNote(note.id)}
            onChange={onChange}
            onCopy={() => onCopy(note)}
            onDelete={() => onDelete(note.id)}
            onFocused={onFocused}
            onToggleArchived={() => onToggleArchived(note.id)}
            onTogglePinned={() => onTogglePinned(note.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ icon: Icon, label }: { icon?: LucideIcon; label: string }): ReactElement {
  return (
    <div className="section-label">
      {Icon ? <Icon aria-hidden="true" size={14} strokeWidth={2.4} /> : null}
      <span>{label}</span>
    </div>
  );
}

interface NoteCardProps {
  autoFocus: boolean;
  editorTheme: Theme;
  language: NoteLanguage;
  messages: NoteMessages;
  note: QuickNote;
  variant: "panel" | "page";
  onBlur: () => void;
  onChange: (noteId: string, blocks: NoteBlock[]) => void;
  onCopy: () => void;
  onDelete: () => void;
  onFocused: () => void;
  onToggleArchived: () => void;
  onTogglePinned: () => void;
}

function NoteCard({
  autoFocus,
  editorTheme,
  language,
  messages,
  note,
  variant,
  onBlur,
  onChange,
  onCopy,
  onDelete,
  onFocused,
  onToggleArchived,
  onTogglePinned
}: NoteCardProps): ReactElement {
  const initialContent = useMemo(() => getNoteBlocks(note) as unknown as PartialBlock[], [note]);
  const editor = useCreateBlockNote(
    {
      animations: false,
      initialContent
    },
    [note.id]
  );

  useEffect(() => {
    if (!autoFocus) return;

    const frameId = window.requestAnimationFrame(() => {
      try {
        const firstBlockId = editor.document[0]?.id;
        if (firstBlockId) {
          editor.setTextCursorPosition(firstBlockId, "end");
        }
        editor.focus();
      } catch (_error) {
        // BlockNote can throw if ProseMirror has not materialized an inline text position yet.
      } finally {
        onFocused();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [autoFocus, editor, onFocused]);

  function handleBlur(event: FocusEvent<HTMLElement>): void {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    onBlur();
  }

  return (
    <article className={getNoteCardClassName(note, variant)} onBlur={handleBlur}>
      <div className="note-toolbar">
        <span className="note-meta">{formatDate(note.updatedAt, language)}</span>
        <NoteActionsMenu
          messages={messages}
          note={note}
          onCopy={onCopy}
          onDelete={onDelete}
          onToggleArchived={onToggleArchived}
          onTogglePinned={onTogglePinned}
        />
      </div>
      <div className="note-editor-shell">
        <BlockNoteView
          editor={editor}
          theme={editorTheme}
          sideMenu={false}
          tableHandles={false}
          filePanel={false}
          emojiPicker={false}
          comments={false}
          onChange={() => onChange(note.id, editor.document as unknown as NoteBlock[])}
        />
      </div>
      {note.pinned ? <Pin className="pinned-marker" aria-hidden="true" size={16} strokeWidth={2.5} /> : null}
    </article>
  );
}

function NoteActionsMenu({
  messages,
  note,
  onCopy,
  onDelete,
  onToggleArchived,
  onTogglePinned
}: {
  messages: NoteMessages;
  note: QuickNote;
  onCopy: () => void;
  onDelete: () => void;
  onToggleArchived: () => void;
  onTogglePinned: () => void;
}): ReactElement {
  return (
    <DropdownMenu
      aria-label={messages.noteActions}
      className="note-actions"
      panelClassName="note-menu-panel"
      summaryClassName="icon-button"
      trigger={<MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.4} />}
    >
      <DropdownMenuItem
        aria-pressed={Boolean(note.pinned)}
        icon={
          note.pinned ? (
            <PinOff aria-hidden="true" size={15} strokeWidth={2.3} />
          ) : (
            <Pin aria-hidden="true" size={15} strokeWidth={2.3} />
          )
        }
        onClick={onTogglePinned}
      >
        {note.pinned ? messages.unpin : messages.pin}
      </DropdownMenuItem>
      <DropdownMenuItem icon={<Copy aria-hidden="true" size={15} strokeWidth={2.3} />} onClick={onCopy}>
        {messages.copy}
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={
          note.archived ? (
            <RotateCcw aria-hidden="true" size={15} strokeWidth={2.3} />
          ) : (
            <Archive aria-hidden="true" size={15} strokeWidth={2.3} />
          )
        }
        onClick={onToggleArchived}
      >
        {note.archived ? messages.restore : messages.archive}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuConfirmItem
        danger
        confirmLabel={messages.confirmDelete}
        icon={<Trash2 aria-hidden="true" size={15} strokeWidth={2.3} />}
        onConfirm={onDelete}
      >
        {messages.delete}
      </DropdownMenuConfirmItem>
    </DropdownMenu>
  );
}

async function getActivePageContext(): Promise<PageContext | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return createPageContext({ url: tab?.url, title: tab?.title });
}

function getInitialPageContext(): PageContext | null {
  const params = new URLSearchParams(window.location.search);
  return createPageContext({
    url: params.get("pageUrl") ?? undefined,
    title: params.get("pageTitle") ?? undefined
  });
}

function getNoteCardClassName(note: QuickNote, variant: "panel" | "page"): string {
  const classes = ["note-card", `note-card--${variant}`];
  if (note.pinned) classes.push("note-card--pinned");
  if (note.archived) classes.push("note-card--archived");
  return classes.join(" ");
}

function getDefaultLanguage(): NoteLanguage {
  return resolveNoteLanguage(typeof navigator === "undefined" ? undefined : navigator.language);
}

function formatDate(value: string, language: NoteLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getThemeLabels(messages: NoteMessages): ThemeSelectorLabels {
  return {
    dark: messages.themeDark,
    light: messages.themeLight,
    system: messages.themeSystem
  };
}
