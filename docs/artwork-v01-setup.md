# Artwork v0.1 Setup

Artwork v0.1 adds permanent artwork records, artwork-owned costing, studio labor valuation, sales-channel pricing scenarios, retained price history, Journal relationships, private images, and intentional Studio Feed activity.

## Supabase migration

After the platform, Journal, and Studio Feed migrations, run:

```text
docs/supabase-artwork-v01.sql
```

The migration extends the existing `artworks` table instead of creating a duplicate cost-project record. Financial values are persisted as integer USD cents. Child records are protected by row-level security through their owning artwork.

Existing artwork rows without an owner remain visible to authenticated Studio users for migration purposes. The next successful edit assigns the current user as owner. New records are always owner-scoped.

## Routes

- `/studio/artwork`
- `/studio/artwork/new`
- `/studio/artwork/entry?id=…`
- `/studio/artwork/edit?id=…`

The `entry?id=…` form follows the established Journal routing convention. The site remains a static Astro/Netlify application while authenticated records are loaded after sign-in.

## Calculation behavior

The old standalone calculator used browser storage, floating-point dollars, `quantity × unit cost`, a single target price, and recursively linked project totals. Artwork v0.1 intentionally changes those behaviors:

- Money is stored as integer cents.
- A reusable purchase is allocated as `purchase cost × (amount used ÷ purchase quantity)`.
- A direct allocated cost can be entered when usage is not measurable.
- A manual allocation always wins and is never silently recalculated.
- Studio labor is logged separately as `hours × hourly value`; it is not called profit.
- Direct artwork-owned framing and fabrication categories replace recursive cost-sheet links.
- Each pricing scenario removes commissions, fees, discounts, absorbed shipping, and other deductions before showing net proceeds.
- Cash profit and fully costed profit are shown separately.
- Pricing indicators are informational and never change the entered price.
- Recording a new price creates history; it does not overwrite earlier price records.

## Acceptance checklist

1. Apply the migration, sign in, and create a painting with a primary image.
2. Confirm it appears in the Artwork archive and survives another authenticated session.
3. Add a reusable material purchase with purchase quantity and amount used; verify the partial allocation.
4. Add a direct allocation and a manual override; verify the manual amount remains authoritative.
5. Add labor hours and confirm cash cost, labor value, and total invested cost remain distinct.
6. Add Direct Collector, Studio Website, and Gallery pricing scenarios and verify deductions and net proceeds.
7. Record two studio retail prices and confirm both remain in Price History.
8. Create a related Journal entry from the Artwork record and confirm both directions link correctly.
9. Change production status, mark the work available, and add a cost; confirm meaningful Feed entries.
10. Check the archive, detail workflow, costing forms, and pricing cards at desktop and phone widths.
11. Cancel an artwork deletion, then confirm deletion warns that financial children will be removed and Journal entries detached.

## Deferred

Collectors, exhibitions, consignments, certificates, ecommerce, tax accounting, receipt OCR, inventory depletion, external shipping rates, and automated price recommendations remain out of scope.
