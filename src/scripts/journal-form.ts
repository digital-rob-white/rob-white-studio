import { safeFileName, splitTerms, validateJournalEntry } from "../lib/journal";
import type { FileAsset, JournalEntry } from "../lib/journal-types";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const form = document.querySelector<HTMLFormElement>("[data-journal-form]");
const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
const fileInput = form?.querySelector<HTMLInputElement>('input[name="photos"]');
const previews = document.querySelector<HTMLElement>("[data-photo-previews]");
const existingImages = document.querySelector<HTMLElement>("[data-existing-images]");
const formMode = form?.dataset.mode || "new";
let existingEntry: JournalEntry | null = null;
let existingAssets: FileAsset[] = [];
let previewUrls: string[] = [];

function setField(name: string, value: string | boolean | null): void {
  const control = form?.elements.namedItem(name);
  if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = Boolean(value);
  else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) control.value = String(value ?? "");
}

function clearFieldErrors(): void {
  document.querySelectorAll<HTMLElement>("[data-field-error]").forEach((element) => {
    element.hidden = true;
    element.textContent = "";
  });
  document.querySelector<HTMLElement>("[data-studio-error]")?.setAttribute("hidden", "");
}

function showFieldError(name: string, message: string): void {
  const element = document.querySelector<HTMLElement>(`[data-field-error="${name}"]`);
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

function renderNewPreviews(): void {
  if (!previews || !fileInput) return;
  previewUrls.forEach(URL.revokeObjectURL);
  previewUrls = [];
  previews.replaceChildren();
  Array.from(fileInput.files || []).forEach((file, index) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const card = document.createElement("div");
    card.className = "studio-photo-card";
    const image = document.createElement("img");
    image.src = url;
    image.alt = "New upload preview";
    card.append(image);
    const altLabel = document.createElement("label");
    altLabel.textContent = "Alt text";
    const alt = document.createElement("input");
    alt.name = `photo_alt_${index}`;
    alt.placeholder = "Describe what is visible";
    altLabel.append(alt);
    card.append(altLabel);
    const captionLabel = document.createElement("label");
    captionLabel.textContent = "Caption";
    const caption = document.createElement("input");
    caption.name = `photo_caption_${index}`;
    caption.placeholder = "Optional studio context";
    captionLabel.append(caption);
    card.append(captionLabel);
    previews.append(card);
  });
}

async function renderExistingAssets(): Promise<void> {
  if (!existingImages) return;
  existingImages.replaceChildren();
  for (const asset of existingAssets) {
    const card = document.createElement("div");
    card.className = "studio-photo-card";
    const url = await signedImageUrl(asset.bucket, asset.path);
    if (url) {
      const image = document.createElement("img");
      image.src = url;
      image.alt = asset.alt_text || asset.file_name;
      card.append(image);
    }
    const label = document.createElement("label");
    label.className = "studio-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "remove_image";
    checkbox.value = asset.id;
    label.append(checkbox, document.createTextNode(" Remove this image"));
    card.append(label);
    existingImages.append(card);
  }
}

function fillEntry(entry: JournalEntry): void {
  setField("title", entry.title);
  setField("body", entry.body);
  setField("visibility", entry.visibility);
  setField("entry_type", entry.entry_type);
  setField("tags", entry.tags.join(", "));
  setField("materials", entry.materials_list.join(", "));
  setField("location", entry.location);
  setField("project_reference", entry.project_reference);
  setField("artwork_reference", entry.artwork_reference);
  setField("client_reference", entry.client_reference);
  setField("collector_reference", entry.collector_reference);
  setField("follow_up_needed", entry.follow_up_needed);
  setField("is_pinned", entry.is_pinned);
}

async function removeSelectedAssets(client: SupabaseClient): Promise<void> {
  if (!form) return;
  const ids = new FormData(form).getAll("remove_image").map(String);
  for (const id of ids) {
    const asset = existingAssets.find((item) => item.id === id);
    if (!asset) continue;
    const { count } = await client.from("file_links").select("id", { count: "exact", head: true }).eq("file_asset_id", id);
    if ((count || 0) > 0) {
      await client.from("file_assets").update({ journal_entry_id: null }).eq("id", id);
    } else {
      const { error: storageError } = await client.storage.from(asset.bucket).remove([asset.path]);
      if (storageError) throw storageError;
      const { error: rowError } = await client.from("file_assets").delete().eq("id", id);
      if (rowError) throw rowError;
    }
  }
}

