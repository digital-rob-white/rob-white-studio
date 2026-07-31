export const PRODUCTION_STATUSES = [
  ["concept", "Concept"],
  ["in_progress", "In Progress"],
  ["complete", "Complete"],
  ["on_hold", "On Hold"],
  ["archived", "Archived"]
] as const;

export const AVAILABILITY_STATUSES = [
  ["not_for_sale", "Not for Sale"],
  ["available", "Available"],
  ["on_hold", "On Hold"],
  ["consigned", "Consigned"],
  ["sold", "Sold"]
] as const;

export const ARTWORK_TEMPLATES: Record<string, string[]> = {
  painting: ["Support / Canvas", "Paint", "Mediums and Solvents", "Framing and Fabrication", "Outside Services", "Packaging", "Other"],
  sculpture: ["Primary Materials", "Armature and Hardware", "Finishing", "Fabrication", "Outside Services", "Packaging", "Other"],
  mixed_media: ["Supports", "Image and Color Materials", "Found Materials", "Fabrication", "Outside Services", "Packaging", "Other"],
  furniture: ["Wood and Primary Materials", "Hardware", "Finishing", "Fabrication", "Outside Services", "Packaging", "Other"],
  custom: ["Materials", "Fabrication", "Outside Services", "Packaging", "Other"]
};

export const PRICING_SCENARIOS = [
  "Direct Collector",
  "Studio Website",
  "Gallery",
  "Designer / Trade",
  "Wholesale",
  "Custom"
] as const;

export const IMAGE_TAGS = [
  ["primary", "Primary"],
  ["process", "Process"],
  ["detail", "Detail"],
  ["finished", "Finished"],
  ["hardware", "Hardware"],
  ["installation", "Installation"],
  ["framing", "Framing"],
  ["packaging", "Packaging"],
  ["other", "Other"]
] as const;

export const FRAME_STATUSES = [
  ["framed", "Framed"],
  ["unframed", "Unframed"],
  ["frame_optional", "Frame optional"],
  ["not_applicable", "Not applicable"]
] as const;

export const INCH_FRACTIONS = [
  [0, ""],
  [1, "1/16"],
  [2, "1/8"],
  [3, "3/16"],
  [4, "1/4"],
  [5, "5/16"],
  [6, "3/8"],
  [7, "7/16"],
  [8, "1/2"],
  [9, "9/16"],
  [10, "5/8"],
  [11, "11/16"],
  [12, "3/4"],
  [13, "13/16"],
  [14, "7/8"],
  [15, "15/16"]
] as const;

