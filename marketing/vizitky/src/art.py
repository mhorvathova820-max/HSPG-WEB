"""Vector illustrations for the HSPG die-cut cards.

Coordinate system: 1 unit = 0.1 mm. Every scene is drawn inside a 900 x 700
box (90 x 70 mm); the die-cut border is added around it by build.py.
All shapes are hand-built SVG (no stock, no generated imagery).
"""
import math
import random

NAVY = "#0e1b33"
NAVY2 = "#1d3260"
NAVY3 = "#2c4a85"
GOLD = "#d4af37"
GOLD_D = "#a8862a"
GOLD_L = "#f1d77a"
INK = "#0b1426"
SKIN = "#f2c294"
SKIN_D = "#d99a68"
SHIRT = "#eef1f6"
SHIRT_D = "#c9d1de"
STEEL = "#aab4c3"
STEEL_D = "#6d7889"
TILE = "#c8572f"
TILE_D = "#9c3e20"
TILE_H = "#e88a5c"
DIRT = "#6a5848"
DIRT_D = "#4c3f34"
MOSS = "#7d8f3a"
MOSS_D = "#56662a"
WALL = "#f5ecd9"
WALL_D = "#e0d2b5"
WATER = "#bfe6fa"
WATER_D = "#7cc4ea"
HOSE = "#2f6fd6"

OUT = f'stroke="{INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
OUT_T = f'stroke="{INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"'


def _tiles(clip_id, poly, boundary, rng, row_h=26, tile_w=34, y0=200, y1=470, x0=440, x1=900):
    """Clay roof tiles; tiles right of `boundary(y)` are dirty and mossy."""
    out = [f'<clipPath id="{clip_id}"><polygon points="{poly}"/></clipPath>', f'<g clip-path="url(#{clip_id})">']
    out.append(f'<polygon points="{poly}" fill="{TILE_D}"/>')
    moss = []
    row = 0
    y = y0
    while y < y1:
        off = (row % 2) * tile_w / 2
        x = x0 - tile_w + off
        while x < x1:
            cx = x + tile_w / 2
            dirty = cx > boundary(y + row_h / 2)
            body = DIRT if dirty else TILE
            hl = DIRT_D if dirty else TILE_H
            r = tile_w / 2
            d = (f"M{x:.1f},{y:.1f} h{tile_w} v{row_h - r * 0.55:.1f} "
                 f"a{r:.1f},{r * 0.6:.1f} 0 0 1 {-tile_w},0 Z")
            out.append(f'<path d="{d}" fill="{body}" stroke="{TILE_D if not dirty else DIRT_D}" stroke-width="2.5"/>')
            if not dirty:
                out.append(f'<path d="M{x + 7:.1f},{y + 5:.1f} v{row_h - 14:.1f}" stroke="{hl}" stroke-width="4" stroke-linecap="round" opacity=".9"/>')
            elif rng.random() < 0.55:
                mx = cx + rng.uniform(-10, 10)
                my = y + rng.uniform(6, row_h - 2)
                rx = rng.uniform(7, 15)
                moss.append(f'<ellipse cx="{mx:.1f}" cy="{my:.1f}" rx="{rx:.1f}" ry="{rx * 0.6:.1f}" fill="{MOSS if rng.random() < .6 else MOSS_D}"/>')
            x += tile_w
        y += row_h
        row += 1
    out += moss
    out.append("</g>")
    return "\n".join(out)


