"""Vector illustrations for the HSPG die-cut cards, premium edition.

Coordinate system: 1 unit = 0.1 mm. Every scene is drawn inside a 900 x 700
box (90 x 70 mm) on a deep navy card; build.py adds the die-cut border and
the gold hairline that follows the contour.

Visual language: flat fills in navy, gold, champagne, stone and terracotta,
every edge drawn with a fine gold hairline (engraved look), no black cartoon
outlines, no faces. All shapes are hand-built SVG (no stock, no generated
imagery).
"""
import math
import random

# palette
BG = "#08112a"        # card navy
NAVY = "#1a2f58"      # objects
NAVY_L = "#24396a"
NAVY_D = "#0e1d3b"
GOLD = "#d4af37"
GOLD_L = "#efd783"
GOLD_D = "#9a7c22"
CREAM = "#f4ecd8"
STONE = "#dccfb4"
STONE_D = "#bfae8c"
TERRA = "#b9603e"
TERRA_D = "#8c4426"
TERRA_L = "#d6835f"
SLATE = "#4f5a68"
SLATE_D = "#39424d"
MOSS = "#6b7748"
SKIN = "#e9c7a4"
SKIN_D = "#d1a67f"
ICE = "#e3edf5"
ICE_D = "#b9d0e2"

HL = f'stroke="{GOLD}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"'   # gold hairline
HLT = f'stroke="{GOLD}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"'  # thin hairline
HLS = f'stroke="{GOLD_D}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"'


def defs():
    """Shared patterns: fine engraved hatching."""
    return f"""
  <defs>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0,0 V7" stroke="{GOLD}" stroke-width="0.9" opacity=".28"/>
    </pattern>
    <pattern id="hatch2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <path d="M0,0 V5" stroke="{CREAM}" stroke-width="0.8" opacity=".16"/>
    </pattern>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="0.55" fill="{GOLD}" opacity=".22"/>
    </pattern>
    <linearGradient id="goldbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{GOLD_D}"/><stop offset=".5" stop-color="{GOLD_L}"/><stop offset="1" stop-color="{GOLD_D}"/>
    </linearGradient>
  </defs>
"""


def _tiles(clip_id, poly, boundary, rng, row_h=26, tile_w=34, y0=200, y1=470, x0=440, x1=900):
    """Roof tiles: terracotta where cleaned, slate with moss where not."""
    out = [f'<clipPath id="{clip_id}"><polygon points="{poly}"/></clipPath>', f'<g clip-path="url(#{clip_id})">']
    out.append(f'<polygon points="{poly}" fill="{TERRA_D}"/>')
    moss = []
    row = 0
    y = y0
    while y < y1:
        off = (row % 2) * tile_w / 2
        x = x0 - tile_w + off
        while x < x1:
            cx = x + tile_w / 2
            dirty = cx > boundary(y + row_h / 2)
            body = SLATE if dirty else TERRA
            r = tile_w / 2
            d = (f"M{x:.1f},{y:.1f} h{tile_w} v{row_h - r * 0.55:.1f} "
                 f"a{r:.1f},{r * 0.6:.1f} 0 0 1 {-tile_w},0 Z")
            out.append(f'<path d="{d}" fill="{body}" stroke="{SLATE_D if dirty else TERRA_D}" stroke-width="1.6"/>')
            if not dirty:
                out.append(f'<path d="M{x + 6:.1f},{y + 4:.1f} v{row_h - 12:.1f}" stroke="{TERRA_L}" stroke-width="3" stroke-linecap="round" opacity=".8"/>')
            elif rng.random() < 0.5:
                mx = cx + rng.uniform(-10, 10)
                my = y + rng.uniform(6, row_h - 2)
                rx = rng.uniform(6, 13)
                moss.append(f'<ellipse cx="{mx:.1f}" cy="{my:.1f}" rx="{rx:.1f}" ry="{rx * 0.55:.1f}" fill="{MOSS}" opacity=".85"/>')
            x += tile_w
        y += row_h
        row += 1
    out += moss
    out.append(f'<polygon points="{poly}" fill="url(#hatch2)"/>')
    out.append("</g>")
    return "\n".join(out)


