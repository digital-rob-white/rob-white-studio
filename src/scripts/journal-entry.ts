import { entryTypeLabel, visibilityLabel } from "../lib/journal";
import type { FileAsset, JournalEntry } from "../lib/journal-types";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const content = document.querySelector<HTMLElement>("[data-entry-content]");
const id = new URLSearchParams(window.location.search).get("id");
let entry: JournalEntry;

function text(target: string, value: string): void {
  const element = document.querySelector<HTMLElement>(target);
  if (element) element.textContent = value;
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function removeAsset(client: SupabaseClient, asset: FileAsset): Promise<void> {
  const { count } = await client.from("file_links").select("id", { count: "exact", head: true }).eq("file_asset_id", asset.id);
  if ((count || 0) > 0) return;
  await client.storage.from(asset.bucket).remove([asset.path]);
  await client.from("file_assets").delete().eq("id", asset.id);
}

async function renderImages(): Promise<void> {
  const gallery = document.querySelector<HTMLElement>("[data-entry-gallery]");
  if (!gallery) return;
  for (const asset of entry.file_assets || []) {
    const url = await signedImageUrl(asset.bucket, asset.path);
    if (!url) continue;
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = url;
    image.alt = asset.alt_text || asset.file_name;
    figure.append(image);
    if (asset.caption || asset.alt_text) {
      const caption = document.createElement("figcaption");
      caption.textContent = asset.caption || asset.alt_text;
      figure.append(caption);
    }
    gallery.append(figure);
  }
}

function addDefinition(label: string, value: string | null | undefined): void {
  if (!value) return;
  const list = document.querySelector<HTMLElement>("[data-entry-details]");
  if (!list) return;
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value;
  wrapper.append(term, definition);
  list.append(wrapper);
}

function renderEntry(): void {
  text("[data-entry-type]", entryTypeLabel(entry.entry_type));
  text("[data-entry-visibility]", visibilityLabel(entry.visibility));
  text("[data-entry-title]", entry.title);
  text("[data-entry-body]", entry.body);
  text("[data-entry-created]", `Created ${dateTime(entry.created_at)}`);
  const updated = document.querySelector<HTMLElement>("[data-entry-updated]");
  if (updated && Math.abs(new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime()) > 1000) {
    updated.textContent = `Updated ${dateTime(entry.updated_at)}`;
    updated.hidden = false;
  }
  const pinned = document.querySelector<HTMLElement>("[data-entry-pinned]");
  if (pinned) pinned.hidden = !entry.is_pinned;
  const follow = document.querySelector<HTMLElement>("[data-entry-follow]");
  if (follow) follow.hidden = !entry.follow_up_needed;
  const pinButton = document.querySelector<HTMLButtonElement>("[data-action-pin]");
  if (pinButton) pinButton.textContent = entry.is_pinned ? "Unpin" : "Pin";
  const followButton = document.querySelector<HTMLButtonElement>("[data-action-follow]");
  if (followButton) followButton.textContent = entry.follow_up_needed ? "Complete follow-up" : "Mark for follow-up";
  const visibility = document.querySelector<HTMLSelectElement>("[data-action-visibility]");
  if (visibility) visibility.value = entry.visibility;
  const edit = document.querySelector<HTMLAnchorElement>("[data-action-edit]");
  if (edit) edit.href = `/studio/journal/edit?id=${encodeURIComponent(entry.id)}`;
  addDefinition("Tags", entry.tags.join(" · "));
  addDefinition("Materials", entry.materials_list.join(" · "));
  addDefinition("Location", entry.location);
  addDefinition("Project", entry.project_reference);
  addDefinition("Artwork", entry.artwork_reference);
  addDefinition("Client", entry.client_reference);
  addDefinition("Collector", entry.collector_reference);
  if (entry.follow_up_completed_at) addDefinition("Follow-up completed", dateTime(entry.follow_up_completed_at));
  if (entry.published_at) addDefinition("Public eligibility set", dateTime(entry.published_at));
  if (content) content.hidden = false;
  document.querySelector<HTMLElement>("[data-entry-loading]")?.setAttribute("hidden", "");
  void renderImages();
}

async function initEntry(): Promise<void> {
  setupStudioSignOut();
  try {
    if (!id) throw new Error("No Journal entry was selected.");
    const { client } = await requireStudioUser();
    const { data, error } = await client.from("journal_entries").select("*, file_assets(*)").eq("id", id).single();
    if (error) throw error;
    entry = data as JournalEntry;
    const uploadError = new URLSearchParams(window.location.search).get("uploadError");
    if (uploadError) showStudioError(new Error(`The entry was saved, but one or more photos failed: ${uploadError}`));
    renderEntry();
    document.querySelector<HTMLButtonElement>("[data-action-pin]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      const { error } = await client.from("journal_entries").update({ is_pinned: !entry.is_pinned }).eq("id", entry.id);
      if (error) showStudioError(error); else window.location.reload();
    });
    document.querySelector<HTMLButtonElement>("[data-action-follow]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      const payload = entry.follow_up_needed
        ? { follow_up_needed: false, follow_up_completed_at: new Date().toISOString() }
        : { follow_up_needed: true, follow_up_completed_at: null };
      const { error } = await client.from("journal_entries").update(payload).eq("id", entry.id);
      if (error) showStudioError(error); else window.location.reload();
    });
    document.querySelector<HTMLButtonElement>("[data-action-change-visibility]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const select = document.querySelector<HTMLSelectElement>("[data-action-visibility]");
      if (!select) return;
      button.disabled = true;
      const { error } = await client.from("journal_entries").update({
        visibility: select.value,
        published_at: select.value === "public" ? entry.published_at || new Date().toISOString() : null
      }).eq("id", entry.id);
      if (error) showStudioError(error); else window.location.reload();
    });
    document.querySelector<HTMLButtonElement>("[data-action-delete]")?.addEventListener("click", async (event) => {
      if (!window.confirm("Permanently delete this Journal entry and any photos used only here?")) return;
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      for (const asset of entry.file_assets || []) await removeAsset(client, asset);
      const { error } = await client.from("journal_entries").delete().eq("id", entry.id);
      if (error) {
        showStudioError(error);
        button.disabled = false;
      } else window.location.assign("/studio/journal");
    });
  } catch (error) {
    document.querySelector<HTMLElement>("[data-entry-loading]")?.setAttribute("hidden", "");
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void initEntry();
