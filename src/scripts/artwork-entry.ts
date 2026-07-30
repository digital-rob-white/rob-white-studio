import {
  allocatedCost,
  centsToInput,
  dollarsToCents,
  formatInches,
  formatLaborDuration,
  IMAGE_TAGS,
  laborTotalMinutes,
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
let editingLaborId: string | null = null;
let editingScenarioId: string | null = null;
let editingHistoryId: string | null = null;
let images: FileAsset[] = [];

const text = (selector: string, value: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
};
const formatLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string | null) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : null;
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

function totalInvestedCost(): number {
  return cashCost() + laborValue();
}

function projectedRetailPrice(): number | null {
  if (artwork.current_retail_price_cents != null) return artwork.current_retail_price_cents;
  if (!scenarios.length) return null;
  return Math.max(...scenarios.map((scenario) => scenario.listed_price_cents));
}

function targetPrice(): number {
  return artwork.target_price_cents || 0;
}

function showSuccess(message: string): void {
  const target = document.querySelector<HTMLElement>("[data-financial-success]");
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  window.setTimeout(() => { target.hidden = true; }, 5000);
}

function renderSummary(): void {
  const target = document.querySelector<HTMLElement>("[data-cost-summary]");
  if (!target) return;
  const byKind = (kind: string) => costs.filter((entry) => categories.find((category) => category.id === entry.category_id)?.category_kind === kind)
    .reduce((sum, entry) => sum + entry.allocated_cost_cents, 0);
  const cash = cashCost();
  const laborTotalValue = laborValue();
  const invested = cash + laborTotalValue;
  const targetPriceCents = targetPrice();
  const remaining = targetPriceCents - invested;
  const margin = targetPriceCents > 0 ? (remaining / targetPriceCents) * 100 : 0;
  const summaries = [
    ["Target artwork price", targetPriceCents],
    ["Materials", byKind("materials")],
    ["Framing / fabrication", byKind("framing_fabrication")],
    ["Outside services", byKind("outside_services")],
    ["Packaging", byKind("packaging")],
    ["Other costs", byKind("other")],
    ["Cash cost", cash],
    ["Studio labor value", laborTotalValue],
    ["Total invested cost", invested],
    ["Remaining before target", remaining],
    ["Estimated fully costed profit", remaining],
    ["Estimated margin", `${margin.toFixed(1)}%`]
  ];
  target.replaceChildren(...summaries.map(([label, value], index) => {
    const item = document.createElement("div");
    if ([0, 6, 7, 8, 9, 10, 11].includes(index)) item.className = "is-total";
    const name = document.createElement("span");
    name.textContent = String(label);
    const amount = document.createElement("strong");
    amount.textContent = typeof value === "string" ? value : money(Number(value));
    item.append(name, amount);
    return item;
  }));
  const targetInput = document.querySelector<HTMLInputElement>("[name=target_price]");
  if (targetInput && document.activeElement !== targetInput) {
    targetInput.value = artwork.target_price_cents == null ? "" : centsToInput(artwork.target_price_cents);
  }
  renderFinancialSnapshot();
}