def _worker(cx=265, head_y=188):
    """Cheerful generic tradesman in navy overalls, thumbs up (no real likeness)."""
    h = head_y
    return f"""
  <!-- shirt / shoulders -->
  <path d="M{cx-70},{h+130} Q{cx-72},{h+62} {cx-30},{h+52} L{cx+30},{h+52} Q{cx+72},{h+62} {cx+70},{h+130} Z" fill="{SHIRT}" {OUT}/>
  <!-- overalls bib -->
  <path d="M{cx-44},{h+86} L{cx+44},{h+86} L{cx+50},{h+215} L{cx-50},{h+215} Z" fill="{NAVY2}" {OUT}/>
  <rect x="{cx-22}" y="{h+102}" width="44" height="30" rx="5" fill="{NAVY}" stroke="{GOLD}" stroke-width="3"/>
  <path d="M{cx-44},{h+90} L{cx-36},{h+56}" stroke="{GOLD}" stroke-width="11" stroke-linecap="round"/>
  <path d="M{cx+44},{h+90} L{cx+36},{h+56}" stroke="{GOLD}" stroke-width="11" stroke-linecap="round"/>
  <circle cx="{cx-42}" cy="{h+92}" r="6" fill="{GOLD_L}" {OUT_T}/>
  <circle cx="{cx+42}" cy="{h+92}" r="6" fill="{GOLD_L}" {OUT_T}/>
  <!-- neck -->
  <path d="M{cx-16},{h+30} L{cx-16},{h+54} Q{cx},{h+64} {cx+16},{h+54} L{cx+16},{h+30} Z" fill="{SKIN_D}" {OUT_T}/>
  <!-- ears -->
  <ellipse cx="{cx-43}" cy="{h+4}" rx="10" ry="14" fill="{SKIN}" {OUT_T}/>
  <ellipse cx="{cx+43}" cy="{h+4}" rx="10" ry="14" fill="{SKIN}" {OUT_T}/>
  <!-- head -->
  <path d="M{cx-42},{h-12} Q{cx-44},{h+44} {cx},{h+50} Q{cx+44},{h+44} {cx+42},{h-12} Q{cx},{h-30} {cx-42},{h-12} Z" fill="{SKIN}" {OUT}/>
  <!-- stubble -->
  <path d="M{cx-38},{h+14} Q{cx-36},{h+46} {cx},{h+49} Q{cx+36},{h+46} {cx+38},{h+14} Q{cx+22},{h+30} {cx},{h+28} Q{cx-22},{h+30} {cx-38},{h+14} Z" fill="#b98a62" opacity=".55"/>
  <!-- face -->
  <path d="M{cx-27},{h-6} q9,-7 18,0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M{cx+9},{h-6} q9,-7 18,0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="{cx-18}" cy="{h+5}" rx="4.5" ry="5.5" fill="{INK}"/>
  <ellipse cx="{cx+18}" cy="{h+5}" rx="4.5" ry="5.5" fill="{INK}"/>
  <path d="M{cx-3},{h+8} q5,10 -1,14" fill="none" stroke="{SKIN_D}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M{cx-19},{h+27} Q{cx},{h+42} {cx+19},{h+27} Z" fill="#fff" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="{cx-29}" cy="{h+21}" r="6" fill="#e9967a" opacity=".45"/>
  <circle cx="{cx+29}" cy="{h+21}" r="6" fill="#e9967a" opacity=".45"/>
  <!-- cap -->
  <path d="M{cx-46},{h-10} Q{cx-48},{h-62} {cx},{h-64} Q{cx+48},{h-62} {cx+46},{h-10} Q{cx},{h-22} {cx-46},{h-10} Z" fill="{NAVY}" {OUT}/>
  <path d="M{cx-50},{h-12} Q{cx},{h-28} {cx+50},{h-12} Q{cx+60},{h-4} {cx+50},{h+1} Q{cx},{h-13} {cx-50},{h+1} Q{cx-60},{h-4} {cx-50},{h-12} Z" fill="{NAVY2}" {OUT_T}/>
  <circle cx="{cx}" cy="{h-40}" r="13" fill="{GOLD}" stroke="{GOLD_D}" stroke-width="2.5"/>
  <text x="{cx}" y="{h-34.5}" text-anchor="middle" font-family="Playfair Display" font-weight="800" font-size="17" fill="{NAVY}">H</text>
  <!-- left arm: thumbs up -->
  <path d="M{cx-62},{h+66} Q{cx-96},{h+80} {cx-102},{h+112}" fill="none" stroke="{INK}" stroke-width="35" stroke-linecap="round"/>
  <path d="M{cx-62},{h+66} Q{cx-96},{h+80} {cx-102},{h+112}" fill="none" stroke="{SHIRT}" stroke-width="25" stroke-linecap="round"/>
  <path d="M{cx-102},{h+112} L{cx-106},{h+64}" fill="none" stroke="{INK}" stroke-width="29" stroke-linecap="round"/>
  <path d="M{cx-102},{h+112} L{cx-106},{h+64}" fill="none" stroke="{SKIN}" stroke-width="19" stroke-linecap="round"/>
  <rect x="{cx-101}" y="{h-4}" width="19" height="44" rx="9.5" fill="{SKIN}" transform="rotate(8 {cx-91} {h+30})" {OUT}/>
  <rect x="{cx-132}" y="{h+28}" width="46" height="42" rx="13" fill="{SKIN}" {OUT}/>
  <path d="M{cx-132},{h+40} h30 M{cx-132},{h+51} h30 M{cx-132},{h+61} h28" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M{cx-104},{h+31} q12,4 16,14" fill="none" stroke="{SKIN_D}" stroke-width="3" stroke-linecap="round"/>
  <!-- right arm to lance -->
  <path d="M{cx+60},{h+70} Q{cx+92},{h+96} {cx+98},{h+132}" fill="none" stroke="{INK}" stroke-width="35" stroke-linecap="round"/>
  <path d="M{cx+60},{h+70} Q{cx+92},{h+96} {cx+98},{h+132}" fill="none" stroke="{SHIRT}" stroke-width="25" stroke-linecap="round"/>
"""


