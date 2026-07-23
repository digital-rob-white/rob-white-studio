# Rob White Studio App Architecture

This document defines the target application architecture for the Rob White
Studio website and private studio platform.

Primary references:

- `ARCHITECT_REVIEW.md`
- `docs/platform-data-model.md`
- `docs/roadmap.md`

## Architecture Summary

Rob White Studio should evolve from a static website into a two-part system:

- Public website: content, artwork, services, public journal, contact.
- Private studio app: authenticated tools for clients, projects, artwork,
  journal entries, services, materials, estimates, files, and studio operations.

Recommended stack:

- Frontend: Astro
- Backend: Supabase
- Database: Supabase Postgres
- Auth: Supabase Auth
- File storage: Supabase Storage
- Hosting: Netlify
- Source control: GitHub

## System Diagram

```text
GitHub repository
  |
  | push to main
  v
Netlify build + deploy
  |
  | serves public pages and server-backed routes
  v
robwhitestudio.com
  |
  | public content
  v
Public website

robwhitestudio.com/studio
  |
  | authenticated requests
  v
Private Studio app
  |
  | Supabase client/server APIs
  v
Supabase
  |-- Auth
  |-- Postgres
  |-- Storage
  |-- Row-level security
```

## Public Website

Public pages should remain fast, clear, and content-forward.

Initial public routes:

- `/`
- `/journal`
- `/artwork`
- `/services`
- `/contact`

Early Astro migration may preserve only the existing routes:

- `/`
- `/journal`

Public website responsibilities:

- Present Rob White Studio clearly.
- Show selected artwork and services.
- Publish public journal entries.
- Link to contact, Instagram, Etsy, and future sales channels.
- Avoid exposing internal records or pricing logic.

## Private Studio App

The private platform should live under:

- `/studio`

Initial private routes:

- `/studio/login`
- `/studio`
- `/studio/contacts`
- `/studio/projects`
- `/studio/journal`
- `/studio/artwork`
- `/studio/services`
- `/studio/estimates`

Future private routes:

- `/studio/materials`
- `/studio/files`
- `/studio/tasks`
- `/studio/settings`

Private app responsibilities:

- Authenticate studio users.
- Orient the owner with a chronological Studio Feed at `/studio`.
- Protect internal data.
- Manage contacts, projects, artwork, journal entries, services, materials,
  estimates, uploaded files, and operational notes.
- Share the visual language of the public site.

## Astro Application Structure

Target structure after migration:

```text
src/
  components/
    ArtworkCard.astro
    Footer.astro
    Header.astro
    JournalCard.astro
    StudioNav.astro
  layouts/
    BaseLayout.astro
    StudioLayout.astro
  lib/
    supabase/
      browser.ts
      server.ts
    auth.ts
  pages/
    index.astro
    journal.astro
    studio/
      index.astro
      login.astro
      contacts/
        index.astro
      projects/
        index.astro
      journal/
        index.astro
      artwork/
        index.astro
      services/
        index.astro
      estimates/
        index.astro
  styles/
    global.css
public/
  assets/
    images/
```

Notes:

- Public components and Studio components can share design tokens.
- `StudioLayout.astro` should not feel like a generic admin template.
- Keep public content and private data boundaries explicit.

## Rendering Strategy

Astro should use a mixed rendering approach.

Public pages:

- Static where possible.
- Fast to load.
- Safe to cache.

Private `/studio` pages:

- Server-rendered or protected by server-side checks when needed.
- Must verify auth before showing private data.
- Must not include internal data in public static builds.

Rule:

- If a page contains private data, do not generate it as public static HTML.

## Supabase Responsibilities

Supabase should provide:

- Auth
- Postgres database
- File storage
- Row-level security
- Optional server-side functions later

Initial database areas:

- Studio activities
- Contacts
- Projects
- Artwork
- Journal entries
- Services
- Materials
- Estimates
- Estimate line items
- File assets
- Tasks

## Authentication

Authentication should begin simply:

- One owner account.
- Email/password or magic link.
- Protected `/studio` routes.

Future roles:

- `owner`
- `admin`
- `assistant`
- `viewer`

Auth rules:

- Unauthenticated users can only access public website routes.
- Authenticated users can access `/studio`.
- Role checks should be added before inviting additional users.

## Authorization And Row-Level Security

Supabase row-level security should protect private records.

Public data rules:

