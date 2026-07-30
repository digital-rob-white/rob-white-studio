import { describe, expect, it } from "vitest";
import {
  allocatedCost,
  dollarsToCents,
  formatInches,
  formatLaborDuration,
  laborTotal,
  laborTotalMinutes,
  normalizeInches,
  parseInches,
  pricingIndicator,
  pricingOutcome
} from "./artwork";

describe("Artwork costing", () => {
  it("allocates only the portion of a reusable purchase used", () => {
    expect(allocatedCost({ purchaseCostCents: 4500, purchaseQuantity: 10, amountUsed: 2.5 })).toBe(1125);
  });

  it("never replaces a manual allocation", () => {
    expect(allocatedCost({
      purchaseCostCents: 4500,
      purchaseQuantity: 10,
      amountUsed: 2.5,
      manualOverrideCents: 1800
    })).toBe(1800);
  });

  it("rounds currency and labor safely to cents", () => {
    expect(dollarsToCents("19.999")).toBe(2000);
    expect(laborTotal(2.25, 3500)).toBe(7875);
    expect(laborTotalMinutes(135, 3500)).toBe(7875);
  });
});

describe("Artwork measurements", () => {
  it("formats inch dimensions as mixed sixteenth-inch fractions", () => {
    expect(formatInches(25.75)).toBe("25 3/4");
    expect(formatInches(37.25)).toBe("37 1/4");
    expect(formatInches(46.5)).toBe("46 1/2");
    expect(formatInches(0.0625)).toBe("1/16");
  });

  it("parses mixed fractions and normalizes decimals to a sixteenth", () => {
    expect(parseInches("25 3/4")).toBe(25.75);
    expect(parseInches('37 1/4"')).toBe(37.25);
    expect(normalizeInches(10.03)).toBe(10);
  });

  it("renders labor without decimal hours", () => {
    expect(formatLaborDuration(75)).toBe("1 1/4 hours");
    expect(formatLaborDuration(90)).toBe("1 1/2 hours");
    expect(formatLaborDuration(105)).toBe("1 3/4 hours");
    expect(formatLaborDuration(60)).toBe("1 hour");
  });
});

describe("Artwork pricing", () => {
  it("removes channel deductions before calculating profit", () => {
    const outcome = pricingOutcome({
      id: "scenario",
      artwork_id: "artwork",
      scenario_name: "Gallery",
      listed_price_cents: 400000,
      commission_percent: 50,
      platform_fee_percent: 0,
      fixed_fee_cents: 0,
      discount_percent: 0,
      discount_cents: 0,
      shipping_absorbed_cents: 10000,
      other_deductions_cents: 0,
      notes: null
    }, 50000, 125000);
    expect(outcome.netProceedsCents).toBe(190000);
    expect(outcome.cashProfitCents).toBe(140000);
    expect(outcome.fullyCostedProfitCents).toBe(65000);
  });

  it("returns informational guidance without changing the price", () => {
    expect(pricingIndicator(9000, 10000, 20000)).toBe("Below cash cost");
    expect(pricingIndicator(15000, 10000, 20000)).toBe("Covers cash cost only");
    expect(pricingIndicator(25000, 10000, 20000)).toBe("Positive fully costed margin");
  });
});
