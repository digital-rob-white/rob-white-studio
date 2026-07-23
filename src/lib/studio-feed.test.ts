import { describe, expect, it } from "vitest";
import { activityDateGroup, activityMatches, activityPresentation, type StudioActivity } from "./studio-feed";

const activity: StudioActivity = {
  id: "1",
  activity_type: "journal_created",
  title: "Journal entry created",
  description: "Added three progress photographs.",
  object_type: "journal_entry",
  object_id: "entry-1",
  object_label: "Naturalist — botanical film test",
  destination: "/studio/journal/entry?id=entry-1",
  thumbnail_asset_id: null,
  created_at: "2026-07-22T21:14:00Z",
  created_by: "user-1",
  metadata: { tags: ["botanical print"] }
};

describe("Studio Feed", () => {
  it("searches activity copy, related objects, and metadata", () => {
    expect(activityMatches(activity, "Naturalist", "all")).toBe(true);
    expect(activityMatches(activity, "botanical print", "all")).toBe(true);
    expect(activityMatches(activity, "invoice", "all")).toBe(false);
  });

  it("combines search with category filters", () => {
    expect(activityMatches(activity, "progress", "journal")).toBe(true);
    expect(activityMatches(activity, "progress", "artwork")).toBe(false);
  });

  it("includes marked and completed entries in the Follow-ups filter", () => {
    expect(activityMatches({
      ...activity,
      activity_type: "journal_updated",
      metadata: { follow_up_needed: true }
    }, "", "follow_ups")).toBe(true);
    expect(activityMatches({
      ...activity,
      activity_type: "follow_up_completed",
      metadata: { follow_up_needed: false }
    }, "", "follow_ups")).toBe(true);
  });

  it("groups dates relative to the local calendar", () => {
    const now = new Date(2026, 6, 23, 9, 0);
    expect(activityDateGroup(new Date(2026, 6, 23, 8, 0).toISOString(), now)).toBe("Today");
    expect(activityDateGroup(new Date(2026, 6, 22, 8, 0).toISOString(), now)).toBe("Yesterday");
    expect(activityDateGroup(new Date(2026, 6, 20, 8, 0).toISOString(), now)).toBe("This Week");
    expect(activityDateGroup(new Date(2026, 6, 15, 8, 0).toISOString(), now)).toBe("Last Week");
    expect(activityDateGroup(new Date(2026, 5, 1, 8, 0).toISOString(), now)).toBe("Earlier");
  });

  it("presents future activity types without a code failure", () => {
    expect(activityPresentation("kiln_fired")).toEqual({ glyph: "·", label: "Kiln Fired" });
  });
});
