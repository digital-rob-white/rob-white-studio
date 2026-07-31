import { jsPDF } from "jspdf";
import { catalogDimensions, catalogFrame, catalogItemsPerPage, catalogPageCount, catalogPrice, type ArtworkCatalog, type CatalogImage, type CatalogItem, type StudioBusinessSettings } from "../lib/catalogs";
import { requireStudioUser, setupStudioSignOut, showStudioError } from "./supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";

type PreparedItem = CatalogItem & { imageUrl: string; imageData: string; naturalWidth: number; naturalHeight: number };

const pages = document.querySelector<HTMLElement>("[data-preview-pages]");
const exportButton = document.querySelector<HTMLButtonElement>("[data-export-pdf]");
const loading = document.querySelector<HTMLElement>("[data-preview-loading]");
const summary = document.querySelector<HTMLElement>("[data-preview-summary]");
const success = document.querySelector<HTMLElement>("[data-export-success]");
let client: SupabaseClient;
let catalog: ArtworkCatalog;
let settings: StudioBusinessSettings | null = null;
let prepared: PreparedItem[] = [];
let preparedLogo: { data: string; width: number; height: number } | null = null;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function selectedImage(item: CatalogItem, images: CatalogImage[]): CatalogImage | undefined {
  return images.find((image) => image.id === item.selected_image_id)
    || images.find((image) => image.id === item.artwork?.primary_image_id)
    || images.find((image) => image.artwork_id === item.artwork_id);
}

