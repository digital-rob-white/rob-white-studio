export const ACTIVITY_FILTERS = [
  ["all", "All Activity"],
  ["journal", "Journal"],
  ["artwork", "Artwork"],
  ["projects", "Projects"],
  ["clients", "Clients"],
  ["estimates", "Estimates"],
  ["invoices", "Invoices"],
  ["system", "System"],
  ["completed", "Completed"],
  ["follow_ups", "Follow-ups"]
] as const;

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number][0];

export type StudioActivity = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  object_type: string;
  object_id: string | null;
  object_label: string | null;
  destination: string | null;
  thumbnail_asset_id: string | null;
  created_at: string;
  created_by: string | null;
  metadata: Record<string, unknown>;
};

export const ACTIVITY_PRESENTATION: Record<string, { glyph: string; label: string }> = {
  journal_created: { glyph: "J", label: "Journal Created" },
  journal_updated: { glyph: "J", label: "Journal Updated" },
  project_created: { glyph: "P", label: "Project Created" },
  project_updated: { glyph: "P", label: "Project Updated" },
  artwork_created: { glyph: "A", label: "Artwork Created" },
  artwork_updated: { glyph: "A", label: "Artwork Updated" },
  estimate_created: { glyph: "E", label: "Estimate Created" },
  estimate_approved: { glyph: "✓", label: "Estimate Approved" },
  estimate_sent: { glyph: "E", label: "Estimate Sent" },
  invoice_created: { glyph: "I", label: "Invoice Created" },
  invoice_paid: { glyph: "✓", label: "Invoice Paid" },
  client_added: { glyph: "C", label: "Client Added" },
  collector_added: { glyph: "C", label: "Collector Added" },
  file_uploaded: { glyph: "F", label: "File Uploaded" },
  photo_added: { glyph: "P", label: "Photo Added" },
  reminder_completed: { glyph: "✓", label: "Reminder Completed" },
  follow_up_completed: { glyph: "✓", label: "Follow-up Completed" },
  system_note: { glyph: "S", label: "System Note" }
};

export function activityPresentation(type: string): { glyph: string; label: string } {
  return ACTIVITY_PRESENTATION[type] ?? {
    glyph: "·",
    label: type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  };
}

export function activityMatches(activity: StudioActivity, query: string, filter: ActivityFilter): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const searchable = [
    activity.title,
    activity.description,
    activity.object_label,
    activity.object_type,
    JSON.stringify(activity.metadata || {})
  ].filter(Boolean).join(" ").toLowerCase();

  if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
  if (filter === "all") return true;
  if (filter === "completed") {
    return activity.activity_type.includes("completed")
      || activity.activity_type.endsWith("_approved")
      || activity.activity_type.endsWith("_paid");
  }
  if (filter === "follow_ups") {
    return activity.activity_type.includes("follow_up") || activity.metadata.follow_up_needed === true;
  }
  if (filter === "system") return activity.object_type === "system" || activity.activity_type === "system_note";
  if (filter === "journal") return activity.object_type === "journal_entry";
  if (filter === "projects") return activity.object_type === "project";
  if (filter === "clients") return activity.object_type === "client" || activity.object_type === "collector";
  if (filter === "estimates") return activity.object_type === "estimate";
  if (filter === "invoices") return activity.object_type === "invoice";
  return activity.object_type === filter;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date): Date {
  const day = startOfDay(value);
  const mondayOffset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - mondayOffset);
  return day;
}

export function activityDateGroup(value: string, now = new Date()): "Today" | "Yesterday" | "This Week" | "Last Week" | "Earlier" {
  const activityDay = startOfDay(new Date(value));
  const today = startOfDay(now);
  const daysAgo = Math.round((today.getTime() - activityDay.getTime()) / 86_400_000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";

  const thisWeek = startOfWeek(now);
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (activityDay >= thisWeek) return "This Week";
  if (activityDay >= lastWeek) return "Last Week";
  return "Earlier";
}
