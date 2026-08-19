#!/usr/bin/env python3
"""RWS Glyphs -> SVG icon set generator.

Emits, from a single geometry table:
  svg/color/*.svg   full-colour glyphs with a painted-grain filter
  svg/mono/*.svg    flat single-colour silhouettes using currentColor
  sprite/*.svg      symbol sprite, all IDs namespaced
  react/*.jsx       one component per glyph + index barrel
  patterns/*.svg    bonus texture tiles
  preview.html      reference sheet
"""
import os, re, json, shutil, textwrap

OUT = "rws-glyphs"

# ---------------------------------------------------------------- palette
RED   = "#C4402F"
BLUE  = "#1D5875"
NAVY  = "#164A63"
SLATE = "#6A8D9B"
OLIVE = "#5C6B3C"
INK   = "#211F1C"
CREAM = "#E5DAC2"
GOLD  = "#D79A24"
PAPER = "#F2EDE3"

PALETTE = [("Red", RED), ("Blue", BLUE), ("Slate", SLATE),
           ("Olive", OLIVE), ("Ink", INK), ("Cream", CREAM), ("Gold", GOLD)]

FULL = "M-6,-6 H106 V106 H-6 Z"   # sentinel: fill the whole clipped area

# ---------------------------------------------------------------- geometry
# clip  : silhouette path (None => loose multi-piece composition)
# blocks: painted in order, back to front
# mono  : silhouette path(s) for the flat variant
G = []

def glyph(id, name, blocks, clip=None, mono=None, mono_rule=None):
    G.append(dict(id=id, name=name, clip=clip, blocks=blocks,
                  mono=mono if mono else ([clip] if clip else [b[1] for b in blocks]),
                  mono_rule=mono_rule))

# --- row 1 ---------------------------------------------------------------
glyph("dashboard", "Dashboard",
      clip="M20,13 L80,9 Q85,9 85,15 L87,80 Q87,87 81,87 L18,84 Q12,84 12,78 L14,19 Q14,13 20,13 Z",
      blocks=[(OLIVE, FULL),
              (GOLD,  "M8,90 L54,92 L22,40 L8,48 Z"),
              (CREAM, "M54,4 L96,4 L96,96 L48,96 Q24,50 54,4 Z"),
              (RED,   "M70,17 L96,11 L96,80 L63,69 Q52,44 70,17 Z")])

glyph("artwork", "Artwork",
      clip="M14,88 L14,38 C14,14 46,4 64,24 L86,66 L80,88 Z",
      blocks=[(CREAM, FULL),
              (BLUE,  "M8,58 L8,32 C14,8 52,0 72,28 L34,72 Z"),
              (INK,   "M6,94 L6,66 L44,58 L30,94 Z"),
              (GOLD,  "M32,94 L52,48 L94,70 L88,94 Z")])

glyph("collections", "Collections",
      blocks=[(OLIVE, "M36,8 C47,3 65,5 68,14 C71,23 61,31 49,31 C37,31 32,23 33,16 C34,12 34,10 36,8 Z"),
              (GOLD,  "M32,38 C42,31 66,31 75,38 C82,44 78,56 66,59 C50,62 32,58 27,52 C23,46 26,42 32,38 Z"),
              (RED,   "M14,66 L54,63 L57,90 L12,88 Z"),
              (INK,   "M62,71 L88,69 L90,90 L62,90 Z")])

glyph("portfolio", "Portfolio",
      clip="M20,88 L26,18 L58,8 L88,40 L82,88 Z",
      blocks=[(INK,   FULL),
              (CREAM, "M48,94 L56,4 L70,24 L60,94 Z"),
              (SLATE, "M60,94 L70,24 L94,44 L86,94 Z"),
              (OLIVE, "M46,98 L96,46 L96,98 Z")])

glyph("collectors", "Collectors",
      clip="M16,86 L16,44 C16,20 33,7 52,7 C71,7 86,21 86,46 L86,86 Z",
      blocks=[(RED,   FULL),
              (CREAM, "M28,94 L28,50 C28,32 39,21 52,21 C66,21 76,33 76,52 L76,94 Z"),
              (NAVY,  "M32,94 L32,74 C32,63 41,56 52,56 C63,56 71,63 71,74 L71,94 Z")])

