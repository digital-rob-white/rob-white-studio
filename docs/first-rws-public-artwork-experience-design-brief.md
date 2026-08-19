# CODEX / DESIGN BRIEF — FIRST RWS PUBLIC ARTWORK EXPERIENCE

## Purpose

Design and build one real public artwork page for Rob White Studio. This page will establish the visual and interaction language for how individual artworks are experienced online.

This is not intended to be a conventional ecommerce product-detail page. The goal is to explore a larger question:

**How can a website give someone part of the experience of encountering an artwork in person while still making purchasing the artwork extremely simple?**

Use one real RWS artwork and real photography/content as the prototype. Do not build a generic dummy template first.

The supplied `rws-glyphs.zip` package is part of this brief. Its glyphs, patterns, and color tokens should help connect the public artwork experience to the larger RWS platform without competing with the artwork.

---

## Central Idea

The website should exist somewhere between a gallery, a studio visit, and a beautifully designed commerce experience.

The artwork should remain the hero. The interface should recede. The visitor should be able to:

**see → feel → understand → inspect → trust → purchase**

without being overwhelmed.

---

## Inspiration

Reference `karolortyl.com` for strong image presence, unexpected movement, discovery, visual rhythm, editorial pacing, and treating a website as an experience rather than a grid of products.

Reference `apple.com/iphone-17-pro/` for progressive storytelling, one idea at a time, strong imagery, clear hierarchy, generous breathing room, scroll-based chapters, closer-look moments, and simple purchasing access throughout a deeper experience.

Do not imitate either website literally. Use the principles. Rob White Studio should develop its own visual language.

---

## The Important Balance

The page cannot become so experimental that the visitor becomes confused. Use immersion selectively: moments of surprise inside a calm structure.

Avoid constant animation, constant interaction, and visual noise. The visitor should always understand:

- what artwork they are viewing
- its basic information
- whether it is available
- what it costs
- how to buy or inquire

---

## Proposed Page Experience

### 1. The Encounter

Begin with the artwork itself: large, with minimal interface. The first screen should feel more like entering a gallery wall than entering an online store.

Show only the artwork, title, and year if possible. Nothing else needs to compete immediately.

### 2. Essential Information

Introduce the title, year, materials, dimensions, framing, availability, and price with the typography and spacing of a museum label rather than a dense ecommerce specification table.

### 3. See the Physical Object

Use photography to restore the scale, surface, and physicality that a screen removes. Select from:

- full artwork
- extreme detail and paint surface
- edge, depth, frame, and material
- hand-built construction
- artwork in a room
- artwork beside a person or recognizable object for scale

Allow some images to occupy an entire viewport. Every photograph should answer: **What would I notice if I were standing in front of this artwork?**

### 4. The Story

Introduce a personal, direct piece of writing from Rob rather than academic or marketing language. It might describe where the artwork began, what was happening while it was made, the problem being worked through, the title, what remains unresolved, or what Rob notices now.

Target 75–200 words by default. Writing is optional, and may be longer when the work genuinely deserves it.

### 5. Process / Studio

Where material exists, reveal one or two strong moments from the making: a work-in-progress image, studio photograph, sketch, discarded direction, material, framing detail, construction detail, or Journal excerpt.

The visitor should feel that a person made this object.

### 6. A Moment of Space

Include at least one intentional visual pause: an artwork floating on a neutral field, an extreme crop, a full-screen detail, quiet whitespace, a subtle transition, or a single sentence.

Not every section needs information. A physical gallery includes space between works; the digital gallery should too.

### 7. Purchase

Purchasing should be obvious without dominating the experience. Consider a restrained persistent purchase control once the visitor reaches the artwork details.

Example:

**Available — $X,XXX**

`Acquire Artwork`, `Purchase`, or `Inquire`

The exact language can be tested. Never make the visitor hunt for the action, and do not place large ecommerce controls over the artwork.

### 8. Trust / Practical Information

Near the purchase section, answer practical questions about shipping, local pickup, framing, payment, authenticity, packaging, delivery timeline, and contact. Keep detailed policies behind expandable sections where appropriate.

### 9. Continue the Exhibition

End with **Continue Looking** and one to three related works. Relationships may come from series, period, body of work, palette, or concept. The ending should feel like movement into a larger digital gallery, not the bottom of a product listing.

---

## RWS Glyph and Pattern System

### Role in the experience

The glyphs are a shared visual language for both the public website and the private RWS platform. They should make the two environments feel related while serving different jobs:

- On the **public website**, glyphs are restrained editorial punctuation. They can orient, clarify, and add small moments of studio character.
- In the **RWS platform**, glyphs are functional wayfinding. They can identify modules, reinforce navigation, and make dense tools easier to scan.

The system must never turn the artwork page into a dashboard. On public pages, the artwork has priority over every glyph, pattern, and interface element.

### Supplied package

Treat `rws-glyphs.zip` as a production source asset. It contains:

