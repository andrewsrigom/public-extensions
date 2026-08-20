import { describe, expect, it } from "vitest";

import { RedirectHopGuard } from "./redirect-guard";

describe("RedirectHopGuard", () => {
  it("blocks a redirect that revisits a URL in the same tab", () => {
    const guard = new RedirectHopGuard();

    expect(guard.check(1, "https://a.example/", "https://b.example/", 0)).toBe("allow");
    expect(guard.check(1, "https://b.example/", "https://a.example/", 1)).toBe("cycle");
  });

  it("keeps redirect chains isolated per tab", () => {
    const guard = new RedirectHopGuard();

    expect(guard.check(1, "https://a.example/", "https://b.example/", 0)).toBe("allow");
    expect(guard.check(2, "https://b.example/", "https://a.example/", 0)).toBe("allow");
    expect(guard.check(1, "https://b.example/", "https://a.example/", 1)).toBe("cycle");
    expect(guard.check(2, "https://a.example/", "https://c.example/", 1)).toBe("allow");
  });

  it("starts a new chain after a manual navigation or timeout", () => {
    const guard = new RedirectHopGuard({ ttlMs: 100 });

    expect(guard.check(1, "https://a.example/", "https://b.example/", 0)).toBe("allow");
    expect(guard.check(1, "https://manual.example/", "https://a.example/", 1)).toBe("allow");
    expect(guard.check(1, "https://a.example/", "https://manual.example/", 102)).toBe("allow");
  });

  it("blocks chains that exceed the configured hop limit", () => {
    const guard = new RedirectHopGuard({ maxHops: 2 });

    expect(guard.check(1, "https://a.example/", "https://b.example/", 0)).toBe("allow");
    expect(guard.check(1, "https://b.example/", "https://c.example/", 1)).toBe("allow");
    expect(guard.check(1, "https://c.example/", "https://d.example/", 2)).toBe("hop-limit");
  });
});