glyph("clients", "Clients",
      clip="M50,8 C73,8 92,27 92,50 C92,73 73,92 50,92 C27,92 8,73 8,50 C8,27 27,8 50,8 Z",
      blocks=[(BLUE,  FULL),
              (OLIVE, "M50,50 L50,-4 L104,-4 L104,46 Z"),
              (NAVY,  "M50,50 L104,48 L104,104 L54,104 Z"),
              (GOLD,  "M50,50 L52,104 L-4,104 L-4,54 Z"),
              ("stroke:" + CREAM + "|4.5", "M50,3 L50,97 M6,53 L96,46")])

# --- row 2 ---------------------------------------------------------------
glyph("projects", "Projects",
      clip="M18,86 L18,44 L52,14 L84,42 L84,86 Z",
      blocks=[(CREAM, FULL),
              (BLUE,  "M12,52 L52,11 L52,55 Z"),
              (OLIVE, "M52,11 L92,44 L88,58 L52,50 Z"),
              (GOLD,  "M10,96 L10,55 L52,96 Z")])

glyph("estimates", "Estimates",
      clip="M18,86 L18,46 C18,24 33,9 50,9 C68,9 82,24 82,46 L82,86 Z",
      blocks=[(CREAM, FULL),
              (INK,   "M12,94 L12,53 L52,53 L52,94 Z"),
              (RED,   "M56,94 L56,49 L88,49 L88,94 Z")])

glyph("labor", "Labor",
      clip="M23,84 L18,30 L45,13 L82,22 L84,68 L59,88 Z",
      blocks=[(GOLD,  FULL),
              (CREAM, "M58,4 L80,9 L30,98 L8,86 Z"),
              (BLUE,  "M80,9 L98,14 L98,100 L30,98 Z"),
              (CREAM, "M78,6 L98,11 L98,28 Z")])

glyph("framing", "Framing",
      clip="M25,90 L23,20 L46,9 L77,17 L79,88 Z",
      blocks=[(OLIVE, FULL),
              (CREAM, "M22,50 L92,30 L92,47 L22,67 Z"),
              (INK,   "M22,67 L92,47 L92,96 L22,96 Z"),
              (RED,   "M14,4 L34,7 L32,96 L18,96 Z")])

glyph("signs", "Signs",
      clip="M20,90 L17,34 L30,54 L39,18 L50,46 L61,16 L71,50 L83,32 L80,90 Z",
      blocks=[(BLUE,  FULL),
              (CREAM, "M6,70 C30,62 64,65 96,59 L96,98 L6,98 Z"),
              (GOLD,  "M6,98 L6,78 C24,73 44,75 54,78 L56,98 Z")])

glyph("roland-printing", "Roland Printing",
      clip="M52,8 C72,8 85,26 84,50 C83,74 68,92 48,92 C28,92 17,72 18,48 C19,25 32,8 52,8 Z",
      blocks=[(OLIVE, FULL),
              (CREAM, "M2,48 C24,34 58,52 98,32 L98,58 C58,78 24,60 2,72 Z"),
              (BLUE,  "M2,72 C24,60 58,78 98,58 L98,100 L2,100 Z")])

glyph("cnc", "CNC",
      clip="M22,88 L22,44 C22,23 34,9 50,9 C66,9 78,23 78,44 L78,88 Z",
      blocks=[(GOLD,  FULL),
              (CREAM, "M32,94 L32,46 C32,32 40,23 50,23 C60,23 68,32 68,46 L68,94 Z"),
              (INK,   "M50,32 C57,32 62,38 62,44 C62,49 58,51 57,56 L58,90 L42,90 L43,56 C42,51 38,49 38,44 C38,38 43,32 50,32 Z")],
      mono=["M22,88 L22,44 C22,23 34,9 50,9 C66,9 78,23 78,44 L78,88 Z",
            "M50,32 C57,32 62,38 62,44 C62,49 58,51 57,56 L58,88 L42,88 L43,56 C42,51 38,49 38,44 C38,38 43,32 50,32 Z"],
      mono_rule="evenodd")

