import { CATALOG_PRICE_SOURCES, canonicalPrice, catalogDimensions, catalogFrame, catalogItemWarnings, catalogPrice, type ArtworkCatalog, type CatalogImage, type CatalogItem, type StudioBusinessSettings } from "../lib/catalogs";
import { centsToInput, dollarsToCents, type Artwork } from "../lib/artwork";
import { requireStudioUser, setupStudioSignOut, showStudioError } from "./supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const detail = document.querySelector<HTMLElement>("[data-catalog-detail]");
const loading = document.querySelector<HTMLElement>("[data-catalog-loading]");
const success = document.querySelector<HTMLElement>("[data-catalog-success]");
const picker = document.querySelector<HTMLElement>("[data-artwork-picker]");
const itemList = document.querySelector<HTMLElement>("[data-catalog-items]");
const itemEmpty = document.querySelector<HTMLElement>("[data-catalog-items-empty]");
const search = document.querySelector<HTMLInputElement>("[data-artwork-search]");
const addSelected = document.querySelector<HTMLButtonElement>("[data-add-selected]");
const settingsForm = document.querySelector<HTMLFormElement>("[data-business-settings-form]");
let client: SupabaseClient;
let catalog: ArtworkCatalog;
let artworks: Artwork[] = [];
let items: CatalogItem[] = [];
let images: CatalogImage[] = [];
const selected = new Set<string>();

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function notify(message: string): void {
  if (!success) return;
  success.textContent = message;
  success.hidden = false;
  window.setTimeout(() => { success.hidden = true; }, 3000);
}

function imageFor(item: CatalogItem): CatalogImage | undefined {
  const artwork = item.artwork!;
  return images.find((image) => image.id === item.selected_image_id)
    || images.find((image) => image.id === artwork.primary_image_id)
    || images.find((image) => image.artwork_id === artwork.id);
}

async function signedImage(image?: CatalogImage): Promise<string> {
  if (!image) return "";
  const { data } = await client.storage.from(image.bucket).createSignedUrl(image.path, 3600);
  return data?.signedUrl || "";
}

function renderPicker(): void {
  if (!picker) return;
  const existing = new Set(items.map((item) => item.artwork_id));
  const term = search?.value.trim().toLowerCase() || "";
  const available = artworks.filter((artwork) => !existing.has(artwork.id) && [artwork.title, artwork.inventory_number, artwork.medium, artwork.collection_name].some((value) => value?.toLowerCase().includes(term)));
  picker.innerHTML = available.length ? available.slice(0, 60).map((artwork) => `<label class="catalog-picker-card">
    <input type="checkbox" value="${artwork.id}" ${selected.has(artwork.id) ? "checked" : ""} />
    <span><strong>${escapeHtml(artwork.title)}</strong><small>${escapeHtml([artwork.year, artwork.medium, artwork.collection_name].filter(Boolean).join(" · "))}</small></span>
  </label>`).join("") : `<p class="studio-field-help">${artworks.length ? "No matching artwork is available to add." : "Create an artwork record before adding catalog items."}</p>`;
  picker.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((box) => box.addEventListener("change", () => {
    if (box.checked) selected.add(box.value);
    else selected.delete(box.value);
    if (addSelected) addSelected.disabled = selected.size === 0;
  }));
}

