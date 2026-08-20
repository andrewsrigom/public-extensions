import { describe, expect, it } from "vitest";

import { t } from "./i18n";

describe("pathswitch i18n", () => {
  it("provides redirect-cycle validation in every supported language", () => {
    expect(t("validationCycle", "en")).toContain("redirect loop");
    expect(t("validationCycle", "es")).toContain("bucle");
    expect(t("validationCycle", "pt-BR")).toContain("loop");
  });
});