def _worker(cx=265, head_y=190, legs=False):
    """Composed, faceless figure in navy workwear with gold piping, both hands on the lance."""
    h = head_y
    g = []
    if legs:
        g.append(f"""
  <path d="M{cx-26},{h+200} L{cx-30},{h+300}" stroke="{GOLD}" stroke-width="40" stroke-linecap="round"/>
  <path d="M{cx-26},{h+200} L{cx-30},{h+300}" stroke="{NAVY}" stroke-width="35" stroke-linecap="round"/>
  <path d="M{cx+26},{h+200} L{cx+34},{h+300}" stroke="{GOLD}" stroke-width="40" stroke-linecap="round"/>
  <path d="M{cx+26},{h+200} L{cx+34},{h+300}" stroke="{NAVY}" stroke-width="35" stroke-linecap="round"/>
  <path d="M{cx-52},{h+300} h44 q12,0 14,12 v8 h-66 q-6,-20 8,-20 Z" fill="{NAVY_D}" {HLT}/>
  <path d="M{cx+12},{h+300} h44 q12,0 14,12 v8 h-66 q-6,-20 8,-20 Z" fill="{NAVY_D}" {HLT}/>
""")
    g.append(f"""
  <!-- torso -->
  <path d="M{cx-66},{h+215} L{cx-68},{h+92} Q{cx-66},{h+58} {cx-30},{h+52} L{cx+30},{h+52} Q{cx+66},{h+58} {cx+68},{h+92} L{cx+66},{h+215} Z" fill="{NAVY}" {HL}/>
  <path d="M{cx-30},{h+52} L{cx},{h+92} L{cx+30},{h+52}" fill="{CREAM}" {HLT}/>
  <path d="M{cx},{h+92} V{h+215}" {HLT} stroke-dasharray="3 5" opacity=".9"/>
  <path d="M{cx-66},{h+120} Q{cx-40},{h+112} {cx-26},{h+128}" fill="none" {HLT}/>
  <path d="M{cx+66},{h+120} Q{cx+40},{h+112} {cx+26},{h+128}" fill="none" {HLT}/>
  <circle cx="{cx-40}" cy="{h+112}" r="11" fill="{GOLD}"/>
  <circle cx="{cx-40}" cy="{h+112}" r="4.5" fill="{NAVY}"/>
  <!-- neck + head -->
  <path d="M{cx-14},{h+32} L{cx-14},{h+56} Q{cx},{h+64} {cx+14},{h+56} L{cx+14},{h+32} Z" fill="{SKIN_D}"/>
  <ellipse cx="{cx-40}" cy="{h+6}" rx="8" ry="11" fill="{SKIN}" {HLT}/>
  <ellipse cx="{cx+40}" cy="{h+6}" rx="8" ry="11" fill="{SKIN}" {HLT}/>
  <path d="M{cx-39},{h-10} Q{cx-41},{h+44} {cx},{h+50} Q{cx+41},{h+44} {cx+39},{h-10} Q{cx},{h-26} {cx-39},{h-10} Z" fill="{SKIN}" {HL}/>
  <path d="M{cx-30},{h+18} Q{cx-28},{h+44} {cx},{h+47} Q{cx+28},{h+44} {cx+30},{h+18} Q{cx+16},{h+30} {cx},{h+28} Q{cx-16},{h+30} {cx-30},{h+18} Z" fill="{SKIN_D}" opacity=".7"/>
  <!-- cap -->
  <path d="M{cx-44},{h-8} Q{cx-46},{h-60} {cx},{h-62} Q{cx+46},{h-60} {cx+44},{h-8} Q{cx},{h-20} {cx-44},{h-8} Z" fill="{NAVY}" {HL}/>
  <path d="M{cx-44},{h-8} Q{cx},{h-20} {cx+44},{h-8}" fill="none" stroke="{GOLD}" stroke-width="5" stroke-linecap="round"/>
  <path d="M{cx-48},{h-10} Q{cx},{h-24} {cx+48},{h-10} Q{cx+58},{h-2} {cx+48},{h+3} Q{cx},{h-11} {cx-48},{h+3} Q{cx-58},{h-2} {cx-48},{h-10} Z" fill="{NAVY_D}" {HLT}/>
  <circle cx="{cx}" cy="{h-38}" r="11" fill="{GOLD}"/>
  <text x="{cx}" y="{h-33}" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="15" fill="{NAVY}">H</text>
""")
    return "".join(g)