# --- row 3 ---------------------------------------------------------------
glyph("shipping", "Shipping",
      blocks=[(INK,   "M27,25 L55,72 L16,72 Z"),
              (RED,   "M4,76 L34,47 L40,78 Z"),
              (GOLD,  "M53,53 L65,73 L45,73 Z"),
              (BLUE,  "M14,72 L94,55 L96,82 L18,86 Z")])

glyph("inventory", "Inventory",
      clip="M36,10 L72,15 C86,26 89,58 79,79 C67,92 32,91 21,78 C10,60 16,24 36,10 Z",
      blocks=[(CREAM, FULL),
              (OLIVE, "M2,6 L98,4 L98,44 C62,58 32,38 2,50 Z"),
              (BLUE,  "M48,98 L98,40 L98,98 Z")])

glyph("invoices", "Invoices",
      blocks=[(INK,   "M12,22 L46,15 L50,84 L16,89 Z"),
              (GOLD,  "M56,15 L86,20 L84,44 L54,42 Z"),
              (CREAM, "M48,40 L88,48 L86,66 L50,60 Z"),
              (RED,   "M52,64 L88,70 L86,90 L54,88 Z")])

glyph("website", "Website",
      clip="M18,88 L15,46 L30,60 L40,24 L52,50 L63,22 L75,54 L85,42 L82,88 Z",
      blocks=[(OLIVE, FULL),
              (CREAM, "M4,58 C30,48 62,58 98,46 L98,68 C62,80 30,70 4,78 Z"),
              (BLUE,  "M4,78 C30,70 62,80 98,68 L98,100 L4,100 Z")])

glyph("settings", "Settings",
      clip="M20,84 L24,30 L54,12 L84,34 L80,84 L50,92 Z",
      blocks=[(BLUE,  FULL),
              (CREAM, "M54,8 L94,30 L88,98 L48,98 Z"),
              (RED,   "M10,98 L48,50 L54,98 Z")])

glyph("journal", "Journal",
      clip="M24,88 L21,20 L52,10 L80,17 L77,86 Z",
      blocks=[(INK,   FULL),
              (CREAM, "M52,4 L70,8 L46,98 L26,93 Z"),
              (OLIVE, "M70,8 L98,14 L98,98 L46,98 Z")])

# --------------------------------------------------- mono structure cuts
# The flat variant is one colour, so the block boundaries that carry the
# structure get knocked out as gaps -- otherwise every glyph reads as a blob
# at nav size. CUTS are stroked away, HOLES are punched out.
CUTS = {
  "dashboard": ["M54,2 Q24,50 48,98", "M20,38 L56,94"],
  "artwork":   ["M6,60 L36,70 L74,26", "M47,56 L30,98"],
  "portfolio": ["M49,96 L56,2", "M60,96 L70,22"],
  "collectors":["M32,96 L32,74 C32,63 41,56 52,56 C63,56 71,63 71,74 L71,96"],
  "clients":   ["M50,2 L50,98", "M4,53 L98,46"],
  "projects":  ["M10,54 L52,9 L52,57", "M8,54 L54,98"],
  "estimates": ["M52,98 L52,51 L10,51", "M55,98 L55,47 L90,47"],
  "labor":     ["M59,2 L28,98", "M81,7 L33,98"],
  "framing":   ["M20,51 L94,29", "M20,68 L94,46", "M32,4 L31,98"],
  "signs":     ["M4,70 C30,62 64,65 98,59", "M55,74 L56,98"],
  "roland-printing": ["M0,48 C24,34 58,52 100,32", "M0,72 C24,60 58,78 100,58"],
  "cnc":       ["M32,96 L32,46 C32,32 40,23 50,23 C60,23 68,32 68,46 L68,96"],
  "shipping":  ["M12,72 L96,54"],
  "inventory": ["M0,50 C32,38 62,58 100,43", "M46,100 L100,38"],
  "website":   ["M2,58 C30,48 62,58 100,46", "M2,78 C30,70 62,80 100,68"],
  "settings":  ["M55,6 L48,100", "M10,100 L48,50 L55,100"],
  "journal":   ["M52,2 L26,95", "M70,6 L45,100"],
}
HOLES = {
  "cnc": ["M50,32 C57,32 62,38 62,44 C62,49 58,51 57,56 L58,88 L42,88 L43,56 "
          "C42,51 38,49 38,44 C38,38 43,32 50,32 Z"],
}
for _g in G:
    _g["cuts"] = CUTS.get(_g["id"], [])
    _g["holes"] = HOLES.get(_g["id"], [])
    if _g["id"] == "cnc":                      # holes replace the evenodd trick
        _g["mono"] = [_g["clip"]]
        _g["mono_rule"] = None