async function renderItems(): Promise<void> {
  if (!itemList) return;
  itemEmpty?.toggleAttribute("hidden", items.length > 0);
  const cards = await Promise.all(items.map(async (item, index) => {
    const artwork = item.artwork!;
    const image = imageFor(item);
    const url = await signedImage(image);
    const availableImages = images.filter((candidate) => candidate.artwork_id === artwork.id);
    const warnings = catalogItemWarnings(item, artwork, Boolean(image));
    return `<article class="catalog-editor-card" draggable="true" data-item-id="${item.id}">
      <div class="catalog-editor-image">${url ? `<img src="${url}" alt="${escapeHtml(image?.alt_text || artwork.title)}" />` : "<span>No image</span>"}</div>
      <form data-item-form="${item.id}">
        <header><div><p class="eyebrow">Position ${index + 1}</p><h3>${escapeHtml(item.title_override || artwork.title)}</h3></div>
          <div class="catalog-order-actions"><button type="button" data-move="-1" ${index === 0 ? "disabled" : ""}>↑ <span>Move up</span></button><button type="button" data-move="1" ${index === items.length - 1 ? "disabled" : ""}>↓ <span>Move down</span></button></div>
        </header>
        ${warnings.length ? `<p class="catalog-warning">${warnings.map(escapeHtml).join(" · ")}</p>` : ""}
        <div class="studio-form-row studio-form-row-3">
          <div class="studio-field"><label>Catalog title</label><input name="title_override" value="${escapeHtml(item.title_override || "")}" placeholder="${escapeHtml(artwork.title)}" /></div>
          <div class="studio-field"><label>Year</label><input name="year_override" type="number" value="${item.year_override ?? ""}" placeholder="${artwork.year ?? ""}" /></div>
          <div class="studio-field"><label>Image</label><select name="selected_image_id"><option value="">Primary / first available</option>${availableImages.map((candidate) => `<option value="${candidate.id}" ${candidate.id === item.selected_image_id ? "selected" : ""}>${escapeHtml(candidate.file_name)}</option>`).join("")}</select></div>
        </div>
        <div class="studio-form-row">
          <div class="studio-field"><label>Materials</label><input name="materials_override" value="${escapeHtml(item.materials_override || "")}" placeholder="${escapeHtml(artwork.materials_description || artwork.medium || "")}" /></div>
          <div class="studio-field"><label>Dimensions</label><input name="dimensions_override" value="${escapeHtml(item.dimensions_override || "")}" placeholder="${escapeHtml(catalogDimensions(artwork))}" /></div>
        </div>
        <div class="studio-form-row studio-form-row-3">
          <div class="studio-field"><label>Price display</label><select name="price_source">${CATALOG_PRICE_SOURCES.map(([value, label]) => `<option value="${value}" ${value === item.price_source ? "selected" : ""}>${label}</option>`).join("")}</select></div>
          <div class="studio-field"><label>Price behavior</label><select name="pricing_mode"><option value="snapshot" ${item.pricing_mode === "snapshot" ? "selected" : ""}>Use saved snapshot</option><option value="live" ${item.pricing_mode === "live" ? "selected" : ""}>Use current artwork price</option></select></div>
          <div class="studio-field"><label>Custom price</label><input name="custom_price" inputmode="decimal" value="${item.custom_price_cents == null ? "" : centsToInput(item.custom_price_cents)}" placeholder="$0.00" /></div>
        </div>
        <div class="studio-form-row">
          <div class="studio-field"><label>Frame status override</label><select name="frame_status_override"><option value="">Use artwork record</option><option value="framed" ${item.frame_status_override === "framed" ? "selected" : ""}>Framed</option><option value="unframed" ${item.frame_status_override === "unframed" ? "selected" : ""}>Unframed</option><option value="frame_optional" ${item.frame_status_override === "frame_optional" ? "selected" : ""}>Frame optional</option><option value="not_applicable" ${item.frame_status_override === "not_applicable" ? "selected" : ""}>Not applicable</option></select></div>
          <div class="studio-field"><label>Frame description override</label><input name="frame_description_override" value="${escapeHtml(item.frame_description_override || "")}" placeholder="${escapeHtml(catalogFrame(item, artwork))}" /></div>
        </div>
        <div class="studio-field"><label>Catalog caption</label><textarea name="caption" rows="2">${escapeHtml(item.caption || "")}</textarea></div>
        <footer><span class="catalog-item-price">${escapeHtml(catalogPrice(item, artwork) || "No price shown")}</span><div><button class="studio-text-button catalog-delete" type="button" data-remove>Remove</button><button class="studio-button studio-button-quiet" type="submit">Save Item</button></div></footer>
      </form>
    </article>`;
  }));
  itemList.innerHTML = cards.join("");
  wireItemActions();
}

