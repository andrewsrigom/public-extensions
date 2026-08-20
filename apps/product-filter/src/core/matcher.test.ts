import { matchProduct, normalizeSearchText } from "./matcher";
import { describe, expect, it } from "vitest";

describe("product matcher", () => {
  it("matches blocked terms ignoring case and accents", () => {
    const result = matchProduct(
      { productId: "B0TEST", title: "Vaporizador portátil com controle" },
      {
        enabled: true,
        mode: "hide",
        language: "pt-BR",
        blockedProductIds: [],
        blockedTermsByPlatform: {},
        blockedTerms: ["vaporizador"]
      }
    );

    expect(result).toMatchObject({
      blocked: true,
      reasons: ["Termo: vaporizador"]
    });
  });

  it("matches exact product ID rules", () => {
    const result = matchProduct(
      { productId: "B0FP6JN5VR", title: "Samsung Tablet Galaxy Tab S10 Lite" },
      {
        enabled: true,
        mode: "hide",
        language: "pt-BR",
        blockedProductIds: ["b0fp6jn5vr"],
        blockedTermsByPlatform: {},
        blockedTerms: []
      }
    );

    expect(result.blocked).toBe(true);
    expect(result.reasons).toEqual(["ID: B0FP6JN5VR"]);
  });

  it("does not match when disabled", () => {
    const result = matchProduct(
      { productId: "B0FP6JN5VR", title: "Smart TV 55 polegadas" },
      {
        enabled: false,
        mode: "hide",
        language: "pt-BR",
        blockedProductIds: ["B0FP6JN5VR"],
        blockedTermsByPlatform: {},
        blockedTerms: ["smart tv"]
      }
    );

    expect(result.blocked).toBe(false);
  });

  it("matches platform-specific terms only for the active platform", () => {
    const settings = {
      enabled: true,
      mode: "hide" as const,
      language: "pt-BR" as const,
      blockedProductIds: [],
      blockedTerms: [],
      blockedTermsByPlatform: {
        temu: ["corda"]
      }
    };

    expect(
      matchProduct({ productId: "601100245483509", title: "Chapeu de praia com corda" }, settings, "temu")
    ).toEqual({
      blocked: true,
      reasons: ["Termo do site: corda"]
    });
    expect(
      matchProduct({ productId: "1005009806529460", title: "Mascara cyberpunk com corda" }, settings, "aliexpress")
        .blocked
    ).toBe(false);
  });

  it("normalizes accents", () => {
    expect(normalizeSearchText("Televisão 4K")).toBe("televisao 4k");
  });
});