def _lance(x0, y0, x1, y1):
    """Pressure-washer gun + lance with the worker's hands on it."""
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    length = math.hypot(x1 - x0, y1 - y0)
    return f"""
  <g transform="translate({x0},{y0}) rotate({ang:.2f})">
    <rect x="-8" y="-9" width="{length:.1f}" height="11" rx="5" fill="{STEEL}" {OUT_T}/>
    <rect x="{length - 26:.1f}" y="-12" width="30" height="17" rx="4" fill="{GOLD}" {OUT_T}/>
    <rect x="-34" y="-14" width="58" height="22" rx="7" fill="{NAVY}" {OUT_T}/>
    <path d="M-20,6 l-6,34 h18 l6,-34 Z" fill="{GOLD}" {OUT_T}/>
    <circle cx="-2" cy="12" r="19" fill="{SKIN}" {OUT}/>
    <circle cx="{min(110, length * .35):.1f}" cy="-3" r="17" fill="{SKIN}" {OUT}/>
  </g>
"""


def _lift(base_x=60, base_y=600, basket=(140, 330, 400, 445), label=True):
    bx0, by0, bx1, by1 = basket
    return f"""
  <!-- boom -->
  <path d="M{base_x + 140},{base_y + 8} L{(bx0 + bx1) / 2 + 40},{by1 + 4}" stroke="{INK}" stroke-width="46" stroke-linecap="round"/>
  <path d="M{base_x + 140},{base_y + 8} L{(bx0 + bx1) / 2 + 40},{by1 + 4}" stroke="{NAVY2}" stroke-width="36" stroke-linecap="round"/>
  <path d="M{base_x + 140},{base_y + 8} L{(bx0 + bx1) / 2 + 40},{by1 + 4}" stroke="{GOLD}" stroke-width="7" stroke-linecap="round" stroke-dasharray="26 16"/>
  <!-- tracked base -->
  <rect x="{base_x - 12}" y="{base_y + 36}" width="294" height="48" rx="24" fill="{INK}"/>
  {"".join(f'<circle cx="{base_x + 14 + i * 60}" cy="{base_y + 60}" r="17" fill="{STEEL}" stroke="{INK}" stroke-width="4"/><circle cx="{base_x + 14 + i * 60}" cy="{base_y + 60}" r="7" fill="{GOLD}"/>' for i in range(5))}
  <rect x="{base_x}" y="{base_y - 8}" width="270" height="48" rx="10" fill="{NAVY}" {OUT}/>
  <rect x="{base_x + 12}" y="{base_y + 4}" width="246" height="9" rx="4" fill="{GOLD}"/>
  <rect x="{base_x + 105}" y="{base_y - 34}" width="72" height="34" rx="8" fill="{NAVY2}" {OUT}/>
  <!-- basket -->
  <path d="M{bx0},{by0} V{by1} M{(bx0 + bx1) / 2},{by0} V{by1} M{bx1},{by0} V{by1}" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>
  <path d="M{bx0},{by0} V{by1} M{(bx0 + bx1) / 2},{by0} V{by1} M{bx1},{by0} V{by1}" stroke="{NAVY3}" stroke-width="6" stroke-linecap="round"/>
  <path d="M{bx0 - 6},{by0} H{bx1 + 6}" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M{bx0 - 6},{by0} H{bx1 + 6}" stroke="{GOLD}" stroke-width="8" stroke-linecap="round"/>
"""


