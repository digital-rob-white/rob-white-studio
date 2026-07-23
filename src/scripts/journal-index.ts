import { entryTypeLabel, visibilityLabel } from "../lib/journal";
import type { JournalEntry } from "../lib/journal-types";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";

const list = document.querySelector<HTMLElement>("[data-journal-list]");
const loading = document.querySelector<HTMLElement>("[data-journal-loading]");
const empty = document.querySelector<HTMLElement>("[data-journal-empty]");
const search = document.querySelector<HTMLInputElement>("[data-filter-search]");
const visibility = document.querySelector<HTMLSelectElement>("[data-filter-visibility]");
const entryType = document.querySelector<HTMLSelectElement>("[data-filter-type]");
const status = document.querySelector<HTMLSelectElement>("[data-filter-status]");
const clear = document.querySelector<HTMLButtonElement>("[data-filter-clear]");
let entries: JournalEntry[] = [];
let renderRevision = 0;

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function matches(entry: JournalEntry): boolean {
  const query = search?.value.trim().toLowerCase() || "";
  const searchable = [entry.title, entry.body, ...entry.tags, ...entry.materials_list, entry.project_reference, entry.artwork_reference, entry.client_reference, entry.collector_reference]
    .filter(Boolean).join(" ").toLowerCase();
  return (!query || searchable.includes(query))
    && (!visibility || visibility.value === "all" || entry.visibility === visibility.value)
    && (!entryType || entryType.value === "all" || entry.entry_type === entryType.value)
    && (!status || status.value === "all" || (status.value === "pinned" && entry.is_pinned) || (status.value === "follow_up" && entry.follow_up_needed));
}

function appendText(parent: HTMLElement, tag: string, text: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

async function renderCard(entry: JournalEntry): Promise<HTMLElement> {
  const link = document.createElement("a");
  link.className = "studio-entry-card";
  link.href = `/studio/journal/entry?id=${encodeURIComponent(entry.id)}`;

  const content = document.createElement("div");
  const meta = document.createElement("div");
  meta.className = "studio-meta-row";
  appendText(meta, "span", entryTypeLabel(entry.entry_type));
  appendText(meta, "span", visibilityLabel(entry.visibility));
  content.append(meta);
  appendText(content, "h2", entry.title);
  appendText(content, "p", entry.body.length > 220 ? `${entry.body.slice(0, 220).trim()}…` : entry.body, "studio-entry-preview");
  const detail = document.createElement("div");
  detail.className = "studio-chip-row";
  appendText(detail, "span", `Created ${dateLabel(entry.created_at)}`);
  if (Math.abs(new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime()) > 1000) appendText(detail, "span", `Updated ${dateLabel(entry.updated_at)}`);
  entry.tags.forEach((tag) => appendText(detail, "span", tag, "studio-chip"));
  content.append(detail);
  link.append(content);

  const flags = document.createElement("div");
  flags.className = "studio-entry-flags";
  const images = entry.file_assets || [];
  if (images[0]) {
    const url = await signedImageUrl(images[0].bucket, images[0].path);
    if (url) {
      const image = document.createElement("img");
      image.className = "studio-entry-thumb";
      image.src = url;
      image.alt = images[0].alt_text || images[0].file_name;
      flags.append(image);
    }
  }
  if (images.length > 1) appendText(flags, "span", `${images.length} photos`);
  if (entry.is_pinned) appendText(flags, "span", "◆ Pinned");
  if (entry.follow_up_needed) appendText(flags, "span", "○ Follow-up");
  link.append(flags);
  return link;
}

async function render(): Promise<void> {
  if (!list || !empty) return;
  const revision = ++renderRevision;
  const filtered = entries.filter(matches);
  const cards = await Promise.all(filtered.map(renderCard));
  if (revision !== renderRevision) return;
  list.replaceChildren(...cards);
  empty.hidden = filtered.length > 0;
}

async function initJournalIndex(): Promise<void> {
  setupStudioSignOut();
  try {
    const { client } = await requireStudioUser();
    const { data, error } = await client
      .from("journal_entries")
      .select("*, file_assets(id,bucket,path,file_name,mime_type,file_size,alt_text,caption,visibility,journal_entry_id,created_at)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    entries = (data || []) as JournalEntry[];
    if (loading) loading.hidden = true;
    await render();
    [search, visibility, entryType, status].forEach((control) => control?.addEventListener(control === search ? "input" : "change", () => void render()));
    clear?.addEventListener("click", () => {
      if (search) search.value = "";
      if (visibility) visibility.value = "all";
      if (entryType) entryType.value = "all";
      if (status) status.value = "all";
      void render();
    });
  } catch (error) {
    if (loading) loading.hidden = true;
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void initJournalIndex();