# ---------------------------------------------------------------- patterns
PATTERNS = [
    ("stripes", [(BLUE, "M0,0 H26 V100 H0 Z"), (GOLD, "M26,0 H44 V100 H26 Z"),
                 (CREAM, "M44,0 H62 V100 H44 Z"), (RED, "M62,0 H74 V100 H62 Z"),
                 (BLUE, "M74,0 H100 V100 H74 Z")]),
    ("facets", [(CREAM, FULL), (OLIVE, "M0,0 L100,0 L0,100 Z"),
                (INK, "M100,0 L100,100 L36,100 Z"), (RED, "M100,72 L100,100 L74,100 Z")]),
    ("dots", [(CREAM, FULL)] + [(GOLD, f"M{x},{y} m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 Z")
                                for y in range(12, 100, 22) for x in range(12, 100, 22)]),
    ("arc", [(INK, FULL), (CREAM, "M18,100 L18,66 C18,44 34,30 52,30 C70,30 84,46 84,68 L84,100 L64,100 L64,68 C64,58 58,50 51,50 C43,50 38,58 38,68 L38,100 Z")]),
]

# ---------------------------------------------------------------- svg build
def grain_filter(fid, seed):
    return (
      f'<filter id="{fid}" x="-12%" y="-12%" width="124%" height="124%" '
      f'color-interpolation-filters="sRGB">'
      # 1. nudge the edges so nothing looks machine-cut
      f'<feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" '
      f'seed="{seed}" result="warp"/>'
      f'<feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" '
      f'xChannelSelector="R" yChannelSelector="G" result="paint"/>'
      # 2. broad tonal mottling — uneven paint coverage
      f'<feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="3" '
      f'seed="{seed+5}" result="mottle"/>'
      f'<feColorMatrix in="mottle" type="matrix" result="mottleA" values="'
      f'0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.30 0 0 0 -0.09"/>'
      f'<feComposite in="mottleA" in2="paint" operator="in" result="mottleIn"/>'
      # 3. fine tooth of the paper
      f'<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" '
      f'seed="{seed+13}" result="fine"/>'
      f'<feColorMatrix in="fine" type="matrix" result="dark" values="'
      f'0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.08  0.26 0 0 0 -0.09"/>'
      f'<feComposite in="dark" in2="paint" operator="in" result="darkIn"/>'
      # 4. sparse pale flecks
      f'<feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" '
      f'seed="{seed+29}" result="fleck"/>'
      f'<feColorMatrix in="fleck" type="matrix" result="light" values="'
      f'0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  1.9 0 0 0 -1.45"/>'
      f'<feComposite in="light" in2="paint" operator="in" result="lightIn"/>'
      f'<feMerge><feMergeNode in="paint"/><feMergeNode in="mottleIn"/>'
      f'<feMergeNode in="darkIn"/><feMergeNode in="lightIn"/></feMerge>'
      f'</filter>')


def blocks_markup(blocks):
    out = []
    for color, d in blocks:
        if color.startswith("stroke:"):
            spec = color[7:]
            hexv, _, wid = spec.partition("|")
            out.append(f'<path d="{d}" fill="none" stroke="{hexv}" '
                       f'stroke-width="{wid or 3}" stroke-linecap="round"/>')
        else:
            out.append(f'<path d="{d}" fill="{color}"/>')
    return "".join(out)