def _basket_panel(bx0, by_top, bx1, by1, logo_href):
    w = bx1 - bx0
    return f"""
  <rect x="{bx0 - 8}" y="{by_top}" width="{w + 16}" height="{by1 - by_top}" rx="8" fill="{GOLD}" {OUT}/>
  <rect x="{bx0}" y="{by_top + 7}" width="{w}" height="{by1 - by_top - 14}" rx="5" fill="none" stroke="{GOLD_D}" stroke-width="2.5"/>
  {f'<image href="{logo_href}" x="{bx0 + 10}" y="{by_top + 6}" width="{(by1 - by_top - 12) * 0.83:.1f}" height="{by1 - by_top - 12}"/>' if logo_href else ''}
  <text x="{bx0 + 60}" y="{by1 - 16}" font-family="Playfair Display" font-weight="800" font-size="38" letter-spacing="1" fill="{NAVY}">HSPG</text>
  <text x="{bx1 - 8}" y="{by1 - 18}" text-anchor="end" font-family="Inter" font-weight="700" font-size="14" fill="{NAVY}">hspg.cz</text>
"""


def _washer(x, y):
    """Pressure washer on wheels, with hose."""
    return f"""
  <path d="M{x + 30},{y - 82} V{y + 6}" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M{x + 30},{y - 82} V{y + 6}" stroke="{STEEL}" stroke-width="8" stroke-linecap="round"/>
  <path d="M{x + 18},{y - 82} H{x + 52}" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M{x + 18},{y - 82} H{x + 52}" stroke="{NAVY3}" stroke-width="8" stroke-linecap="round"/>
  <rect x="{x}" y="{y - 10}" width="150" height="86" rx="18" fill="{NAVY}" {OUT}/>
  <path d="M{x + 6},{y + 16} Q{x + 75},{y - 32} {x + 144},{y + 16} V{y + 2} Q{x + 140},{y - 14} {x + 120},{y - 14} H{x + 30} Q{x + 10},{y - 14} {x + 6},{y + 2} Z" fill="{GOLD}" {OUT_T}/>
  <rect x="{x + 50}" y="{y + 30}" width="70" height="26" rx="6" fill="{NAVY2}" stroke="{GOLD}" stroke-width="3"/>
  <circle cx="{x + 64}" cy="{y + 43}" r="6" fill="{GOLD}"/>
  <path d="M{x + 78},{y + 43} h30" stroke="{GOLD_L}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="{x + 34}" cy="{y + 78}" r="24" fill="{INK}"/>
  <circle cx="{x + 34}" cy="{y + 78}" r="11" fill="{GOLD}"/>
  <circle cx="{x + 122}" cy="{y + 84}" r="12" fill="{INK}"/>
"""


def _spray(nx, ny, tx, ty, spread=42, rng=None):
    rng = rng or random.Random(3)
    ang = math.atan2(ty - ny, tx - nx)
    px, py = -math.sin(ang), math.cos(ang)
    a = (tx + px * spread, ty + py * spread)
    b = (tx - px * spread, ty - py * spread)
    drops = []
    for _ in range(26):
        t = rng.uniform(0.35, 1.15)
        s = rng.uniform(-1.2, 1.2) * spread * t
        dx = nx + (tx - nx) * t + px * s
        dy = ny + (ty - ny) * t + py * s
        r = rng.uniform(2.5, 6)
        drops.append(f'<circle cx="{dx:.1f}" cy="{dy:.1f}" r="{r:.1f}" fill="{WATER}" stroke="{WATER_D}" stroke-width="1.5"/>')
    mist = "".join(
        f'<circle cx="{tx + rng.uniform(-50, 50):.1f}" cy="{ty + rng.uniform(-25, 35):.1f}" r="{rng.uniform(16, 30):.1f}" fill="#ffffff" opacity=".55"/>'
        for _ in range(9))
    return f"""
  <polygon points="{nx},{ny} {a[0]:.1f},{a[1]:.1f} {b[0]:.1f},{b[1]:.1f}" fill="{WATER}" opacity=".85"/>
  <polyline points="{nx},{ny} {a[0]:.1f},{a[1]:.1f}" fill="none" stroke="{WATER_D}" stroke-width="3" stroke-linecap="round"/>
  <polyline points="{nx},{ny} {b[0]:.1f},{b[1]:.1f}" fill="none" stroke="{WATER_D}" stroke-width="3" stroke-linecap="round"/>
  <polyline points="{nx},{ny} {tx:.1f},{ty:.1f}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
  {mist}
  {''.join(drops)}
"""


