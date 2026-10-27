import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";
import { resumeFromLinkedInZip } from "./linkedin";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and embedded newlines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });
});

describe("resumeFromLinkedInZip", () => {
  const zip = zipSync({
    "Profile.csv": strToU8(
      'First Name,Last Name,Headline,Summary,Geo Location,Websites\nAna,Pérez,Backend Engineer,"Builds APIs.",Madrid,"[PORTFOLIO:https://ana.dev,OTHER:https://github.com/anap]"\n',
    ),
    "Positions.csv": strToU8(
      'Company Name,Title,Description,Location,Started On,Finished On\nFintech Co,Senior Engineer,"Built payments API\nLed migration",Madrid,Mar 2021,\nAcme,Developer,,Remote,Jan 2019,Feb 2021\n',
    ),
    "Education.csv": strToU8("School Name,Start Date,End Date,Notes,Degree Name,Activities\nUPM,2014,2018,,Computer Engineering,\n"),
    "Skills.csv": strToU8("Name\nGo\nPostgreSQL\n"),
    "Email Addresses.csv": strToU8("Email Address,Confirmed,Primary,Updated On\nana@mail.com,Yes,Yes,\n"),
    "Languages.csv": strToU8("Name,Proficiency\nEnglish,Full professional proficiency\n"),
  });

  it("maps every section", () => {
    const r = resumeFromLinkedInZip(zip, "es");
    expect(r?.basics).toMatchObject({ name: "Ana Pérez", headline: "Backend Engineer", email: "ana@mail.com", location: "Madrid" });
    expect(r?.basics.links.map((l) => l.label)).toEqual(["Website", "GitHub"]);
    expect(r?.experience[0]).toMatchObject({ company: "Fintech Co", startDate: "2021-03", current: true, highlights: ["Built payments API", "Led migration"] });
    expect(r?.experience[1]).toMatchObject({ startDate: "2019-01", endDate: "2021-02", current: false });
    expect(r?.education[0]).toMatchObject({ institution: "UPM", degree: "Computer Engineering", startDate: "2014" });
    expect(r?.skills[0]).toMatchObject({ name: "Habilidades", keywords: ["Go", "PostgreSQL"] });
    expect(r?.languages[0]?.fluency).toBe("Full professional proficiency");
  });

  it("rejects unrelated archives", () => {
    expect(resumeFromLinkedInZip(zipSync({ "notes.txt": strToU8("hi") }), "en")).toBeNull();
  });
});