def body(g, i, ns=""):
    """defs + drawing group for one glyph. ns lets the sprite share filters."""
    fid = ns or f"{g['id']}-grain"
    defs = []
    if not ns:
        defs.append(grain_filter(fid, 3 + i * 7))
    inner = blocks_markup(g["blocks"])
    if g["clip"]:
        cid = f"{g['id']}-clip"
        defs.append(f'<clipPath id="{cid}"><path d="{g["clip"]}"/></clipPath>')
        inner = f'<g clip-path="url(#{cid})">{inner}</g>'
    defs_s = f'<defs>{"".join(defs)}</defs>' if defs else ""
    return f'{defs_s}<g filter="url(#{fid})">{inner}</g>'


def color_svg(g, i):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" role="img" aria-labelledby="{g["id"]}-title">'
            f'<title id="{g["id"]}-title">{g["name"]}</title>'
            f'{body(g, i)}</svg>')


def mono_body(g, prefix):
    """Silhouette in currentColor, with structure cuts masked out."""
    mid = f"{prefix}-mask"
    fills = "".join(f'<path d="{d}" fill="#fff"/>' for d in g["mono"])
    cuts = "".join(
        f'<path d="{d}" fill="none" stroke="#000" stroke-width="6.5"/>'
        for d in g.get("cuts", []))
    holes = "".join(f'<path d="{d}" fill="#000"/>' for d in g.get("holes", []))
    return (f'<defs><mask id="{mid}" maskUnits="userSpaceOnUse" '
            f'x="0" y="0" width="100" height="100">{fills}{cuts}{holes}</mask>'
            f'</defs><rect x="0" y="0" width="100" height="100" '
            f'fill="currentColor" mask="url(#{mid})"/>')


def mono_svg(g):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" role="img" '
            f'aria-labelledby="{g["id"]}-mono-title">'
            f'<title id="{g["id"]}-mono-title">{g["name"]}</title>'
            f'{mono_body(g, g["id"] + "-mono")}</svg>')


def pattern_svg(name, blocks):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" aria-hidden="true">'
            f'<defs>{grain_filter(f"{name}-grain", 41)}</defs>'
            f'<g filter="url(#{name}-grain)">'
            f'<clipPath id="{name}-clip"><path d="M0,0 H100 V100 H0 Z"/></clipPath>'
            f'<g clip-path="url(#{name}-clip)">{blocks_markup(blocks)}</g>'
            f'</g></svg>')


# ---------------------------------------------------------------- jsx
KEBAB = {"clip-path": "clipPath", "fill-rule": "fillRule",
         "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
         "color-interpolation-filters": "colorInterpolationFilters",
         "aria-labelledby": "aria-labelledby", "aria-hidden": "aria-hidden"}

def to_jsx(svg_inner):
    s = svg_inner
    for k, v in KEBAB.items():
        if k.startswith("aria"):
            continue
        s = s.replace(f'{k}="', f'{v}="')
    return s


def pascal(s):
    return "".join(p.capitalize() for p in re.split(r"[-_]", s))


def react_component(g, i):
    inner = to_jsx(body(g, i))
    comp = pascal(g["id"]) + "Glyph"
    return textwrap.dedent(f'''\
        // RWS Glyphs — {g["name"]}
        // Generated from the Rob White Studio glyph sheet. Do not hand-edit.
        export default function {comp}({{ size = 48, title = "{g["name"]}", ...props }}) {{
          const titleId = "rws-{g["id"]}-title";
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              width={{size}}
              height={{size}}
              role={{title ? "img" : "presentation"}}
              aria-labelledby={{title ? titleId : undefined}}
              aria-hidden={{title ? undefined : true}}
              {{...props}}
            >
              {{title ? <title id={{titleId}}>{{title}}</title> : null}}
              {inner}
            </svg>
          );
        }}
        ''')


