import { formatInches, money, type Artwork } from "./artwork";

export const CATALOG_LAYOUTS = [
  ["compact_grid", "Compact grid · up to 8 artworks per page"],
  ["large_image_grid", "Large image grid · up to 4 artworks per page"]
] as const;

export const CATALOG_PRICE_SOURCES = [
  ["current_retail", "Current studio retail"],
  ["projected_retail", "Projected retail / target"],
  ["gallery_retail", "Gallery retail"],
  ["trade", "Designer / trade"],
  ["custom", "Custom price"],
  ["price_on_request", "Price on request"],
  ["hidden", "Hide price"]
] as const;

export type ArtworkCatalog = {
  id: string;
  owner_id: string;
  internal_name: string;
  public_title: string;
  subtitle: string | null;
  recipient_name: string | null;
  intro_text: string | null;
  display_date: string | null;
  notes_private: string | null;
  layout_preset: "compact_grid" | "large_image_grid";
  pricing_mode: "snapshot" | "live";
  show_header: boolean;
  duplicated_from_catalog_id: string | null;
  latest_export_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogItem = {
  id: string;
  catalog_id: string;
  artwork_id: string;
  display_order: number;
  selected_image_id: string | null;
  title_override: string | null;
  year_override: number | null;
  materials_override: string | null;
  dimensions_override: string | null;
  frame_status_override: string | null;
  frame_description_override: string | null;
  price_source: string;
  pricing_mode: "snapshot" | "live";
  snapshot_price_cents: number | null;
  custom_price_cents: number | null;
  caption: string | null;
  artwork?: Artwork;
};

export type CatalogImage = {
  id: string;
  artwork_id: string | null;
  bucket: string;
  path: string;
  file_name: string;
  alt_text: string | null;
  display_order: number;
};

export type StudioBusinessSettings = {
  owner_id: string;
  studio_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  business_address: string | null;
  logo_asset_id: string | null;
};

export function catalogItemsPerPage(layout: ArtworkCatalog["layout_preset"]): number {
  return layout === "large_image_grid" ? 4 : 8;
}

export function catalogPageCount(itemCount: number, layout: ArtworkCatalog["layout_preset"]): number {
  return Math.max(1, Math.ceil(itemCount / catalogItemsPerPage(layout)));
}

export function catalogDimensions(artwork: Artwork, override?: string | null): string {
  if (override?.trim()) return override.trim();
  const values = [artwork.width, artwork.height, artwork.depth].filter((part) => part != null);
  if (!values.length) return "";
  const formatted = values.map((part) => artwork.dimension_unit === "in" ? formatInches(part) : String(part));
  return `${formatted.join(" × ")}${artwork.dimension_unit === "in" ? "″" : ` ${artwork.dimension_unit}`}`;
}

export function catalogFrame(item: CatalogItem, artwork: Artwork): string {
  const status = item.frame_status_override || artwork.frame_status;
  const description = item.frame_description_override || artwork.frame_description;
  if (status === "framed") return description ? `Framed: ${description}` : "Framed";
  if (status === "unframed") return "Unframed";
  if (status === "frame_optional") return description ? `Frame optional: ${description}` : "Frame optional";
  return "";
}

export function canonicalPrice(artwork: Artwork, source: string): number | null {
  if (source === "current_retail") return artwork.current_retail_price_cents;
  if (source === "projected_retail") return artwork.target_price_cents;
  const scenarios = (artwork as Artwork & { artwork_pricing_scenarios?: Array<{ scenario_name: string; listed_price_cents: number }> }).artwork_pricing_scenarios || [];
  if (source === "gallery_retail") {
    return scenarios.find((scenario) => scenario.scenario_name.toLowerCase().includes("gallery"))?.listed_price_cents ?? null;
  }
  if (source === "trade") {
    return scenarios.find((scenario) => {
      const name = scenario.scenario_name.toLowerCase();
      return name.includes("trade") || name.includes("designer");
    })?.listed_price_cents ?? null;
  }
  return null;
}

export function catalogPrice(item: CatalogItem, artwork: Artwork): string {
  if (item.price_source === "hidden") return "";
  if (item.price_source === "price_on_request") return "Price on request";
  const cents = item.price_source === "custom"
    ? item.custom_price_cents
    : item.pricing_mode === "snapshot" && item.snapshot_price_cents != null
      ? item.snapshot_price_cents
      : canonicalPrice(artwork, item.price_source);
  return cents == null ? "" : money(cents);
}

export function catalogItemWarnings(item: CatalogItem, artwork: Artwork, hasImage: boolean): string[] {
  const warnings: string[] = [];
  if (!hasImage) warnings.push("Missing image");
  if (!catalogDimensions(artwork, item.dimensions_override)) warnings.push("Missing dimensions");
  if (!(item.materials_override || artwork.materials_description || artwork.medium)) warnings.push("Missing materials");
  if (!catalogPrice(item, artwork) && item.price_source !== "hidden") warnings.push("Missing price");
  return warnings;
}
