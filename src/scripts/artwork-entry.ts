import {
  allocatedCost,
  centsToInput,
  dollarsToCents,
  laborTotal,
  money,
  pricingIndicator,
  pricingOutcome,
  type Artwork,
  type CostEntry,
  type LaborEntry,
  type PricingScenario
} from "../lib/artwork";
import { activityPresentation, type StudioActivity } from "../lib/studio-feed";
import type { FileAsset, JournalEntry } from "../lib/journal-types";
import { requireStudioUser, setupStudioSignOut, showStudioError, signedImageUrl } from "./supabase-client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type Category = { id: string; artwork_id: string; name: string; category_kind: string; sort_order: number };
type PriceHistory = { id: string; price_cents: number; price_type: string; effective_date: string; end_date: string | null; reason: string | null };

const id = new URLSearchParams(window.location.search).get("id");
const detail = document.querySelector<HTMLElement>("[data-artwork-detail]");
const loading = document.querySelector<HTMLElement>("[data-artwork-loading]");
let client: SupabaseClient;
let user: User;
let artwork: Artwork;
let categories: Category[] = [];
let costs: CostEntry[] = [];
let labor: LaborEntry[] = [];
let scenarios: PricingScenario[] = [];
let history: PriceHistory[] = [];
let editingCostId: string | null = null;

const text = (selector: string, value: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
};
const formatLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formValue = (values: FormData, key: string) => String(values.get(key) || "").trim();
const numberValue = (values: FormData, key: string) => Number(formValue(values, key) || 0);
const optionalNumber = (values: FormData, key: string) => formValue(values, key) ? numberValue(values, key) : null;

function addDefinition(list: HTMLDListElement, term: string, value: unknown): void {
  if (value == null || value === "") return;
  const group = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  dd.textContent = String(value);
  group.append(dt, dd);
  list.append(group);
}

function cashCost(): number {
  return costs.reduce((sum, entry) => sum + entry.allocated_cost_cents, 0);
}
function laborValue(): number {
  return labor.reduce((sum, entry) => sum + entry.labor_total_cents, 0);
}

function renderSummary(): void {
  const target = document.querySelector<HTMLElement>("[data-cost-summary]");
  if (!target) return;
  const byKind = (kind: string) => costs.filter((entry) => categories.find((category) => category.id === entry.category_id)?.category_kind === kind)
    .reduce((sum, entry) => sum + entry.allocated_cost_cents, 0);
  const cash = cashCost();
  const laborTotalValue = laborValue();
  const summaries = [
    ["Materials", byKind("materials")],
    ["Framing / fabrication", byKind("framing_fabrication")],
    ["Outside services", byKind("outside_services")],
    ["Packaging", byKind("packaging")],
    ["Other costs", byKind("other")],
    ["Cash cost", cash],
    ["Studio labor value", laborTotalValue],
    ["Total invested cost", cash + laborTotalValue]
  ];
  target.replaceChildren(...summaries.map(([label, value], index) => {
    const item = document.createElement("div");
    if (index >= 5) item.className = "is-total";
    const name = document.createElement("span");
    name.textContent = String(label);
    const amount = document.createElement("strong");
    amount.textContent = money(Number(value));
    item.append(name, amount);
    return item;
  }));
}

function removeButton(table: string, entryId: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "artwork-row-remove";
  button.type = "button";
  button.textContent = "Remove";
  button.setAttribute("aria-label", `Remove ${label}`);
  button.addEventListener("click", async () => {
    if (!window.confirm(`Remove ${label}? This cannot be undone.`)) return;
    const { error } = await client.from(table).delete().eq("id", entryId);
    if (error) return showStudioError(error);
    await loadFinancials();
  });
  return button;
}

function quietButton(label: string, action: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "artwork-row-remove";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function fillForm(form: HTMLFormElement, values: Record<string, string | number | null | undefined>): void {
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = value == null ? "" : String(value);
    }
  });
}