# ---------------------------------------------------------------- sprite
def sprite():
    filters = "".join(grain_filter(f"rws-grain-{k}", 3 + k * 17) for k in range(4))
    syms = []
    for i, g in enumerate(G):
        b = body(g, i, ns=f"rws-grain-{i % 4}")
        syms.append(f'<symbol id="rws-{g["id"]}" viewBox="0 0 100 100">'
                    f'<title>{g["name"]}</title>{b}</symbol>')
    for g in G:
        syms.append(f'<symbol id="rws-{g["id"]}-mono" viewBox="0 0 100 100">'
                    f'<title>{g["name"]}</title>'
                    f'{mono_body(g, "rws-" + g["id"] + "-mono")}</symbol>')
    # NB: display:none would stop Chrome resolving the clipPath/mask
    # references inside the symbols. Zero-sized + overflow:hidden instead.
    return ('<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" '
            'style="position:absolute;width:0;height:0;overflow:hidden" '
            'focusable="false">'
            f'<defs>{filters}</defs>{"".join(syms)}</svg>')


# ---------------------------------------------------------------- write out
def w(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)

if os.path.isdir(OUT):
    shutil.rmtree(OUT)

for i, g in enumerate(G):
    w(f"{OUT}/svg/color/rws-{g['id']}.svg", color_svg(g, i))
    w(f"{OUT}/svg/mono/rws-{g['id']}-mono.svg", mono_svg(g))
    w(f"{OUT}/react/{pascal(g['id'])}Glyph.jsx", react_component(g, i))

for name, blocks in PATTERNS:
    w(f"{OUT}/patterns/rws-pattern-{name}.svg", pattern_svg(name, blocks))

w(f"{OUT}/sprite/rws-glyphs-sprite.svg", sprite())

barrel = "\n".join(
    f'export {{ default as {pascal(g["id"])}Glyph }} from "./{pascal(g["id"])}Glyph.jsx";'
    for g in G)
w(f"{OUT}/react/index.js",
  "// RWS Glyphs — barrel file\n" + barrel + "\n")

w(f"{OUT}/tokens.json", json.dumps({
    "palette": {n.lower(): v for n, v in PALETTE + [("Navy", NAVY), ("Paper", PAPER)]},
    "glyphs": [{"id": g["id"], "name": g["name"]} for g in G],
}, indent=2) + "\n")

# ---------------------------------------------------------------- preview
def card(g, i):
    return (f'<figure class="card">'
            f'<div class="art">{color_svg(g, i)}</div>'
            f'<figcaption><span class="nm">{g["name"]}</span>'
            f'<code>rws-{g["id"]}.svg</code></figcaption></figure>')

mono_row = "".join(
    f'<div class="m"><div class="mi">{mono_svg(g)}</div><span>{g["name"]}</span></div>'
    for g in G)

swatches = "".join(
    f'<div class="sw"><i style="background:{v}"></i><span>{n}</span>'
    f'<code>{v}</code></div>' for n, v in PALETTE + [("Navy", NAVY), ("Paper", PAPER)])

pats = "".join(f'<div class="pt">{pattern_svg(n, b)}<code>{n}</code></div>'
               for n, b in PATTERNS)

