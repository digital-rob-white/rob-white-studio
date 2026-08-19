# Artwork Website Publishing v0.1

The Website screen at `/studio/artwork/website?id=…` turns one private Artwork record into a controlled public page without exposing the complete Artwork row.

## Public boundary

The browser-facing website reads only:

- `public.public_artwork_pages`
- `public.public_artwork_media`

Both are `security_invoker` views over RLS-protected publishing tables. Anonymous access to the earlier `public.artworks` route is removed. Costs, labor, internal notes, contacts, collectors, pricing scenarios, acquisition history, and private file records are not included in either public view.

## Workflow

1. Open an existing Artwork record and choose **Website**.
2. Prepare the public identity, story, commerce choices, and stable slug.
3. Choose the exact images allowed on the website, set roles, captions, and order.
4. Choose **Preview Public Page**. Preview uses the real public template with an authenticated draft query and signed private image URLs.
5. Choose **Publish**. The selected private originals are copied into the public Artwork bucket, the publication becomes visible through the anonymous views, and the stable URL is `/artwork/<slug>/`.
6. Choose **Hide from Website** to remove the public database row and delete its public image copies. Private originals remain unchanged.

Publication status changes use the existing Studio Feed and create Ready, Published, Hidden, and Sold Archive activity.

## Applied migration

The live Supabase project received:

- `artwork_website_publishing_v01`
- `artwork_website_publishing_indexes_v01`

The second migration adds covering indexes for the two new foreign keys. The repository SQL contains both indexes for a clean installation.

## Verification

- Both publishing tables have RLS enabled.
- Anonymous users see a Published test row and do not see a Hidden test row.
- Anonymous users cannot query the private `artworks` table directly.
- Supabase Security Advisor reports no findings.
- Local lint, Astro diagnostics, tests, and production build pass.