function renderCosts(): void {
  const target = document.querySelector<HTMLElement>("[data-cost-groups]");
  const select = document.querySelector<HTMLSelectElement>("[data-cost-category]");
  if (select) {
    select.replaceChildren(...categories.map((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      return option;
    }));
  }
  if (!target) return;
  target.replaceChildren(...categories.map((category) => {
    const section = document.createElement("section");
    section.className = "artwork-cost-category";
    const entries = costs.filter((entry) => entry.category_id === category.id);
    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = category.name;
    const total = document.createElement("strong");
    total.textContent = money(entries.reduce((sum, entry) => sum + entry.allocated_cost_cents, 0));
    const categoryActions = document.createElement("div");
    categoryActions.className = "artwork-category-actions";
    const index = categories.indexOf(category);
    if (index > 0) categoryActions.append(quietButton("↑", () => void moveCategory(category, -1)));
    if (index < categories.length - 1) categoryActions.append(quietButton("↓", () => void moveCategory(category, 1)));
    categoryActions.append(
      quietButton("Rename", () => void renameCategory(category)),
      quietButton("Remove", () => void removeCategory(category))
    );
    header.append(title, total, categoryActions);
    const rows = document.createElement("div");
    rows.className = "artwork-record-list";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "artwork-record-empty";
      empty.textContent = "No entries";
      rows.append(empty);
    } else {
      entries.forEach((entry) => {
        const row = document.createElement("article");
        row.className = "artwork-record-row";
        const content = document.createElement("div");
        const heading = document.createElement("h4");
        heading.textContent = entry.item_name;
        const meta = document.createElement("p");
        meta.textContent = [entry.entry_date, entry.manufacturer, entry.color_variant, entry.vendor].filter(Boolean).join(" · ");
        const allocation = document.createElement("p");
        allocation.textContent = entry.manual_cost_override_cents != null
          ? "Manual allocation"
          : entry.purchase_quantity && entry.amount_used != null
            ? `${entry.amount_used} of ${entry.purchase_quantity} ${entry.unit} used`
            : "Direct allocation";
        content.append(heading, meta, allocation);
        const amount = document.createElement("strong");
        amount.textContent = money(entry.allocated_cost_cents);
        const actions = document.createElement("div");
        actions.className = "artwork-category-actions";
        actions.append(
          quietButton("Edit", () => editCost(entry)),
          removeButton("artwork_cost_entries", entry.id, entry.item_name)
        );
        row.append(content, amount, actions);
        rows.append(row);
      });
    }
    section.append(header, rows);
    return section;
  }));
}

