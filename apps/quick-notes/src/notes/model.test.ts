import {
  createPageContext,
  createQuickNote,
  filterNotes,
  getNoteBlocks,
  getNoteScopeLabel,
  getSiteKeyFromUrl,
  isBlankNoteContent,
  normalizeNoteBlocks,
  noteBlocksToPlainText,
  noteContentToPlainText,
  removeEmptyNotes,
  sanitizeNoteHtml,
  setNoteArchived,
  setNotePinned,
  updateNoteBlocks,
  updateNoteContent,
  type QuickNote
} from "./model";

describe("quick notes model", () => {
  const context = createPageContext({
    url: "https://www.example.com/jobs/123",
    title: "Senior Developer"
  });

  it("normalizes site keys from page URLs", () => {
    expect(getSiteKeyFromUrl("https://www.Example.com/path")).toBe("example.com");
    expect(getSiteKeyFromUrl("chrome://extensions")).toBeNull();
    expect(getSiteKeyFromUrl("not a url")).toBeNull();
  });

  it("creates global and current-site notes from an explicit scope without changing the stored shape", () => {
    const siteNote = createQuickNote({
      context,
      scope: "site",
      now: new Date("2026-07-08T12:00:00.000Z")
    });
    const globalNote = createQuickNote({
      context,
      scope: "global",
      now: new Date("2026-07-08T12:00:00.000Z")
    });
    const fallbackNote = createQuickNote({
      context: createPageContext({ url: "chrome://extensions", title: "Extensions" }),
      scope: "site",
      now: new Date("2026-07-08T12:00:00.000Z")
    });

    expect(siteNote).toMatchObject({
      scope: "site",
      siteKey: "example.com",
      pageTitle: "Senior Developer",
      createdAt: "2026-07-08T12:00:00.000Z"
    });
    expect(globalNote).toMatchObject({
      scope: "global",
      pageTitle: "Senior Developer",
      pageUrl: "https://www.example.com/jobs/123"
    });
    expect(globalNote.siteKey).toBeUndefined();
    expect(fallbackNote.scope).toBe("global");
  });

  it("shows every scope in the all view and filters the current site by its saved tag", () => {
    const notes = [
      note({ id: "global", scope: "global", content: "Remember this everywhere" }),
      note({ id: "current", scope: "site", siteKey: "example.com", content: "Only here" }),
      note({ id: "other", scope: "site", siteKey: "other.test", content: "Other site" }),
      note({ id: "archived", scope: "global", archived: true, content: "Hidden note" })
    ];

    expect(filterNotes(notes, { context, scope: "all" }).map(({ id }) => id)).toEqual(["current", "other", "global"]);
    expect(filterNotes(notes, { context, scope: "site" }).map(({ id }) => id)).toEqual(["current"]);
    expect(filterNotes(notes, { context, scope: "all", visibility: "archived" }).map(({ id }) => id)).toEqual([
      "archived"
    ]);
  });

  it("toggles archived notes without changing their content", () => {
    const archived = setNoteArchived(note({ id: "archived", scope: "global", content: "Hide me" }), true);

    expect(archived.archived).toBe(true);
    expect(archived.content).toBe("Hide me");
    expect(setNoteArchived(archived, false).archived).toBeUndefined();
  });

  it("keeps pinned notes at the top of the filtered list", () => {
    const recent = note({
      id: "recent",
      scope: "global",
      content: "Recent note",
      updatedAt: "2026-07-08T12:05:00.000Z"
    });
    const olderPinned = setNotePinned(
      note({
        id: "pinned",
        scope: "global",
        content: "Important note",
        updatedAt: "2026-07-08T12:01:00.000Z"
      }),
      true
    );

    expect(filterNotes([recent, olderPinned], { context, scope: "all" }).map(({ id }) => id)).toEqual([
      "pinned",
      "recent"
    ]);
    expect(setNotePinned(olderPinned, false).pinned).toBeUndefined();
  });

  it("searches note content and metadata without accents", () => {
    const notes = [
      note({ id: "one", scope: "global", content: "Curriculo para vaga", pageTitle: "Lead role" }),
      note({ id: "two", scope: "global", content: "Shopping list" })
    ];

    expect(filterNotes(notes, { context, scope: "all", query: "currículo" }).map(({ id }) => id)).toEqual(["one"]);
    expect(filterNotes(notes, { context, scope: "all", query: "lead" }).map(({ id }) => id)).toEqual(["one"]);
  });

  it("updates note content and removes empty notes before persistence", () => {
    const updated = updateNoteContent(
      note({ id: "one", scope: "global", content: "Old" }),
      "<strong>New</strong>",
      new Date("2026-07-08T12:01:00.000Z")
    );

    expect(updated.content).toBe("New");
    expect(noteBlocksToPlainText(getNoteBlocks(updated))).toBe("New");
    expect(updated.updatedAt).toBe("2026-07-08T12:01:00.000Z");
    expect(removeEmptyNotes([updated, note({ id: "empty", scope: "global", content: "<div><br></div>" })])).toEqual([
      updated
    ]);
  });

  it("labels current site notes compactly", () => {
    expect(getNoteScopeLabel(note({ id: "global", scope: "global" }), context)).toBe("Global");
    expect(getNoteScopeLabel(note({ id: "site", scope: "site", siteKey: "example.com" }), context)).toBe("example.com");
    expect(getNoteScopeLabel(note({ id: "other", scope: "site", siteKey: "other.test" }), context)).toBe("other.test");
  });

  it("sanitizes rich note HTML to a small safe tag set", () => {
    expect(
      sanitizeNoteHtml(
        '<p onclick="alert(1)">Hello <strong>bold</strong><script>alert(1)</script><a href="https://example.com">link</a></p><ul><li>One</li></ul>'
      )
    ).toBe("<p>Hello <strong>bold</strong>link</p><ul><li>One</li></ul>");
  });

  it("converts stored note HTML to searchable plain text", () => {
    expect(noteContentToPlainText("<div>Hello <strong>world</strong></div><ul><li>One</li></ul>")).toBe(
      "Hello world One"
    );
    expect(isBlankNoteContent("<div><br></div>")).toBe(true);
  });

  it("stores BlockNote blocks as the source document and keeps plain content for search", () => {
    const updated = updateNoteBlocks(
      note({ id: "one", scope: "global" }),
      [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bold idea", styles: { bold: true } }],
          children: [
            {
              type: "bulletListItem",
              content: "Nested item"
            }
          ]
        }
      ],
      new Date("2026-07-08T12:02:00.000Z")
    );

    expect(updated.content).toBe("Bold idea Nested item");
    expect(updated.blocks?.[0]?.type).toBe("paragraph");
    expect(updated.updatedAt).toBe("2026-07-08T12:02:00.000Z");
  });

  it("normalizes restored blocks to inline-text block types", () => {
    const normalized = normalizeNoteBlocks([
      {
        type: "file",
        content: [{ type: "text", text: "Attachment text", styles: {} }],
        children: [
          {
            type: "table",
            content: [{ type: "text", text: "Nested text", styles: {} }]
          }
        ]
      },
      {
        type: "paragraph",
        children: "invalid children"
      }
    ]);

    expect(normalized).toEqual([
      {
        type: "paragraph",
        content: "Attachment text Nested text"
      },
      {
        type: "paragraph",
        content: ""
      }
    ]);
  });
});

function note(input: Partial<QuickNote> & Pick<QuickNote, "id" | "scope">): QuickNote {
  return {
    content: "",
    createdAt: "2026-07-08T12:00:00.000Z",
    updatedAt: input.id === "global" ? "2026-07-08T12:00:00.000Z" : `2026-07-08T12:00:0${input.id.length}.000Z`,
    ...input
  };
}
