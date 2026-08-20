import {
  getTimeZoneDatalistOptions,
  getTimeZoneSelectOptions,
  populateTimeZoneDatalist,
  populateTimeZoneSelect
} from "./select";

describe("timezone select helpers", () => {
  it("adds valid custom time zones once", () => {
    const options = getTimeZoneSelectOptions([
      { timeZone: "Europe/Paris" },
      { timeZone: "Pacific/Chatham", label: "Chatham", aliases: "CHAST/CHADT" },
      { timeZone: "Pacific/Chatham", label: "Duplicate" },
      { timeZone: "Mars/Base" }
    ]);

    expect(options.filter((option) => option.timeZone === "Europe/Paris")).toHaveLength(1);
    expect(options.filter((option) => option.timeZone === "Pacific/Chatham")).toHaveLength(1);
    expect(options.some((option) => option.timeZone === "Mars/Base")).toBe(false);
  });

  it("populates a native select with grouped timezone options", () => {
    const select = document.createElement("select");

    populateTimeZoneSelect(select, {
      selectedTimeZone: "Pacific/Chatham",
      additionalTimeZones: [{ timeZone: "Pacific/Chatham", label: "Chatham", aliases: "CHAST/CHADT" }]
    });

    expect(select.value).toBe("Pacific/Chatham");
    expect(select.querySelectorAll("optgroup").length).toBeGreaterThan(1);
    expect(select.querySelector("option[value='Pacific/Chatham']")?.textContent).toBe("Chatham (CHAST/CHADT)");
  });

  it("populates a datalist with curated and browser-supported time zones", () => {
    const datalist = document.createElement("datalist");

    populateTimeZoneDatalist(datalist, {
      additionalTimeZones: [{ timeZone: "Pacific/Chatham", label: "Chatham", aliases: "CHAST/CHADT" }]
    });

    expect(datalist.querySelector("option[value='America/Los_Angeles']")).not.toBeNull();
    expect(datalist.querySelector("option[value='Pacific/Chatham']")?.getAttribute("label")).toBe(
      "Chatham (CHAST/CHADT)"
    );
  });

  it("includes every supported timezone only once in datalist choices", () => {
    const options = getTimeZoneDatalistOptions([{ timeZone: "America/Los_Angeles", label: "Duplicate" }]);
    const losAngelesOptions = options.filter((option) => option.timeZone === "America/Los_Angeles");

    expect(losAngelesOptions).toHaveLength(1);
  });
});
