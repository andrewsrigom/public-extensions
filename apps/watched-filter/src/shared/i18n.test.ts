import { applyTranslations, resolveLanguage, t } from "./i18n";
import { afterEach, describe, expect, it } from "vitest";

describe("i18n", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("resolves automatic language from the browser UI locale", () => {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        i18n: {
          getUILanguage: () => "es-MX"
        }
      }
    });

    expect(resolveLanguage()).toBe("es");
  });

  it("falls back to English for unsupported automatic locales", () => {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        i18n: {
          getUILanguage: () => "fr-FR"
        }
      }
    });

    expect(resolveLanguage()).toBe("en");
  });

  it("falls back when browser i18n is unavailable after extension reload", () => {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        i18n: {
          getUILanguage: () => {
            throw new Error("Extension context invalidated.");
          }
        }
      }
    });

    expect(() => t("markerMarkTitle")).not.toThrow();
    expect(resolveLanguage()).toBe("en");
  });

  it("interpolates translated messages", () => {
    expect(t("connectedPage", "pt-BR", { platform: "Prime Video" })).toBe("Conectado: Prime Video.");
    expect(t("cancel", "es")).toBe("Cancelar");
    expect(t("confirmClear", "en")).toBe("Remove all marked titles?");
    expect(t("clearAllFailed", "pt-BR")).toBe("Nao consegui limpar os titulos marcados.");
  });

  it("applies text, placeholder, and title translations to a document", () => {
    document.body.innerHTML = `
      <button data-i18n="exportBackup"></button>
      <input data-i18n-placeholder="searchPlaceholder" />
      <span data-i18n-title="markerMarkTitle"></span>
    `;

    applyTranslations(document, "en");

    expect(document.querySelector("button")?.textContent).toBe("Export backup");
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe("Title, platform, or URL");
    expect(document.querySelector("span")?.getAttribute("title")).toBe("Mark as watched");
    expect(document.documentElement.lang).toBe("en");
  });
});
