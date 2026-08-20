import { resolveTimeZoneAlias } from "./catalog";

describe("timezone catalog", () => {
  it("resolves common Pacific Time aliases", () => {
    expect(resolveTimeZoneAlias("PST")).toBe("America/Los_Angeles");
    expect(resolveTimeZoneAlias("PDT")).toBe("America/Los_Angeles");
    expect(resolveTimeZoneAlias("Pacific Time")).toBe("America/Los_Angeles");
  });

  it("keeps unknown aliases unresolved", () => {
    expect(resolveTimeZoneAlias("Mars/Base")).toBeNull();
  });
});
