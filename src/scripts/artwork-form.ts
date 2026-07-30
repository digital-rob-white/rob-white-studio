import { ARTWORK_TEMPLATES, formatInches, parseInches, type Artwork, validateArtwork } from "../lib/artwork";
import { safeFileName } from "../lib/journal";
import { requireStudioUser, setupStudioSignOut, showStudioError } from "./supabase-client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const form = document.querySelector<HTMLFormElement>("[data-artwork-form]");
const submit = form?.querySelector<HTMLButtonElement>("[data-submit]");
const mode = form?.dataset.mode || "new";
const fileInput = form?.querySelector<HTMLInputElement>("[name=artwork_images]");
let existingArtwork: Artwork | null = null;

function value(values: FormData, name: string): string | null {
  return String(values.get(name) || "").trim() || null;
}

function numeric(values: FormData, name: string): number | null {
  const raw = value(values, name);
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function dimension(values: FormData, name: string): number | null {
  const raw = value(values, name);
  if (raw == null) return null;
  return value(values, "dimension_unit") === "in" ? parseInches(raw) : numeric(values, name);
}

function payload(values: FormData, ownerId: string) {
  return {
    owner_id: ownerId,
    title: value(values, "title") || "",
    inventory_number: value(values, "inventory_number"),
    year: numeric(values, "year"),
    artwork_type: value(values, "artwork_type") || "custom",
    medium: value(values, "medium"),
    materials_description: value(values, "materials_description"),
    width: dimension(values, "width"),
    height: dimension(values, "height"),
    depth: dimension(values, "depth"),
    dimension_unit: value(values, "dimension_unit") || "in",
    weight: numeric(values, "weight"),
    weight_unit: value(values, "weight_unit") || "lb",
    collection_name: value(values, "collection_name"),
    production_status: value(values, "production_status") || "concept",
    availability: value(values, "availability") || "not_for_sale",
    location: value(values, "location"),
    date_started: value(values, "date_started"),
    date_completed: value(values, "date_completed"),
    description_public: value(values, "description_public"),
    notes_private: value(values, "notes_private")
  };
}

function fill(artwork: Artwork): void {
  if (!form) return;
  Object.entries(artwork).forEach(([name, raw]) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = raw == null ? "" : String(raw);
    }
  });
  if (artwork.dimension_unit === "in") {
    form.querySelectorAll<HTMLInputElement>("[data-dimension]").forEach((field) => {
      const raw = artwork[field.name as "width" | "height" | "depth"];
      field.value = formatInches(raw);
    });
  }
}

function configureDimensionInputs(): void {
  if (!form) return;
  const unit = form.elements.namedItem("dimension_unit");
  if (!(unit instanceof HTMLSelectElement)) return;
  const fields = Array.from(form.querySelectorAll<HTMLInputElement>("[data-dimension]"));
  const help = form.querySelector<HTMLElement>("[data-dimension-help]");
  const update = (previousUnit?: string) => {
    const inches = unit.value === "in";
    fields.forEach((field) => {
      if (previousUnit === "in" && !inches) {
        const parsed = parseInches(field.value);
        field.value = parsed == null ? "" : String(parsed);
      } else if (inches && field.value) {
        const parsed = Number(field.value);
        if (Number.isFinite(parsed)) field.value = formatInches(parsed);
      }
      field.placeholder = inches ? "25 3/4" : "25.75";
      field.setAttribute("aria-describedby", "dimension-entry-help");
    });
    if (help) {
      help.id = "dimension-entry-help";
      help.textContent = inches
        ? "Enter inches as a whole number, fraction, or mixed number, such as 25 3/4. Values are saved to the nearest 1/16 inch."
        : "Enter metric dimensions as decimal values.";
    }
  };
  let previousUnit = unit.value;
  unit.addEventListener("change", () => {
    update(previousUnit);
    previousUnit = unit.value;
  });
  fields.forEach((field) => {
    field.addEventListener("blur", () => {
      if (unit.value !== "in" || !field.value) return;
      const parsed = parseInches(field.value);
      if (parsed != null) field.value = formatInches(parsed);
    });
  });
  update();
}

function configureDateInputs(): void {
  if (!form) return;
  form.querySelectorAll<HTMLInputElement>("input[type=date]").forEach((field) => {
    field.addEventListener("click", () => {
      if ("showPicker" in field) field.showPicker();
    });
  });
  form.querySelectorAll<HTMLButtonElement>("[data-clear-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = form.elements.namedItem(button.dataset.clearDate || "");
      if (field instanceof HTMLInputElement) field.value = "";
    });
  });
}

