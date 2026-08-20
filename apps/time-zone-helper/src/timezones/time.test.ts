import { formatClockTime, formatDateForInput, formatTimeForInput, wallTimeToInstant } from "./time";

describe("wallTimeToInstant", () => {
  it("converts Pacific daylight time to Brasilia time", () => {
    const instant = wallTimeToInstant({
      date: "2026-07-08",
      time: "09:00",
      timeZone: "America/Los_Angeles"
    });

    expect(formatClockTime(instant, "America/Los_Angeles")).toBe("09:00");
    expect(formatClockTime(instant, "America/Sao_Paulo")).toBe("13:00");
  });

  it("converts Pacific standard time to Brasilia time", () => {
    const instant = wallTimeToInstant({
      date: "2026-01-15",
      time: "09:00",
      timeZone: "America/Los_Angeles"
    });

    expect(formatClockTime(instant, "America/Los_Angeles")).toBe("09:00");
    expect(formatClockTime(instant, "America/Sao_Paulo")).toBe("14:00");
  });

  it("keeps the target calendar date available for date and time inputs", () => {
    const instant = new Date("2026-07-08T23:30:00.000Z");

    expect(formatDateForInput(instant, "Asia/Tokyo")).toBe("2026-07-09");
    expect(formatTimeForInput(instant, "Asia/Tokyo")).toBe("08:30");
  });
});
