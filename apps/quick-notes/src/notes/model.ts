export type NoteScope = "global" | "site";

export type NoteScopeFilter = "all" | "site";

export type NoteVisibilityFilter = "active" | "archived";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type NoteBlock = Record<string, JsonValue>;

export interface PageContext {
  url: string;
  title: string;
  siteKey: string | null;
  displayLabel: string;
}

export interface QuickNote {
  id: string;
  content: string;
  blocks?: NoteBlock[];
  scope: NoteScope;
  pinned?: boolean;
  archived?: boolean;
  siteKey?: string;
  revision?: number;
  pageTitle?: string;
  pageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  content?: string;
  scope: NoteScope;
  context: PageContext | null;
  now?: Date;
}

export interface NoteFilterInput {
  context: PageContext | null;
  query?: string;
  scope: NoteScopeFilter;
  visibility?: NoteVisibilityFilter;
}

export function createQuickNote(input: CreateNoteInput): QuickNote {
  const now = (input.now ?? new Date()).toISOString();
  const context = input.context;
  const scope = input.scope === "site" && context?.siteKey ? "site" : "global";
  const blocks = legacyContentToBlocks(input.content ?? "");

  return {
    id: createNoteId(),
    content: noteBlocksToPlainText(blocks),
    blocks,
    scope,
    siteKey: scope === "site" ? (context?.siteKey ?? undefined) : undefined,
    pageTitle: context?.title || undefined,
    pageUrl: context?.url || undefined,
    revision: 0,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function getSiteKeyFromUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname) return null;
    return normalizeHostname(url.hostname);
  } catch {
    return null;
  }
}

export function createPageContext(input: { url?: string; title?: string }): PageContext | null {
  const url = input.url ?? "";
  const siteKey = getSiteKeyFromUrl(url);

  if (!url) return null;

  return {
    url,
    title: input.title?.trim() ?? "",
    siteKey,
    displayLabel: siteKey ?? "Current browser page"
  };
}

export function filterNotes(notes: readonly QuickNote[], input: NoteFilterInput): QuickNote[] {
  const normalizedQuery = normalizeSearchText(input.query ?? "");
  const visibility = input.visibility ?? "active";

  return notes
    .filter((note) => matchesVisibility(note, visibility))
    .filter((note) => matchesScope(note, input.scope, input.context))
    .filter((note) => {
      if (!normalizedQuery) return true;
      return getSearchValues(note).some((value) => normalizeSearchText(value).includes(normalizedQuery));
    })
    .sort(compareNotes);
}

export function removeEmptyNotes(notes: readonly QuickNote[]): QuickNote[] {
  return notes.filter((note) => !isBlankNoteContent(note.content));
}

export function updateNoteContent(note: QuickNote, content: string, now = new Date()): QuickNote {
  const blocks = legacyContentToBlocks(content);

  return {
    ...note,
    blocks,
    content: noteBlocksToPlainText(blocks),
    updatedAt: now.toISOString()
  };
}

export function updateNoteBlocks(note: QuickNote, blocks: readonly NoteBlock[], now = new Date()): QuickNote {
  const normalizedBlocks = normalizeNoteBlocks(blocks);

  return {
    ...note,
    blocks: normalizedBlocks,
    content: noteBlocksToPlainText(normalizedBlocks),
    updatedAt: now.toISOString()
  };
}

export function setNotePinned(note: QuickNote, pinned: boolean): QuickNote {
  if (pinned) {
    return {
      ...note,
      pinned: true
    };
  }

  const nextNote = { ...note };
  delete nextNote.pinned;
  return nextNote;
}

export function setNoteArchived(note: QuickNote, archived: boolean): QuickNote {
  if (archived) {
    return {
      ...note,
      archived: true
    };
  }

  const nextNote = { ...note };
  delete nextNote.archived;
  return nextNote;
}

export function getNoteScopeLabel(note: QuickNote, context: PageContext | null): string {
  void context;
  if (note.scope === "global") return "Global";
  return note.siteKey ?? "Site";
}

export function getNoteBlocks(note: QuickNote): NoteBlock[] {
  if (note.blocks?.length) return normalizeNoteBlocks(note.blocks);
  return legacyContentToBlocks(note.content);
}

export function normalizeNoteBlocks(value: unknown): NoteBlock[] {
  if (!Array.isArray(value)) return createEmptyNoteBlocks();

  const blocks = value.map(toJsonValue).filter(isJsonObject).map(normalizeTextBlock);
  return blocks.length > 0 ? blocks : createEmptyNoteBlocks();
}

export function noteBlocksToPlainText(blocks: readonly NoteBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    appendBlockText(block, parts);
    parts.push(" ");
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function normalizeNoteContent(content: string): string {
  const value = content.trim();
  if (!value) return "";

  const html = looksLikeHtml(value) ? value : plainTextToHtml(value);
  return sanitizeNoteHtml(html);
}

export function sanitizeNoteHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const clean = document.createElement("div");

  for (const child of Array.from(template.content.childNodes)) {
    appendSanitizedNode(clean, child);
  }

  return clean.innerHTML.trim();
}