function renderFinancialSnapshot(): void {
  const target = document.querySelector<HTMLElement>("[data-overview-financials]");
  if (!target || !artwork) return;
  const values: Array<[string, string]> = [
    ["Target artwork price", artwork.target_price_cents == null ? "Not set" : money(artwork.target_price_cents)],
    ["Projected retail price", projectedRetailPrice() == null ? "Not set" : money(projectedRetailPrice())],
    ["Current total cost to make", money(totalInvestedCost())],
    ["Cash cost", money(cashCost())],
    ["Studio labor value", money(laborValue())],
    ["Total invested cost", money(totalInvestedCost())]
  ];
  target.replaceChildren(...values.map(([label, value]) => {
    const item = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = label;
    const amount = document.createElement("strong");
    amount.textContent = value;
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

function setFormMode(form: HTMLFormElement, editing: boolean, noun: string): void {
  const mode = form.querySelector<HTMLElement>("[data-form-mode]");
  const title = form.querySelector<HTMLElement>("[data-form-title]");
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
  if (mode) mode.textContent = editing ? "Editing saved record" : "Create";
  if (title) title.textContent = editing ? `Edit ${noun}` : noun === "Price" ? "Record Price" : `Add ${noun}`;
  if (submit) submit.textContent = editing ? `Update ${noun}` : noun === "Price" ? "Record Price" : `Add ${noun}`;
  form.dataset.editing = editing ? "true" : "false";
}

function closeForm(form: HTMLFormElement, noun: string): void {
  form.reset();
  form.hidden = true;
  setFormMode(form, false, noun);
  const today = new Date().toISOString().slice(0, 10);
  form.querySelectorAll<HTMLInputElement>("input[type=date][required]").forEach((field) => { field.value = today; });
}

async function submitLocked(button: HTMLButtonElement | null, action: () => Promise<void>): Promise<void> {
  if (!button || button.disabled) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    await action();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function normalizeCategoryOrder(items: Category[]): Category[] {
  return [...items].sort((a, b) => {
    const aOther = a.category_kind === "other" || a.name.toLowerCase() === "other";
    const bOther = b.category_kind === "other" || b.name.toLowerCase() === "other";
    if (aOther !== bOther) return aOther ? 1 : -1;
    return a.sort_order - b.sort_order;
  });
}

async function persistCategoryOrder(ordered: Category[]): Promise<void> {
  const results = await Promise.all(ordered.map((category, index) =>
    client.from("artwork_cost_categories").update({ sort_order: index }).eq("id", category.id)
  ));
  const failure = results.find((result) => result.error)?.error;
  if (failure) return showStudioError(failure);
  await loadFinancials();
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
  const visibleCategories = categories.filter((category) => costs.some((entry) => entry.category_id === category.id));
  const empty = document.querySelector<HTMLElement>("[data-cost-empty]");
  if (empty) empty.hidden = costs.length > 0;
  target.replaceChildren(...visibleCategories.map((category) => {
    const section = document.createElement("section");
    section.className = "artwork-cost-category";
    section.draggable = true;
    section.dataset.categoryId = category.id;
    section.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", category.id);
      section.classList.add("is-dragging");
    });
    section.addEventListener("dragend", () => section.classList.remove("is-dragging"));
    section.addEventListener("dragover", (event) => event.preventDefault());
    section.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceId = event.dataTransfer?.getData("text/plain");
      if (!sourceId || sourceId === category.id) return;
      const ordered = normalizeCategoryOrder(categories);
      const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
      const targetIndex = ordered.findIndex((item) => item.id === category.id);
      const source = ordered[sourceIndex];
      if (!source || source.category_kind === "other" || source.name.toLowerCase() === "other") return;
      ordered.splice(sourceIndex, 1);
      const insertionIndex = ordered.findIndex((item) => item.id === category.id);
      ordered.splice(insertionIndex < 0 ? targetIndex : insertionIndex, 0, source);
      void persistCategoryOrder(normalizeCategoryOrder(ordered));
    });
    const entries = costs.filter((entry) => entry.category_id === category.id);
    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = category.name;
    const total = document.createElement("strong");
    total.textContent = money(entries.reduce((sum, entry) => sum + entry.allocated_cost_cents, 0));
    const categoryActions = document.createElement("div");
    categoryActions.className = "artwork-category-actions";
    const index = categories.indexOf(category);
    const isOther = category.category_kind === "other" || category.name.toLowerCase() === "other";
    const nextIsOther = categories[index + 1]?.category_kind === "other" || categories[index + 1]?.name.toLowerCase() === "other";
    if (index > 0 && !isOther) categoryActions.append(quietButton("↑", () => void moveCategory(category, -1)));
    if (index < categories.length - 1 && !isOther && !nextIsOther) {
      categoryActions.append(quietButton("↓", () => void moveCategory(category, 1)));
    }
    categoryActions.append(
      quietButton("Rename", () => void renameCategory(category)),
      quietButton("Remove", () => void removeCategory(category))
    );
    header.append(title, total, categoryActions);
    const rows = document.createElement("div");
    rows.className = "artwork-record-list";
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
  setFormMode(form, true, "Cost Entry");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function moveCategory(category: Category, direction: -1 | 1): Promise<void> {
  const ordered = normalizeCategoryOrder(categories);
  const index = ordered.indexOf(category);
  const other = ordered[index + direction];
  if (!other) return;
  if (category.category_kind === "other" || other.category_kind === "other") return;
  [ordered[index], ordered[index + direction]] = [other, category];
  await persistCategoryOrder(normalizeCategoryOrder(ordered));
}

async function renameCategory(category: Category): Promise<void> {
  const name = window.prompt("Category name", category.name)?.trim();
  if (!name || name === category.name) return;
  const categoryKind = name.toLowerCase() === "other"
    ? "other"
    : category.category_kind === "other" ? "materials" : category.category_kind;
  const { error } = await client.from("artwork_cost_categories").update({ name, category_kind: categoryKind }).eq("id", category.id);
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
    meta.textContent = `${entry.entry_date} · ${formatLaborDuration(entry.duration_minutes)} × ${money(entry.hourly_value_cents)}/hr`;
    content.append(heading, meta);
    const amount = document.createElement("strong");
    amount.textContent = money(entry.labor_total_cents);
    const actions = document.createElement("div");
    actions.className = "artwork-category-actions";
    actions.append(
      quietButton("Edit", () => editLabor(entry)),
      removeButton("artwork_labor_entries", entry.id, entry.task)
    );
    row.append(content, amount, actions);
    return row;
  }));
}

function editLabor(entry: LaborEntry): void {
  const form = document.querySelector<HTMLFormElement>("[data-labor-form]");
  if (!form) return;
  editingLaborId = entry.id;
  fillForm(form, {
    task: entry.task,
    entry_date: entry.entry_date,
    whole_hours: Math.floor(entry.duration_minutes / 60),
    quarter_minutes: entry.duration_minutes % 60,
    hourly_value: centsToInput(entry.hourly_value_cents),
    notes: entry.notes
  });
  setFormMode(form, true, "Labor Entry");
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const actions = document.createElement("div");
    actions.className = "artwork-category-actions";
    actions.append(
      quietButton("Edit", () => editScenario(scenario)),
      removeButton("artwork_pricing_scenarios", scenario.id, scenario.scenario_name)
    );
    card.append(heading, indicator, values, actions);
    return card;
  }));
}