function editCost(entry: CostEntry): void {
  const form = document.querySelector<HTMLFormElement>("[data-cost-form]");
  if (!form) return;
  editingCostId = entry.id;
  fillForm(form, {
    category_id: entry.category_id,
    item_name: entry.item_name,
    entry_date: entry.entry_date,
    manufacturer: entry.manufacturer,
    color_variant: entry.color_variant,
    vendor: entry.vendor,
    unit: entry.unit,
    purchase_quantity: entry.purchase_quantity,
    purchase_cost: entry.purchase_cost_cents == null ? "" : centsToInput(entry.purchase_cost_cents),
    amount_used: entry.amount_used,
    allocated_cost: centsToInput(entry.allocated_cost_cents),
    manual_cost_override: entry.manual_cost_override_cents == null ? "" : centsToInput(entry.manual_cost_override_cents),
    notes: entry.notes
  });
  form.hidden = false;
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
  if (submit) submit.textContent = "Update Cost";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function moveCategory(category: Category, direction: -1 | 1): Promise<void> {
  const index = categories.indexOf(category);
  const other = categories[index + direction];
  if (!other) return;
  const [first, second] = await Promise.all([
    client.from("artwork_cost_categories").update({ sort_order: other.sort_order }).eq("id", category.id),
    client.from("artwork_cost_categories").update({ sort_order: category.sort_order }).eq("id", other.id)
  ]);
  if (first.error || second.error) return showStudioError(first.error || second.error);
  await loadFinancials();
}

async function renameCategory(category: Category): Promise<void> {
  const name = window.prompt("Category name", category.name)?.trim();
  if (!name || name === category.name) return;
  const { error } = await client.from("artwork_cost_categories").update({ name }).eq("id", category.id);
  if (error) return showStudioError(error);
  await loadFinancials();
}

async function removeCategory(category: Category): Promise<void> {
  if (costs.some((entry) => entry.category_id === category.id)) {
    window.alert("Move or remove this category’s cost entries before removing the category.");
    return;
  }
  if (!window.confirm(`Remove the empty “${category.name}” category?`)) return;
  const { error } = await client.from("artwork_cost_categories").delete().eq("id", category.id);
  if (error) return showStudioError(error);
  await loadFinancials();
}

function renderLabor(): void {
  const target = document.querySelector<HTMLElement>("[data-labor-list]");
  if (!target) return;
  target.replaceChildren(...labor.map((entry) => {
    const row = document.createElement("article");
    row.className = "artwork-record-row";
    const content = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = entry.task;
    const meta = document.createElement("p");
    meta.textContent = `${entry.entry_date} · ${entry.hours} hr × ${money(entry.hourly_value_cents)}/hr`;
    content.append(heading, meta);
    const amount = document.createElement("strong");
    amount.textContent = money(entry.labor_total_cents);
    row.append(content, amount, removeButton("artwork_labor_entries", entry.id, entry.task));
    return row;
  }));
}

function renderScenarios(): void {
  const target = document.querySelector<HTMLElement>("[data-pricing-list]");
  if (!target) return;
  const cash = cashCost();
  const invested = cash + laborValue();
  target.replaceChildren(...scenarios.map((scenario) => {
    const outcome = pricingOutcome(scenario, cash, invested);
    const card = document.createElement("article");
    card.className = "pricing-scenario-card";
    const heading = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = scenario.scenario_name;
    const price = document.createElement("strong");
    price.textContent = money(scenario.listed_price_cents);
    heading.append(title, price);
    const indicator = document.createElement("p");
    indicator.className = "pricing-indicator";
    indicator.textContent = pricingIndicator(outcome.netProceedsCents, cash, invested);
    const values = document.createElement("dl");
    [
      ["Total deductions", money(outcome.totalDeductionsCents)],
      ["Net proceeds to studio", money(outcome.netProceedsCents)],
      ["Profit after cash cost", money(outcome.cashProfitCents)],
      ["Profit after total invested", money(outcome.fullyCostedProfitCents)],
      ["Net margin", `${outcome.netMarginPercent.toFixed(1)}%`]
    ].forEach(([term, value]) => addDefinition(values, term, value));
    card.append(heading, indicator, values, removeButton("artwork_pricing_scenarios", scenario.id, scenario.scenario_name));
    return card;
  }));
}

function renderHistory(): void {
  const target = document.querySelector<HTMLElement>("[data-price-history]");
  if (!target) return;
  target.replaceChildren(...history.map((entry) => {
    const row = document.createElement("article");
    row.className = "artwork-record-row";
    const content = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = entry.price_type;
    const meta = document.createElement("p");
    meta.textContent = `${entry.effective_date}${entry.end_date ? ` – ${entry.end_date}` : " – current"}${entry.reason ? ` · ${entry.reason}` : ""}`;
    content.append(title, meta);
    const amount = document.createElement("strong");
    amount.textContent = money(entry.price_cents);
    row.append(content, amount);
    return row;
  }));
}

async function loadFinancials(): Promise<void> {
  const [categoryResult, costResult, laborResult, scenarioResult, historyResult] = await Promise.all([
    client.from("artwork_cost_categories").select("*").eq("artwork_id", artwork.id).order("sort_order"),
    client.from("artwork_cost_entries").select("*").eq("artwork_id", artwork.id).order("entry_date", { ascending: false }),
    client.from("artwork_labor_entries").select("*").eq("artwork_id", artwork.id).order("entry_date", { ascending: false }),
    client.from("artwork_pricing_scenarios").select("*").eq("artwork_id", artwork.id).order("created_at"),
    client.from("artwork_price_history").select("*").eq("artwork_id", artwork.id).order("effective_date", { ascending: false })
  ]);
  const error = categoryResult.error || costResult.error || laborResult.error || scenarioResult.error || historyResult.error;
  if (error) throw error;
  categories = (categoryResult.data || []) as Category[];
  costs = (costResult.data || []) as CostEntry[];
  labor = (laborResult.data || []) as LaborEntry[];
  scenarios = (scenarioResult.data || []) as PricingScenario[];
  history = (historyResult.data || []) as PriceHistory[];
  renderSummary();
  renderCosts();
  renderLabor();
  renderScenarios();
  renderHistory();
}

async function renderImages(): Promise<void> {
  const { data, error } = await client.from("file_assets").select("*").eq("artwork_id", artwork.id).order("created_at");
  if (error) throw error;
  const assets = (data || []) as FileAsset[];
  const gallery = document.querySelector<HTMLElement>("[data-artwork-images]");
  const primary = document.querySelector<HTMLElement>("[data-primary-image]");
  const figures = await Promise.all(assets.map(async (asset) => {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = await signedImageUrl(asset.bucket, asset.path) || "";
    image.alt = asset.alt_text || artwork.title;
    figure.append(image);
    if (asset.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = asset.caption;
      figure.append(caption);
    }
    if (asset.id === artwork.primary_image_id && primary) {
      const primaryImage = image.cloneNode() as HTMLImageElement;
      primary.replaceChildren(primaryImage);
    }
    return figure;
  }));
  gallery?.replaceChildren(...figures);
  const empty = document.querySelector<HTMLElement>("[data-artwork-images-empty]");
  if (empty) empty.hidden = assets.length > 0;
}

async function renderJournal(): Promise<void> {
  const { data, error } = await client.from("journal_entries").select("*").eq("artwork_id", artwork.id).order("created_at", { ascending: false });
  if (error) throw error;
  const entries = (data || []) as JournalEntry[];
  const target = document.querySelector<HTMLElement>("[data-related-journal]");
  target?.replaceChildren(...entries.map((entry) => {
    const card = document.createElement("a");
    card.className = "studio-entry-card";
    card.href = `/studio/journal/entry?id=${encodeURIComponent(entry.id)}`;
    const content = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = formatLabel(entry.entry_type);
    const heading = document.createElement("h2");
    heading.textContent = entry.title;
    const preview = document.createElement("p");
    preview.className = "studio-entry-preview";
    preview.textContent = entry.body.slice(0, 180);
    content.append(eyebrow, heading, preview);
    card.append(content);
    return card;
  }));
  const empty = document.querySelector<HTMLElement>("[data-related-journal-empty]");
  if (empty) empty.hidden = entries.length > 0;
}

async function renderActivity(): Promise<void> {
  const { data, error } = await client.from("studio_activities").select("*").eq("object_type", "artwork").eq("object_id", artwork.id).order("created_at", { ascending: false });
  if (error) throw error;
  const activities = (data || []) as StudioActivity[];
  const target = document.querySelector<HTMLElement>("[data-artwork-activity]");
  target?.replaceChildren(...activities.map((activity) => {
    const card = document.createElement("article");
    card.className = "studio-feed-card";
    const glyph = document.createElement("span");
    glyph.className = "studio-feed-glyph";
    const presentation = activityPresentation(activity.activity_type);
    glyph.textContent = presentation.glyph;
    const content = document.createElement("div");
    const kind = document.createElement("p");
    kind.className = "studio-feed-kind";
    kind.textContent = presentation.label;
    const heading = document.createElement("h3");
    heading.textContent = activity.title;
    const description = document.createElement("p");
    description.className = "studio-feed-description";
    description.textContent = activity.description || "";
    const timestamp = document.createElement("time");
    timestamp.className = "studio-feed-time";
    timestamp.textContent = new Date(activity.created_at).toLocaleString();
    content.append(kind, heading, description, timestamp);
    card.append(glyph, content);
    return card;
  }));
  const empty = document.querySelector<HTMLElement>("[data-artwork-activity-empty]");
  if (empty) empty.hidden = activities.length > 0;
}

function renderOverview(): void {
  text("[data-artwork-inventory]", artwork.inventory_number || "Artwork");
  text("[data-artwork-title]", artwork.title);
  text("[data-artwork-subtitle]", [artwork.year, artwork.medium, artwork.collection_name].filter(Boolean).join(" · "));
  text("[data-production-status]", formatLabel(artwork.production_status));
  text("[data-availability]", formatLabel(artwork.availability));
  const facts = document.querySelector<HTMLDListElement>("[data-artwork-facts]");
  if (facts) {
    addDefinition(facts, "Inventory number", artwork.inventory_number);
    addDefinition(facts, "Year", artwork.year);
    addDefinition(facts, "Medium", artwork.medium);
    addDefinition(facts, "Materials", artwork.materials_description);
    const dimensions = [artwork.width, artwork.height, artwork.depth].filter((item) => item != null).join(" × ");
    addDefinition(facts, "Dimensions", dimensions ? `${dimensions} ${artwork.dimension_unit}` : null);
    addDefinition(facts, "Weight", artwork.weight != null ? `${artwork.weight} ${artwork.weight_unit}` : null);
    addDefinition(facts, "Location", artwork.location);
    addDefinition(facts, "Started", artwork.date_started);
    addDefinition(facts, "Completed", artwork.date_completed);
    addDefinition(facts, "Current studio retail", artwork.current_retail_price_cents != null ? money(artwork.current_retail_price_cents) : null);
  }
  const story = document.querySelector<HTMLElement>("[data-artwork-story]");
  if (story) {
    const heading = document.createElement("h2");
    heading.textContent = "Story";
    const body = document.createElement("p");
    body.textContent = artwork.description_public || "No description has been recorded.";
    story.replaceChildren(heading, body);
  }
  document.querySelectorAll<HTMLAnchorElement>("[data-artwork-edit], [data-artwork-edit-images]").forEach((link) => {
    link.href = `/studio/artwork/edit?id=${encodeURIComponent(artwork.id)}`;
  });
  const journalLink = document.querySelector<HTMLAnchorElement>("[data-new-related-journal]");
  if (journalLink) journalLink.href = `/studio/journal/new?artworkId=${encodeURIComponent(artwork.id)}`;
}

function wireTabs(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-artwork-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.artworkTab;
      document.querySelectorAll<HTMLButtonElement>("[data-artwork-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll<HTMLElement>("[data-artwork-panel]").forEach((panel) => { panel.hidden = panel.dataset.artworkPanel !== name; });
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-toggle-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = document.querySelector<HTMLFormElement>(`[data-${button.dataset.toggleForm}-form]`);
      if (form) form.hidden = !form.hidden;
    });
  });
}