function nullable(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

function wireItemActions(): void {
  itemList?.querySelectorAll<HTMLElement>("[data-item-id]").forEach((card) => {
    const id = card.dataset.itemId || "";
    const form = card.querySelector<HTMLFormElement>("form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const priceSource = nullable(data, "price_source") || "current_retail";
      const artwork = items.find((item) => item.id === id)?.artwork;
      const record = {
        title_override: nullable(data, "title_override"),
        year_override: nullable(data, "year_override") ? Number(data.get("year_override")) : null,
        selected_image_id: nullable(data, "selected_image_id"),
        materials_override: nullable(data, "materials_override"),
        dimensions_override: nullable(data, "dimensions_override"),
        price_source: priceSource,
        pricing_mode: nullable(data, "pricing_mode") || "snapshot",
        custom_price_cents: nullable(data, "custom_price") ? dollarsToCents(data.get("custom_price")) : null,
        snapshot_price_cents: artwork ? (priceSource === "custom" ? dollarsToCents(data.get("custom_price")) : canonicalPrice(artwork, priceSource)) : null,
        frame_status_override: nullable(data, "frame_status_override"),
        frame_description_override: nullable(data, "frame_description_override"),
        caption: nullable(data, "caption")
      };
      const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
      if (button) { button.disabled = true; button.textContent = "Saving…"; }
      const { error } = await client.from("artwork_catalog_items").update(record).eq("id", id);
      if (error) { showStudioError(error); if (button) { button.disabled = false; button.textContent = "Save Item"; } return; }
      Object.assign(items.find((item) => item.id === id)!, record);
      notify("Catalog item saved.");
      await renderItems();
    });
    card.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => button.addEventListener("click", () => void moveItem(id, Number(button.dataset.move))));
    card.querySelector<HTMLButtonElement>("[data-remove]")?.addEventListener("click", () => void removeItem(id));
    card.addEventListener("dragstart", (event) => event.dataTransfer?.setData("text/plain", id));
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceId = event.dataTransfer?.getData("text/plain");
      if (sourceId && sourceId !== id) void reorderByDrop(sourceId, id);
    });
  });
}

async function persistOrder(): Promise<void> {
  const updates = items.map((item, index) => client.from("artwork_catalog_items").update({ display_order: index }).eq("id", item.id));
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
  items.forEach((item, index) => { item.display_order = index; });
}