async function uploadPhotos(client: SupabaseClient, user: User, entryId: string): Promise<string[]> {
  const failures: string[] = [];
  const files = Array.from(fileInput?.files || []);
  for (const [index, file] of files.entries()) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      failures.push(`${file.name}: unsupported image type`);
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      failures.push(`${file.name}: larger than 10 MB`);
      continue;
    }
    const path = `${user.id}/journal/${entryId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage.from("studio-private").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      failures.push(`${file.name}: ${uploadError.message}`);
      continue;
    }
    const alt = String(form?.elements.namedItem(`photo_alt_${index}`) instanceof HTMLInputElement ? (form.elements.namedItem(`photo_alt_${index}`) as HTMLInputElement).value : "").trim();
    const caption = String(form?.elements.namedItem(`photo_caption_${index}`) instanceof HTMLInputElement ? (form.elements.namedItem(`photo_caption_${index}`) as HTMLInputElement).value : "").trim();
    const { error: assetError } = await client.from("file_assets").insert({
      bucket: "studio-private", path, file_name: file.name, mime_type: file.type, file_size: file.size,
      alt_text: alt || null, caption: caption || null, visibility: "internal", journal_entry_id: entryId, uploaded_by: user.id
    });
    if (assetError) {
      await client.storage.from("studio-private").remove([path]);
      failures.push(`${file.name}: ${assetError.message}`);
    }
  }
  return failures;
}

function entryPayload(values: FormData) {
  const followUpNeeded = values.get("follow_up_needed") === "on";
  const wasFollowUp = existingEntry?.follow_up_needed || false;
  return {
    title: String(values.get("title") || "").trim(),
    body: String(values.get("body") || "").trim(),
    entry_type: String(values.get("entry_type") || "note"),
    visibility: String(values.get("visibility") || "internal"),
    tags: splitTerms(String(values.get("tags") || "")),
    materials_list: splitTerms(String(values.get("materials") || "")),
    location: String(values.get("location") || "").trim() || null,
    project_reference: String(values.get("project_reference") || "").trim() || null,
    artwork_reference: String(values.get("artwork_reference") || "").trim() || null,
    client_reference: String(values.get("client_reference") || "").trim() || null,
    collector_reference: String(values.get("collector_reference") || "").trim() || null,
    follow_up_needed: followUpNeeded,
    follow_up_completed_at: !followUpNeeded && wasFollowUp ? new Date().toISOString() : followUpNeeded ? null : existingEntry?.follow_up_completed_at || null,
    is_pinned: values.get("is_pinned") === "on",
    published_at: String(values.get("visibility")) === "public" ? existingEntry?.published_at || new Date().toISOString() : null
  };
}

async function initJournalForm(): Promise<void> {
  setupStudioSignOut();
  if (!form || !submit) return;
  try {
    const { client, user } = await requireStudioUser();
    if (formMode === "edit") {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) throw new Error("No Journal entry was selected.");
      const { data, error } = await client.from("journal_entries").select("*, file_assets(*)").eq("id", id).single();
      if (error) throw error;
      existingEntry = data as JournalEntry;
      existingAssets = existingEntry.file_assets || [];
      fillEntry(existingEntry);
      await renderExistingAssets();
      const cancel = document.querySelector<HTMLAnchorElement>("[data-form-cancel]");
      if (cancel) cancel.href = `/studio/journal/entry?id=${encodeURIComponent(id)}`;
    }
    document.querySelector<HTMLElement>("[data-form-loading]")?.setAttribute("hidden", "");
    form.hidden = false;
    fileInput?.addEventListener("change", renderNewPreviews);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFieldErrors();
      const values = new FormData(form);
      const payload = entryPayload(values);
      const errors = validateJournalEntry(payload);
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([field, message]) => showFieldError(field, message));
        return;
      }
      submit.disabled = true;
      submit.textContent = "Saving…";
      try {
        let entryId = existingEntry?.id;
        if (entryId) {
          const { error } = await client.from("journal_entries").update(payload).eq("id", entryId);
          if (error) throw error;
          await removeSelectedAssets(client);
        } else {
          const { data, error } = await client.from("journal_entries").insert(payload).select("id").single();
          if (error) throw error;
          entryId = String(data.id);
        }
        const failures = await uploadPhotos(client, user, entryId);
        const notice = failures.length ? `&uploadError=${encodeURIComponent(failures.join("; "))}` : "";
        window.location.assign(`/studio/journal/entry?id=${encodeURIComponent(entryId)}${notice}`);
      } catch (error) {
        showStudioError(error);
        submit.disabled = false;
        submit.textContent = "Save entry";
      }
    });
  } catch (error) {
    document.querySelector<HTMLElement>("[data-form-loading]")?.setAttribute("hidden", "");
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

window.addEventListener("beforeunload", () => previewUrls.forEach(URL.revokeObjectURL));
void initJournalForm();
