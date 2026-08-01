# Artwork Catalogs v0.1 Setup

Artwork Catalogs creates presentation records from permanent Artwork records without duplicating artwork data or image files.

## Database

After the base schema and Artwork v0.2 migrations, run:

```sql
docs/supabase-artwork-catalogs-v01.sql
```

The additive migration creates:

- `artwork_catalogs` for catalog identity, layout, recipient, date, and export history.
- `artwork_catalog_items` for ordering, image selection, presentation overrides, and price snapshots.
- `studio_business_settings` for the reusable Rob White Studio contact block.
- `duplicate_artwork_catalog` for an atomic, owner-scoped copy of a catalog and its ordered items.
- Structured artwork frame status and frame description fields.
- Owner-scoped row-level security and intentional Studio Feed activity.

Deleting a catalog cascades only its catalog items. Canonical Artwork and image records remain intact. Deleting artwork that is used in a catalog is restricted until it is removed from the catalog.

## PDF approach

Catalog previews and PDFs are generated natively in the authenticated browser with jsPDF. The export:

- uses exact US Letter landscape (`11 × 8.5` inches) or portrait (`8.5 × 11` inches) pages;
- loads original private Artwork images with short-lived signed URLs;
- fits images proportionally without cropping;
- uses deterministic compact-grid or large-image-grid pagination;
- places the centralized contact block at the lower right of every page;
- records the latest export timestamp and a Studio Feed event.

No third-party document service receives artwork data, and the historical catalog is not embedded or required at runtime.

## Acceptance check

1. Create a catalog with different internal and public names.
2. Add several real artwork records in bulk.
3. Add one artwork from its Artwork detail page.
4. Reorder items by dragging and with the accessible move buttons.
5. Save title, image, materials, dimension, frame, and price overrides.
6. Confirm an override does not modify the canonical Artwork record.
7. Switch between compact and large-image layouts.
8. Preview a catalog with more than one page and confirm page boundaries.
9. Export both orientations and inspect the PDFs at exactly 11 × 8.5 and 8.5 × 11 inches.
10. Confirm artwork images are contained rather than cropped or stretched.
11. Confirm the contact block appears at the lower right of every page.
12. Confirm create, add, duplicate, and export activities appear in Studio Feed.
13. Duplicate a catalog from both the archive and catalog editor. Confirm the copy opens in details edit mode with a `Copy of …` internal name, matching ordered items and overrides, no previous export date, and no later changes shared with the source.
14. Delete a duplicated catalog, confirming Artwork and image records remain.
15. Repeat key selection, editing, preview, and export workflows on mobile.
