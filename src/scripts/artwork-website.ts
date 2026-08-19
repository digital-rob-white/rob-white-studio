import { centsToInput, dollarsToCents, type Artwork } from "../lib/artwork";
import type { FileAsset } from "../lib/journal-types";
import {
  artworkPublicUrl,
  PUBLIC_MEDIA_ROLES,
  publicationReady,
  publicDimensions,
  slugifyArtwork,
  type ArtworkPublication,
  type PublicArtworkMedia
} from "../lib/public-artwork";
import { safeFileName } from "../lib/journal";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const artworkId = new URLSearchParams(window.location.search).get("id");
const form = document.querySelector<HTMLFormElement>("[data-artwork-publishing]");
const loading = document.querySelector<HTMLElement>("[data-publishing-loading]");
const mediaList = document.querySelector<HTMLElement>("[data-publishing-media]");
let client: SupabaseClient;
let user: User;
let artwork: Artwork;
let publication: ArtworkPublication | null = null;
let assets: FileAsset[] = [];
let publicationMedia: PublicArtworkMedia[] = [];

function formText(values: FormData, name: string): string | null {
  return String(values.get(name) || "").trim() || null;
}

function checked(name: string): boolean {
  const field = form?.elements.namedItem(name);
  return field instanceof HTMLInputElement && field.checked;
}

function setChecked(name: string, value: boolean): void {
  const field = form?.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.checked = value;
}

function setValue(name: string, value: unknown): void {
  const field = form?.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value == null ? "" : String(value);
  }
}

function showSuccess(message: string): void {
  const target = document.querySelector<HTMLElement>("[data-publishing-success]");
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  window.setTimeout(() => { target.hidden = true; }, 5000);
}

function sourceDefaults(): ArtworkPublication {
  const frame = artwork.frame_status === "not_applicable"
    ? null
    : [artwork.frame_status.replaceAll("_", " "), artwork.frame_description].filter(Boolean).join(" · ");
  return {
    artwork_id: artwork.id,
    owner_id: user.id,
    publish_to_website: false,
    publication_status: "draft",
    publication_date: null,
    published_at: null,
    featured: false,
    display_order: 0,
    slug: slugifyArtwork(artwork.title),
    public_title: artwork.title,
    public_year: artwork.year,
    public_medium: artwork.medium,
    public_dimensions: publicDimensions(artwork),
    frame_presentation: frame,
    collection_name: artwork.collection_name,
    short_introduction: null,
    artwork_story: artwork.description_public,
    process_notes: null,
    materials_story: artwork.materials_description,
    pull_quote: null,
    related_context: null,
    availability: ["available", "sold"].includes(artwork.availability) ? artwork.availability : "not_for_sale",
    retail_price_cents: artwork.current_retail_price_cents,
    purchase_status: null,
    shipping_status: null,
    local_pickup_available: false,
    commerce_action: artwork.availability === "available" ? "inquire" : "none"
  };
}

function fillPublication(record: ArtworkPublication): void {
  Object.entries(record).forEach(([name, value]) => setValue(name, value));
  setValue("retail_price", record.retail_price_cents == null ? "" : centsToInput(record.retail_price_cents));
  setChecked("publish_to_website", Boolean(record.publish_to_website));
  setChecked("featured", record.featured);
  setChecked("local_pickup_available", record.local_pickup_available);
  const live = document.querySelector<HTMLAnchorElement>("[data-live-page]");
  if (live && record.publication_status === "published" && record.slug) {
    live.href = artworkPublicUrl(record.slug);
    live.hidden = false;
  } else if (live) live.hidden = true;
}

function mediaConfig(asset: FileAsset): PublicArtworkMedia {
  const saved = publicationMedia.find((item) => item.source_file_asset_id === asset.id);
  return saved || {
    artwork_id: artwork.id,
    source_file_asset_id: asset.id,
    public_bucket: "public-artwork",
    public_path: null,
    display_role: asset.id === artwork.primary_image_id ? "primary" : asset.image_tag === "detail" ? "detail" : "full_front",
    alt_text: asset.alt_text || artwork.title,
    caption: asset.caption,
    display_order: asset.display_order,
    hidden: asset.id !== artwork.primary_image_id
  };
}

