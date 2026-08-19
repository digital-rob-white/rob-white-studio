# Rob White Studio

The public Astro website and private Studio tools for [robwhitestudio.com](https://robwhitestudio.com).

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The public site works without backend variables. The private Journal requires a Supabase project and the two public values documented in `.env.example`.

## Studio backend setup

1. Create a Supabase project.
2. In its SQL Editor, run `docs/supabase-schema.sql` for a new project.
3. If the platform foundation was applied previously, run `docs/supabase-journal-v01.sql` instead.
4. Run `docs/supabase-studio-feed-v01.sql` to add the Studio Feed and its automatic Journal activity triggers.
5. Run `docs/supabase-artwork-v01.sql` to add Artwork records, costing, labor, pricing, price history, Journal relationships, and Artwork activity.
6. Run `docs/supabase-artwork-v02-refinements.sql`, then `docs/supabase-artwork-catalogs-v01.sql` to add refined Artwork entry fields and native catalog/PDF workflows.
7. Run `docs/supabase-security-cleanup-v01.sql` last to apply the current access model and function hardening.
8. In Supabase Authentication, create the owner email/password user. There is no public sign-up screen. Add that user's profile to `public.users` using an administrator-controlled SQL or server-side workflow; browser clients cannot self-enroll.
9. Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` locally and in Netlify.

The SQL enables row-level security, creates the private `studio-private` Storage bucket, and restricts Studio data to explicitly enrolled members. Never expose a service-role or secret key in an Astro `PUBLIC_` variable.

## Verification

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

## Deployment

Netlify builds `main` with `pnpm run build` and publishes `dist`. Test feature branches through a Deploy Preview before merging to production.

See `docs/journal-v01-setup.md`, `docs/studio-feed-v01-setup.md`, and `docs/artwork-v01-setup.md` for setup and acceptance checklists.