- 19 full-color SVG glyphs
- 19 monochrome SVG glyphs using `currentColor`
- React components for all glyphs
- a combined SVG symbol sprite
- four repeatable SVG patterns: facets, arc, stripes, and dots
- palette and glyph metadata in `tokens.json`
- a visual reference sheet in `preview.html`
- the generator used to rebuild the package

Canonical glyph IDs are:

`dashboard`, `artwork`, `collections`, `portfolio`, `collectors`, `clients`, `projects`, `estimates`, `labor`, `framing`, `signs`, `roland-printing`, `cnc`, `shipping`, `inventory`, `invoices`, `website`, `settings`, and `journal`.

Do not redraw these as unrelated icons. Use the supplied assets so the visual language stays consistent across surfaces.

### Public website applications

Use only the glyphs that have a clear public meaning:

| Website context | Preferred glyph | Suggested use |
| --- | --- | --- |
| Artwork page | `artwork` | Small chapter marker, artwork metadata marker, or transitional cue |
| Series / exhibitions | `collections` | Exhibition entry point or “part of this series” relationship |
| More work / archive | `portfolio` | “Continue Looking” or browse-all-work destination |
| Writing / process | `journal` | Journal excerpt or link to the longer studio story |
| Framing information | `framing` | Practical-information accordion with a visible text label |
| Delivery information | `shipping` | Shipping/pickup accordion with a visible text label |
| Studio services | `signs`, `roland-printing`, `cnc` | Service pages only; do not introduce them into fine-art pages without a content reason |

Public-site rules:

- Prefer monochrome glyphs in navigation, metadata, accordions, and purchase-support information.
- Reserve full-color glyphs for occasional chapter openings, related-content cards, or meaningful transitions.
- Keep color glyphs at 48 px or larger. Use monochrome below 28 px. At 28–48 px, test each glyph at its actual rendered size.
- Always pair functional glyphs with text. Do not make a visitor learn the icon language before they can navigate.
- Do not place glyphs directly over artwork imagery unless a tested composition provides an intentionally quiet, accessible control area.
- Do not repeat a glyph beside every line of metadata or every button.
- Do not use a color glyph as the purchase button itself. Purchase language must remain explicit.

### RWS platform applications

Use the complete set as the platform’s module language:

- `dashboard` — overview and activity
- `artwork`, `collections`, `portfolio` — artwork records, groupings, and publishing selections
- `collectors`, `clients` — relationship records
- `projects`, `estimates`, `labor`, `invoices` — project and financial workflow
- `framing`, `signs`, `roland-printing`, `cnc` — production areas
- `shipping`, `inventory` — fulfillment and object tracking
- `website`, `journal` — publishing tools
- `settings` — account and system configuration

Platform rules:

- Use 20–24 px monochrome glyphs in compact navigation and control rows.
- Use 40–56 px full-color glyphs for module cards, page headers, empty states, and onboarding.
- The selected state may use RWS red, while unselected navigation should use ink or a quieter neutral.
- Keep the same glyph assigned to the same module everywhere.
- Treat the glyph ID as shared data, not a filename chosen independently by each screen.
- Never rely on color alone to show selected, warning, success, or availability states.

### Pattern applications

The facets, arc, stripes, and dots patterns can be used as:

- quiet chapter dividers
- cropped edge details between image sequences
- restrained backgrounds for platform empty states or onboarding
- visual bridges between the public site and studio platform
- subtle packaging, social, or editorial extensions of the digital system

Pattern constraints:

- Use one pattern moment at a time.
- Keep patterns away from the artwork’s immediate viewing field.
- Do not place patterns behind long-form text or fine controls.
- Prefer large crops, low density, or reduced contrast over small, busy repeats.
- Patterns should never imply that every artwork shares the same palette or visual texture.

### Palette integration

The package defines the shared colors `red`, `blue`, `navy`, `slate`, `olive`, `ink`, `cream`, `gold`, and `paper` in `tokens.json`.

Use these as interface and brand tokens, not as a filter placed over the art. Paper, cream, and ink can establish the calm default environment. Red, blue, gold, olive, navy, and slate should provide measured accents and states.

The real colors within each artwork must remain authoritative. If a package color clashes with a featured work, reduce or remove the accent near that image rather than recoloring the artwork or forcing the brand palette.

### Motion with glyphs

Glyph motion should be rare and brief. Acceptable treatments include a subtle reveal, a small state transition, or a gentle shift that introduces a chapter. Avoid looping animation, spinning icons, scroll-scrubbed decoration, or independent movement that pulls attention from the artwork.

Respect `prefers-reduced-motion` and make all meaning available without animation.

### Accessibility

- Decorative glyphs should be hidden from assistive technology.
- Functional or standalone glyphs need an accessible name.
- When a glyph sits beside a visible label, the label carries the meaning and the glyph should be decorative.
- Maintain adequate contrast for monochrome glyphs and adjacent text.
- Do not encode meaning through color or glyph shape alone.
- Pattern treatments must not reduce text legibility or obscure focus indicators.