- Public artwork can be shown when `is_public = true`.
- Public journal entries can be shown when `visibility = 'public'` and
  `status = 'published'`.
- Public file assets can be shown when `visibility = 'public'`.

Private data rules:

- Internal journal entries require authentication.
- Client/contact data requires authentication.
- Estimates require authentication.
- Internal files require authentication.
- Pricing logic and private notes require authentication.

Important:

- Frontend filtering is not privacy.
- Private data must be blocked at the database/API layer.

## File Storage

Supabase Storage should eventually hold:

- Artwork images
- Process photos
- Project files
- Estimate PDFs
- Client-supplied reference files
- Internal documentation

Initial buckets:

- `public-artwork`
- `studio-private`
- `estimate-pdfs`

Rules:

- Public artwork bucket may allow public reads.
- Private studio buckets require authentication.
- Do not put private files in the public website repo.

## Environment Variables

Expected environment variables:

```text
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- `PUBLIC_SUPABASE_URL` can be exposed to browser code.
- `PUBLIC_SUPABASE_ANON_KEY` can be exposed to browser code if row-level
  security is correctly configured.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to browser code.
- Secret values must not be committed to Git.
- Netlify should store production environment variables.

## Netlify Responsibilities

Netlify should eventually replace GitHub Pages for the Astro app.

Netlify responsibilities:

- Build Astro from GitHub.
- Serve `robwhitestudio.com`.
- Store environment variables.
- Provide deploy previews.
- Support server-side routes/functions when needed.

Migration approach:

1. Keep GitHub Pages live while building the Astro version.
2. Deploy Astro to a Netlify preview URL.
3. Verify public site parity.
4. Add Supabase environment variables.
5. Add `/studio` shell.
6. Point `robwhitestudio.com` to Netlify when ready.

## Public vs Private Data Boundary

Public data can appear on:

- Static pages
- Public database queries
- Public image buckets

Private data must only appear after authentication:

- Internal notes
- Client records
- Project private notes
- Estimate records
- Pricing rules
- Private files
- Draft internal journal entries

Implementation rule:

- Do not ship private content in JavaScript, static HTML, JSON files, or public
  assets and merely hide it with CSS or frontend filters.

## UI Direction

The Studio app should extend the public site, not imitate generic admin
software.

Design principles:

- Bold typography.
- Painterly color palette.
- Minimal but expressive controls.
- Generous spacing.
- Strong hierarchy.
- Studio-specific labels and workflows.
- Calm operational surfaces.

Avoid:

- Generic SaaS dashboards.
- Dense tables as the only interaction model.
- Blue-gray admin themes.
- Placeholder business language.

Preferred language:

- Projects instead of deals.
- Studio notes instead of comments.
- Artwork records instead of products.
- Estimates instead of quotes when that fits studio language.
- Materials and services as studio production references.

## First Implementation Sequence

Recommended implementation order:

1. Create `docs/supabase-schema.sql`.
2. Convert current static site to Astro.
3. Deploy Astro preview to Netlify.
4. Add Supabase environment variables.
5. Build `/studio/login`.
6. Build `/studio` dashboard shell.
7. Add contacts.
8. Add projects.
9. Add journal entries.
10. Add artwork records.
11. Add services/materials.
12. Add estimates.

## Risks And Decisions To Revisit

### Astro Server Mode

Decision needed during migration:

- Use static output first, then enable server rendering when `/studio` needs it.
- Or configure server output from the beginning.

Recommendation:

- Start with the simplest Astro migration that preserves the public site.
- Enable server-side behavior when the first protected Studio route is built.

### File Relationships

Initial file model may use direct foreign keys.

Long-term architecture should allow a file to belong to multiple records through
`file_links`, as noted in `ARCHITECT_REVIEW.md`.

### Project Participants

Initial project model may use one primary `contact_id`.

Long-term architecture should allow multiple contacts per project through a
`project_contacts` join table.

### Artwork Status

Avoid overloading one artwork status field forever.

Future model should distinguish:

- Production status
- Availability
- Archive state
- Public visibility

## Definition Of Done For Architecture Foundation

The v0.4 architecture foundation is complete when the repo includes:

- `ARCHITECT_REVIEW.md`
- `docs/platform-data-model.md`
- `docs/roadmap.md`
- `docs/app-architecture.md`
- `docs/supabase-schema.sql`

After that, implementation can safely begin with either:

- Astro migration, or
- Supabase schema setup.
