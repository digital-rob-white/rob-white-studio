# Rob White Studio Architecture Review

This file is the living product and architecture review for the Rob White
Studio website and platform. It should be updated whenever a significant
technical, product, or UI direction is approved.

Codex should consult this file before implementing new platform features.

## Architecture Review - July 16, 2026

### Overall Direction

The proposed data model in `docs/platform-data-model.md` is approved as the
foundation of the Rob White Studio Platform.

The long-term architecture should keep a clear separation between:

- Public website: `robwhitestudio.com`
- Private studio application: `/studio`

This separation is correct and should guide future implementation decisions.

### Deployment Milestone

July 16, 2026: Astro migration deployed to Netlify;
`robwhitestudio.com` now serves the Astro build.

The current production delivery chain is:

- Cloudflare DNS
- Netlify hosting/builds
- Astro static output

GitHub Pages is no longer the production host for `robwhitestudio.com`.

## Requested Improvements

### 1. Projects

The current model assumes one primary contact per project through `contact_id`.

Keep `contact_id` for now because it is useful and simple for early builds.
However, architect the schema so a future `project_contacts` join table can
support multiple participants on a project.

Future participant roles may include:

- Client
- Billing contact
- Collaborator
- Vendor
- Recipient
- Installer
- Gallery

### 2. Artwork Dimensions

Plan for structured dimensions instead of only a text field.

Future artwork fields should include:

- Width
- Height
- Depth
- Framed width
- Framed height
- Framed depth
- Weight
- Dimension unit
- Weight unit

These fields will support shipping estimates, inventory, artwork records, and
project planning.

### 3. Artwork Status

Separate artwork lifecycle from sales status.

Avoid relying on one combined `status` field forever. Future versions should
distinguish:

- Production status
- Availability
- Archive state
- Public visibility

Example future fields:

- `production_status`: `planned`, `in_progress`, `complete`, `on_hold`
- `availability`: `available`, `reserved`, `sold`, `not_for_sale`
- `archive_state`: `active`, `archived`
- `is_public`: `true`, `false`

### 4. Journal Visibility

The current public/internal visibility direction is approved.

Consider a future third state:

- `public`
- `internal`
- `unlisted`

Definitions:

- `public`: visible on the public website.
- `internal`: login-protected studio-only content.
- `unlisted`: not shown in public indexes, but available by direct link if
  intentionally shared.

Internal content must never be shipped in public HTML.

### 5. Files

The current file relationships are acceptable for the first backend milestone.

Long-term, consider replacing direct foreign keys with a polymorphic or
join-table relationship so one file can belong to multiple records.

Examples:

- One image attached to both an artwork record and a journal entry.
- One PDF attached to both a project and an estimate.
- One process photo attached to a project, artwork, and internal note.

Potential future table:

- `file_links`
  - `id`
  - `file_asset_id`
  - `record_type`
  - `record_id`
  - `relationship_type`

### 6. UI Direction

Do not build a generic admin dashboard.

The private Studio platform should share the same visual language as the public
website:

- Custom glyphs
- Painterly color palette
- Minimal interface
- Generous spacing
- Strong typography
- Rob White Studio branding

Every private feature should feel like part of the Studio rather than ordinary
business software.

The interface can be operational and efficient, but it should not become bland
SaaS. The studio app should feel custom, tactile, and deliberate.

### 7. Build Priority

The current build order is approved:

1. Authentication
2. Dashboard
3. Contacts
4. Projects
5. Journal
6. Artwork
7. Services
8. Estimates

Each stage should reinforce the platform model rather than produce isolated
screens.

## Guiding Principle

Every technical decision should reinforce this idea:

> Build software that works the way Rob White Studio operates, not software
> that forces Rob White Studio to operate like everyone else's business.

## Working Agreement

This file should become the shared source of truth for architecture and product
decisions.

When a significant milestone is finished, the commit or pull request should be
reviewed against this document. New architectural decisions should be appended
here so the platform stays cohesive as it grows.
