# Rob White Studio Platform Roadmap

This roadmap turns the approved platform direction into an implementation
sequence. It should be updated as milestones are completed or priorities change.

Primary references:

- `ARCHITECT_REVIEW.md`
- `docs/platform-data-model.md`

## Guiding Direction

Rob White Studio should become both:

- A public-facing artist studio website.
- A private studio operating platform at `/studio`.

The platform should not feel like generic business software. It should carry
the same visual language as the public site: bold typography, painterly color,
minimal structure, and a studio-specific workflow.

## v0.4 - Architecture Foundation

Goal: turn the platform idea into clear implementation documents.

Status: in progress.

Scope:

- Commit `docs/platform-data-model.md`.
- Commit `ARCHITECT_REVIEW.md`.
- Create this roadmap.
- Create `docs/app-architecture.md`.
- Create `docs/supabase-schema.sql`.
- Decide on deployment target for the Astro app.

Acceptance criteria:

- The repo contains a clear product/architecture source of truth.
- The public website/private studio split is documented.
- The first database schema is drafted before UI work begins.
- The build order is explicit and reviewable.

Notes:

- Current recommendation: Astro frontend, Supabase backend, Netlify deployment.
- Keep GitHub Pages live until the Astro/Netlify migration is ready.

## v0.5 - Astro Migration

Goal: migrate the existing static website into Astro without redesigning it.

Scope:

- Create an Astro project structure.
- Move current pages into Astro routes:
  - `/`
  - `/journal`
- Create shared layout components:
  - base layout
  - header/navigation
  - footer
  - section wrapper
  - artwork card
  - journal card
- Move CSS into a global stylesheet or Astro-friendly structure.
- Preserve current branding, color palette, and visual behavior.
- Preserve favicon and local assets.

Acceptance criteria:

- The Astro site visually matches the current public site.
- Public pages build successfully.
- No backend functionality is required yet.
- The migration does not introduce private data into public HTML.

Deferred:

- Full CMS behavior.
- Supabase data loading.
- `/studio` protected routes.

## v0.6 - Supabase Foundation

Goal: establish the backend foundation for private studio features.

Scope:

- Create the initial Supabase schema.
- Add authentication.
- Add row-level security policies.
- Add storage buckets.
- Add environment variable documentation.
- Add seed data for services/materials if useful.

Initial tables:

- `contacts`
- `projects`
- `artworks`
- `journal_entries`
- `services`
- `materials`
- `estimates`
- `estimate_line_items`
- `file_assets`
- `tasks`

Acceptance criteria:

- The schema reflects `docs/platform-data-model.md`.
- Private records are protected by Supabase auth and row-level security.
- Public records can be queried safely without exposing internal data.
- Secret keys are not committed to Git.

Important:

- Browser code may use a public Supabase anon/publishable key.
- Service role keys, secret keys, database passwords, and private tokens must
  only live in server-side environment variables.

## v0.7 - Studio App Shell

Goal: create the first private `/studio` experience.

Scope:

- Add `/studio/login`.
- Add `/studio` dashboard.
- Add protected route behavior.
- Add Studio navigation.
- Add empty states for upcoming modules.

Dashboard modules:

- Contacts
- Projects
- Journal
- Artwork
- Services
- Estimates

Acceptance criteria:

- Unauthenticated users cannot access private studio routes.
- Logged-in users can reach the dashboard.
- The UI feels like Rob White Studio, not a generic admin template.
- The shell can support future CRUD screens.

## v0.8 - Core Records

Goal: make the private platform useful for daily studio records.

Scope:

- Contacts CRUD.
- Projects CRUD.
- Artwork CRUD.
- Journal entries with visibility states.

Priority details:

- Projects should keep a primary `contact_id` for now.
- Architecture should allow a future `project_contacts` join table.
- Artwork should plan for structured dimensions.
- Journal visibility should support at least `public` and `internal`, with
  `unlisted` planned.

Acceptance criteria:

- Studio records can be created, edited, viewed, and archived.
- Public records can be selectively surfaced on the website.
- Internal records stay behind authentication.
- The UI supports real studio language and workflows.

## v0.9 - Services, Materials, And Estimates

Goal: build the first pricing and estimating workflow.

Scope:

- Services table.
- Materials table.
- Estimate records.
- Estimate line items.
- Tax and deposit calculations.
- Estimate status workflow.
- PDF or print-ready estimate view.

Pricing areas:

- Original paintings
- Sculpture
- Custom hardwood framing
- Roland VG-540 printing
- CNC fabrication
- Labor
- Delivery
- Installation
- Specialty projects

Acceptance criteria:

- Estimates can be linked to contacts and projects.
- Estimate line items can use service defaults.
- Custom line items are supported.
- Totals, tax, and deposit values calculate correctly.
- Output is usable for real client communication.

## v1.0 - Working Studio Platform

Goal: reach a complete first private platform release.

Scope:

- Authenticated Studio app.
- Contacts.
- Projects.
- Artwork inventory.
- Public/internal journal.
- Services/materials.
- Estimates.
- File uploads.
- Basic dashboard.

Acceptance criteria:

- Rob White Studio can use the platform for real project tracking.
- Public website content can be informed by selected database records.
- Internal data remains private.
- The site and app share a cohesive visual system.

## Later Phases

Potential future work:

- Client portal.
- Invoice and payment tracking.
- Scheduling and calendar views.
- Inventory movement history.
- Supplier management.
- Shipping estimates.
- Artwork certificates or documentation packets.
- Advanced search.
- Content publishing workflow.
- Email notifications.
- Custom domain deployment for the Studio app.

## Immediate Next Tasks

1. Create `docs/app-architecture.md`.
2. Create `docs/supabase-schema.sql`.
3. Decide whether the Astro migration happens before or after the first schema draft.
4. Keep current public site stable while platform work begins in parallel.

Recommended next step:

- Create `docs/app-architecture.md` before writing code for Astro or Supabase.
