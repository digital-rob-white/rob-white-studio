import {
  activityDateGroup,
  activityMatches,
  activityPresentation,
  type ActivityFilter,
  type StudioActivity
} from "../lib/studio-feed";
import type { FileAsset } from "../lib/journal-types";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";

const PAGE_SIZE = 50;
const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Last Week", "Earlier"] as const;
const list = document.querySelector<HTMLElement>("[data-feed-list]");
const loading = document.querySelector<HTMLElement>("[data-feed-loading]");
const empty = document.querySelector<HTMLElement>("[data-feed-empty]");
const emptyTitle = document.querySelector<HTMLElement>("[data-feed-empty-title]");
const emptyCopy = document.querySelector<HTMLElement>("[data-feed-empty-copy]");
const search = document.querySelector<HTMLInputElement>("[data-feed-search]");
const filterControls = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-feed-filter]"));
const loadMore = document.querySelector<HTMLButtonElement>("[data-feed-more]");
const activities: StudioActivity[] = [];
let activeFilter: ActivityFilter = "all";
let totalActivities = 0;
let renderRevision = 0;
let client: Awaited<ReturnType<typeof requireStudioUser>>["client"];
const assets = new Map<string, FileAsset>();
const imageUrls = new Map<string, string>();

function appendText(parent: HTMLElement, tag: string, value: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function timestamp(value: string, group: string): string {
  const date = new Date(value);
  if (group === "Earlier") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: group === "Today" || group === "Yesterday" ? undefined : "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

async function activityThumbnail(activity: StudioActivity): Promise<HTMLImageElement | null> {
  if (!activity.thumbnail_asset_id) return null;
  const asset = assets.get(activity.thumbnail_asset_id);
  if (!asset) return null;
  let url = imageUrls.get(asset.id);
  if (!url) {
    url = await signedImageUrl(asset.bucket, asset.path) || undefined;
    if (url) imageUrls.set(asset.id, url);
  }
  if (!url) return null;
  const image = document.createElement("img");
  image.className = "studio-feed-thumb";
  image.src = url;
  image.alt = asset.alt_text || asset.file_name;
  return image;
}

async function renderActivity(activity: StudioActivity, group: string): Promise<HTMLElement> {
  const card = document.createElement(activity.destination ? "a" : "article");
  card.className = "studio-feed-card";
  if (card instanceof HTMLAnchorElement && activity.destination) card.href = activity.destination;

  const presentation = activityPresentation(activity.activity_type);
  const glyph = document.createElement("span");
  glyph.className = "studio-feed-glyph";
  glyph.textContent = presentation.glyph;
  glyph.setAttribute("aria-hidden", "true");
  card.append(glyph);

  const content = document.createElement("div");
  appendText(content, "p", presentation.label, "studio-feed-kind");
  appendText(content, "h3", activity.object_label || activity.title);
  if (activity.description) appendText(content, "p", activity.description, "studio-feed-description");
  appendText(content, "time", timestamp(activity.created_at, group), "studio-feed-time").setAttribute("datetime", activity.created_at);
  card.append(content);

  const thumbnail = await activityThumbnail(activity);
  if (thumbnail) card.append(thumbnail);
  return card;
}

async function render(): Promise<void> {
  if (!list || !empty) return;
  const revision = ++renderRevision;
  const filtered = activities.filter((activity) => activityMatches(activity, search?.value || "", activeFilter));
  const grouped = new Map<string, StudioActivity[]>();
  filtered.forEach((activity) => {
    const group = activityDateGroup(activity.created_at);
    grouped.set(group, [...(grouped.get(group) || []), activity]);
  });

  const sections = await Promise.all(GROUP_ORDER.filter((group) => grouped.has(group)).map(async (group) => {
    const section = document.createElement("section");
    section.className = "studio-feed-day";
    const headingId = `feed-${group.toLowerCase().replace(" ", "-")}`;
    section.setAttribute("aria-labelledby", headingId);
    const heading = appendText(section, "h2", group);
    heading.id = headingId;
    const cards = await Promise.all((grouped.get(group) || []).map((activity) => renderActivity(activity, group)));
    const cardList = document.createElement("div");
    cardList.className = "studio-feed-cards";
    cardList.append(...cards);
    section.append(cardList);
    return section;
  }));
  if (revision !== renderRevision) return;

  list.replaceChildren(...sections);
  empty.hidden = filtered.length > 0;
  if (!filtered.length && activities.length) {
    if (emptyTitle) emptyTitle.textContent = "No matching activity";
    if (emptyCopy) emptyCopy.textContent = "Try another search or choose a different activity filter.";
  } else {
    if (emptyTitle) emptyTitle.textContent = "Nothing has happened yet.";
    if (emptyCopy) emptyCopy.textContent = "As you work inside the Studio, important activity will appear here.";
  }
  if (loadMore) loadMore.hidden = activities.length >= totalActivities;
}

async function fetchAssets(): Promise<void> {
  const ids = Array.from(new Set(activities.map((activity) => activity.thumbnail_asset_id).filter((id): id is string => Boolean(id))));
  const missing = ids.filter((id) => !assets.has(id));
  if (!missing.length) return;
  const { data, error } = await client.from("file_assets")
    .select("id,bucket,path,file_name,mime_type,file_size,alt_text,caption,visibility,journal_entry_id,created_at")
    .in("id", missing);
  if (error) throw error;
  ((data || []) as FileAsset[]).forEach((asset) => assets.set(asset.id, asset));
}

async function fetchActivities(): Promise<void> {
  const from = activities.length;
  const { data, error, count } = await client.from("studio_activities")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  activities.push(...((data || []) as StudioActivity[]));
  totalActivities = count || activities.length;
  await fetchAssets();
}

async function initStudioFeed(): Promise<void> {
  setupStudioSignOut();
  try {
    ({ client } = await requireStudioUser());
    await fetchActivities();
    if (loading) loading.hidden = true;
    await render();
    search?.addEventListener("input", () => void render());
    filterControls.forEach((control) => control.addEventListener("click", () => {
      activeFilter = control.dataset.feedFilter as ActivityFilter;
      filterControls.forEach((button) => {
        const selected = button === control;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      void render();
    }));
    loadMore?.addEventListener("click", async () => {
      loadMore.disabled = true;
      loadMore.textContent = "Loading…";
      try {
        await fetchActivities();
        await render();
      } catch (error) {
        showStudioError(error);
      } finally {
        loadMore.disabled = false;
        loadMore.textContent = "Load More";
      }
    });
  } catch (error) {
    if (loading) loading.hidden = true;
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void initStudioFeed();
