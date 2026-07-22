# Rob White Studio

The public Astro website and private Studio tools for [robwhitestudio.com](https://robwhitestudio.com).

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The public site works without backend variables. The private Journal requires a Supabase project and the two public values documented in `.env.example`.

## Journal backend setup

1. Create a Supabase project.
2. In its SQL Editor, run `docs/supabase-schema.sql` for a new project.
3. If the platform foundation was applied previously, run `docs/supabase-journal-v01.sql` instead.
4. In Supabase Authentication, create the owner email/password user. There is no public sign-up screen.
5. Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` locally and in Netlify.

The SQL enables row-level security and creates the private `studio-private` Storage bucket. Never expose a service-role key in an Astro `PUBLIC_` variable.

## Verification

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

## Deployment

Netlify builds `main` with `pnpm run build` and publishes `dist`. Test feature branches through a Deploy Preview before merging to production.

See `docs/journal-v01-setup.md` for the complete Journal setup and acceptance checklist.