function clearErrors(): void {
  document.querySelectorAll<HTMLElement>("[data-field-error]").forEach((element) => { element.textContent = ""; });
  document.querySelector<HTMLElement>("[data-studio-error]")?.setAttribute("hidden", "");
}

async function uploadImages(client: SupabaseClient, user: User, artworkId: string): Promise<string[]> {
  const files = Array.from(fileInput?.files || []);
  const ids: string[] = [];
  const { data: lastImage, error: orderError } = await client.from("file_assets")
    .select("display_order").eq("artwork_id", artworkId).order("display_order", { ascending: false }).limit(1).maybeSingle();
  if (orderError) throw orderError;
  const firstDisplayOrder = lastImage ? Number(lastImage.display_order || 0) + 1 : 0;
  for (const [index, file] of files.entries()) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
    const path = `${user.id}/artwork/${artworkId}/${Date.now()}-${index}-${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage.from("studio-private").upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data, error } = await client.from("file_assets").insert({
      bucket: "studio-private",
      path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      alt_text: existingArtwork?.title || String(new FormData(form!).get("title") || "Artwork"),
      visibility: "internal",
      artwork_id: artworkId,
      image_tag: index === 0 && !existingArtwork?.primary_image_id ? "primary" : "finished",
      display_order: firstDisplayOrder + index,
      uploaded_by: user.id
    }).select("id").single();
    if (error) {
      await client.storage.from("studio-private").remove([path]);
      throw error;
    }
    ids.push(String(data.id));
  }
  return ids;
}

async function insertTemplateCategories(client: SupabaseClient, artworkId: string, artworkType: string): Promise<void> {
  const names = ARTWORK_TEMPLATES[artworkType] || ARTWORK_TEMPLATES.custom;
  const rows = names.map((name, index) => ({
    artwork_id: artworkId,
    name,
    sort_order: index,
    category_kind:
      name.includes("Framing") || name.includes("Fabrication") ? "framing_fabrication"
        : name === "Outside Services" ? "outside_services"
          : name === "Packaging" ? "packaging"
            : name === "Other" ? "other"
              : "materials"
  }));
  const { error } = await client.from("artwork_cost_categories").insert(rows);
  if (error) throw error;
}

async function init(): Promise<void> {
  setupStudioSignOut();
  if (!form || !submit) return;
  try {
    const { client, user } = await requireStudioUser();
    configureDimensionInputs();
    configureDateInputs();
    const id = new URLSearchParams(window.location.search).get("id");
    if (mode === "edit") {
      if (!id) throw new Error("No artwork was selected.");
      const { data, error } = await client.from("artworks").select("*").eq("id", id).single();
      if (error) throw error;
      existingArtwork = data as Artwork;
      fill(existingArtwork);
      document.querySelectorAll<HTMLAnchorElement>("[data-artwork-back]").forEach((link) => {
        link.href = `/studio/artwork/entry?id=${encodeURIComponent(id)}`;
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors();
      const values = new FormData(form);
      const record = payload(values, user.id);
      const errors = validateArtwork({ title: record.title, inventoryNumber: record.inventory_number || undefined });
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([field, message]) => {
          const target = document.querySelector<HTMLElement>(`[data-field-error="${field}"]`);
          if (target) target.textContent = message;
        });
        return;
      }
      submit.disabled = true;
      submit.textContent = "Saving…";
      try {
        let artworkId = existingArtwork?.id;
        if (artworkId) {
          const { error } = await client.from("artworks").update(record).eq("id", artworkId);
          if (error) throw error;
        } else {
          const { data, error } = await client.from("artworks").insert(record).select("id").single();
          if (error) throw error;
          artworkId = String(data.id);
          await insertTemplateCategories(client, artworkId, record.artwork_type);
        }
        const imageIds = await uploadImages(client, user, artworkId);
        if (!existingArtwork?.primary_image_id && imageIds[0]) {
          const { error } = await client.from("artworks").update({ primary_image_id: imageIds[0] }).eq("id", artworkId);
          if (error) throw error;
        }
        window.location.assign(`/studio/artwork/entry?id=${encodeURIComponent(artworkId)}`);
      } catch (error) {
        showStudioError(error);
        submit.disabled = false;
        submit.textContent = mode === "edit" ? "Save Artwork" : "Create Artwork";
      }
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