export function noteContentToPlainText(content: string): string {
  const template = document.createElement("template");
  template.innerHTML = sanitizeNoteHtml(content);

  const parts: string[] = [];
  appendPlainText(template.content, parts);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isBlankNoteContent(content: string): boolean {
  return noteContentToPlainText(content).length === 0;
}

function matchesScope(note: QuickNote, scope: NoteScopeFilter, context: PageContext | null): boolean {
  if (scope === "all") return true;
  return isCurrentSiteNote(note, context);
}

function matchesVisibility(note: QuickNote, visibility: NoteVisibilityFilter): boolean {
  return visibility === "archived" ? Boolean(note.archived) : !note.archived;
}

function isCurrentSiteNote(note: QuickNote, context: PageContext | null): boolean {
  return Boolean(note.scope === "site" && note.siteKey && context?.siteKey === note.siteKey);
}

function compareNotes(left: QuickNote, right: QuickNote): number {
  if (Boolean(left.pinned) !== Boolean(right.pinned)) {
    return left.pinned ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getSearchValues(note: QuickNote): string[] {
  return [note.content, note.siteKey ?? "", note.pageTitle ?? "", note.pageUrl ?? ""];
}

function createNoteId(): string {
  return crypto.randomUUID();
}

function createEmptyNoteBlocks(): NoteBlock[] {
  return [
    {
      type: "paragraph",
      content: ""
    }
  ];
}

const TEXT_BLOCK_TYPES = new Set(["paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem"]);

function normalizeTextBlock(block: NoteBlock): NoteBlock {
  if (typeof block.type !== "string" || !TEXT_BLOCK_TYPES.has(block.type)) {
    const normalizedBlock: NoteBlock = {
      ...block,
      content: noteBlocksToPlainText([block]),
      type: "paragraph"
    };
    delete normalizedBlock.children;
    return normalizedBlock;
  }

  const normalizedBlock: NoteBlock = {
    ...block,
    content: normalizeInlineContent(block.content),
    type: block.type
  };
  const children = normalizeChildBlocks(block.children);

  if (children.length > 0) {
    normalizedBlock.children = children;
  } else {
    delete normalizedBlock.children;
  }

  return normalizedBlock;
}

function normalizeInlineContent(content: JsonValue | undefined): JsonValue {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const inlineContent = content.map(toJsonValue).filter(isJsonObject);
    return inlineContent.length > 0 ? inlineContent : "";
  }

  return "";
}

function normalizeChildBlocks(children: JsonValue | undefined): NoteBlock[] {
  if (!Array.isArray(children)) return [];
  return children.map(toJsonValue).filter(isJsonObject).map(normalizeTextBlock);
}

function legacyContentToBlocks(content: string): NoteBlock[] {
  const text = noteContentToPlainText(content) || content.trim();

  return [
    {
      type: "paragraph",
      content: text
    }
  ];
}

function appendBlockText(value: JsonValue | undefined, parts: string[]): void {
  if (typeof value === "string") {
    parts.push(value);
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      appendBlockText(item, parts);
    }
    return;
  }

  const text = value.text;
  if (typeof text === "string") {
    parts.push(text);
  }

  appendBlockText(value.content, parts);
  appendBlockText(value.children, parts);
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue).filter((item): item is JsonValue => item !== undefined);
  }

  if (!isRecord(value)) return undefined;

  const output: Record<string, JsonValue> = {};

  for (const [key, child] of Object.entries(value)) {
    const jsonChild = toJsonValue(child);

    if (jsonChild !== undefined) {
      output[key] = jsonChild;
    }
  }

  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isJsonObject(value: JsonValue | undefined): value is NoteBlock {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "P", "DIV", "BR"]);
const BLOCKED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "LINK", "META"]);
const BLOCK_TEXT_TAGS = new Set(["BR", "DIV", "P", "LI", "UL", "OL"]);

function appendSanitizedNode(parent: HTMLElement | DocumentFragment, node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    parent.appendChild(document.createTextNode(node.textContent ?? ""));
    return;
  }

  if (!(node instanceof HTMLElement)) return;

  if (BLOCKED_TAGS.has(node.tagName)) return;

  if (!ALLOWED_TAGS.has(node.tagName)) {
    for (const child of Array.from(node.childNodes)) {
      appendSanitizedNode(parent, child);
    }
    return;
  }

  const cleanElement = document.createElement(node.tagName.toLowerCase());

  for (const child of Array.from(node.childNodes)) {
    appendSanitizedNode(cleanElement, child);
  }

  parent.appendChild(cleanElement);
}

function appendPlainText(node: Node, parts: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.textContent ?? "");
    return;
  }

  if (!(node instanceof HTMLElement || node instanceof DocumentFragment)) return;

  for (const child of Array.from(node.childNodes)) {
    appendPlainText(child, parts);
  }

  if (node instanceof HTMLElement && BLOCK_TEXT_TAGS.has(node.tagName)) {
    parts.push(" ");
  }
}

function plainTextToHtml(value: string): string {
  const wrapper = document.createElement("div");
  const lines = value.replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    const paragraph = document.createElement("div");

    if (line) {
      paragraph.textContent = line;
    } else {
      paragraph.appendChild(document.createElement("br"));
    }

    wrapper.appendChild(paragraph);
  }

  return wrapper.innerHTML;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
