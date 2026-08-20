import { describe, expect, it } from "vitest";
import { resolveLanguage, t } from "./i18n";

describe("product filter i18n", () => {
  it("translates popup labels", () => {
    expect(t("globalTerms", "pt-BR")).toBe("Termos globais");
    expect(t("globalTerms", "en")).toBe("Global terms");
    expect(t("globalTerms", "es")).toBe("Terminos globales");
    expect(t("clearRulesConfirmDescription", "pt-BR")).toContain("termos salvos");
    expect(t("cancel", "es")).toBe("Cancelar");
    expect(t("clearRulesFailed", "en")).toBe("Could not clear rules.");
  });

  it("interpolates translated values", () => {
    expect(t("blockedSummary", "en", { count: 3 })).toBe("Blocked 3");
    expect(t("siteTermsWithName", "pt-BR", { site: "Temu" })).toBe("Termos só no Temu");
    expect(t("versionLabel", "pt-BR", { version: "0.1.0" })).toBe("Hide Products 0.1.0");
  });

  it("resolves explicit language preferences", () => {
    expect(resolveLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("es")).toBe("es");
  });
});
