# Journal v0.1 Setup

Journal v0.1 is integrated into the Astro site under `/studio/journal`. The public site remains static and the private application loads data only after Supabase verifies the signed-in user.

## Supabase

For a new project, run `docs/supabase-schema.sql` in the Supabase SQL Editor. It now contains the complete Journal v0.1 fields, file relationships, authentication policies, and Storage buckets.

For a project where the earlier platform schema was already applied, run `docs/supabase-journal-v01.sql` instead.

Then create the owner account:

1. Open Supabase Dashboard → Authentication → Users.
2. Select **Add user**.
3. Create the owner email and password.
4. Leave public user registration disabled; the site intentionally has no sign-up screen.

The first authenticated Studio request creates the corresponding `public.users` profile if it is missing.

To make Journal actions appear in the Studio Feed, apply `docs/supabase-studio-feed-v01.sql` after the Journal migration.

## Environment variables

Use the project URL and publishable/anon key from Supabase Dashboard → Project Settings → API:

```env
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-publishable-anon-key"
```

These values are safe for browser use because database and Storage access is enforced by Supabase Auth and row-level security. Never place the service-role key in a `PUBLIC_` variable.

In Netlify, add them under **Project configuration → Environment variables**, including Deploy Previews if the preview should use the backend.

## Routes

- `/studio/login`
- `/studio` (Studio Feed)
- `/studio/journal`
- `/studio/journal/new`
- `/studio/journal/entry?id=…`
- `/studio/journal/edit?id=…`

The query-string ID routes allow the current static Astro/Netlify architecture to support database records without prebuilding private HTML for every entry.

## Storage

Images are uploaded directly to the private `studio-private` Supabase Storage bucket after authentication. File metadata is stored in `file_assets`. Images are shown through one-hour signed URLs, and storage policies reject unauthenticated access.

`file_links` preserves the future option to associate one asset with Journal entries, Projects, and Artwork. An image with other links is detached from a Journal entry instead of being physically deleted.

Accepted formats are JPEG, PNG, WebP, and GIF, with a 10 MB per-file limit enforced in both the UI and Storage bucket configuration.

## Deploy Preview checklist

1. Open `/studio/login` while signed out.
2. Confirm `/studio/journal` redirects to login.
3. Sign in with the owner account.
4. Create a short Internal entry without optional metadata.
5. Create an entry with multiple photos, captions, and alt text.
6. Search by title, body, tags, materials, and references.
7. Combine visibility, entry type, pinned, and follow-up filters.
8. Edit, pin, complete follow-up, and change visibility.
9. Confirm deletion can be cancelled, then delete the test record.
10. Repeat the core capture workflow on a phone-sized viewport.

## Deferred

- Active Project, Artwork, Client, and Collector selectors and embedded Journal panels
- Public delivery of eligible entries and unlisted direct links
- SEO, categories, publishing workflow, newsletters, sharing, and comments
- Additional user roles and permissions beyond the initial owner workflow