async function renderMedia(): Promise<void> {
  if (!mediaList) return;
  const cards = await Promise.all(assets.map(async (asset) => {
    const config = mediaConfig(asset);
    const card = document.createElement("article");
    card.className = "publishing-media-card";
    card.dataset.assetId = asset.id;
    const image = document.createElement("img");
    image.src = await signedImageUrl(asset.bucket, asset.path) || "";
    image.alt = asset.alt_text || artwork.title;
    const fields = document.createElement("div");
    fields.className = "publishing-media-fields";
    fields.innerHTML = `
      <label class="studio-check-field"><input type="checkbox" data-media-visible ${config.hidden ? "" : "checked"}> <span>Show publicly</span></label>
      <label>Display role<select data-media-role>${PUBLIC_MEDIA_ROLES.map(([value, label]) => `<option value="${value}"${config.display_role === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Display order<input data-media-order type="number" min="0" step="1" value="${config.display_order}"></label>
      <label>Public alt text<input data-media-alt value=""></label>
      <label>Public caption<textarea data-media-caption rows="3"></textarea></label>`;
    const alt = fields.querySelector<HTMLInputElement>("[data-media-alt]");
    const caption = fields.querySelector<HTMLTextAreaElement>("[data-media-caption]");
    if (alt) alt.value = config.alt_text || "";
    if (caption) caption.value = config.caption || "";
    card.append(image, fields);
    return card;
  }));
  mediaList.replaceChildren(...cards);
  const empty = document.querySelector<HTMLElement>("[data-publishing-media-empty]");
  if (empty) empty.hidden = assets.length > 0;
}

function mediaRows(): Array<PublicArtworkMedia & { asset: FileAsset }> {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-asset-id]")).map((card) => {
    const asset = assets.find((item) => item.id === card.dataset.assetId)!;
    const existing = publicationMedia.find((item) => item.source_file_asset_id === asset.id);
    return {
      artwork_id: artwork.id,
      source_file_asset_id: asset.id,
      public_bucket: "public-artwork",
      public_path: existing?.public_path || null,
      display_role: card.querySelector<HTMLSelectElement>("[data-media-role]")?.value || "primary",
      alt_text: card.querySelector<HTMLInputElement>("[data-media-alt]")?.value.trim() || null,
      caption: card.querySelector<HTMLTextAreaElement>("[data-media-caption]")?.value.trim() || null,
      display_order: Number(card.querySelector<HTMLInputElement>("[data-media-order]")?.value || 0),
      hidden: !card.querySelector<HTMLInputElement>("[data-media-visible]")?.checked,
      asset
    };
  });
}

function publicationPayload(status: string): ArtworkPublication {
  const values = new FormData(form!);
  const price = formText(values, "retail_price");
  return {
    artwork_id: artwork.id,
    owner_id: user.id,
    publish_to_website: status === "published" ? true : checked("publish_to_website"),
    publication_status: status,
    publication_date: formText(values, "publication_date"),
    published_at: publication?.published_at || null,
    featured: checked("featured"),
    display_order: Number(formText(values, "display_order") || 0),
    slug: slugifyArtwork(formText(values, "slug") || "") || null,
    public_title: formText(values, "public_title"),
    public_year: formText(values, "public_year") ? Number(formText(values, "public_year")) : null,
    public_medium: formText(values, "public_medium"),
    public_dimensions: formText(values, "public_dimensions"),
    frame_presentation: formText(values, "frame_presentation"),
    collection_name: formText(values, "collection_name"),
    short_introduction: formText(values, "short_introduction"),
    artwork_story: formText(values, "artwork_story"),
    process_notes: formText(values, "process_notes"),
    materials_story: formText(values, "materials_story"),
    pull_quote: formText(values, "pull_quote"),
    related_context: formText(values, "related_context"),
    availability: formText(values, "availability") || "not_for_sale",
    retail_price_cents: price ? dollarsToCents(price) : null,
    purchase_status: formText(values, "purchase_status"),
    shipping_status: formText(values, "shipping_status"),
    local_pickup_available: checked("local_pickup_available"),
    commerce_action: formText(values, "commerce_action") || "none"
  };
}

async function createPublicCopy(row: PublicArtworkMedia & { asset: FileAsset }): Promise<string> {
  const publicPath = `artwork/${artwork.id}/${row.asset.id}-${safeFileName(row.asset.file_name)}`;
  const download = await client.storage.from(row.asset.bucket).download(row.asset.path);
  if (download.error) throw download.error;
  const upload = await client.storage.from("public-artwork").upload(publicPath, download.data, {
    upsert: true,
    contentType: row.asset.mime_type || undefined,
    cacheControl: "3600"
  });
  if (upload.error) throw upload.error;
  return publicPath;
}

async function syncMedia(status: string, rows: ReturnType<typeof mediaRows>): Promise<void> {
  const savedRows = [];
  for (const row of rows) {
    let publicPath = row.public_path;
    if (status === "published" && !row.hidden) publicPath = await createPublicCopy(row);
    if (status !== "published" && publicPath) {
      const remove = await client.storage.from("public-artwork").remove([publicPath]);
      if (remove.error) throw remove.error;
      publicPath = null;
    }
    savedRows.push({
      artwork_id: row.artwork_id,
      source_file_asset_id: row.source_file_asset_id,
      public_bucket: row.public_bucket,
      public_path: publicPath,
      display_role: row.display_role,
      alt_text: row.alt_text,
      caption: row.caption,
      display_order: row.display_order,
      hidden: row.hidden
    });
  }
  if (!savedRows.length) return;
  const result = await client.from("artwork_public_media").upsert(savedRows, {
    onConflict: "artwork_id,source_file_asset_id"
  }).select("*");
  if (result.error) throw result.error;
  publicationMedia = (result.data || []) as PublicArtworkMedia[];
}

async function save(status: string): Promise<void> {
  const rows = mediaRows();
  const payload = publicationPayload(status);
  if (status === "published") {
    const missing = publicationReady(payload, rows.filter((row) => !row.hidden).length);
    if (missing.length) throw new Error(`Before publishing, add ${missing.join(", ")}.`);
  }
  const stagedStatus = status === "published" ? "ready_for_review" : status;
  const staged = { ...payload, publication_status: stagedStatus, publish_to_website: status === "published" ? false : payload.publish_to_website };
  const publicationResult = await client.from("artwork_publications").upsert(staged, { onConflict: "artwork_id" }).select("*").single();
  if (publicationResult.error) throw publicationResult.error;
  publication = publicationResult.data as ArtworkPublication;
  await syncMedia(status, rows);
  if (status === "published") {
    const finalResult = await client.from("artwork_publications").update({
      publication_status: "published",
      publish_to_website: true
    }).eq("artwork_id", artwork.id).select("*").single();
    if (finalResult.error) throw finalResult.error;
    publication = finalResult.data as ArtworkPublication;
  }
  setValue("publication_status", status);
  setChecked("publish_to_website", status === "published" ? true : payload.publish_to_website);
  fillPublication(publication);
  const labels: Record<string, string> = {
    draft: "Draft saved.",
    ready_for_review: "Ready for website review.",
    published: "Artwork published.",
    hidden: "Artwork hidden from the website.",
    sold_archive: "Artwork moved to the sold archive."
  };
  showSuccess(labels[status] || "Website settings saved.");
}

function wireActions(): void {
  document.querySelector<HTMLButtonElement>("[data-generate-slug]")?.addEventListener("click", () => {
    const title = form?.elements.namedItem("public_title");
    setValue("slug", slugifyArtwork(title instanceof HTMLInputElement ? title.value : artwork.title));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-save-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const original = button.textContent;
      button.textContent = "Saving…";
      try { await save(button.dataset.saveStatus || "draft"); }
      catch (error) { showStudioError(error); }
      finally { button.disabled = false; button.textContent = original; }
    });
  });
  document.querySelector<HTMLButtonElement>("[data-preview-page]")?.addEventListener("click", async () => {
    const previewWindow = window.open("", "_blank");
    try {
      const selectedStatus = form?.elements.namedItem("publication_status");
      const status = selectedStatus instanceof HTMLSelectElement && selectedStatus.value !== "published"
        ? selectedStatus.value : "ready_for_review";
      await save(status);
      const slug = publication?.slug || "preview";
      if (previewWindow) previewWindow.location.href = `${artworkPublicUrl(slug)}?preview=${encodeURIComponent(artwork.id)}`;
    } catch (error) {
      previewWindow?.close();
      showStudioError(error);
    }
  });
}

async function init(): Promise<void> {
  setupStudioSignOut();
  if (!artworkId || !form) return showStudioError(new Error("No artwork was selected."));
  try {
    ({ client, user } = await requireStudioUser());
    const [artworkResult, publicationResult, assetsResult, mediaResult] = await Promise.all([
      client.from("artworks").select("*").eq("id", artworkId).single(),
      client.from("artwork_publications").select("*").eq("artwork_id", artworkId).maybeSingle(),
      client.from("file_assets").select("*").eq("artwork_id", artworkId).order("display_order").order("created_at"),
      client.from("artwork_public_media").select("*").eq("artwork_id", artworkId).order("display_order")
    ]);
    const error = artworkResult.error || publicationResult.error || assetsResult.error || mediaResult.error;
    if (error) throw error;
    artwork = artworkResult.data as Artwork;
    publication = publicationResult.data as ArtworkPublication | null;
    assets = (assetsResult.data || []) as FileAsset[];
    publicationMedia = (mediaResult.data || []) as PublicArtworkMedia[];
    document.querySelector<HTMLElement>("[data-publishing-title]")!.textContent = artwork.title;
    document.querySelector<HTMLAnchorElement>("[data-artwork-back]")!.href = `/studio/artwork/entry?id=${encodeURIComponent(artwork.id)}`;
    fillPublication(publication || sourceDefaults());
    await renderMedia();
    wireActions();
    loading?.setAttribute("hidden", "");
    form.hidden = false;
  } catch (error) {
    loading?.setAttribute("hidden", "");
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