export type Artwork = {
  id: string;
  owner_id: string | null;
  title: string;
  inventory_number: string | null;
  year: number | null;
  artwork_type: string;
  medium: string | null;
  materials_description: string | null;
  frame_status: string;
  frame_description: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimension_unit: string;
  weight: number | null;
  weight_unit: string;
  collection_name: string | null;
  production_status: string;
  availability: string;
  location: string | null;
  date_started: string | null;
  date_completed: string | null;
  description_public: string | null;
  notes_private: string | null;
  primary_image_id: string | null;
  target_price_cents: number | null;
  current_retail_price_cents: number | null;
  sold_price_cents: number | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CostEntry = {
  id: string;
  artwork_id: string;
  category_id: string;
  item_name: string;
  manufacturer: string | null;
  color_variant: string | null;
  vendor: string | null;
  entry_date: string;
  unit: string;
  purchase_quantity: number | null;
  purchase_cost_cents: number | null;
  amount_used: number | null;
  allocated_cost_cents: number;
  manual_cost_override_cents: number | null;
  notes: string | null;
};

export type LaborEntry = {
  id: string;
  artwork_id: string;
  task: string;
  entry_date: string;
  hours: number;
  duration_minutes: number;
  hourly_value_cents: number;
  labor_total_cents: number;
  notes: string | null;
};

export type PricingScenario = {
  id: string;
  artwork_id: string;
  scenario_name: string;
  listed_price_cents: number;
  commission_percent: number;
  platform_fee_percent: number;
  fixed_fee_cents: number;
  discount_percent: number;
  discount_cents: number;
  shipping_absorbed_cents: number;
  other_deductions_cents: number;
  notes: string | null;
};

export function dollarsToCents(value: FormDataEntryValue | string | number | null | undefined): number {
  const normalized = String(value ?? "").replace(/[$,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function centsToInput(cents: number | null | undefined): string {
  return ((cents || 0) / 100).toFixed(2);
}

export function money(cents: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export function allocatedCost(input: {
  purchaseCostCents?: number | null;
  purchaseQuantity?: number | null;
  amountUsed?: number | null;
  manualOverrideCents?: number | null;
  directAllocatedCents?: number | null;
}): number {
  if (input.manualOverrideCents != null) return Math.max(0, Math.round(input.manualOverrideCents));
  if (input.purchaseCostCents != null && input.purchaseQuantity && input.amountUsed != null) {
    return Math.max(0, Math.round(input.purchaseCostCents * (input.amountUsed / input.purchaseQuantity)));
  }
  return Math.max(0, Math.round(input.directAllocatedCents || 0));
}

export function laborTotal(hours: number, hourlyValueCents: number): number {
  return Math.max(0, Math.round(hours * hourlyValueCents));
}

export function laborTotalMinutes(durationMinutes: number, hourlyValueCents: number): number {
  return Math.max(0, Math.round((durationMinutes * hourlyValueCents) / 60));
}

export function normalizeInches(value: number): number {
  return Math.max(0, Math.round(value * 16) / 16);
}

export function formatInches(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const sixteenths = Math.max(0, Math.round(value * 16));
  const whole = Math.floor(sixteenths / 16);
  const fraction = INCH_FRACTIONS[sixteenths % 16]?.[1] || "";
  if (!whole && fraction) return fraction;
  return fraction ? `${whole} ${fraction}` : String(whole);
}

export function parseInches(value: string): number | null {
  const normalized = value.trim().replace(/["″]/g, "");
  if (!normalized) return null;
  const mixed = normalized.match(/^(\d+)?(?:\s+)?(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1] || 0);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (!denominator) return null;
    return normalizeInches(whole + numerator / denominator);
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? normalizeInches(numeric) : null;
}

export function formatLaborDuration(durationMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(durationMinutes / 15) * 15);
  const whole = Math.floor(safeMinutes / 60);
  const fraction = ["", "1/4", "1/2", "3/4"][Math.floor((safeMinutes % 60) / 15)];
  const amount = fraction ? `${whole ? `${whole} ` : ""}${fraction}` : String(whole);
  return `${amount} ${safeMinutes === 60 ? "hour" : "hours"}`;
}

export function pricingOutcome(
  scenario: PricingScenario,
  cashCostCents: number,
  totalInvestedCostCents: number
) {
  const listed = Math.max(0, scenario.listed_price_cents);
  const percentDeductions = Math.round(listed * (
    Number(scenario.commission_percent || 0)
    + Number(scenario.platform_fee_percent || 0)
    + Number(scenario.discount_percent || 0)
  ) / 100);
  const fixedDeductions =
    scenario.fixed_fee_cents
    + scenario.discount_cents
    + scenario.shipping_absorbed_cents
    + scenario.other_deductions_cents;
  const totalDeductionsCents = Math.min(listed, Math.max(0, percentDeductions + fixedDeductions));
  const netProceedsCents = listed - totalDeductionsCents;
  const cashProfitCents = netProceedsCents - cashCostCents;
  const fullyCostedProfitCents = netProceedsCents - totalInvestedCostCents;
  const netMarginPercent = listed > 0 ? (fullyCostedProfitCents / listed) * 100 : 0;
  return { totalDeductionsCents, netProceedsCents, cashProfitCents, fullyCostedProfitCents, netMarginPercent };
}

export function pricingIndicator(listedPriceCents: number, cashCostCents: number, totalInvestedCostCents: number): string {
  if (cashCostCents === 0 && totalInvestedCostCents === 0) return "Missing cost information";
  if (listedPriceCents < cashCostCents) return "Below cash cost";
  if (listedPriceCents < totalInvestedCostCents) return "Covers cash cost only";
  if (listedPriceCents === totalInvestedCostCents) return "Covers materials and labor";
  return "Positive fully costed margin";
}

export function validateArtwork(input: { title: string; inventoryNumber?: string }) {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "Give the artwork a title.";
  if (input.inventoryNumber != null && input.inventoryNumber.length > 80) {
    errors.inventory_number = "Keep the inventory number under 80 characters.";
  }
  return errors;
}
