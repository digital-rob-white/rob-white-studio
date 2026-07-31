import type { ArtworkCatalog } from "../lib/catalogs";
import { requireStudioUser, setupStudioSignOut, showStudioError } from "./supabase-client";

const list = document.querySelector<HTMLElement>("[data-catalog-list]");
const loading = document.querySelector<HTMLElement>("[data-catalog-loading]");
const empty = document.querySelector<HTMLElement>("[data-catalog-empty]");
const search = document.querySelector<HTMLInputElement>("[data-catalog-search]");
const sort = document.querySelector<HTMLSelectElement>("[data-catalog-sort]");
let catalogs: (ArtworkCatalog & { artwork_catalog_items: { count: number }[] })[] = [];

function render(): void {
  if (!list) return;
  const term = search?.value.trim().toLowerCase() || "";
  const rows = catalogs.filter((catalog) => [catalog.internal_name, catalog.public_title, catalog.recipient_name].some((value) => value?.toLowerCase().includes(term)));
  rows.sort((a, b) => sort?.value === "name_asc"
    ? a.internal_name.localeCompare(b.internal_name)
    : new Date(sort?.value === "created_desc" ? b.created_at : b.updated_at).getTime() - new Date(sort?.value === "created_desc" ? a.created_at : a.updated_at).getTime());
  list.innerHTML = rows.map((catalog) => {
    const count = catalog.artwork_catalog_items?.[0]?.count || 0;
    return `<article class="catalog-list-card">
      <div><p class="eyebrow">${count} artwork${count === 1 ? "" : "s"}</p><h2><a href="/studio/artwork/catalogs/entry?id=${catalog.id}">${catalog.internal_name}</a></h2>
      <p>${catalog.public_title}${catalog.recipient_name ? ` · Prepared for ${catalog.recipient_name}` : ""}</p>
      <small>Updated ${new Date(catalog.updated_at).toLocaleDateString()}</small></div>
      <div class="catalog-card-actions">
        <a class="studio-button studio-button-quiet" href="/studio/artwork/catalogs/entry?id=${catalog.id}">Open</a>
        <a class="studio-button studio-button-quiet" href="/studio/artwork/catalogs/edit?id=${catalog.id}">Edit</a>
        <a class="studio-button studio-button-quiet" href="/studio/artwork/catalogs/preview?id=${catalog.id}">Preview</a>
        <button class="studio-button studio-button-quiet" type="button" data-duplicate="${catalog.id}">Duplicate</button>
        <button class="studio-text-button catalog-delete" type="button" data-delete="${catalog.id}">Delete</button>
      </div>
    </article>`;
  }).join("");
  empty?.toggleAttribute("hidden", catalogs.length > 0);
  list.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((button) => button.addEventListener("click", () => void deleteCatalog(button.dataset.delete || "")));
  list.querySelectorAll<HTMLButtonElement>("[data-duplicate]").forEach((button) => button.addEventListener("click", () => void duplicateCatalog(button.dataset.duplicate || "")));
}

async function deleteCatalog(id: string): Promise<void> {
  if (!confirm("Delete this catalog? Artwork records and images will not be deleted.")) return;
  const { client } = await requireStudioUser();
  const { error } = await client.from("artwork_catalogs").delete().eq("id", id);
  if (error) return showStudioError(error);
  catalogs = catalogs.filter((catalog) => catalog.id !== id);
  render();
}

async function duplicateCatalog(id: string): Promise<void> {
  try {
    const { client, user } = await requireStudioUser();
    const source = catalogs.find((catalog) => catalog.id === id);
    if (!source) return;
    const copy = {
      owner_id: user.id,
      internal_name: `${source.internal_name} copy`,
      public_title: source.public_title,
      subtitle: source.subtitle,
      recipient_name: source.recipient_name,
      intro_text: source.intro_text,
      display_date: source.display_date,
      notes_private: source.notes_private,
      layout_preset: source.layout_preset,
      pricing_mode: source.pricing_mode,
      show_header: source.show_header,
      duplicated_from_catalog_id: source.id
    };
    const { data, error } = await client.from("artwork_catalogs").insert(copy).select("*").single();
    if (error) throw error;
    const { data: items, error: itemError } = await client.from("artwork_catalog_items").select("*").eq("catalog_id", id).order("display_order");
    if (itemError) throw itemError;
    if (items?.length) {
      const rows = items.map((item) => ({
        catalog_id: data.id,
        artwork_id: item.artwork_id,
        display_order: item.display_order,
        selected_image_id: item.selected_image_id,
        title_override: item.title_override,
        year_override: item.year_override,
        materials_override: item.materials_override,
        dimensions_override: item.dimensions_override,
        frame_status_override: item.frame_status_override,
        frame_description_override: item.frame_description_override,
        price_source: item.price_source,
        pricing_mode: item.pricing_mode,
        snapshot_price_cents: item.snapshot_price_cents,
        custom_price_cents: item.custom_price_cents,
        caption: item.caption
      }));
      const { error: insertError } = await client.from("artwork_catalog_items").insert(rows);
      if (insertError) throw insertError;
    }
    location.assign(`/studio/artwork/catalogs/entry?id=${data.id}`);
  } catch (error) {
    showStudioError(error);
  }
}

async function init(): Promise<void> {
  setupStudioSignOut();
  try {
    const { client } = await requireStudioUser();
    const { data, error } = await client.from("artwork_catalogs").select("*, artwork_catalog_items(count)").order("updated_at", { ascending: false });
    if (error) throw error;
    catalogs = data as typeof catalogs;
    loading?.setAttribute("hidden", "");
    render();
    search?.addEventListener("input", render);
    sort?.addEventListener("change", render);
  } catch (error) {
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