def _sparkles(points):
    out = []
    for x, y, s in points:
        out.append(
            f'<path d="M{x},{y - s} Q{x + s * .18},{y - s * .18} {x + s},{y} Q{x + s * .18},{y + s * .18} {x},{y + s} '
            f'Q{x - s * .18},{y + s * .18} {x - s},{y} Q{x - s * .18},{y - s * .18} {x},{y - s} Z" fill="{GOLD_L}" stroke="{GOLD_D}" stroke-width="2"/>')
    return "".join(out)


def scene_strecha(logo_href):
    """Roof cleaning from a lifting platform: clean tiles left, mossy tiles right."""
    rng = random.Random(7)
    peak = (675, 205)
    eave_l = (468, 440)
    eave_r = (872, 440)
    poly = f"{eave_l[0]},{eave_l[1]} {peak[0]},{peak[1]} {eave_r[0]},{eave_r[1]}"

    def boundary(y):
        return 700 + 14 * math.sin(y / 23.0) + (y - 330) * 0.35

    hose = (f'<path d="M330,380 C380,470 330,560 400,600 S520,540 520,575" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>'
            f'<path d="M330,380 C380,470 330,560 400,600 S520,540 520,575" fill="none" stroke="{HOSE}" stroke-width="7" stroke-linecap="round"/>')
    return f"""
  <!-- house -->
  <rect x="770" y="250" width="40" height="80" fill="{TILE_D}" {OUT}/>
  <rect x="764" y="240" width="52" height="16" rx="3" fill="{NAVY2}" {OUT_T}/>
  <rect x="505" y="420" width="335" height="232" fill="{WALL}" {OUT}/>
  <rect x="505" y="420" width="335" height="22" fill="{WALL_D}"/>
  <rect x="560" y="475" width="92" height="98" rx="4" fill="{NAVY2}" stroke="{GOLD}" stroke-width="8"/>
  <path d="M606,475 V573 M560,524 H652" stroke="{GOLD}" stroke-width="6"/>
  <path d="M572,488 l26,0 l-26,26 Z" fill="#ffffff" opacity=".25"/>
  <rect x="700" y="475" width="92" height="98" rx="4" fill="{NAVY2}" stroke="{GOLD}" stroke-width="8"/>
  <path d="M746,475 V573 M700,524 H792" stroke="{GOLD}" stroke-width="6"/>
  <path d="M712,488 l26,0 l-26,26 Z" fill="#ffffff" opacity=".25"/>
  <rect x="552" y="573" width="108" height="12" rx="3" fill="{WALL_D}" {OUT_T}/>
  <rect x="692" y="573" width="108" height="12" rx="3" fill="{WALL_D}" {OUT_T}/>
  {_tiles("roofclip", poly, boundary, rng)}
  <polygon points="{poly}" fill="none" {OUT}/>
  <path d="M{eave_l[0] - 6},{eave_l[1] + 2} L{peak[0]},{peak[1] - 8} L{eave_r[0] + 6},{eave_r[1] + 2}" fill="none" stroke="{INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M{eave_l[0] - 6},{eave_l[1] + 2} L{peak[0]},{peak[1] - 8} L{eave_r[0] + 6},{eave_r[1] + 2}" fill="none" stroke="{NAVY3}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="462" y="438" width="416" height="14" rx="7" fill="{STEEL}" {OUT_T}/>
  <!-- bushes -->
  <ellipse cx="530" cy="652" rx="48" ry="26" fill="#4f7a34" {OUT}/>
  <ellipse cx="822" cy="652" rx="46" ry="24" fill="#4f7a34" {OUT}/>
  {_lift()}
  {hose}
  {_washer(440, 560)}
  {_spray(560, 298, 690, 330, spread=48, rng=random.Random(11))}
  {_worker()}
  {_lance(318, 336, 566, 296)}
  {_basket_panel(140, 385, 400, 445, logo_href)}
  {_sparkles([(520, 330, 16), (560, 395, 10), (488, 380, 9)])}
"""


