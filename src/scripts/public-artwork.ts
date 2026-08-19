import { getSupabase, requireStudioUser } from "./supabase-client";
import { publicPrice, type ArtworkPublication, type PublicArtworkMedia } from "../lib/public-artwork";

const page = document.querySelector<HTMLElement>("[data-public-artwork]");
const loading = document.querySelector<HTMLElement>("[data-public-loading]");
const notFound = document.querySelector<HTMLElement>("[data-public-not-found]");

function setText(selector: string, value: string | null | undefined): void {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return;
  target.textContent = value || "";
  if (value) target.hidden = false;
}

function addFact(list: HTMLDListElement, label: string, value: string | number | null | undefined): void {
  if (value == null || value === "") return;
  const group = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = String(value);
  group.append(term, description);
  list.append(group);
}

function paragraphs(target: HTMLElement, value: string | null): void {
  target.replaceChildren(...String(value || "").split(/\n{2,}/).filter(Boolean).map((copy) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = copy.trim();
    return paragraph;
  }));
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function loadPreview(artworkId: string): Promise<{ publication: ArtworkPublication; media: PublicArtworkMedia[] } | null> {
  const { client } = await requireStudioUser();
  const [publicationResult, mediaResult] = await Promise.all([
    client.from("artwork_publications").select("*").eq("artwork_id", artworkId).maybeSingle(),
    client.from("artwork_public_media").select("*").eq("artwork_id", artworkId).eq("hidden", false).order("display_order")
  ]);
  if (publicationResult.error) throw publicationResult.error;
  if (mediaResult.error) throw mediaResult.error;
  if (!publicationResult.data) return null;
  const media = await Promise.all((mediaResult.data || []).map(async (item) => {
    const { data: asset, error } = await client.from("file_assets")
      .select("bucket,path").eq("id", item.source_file_asset_id).single();
    if (error) throw error;
    const { data } = await client.storage.from(asset.bucket).createSignedUrl(asset.path, 60 * 60);
    return { ...item, url: data?.signedUrl || "" } as PublicArtworkMedia;
  }));
  document.querySelector<HTMLElement>("[data-preview-ribbon]")?.removeAttribute("hidden");
  return { publication: publicationResult.data as ArtworkPublication, media };
}

async function loadPublished(slug: string): Promise<{ publication: ArtworkPublication; media: PublicArtworkMedia[] } | null> {
  const client = getSupabase();
  const publicationResult = await client.from("public_artwork_pages").select("*").eq("slug", slug).maybeSingle();
  if (publicationResult.error) throw publicationResult.error;
  if (!publicationResult.data) return null;
  const mediaResult = await client.from("public_artwork_media").select("*")
    .eq("artwork_id", publicationResult.data.artwork_id).order("display_order");
  if (mediaResult.error) throw mediaResult.error;
  const media = (mediaResult.data || []).map((item) => ({
    ...item,
    url: client.storage.from(item.public_bucket).getPublicUrl(item.public_path).data.publicUrl
  })) as PublicArtworkMedia[];
  return { publication: publicationResult.data as ArtworkPublication, media };
}

function render(publication: ArtworkPublication, media: PublicArtworkMedia[]): void {
  document.title = `${publication.public_title} | Rob White Studio`;
  setText("[data-public-title]", publication.public_title);
  setText("[data-public-collection]", publication.collection_name || "Original artwork");
  setText("[data-public-introduction]", publication.short_introduction);

  const facts = document.querySelector<HTMLDListElement>("[data-public-facts]");
  if (facts) {
    addFact(facts, "Year", publication.public_year);
    addFact(facts, "Medium", publication.public_medium);
    addFact(facts, "Dimensions", publication.public_dimensions);
    addFact(facts, "Presentation", publication.frame_presentation);
  }

  const gallery = document.querySelector<HTMLElement>("[data-public-gallery]");
  if (gallery) gallery.replaceChildren(...media.map((item, index) => {
    const figure = document.createElement("figure");
    figure.className = `public-artwork-image public-artwork-image-${item.display_role}`;
    const image = document.createElement("img");
    image.src = item.url || "";
    image.alt = item.alt_text || publication.public_title || "Artwork by Rob White";
    if (index === 0) image.fetchPriority = "high";
    else image.loading = "lazy";
    figure.append(image);
    if (item.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = item.caption;
      figure.append(caption);
    }
    return figure;
  }));

  const narrative = [
    ["[data-public-story-section]", "[data-public-story]", publication.artwork_story],
    ["[data-public-process-section]", "[data-public-process]", publication.process_notes],
    ["[data-public-materials-section]", "[data-public-materials]", publication.materials_story],
    ["[data-public-context-section]", "[data-public-context]", publication.related_context]
  ] as const;
  narrative.forEach(([sectionSelector, bodySelector, value]) => {
    if (!value) return;
    document.querySelector<HTMLElement>(sectionSelector)?.removeAttribute("hidden");
    const target = document.querySelector<HTMLElement>(bodySelector);
    if (target) paragraphs(target, value);
  });
  setText("[data-public-quote]", publication.pull_quote);

  setText("[data-public-availability]", label(publication.availability));
  const price = publicPrice(publication.retail_price_cents);
  setText("[data-public-price]", price);
  const notes = [publication.purchase_status, publication.shipping_status, publication.local_pickup_available ? "Local pickup available." : null]
    .filter(Boolean).join(" ");
  setText("[data-public-commerce-notes]", notes);
  const action = document.querySelector<HTMLAnchorElement>("[data-public-action]");
  if (action && publication.commerce_action !== "none") {
    action.textContent = publication.commerce_action === "purchase" ? "Purchase this artwork" : "Inquire about this artwork";
    action.href = `mailto:rob@robwhitestudio.com?subject=${encodeURIComponent(`${label(publication.commerce_action)}: ${publication.public_title}`)}`;
    action.hidden = false;
  }
  loading?.setAttribute("hidden", "");
  if (page) page.hidden = false;
}

async function init(): Promise<void> {
  try {
    const params = new URLSearchParams(window.location.search);
    const previewId = params.get("preview");
    const slug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] || "");
    const result = previewId ? await loadPreview(previewId) : await loadPublished(slug);
    if (!result) {
      loading?.setAttribute("hidden", "");
      notFound?.removeAttribute("hidden");
      return;
    }
    render(result.publication, result.media);
  } catch {
    loading?.setAttribute("hidden", "");
    notFound?.removeAttribute("hidden");
  }
}

void init();
