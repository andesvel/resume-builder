import { describe, expect, it } from "vitest";

import { normalizeDate } from "./dates";
import { extractContacts } from "./heuristics";

describe("extractContacts", () => {
  it("pulls emails, phones and labelled links verbatim", () => {
    const r = extractContacts(
      "Soy John, mi correo es john.doe+cv@mail.co, tel +57 300 123 4567. Mis redes: github.com/johnd y https://www.linkedin.com/in/johnd/ y mi web johnd.dev",
    );
    expect(r.email).toBe("john.doe+cv@mail.co");
    expect(r.phone).toBe("+57 300 123 4567");
    expect(r.links).toEqual([
      { label: "GitHub", url: "github.com/johnd" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/johnd/" },
      { label: "Website", url: "johnd.dev" },
    ]);
  });

  it("ignores years and versions", () => {
    expect(extractContacts("Trabajé de 2019 a 2021 con Node 18.2").links).toBeUndefined();
    expect(extractContacts("Trabajé de 2019 a 2021").phone).toBeUndefined();
    expect(extractContacts("Acme 2019-2021").phone).toBeUndefined();
  });
});

describe("normalizeDate", () => {
  it.each([
    ["2020-3", "2020-03", false],
    ["03/2020", "2020-03", false],
    ["Mar 2020", "2020-03", false],
    ["marzo de 2020", "2020-03", false],
    ["sept. 2019", "2019-09", false],
    ["2018", "2018", false],
    ["since 2018", "2018", false],
    ["Present", "", true],
    ["actualidad", "", true],
    ["", "", false],
  ])("%s -> %s", (input, date, current) => {
    expect(normalizeDate(input)).toEqual({ date, current });
  });
});
