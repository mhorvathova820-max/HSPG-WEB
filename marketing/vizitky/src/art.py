"""HSPG die-cut cards, couture edition.

Coordinates: 1 unit = 0.1 mm. The card is a crest with a roof peak,
900 x 560 units (90 x 56 mm). Everything is vector: the pigeon emblem is
traced from the brand logo, the ornaments are parametric guilloche, the
bottom band is a procedural engraving (hatched, lit from the left).
"""
import math
import pathlib
import random

import cv2
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent

W, H = 900, 560
SHAPE = [(0, H), (0, 112), (W / 2, 0), (W, 112), (W, H)]
RADII = [42, 40, 80, 40, 42]

BG = "#08112a"
GOLD = "#d4af37"
GOLD_L = "#efd783"
GOLD_D = "#9a7c22"
CREAM = "#f1e8d2"
MUTED = "#9aa6bf"

PHONE = "+420 736 618 486"
WEB = "hspg.cz"
CLAIM = "Věci stárnou. My zůstáváme."
STEPS = "ČIŠTĚNÍ · ODMAŠTĚNÍ · OŠETŘENÍ · OPLACH · OCHRANNÁ VRSTVA"

VARIANTS = {
    "strecha": ("STŘECHY", "Bez lešení – z plošiny · celá ČR"),
    "fasada": ("FASÁDY", "Bez lešení – z plošiny · celá ČR"),
    "dlazba": ("DLAŽBY A TERASY", "Celá ČR · foto před a po"),
}


# ----------------------------------------------------------------- geometry
def offset_polygon(pts, d):
    """Convex polygon shifted inward by d (negative d = outward)."""
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    lines = []
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L
        if (cx - x0) * nx + (cy - y0) * ny < 0:
            nx, ny = -nx, -ny
        lines.append(((x0 + nx * d, y0 + ny * d), (dx, dy)))
    out = []
    for i in range(n):
        (p, (ux, uy)) = lines[i - 1]
        (q, (vx, vy)) = lines[i]
        den = ux * vy - uy * vx
        t = ((q[0] - p[0]) * vy - (q[1] - p[1]) * vx) / den
        out.append((p[0] + ux * t, p[1] + uy * t))
    return out


def rounded_segments(pts, radii):
    """Closed rounded polygon as [('M',p),('L',p),('C',c1,c2,p),...]."""
    n = len(pts)
    segs = []
    k_first = None
    for i in range(n):
        P, V, N = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = radii[i]
        upx, upy = P[0] - V[0], P[1] - V[1]
        unx, uny = N[0] - V[0], N[1] - V[1]
        lp, ln = math.hypot(upx, upy), math.hypot(unx, uny)
        upx, upy, unx, uny = upx / lp, upy / lp, unx / ln, uny / ln
        theta = math.acos(max(-1, min(1, upx * unx + upy * uny)))
        t = r / math.tan(theta / 2)
        A = (V[0] + upx * t, V[1] + upy * t)
        B = (V[0] + unx * t, V[1] + uny * t)
        phi = math.pi - theta
        k = 4 / 3 * math.tan(phi / 4) * r
        c1 = (A[0] - upx * k, A[1] - upy * k)
        c2 = (B[0] - unx * k, B[1] - uny * k)
        if k_first is None:
            segs.append(("M", A))
            k_first = A
        else:
            segs.append(("L", A))
        segs.append(("C", c1, c2, B))
    segs.append(("Z",))
    return segs


def segs_to_svg(segs, dx=0, dy=0):
    out = []
    for s in segs:
        if s[0] == "M" or s[0] == "L":
            out.append(f"{s[0]}{s[1][0] + dx:.2f},{s[1][1] + dy:.2f}")
        elif s[0] == "C":
            out.append("C" + " ".join(f"{p[0] + dx:.2f},{p[1] + dy:.2f}" for p in s[1:]))
        else:
            out.append("Z")
    return " ".join(out)


def shape(inset):
    return rounded_segments(offset_polygon(SHAPE, inset), [max(6, r - inset) for r in RADII])


# ------------------------------------------------------------------ emblem
_PIGEON = None


