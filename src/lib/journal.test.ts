import { describe, expect, it } from "vitest";
import { safeFileName, splitTerms, validateJournalEntry } from "./journal";

describe("Journal helpers", () => {
  it("requires only a title and body", () => {
    expect(validateJournalEntry({ title: "", body: "" })).toEqual({
      title: "Add a short title so you can find this entry later.",
      body: "Write at least a brief note."
    });
    expect(validateJournalEntry({ title: "A useful note", body: "Remember this." })).toEqual({});
  });

  it("normalizes tags and filenames", () => {
    expect(splitTerms("oak, finish test, oak, film")).toEqual(["oak", "finish test", "film"]);
    expect(safeFileName("Oak Sample #1.JPG")).toBe("oak-sample-1.jpg");
  });
});