async function moveItem(id: string, offset: number): Promise<void> {
  const index = items.findIndex((item) => item.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  try { await persistOrder(); await renderItems(); } catch (error) { showStudioError(error); }
}

async function reorderByDrop(sourceId: string, targetId: string): Promise<void> {
  const source = items.findIndex((item) => item.id === sourceId);
  const target = items.findIndex((item) => item.id === targetId);
  if (source < 0 || target < 0) return;
  const [moved] = items.splice(source, 1);
  items.splice(target, 0, moved);
  try { await persistOrder(); await renderItems(); } catch (error) { showStudioError(error); }
}

async function removeItem(id: string): Promise<void> {
  if (!confirm("Remove this artwork from the catalog? The artwork record will remain unchanged.")) return;
  const { error } = await client.from("artwork_catalog_items").delete().eq("id", id);
  if (error) return showStudioError(error);
  items = items.filter((item) => item.id !== id);
  await persistOrder();
  renderPicker();
  await renderItems();
}

async function addSelectedArtwork(): Promise<void> {
  if (!selected.size || !addSelected) return;
  addSelected.disabled = true;
  addSelected.textContent = "Adding…";
  try {
    const rows = Array.from(selected).map((artworkId, offset) => {
      const artwork = artworks.find((candidate) => candidate.id === artworkId)!;
      return {
        catalog_id: catalog.id,
        artwork_id: artworkId,
        display_order: items.length + offset,
        selected_image_id: artwork.primary_image_id,
        price_source: "current_retail",
        pricing_mode: catalog.pricing_mode,
        snapshot_price_cents: artwork.current_retail_price_cents
      };
    });
    const { error } = await client.from("artwork_catalog_items").insert(rows);
    if (error) throw error;
    selected.clear();
    await loadItems();
    notify(`${rows.length} artwork${rows.length === 1 ? "" : "s"} added.`);
  } catch (error) {
    showStudioError(error);
  } finally {
    addSelected.textContent = "Add Selected Artwork";
    addSelected.disabled = true;
  }
}

async function loadItems(): Promise<void> {
  const { data, error } = await client.from("artwork_catalog_items").select("*, artwork:artworks(*, artwork_pricing_scenarios(scenario_name,listed_price_cents))").eq("catalog_id", catalog.id).order("display_order");
  if (error) throw error;
  items = data as CatalogItem[];
  renderPicker();
  await renderItems();
}

function fillSettings(settings?: StudioBusinessSettings | null): void {
  if (!settingsForm || !settings) return;
  Object.entries(settings).forEach(([name, value]) => {
    const field = settingsForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value == null ? "" : String(value);
  });
}

async function init(): Promise<void> {
  setupStudioSignOut();
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return showStudioError("No catalog was selected.");
  try {
    const auth = await requireStudioUser();
    client = auth.client;
    const [{ data: catalogData, error: catalogError }, { data: artworkData, error: artworkError }, { data: imageData, error: imageError }, { data: settings }] = await Promise.all([
      client.from("artwork_catalogs").select("*").eq("id", id).single(),
      client.from("artworks").select("*, artwork_pricing_scenarios(scenario_name,listed_price_cents)").order("title"),
      client.from("file_assets").select("id,artwork_id,bucket,path,file_name,alt_text,display_order").not("artwork_id", "is", null).order("display_order"),
      client.from("studio_business_settings").select("*").eq("owner_id", auth.user.id).maybeSingle()
    ]);
    if (catalogError) throw catalogError;
    if (artworkError) throw artworkError;
    if (imageError) throw imageError;
    catalog = catalogData as ArtworkCatalog;
    artworks = artworkData as Artwork[];
    images = imageData as CatalogImage[];
    document.querySelector<HTMLElement>("[data-catalog-name]")!.textContent = catalog.internal_name;
    document.querySelector<HTMLElement>("[data-catalog-public-title]")!.textContent = catalog.public_title;
    document.querySelector<HTMLElement>("[data-catalog-meta]")!.textContent = [catalog.layout_preset === "compact_grid" ? "Compact grid" : "Large image grid", catalog.recipient_name ? `Prepared for ${catalog.recipient_name}` : "", catalog.display_date ? new Date(`${catalog.display_date}T12:00:00`).toLocaleDateString() : ""].filter(Boolean).join(" · ");
    document.querySelector<HTMLAnchorElement>("[data-catalog-edit]")!.href = `/studio/artwork/catalogs/edit?id=${id}`;
    document.querySelector<HTMLAnchorElement>("[data-catalog-preview]")!.href = `/studio/artwork/catalogs/preview?id=${id}`;
    fillSettings(settings as StudioBusinessSettings | null);
    await loadItems();
    loading?.setAttribute("hidden", "");
    detail?.removeAttribute("hidden");
    search?.addEventListener("input", renderPicker);
    addSelected?.addEventListener("click", () => void addSelectedArtwork());
    settingsForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(settingsForm);
      const record = Object.fromEntries(["studio_name", "owner_name", "phone", "email", "website", "instagram", "business_address"].map((name) => [name, nullable(data, name)]));
      const { error } = await client.from("studio_business_settings").upsert({ ...record, owner_id: auth.user.id });
      if (error) return showStudioError(error);
      notify("Studio contact block saved.");
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