def _arms(cx, h, hand1, hand2):
    """Both arms from the shoulders to the two hand points on the lance."""
    out = []
    for (sx, sy), (hx, hy) in (((cx - 58, h + 78), hand1), ((cx + 58, h + 78), hand2)):
        mx, my = (sx + hx) / 2 + 6, (sy + hy) / 2 + 22
        out.append(f'<path d="M{sx},{sy} Q{mx},{my} {hx},{hy}" fill="none" stroke="{GOLD}" stroke-width="34" stroke-linecap="round"/>')
        out.append(f'<path d="M{sx},{sy} Q{mx},{my} {hx},{hy}" fill="none" stroke="{NAVY}" stroke-width="29" stroke-linecap="round"/>')
        out.append(f'<path d="M{hx - 16},{hy - 6} l12,-6" fill="none" stroke="{GOLD}" stroke-width="2.4" stroke-linecap="round"/>')
    return "".join(out)


def _lance(x0, y0, x1, y1, hands=(0.0, 0.42)):
    """Pressure-washer lance from the gun at (x0,y0) to the nozzle at (x1,y1); returns svg and hand points."""
    ang = math.atan2(y1 - y0, x1 - x0)
    deg = math.degrees(ang)
    length = math.hypot(x1 - x0, y1 - y0)
    pts = []
    for f in hands:
        t = f * length
        pts.append((x0 + math.cos(ang) * t - math.sin(ang) * 4, y0 + math.sin(ang) * t + math.cos(ang) * 4))
    svg = f"""
  <g transform="translate({x0},{y0}) rotate({deg:.2f})">
    <rect x="-6" y="-7" width="{length:.1f}" height="9" rx="4.5" fill="{STONE}" {HLT}/>
    <rect x="{length - 24:.1f}" y="-10" width="30" height="15" rx="4" fill="url(#goldbar)" {HLS}/>
    <rect x="-34" y="-13" width="56" height="20" rx="7" fill="{NAVY}" {HL}/>
    <path d="M-20,7 l-6,32 h18 l6,-32 Z" fill="{NAVY}" {HL}/>
    <rect x="-14" y="-9" width="10" height="12" rx="2" fill="{GOLD}"/>
  </g>
"""
    hands_svg = "".join(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="15" fill="{SKIN}" {HL}/>' for px, py in pts)
    return svg, hands_svg, pts


def _lift(base_x=60, base_y=600, basket=(140, 330, 400, 445)):
    bx0, by0, bx1, by1 = basket
    tip = ((bx0 + bx1) / 2 + 40, by1 + 4)
    foot = (base_x + 140, base_y + 8)
    wheels = "".join(
        f'<circle cx="{base_x + 14 + i * 60}" cy="{base_y + 60}" r="17" fill="{NAVY_D}" {HL}/>'
        f'<circle cx="{base_x + 14 + i * 60}" cy="{base_y + 60}" r="7" fill="{GOLD}"/>' for i in range(5))
    return f"""
  <!-- boom -->
  <path d="M{foot[0]},{foot[1]} L{tip[0]},{tip[1]}" stroke="{GOLD}" stroke-width="44" stroke-linecap="round"/>
  <path d="M{foot[0]},{foot[1]} L{tip[0]},{tip[1]}" stroke="{NAVY}" stroke-width="39" stroke-linecap="round"/>
  <path d="M{foot[0]},{foot[1]} L{tip[0]},{tip[1]}" stroke="{GOLD}" stroke-width="2" stroke-linecap="round" stroke-dasharray="22 14" opacity=".9"/>
  <path d="M{foot[0] + 40},{foot[1] - 28} L{tip[0] - 40},{tip[1] + 28}" stroke="{GOLD_D}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  <!-- tracked base -->
  <rect x="{base_x - 12}" y="{base_y + 36}" width="294" height="48" rx="24" fill="{NAVY_D}" {HL}/>
  {wheels}
  <rect x="{base_x}" y="{base_y - 8}" width="270" height="48" rx="8" fill="{NAVY}" {HL}/>
  <rect x="{base_x + 12}" y="{base_y + 6}" width="246" height="6" rx="3" fill="url(#goldbar)"/>
  <rect x="{base_x + 105}" y="{base_y - 34}" width="72" height="34" rx="6" fill="{NAVY_L}" {HL}/>
  <!-- basket rails -->
  <path d="M{bx0},{by0} V{by1} M{(bx0 + bx1) / 2},{by0} V{by1} M{bx1},{by0} V{by1}" stroke="{GOLD}" stroke-width="9" stroke-linecap="round"/>
  <path d="M{bx0},{by0} V{by1} M{(bx0 + bx1) / 2},{by0} V{by1} M{bx1},{by0} V{by1}" stroke="{NAVY_L}" stroke-width="5" stroke-linecap="round"/>
  <path d="M{bx0 - 6},{by0} H{bx1 + 6}" stroke="{GOLD}" stroke-width="12" stroke-linecap="round"/>
  <path d="M{bx0 - 6},{by0} H{bx1 + 6}" stroke="{NAVY_L}" stroke-width="6" stroke-linecap="round"/>
"""


def _brand_panel(bx0, by_top, bx1, by1, logo_href):
    w = bx1 - bx0
    hh = by1 - by_top
    return f"""
  <rect x="{bx0 - 8}" y="{by_top}" width="{w + 16}" height="{hh}" rx="6" fill="{NAVY}" {HL}/>
  <rect x="{bx0 - 1}" y="{by_top + 7}" width="{w + 2}" height="{hh - 14}" rx="3" fill="none" {HLT} opacity=".8"/>
  {f'<image href="{logo_href}" x="{bx0 + 12}" y="{by_top + 8}" width="{(hh - 16) * 0.83:.1f}" height="{hh - 16}"/>' if logo_href else ''}
  <text x="{bx0 + 66}" y="{by1 - 19}" font-family="Playfair Display" font-weight="700" font-size="34" letter-spacing="5" fill="{GOLD}">HSPG</text>
  <text x="{bx1 - 10}" y="{by1 - 21}" text-anchor="end" font-family="Inter" font-weight="600" font-size="12" letter-spacing="2" fill="{CREAM}">HSPG.CZ</text>
"""


def _washer(x, y):
    return f"""
  <path d="M{x + 30},{y - 82} V{y + 6}" stroke="{GOLD}" stroke-width="12" stroke-linecap="round"/>
  <path d="M{x + 30},{y - 82} V{y + 6}" stroke="{NAVY_L}" stroke-width="7" stroke-linecap="round"/>
  <path d="M{x + 16},{y - 82} H{x + 54}" stroke="{GOLD}" stroke-width="12" stroke-linecap="round"/>
  <path d="M{x + 16},{y - 82} H{x + 54}" stroke="{NAVY_L}" stroke-width="7" stroke-linecap="round"/>
  <rect x="{x}" y="{y - 10}" width="150" height="86" rx="16" fill="{NAVY}" {HL}/>
  <path d="M{x + 6},{y + 14} Q{x + 75},{y - 30} {x + 144},{y + 14}" fill="none" stroke="{GOLD}" stroke-width="5"/>
  <rect x="{x + 50}" y="{y + 30}" width="70" height="24" rx="4" fill="{NAVY_D}" {HLT}/>
  <circle cx="{x + 64}" cy="{y + 42}" r="5" fill="{GOLD}"/>
  <path d="M{x + 78},{y + 42} h30" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="{x + 34}" cy="{y + 78}" r="24" fill="{NAVY_D}" {HL}/>
  <circle cx="{x + 34}" cy="{y + 78}" r="10" fill="{GOLD}"/>
  <circle cx="{x + 122}" cy="{y + 84}" r="12" fill="{NAVY_D}" {HL}/>
"""


def _hose(d):
    return (f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="11" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{STONE}" stroke-width="6.5" stroke-linecap="round"/>')


def _spray(nx, ny, tx, ty, spread=42, rng=None):
    rng = rng or random.Random(3)
    ang = math.atan2(ty - ny, tx - nx)
    px, py = -math.sin(ang), math.cos(ang)
    a = (tx + px * spread, ty + py * spread)
    b = (tx - px * spread, ty - py * spread)
    drops = []
    for _ in range(22):
        t = rng.uniform(0.35, 1.15)
        s = rng.uniform(-1.2, 1.2) * spread * t
        dx = nx + (tx - nx) * t + px * s
        dy = ny + (ty - ny) * t + py * s
        r = rng.uniform(2, 5)
        drops.append(f'<circle cx="{dx:.1f}" cy="{dy:.1f}" r="{r:.1f}" fill="{ICE}" stroke="{GOLD}" stroke-width="0.8"/>')
    mist = "".join(
        f'<circle cx="{tx + rng.uniform(-50, 50):.1f}" cy="{ty + rng.uniform(-25, 35):.1f}" r="{rng.uniform(14, 28):.1f}" fill="{CREAM}" opacity=".35"/>'
        for _ in range(8))
    return f"""
  <polygon points="{nx},{ny} {a[0]:.1f},{a[1]:.1f} {b[0]:.1f},{b[1]:.1f}" fill="{ICE}" opacity=".55"/>
  <polyline points="{nx},{ny} {a[0]:.1f},{a[1]:.1f}" fill="none" stroke="{ICE_D}" stroke-width="2" stroke-linecap="round"/>
  <polyline points="{nx},{ny} {b[0]:.1f},{b[1]:.1f}" fill="none" stroke="{ICE_D}" stroke-width="2" stroke-linecap="round"/>
  <polyline points="{nx},{ny} {tx:.1f},{ty:.1f}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
  {mist}
  {''.join(drops)}
"""


def _sparkles(points):
    out = []
    for x, y, s in points:
        out.append(
            f'<path d="M{x},{y - s} Q{x + s * .12},{y - s * .12} {x + s},{y} Q{x + s * .12},{y + s * .12} {x},{y + s} '
            f'Q{x - s * .12},{y + s * .12} {x - s},{y} Q{x - s * .12},{y - s * .12} {x},{y - s} Z" fill="{GOLD_L}" stroke="{GOLD}" stroke-width="1"/>')
    return "".join(out)


def _bush(cx, cy, rx, ry):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{NAVY_L}" {HL}/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#grain)"/>')


def _window(wx, wy, w=92, h=98):
    return (f'<rect x="{wx}" y="{wy}" width="{w}" height="{h}" rx="2" fill="{NAVY}" stroke="{GOLD}" stroke-width="6"/>'
            f'<path d="M{wx + w / 2},{wy} V{wy + h} M{wx},{wy + h * 0.5} H{wx + w}" stroke="{GOLD}" stroke-width="4"/>'
            f'<path d="M{wx + 10},{wy + 10} l24,0 l-24,24 Z" fill="{CREAM}" opacity=".18"/>'
            f'<rect x="{wx - 8}" y="{wy + h}" width="{w + 16}" height="10" rx="2" fill="{STONE_D}" {HLT}/>')


def scene_strecha(logo_href):
    """Roof cleaning from a lifting platform: terracotta on the cleaned side, slate and moss on the other."""
    rng = random.Random(7)
    peak = (675, 205)
    eave_l = (468, 440)
    eave_r = (872, 440)
    poly = f"{eave_l[0]},{eave_l[1]} {peak[0]},{peak[1]} {eave_r[0]},{eave_r[1]}"

    def boundary(y):
        return 700 + 14 * math.sin(y / 23.0) + (y - 330) * 0.35

    lance, hands, pts = _lance(318, 336, 566, 296)
    return f"""{defs()}
  <!-- house -->
  <rect x="770" y="250" width="40" height="80" fill="{TERRA_D}" {HL}/>
  <rect x="764" y="240" width="52" height="14" rx="2" fill="{NAVY}" {HLT}/>
  <rect x="505" y="420" width="335" height="232" fill="{CREAM}" {HL}/>
  <rect x="505" y="420" width="335" height="232" fill="url(#grain)"/>
  <rect x="505" y="420" width="335" height="20" fill="{STONE}"/>
  {_window(560, 475)}
  {_window(700, 475)}
  {_tiles("roofclip", poly, boundary, rng)}
  <polygon points="{poly}" fill="none" {HL}/>
  <path d="M{eave_l[0] - 6},{eave_l[1] + 2} L{peak[0]},{peak[1] - 8} L{eave_r[0] + 6},{eave_r[1] + 2}" fill="none" stroke="{GOLD}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M{eave_l[0] - 6},{eave_l[1] + 2} L{peak[0]},{peak[1] - 8} L{eave_r[0] + 6},{eave_r[1] + 2}" fill="none" stroke="{NAVY}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="462" y="438" width="416" height="12" rx="6" fill="url(#goldbar)" {HLS}/>
  {_bush(530, 652, 48, 26)}
  {_bush(822, 652, 46, 24)}
  {_lift()}
  {_hose("M330,380 C380,470 330,560 400,600 S520,540 520,575")}
  {_washer(440, 560)}
  {_spray(560, 298, 690, 330, spread=48, rng=random.Random(11))}
  {_worker()}
  {_arms(265, 190, pts[0], pts[1])}
  {lance}
  {hands}
  {_brand_panel(140, 385, 400, 445, logo_href)}
  {_sparkles([(520, 330, 14), (560, 395, 9), (488, 380, 8)])}
"""


def scene_fasada(logo_href):
    """Facade cleaning from a lifting platform: champagne render on the cleaned side, greyed on the other."""
    rng = random.Random(5)
    wall_x0, wall_y0, wall_x1, wall_y1 = 470, 120, 872, 655

    def boundary(y):
        return 690 + 12 * math.sin(y / 27.0)

    streaks = []
    for _ in range(60):
        y = rng.uniform(wall_y0 + 30, wall_y1 - 10)
        x = rng.uniform(boundary(y) + 6, wall_x1 - 6)
        h = rng.uniform(20, 70)
        streaks.append(f'<path d="M{x:.1f},{y:.1f} v{h:.1f}" stroke="{SLATE_D}" stroke-width="{rng.uniform(2.5, 6):.1f}" stroke-linecap="round" opacity=".5"/>')
    for _ in range(22):
        y = rng.uniform(wall_y0 + 20, wall_y1 - 20)
        x = rng.uniform(boundary(y) + 10, wall_x1 - 10)
        r = rng.uniform(7, 18)
        streaks.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r:.1f}" ry="{r * .6:.1f}" fill="{MOSS}" opacity=".75"/>')
    bpts = " ".join(f"{boundary(y):.1f},{y}" for y in range(wall_y0, wall_y1 + 1, 10))
    dirty_poly = f"{bpts} {wall_x1},{wall_y1} {wall_x1},{wall_y0}"
    windows = "".join(_window(wx, wy, 96, 120) for wx in (520, 720) for wy in (200, 420))
    lance, hands, pts = _lance(318, 336, 566, 296)
    return f"""{defs()}
  <clipPath id="wallclip"><rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}"/></clipPath>
  <rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}" fill="{CREAM}"/>
  <g clip-path="url(#wallclip)">
    <rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}" fill="url(#grain)"/>
    <polygon points="{dirty_poly}" fill="{SLATE}"/>
    <polygon points="{dirty_poly}" fill="url(#hatch2)"/>
    {''.join(streaks)}
    <path d="M{wall_x0},{wall_y1 - 40} H{wall_x1}" stroke="{STONE}" stroke-width="40"/>
    <path d="M{wall_x0},{wall_y1 - 60} H{wall_x1}" stroke="{GOLD}" stroke-width="1.4" opacity=".8"/>
  </g>
  {windows}
  <rect x="{wall_x0}" y="{wall_y0}" width="{wall_x1 - wall_x0}" height="{wall_y1 - wall_y0}" fill="none" {HL}/>
  <rect x="{wall_x0 - 14}" y="{wall_y0 - 26}" width="{wall_x1 - wall_x0 + 28}" height="30" rx="3" fill="{TERRA}" {HL}/>
  <rect x="{wall_x0 - 14}" y="{wall_y0 - 26}" width="{wall_x1 - wall_x0 + 28}" height="30" rx="3" fill="url(#hatch2)"/>
  {_bush(500, 652, 46, 24)}
  {_bush(840, 652, 42, 22)}
  {_lift()}
  {_hose("M330,380 C380,470 330,560 400,600 S470,560 470,575")}
  {_washer(400, 560)}
  {_spray(560, 298, 680, 300, spread=50, rng=random.Random(4))}
  {_worker()}
  {_arms(265, 190, pts[0], pts[1])}
  {lance}
  {hands}
  {_brand_panel(140, 385, 400, 445, logo_href)}
  {_sparkles([(520, 250, 14), (600, 380, 9), (640, 610, 11)])}
"""


def scene_dlazba(logo_href):
    """Paving cleaning: figure on the ground with the lance, stone pavers cleaned on one side."""
    rng = random.Random(9)
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
            fill = SLATE if dirty else STONE
            pavers.append(f'<polygon points="{ax0:.1f},{y0:.1f} {ax1:.1f},{y0:.1f} {bx1:.1f},{y1:.1f} {bx0:.1f},{y1:.1f}" fill="{fill}" stroke="{SLATE_D if dirty else STONE_D}" stroke-width="2"/>')
            if dirty and rng.random() < 0.45:
                pavers.append(f'<ellipse cx="{cx + rng.uniform(-8, 8):.1f}" cy="{(y0 + y1) / 2:.1f}" rx="{rng.uniform(6, 13):.1f}" ry="4.5" fill="{MOSS}" opacity=".8"/>')
    field = f"{top_l[0]},{top_l[1]} {top_r[0]},{top_r[1]} {bot_r[0]},{bot_r[1]} {bot_l[0]},{bot_l[1]}"
    cx, h = 300, 150
    lance, hands, pts = _lance(352, 300, 560, 470, hands=(0.0, 0.4))
    return f"""{defs()}
  <clipPath id="fieldclip"><polygon points="{field}"/></clipPath>
  <g clip-path="url(#fieldclip)"><polygon points="{field}" fill="{STONE}"/>{''.join(pavers)}<polygon points="{field}" fill="url(#hatch2)"/></g>
  <polygon points="{field}" fill="none" {HL}/>
  <path d="M{bot_l[0]},{bot_l[1]} L{bot_r[0]},{bot_r[1]}" stroke="{GOLD}" stroke-width="8" stroke-linecap="round"/>
  {_hose("M370,320 C430,400 360,470 160,520 S60,600 130,620")}
  {_washer(60, 560)}
  {_worker(cx=cx, head_y=h, legs=True)}
  {_arms(cx, h, pts[0], pts[1])}
  {lance}
  {hands}
  {_spray(552, 462, 600, 520, spread=46, rng=random.Random(2))}
  {_sparkles([(460, 560, 14), (410, 610, 9), (510, 620, 8)])}
  {_brand_panel(612, 600, 868, 660, logo_href)}
"""


SCENES = {
    "strecha": ("Střechy", scene_strecha),
    "fasada": ("Fasády", scene_fasada),
    "dlazba": ("Dlažby a terasy", scene_dlazba),
}
