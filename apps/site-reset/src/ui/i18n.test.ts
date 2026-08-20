import { describe, expect, it } from "vitest";

import { formatSiteResetDataTypes, getDefaultSiteResetLanguage, getSiteResetMessages } from "./i18n";

describe("site reset i18n", () => {
  it("includes destructive action confirmation labels", () => {
    const english = getSiteResetMessages("en");
    const portuguese = getSiteResetMessages("pt-BR");
    const spanish = getSiteResetMessages("es");

    expect(english.cancel).toBe("Cancel");
    expect(portuguese.cleanSelected).toBe("Limpar dados selecionados");
    expect(portuguese.cleanSelectedConfirmDescription("cookies")).toContain("não pode ser desfeita");
    expect(spanish.cleanSelected).toBe("Borrar datos seleccionados");
  });

  it("names the advanced storage types explicitly in every language", () => {
    expect(getSiteResetMessages("en").offlineData).toBe("Cache Storage, IndexedDB & service workers");
    expect(getSiteResetMessages("pt-BR").offlineData).toBe("Cache Storage, IndexedDB e service workers");
    expect(getSiteResetMessages("es").offlineData).toBe("Cache Storage, IndexedDB y service workers");
  });

  it("formats the actual selected data types for confirmation", () => {
    const selectedTypes = formatSiteResetDataTypes(["Cookies", "Browser cache"], "en");
    const confirmation = getSiteResetMessages("en").cleanSelectedConfirmDescription(selectedTypes);

    expect(selectedTypes).toContain("Cookies");
    expect(selectedTypes).toContain("Browser cache");
    expect(confirmation).toBe("Clear Cookies and Browser cache for this site? This cannot be undone.");
  });

  it("falls back to English when no navigator locale is available", () => {
    expect(getDefaultSiteResetLanguage()).toBe("en");
  });
});