async function urlToDataUrl(url: string): Promise<{ data: string; width: number; height: number }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("An artwork image could not be prepared for export.");
  const blob = await response.blob();
  let source: CanvasImageSource;
  let sourceWidth: number;
  let sourceHeight: number;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    source = bitmap;
    sourceWidth = bitmap.width;
    sourceHeight = bitmap.height;
  } catch {
    const objectUrl = URL.createObjectURL(blob);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    source = image;
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
  }

  const maximumDimension = 3200;
  const scale = Math.min(1, maximumDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("An artwork image could not be prepared for export.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  bitmap?.close();

  return { data: canvas.toDataURL("image/jpeg", 0.94), width, height };
}

function itemText(item: CatalogItem): { title: string; dimensions: string; details: string[]; price: string; caption: string } {
  const artwork = item.artwork!;
  const title = `${item.title_override || artwork.title}${item.year_override || artwork.year ? `, ${item.year_override || artwork.year}` : ""}`;
  return {
    title,
    dimensions: catalogDimensions(artwork, item.dimensions_override),
    details: [
      item.materials_override || artwork.materials_description || artwork.medium || "",
      catalogFrame(item, artwork)
    ].filter(Boolean),
    price: catalogPrice(item, artwork),
    caption: item.caption || ""
  };
}

function contactLines(): string[] {
  if (!settings) return ["Rob White Studio"];
  return [
    settings.studio_name || "Rob White Studio",
    settings.owner_name,
    settings.phone,
    settings.email,
    settings.website,
    settings.instagram
  ].filter(Boolean) as string[];
}

function secondaryContactLines(): string[] {
  return contactLines().slice(1);
}

function renderPreview(): void {
  if (!pages) return;
  const perPage = catalogItemsPerPage(catalog.layout_preset);
  const pageTotal = catalogPageCount(prepared.length, catalog.layout_preset);
  const chunks = Array.from({ length: pageTotal }, (_, index) => prepared.slice(index * perPage, (index + 1) * perPage));
  pages.innerHTML = chunks.map((chunk, pageIndex) => `<section class="catalog-paper ${catalog.layout_preset === "large_image_grid" ? "catalog-paper-large" : ""}">
    ${catalog.show_header ? `<header><div><h2>${escapeHtml(catalog.public_title)}</h2>${catalog.subtitle ? `<p>${escapeHtml(catalog.subtitle)}</p>` : ""}</div><div>${catalog.recipient_name ? `<p>Prepared for ${escapeHtml(catalog.recipient_name)}</p>` : ""}${catalog.display_date ? `<p>${new Date(`${catalog.display_date}T12:00:00`).toLocaleDateString()}</p>` : ""}</div></header>` : ""}
    ${pageIndex === 0 && catalog.intro_text ? `<p class="catalog-paper-intro">${escapeHtml(catalog.intro_text)}</p>` : ""}
    <div class="catalog-paper-grid">${chunk.map((item) => {
      const copy = itemText(item);
      return `<article><div class="catalog-paper-image">${item.imageUrl ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.artwork?.title)}" />` : "<span>Image unavailable</span>"}</div>
        <div class="catalog-paper-copy"><h3>${escapeHtml(copy.title)}</h3>${copy.dimensions ? `<p class="catalog-paper-dimensions">${escapeHtml(copy.dimensions)}</p>` : ""}${copy.details.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${copy.caption ? `<p class="catalog-paper-caption">${escapeHtml(copy.caption)}</p>` : ""}${copy.price ? `<strong>${escapeHtml(copy.price)}</strong>` : ""}</div>
      </article>`;
    }).join("")}</div>
    <footer><span>${pageIndex + 1} / ${pageTotal}</span><div>${secondaryContactLines().map((line) => `<span>${escapeHtml(line)}</span>`).join("")}<img class="catalog-paper-logo" src="/assets/images/rob-white-studio-logo.png" alt="Rob White Studio" /></div></footer>
  </section>`).join("");
  if (summary) {
    summary.textContent = `${prepared.length} artwork${prepared.length === 1 ? "" : "s"} · ${pageTotal} page${pageTotal === 1 ? "" : "s"} · ${catalog.layout_preset === "compact_grid" ? "Compact grid" : "Large image grid"}`;
    summary.hidden = false;
  }
}

function addContainedImage(doc: jsPDF, item: PreparedItem, x: number, y: number, width: number, height: number): number {
  if (!item.imageData || !item.naturalWidth || !item.naturalHeight) {
    doc.setDrawColor(220);
    doc.rect(x, y, width, height);
    doc.setTextColor(130);
    doc.setFontSize(8);
    doc.text("Image unavailable", x + width / 2, y + height / 2, { align: "center" });
    return height;
  }
  const ratio = Math.min(width / item.naturalWidth, height / item.naturalHeight);
  const renderedWidth = item.naturalWidth * ratio;
  const renderedHeight = item.naturalHeight * ratio;
  doc.addImage(item.imageData, "JPEG", x, y, renderedWidth, renderedHeight, undefined, "MEDIUM");
  return renderedHeight;
}

function addHeader(doc: jsPDF): number {
  if (!catalog.show_header) return 0.5;
  doc.setTextColor(24, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(catalog.public_title, 0.55, 0.62);
  if (catalog.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(catalog.subtitle, 0.55, 0.84);
  }
  const right = [catalog.recipient_name ? `Prepared for ${catalog.recipient_name}` : "", catalog.display_date ? new Date(`${catalog.display_date}T12:00:00`).toLocaleDateString() : ""].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  right.forEach((line, index) => doc.text(line, 10.45, 0.6 + index * 0.16, { align: "right" }));
  doc.setDrawColor(222);
  doc.line(0.55, 0.98, 10.45, 0.98);
  return 1.34;
}

function addFooter(doc: jsPDF, pageNumber: number, total: number): void {
  doc.setDrawColor(222);
  doc.line(0.55, 7.78, 10.45, 7.78);
  doc.setTextColor(90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`${pageNumber} / ${total}`, 0.55, 8.0);
  const logoBoxWidth = 0.78;
  const logoBoxHeight = 0.56;
  const logoRight = 10.45;
  const logoTop = 7.84;
  let logoLeft = logoRight;
  if (preparedLogo) {
    const ratio = Math.min(logoBoxWidth / preparedLogo.width, logoBoxHeight / preparedLogo.height);
    const logoWidth = preparedLogo.width * ratio;
    const logoHeight = preparedLogo.height * ratio;
    logoLeft = logoRight - logoWidth;
    doc.addImage(preparedLogo.data, "JPEG", logoLeft, logoTop, logoWidth, logoHeight, undefined, "MEDIUM");
  }
  const lines = secondaryContactLines();
  lines.forEach((line, index) => {
    doc.setFont("helvetica", "normal");
    doc.text(line, logoLeft - 0.12, 7.92 + index * 0.11, { align: "right" });
  });
}

function addItem(doc: jsPDF, item: PreparedItem, x: number, y: number, width: number, height: number, large: boolean): void {
  const copy = itemText(item);
  const imageHeight = large ? height * 0.67 : height * 0.58;
  const renderedImageHeight = addContainedImage(doc, item, x, y, width, imageHeight);
  let textY = y + renderedImageHeight + 0.19;
  doc.setTextColor(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(large ? 9 : 7.5);
  doc.text(doc.splitTextToSize(copy.title, width).slice(0, 2), x, textY);
  textY += large ? 0.28 : 0.22;
  if (copy.dimensions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(large ? 8.5 : 7.2);
    const wrapped = doc.splitTextToSize(copy.dimensions, width).slice(0, 3);
    doc.text(wrapped, x, textY);
    textY += wrapped.length * (large ? 0.16 : 0.13);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(large ? 7 : 6.2);
  for (const line of copy.details) {
    const wrapped = doc.splitTextToSize(line, width).slice(0, 2);
    doc.text(wrapped, x, textY);
    textY += wrapped.length * (large ? 0.12 : 0.1);
  }
  if (copy.price) {
    doc.setFont("helvetica", "bold");
    doc.text(copy.price, x, Math.min(y + height - 0.04, textY + 0.07));
  }
}

function createPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "in", format: "letter", compress: true });
  const perPage = catalogItemsPerPage(catalog.layout_preset);
  const total = catalogPageCount(prepared.length, catalog.layout_preset);
  const large = catalog.layout_preset === "large_image_grid";
  for (let pageIndex = 0; pageIndex < total; pageIndex += 1) {
    if (pageIndex) doc.addPage("letter", "landscape");
    const contentTop = addHeader(doc);
    const introHeight = pageIndex === 0 && catalog.intro_text ? 0.42 : 0;
    if (introHeight) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(70);
      doc.text(doc.splitTextToSize(catalog.intro_text || "", 9.9).slice(0, 3), 0.55, contentTop);
    }
    const top = contentTop + introHeight;
    const columns = large ? 2 : 4;
    const rows = 2;
    const gapX = large ? 0.34 : 0.22;
    const gapY = 0.24;
    const contentWidth = 9.9;
    const contentHeight = 7.55 - top;
    const cellWidth = (contentWidth - gapX * (columns - 1)) / columns;
    const cellHeight = (contentHeight - gapY * (rows - 1)) / rows;
    prepared.slice(pageIndex * perPage, (pageIndex + 1) * perPage).forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      addItem(doc, item, 0.55 + column * (cellWidth + gapX), top + row * (cellHeight + gapY), cellWidth, cellHeight, large);
    });
    addFooter(doc, pageIndex + 1, total);
  }
  return doc;
}