def scene_fasada(logo_href):
    """Facade cleaning from a lifting platform: cleaned stripe vs. greyed render."""
    rng = random.Random(5)
    wall_x0, wall_y0, wall_x1, wall_y1 = 470, 120, 872, 655

    def boundary(y):
        return 690 + 12 * math.sin(y / 27.0)

    streaks = []
    for _ in range(70):
        y = rng.uniform(wall_y0 + 30, wall_y1 - 10)
        x = rng.uniform(boundary(y) + 6, wall_x1 - 6)
        h = rng.uniform(20, 70)
        streaks.append(f'<path d="M{x:.1f},{y:.1f} v{h:.1f}" stroke="{DIRT}" stroke-width="{rng.uniform(3, 7):.1f}" stroke-linecap="round" opacity=".45"/>')
    for _ in range(26):
        y = rng.uniform(wall_y0 + 20, wall_y1 - 20)
        x = rng.uniform(boundary(y) + 10, wall_x1 - 10)
        r = rng.uniform(8, 20)
        streaks.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r:.1f}" ry="{r * .6:.1f}" fill="{MOSS}" opacity=".7"/>')
    bpts = " ".join(f"{boundary(y):.1f},{y}" for y in range(wall_y0, wall_y1 + 1, 10))
    dirty_poly = f"{bpts} {wall_x1},{wall_y1} {wall_x1},{wall_y0}"
    windows = []
    for wx in (520, 720):
        for wy in (200, 420):
            windows.append(
                f'<rect x="{wx}" y="{wy}" width="96" height="120" rx="4" fill="{NAVY2}" stroke="{GOLD}" stroke-width="8"/>'
                f'<path d="M{wx + 48},{wy} V{wy + 120} M{wx},{wy + 58} H{wx + 96}" stroke="{GOLD}" stroke-width="6"/>'
                f'<path d="M{wx + 10},{wy + 12} l28,0 l-28,28 Z" fill="#ffffff" opacity=".25"/>'
                f'<rect x="{wx - 8}" y="{wy + 120}" width="112" height="12" rx="3" fill="{WALL_D}" {OUT_T}/>')
    hose = (f'<path d="M330,380 C380,470 330,560 400,600 S470,560 470,575" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>'
            f'<path d="M330,380 C380,470 330,560 400,600 S470,560 470,575" fill="none" stroke="{HOSE}" stroke-width="7" stroke-linecap="round"/>')
    return f"""
  <clipPath id="wallclip"><rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}"/></clipPath>
  <rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}" fill="{WALL}"/>
  <g clip-path="url(#wallclip)">
    <polygon points="{dirty_poly}" fill="#b9ad97"/>
    {''.join(streaks)}
    <path d="M{wall_x0},{wall_y1 - 40} H{wall_x1}" stroke="{WALL_D}" stroke-width="40"/>
  </g>
  {''.join(windows)}
  <rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}" fill="none" {OUT}/>
  <rect x="{wall_x0 - 14}" y="{wall_y0 - 26}" width="{wall_x1 - wall_x0 + 28}" height="30" rx="6" fill="{TILE}" {OUT}/>
  <ellipse cx="500" cy="652" rx="46" ry="24" fill="#4f7a34" {OUT}/>
  <ellipse cx="840" cy="652" rx="42" ry="22" fill="#4f7a34" {OUT}/>
  {_lift()}
  {hose}
  {_washer(400, 560)}
  {_spray(560, 298, 680, 300, spread=50, rng=random.Random(4))}
  {_worker()}
  {_lance(318, 336, 566, 296)}
  {_basket_panel(140, 385, 400, 445, logo_href)}
  {_sparkles([(520, 250, 16), (600, 380, 10), (640, 610, 12)])}
"""


