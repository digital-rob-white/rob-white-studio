import { money, type Artwork } from "../lib/artwork";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";

type ArtworkListRecord = Artwork & { investedCostCents: number; primaryUrl?: string };

const list = document.querySelector<HTMLElement>("[data-artwork-list]");
const loading = document.querySelector<HTMLElement>("[data-artwork-loading]");
const empty = document.querySelector<HTMLElement>("[data-artwork-empty]");
const search = document.querySelector<HTMLInputElement>("[data-artwork-search]");
const production = document.querySelector<HTMLSelectElement>("[data-artwork-production]");
const availability = document.querySelector<HTMLSelectElement>("[data-artwork-availability]");
const collection = document.querySelector<HTMLSelectElement>("[data-artwork-collection]");
const medium = document.querySelector<HTMLSelectElement>("[data-artwork-medium]");
const sort = document.querySelector<HTMLSelectElement>("[data-artwork-sort]");
let artworks: ArtworkListRecord[] = [];

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dimensions(artwork: Artwork): string {
  const parts = [artwork.width, artwork.height, artwork.depth].filter((part) => part != null);
  return parts.length ? `${parts.join(" × ")} ${artwork.dimension_unit}` : "Dimensions not recorded";
}

function option(value: string): HTMLOptionElement {
  const result = document.createElement("option");
  result.value = value;
  result.textContent = value;
  return result;
}

function populateFilters(): void {
  const collections = Array.from(new Set(artworks.map((artwork) => artwork.collection_name).filter((value): value is string => Boolean(value)))).sort();
  const mediums = Array.from(new Set(artworks.map((artwork) => artwork.medium).filter((value): value is string => Boolean(value)))).sort();
  collection?.append(...collections.map(option));
  medium?.append(...mediums.map(option));
}

function makeCard(artwork: ArtworkListRecord): HTMLAnchorElement {
  const card = document.createElement("a");
  card.className = "artwork-list-card";
  card.href = `/studio/artwork/entry?id=${encodeURIComponent(artwork.id)}`;
  const image = document.createElement("div");
  image.className = "artwork-list-image";
  if (artwork.primaryUrl) {
    const img = document.createElement("img");
    img.src = artwork.primaryUrl;
    img.alt = artwork.title;
    image.append(img);
  } else {
    image.textContent = "No image";
  }
  const content = document.createElement("div");
  content.className = "artwork-list-content";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = [artwork.inventory_number, artwork.collection_name].filter(Boolean).join(" · ") || "Artwork";
  const title = document.createElement("h2");
  title.textContent = artwork.title;
  const facts = document.createElement("p");
  facts.className = "artwork-list-facts";
  facts.textContent = [artwork.year, artwork.medium, dimensions(artwork)].filter(Boolean).join(" · ");
  const chips = document.createElement("div");
  chips.className = "studio-chip-row";
  [label(artwork.production_status), label(artwork.availability)].forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "studio-chip";
    chip.textContent = value;
    chips.append(chip);
  });
  content.append(eyebrow, title, facts, chips);
  const values = document.createElement("dl");
  values.className = "artwork-list-values";
  values.innerHTML = `<div><dt>Retail</dt><dd>${money(artwork.current_retail_price_cents)}</dd></div><div><dt>Invested</dt><dd>${money(artwork.investedCostCents)}</dd></div><div><dt>Updated</dt><dd>${new Date(artwork.updated_at).toLocaleDateString()}</dd></div>`;
  card.append(image, content, values);
  return card;
}

function render(): void {
  if (!list || !empty) return;
  const query = search?.value.trim().toLowerCase() || "";
  const filtered = artworks.filter((artwork) => {
    const haystack = [artwork.title, artwork.inventory_number, artwork.medium, artwork.collection_name].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!production?.value || artwork.production_status === production.value)
      && (!availability?.value || artwork.availability === availability.value)
      && (!collection?.value || artwork.collection_name === collection.value)
      && (!medium?.value || artwork.medium === medium.value);
  });
  const [field, direction] = (sort?.value || "updated_desc").split("_");
  filtered.sort((a, b) => {
    const values: Record<string, [string | number, string | number]> = {
      updated: [a.updated_at, b.updated_at],
      title: [a.title.toLowerCase(), b.title.toLowerCase()],
      year: [a.year || 0, b.year || 0],
      price: [a.current_retail_price_cents || 0, b.current_retail_price_cents || 0],
      cost: [a.investedCostCents, b.investedCostCents]
    };
    const [left, right] = values[field] || values.updated;
    const result = left < right ? -1 : left > right ? 1 : 0;
    return direction === "asc" ? result : -result;
  });
  list.replaceChildren(...filtered.map(makeCard));
  empty.hidden = filtered.length > 0;
}

async function init(): Promise<void> {
  setupStudioSignOut();
  try {
    const { client } = await requireStudioUser();
    const [{ data: artworkData, error: artworkError }, { data: costs, error: costError }, { data: labor, error: laborError }, { data: assets, error: assetError }] = await Promise.all([
      client.from("artworks").select("*").order("updated_at", { ascending: false }),
      client.from("artwork_cost_entries").select("artwork_id,allocated_cost_cents"),
      client.from("artwork_labor_entries").select("artwork_id,labor_total_cents"),
      client.from("file_assets").select("id,bucket,path")
    ]);
    if (artworkError) throw artworkError;
    if (costError) throw costError;
    if (laborError) throw laborError;
    if (assetError) throw assetError;
    const assetsById = new Map((assets || []).map((asset) => [asset.id, asset]));
    artworks = await Promise.all(((artworkData || []) as Artwork[]).map(async (artwork) => {
      const cash = (costs || []).filter((row) => row.artwork_id === artwork.id).reduce((sum, row) => sum + row.allocated_cost_cents, 0);
      const laborValue = (labor || []).filter((row) => row.artwork_id === artwork.id).reduce((sum, row) => sum + row.labor_total_cents, 0);
      const asset = artwork.primary_image_id ? assetsById.get(artwork.primary_image_id) : undefined;
      const primaryUrl = asset ? await signedImageUrl(asset.bucket, asset.path) || undefined : undefined;
      return { ...artwork, investedCostCents: cash + laborValue, primaryUrl };
    }));
    populateFilters();
    [search, production, availability, collection, medium, sort].forEach((control) => control?.addEventListener("input", render));
    loading?.setAttribute("hidden", "");
    render();
  } catch (error) {
    loading?.setAttribute("hidden", "");
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