async function exportPdf(): Promise<void> {
  if (!exportButton) return;
  exportButton.disabled = true;
  exportButton.textContent = "Building PDF…";
  try {
    const doc = createPdf();
    const fileName = `${catalog.internal_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "artwork-catalog"}.pdf`;
    doc.save(fileName);
    const exportedAt = new Date().toISOString();
    const { error } = await client.from("artwork_catalogs").update({ latest_export_at: exportedAt }).eq("id", catalog.id);
    if (error) throw error;
    if (success) {
      success.textContent = `PDF exported as ${fileName}.`;
      success.hidden = false;
    }
  } catch (error) {
    showStudioError(error);
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = "Export PDF";
  }
}

async function init(): Promise<void> {
  setupStudioSignOut();
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return showStudioError("No catalog was selected.");
  try {
    const auth = await requireStudioUser();
    client = auth.client;
    const [{ data: catalogData, error: catalogError }, { data: itemData, error: itemError }, { data: imageData, error: imageError }, { data: settingsData }] = await Promise.all([
      client.from("artwork_catalogs").select("*").eq("id", id).single(),
      client.from("artwork_catalog_items").select("*, artwork:artworks(*, artwork_pricing_scenarios(scenario_name,listed_price_cents))").eq("catalog_id", id).order("display_order"),
      client.from("file_assets").select("id,artwork_id,bucket,path,file_name,alt_text,display_order").not("artwork_id", "is", null).order("display_order"),
      client.from("studio_business_settings").select("*").eq("owner_id", auth.user.id).maybeSingle()
    ]);
    if (catalogError) throw catalogError;
    if (itemError) throw itemError;
    if (imageError) throw imageError;
    catalog = catalogData as ArtworkCatalog;
    settings = settingsData as StudioBusinessSettings | null;
    const itemRows = itemData as CatalogItem[];
    const imageRows = imageData as CatalogImage[];
    prepared = await Promise.all(itemRows.map(async (item) => {
      const image = selectedImage(item, imageRows);
      if (!image) return { ...item, imageUrl: "", imageData: "", naturalWidth: 0, naturalHeight: 0 };
      const { data } = await client.storage.from(image.bucket).createSignedUrl(image.path, 3600);
      const imageUrl = data?.signedUrl || "";
      if (!imageUrl) return { ...item, imageUrl: "", imageData: "", naturalWidth: 0, naturalHeight: 0 };
      const converted = await urlToDataUrl(imageUrl);
      return { ...item, imageUrl, imageData: converted.data, naturalWidth: converted.width, naturalHeight: converted.height };
    }));
    preparedLogo = await urlToDataUrl("/assets/images/rob-white-studio-logo.png").catch(() => null);
    document.querySelector<HTMLElement>("[data-preview-title]")!.textContent = catalog.public_title;
    document.querySelector<HTMLAnchorElement>("[data-catalog-back]")!.href = `/studio/artwork/catalogs/entry?id=${id}`;
    renderPreview();
    loading?.setAttribute("hidden", "");
    exportButton!.disabled = false;
    exportButton?.addEventListener("click", () => void exportPdf());
    if (new URLSearchParams(location.search).get("export") === "1") void exportPdf();
  } catch (error) {
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