def pigeon_path():
    """The HSPG pigeon traced from the logo, as an evenodd path in a 0..1024 box."""
    global _PIGEON
    if _PIGEON is None:
        a = cv2.imread(str(ROOT / "assets/logo_gold.png"), cv2.IMREAD_UNCHANGED)[..., 3]
        a = cv2.GaussianBlur(a, (0, 0), 1.2)
        m = (a > 110).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        parts = []
        for c in cnts:
            if cv2.contourArea(c) < 12:
                continue
            c = cv2.approxPolyDP(c, 0.9, True)[:, 0, :]
            parts.append("M" + " ".join(f"{x},{y}" for x, y in c) + "Z")
        _PIGEON = "".join(parts)
    return _PIGEON


def pigeon(cx, cy, height, fill=GOLD, opacity=1.0):
    # logo bbox in the 1024 image: x 160..897, y 72..1023
    bw, bh = 737, 951
    s = height / bh
    tx = cx - (160 + bw / 2) * s
    ty = cy - (72 + bh / 2) * s
    return (f'<path d="{pigeon_path()}" fill="{fill}" fill-rule="evenodd" opacity="{opacity}" '
            f'transform="translate({tx:.2f},{ty:.2f}) scale({s:.5f})"/>')


def guilloche(cx, cy, r_in, r_out, petals=18, loops=3, stroke=GOLD, width=0.55, opacity=0.5):
    """Banknote-style rosette: overlapping harmonic rings."""
    out = []
    steps = 720
    for j in range(loops):
        phase = j * math.pi / loops
        amp = (r_out - r_in) / 2
        mid = (r_in + r_out) / 2
        pts = []
        for i in range(steps + 1):
            th = i / steps * 2 * math.pi
            r = mid + amp * math.sin(petals * th + phase) * (0.7 + 0.3 * math.cos(3 * th))
            pts.append(f"{cx + r * math.cos(th):.1f},{cy + r * math.sin(th):.1f}")
        out.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>')
    for rr, op in ((r_in - 8, 0.7), (r_out + 8, 0.45)):
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="none" stroke="{stroke}" stroke-width="0.6" opacity="{op}"/>')
    return "".join(out)


def diamond(cx, cy, s=5, fill=GOLD):
    return f'<path d="M{cx},{cy - s} L{cx + s},{cy} L{cx},{cy + s} L{cx - s},{cy} Z" fill="{fill}"/>'


def rule(x0, x1, y, w=0.8, opacity=1, stroke=GOLD):
    return f'<path d="M{x0},{y} H{x1}" stroke="{stroke}" stroke-width="{w}" opacity="{opacity}"/>'


