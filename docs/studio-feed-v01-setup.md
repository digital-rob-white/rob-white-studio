# Studio Feed v0.1 Setup

The Studio Feed is the authenticated landing screen at `/studio`. It reads private activity records from Supabase after authentication and contains no private data in Astro's static HTML.

## Supabase migration

After the existing platform and Journal migrations, run:

```text
docs/supabase-studio-feed-v01.sql
```

The migration:

- creates `studio_activities` with extensible text activity/object types and JSON metadata;
- enables row-level security and permits each authenticated user to read only activity attributed to that user;
- records Journal creation and updates with PostgreSQL triggers;
- records completed Journal follow-ups separately;
- records Journal photo uploads, combining photos uploaded in the same two-minute batch;
- removes an object's activity when that Journal entry is permanently deleted; and
- creates no sample or historical activity.

Run the migration before deploying the Feed UI so `/studio` never requests a table that does not exist.

## Routes and navigation

- `/studio/login` authenticates the owner.
- `/studio` opens the Studio Feed and is the default post-login destination.
- `/studio/journal` remains the Journal index.

Activity cards link directly to the related Journal entry. Other module filters are present as the stable Feed vocabulary, but their activity producers stay inactive until those modules have working destination screens.

## Acceptance checklist

1. While signed out, open `/studio` and confirm it redirects to `/studio/login?returnTo=%2Fstudio`.
2. Sign in and confirm an empty Feed displays the intended empty state.
3. Create a Journal entry and confirm a **Journal Created** item appears under **Today**.
4. Add several photos in one save and confirm one photo activity reports the batch count and shows a private signed thumbnail.
5. Edit the entry and confirm a concise **Journal Updated** item appears.
6. Mark it for follow-up, then complete it and confirm **Follow-up Completed** appears.
7. Search by the Journal title and filter by **Journal**, **Completed**, and **Follow-ups**.
8. Open an activity and confirm it navigates directly to the correct Journal entry.
9. Delete the Journal entry and confirm its now-invalid activity is removed.
10. Repeat the core checks at desktop and phone widths.

## Deployment

No new environment variables or services are required. After applying the migration, use the existing Netlify workflow:

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

Push the feature branch, review its Netlify Deploy Preview, and merge only after the authenticated acceptance checklist passes.

## Deferred producers

Projects, Artwork, Clients, Collectors, Estimates, Invoices, files outside the Journal, reminders, and system notes are represented by the extensible Feed model and UI vocabulary. Their automatic producers and destination links are intentionally deferred until each corresponding Studio module exists.