preview = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RWS Glyphs — SVG icon set</title>
<style>
  :root {{ --paper:{PAPER}; --ink:{INK}; --red:{RED}; --cream:{CREAM}; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--paper); color:var(--ink);
    font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",sans-serif; }}
  .wrap {{ max-width:1180px; margin:0 auto; padding:56px 28px 96px; }}
  h1 {{ font-size:34px; letter-spacing:.14em; text-transform:uppercase;
    margin:0 0 6px; font-weight:800; }}
  .rule {{ width:52px; height:4px; background:var(--red); margin:0 0 22px; }}
  .lede {{ max-width:52ch; margin:0 0 8px; }}
  .kicker {{ color:var(--red); font-weight:700; letter-spacing:.09em;
    text-transform:uppercase; font-size:12px; margin:18px 0 0; }}
  h2 {{ font-size:12px; letter-spacing:.16em; text-transform:uppercase;
    margin:56px 0 18px; padding-bottom:9px; border-bottom:2px solid var(--ink); }}
  .grid {{ display:grid; gap:10px;
    grid-template-columns:repeat(auto-fill,minmax(158px,1fr)); }}
  .card {{ margin:0; padding:16px 12px 13px; text-align:center;
    background:rgba(255,255,255,.42); border:1px solid rgba(33,31,28,.10); }}
  .art svg {{ width:88px; height:88px; display:block; margin:0 auto; }}
  figcaption {{ margin-top:11px; display:flex; flex-direction:column; gap:3px; }}
  .nm {{ font-size:11px; letter-spacing:.11em; text-transform:uppercase;
    font-weight:700; }}
  code {{ font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
    color:rgba(33,31,28,.55); }}
  .monos {{ display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start;
    color:var(--ink); }}
  .m {{ width:78px; text-align:center; }}
  .m svg {{ width:26px; height:26px; }}
  .m span {{ display:block; margin-top:7px; font-size:9.5px;
    letter-spacing:.08em; text-transform:uppercase; color:rgba(33,31,28,.6); }}
  .mi {{ height:30px; display:flex; align-items:center; justify-content:center; }}
  .sws {{ display:flex; flex-wrap:wrap; gap:14px; }}
  .sw {{ width:96px; }}
  .sw i {{ display:block; height:60px; border:1px solid rgba(33,31,28,.14); }}
  .sw span {{ display:block; font-size:10px; letter-spacing:.1em;
    text-transform:uppercase; margin-top:7px; font-weight:700; }}
  .pts {{ display:flex; gap:14px; flex-wrap:wrap; }}
  .pt svg {{ width:104px; height:104px; display:block;
    border:1px solid rgba(33,31,28,.12); }}
  .pt code {{ display:block; margin-top:6px; }}
  .note {{ background:rgba(255,255,255,.5); border-left:3px solid var(--red);
    padding:14px 18px; max-width:74ch; }}
  .note p {{ margin:0 0 8px; }} .note p:last-child {{ margin:0; }}
  footer {{ margin-top:64px; font-size:11px; letter-spacing:.1em;
    text-transform:uppercase; color:rgba(33,31,28,.5); }}
</style></head><body><div class="wrap">
<h1>RWS Glyphs</h1><div class="rule"></div>
<p class="lede">Abstract. Functional. Distinct. Handmade. {len(G)} glyphs vectorised
from the studio sheet — flat geometry with a painted-grain filter, so they stay
crisp at any size and keep the texture.</p>
<p class="kicker">Made by hand. Used with intent.</p>

<h2>Full colour — svg/color/</h2>
<div class="grid">{"".join(card(g, i) for i, g in enumerate(G))}</div>

<h2>Monochrome at 26px — svg/mono/</h2>
<div class="monos">{mono_row}</div>

<h2>Core palette</h2>
<div class="sws">{swatches}</div>

<h2>Pattern tiles — patterns/</h2>
<div class="pts">{pats}</div>

<h2>Using them</h2>
<div class="note">
<p><strong>Inline or img.</strong> Drop the file from <code>svg/color/</code> straight
into markup, or point an <code>&lt;img&gt;</code> at it. Every ID inside is namespaced
per glyph, so several on one page never collide.</p>
<p><strong>Sprite.</strong> Inject <code>sprite/rws-glyphs-sprite.svg</code> once, then
<code>&lt;svg&gt;&lt;use href="#rws-dashboard"/&gt;&lt;/svg&gt;</code>. Mono symbols are
<code>#rws-dashboard-mono</code>.</p>
<p><strong>React.</strong> <code>import {{ DashboardGlyph }} from "./react";</code> then
<code>&lt;DashboardGlyph size={{32}} /&gt;</code>.</p>
<p><strong>Small sizes.</strong> Below about 28px the colour blocks go muddy — use the
mono variant, which inherits <code>currentColor</code>.</p>
</div>

<footer>Rob White Studio · glyph set generated {os.popen('date +"%B %-d, %Y"').read().strip()}</footer>
</div></body></html>
"""
w(f"{OUT}/preview.html", preview)
print(f"wrote {len(G)} glyphs, {len(PATTERNS)} patterns")