def scene_dlazba(logo_href):
    """Paving cleaning: worker on the ground with a surface lance, before/after pavers."""
    rng = random.Random(9)
    # isometric-ish paving field
    top_l, top_r, bot_r, bot_l = (330, 330), (880, 330), (880, 660), (180, 660)

    def boundary(y):
        return 560 + 10 * math.sin(y / 19.0) + (y - 330) * 0.25

    pavers = []
    rows = 9
    for r in range(rows):
        y0 = 330 + r * 330 / rows
        y1 = 330 + (r + 1) * 330 / rows
        xl0 = top_l[0] + (bot_l[0] - top_l[0]) * (y0 - 330) / 330
        xl1 = top_l[0] + (bot_l[0] - top_l[0]) * (y1 - 330) / 330
        cols = 11
        for c in range(-1, cols + 1):
            off = (r % 2) * 0.5
            fx0, fx1 = (c + off) / cols, (c + 1 + off) / cols
            ax0 = xl0 + (880 - xl0) * fx0
            ax1 = xl0 + (880 - xl0) * fx1
            bx0 = xl1 + (880 - xl1) * fx0
            bx1 = xl1 + (880 - xl1) * fx1
            cx = (ax0 + bx1) / 2
            dirty = cx > boundary((y0 + y1) / 2)
            fill = "#8a8070" if dirty else "#d9cbb0"
            pavers.append(f'<polygon points="{ax0:.1f},{y0:.1f} {ax1:.1f},{y0:.1f} {bx1:.1f},{y1:.1f} {bx0:.1f},{y1:.1f}" fill="{fill}" stroke="{"#5f564a" if dirty else "#b8a785"}" stroke-width="3"/>')
            if dirty and rng.random() < 0.5:
                pavers.append(f'<ellipse cx="{cx + rng.uniform(-8, 8):.1f}" cy="{(y0 + y1) / 2:.1f}" rx="{rng.uniform(6, 14):.1f}" ry="5" fill="{MOSS}" opacity=".8"/>')
    field = f"{top_l[0]},{top_l[1]} {top_r[0]},{top_r[1]} {bot_r[0]},{bot_r[1]} {bot_l[0]},{bot_l[1]}"
    worker = _worker(cx=300, head_y=150)
    hose = (f'<path d="M370,320 C430,400 360,470 160,520 S60,600 130,620" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>'
            f'<path d="M370,320 C430,400 360,470 160,520 S60,600 130,620" fill="none" stroke="{HOSE}" stroke-width="7" stroke-linecap="round"/>')
    legs = f"""
  <path d="M262,360 L250,470" stroke="{INK}" stroke-width="44" stroke-linecap="round"/>
  <path d="M262,360 L250,470" stroke="{NAVY2}" stroke-width="34" stroke-linecap="round"/>
  <path d="M338,360 L352,470" stroke="{INK}" stroke-width="44" stroke-linecap="round"/>
  <path d="M338,360 L352,470" stroke="{NAVY2}" stroke-width="34" stroke-linecap="round"/>
  <path d="M222,466 h48 q14,0 14,14 v6 h-70 q-6,-20 8,-20 Z" fill="{INK}"/>
  <path d="M332,466 h48 q14,0 14,14 v6 h-70 q-6,-20 8,-20 Z" fill="{INK}"/>
"""
    return f"""
  <clipPath id="fieldclip"><polygon points="{field}"/></clipPath>
  <g clip-path="url(#fieldclip)"><polygon points="{field}" fill="#d9cbb0"/>{''.join(pavers)}</g>
  <polygon points="{field}" fill="none" {OUT}/>
  <path d="M{bot_l[0]},{bot_l[1]} L{bot_r[0]},{bot_r[1]}" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>
  {hose}
  {_washer(60, 560)}
  {legs}
  {worker}
  {_lance(358, 296, 560, 470)}
  {_spray(552, 462, 600, 520, spread=46, rng=random.Random(2))}
  <g transform="translate(-10,0)">{_sparkles([(470, 560, 16), (420, 610, 10), (520, 620, 9)])}</g>
  {_basket_panel(612, 600, 868, 660, logo_href)}
"""


SCENES = {
    "strecha": ("Střechy", scene_strecha),
    "fasada": ("Fasády", scene_fasada),
    "dlazba": ("Dlažby a terasy", scene_dlazba),
}
