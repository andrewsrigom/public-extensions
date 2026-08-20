import { buildItemKey, normalizeHttpUrl, normalizeText, normalizeUrl } from "./url";
import { describe, expect, it } from "vitest";

describe("url helpers", () => {
  it("normalizes whitespace in text", () => {
    expect(normalizeText("  Jurassic\n\nWorld\tRecomeço  ")).toBe("Jurassic World Recomeço");
  });

  it("normalizes URLs by resolving relative links and dropping search/hash", () => {
    expect(normalizeUrl("/detail/amzn1.dv.gti/movie?ref=atv_dp#more", "https://www.primevideo.com/movie")).toBe(
      "https://www.primevideo.com/detail/amzn1.dv.gti/movie"
    );
  });

  it("accepts only absolute HTTP and HTTPS URLs for clickable external links", () => {
    expect(normalizeHttpUrl(" https://example.com/watch?id=1 ")).toBe("https://example.com/watch?id=1");
    expect(normalizeHttpUrl("http://example.com/path")).toBe("http://example.com/path");

    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("data:text/html,unsafe")).toBeNull();
    expect(normalizeHttpUrl("file:///tmp/private")).toBeNull();
    expect(normalizeHttpUrl(["https://user", "secret@example.com/private"].join(":"))).toBeNull();
    expect(normalizeHttpUrl("/relative/path")).toBeNull();
    expect(normalizeHttpUrl("not a url")).toBeNull();
  });

  it("builds namespaced item keys", () => {
    expect(buildItemKey("prime-video", "https://www.primevideo.com/detail/example")).toBe(
      "prime-video:https://www.primevideo.com/detail/example"
    );
  });
});