function editScenario(scenario: PricingScenario): void {
  const form = document.querySelector<HTMLFormElement>("[data-pricing-form]");
  if (!form) return;
  editingScenarioId = scenario.id;
  fillForm(form, {
    scenario_name: scenario.scenario_name,
    listed_price: centsToInput(scenario.listed_price_cents),
    commission_percent: scenario.commission_percent,
    platform_fee_percent: scenario.platform_fee_percent,
    fixed_fee: centsToInput(scenario.fixed_fee_cents),
    discount_percent: scenario.discount_percent,
    discount_amount: centsToInput(scenario.discount_cents),
    shipping_absorbed: centsToInput(scenario.shipping_absorbed_cents),
    other_deductions: centsToInput(scenario.other_deductions_cents),
    notes: scenario.notes
  });
  setFormMode(form, true, "Pricing Scenario");
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const actions = document.createElement("div");
    actions.className = "artwork-category-actions";
    actions.append(
      quietButton("Edit", () => editHistory(entry)),
      removeButton("artwork_price_history", entry.id, `${entry.price_type} price`)
    );
    row.append(content, amount, actions);
    return row;
  }));
}

function editHistory(entry: PriceHistory): void {
  const form = document.querySelector<HTMLFormElement>("[data-history-form]");
  if (!form) return;
  editingHistoryId = entry.id;
  fillForm(form, {
    price: centsToInput(entry.price_cents),
    price_type: entry.price_type,
    effective_date: entry.effective_date,
    end_date: entry.end_date,
    reason: entry.reason
  });
  setFormMode(form, true, "Price");
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
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
  categories = normalizeCategoryOrder((categoryResult.data || []) as Category[]);
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
  const { data, error } = await client.from("file_assets").select("*").eq("artwork_id", artwork.id)
    .order("display_order").order("created_at");
  if (error) throw error;
  images = (data || []) as FileAsset[];
  const gallery = document.querySelector<HTMLElement>("[data-artwork-images]");
  const primary = document.querySelector<HTMLElement>("[data-primary-image]");
  if (primary && !images.some((asset) => asset.id === artwork.primary_image_id)) {
    primary.replaceChildren(Object.assign(document.createElement("p"), { textContent: "No primary image yet." }));
  }
  const figures = await Promise.all(images.map(async (asset, index) => {
    const figure = document.createElement("figure");
    figure.className = "artwork-image-card";
    if (asset.id === artwork.primary_image_id) figure.classList.add("is-primary");
    const image = document.createElement("img");
    image.src = await signedImageUrl(asset.bucket, asset.path) || "";
    image.alt = asset.alt_text || artwork.title;
    figure.append(image);
    const header = document.createElement("div");
    header.className = "artwork-image-card-heading";
    const tag = document.createElement("strong");
    tag.textContent = asset.id === artwork.primary_image_id ? "Primary image" : formatLabel(asset.image_tag || "finished");
    const order = document.createElement("span");
    order.textContent = `Image ${index + 1}`;
    header.append(tag, order);
    figure.append(header);

    const form = document.createElement("form");
    form.className = "artwork-image-metadata";
    const captionLabel = document.createElement("label");
    captionLabel.textContent = "Caption";
    const caption = document.createElement("input");
    caption.name = "caption";
    caption.value = asset.caption || "";
    caption.placeholder = "Studio context or sales-ready caption";
    captionLabel.append(caption);
    const tagLabel = document.createElement("label");
    tagLabel.textContent = "Image tag";
    const tagSelect = document.createElement("select");
    tagSelect.name = "image_tag";
    IMAGE_TAGS.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === (asset.image_tag || "finished");
      tagSelect.append(option);
    });
    tagLabel.append(tagSelect);
    const actions = document.createElement("div");
    actions.className = "artwork-image-actions";
    if (index > 0) actions.append(quietButton("Move earlier", () => void moveImage(asset, -1)));
    if (index < images.length - 1) actions.append(quietButton("Move later", () => void moveImage(asset, 1)));
    if (asset.id !== artwork.primary_image_id) {
      actions.append(quietButton("Make primary", () => void setPrimaryImage(asset)));
    }
    const save = document.createElement("button");
    save.className = "studio-button studio-button-quiet";
    save.type = "submit";
    save.textContent = "Update Image";
    actions.append(save);
    form.append(captionLabel, tagLabel, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitLocked(save, async () => {
        const { error: updateError } = await client.from("file_assets").update({
          caption: caption.value.trim() || null,
          image_tag: tagSelect.value
        }).eq("id", asset.id);
        if (updateError) throw updateError;
        showSuccess("Image details updated.");
        await renderImages();
      }).catch(showStudioError);
    });
    figure.append(form);
    if (asset.id === artwork.primary_image_id && primary) {
      const primaryImage = image.cloneNode() as HTMLImageElement;
      primary.replaceChildren(primaryImage);
    }
    return figure;
  }));
  gallery?.replaceChildren(...figures);
  const empty = document.querySelector<HTMLElement>("[data-artwork-images-empty]");
  if (empty) empty.hidden = images.length > 0;
}

