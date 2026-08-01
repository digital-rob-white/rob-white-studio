import { describe, expect, it } from "vitest";
import { catalogDimensions, catalogGrid, catalogItemsPerPage, catalogPageCount, catalogPageSize, catalogPrice } from "./catalogs";
import type { Artwork } from "./artwork";

const artwork = {
  width: 25.75,
  height: 37.25,
  depth: 1.5,
  dimension_unit: "in",
  current_retail_price_cents: 450000,
  target_price_cents: 500000,
  frame_status: "unframed",
  frame_description: null
} as Artwork;

describe("artwork catalogs", () => {
  it("formats canonical imperial dimensions", () => {
    expect(catalogDimensions(artwork)).toBe("Height: 37 1/4 in | Width: 25 3/4 in | Depth: 1 1/2 in");
  });

  it("paginates deterministic presets", () => {
    expect(catalogItemsPerPage("compact_grid")).toBe(8);
    expect(catalogItemsPerPage("compact_grid", "portrait")).toBe(6);
    expect(catalogPageCount(9, "compact_grid")).toBe(2);
    expect(catalogPageCount(7, "compact_grid", "portrait")).toBe(2);
    expect(catalogPageCount(5, "large_image_grid")).toBe(2);
  });

  it("uses exact Letter dimensions and orientation-aware grids", () => {
    expect(catalogPageSize("landscape")).toEqual({ width: 11, height: 8.5 });
    expect(catalogPageSize("portrait")).toEqual({ width: 8.5, height: 11 });
    expect(catalogGrid("compact_grid", "landscape")).toEqual({ columns: 4, rows: 2 });
    expect(catalogGrid("compact_grid", "portrait")).toEqual({ columns: 2, rows: 3 });
    expect(catalogGrid("large_image_grid", "portrait")).toEqual({ columns: 2, rows: 2 });
  });

  it("uses the stored price snapshot when present", () => {
    expect(catalogPrice({
      price_source: "current_retail",
      pricing_mode: "snapshot",
      snapshot_price_cents: 400000
    } as never, artwork)).toBe("$4,000.00");
  });
});
