# Rob White Studio Platform Data Model

This document sketches the first backend-ready model for turning
robwhitestudio.com from a static site into a studio management platform.

Recommended direction:

- Public site: portfolio, services, public journal, contact.
- Private studio app: login-protected tools at `/studio`.
- Backend: Supabase, or an equivalent Postgres-based backend with auth and file storage.
- Frontend later: Next.js or Astro with server-backed routes.

## Product Areas

### Public Website

The public site should show selected, publishable material:

- Home page content
- Artwork highlights
- Services
- Public journal entries
- Contact and external links

### Private Studio App

The private app should support day-to-day business needs:

- Client and contact records
- Project records
- Artwork inventory
- Internal journal and process notes
- Estimate builder
- Pricing logic
- Material and service catalog
- File uploads
- Production status tracking

## Core Entities

### User

Represents people who can log in to the private studio app.

Fields:

- `id`
- `email`
- `display_name`
- `role`: `owner`, `admin`, `assistant`, `viewer`
- `created_at`
- `updated_at`

Notes:

- Start with one owner account.
- Use roles early, even if only one user exists at first.

### Contact

Represents clients, collaborators, vendors, galleries, shops, and project leads.

Fields:

- `id`
- `type`: `client`, `vendor`, `gallery`, `collaborator`, `other`
- `first_name`
- `last_name`
- `company`
- `email`
- `phone`
- `website`
- `instagram`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country`
- `notes_private`
- `created_at`
- `updated_at`

Relationships:

- One contact can have many projects.
- One contact can have many estimates.

### Project

Represents a job, commission, artwork build, framing order, fabrication project,
print job, or specialty project.

Fields:

- `id`
- `title`
- `project_code`
- `contact_id`
- `status`: `lead`, `estimating`, `approved`, `in_progress`, `waiting`, `complete`, `archived`
- `project_type`: `painting`, `sculpture`, `framing`, `printing`, `cnc`, `specialty`, `internal`
- `description_public`
- `notes_private`
- `start_date`
- `due_date`
- `completed_date`
- `budget`
- `created_at`
- `updated_at`

Relationships:

- A project belongs to one primary contact.
- A project can have many estimates.
- A project can have many journal entries.
- A project can have many uploaded files.
- A project can optionally link to one or more artwork records.

### Artwork

Represents original works, sculptural objects, studies, and inventory.

Fields:

- `id`
- `title`
- `slug`
- `year`
- `medium`
- `dimensions`
- `description_public`
- `notes_private`
- `status`: `available`, `sold`, `reserved`, `in_progress`, `archived`
- `price`
- `is_public`
- `primary_image_id`
- `created_at`
- `updated_at`

Relationships:

- Artwork can have many images/files.
- Artwork can be linked to projects.
- Artwork can appear on the public site when `is_public = true`.

### Journal Entry

Represents public studio notes and private/internal documentation.

Fields:

- `id`
- `title`
- `slug`
- `visibility`: `public`, `internal`
- `category`: `studio_notes`, `project_documentation`, `artwork_process`, `materials`, `business_development`
- `status`: `draft`, `published`, `archived`
- `excerpt`
- `body`
- `project_id`
- `artwork_id`
- `published_at`
- `created_at`
- `updated_at`

Rules:

- Public entries can be shown on the website.
- Internal entries must require login.
- Internal entries should never be shipped in public HTML.

Relationships:

- A journal entry can optionally belong to a project.
- A journal entry can optionally belong to an artwork record.
- A journal entry can have many files/images.

### Estimate

Represents a quote or estimate for a client/project.

Fields:

- `id`
- `estimate_number`
- `contact_id`
- `project_id`
- `status`: `draft`, `sent`, `approved`, `declined`, `expired`, `invoiced`
- `issue_date`
- `expiration_date`
- `sales_tax_rate`
- `deposit_percent`
- `subtotal`
- `tax_total`
- `total`
- `deposit_amount`
- `notes_public`
- `notes_private`
- `created_at`
- `updated_at`

Relationships:

- An estimate belongs to a contact.
- An estimate can belong to a project.
- An estimate has many estimate line items.

### Estimate Line Item

Represents each priced row on an estimate.

Fields:

- `id`
- `estimate_id`
- `service_id`
- `description`
- `quantity`
- `unit`
- `rate`
- `line_total`
- `sort_order`
- `is_optional`
- `created_at`
- `updated_at`

Notes:

- This can support framing calculations, print pricing, CNC work, labor, delivery, installation, and custom rows.

### Service

Represents reusable service definitions.

Fields:

- `id`
- `name`
- `category`: `painting`, `sculpture`, `framing`, `printing`, `cnc`, `labor`, `delivery`, `installation`, `other`
- `description`
- `default_unit`: `flat`, `hour`, `linear_inch`, `square_foot`, `piece`
- `default_rate`
- `is_active`
- `created_at`
- `updated_at`

Examples:

- Canvas stretcher bars
- Stretch canvas
- Handcrafted hardwood frame
- Roland VG-540 print
- CNC routing
- Design labor
- Delivery
- Installation

### Material

Represents physical materials, suppliers, costs, and reference notes.

Fields:

- `id`
- `name`
- `category`: `wood`, `canvas`, `ink`, `substrate`, `hardware`, `finish`, `packing`, `other`
- `supplier`
- `sku`
- `unit`
- `unit_cost`
- `markup_percent`
- `notes_private`
- `is_active`
- `created_at`
- `updated_at`

Relationships:

- Materials can later be connected to estimate line items or production records.

### File Asset

Represents uploaded files and images.

Fields:

- `id`
- `bucket`
- `path`
- `file_name`
- `mime_type`
- `file_size`
- `alt_text`
- `caption`
- `visibility`: `public`, `internal`
- `project_id`
- `artwork_id`
- `journal_entry_id`
- `uploaded_by`
- `created_at`

Rules:

- Public files can be used on the public website.
- Internal files require login and storage access rules.

### Task

Represents work items for projects and studio operations.

Fields:

- `id`
- `title`
- `description`
- `project_id`
- `assigned_to`
- `status`: `todo`, `doing`, `blocked`, `done`, `archived`
- `priority`: `low`, `normal`, `high`, `urgent`
- `due_date`
- `created_at`
- `updated_at`

## Suggested Database Tables

Initial tables:

- `users`
- `contacts`
- `projects`
- `artworks`
- `journal_entries`
- `estimates`
- `estimate_line_items`
- `services`
- `materials`
- `file_assets`
- `tasks`

Future tables:

- `invoices`
- `payments`
- `project_events`
- `inventory_movements`
- `suppliers`
- `settings`
- `price_rules`

## Public vs Internal Rules

Use explicit visibility fields:

- `is_public` for artwork.
- `visibility` for journal entries and files.
- `status` for draft/published/archive state.

Important:

- Filtering in frontend JavaScript is not privacy.
- Private data must be blocked by backend permissions.
- Internal notes, client details, private files, and pricing logic should require authentication.

## First Backend Milestone

Build a private `/studio` area with:

1. Login
2. Dashboard
3. Contacts
4. Projects
5. Journal entries with public/internal visibility
6. Artwork records with image uploads
7. Services and materials tables

## Second Backend Milestone

Add estimating:

1. Estimate records
2. Estimate line items
3. Service defaults
4. Material costs
5. Tax and deposit calculations
6. PDF export
7. Link estimates to contacts and projects

## Recommended Build Order

1. Choose backend stack: Supabase is the strongest first choice.
2. Create the schema.
3. Add authentication and row-level security.
4. Build `/studio` login and dashboard.
5. Build CRUD screens for contacts, projects, artwork, and journal.
6. Add uploads.
7. Add estimating and pricing logic.
8. Connect selected public content back to the website.

## Open Questions

- Should `robwhitestudio.com` stay as the public site and `/studio` become the app?
- Should the first app be built in Next.js, Astro, or another framework?
- Should early data entry use a custom admin UI or a CMS-like interface?
- Should estimates mirror the existing custom framing estimate system first?
- Which records must be searchable from day one?
- Should clients ever log in, or is the private platform only for studio staff?