async function moveImage(asset: FileAsset, direction: -1 | 1): Promise<void> {
  const index = images.findIndex((item) => item.id === asset.id);
  const other = images[index + direction];
  if (!other) return;
  const ordered = [...images];
  [ordered[index], ordered[index + direction]] = [other, asset];
  const results = await Promise.all(ordered.map((item, displayOrder) =>
    client.from("file_assets").update({ display_order: displayOrder }).eq("id", item.id)
  ));
  const failure = results.find((result) => result.error)?.error;
  if (failure) return showStudioError(failure);
  showSuccess("Image order updated.");
  await renderImages();
}

async function setPrimaryImage(asset: FileAsset): Promise<void> {
  const previous = images.find((item) => item.id === artwork.primary_image_id);
  const updates = [
    client.from("artworks").update({ primary_image_id: asset.id }).eq("id", artwork.id),
    client.from("file_assets").update({ image_tag: "primary" }).eq("id", asset.id)
  ];
  if (previous?.image_tag === "primary") {
    updates.push(client.from("file_assets").update({ image_tag: "finished" }).eq("id", previous.id));
  }
  const results = await Promise.all(updates);
  const failure = results.find((result) => result.error)?.error;
  if (failure) return showStudioError(failure);
  artwork.primary_image_id = asset.id;
  showSuccess("Primary image updated.");
  await renderImages();
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
  text("[data-production-status]", `Production: ${formatLabel(artwork.production_status)}`);
  text("[data-availability]", `Availability: ${formatLabel(artwork.availability)}`);
  const facts = document.querySelector<HTMLDListElement>("[data-artwork-facts]");
  if (facts) {
    facts.replaceChildren();
    addDefinition(facts, "Inventory number", artwork.inventory_number);
    addDefinition(facts, "Year", artwork.year);
    addDefinition(facts, "Medium", artwork.medium);
    addDefinition(facts, "Materials", artwork.materials_description);
    const dimensions = [artwork.width, artwork.height, artwork.depth]
      .filter((item) => item != null)
      .map((item) => artwork.dimension_unit === "in" ? formatInches(item) : String(item))
      .join(" × ");
    addDefinition(facts, "Dimensions", dimensions ? `${dimensions} ${artwork.dimension_unit === "in" ? "in" : artwork.dimension_unit}` : null);
    addDefinition(facts, "Weight", artwork.weight != null ? `${artwork.weight} ${artwork.weight_unit}` : null);
    addDefinition(facts, "Location", artwork.location);
    addDefinition(facts, "Started", formatDate(artwork.date_started));
    addDefinition(facts, "Completed", formatDate(artwork.date_completed));
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
  renderFinancialSnapshot();
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
      openCreateForm(button.dataset.toggleForm || "");
    });
  });
  document.querySelector<HTMLButtonElement>("[data-open-cost]")?.addEventListener("click", () => openCreateForm("cost"));
}