### Performance and implementation

- Use direct SVG assets for isolated public-site moments.
- Use the supplied sprite when many glyphs appear on one screen.
- Use the supplied React components in React surfaces; use direct or inline SVG in non-React surfaces rather than adding React only for icons.
- Preserve the package’s namespaced SVG IDs so clip paths and grain filters do not collide.
- Do not set the injected sprite root to `display: none`; that can prevent internal masks and clip paths from resolving in some browsers.
- Avoid dozens of textured color glyphs on one screen. Prefer monochrome at high density.
- Render glyphs at their intended width and height instead of enlarging a tiny glyph with CSS transforms, which can soften the grain.
- Keep `tokens.json` as the source for CSS custom properties or application theme tokens.
- Version the glyph package with the design system so future changes can be reviewed across both public and platform surfaces.

### Data and publishing connection

The RWS Artwork → Publish to Website flow should support optional structured fields such as:

- `glyphId` for a content type or destination
- `patternId` for an intentionally selected editorial transition
- related collection, Journal entry, framing information, and shipping information

Do not require a glyph or pattern for every artwork. These fields should provide editorial choices, not automatic decoration. Public pages should render only approved IDs from the package manifest.

---

## Digital Exhibition Direction

Design the first Artwork Experience so individual works can eventually become chapters inside curated online exhibitions such as `/exhibitions/conflict-of-dreams/`.

An exhibition may include an opening title, short introduction, sequence of works, spatial pauses, details, process moments, short writing, individual artwork pages, availability, and purchasing.

Avoid fake virtual rooms as the primary concept. Use sequencing, scale, motion, photography, and space to create the feeling of moving through an exhibition. Glyphs may mark a transition or relationship, but should not become the exhibition’s dominant visual device.

---

## Motion Guidelines

Motion should support looking. Good possibilities include subtle image reveals, slow scale changes, restrained parallax, image sequences, gentle horizontal movement, details appearing during scroll, and intentional section transitions.

Avoid animation everywhere, long intro sequences, difficult scroll hijacking, delayed access to information, and novelty interactions that compete with the artwork.

The visitor should remember the artwork, not the JavaScript.

---

## Attention-Span Principle

The first ten seconds should communicate:

1. This is artwork.
2. This is Rob White.
3. This particular piece has presence.
4. I can learn more if I am interested.
5. I can buy it if it is available.

Depth should be optional. A visitor who wants only the image, dimensions, and price can get them quickly. A visitor who wants to spend five minutes with the work can continue deeper. This is progressive depth, not mandatory storytelling.

---

## Mobile, Accessibility, and Performance

Treat mobile as its own composition, not a shrunk desktop page. Use vertical scroll, full-width imagery, deliberate detail crops, concise text, and persistent clarity around availability and purchase.

The experience cannot depend on animation. Respect reduced-motion preferences, write useful alt text, maintain readable type and contrast, preserve visible focus states, and optimize large photographs carefully. Prioritize the artwork currently being viewed.

---

## First Prototype Scope

Build one complete artwork experience containing:

- hero artwork
- artwork information
- price and availability
- three to eight carefully selected images
- one short artwork story
- optional process material
- purchase or inquiry action
- shipping and basic practical information
- continuation to related artwork
- responsive mobile version
- a restrained, intentional use of the RWS glyph system
- at least one tested monochrome glyph use
- at most one full-color glyph or pattern moment unless the design clearly earns another

Use the RWS Artwork → Publish to Website system as the data source.

### Prototype acceptance criteria for the glyph system

- The page remains fully understandable if every decorative glyph is removed.
- The artwork is more visually prominent than every glyph or pattern.
- Every functional glyph has a visible or accessible text equivalent.
- Color and mono variants remain legible at their specified sizes on desktop and mobile.
- Reduced-motion mode loses no meaning.
- The same source assets and canonical IDs can be reused in the RWS platform.
- The prototype includes a short rationale for where glyphs were used and where they were intentionally withheld.

---

## What We Want to Learn

Before turning this into a universal template, Rob should be able to answer:

- Does this feel like my artwork and my studio?
- Does it feel too commercial or too much like a portfolio?
- Is there enough room for the artwork?
- Is there too much story?
- Do I want to keep scrolling?
- Can I understand the physical scale, surface, and material?
- Is purchasing obvious without cheapening the experience?
- What does this page allow that seeing an artwork on Instagram does not?
- Do the glyphs make the RWS world feel more distinctive, or do they distract from the work?
- Does the same glyph system feel coherent when moving between the public site and the platform?
- Which glyph and pattern uses should become repeatable rules, and which should remain one-off editorial choices?

Treat this prototype as both a real page and a design experiment. Do not lock every choice into a rigid component system until the first artwork teaches us what should repeat.
