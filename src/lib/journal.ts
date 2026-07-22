export const ENTRY_TYPES = [
  ["note", "Note"],
  ["idea", "Idea"],
  ["process", "Process"],
  ["material", "Material"],
  ["decision", "Decision"],
  ["problem", "Problem"],
  ["lesson", "Lesson"],
  ["pricing", "Pricing"],
  ["client_feedback", "Client Feedback"]
] as const;

export const VISIBILITIES = [
  ["internal", "Internal"],
  ["public", "Public"],
  ["unlisted", "Unlisted"]
] as const;

export type JournalEntryType = (typeof ENTRY_TYPES)[number][0];
export type JournalVisibility = (typeof VISIBILITIES)[number][0];

export function splitTerms(value: string): string[] {
  return Array.from(new Set(value.split(",").map((term) => term.trim()).filter(Boolean)));
}

export function entryTypeLabel(value: string): string {
  return ENTRY_TYPES.find(([key]) => key === value)?.[1] ?? value;
}

export function visibilityLabel(value: string): string {
  return VISIBILITIES.find(([key]) => key === value)?.[1] ?? value;
}

export function validateJournalEntry(input: { title: string; body: string }) {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "Add a short title so you can find this entry later.";
  if (input.title.trim().length > 160) errors.title = "Keep the title under 160 characters.";
  if (!input.body.trim()) errors.body = "Write at least a brief note.";
  return errors;
}

export function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}