# ---------------------------------------------------------------- engraving
def _hatch_clip(cid, poly, spacing, angle_deg, width=0.7, opacity=0.9, x0=0, y0=0, x1=W, y1=H):
    """Parallel engraving lines clipped to a polygon."""
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    diag = math.hypot(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    lines = []
    k = -diag / 2
    while k < diag / 2:
        px, py = cx + nx * k, cy + ny * k
        lines.append(f"M{px - dx * diag:.1f},{py - dy * diag:.1f} L{px + dx * diag:.1f},{py + dy * diag:.1f}")
        k += spacing
    return (f'<clipPath id="{cid}"><polygon points="{poly}"/></clipPath>'
            f'<path d="{" ".join(lines)}" clip-path="url(#{cid})" stroke="{GOLD}" stroke-width="{width}" opacity="{opacity}" fill="none"/>')


def engraving_strecha(rng, x0, x1, base):
    """A skyline of gabled roofs, lit from the left."""
    out = []
    x = x0 - 30
    i = 0
    while x < x1 + 30:
        w = rng.uniform(80, 150)
        h = rng.uniform(40, 70)
        wall = rng.uniform(14, 34)
        px = x + w * rng.uniform(0.42, 0.58)
        top = base - wall - h
        left = f"{x:.1f},{base - wall:.1f} {px:.1f},{top:.1f} {px:.1f},{base:.1f} {x:.1f},{base:.1f}"
        right = f"{px:.1f},{top:.1f} {x + w:.1f},{base - wall:.1f} {x + w:.1f},{base:.1f} {px:.1f},{base:.1f}"
        out.append(_hatch_clip(f"hl{i}", left, 6.5, -32, width=0.6, opacity=0.55))
        out.append(_hatch_clip(f"hr{i}", right, 3.2, 34, width=0.7, opacity=0.9))
        out.append(f'<polygon points="{x:.1f},{base} {x:.1f},{base - wall:.1f} {px:.1f},{top:.1f} {x + w:.1f},{base - wall:.1f} {x + w:.1f},{base}" '
                   f'fill="none" stroke="{GOLD}" stroke-width="1.1" stroke-linejoin="round"/>')
        # chimney
        if rng.random() < 0.7:
            cxp = px + rng.uniform(0.25, 0.6) * (w / 2) * rng.choice((-1, 1))
            slope = (base - wall - top) / (w / 2)
            cy_roof = top + abs(cxp - px) * slope
            ch = rng.uniform(16, 26)
            out.append(f'<path d="M{cxp - 6:.1f},{cy_roof + 6 * slope:.1f} V{cy_roof - ch:.1f} H{cxp + 6:.1f} V{cy_roof - 6 * slope:.1f}" fill="{BG}" stroke="{GOLD}" stroke-width="1" stroke-linejoin="round"/>')
            out.append(f'<path d="M{cxp - 8:.1f},{cy_roof - ch:.1f} H{cxp + 8:.1f}" stroke="{GOLD}" stroke-width="1.4"/>')
        x += w + rng.uniform(-6, 10)
        i += 1
    out.append(rule(x0 - 40, x1 + 40, base, w=1.2))
    out.append(rule(x0 - 40, x1 + 40, base + 5, w=0.5, opacity=0.6))
    return "".join(out)


def engraving_fasada(rng, x0, x1, base):
    """A palace façade: pilasters, tall arched windows, cornice with dentils."""
    out = []
    top = base - 118
    out.append(rule(x0, x1, top, w=1.2))
    out.append(rule(x0, x1, top + 6, w=0.5, opacity=0.7))
    # dentils
    x = x0 + 4
    while x < x1 - 4:
        out.append(f'<rect x="{x:.1f}" y="{top + 8}" width="5" height="5" fill="{GOLD}" opacity=".8"/>')
        x += 10
    out.append(rule(x0, x1, top + 16, w=0.8))
    n = 7
    pitch = (x1 - x0) / n
    for i in range(n):
        wx = x0 + pitch * i
        # pilaster
        out.append(f'<rect x="{wx + 4:.1f}" y="{top + 20}" width="10" height="{base - top - 20}" fill="none" stroke="{GOLD}" stroke-width="0.8" opacity=".9"/>')
        out.append(_hatch_clip(f"pl{i}", f"{wx + 4:.1f},{top + 20} {wx + 14:.1f},{top + 20} {wx + 14:.1f},{base} {wx + 4:.1f},{base}", 2.6, 90, width=0.5, opacity=0.5))
        # arched window
        ax0, ax1 = wx + 26, wx + pitch - 12
        aw = ax1 - ax0
        ay0, ay1 = top + 34, base - 6
        r = aw / 2
        d = f"M{ax0:.1f},{ay1} V{ay0 + r:.1f} A{r:.1f},{r:.1f} 0 0 1 {ax1:.1f},{ay0 + r:.1f} V{ay1} Z"
        poly = " ".join(f"{ax0 + aw * t / 20:.1f},{ay0 + r - math.sqrt(max(0, r * r - (aw * t / 20 - r) ** 2)):.1f}" for t in range(21)) + f" {ax1:.1f},{ay1} {ax0:.1f},{ay1}"
        out.append(_hatch_clip(f"wl{i}", poly, 3.0, 55, width=0.65, opacity=0.85))
        out.append(f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="1.1"/>')
        out.append(f'<path d="M{ax0 + aw / 2:.1f},{ay0 + r:.1f} V{ay1}" stroke="{GOLD}" stroke-width="0.6" opacity=".8"/>')
        out.append(diamond(ax0 + aw / 2, ay0 - 1, 4))
        # sill
        out.append(f'<path d="M{ax0 - 5:.1f},{ay1} H{ax1 + 5:.1f}" stroke="{GOLD}" stroke-width="1.4"/>')
    out.append(rule(x0 - 40, x1 + 40, base, w=1.2))
    return "".join(out)


def engraving_dlazba(rng, x0, x1, base):
    """A stone terrace in perspective with a balustrade on the horizon."""
    out = []
    horizon = base - 94
    vx = (x0 + x1) / 2
    # balustrade
    out.append(rule(x0, x1, horizon - 26, w=1.1))
    out.append(rule(x0, x1, horizon, w=1.1))
    x = x0 + 8
    while x < x1 - 4:
        out.append(f'<path d="M{x:.1f},{horizon - 24} q-4,6 0,12 q4,6 0,12" fill="none" stroke="{GOLD}" stroke-width="0.9"/>')
        out.append(f'<path d="M{x:.1f},{horizon - 24} q4,6 0,12 q-4,6 0,12" fill="none" stroke="{GOLD}" stroke-width="0.9"/>')
        x += 16
    # perspective grid
    cols = 14
    rows = [0.0, 0.08, 0.17, 0.28, 0.41, 0.56, 0.74, 0.95, 1.2]
    def ty(t):
        return horizon + (base - horizon) * t / 1.2
    def tx(u, t):
        # u in -1..1 at the base row; converge to vx at the horizon
        spread = (x1 - x0) / 2 * (0.18 + 0.82 * t / 1.2)
        return vx + u * spread
    for j in range(len(rows) - 1):
        t0, t1 = rows[j], rows[j + 1]
        y0, y1 = ty(t0), ty(t1)
        out.append(rule(tx(-1.3, t0), tx(1.3, t0), y0, w=0.7 + 0.5 * t0))
        for c in range(-cols // 2 - 2, cols // 2 + 2):
            off = 0.5 if j % 2 else 0
            u0 = (c + off) / (cols / 2)
            u1 = (c + 1 + off) / (cols / 2)
            if (c + j) % 3 == 0:
                poly = f"{tx(u0, t0):.1f},{y0:.1f} {tx(u1, t0):.1f},{y0:.1f} {tx(u1, t1):.1f},{y1:.1f} {tx(u0, t1):.1f},{y1:.1f}"
                out.append(_hatch_clip(f"st{j}_{c + 20}", poly, 2.8 + 2.5 * t0, 20, width=0.55, opacity=0.55 + 0.3 * (1 - t0)))
            out.append(f'<path d="M{tx(u0, t0):.1f},{y0:.1f} L{tx(u0, t1):.1f},{y1:.1f}" stroke="{GOLD}" stroke-width="{0.6 + 0.4 * t0:.2f}" opacity=".9"/>')
    out.append(rule(x0 - 40, x1 + 40, base, w=1.2))
    return "".join(out)


ENGRAVINGS = {"strecha": engraving_strecha, "fasada": engraving_fasada, "dlazba": engraving_dlazba}


def engraving(key):
    rng = random.Random({"strecha": 3, "fasada": 5, "dlazba": 8}[key])
    band = ENGRAVINGS[key](rng, 70, 830, 512)
    return f"""
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000"/><stop offset=".09" stop-color="#fff"/>
      <stop offset=".91" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="bandmask"><rect x="40" y="330" width="820" height="200" fill="url(#fade)"/></mask>
  </defs>
  <g mask="url(#bandmask)">{band}</g>
"""


# ------------------------------------------------------------------- faces
def frame(foil=False):
    col = "#000000" if foil else GOLD
    return (f'<path d="{segs_to_svg(shape(16))}" fill="none" stroke="{col}" stroke-width="2"/>'
            f'<path d="{segs_to_svg(shape(26))}" fill="none" stroke="{col}" stroke-width="0.7"/>')


def front(key, foil=False):
    name, _ = VARIANTS[key]
    col = "#000000" if foil else GOLD
    cream = "#000000" if foil else CREAM
    els = [frame(foil)]
    # variant label under the peak
    half = len(name) * 15.2 / 2 + 30
    els.append(diamond(W / 2 - half, 74, 4, col))
    els.append(diamond(W / 2 + half, 74, 4, col))
    els.append(f'<text x="{W / 2}" y="79" text-anchor="middle" font-family="Inter" font-weight="600" font-size="12.5" letter-spacing="6" fill="{col}">{name}</text>')
    # emblem
    if not foil:
        els.append(guilloche(250, 236, 144, 164, petals=16, loops=3, opacity=0.34))
    els.append(pigeon(250, 236, 288, fill=col))
    # wordmark block
    els.append(f'<text x="478" y="262" font-family="Playfair Display" font-weight="600" font-size="104" letter-spacing="15" fill="{col}">HSPG</text>')
    els.append(rule(480, 856, 288, w=1.1, stroke=col))
    els.append(rule(480, 640, 294, w=0.6, stroke=col))
    els.append(f'<text x="481" y="322" font-family="Inter" font-weight="600" font-size="13.5" letter-spacing="5.2" fill="{cream if foil else CREAM}">ČIŠTĚNÍ A OCHRANA POVRCHŮ</text>')
    els.append(f'<text x="480" y="372" font-family="Playfair Display" font-style="italic" font-weight="500" font-size="25" fill="{col}">{CLAIM}</text>')
    if not foil:
        els.append(engraving(key))
    return "".join(els)


def back(key, foil=False):
    _, line2 = VARIANTS[key]
    col = "#000000" if foil else GOLD
    els = [frame(foil)]
    els.append(pigeon(W / 2, 118, 128, fill=col))
    els.append(f'<text x="{W / 2}" y="246" text-anchor="middle" font-family="Playfair Display" font-weight="600" font-size="60" letter-spacing="13" fill="{col}">HSPG</text>')
    els.append(rule(290, 610, 266, w=1.1, stroke=col))
    els.append(diamond(W / 2, 266, 4.5, col))
    if foil:
        return "".join(els)
    els.append(f'<text x="{W / 2}" y="303" text-anchor="middle" font-family="Inter" font-weight="600" font-size="17" letter-spacing="6.5" fill="{CREAM}">DUŠAN HOLUB</text>')
    els.append(f'<text x="{W / 2}" y="356" text-anchor="middle" font-family="Inter" font-weight="700" font-size="35" letter-spacing="1.5" fill="{CREAM}">{PHONE}</text>')
    els.append(f'<text x="{W / 2}" y="392" text-anchor="middle" font-family="Inter" font-weight="600" font-size="21" letter-spacing="4" fill="{GOLD}">{WEB.upper()}</text>')
    els.append(f'<text x="{W / 2}" y="428" text-anchor="middle" font-family="Inter" font-weight="600" font-size="14.5" letter-spacing="1" fill="{MUTED}">{line2}</text>')
    els.append(f'<text x="{W / 2}" y="498" text-anchor="middle" font-family="Inter" font-weight="600" font-size="10.5" letter-spacing="2.4" fill="{MUTED}">{STEPS}</text>')
    # discreet QR, bottom right
    q, pad = 72, 6
    qx, qy = W - 46 - q - pad, H - 52 - q - pad
    els.append(f'<rect x="{qx - pad}" y="{qy - pad}" width="{q + 2 * pad}" height="{q + 2 * pad}" rx="3" fill="{CREAM}"/>')
    els.append(f'<path d="{qr_path("https://" + WEB, qx, qy, q)}" fill="{BG}"/>')
    return "".join(els)


def qr_path(data, x, y, size):
    import segno
    qr = segno.make(data, error="m", micro=False)
    mat = [list(r) for r in qr.matrix]
    n = len(mat)
    cell = size / n
    parts = []
    for r, row in enumerate(mat):
        c = 0
        while c < n:
            if row[c]:
                start = c
                while c < n and row[c]:
                    c += 1
                parts.append(f"M{x + start * cell:.3f},{y + r * cell:.3f}h{(c - start) * cell:.3f}v{cell:.3f}h{-(c - start) * cell:.3f}z")
            else:
                c += 1
    return "".join(parts)
