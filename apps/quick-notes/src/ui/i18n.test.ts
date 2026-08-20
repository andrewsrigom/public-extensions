import { getNoteMessages, resolveNoteLanguage } from "./i18n";

describe("quick notes i18n", () => {
  it("resolves supported browser languages", () => {
    expect(resolveNoteLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveNoteLanguage("pt")).toBe("pt-BR");
    expect(resolveNoteLanguage("es-MX")).toBe("es");
    expect(resolveNoteLanguage("fr-FR")).toBe("en");
  });

  it("translates core note actions", () => {
    expect(getNoteMessages("pt-BR").archive).toBe("Arquivar");
    expect(getNoteMessages("pt-BR").restore).toBe("Restaurar");
    expect(getNoteMessages("pt-BR").confirmDelete).toBe("Confirmar exclusão");
    expect(getNoteMessages("es").archived).toBe("Archivadas");
    expect(getNoteMessages("es").confirmDelete).toBe("Confirmar eliminación");
    expect(getNoteMessages("en").tagged("example.com")).toBe("Tagged example.com");
  });
});