function openCreateForm(name: string): void {
  const form = document.querySelector<HTMLFormElement>(`[data-${name}-form]`);
  if (!form) return;
  const nouns: Record<string, string> = { cost: "Cost Entry", labor: "Labor Entry", pricing: "Pricing Scenario", history: "Price" };
  if (!form.hidden && form.dataset.editing !== "true") {
    form.hidden = true;
    return;
  }
  if (name === "cost") editingCostId = null;
  if (name === "labor") editingLaborId = null;
  if (name === "pricing") editingScenarioId = null;
  if (name === "history") editingHistoryId = null;
  form.reset();
  setFormMode(form, false, nouns[name]);
  const today = new Date().toISOString().slice(0, 10);
  form.querySelectorAll<HTMLInputElement>("input[type=date][required]").forEach((field) => { field.value = today; });
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function wireForms(): void {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll<HTMLInputElement>("input[type=date][required]").forEach((field) => { if (!field.value) field.value = today; });
  document.querySelectorAll<HTMLInputElement>("input[type=date]").forEach((field) => {
    field.addEventListener("click", () => {
      if ("showPicker" in field) field.showPicker();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-cancel-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest<HTMLFormElement>("form");
      if (!form) return;
      if (form.matches("[data-cost-form]")) editingCostId = null;
      if (form.matches("[data-labor-form]")) editingLaborId = null;
      if (form.matches("[data-pricing-form]")) editingScenarioId = null;
      if (form.matches("[data-history-form]")) editingHistoryId = null;
      const noun = form.matches("[data-cost-form]") ? "Cost Entry"
        : form.matches("[data-labor-form]") ? "Labor Entry"
          : form.matches("[data-pricing-form]") ? "Pricing Scenario" : "Price";
      closeForm(form, noun);
    });
  });

  document.querySelector<HTMLFormElement>("[data-target-price-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    await submitLocked(button, async () => {
      const raw = formValue(new FormData(form), "target_price");
      const targetPriceCents = raw ? dollarsToCents(raw) : null;
      const { error } = await client.from("artworks").update({ target_price_cents: targetPriceCents }).eq("id", artwork.id);
      if (error) throw error;
      artwork.target_price_cents = targetPriceCents;
      renderSummary();
      showSuccess("Target artwork price updated.");
    }).catch(showStudioError);
  });

  document.querySelector<HTMLButtonElement>("[data-add-category]")?.addEventListener("click", async () => {
    const name = window.prompt("New cost category name")?.trim();
    if (!name) return;
    const otherIndex = categories.findIndex((category) => category.category_kind === "other" || category.name.toLowerCase() === "other");
    const sortOrder = otherIndex >= 0 ? otherIndex : categories.length;
    const { error } = await client.from("artwork_cost_categories").insert({
      artwork_id: artwork.id,
      name,
      category_kind: "materials",
      sort_order: sortOrder
    });
    if (error) return showStudioError(error);
    const refreshed = normalizeCategoryOrder([...categories, {
      id: "",
      artwork_id: artwork.id,
      name,
      category_kind: "materials",
      sort_order: sortOrder
    }]);
    const existingOnly = refreshed.filter((category) => category.id);
    await Promise.all(existingOnly.map((category, index) =>
      client.from("artwork_cost_categories").update({ sort_order: category.name.toLowerCase() === "other" ? refreshed.length - 1 : index }).eq("id", category.id)
    ));
    await loadFinancials();
    showSuccess(`Category “${name}” added above Other.`);
  });

  document.querySelector<HTMLFormElement>("[data-cost-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    await submitLocked(button, async () => {
      const wasEditing = Boolean(editingCostId);
      const values = new FormData(form);
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
      if (result.error) throw result.error;
      editingCostId = null;
      closeForm(form, "Cost Entry");
      await loadFinancials();
      showSuccess(wasEditing ? "Cost entry updated." : "Cost entry added.");
    }).catch(showStudioError);
  });

  document.querySelector<HTMLFormElement>("[data-labor-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    await submitLocked(button, async () => {
      const wasEditing = Boolean(editingLaborId);
      const values = new FormData(form);
      const durationMinutes = numberValue(values, "whole_hours") * 60 + numberValue(values, "quarter_minutes");
      if (durationMinutes < 15) throw new Error("Choose at least 1/4 hour for the labor duration.");
      const hourly = dollarsToCents(formValue(values, "hourly_value"));
      const record = {
        artwork_id: artwork.id,
        task: formValue(values, "task"),
        entry_date: formValue(values, "entry_date"),
        duration_minutes: durationMinutes,
        hours: durationMinutes / 60,
        hourly_value_cents: hourly,
        labor_total_cents: laborTotalMinutes(durationMinutes, hourly),
        notes: formValue(values, "notes") || null
      };
      const result = editingLaborId
        ? await client.from("artwork_labor_entries").update(record).eq("id", editingLaborId)
        : await client.from("artwork_labor_entries").insert(record);
      if (result.error) throw result.error;
      editingLaborId = null;
      closeForm(form, "Labor Entry");
      await loadFinancials();
      showSuccess(wasEditing ? "Labor entry updated." : "Labor entry added.");
    }).catch(showStudioError);
  });

  document.querySelector<HTMLFormElement>("[data-pricing-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    await submitLocked(button, async () => {
      const wasEditing = Boolean(editingScenarioId);
      const values = new FormData(form);
      const record = {
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
      };
      const result = editingScenarioId
        ? await client.from("artwork_pricing_scenarios").update(record).eq("id", editingScenarioId)
        : await client.from("artwork_pricing_scenarios").insert(record);
      if (result.error) throw result.error;
      editingScenarioId = null;
      closeForm(form, "Pricing Scenario");
      await loadFinancials();
      showSuccess(wasEditing ? "Pricing scenario updated." : "Pricing scenario added.");
    }).catch(showStudioError);
  });

  document.querySelector<HTMLFormElement>("[data-history-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    await submitLocked(button, async () => {
      const wasEditing = Boolean(editingHistoryId);
      const values = new FormData(form);
      const priceCents = dollarsToCents(formValue(values, "price"));
      const priceType = formValue(values, "price_type");
      const record = {
        artwork_id: artwork.id,
        price_cents: priceCents,
        price_type: priceType,
        effective_date: formValue(values, "effective_date"),
        end_date: formValue(values, "end_date") || null,
        reason: formValue(values, "reason") || null,
        created_by: user.id
      };
      const result = editingHistoryId
        ? await client.from("artwork_price_history").update(record).eq("id", editingHistoryId)
        : await client.from("artwork_price_history").insert(record);
      if (result.error) throw result.error;
      const normalized = priceType.toLowerCase();
      if (normalized.includes("studio") && normalized.includes("retail")) {
        const { error: artworkError } = await client.from("artworks").update({ current_retail_price_cents: priceCents }).eq("id", artwork.id);
        if (artworkError) throw artworkError;
        artwork.current_retail_price_cents = priceCents;
        renderOverview();
      }
      editingHistoryId = null;
      closeForm(form, "Price");
      await loadFinancials();
      showSuccess(wasEditing ? "Price record updated." : "Price recorded.");
    }).catch(showStudioError);
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
