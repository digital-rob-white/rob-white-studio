import { formatInches } from "./artwork";

export const PUBLICATION_STATUSES = [
  ["draft", "Draft"],
  ["ready_for_review", "Ready for Review"],
  ["published", "Published"],
  ["hidden", "Hidden"],
  ["sold_archive", "Sold / Archive"]
] as const;

export const PUBLIC_AVAILABILITY = [
  ["available", "Available"],
  ["reserved", "Reserved"],
  ["sold", "Sold"],
  ["not_for_sale", "Not for Sale"],
  ["inquiry", "Inquiry"]
] as const;

export const COMMERCE_ACTIONS = [
  ["purchase", "Purchase"],
  ["inquire", "Inquire"],
  ["none", "No action"]
] as const;

export const PUBLIC_MEDIA_ROLES = [
  ["primary", "Primary artwork image"],
  ["full_front", "Full frontal view"],
  ["detail", "Detail"],
  ["side_profile", "Side / profile"],
  ["framed", "Framed view"],
  ["installed", "Installed in a room"],
  ["process", "Studio / process"],
  ["scale_reference", "Scale / reference"],
  ["video", "Video"],
  ["motion", "Motion / process media"]
] as const;

export type ArtworkPublication = {
  artwork_id: string;
  owner_id?: string;
  publish_to_website?: boolean;
  publication_status: string;
  publication_date: string | null;
  published_at: string | null;
  featured: boolean;
  display_order: number;
  slug: string | null;
  public_title: string | null;
  public_year: number | null;
  public_medium: string | null;
  public_dimensions: string | null;
  frame_presentation: string | null;
  collection_name: string | null;
  short_introduction: string | null;
  artwork_story: string | null;
  process_notes: string | null;
  materials_story: string | null;
  pull_quote: string | null;
  related_context: string | null;
  availability: string;
  retail_price_cents: number | null;
  purchase_status: string | null;
  shipping_status: string | null;
  local_pickup_available: boolean;
  commerce_action: string;
};

export type PublicArtworkMedia = {
  id?: string;
  artwork_id: string;
  source_file_asset_id?: string;
  public_bucket: string;
  public_path: string | null;
  display_role: string;
  alt_text: string | null;
  caption: string | null;
  display_order: number;
  hidden?: boolean;
  url?: string;
};

export function slugifyArtwork(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function publicDimensions(artwork: {
  width: number | null;
  height: number | null;
  depth: number | null;
  dimension_unit: string;
}): string | null {
  const values = [artwork.height, artwork.width, artwork.depth].filter((value): value is number => value != null);
  if (!values.length) return null;
  const format = artwork.dimension_unit === "in" ? formatInches : (value: number) => String(value);
  return `${values.map(format).join(" × ")} ${artwork.dimension_unit}`;
}

export function publicPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

export function publicationReady(input: ArtworkPublication, visibleMediaCount: number): string[] {
  const missing: string[] = [];
  if (!input.public_title?.trim()) missing.push("public title");
  if (!input.slug?.trim()) missing.push("URL slug");
  if (visibleMediaCount < 1) missing.push("at least one public image");
  return missing;
}

export function artworkPublicUrl(slug: string): string {
  return `/artwork/${encodeURIComponent(slug)}/`;
}
