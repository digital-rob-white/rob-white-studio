# RWS Glyphs — SVG icon set

19 glyphs vectorised from the Rob White Studio glyph sheet, plus 4 pattern tiles.
Flat geometry in the core palette, with a painted-grain SVG filter so the shapes
keep their handmade texture at any size.

Open `preview.html` to see everything at once.

## What's in here

```
svg/color/rws-<name>.svg        19 full-colour glyphs, 100×100 viewBox
svg/mono/rws-<name>-mono.svg    19 flat silhouettes, fill: currentColor
sprite/rws-glyphs-sprite.svg    all 38 symbols in one file
react/<Name>Glyph.jsx           one component per glyph
react/index.js                  barrel export
patterns/rws-pattern-*.svg      stripes, facets, dots, arc — 100×100 tiles
tokens.json                     palette hexes + glyph manifest
preview.html                    reference sheet
gen.py                          the generator, if you want to tweak geometry
```

Glyph names: `dashboard`, `artwork`, `collections`, `portfolio`, `collectors`,
`clients`, `projects`, `estimates`, `labor`, `framing`, `signs`,
`roland-printing`, `cnc`, `shipping`, `inventory`, `invoices`, `website`,
`settings`, `journal`.

## Using them

**As an image** — nothing to configure:

```html
<img src="/icons/rws-dashboard.svg" alt="Dashboard" width="48" height="48">
```

**Inline** — paste the file contents straight into your markup. Every `id`
inside a glyph is namespaced (`dashboard-clip`, `dashboard-grain`), so multiple
glyphs on one page never collide.

**Sprite** — inject `rws-glyphs-sprite.svg` once near the top of `<body>`, then
reference symbols anywhere:

```html
<svg width="48" height="48" aria-hidden="true"><use href="#rws-portfolio"/></svg>
<svg width="24" height="24" aria-hidden="true"><use href="#rws-portfolio-mono"/></svg>
```

The sprite root is `position:absolute;width:0;height:0` rather than
`display:none` — that's deliberate. `display:none` stops Chrome resolving the
`clip-path` and `mask` references inside the symbols, and the glyphs render as
solid squares.

**React**

```jsx
import { DashboardGlyph, CncGlyph } from "./react";

<DashboardGlyph size={40} />
<CncGlyph size={24} title="CNC" />
<CncGlyph size={24} title={null} />   // decorative: aria-hidden, no title
```

Components pass extra props through to the `<svg>`, so `className`, `style`
and event handlers all work.

## Sizing

| Size | Use |
| --- | --- |
| 48px and up | full colour — module headers, cards, nav rails, print |
| 28–48px | full colour still holds |
| under 28px | switch to mono; the colour blocks turn to mud |

Mono glyphs inherit `currentColor`, so they pick up link and hover colours for
free:

```css
.nav a        { color: #211F1C; }
.nav a:hover  { color: #C4402F; }
```

The mono variants aren't plain silhouettes — the block boundaries that carry the
structure are knocked out as gaps, which is what keeps `portfolio` and
`estimates` from both reading as one dark blob at nav size.

## Core palette

| Name | Hex | |
| --- | --- | --- |
| Red | `#C4402F` | accent, rules, active state |
| Blue | `#1D5875` | primary |
| Navy | `#164A63` | deeper blue for facets |
| Slate | `#6A8D9B` | secondary blue |
| Olive | `#5C6B3C` | primary green |
| Ink | `#211F1C` | text, dark blocks |
| Cream | `#E5DAC2` | light blocks |
| Gold | `#D79A24` | warm accent |
| Paper | `#F2EDE3` | background |

Also in `tokens.json` if you want to pull them into CSS custom properties or a
Tailwind config.

## About the grain

Each colour glyph carries one `<filter>` doing four things: a small
`feDisplacementMap` to break up the machine-cut edges, broad low-frequency
mottling for uneven paint coverage, fine paper tooth, and sparse pale flecks.

It's cheap, but it isn't free. If you're putting 50+ colour glyphs on one screen
and see paint jank, either use the mono variants at that density or strip the
`filter="url(#…-grain)"` attribute — the flat geometry underneath stands on its
own.

Filters also rasterise at the size they're drawn, so a glyph scaled up with CSS
transforms from very small to very large can show soft grain. Set the intended
`width`/`height` rather than scaling.

## Accessibility

Colour glyphs ship with a `<title>` and `role="img"`. When a glyph sits next to
a text label it's decorative — add `aria-hidden="true"` and drop the title
(React: `title={null}`).

## Regenerating

Geometry lives in one table at the top of `gen.py`. Edit a path, run
`python3 gen.py`, and every output — SVGs, sprite, React, preview — rebuilds
from it.

---

Rob White Studio · abstract, functional, distinct, handmade