function wireForms(): void {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll<HTMLInputElement>("input[type=date]").forEach((field) => { if (!field.value) field.value = today; });
  document.querySelector<HTMLButtonElement>("[data-add-category]")?.addEventListener("click", async () => {
    const name = window.prompt("New cost category name")?.trim();
    if (!name) return;
    const { error } = await client.from("artwork_cost_categories").insert({
      artwork_id: artwork.id,
      name,
      category_kind: "materials",
      sort_order: categories.length ? Math.max(...categories.map((category) => category.sort_order)) + 1 : 0
    });
    if (error) return showStudioError(error);
    await loadFinancials();
  });
  document.querySelector<HTMLFormElement>("[data-cost-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const manualRaw = formValue(values, "manual_cost_override");
    const manualCents = manualRaw ? dollarsToCents(manualRaw) : null;
    const purchaseCostCents = formValue(values, "purchase_cost") ? dollarsToCents(formValue(values, "purchase_cost")) : null;
    const directCents = formValue(values, "allocated_cost") ? dollarsToCents(formValue(values, "allocated_cost")) : 0;
    const purchaseQuantity = optionalNumber(values, "purchase_quantity");
    const amountUsed = optionalNumber(values, "amount_used");
    const allocated = allocatedCost({ purchaseCostCents, purchaseQuantity, amountUsed, manualOverrideCents: manualCents, directAllocatedCents: directCents });
    const record = {
      artwork_id: artwork.id,
      category_id: formValue(values, "category_id"),
      item_name: formValue(values, "item_name"),
      manufacturer: formValue(values, "manufacturer") || null,
      color_variant: formValue(values, "color_variant") || null,
      vendor: formValue(values, "vendor") || null,
      entry_date: formValue(values, "entry_date"),
      unit: formValue(values, "unit") || "each",
      purchase_quantity: purchaseQuantity,
      purchase_cost_cents: purchaseCostCents,
      amount_used: amountUsed,
      allocated_cost_cents: allocated,
      manual_cost_override_cents: manualCents,
      notes: formValue(values, "notes") || null
    };
    const result = editingCostId
      ? await client.from("artwork_cost_entries").update(record).eq("id", editingCostId)
      : await client.from("artwork_cost_entries").insert(record);
    const { error } = result;
    if (error) return showStudioError(error);
    editingCostId = null;
    event.currentTarget.reset();
    (event.currentTarget.querySelector("[name=entry_date]") as HTMLInputElement).value = today;
    const submit = event.currentTarget.querySelector<HTMLButtonElement>("button[type=submit]");
    if (submit) submit.textContent = "Save Cost";
    await loadFinancials();
  });
  document.querySelector<HTMLFormElement>("[data-labor-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const hours = numberValue(values, "hours");
    const hourly = dollarsToCents(formValue(values, "hourly_value"));
    const { error } = await client.from("artwork_labor_entries").insert({
      artwork_id: artwork.id, task: formValue(values, "task"), entry_date: formValue(values, "entry_date"),
      hours, hourly_value_cents: hourly, labor_total_cents: laborTotal(hours, hourly), notes: formValue(values, "notes") || null
    });
    if (error) return showStudioError(error);
    event.currentTarget.reset();
    (event.currentTarget.querySelector("[name=entry_date]") as HTMLInputElement).value = today;
    await loadFinancials();
  });
  document.querySelector<HTMLFormElement>("[data-pricing-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const { error } = await client.from("artwork_pricing_scenarios").insert({
      artwork_id: artwork.id,
      scenario_name: formValue(values, "scenario_name"),
      listed_price_cents: dollarsToCents(formValue(values, "listed_price")),
      commission_percent: numberValue(values, "commission_percent"),
      platform_fee_percent: numberValue(values, "platform_fee_percent"),
      fixed_fee_cents: dollarsToCents(formValue(values, "fixed_fee")),
      discount_percent: numberValue(values, "discount_percent"),
      discount_cents: dollarsToCents(formValue(values, "discount_amount")),
      shipping_absorbed_cents: dollarsToCents(formValue(values, "shipping_absorbed")),
      other_deductions_cents: dollarsToCents(formValue(values, "other_deductions")),
      notes: formValue(values, "notes") || null
    });
    if (error) return showStudioError(error);
    event.currentTarget.reset();
    await loadFinancials();
  });
  document.querySelector<HTMLFormElement>("[data-history-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const priceCents = dollarsToCents(formValue(values, "price"));
    const priceType = formValue(values, "price_type");
    const { error } = await client.from("artwork_price_history").insert({
      artwork_id: artwork.id, price_cents: priceCents, price_type: priceType,
      effective_date: formValue(values, "effective_date"), end_date: formValue(values, "end_date") || null,
      reason: formValue(values, "reason") || null, created_by: user.id
    });
    if (error) return showStudioError(error);
    const normalized = priceType.toLowerCase();
    if (normalized.includes("studio") && normalized.includes("retail")) {
      await client.from("artworks").update({ current_retail_price_cents: priceCents }).eq("id", artwork.id);
      artwork.current_retail_price_cents = priceCents;
      renderOverview();
    }
    event.currentTarget.reset();
    (event.currentTarget.querySelector("[name=effective_date]") as HTMLInputElement).value = today;
    await loadFinancials();
  });
}

async function init(): Promise<void> {
  setupStudioSignOut();
  if (!id) return showStudioError(new Error("No artwork was selected."));
  try {
    ({ client, user } = await requireStudioUser());
    const { data, error } = await client.from("artworks").select("*").eq("id", id).single();
    if (error) throw error;
    artwork = data as Artwork;
    renderOverview();
    wireTabs();
    wireForms();
    await Promise.all([renderImages(), renderJournal(), renderActivity(), loadFinancials()]);
    document.querySelector<HTMLButtonElement>("[data-delete-artwork]")?.addEventListener("click", async () => {
      if (!window.confirm(`Permanently delete “${artwork.title}” and all of its costs, labor, pricing scenarios, and price history? Related Journal entries will remain but be detached.`)) return;
      const { error: deleteError } = await client.from("artworks").delete().eq("id", artwork.id);
      if (deleteError) return showStudioError(deleteError);
      window.location.assign("/studio/artwork");
    });
    loading?.setAttribute("hidden", "");
    if (detail) detail.hidden = false;
  } catch (error) {
    loading?.setAttribute("hidden", "");
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();
