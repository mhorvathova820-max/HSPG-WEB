"""HSPG folding card, "Vila" edition: a gate-fold triptych.

Coordinates: 1 unit = 0.1 mm. Closed card: crest 900 x 560 (90 x 56 mm).
Flat sheet: 1800 x 560, three panels: left door (0..450), centre (450..1350),
right door (1350..1800). The doors fold over the centre and meet at the peak.

Side A (outside): closed front across both doors (weathered villa, its
entrance split by the seam) and the back cover on the centre panel
(emblem, monogram). Side B (inside): the restored villa on the centre
panel, the five-step process on the left door, the contact on the right.
All vector, hand built: pigeon traced from the logo, parametric guilloche,
procedural engraving.
"""
import math
import pathlib
import random

import cv2
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent

PW, PH = 900, 560          # closed card
DW = 450                   # door width
FW = 2 * PW                # flat width
PEAK = 112                 # peak rise

# flat crown outline, clockwise on screen
FLAT = [(0, 0), (DW, PEAK), (PW, 0), (PW + DW, PEAK), (FW, 0), (FW, PH), (0, PH)]
FLAT_R = [0, 0, 80, 0, 0, 60, 60]
# panels in flat coordinates
PANEL_L = ([(0, 0), (DW, PEAK), (DW, PH), (0, PH)], [0, 0, 0, 60])
PANEL_C = ([(DW, PEAK), (PW, 0), (PW + DW, PEAK), (PW + DW, PH), (DW, PH)], [0, 80, 0, 0, 0])
PANEL_R = ([(PW + DW, PEAK), (FW, 0), (FW, PH), (PW + DW, PH)], [0, 0, 60, 0])
# closed crest (for previews)
CREST = ([(0, PEAK), (DW, 0), (PW, PEAK), (PW, PH), (0, PH)], [0, 80, 0, 60, 60])

BG = "#08112a"
GOLD = "#d4af37"
GOLD_L = "#efd783"
CREAM = "#f1e8d2"
MUTED = "#9aa6bf"

PHONE = "+420 736 618 486"
WEB = "hspg.cz"
STEPS = [("I", "Čištění"), ("II", "Odmaštění"), ("III", "Ošetření"), ("IV", "Oplach"), ("V", "Ochranná vrstva")]


# ----------------------------------------------------------------- geometry
def offset_polygon(pts, d):
    """Polygon shifted inward by d (negative = outward); fine for the gentle concavities here."""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy)
        nx, ny = -sgn * dy / L, sgn * dx / L
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
    n = len(pts)
    segs = []
    first = True
    for i in range(n):
        P, V, N = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = radii[i]
        if r < 0.5:
            segs.append(("M" if first else "L", V))
            first = False
            continue
        upx, upy = P[0] - V[0], P[1] - V[1]
        unx, uny = N[0] - V[0], N[1] - V[1]
        lp, ln = math.hypot(upx, upy), math.hypot(unx, uny)
        upx, upy, unx, uny = upx / lp, upy / lp, unx / ln, uny / ln
        theta = math.acos(max(-1, min(1, upx * unx + upy * uny)))
        t = r / math.tan(theta / 2)
        A = (V[0] + upx * t, V[1] + upy * t)
        B = (V[0] + unx * t, V[1] + uny * t)
        k = 4 / 3 * math.tan((math.pi - theta) / 4) * r
        c1 = (A[0] - upx * k, A[1] - upy * k)
        c2 = (B[0] - unx * k, B[1] - uny * k)
        segs.append(("M" if first else "L", A))
        first = False
        segs.append(("C", c1, c2, B))
    segs.append(("Z",))
    return segs


def segs_to_svg(segs):
    out = []
    for s in segs:
        if s[0] in "ML":
            out.append(f"{s[0]}{s[1][0]:.2f},{s[1][1]:.2f}")
        elif s[0] == "C":
            out.append("C" + " ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in s[1:]))
        else:
            out.append("Z")
    return " ".join(out)


def shape(poly, radii, inset):
    return rounded_segments(offset_polygon(poly, inset), [max(0, r - inset) if r else 0 for r in radii])


def frame(panel, col=GOLD):
    poly, radii = panel
    return (f'<path d="{segs_to_svg(shape(poly, radii, 16))}" fill="none" stroke="{col}" stroke-width="2"/>'
            f'<path d="{segs_to_svg(shape(poly, radii, 26))}" fill="none" stroke="{col}" stroke-width="0.7"/>')


# ------------------------------------------------------------------ emblem
_PIGEON = None


def pigeon_path():
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
    bw, bh = 737, 951
    s = height / bh
    tx = cx - (160 + bw / 2) * s
    ty = cy - (72 + bh / 2) * s
    return (f'<path d="{pigeon_path()}" fill="{fill}" fill-rule="evenodd" opacity="{opacity}" '
            f'transform="translate({tx:.2f},{ty:.2f}) scale({s:.5f})"/>')


def guilloche(cx, cy, r_in, r_out, petals=16, loops=3, stroke=GOLD, width=0.55, opacity=0.4):
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


def text(x, y, s, size, fam="Inter", weight=600, col=GOLD, anchor="middle", ls=0, italic=False):
    st = ' font-style="italic"' if italic else ""
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{fam}" font-weight="{weight}" '
            f'font-size="{size}" letter-spacing="{ls}" fill="{col}"{st}>{s}</text>')


# --------------------------------------------------------------- engraving
def hatch(cid, poly, spacing, angle_deg, width=0.6, opacity=0.8, box=(0, 0, FW, PH), col=GOLD):
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    x0, y0, x1, y1 = box
    diag = math.hypot(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    lines = []
    k = -diag / 2
    while k < diag / 2:
        px, py = cx + nx * k, cy + ny * k
        lines.append(f"M{px - dx * diag:.1f},{py - dy * diag:.1f} L{px + dx * diag:.1f},{py + dy * diag:.1f}")
        k += spacing
    return (f'<clipPath id="{cid}"><polygon points="{poly}"/></clipPath>'
            f'<path d="{" ".join(lines)}" clip-path="url(#{cid})" stroke="{col}" stroke-width="{width}" opacity="{opacity}" fill="none"/>')


def rect_poly(x, y, w, h):
    return f"{x:.1f},{y:.1f} {x + w:.1f},{y:.1f} {x + w:.1f},{y + h:.1f} {x:.1f},{y + h:.1f}"


def blob(cx, cy, rx, ry, rng, n=9):
    """Organic closed shape (moss clump), smoothed through midpoints."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = rng.uniform(0.65, 1.25)
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    d = []
    for i in range(n):
        p0, p1 = pts[i], pts[(i + 1) % n]
        m = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
        if i == 0:
            d.append(f"M{m[0]:.1f},{m[1]:.1f}")
        p2 = pts[(i + 1) % n]
        m2 = ((p1[0] + pts[(i + 2) % n][0]) / 2, (p1[1] + pts[(i + 2) % n][1]) / 2)
        d.append(f"Q{p2[0]:.1f},{p2[1]:.1f} {m2[0]:.1f},{m2[1]:.1f}")
    return " ".join(d) + "Z", pts


def villa(cx, base, weathered, pid, rng, deboss=False):
    """A classical villa drawn as an engraving. Same geometry in both states.

    deboss=True draws only the outlines, black and heavier, for the blind-deboss die."""
    col = "#000" if deboss else GOLD
    L = f'stroke="{col}" stroke-width="{3.2 if deboss else 1.1}" fill="none" stroke-linejoin="round"'
    hw = 320
    top = base - 292
    box = (cx - hw - 100, top - 120, cx + hw + 100, base + 40)
    out = []
    H = (lambda *a, **k: "") if deboss else (lambda *a, **k: hatch(*a, **k))
    # roof with tile courses
    roof = f"{cx - hw - 10},{top} {cx - hw + 80},{top - 50} {cx + hw - 80},{top - 50} {cx + hw + 10},{top}"
    out.append(f'<clipPath id="{pid}rc"><polygon points="{roof}"/></clipPath>')
    if not deboss:
        out.append(f'<g clip-path="url(#{pid}rc)">')
        y = top - 44
        while y < top:
            out.append(rule(cx - hw - 20, cx + hw + 20, y, w=0.55, opacity=0.9 if weathered else 0.6))
            y += 8
        out.append(H(f"{pid}roof", roof, 2.8 if weathered else 6.0, 18, width=0.5, opacity=0.6 if weathered else 0.35, box=box))
        out.append("</g>")
    out.append(f'<polygon points="{roof}" {L}/>')
    out.append(f'<path d="M{cx + 150},{top - 46} V{top - 84} H{cx + 172} V{top - 44}" {L}/>')
    out.append(f'<path d="M{cx + 146},{top - 84} H{cx + 176}" stroke="{col}" stroke-width="{3.2 if deboss else 1.6}"/>')
    # cornice with dentils
    out.append(rule(cx - hw - 14, cx + hw + 14, top, w=3.2 if deboss else 1.4, stroke=col))
    if not deboss:
        out.append(rule(cx - hw - 14, cx + hw + 14, top + 6, w=0.6))
        x = cx - hw + 2
        while x < cx + hw - 2:
            out.append(f'<rect x="{x:.1f}" y="{top + 8}" width="4.5" height="4.5" fill="{GOLD}" opacity=".85"/>')
            x += 9
    out.append(rule(cx - hw - 6, cx + hw + 6, top + 16, w=3.2 if deboss else 0.8, stroke=col))
    # walls
    wall = rect_poly(cx - hw, top + 16, 2 * hw, base - top - 16)
    if weathered:
        out.append(H(f"{pid}w1", wall, 3.4, 45, width=0.5, opacity=0.6, box=box))
        out.append(H(f"{pid}w2", rect_poly(cx - hw, base - 150, 2 * hw, 150), 4.2, -45, width=0.5, opacity=0.5, box=box))
    else:
        out.append(H(f"{pid}w1", rect_poly(cx - hw, top + 16, 2 * hw, 22), 3.2, 45, width=0.5, opacity=0.5, box=box))
    out.append(f'<rect x="{cx - hw}" y="{top + 16}" width="{2 * hw}" height="{base - top - 16}" {L}/>')
    out.append(rule(cx - hw, cx + hw, base - 170, w=3.2 if deboss else 1.0, stroke=col))
    if not deboss:
        out.append(rule(cx - hw, cx + hw, base - 164, w=0.5, opacity=0.8))
        y = base - 150
        while y < base - 8:
            out.append(rule(cx - hw, cx + hw, y, w=0.45, opacity=0.6 if weathered else 0.45))
            y += 14
    # pilasters
    for px in (cx - hw + 18, cx - 150, cx + 150, cx + hw - 30):
        out.append(f'<rect x="{px}" y="{top + 16}" width="12" height="{base - top - 16}" {L}/>')
        out.append(H(f"{pid}p{px}", rect_poly(px + 12, top + 16, 6, base - top - 16), 2.4, 90, width=0.45, opacity=0.6, box=box))

    # windows
    def window(wx, wy, ww, wh, k):
        poly = rect_poly(wx, wy, ww, wh)
        if weathered:
            out.append(H(f"{pid}g{k}", poly, 2.4, 60, width=0.55, opacity=0.9, box=box))
        elif not deboss:
            out.append(f'<rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" fill="{GOLD_L}" opacity=".16"/>')
            out.append(H(f"{pid}g{k}", poly, 6.5, 60, width=0.5, opacity=0.35, box=box))
            out.append(f'<path d="M{wx + 6},{wy + 20} L{wx + 20},{wy + 6}" stroke="{GOLD_L}" stroke-width="2" stroke-linecap="round"/>')
        out.append(f'<rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" {L}/>')
        if not deboss:
            out.append(f'<path d="M{wx + ww / 2},{wy} V{wy + wh} M{wx},{wy + wh * 0.45} H{wx + ww}" stroke="{GOLD}" stroke-width="0.6" opacity=".9"/>')
            out.append(diamond(wx + ww / 2, wy - 1, 4))
        out.append(f'<path d="M{wx - 7},{wy + wh} H{wx + ww + 7}" stroke="{col}" stroke-width="{3.2 if deboss else 1.6}"/>')

    k = 0
    for sx in (-1, 1):
        for off in (85, 225):
            wx = cx + sx * off - 28
            window(wx, top + 44, 56, 84, k)
            k += 1
            window(wx, base - 136, 56, 96, k)
            k += 1
    # entrance on the axis
    dw, dh = 64, 124
    dx0, dy0 = cx - dw / 2, base - dh
    r = dw / 2
    door_poly = " ".join(
        f"{dx0 + dw * t / 20:.1f},{dy0 + r - math.sqrt(max(0, r * r - (dw * t / 20 - r) ** 2)):.1f}"
        for t in range(21)) + f" {dx0 + dw},{base} {dx0},{base}"
    out.append(H(f"{pid}d", door_poly, 2.2 if weathered else 4.5, 90, width=0.55, opacity=0.85 if weathered else 0.5, box=box))
    out.append(f'<path d="M{dx0},{base} V{dy0 + r} A{r},{r} 0 0 1 {dx0 + dw},{dy0 + r} V{base}" {L}/>')
    if not deboss:
        out.append(f'<path d="M{cx},{dy0 + r} V{base}" stroke="{GOLD}" stroke-width="0.9"/>')
        out.append(f'<path d="M{dx0},{dy0 + r} H{dx0 + dw}" stroke="{GOLD}" stroke-width="0.7"/>')
        for i in range(1, 4):
            a = math.pi * i / 4
            out.append(f'<path d="M{cx},{dy0 + r} L{cx + r * math.cos(math.pi + a):.1f},{dy0 + r - r * math.sin(a):.1f}" stroke="{GOLD}" stroke-width="0.5" opacity=".8"/>')
        out.append(diamond(cx - 9, base - 56, 3.2, GOLD_L))
        out.append(diamond(cx + 9, base - 56, 3.2, GOLD_L))
    # portico
    for px in (cx - 62, cx + 50):
        out.append(f'<rect x="{px}" y="{base - 156}" width="12" height="156" {L}/>')
        out.append(H(f"{pid}c{px}", rect_poly(px + 7, base - 156, 5, 156), 2.6, 90, width=0.45, opacity=0.6, box=box))
    out.append(f'<path d="M{cx - 76},{base - 156} L{cx},{base - 196} L{cx + 76},{base - 156} Z" {L}/>')
    out.append(rule(cx - 80, cx + 80, base - 156, w=3.2 if deboss else 1.4, stroke=col))
    # steps and ground
    for i, w in enumerate((86, 110, 134)):
        out.append(rule(cx - w / 2, cx + w / 2, base + 8 * (i + 1), w=3.0 if deboss else 1.0, stroke=col))
    out.append(rule(cx - hw - 80, cx + hw + 80, base + 32, w=3.2 if deboss else 1.3, stroke=col))
    if not deboss:
        out.append(rule(cx - hw - 80, cx + hw + 80, base + 37, w=0.5, opacity=0.6))
    # weathering
    if weathered and not deboss:
        # moss clumps on the roof, clipped to it
        out.append(f'<g clip-path="url(#{pid}rc)">')
        for i in range(16):
            mx = rng.uniform(cx - hw + 30, cx + hw - 30)
            my = rng.uniform(top - 44, top - 2)
            rx, ry = rng.uniform(16, 40), rng.uniform(7, 14)
            d, pts = blob(mx, my, rx, ry, rng)
            out.append(f'<path d="{d}" fill="{GOLD}" opacity=".28"/>')
            poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
            out.append(hatch(f"{pid}m{i}", poly, 2.0, 120, width=0.55, opacity=0.9, box=box))
            out.append(f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="0.8"/>')
            for _ in range(int(rx * ry / 18)):
                out.append(f'<circle cx="{mx + rng.gauss(0, rx * .6):.1f}" cy="{my + rng.gauss(0, ry * .6):.1f}" r="{rng.uniform(.8, 2.2):.1f}" fill="{GOLD}" opacity=".9"/>')
        # lichen rosettes
        for _ in range(12):
            lx, ly, lr = rng.uniform(cx - hw, cx + hw), rng.uniform(top - 46, top - 4), rng.uniform(4, 9)
            out.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{lr:.1f}" fill="none" stroke="{GOLD}" stroke-width="0.7" stroke-dasharray="1.2 1.4"/>')
            out.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{lr * .45:.1f}" fill="{GOLD}" opacity=".6"/>')
        out.append("</g>")
        # moss in the gutter and on the cornice
        for _ in range(140):
            gx = rng.uniform(cx - hw - 10, cx + hw + 10)
            gy = top + rng.uniform(-3, 20)
            out.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="{rng.uniform(.9, 2.6):.1f}" fill="{GOLD}" opacity="{rng.uniform(.45, .9):.2f}"/>')
        # dirt streaks running down from the cornice and the sills
        out.append(f'<clipPath id="{pid}wc"><polygon points="{wall}"/></clipPath>'
                   f'<linearGradient id="{pid}sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/>'
                   f'<stop offset=".55" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
                   f'<mask id="{pid}sm"><rect x="{cx - hw}" y="{top + 16}" width="{2 * hw}" height="{base - top - 16}" fill="url(#{pid}sg)"/></mask>'
                   f'<g clip-path="url(#{pid}wc)" mask="url(#{pid}sm)">')
        for _ in range(18):
            sx = rng.uniform(cx - hw + 6, cx + hw - 6)
            sw, sh = rng.uniform(5, 14), rng.uniform(40, 130)
            out.append(hatch(f"{pid}s{int(sx)}", rect_poly(sx, top + 16, sw, sh), 1.7, 90, width=0.5, opacity=0.55, box=box))
        for sxs in (-1, 1):
            for off in (85, 225):
                wx = cx + sxs * off
                for wy in (top + 128, base - 40):
                    out.append(hatch(f"{pid}u{wx}{wy}", rect_poly(wx - 22, wy, 44, rng.uniform(26, 60)), 1.9, 90, width=0.5, opacity=0.5, box=box))
        out.append("</g>")
        # moss at the base and under the sills
        for _ in range(220):
            x = rng.uniform(cx - hw + 4, cx + hw - 4)
            y = base - abs(rng.gauss(0, 55))
            if y < top + 20:
                continue
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rng.uniform(1.0, 3.4):.1f}" fill="{GOLD}" opacity="{rng.uniform(.35, .85):.2f}"/>')
        for sxs in (-1, 1):
            for off in (85, 225):
                wx = cx + sxs * off
                for wy in (top + 128, base - 40):
                    for _ in range(18):
                        out.append(f'<circle cx="{wx + rng.uniform(-30, 30):.1f}" cy="{wy + rng.uniform(0, 26):.1f}" r="{rng.uniform(.9, 2.6):.1f}" fill="{GOLD}" opacity=".75"/>')
        # cracks
        for _ in range(6):
            x, y = rng.uniform(cx - hw + 30, cx + hw - 30), rng.uniform(top + 30, base - 40)
            pts = [f"{x:.1f},{y:.1f}"]
            for _ in range(7):
                x += rng.uniform(-9, 9)
                y += rng.uniform(6, 16)
                pts.append(f"{x:.1f},{y:.1f}")
            out.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{GOLD}" stroke-width="0.8" opacity=".9"/>')
    return "".join(out)


# ------------------------------------------------------------------ pages
def closed_front(foil=False, deboss=False):
    """The weathered villa across both doors, closed-card coordinates 0..900."""
    col = "#000" if foil else GOLD
    els = []
    if deboss:
        v = villa(PW / 2, 470, True, "a", random.Random(21), deboss=True)
        return f'<g transform="translate({PW / 2},470) scale(0.86) translate({-PW / 2},-470)">{v}</g>'
    if not foil:
        v = villa(PW / 2, 470, True, "a", random.Random(21))
        els.append(f'<g transform="translate({PW / 2},470) scale(0.86) translate({-PW / 2},-470)">{v}</g>')
    els.append(pigeon(112, 166, 74, fill=col))
    els.append(text(PW - 66, 168, "HSPG", 24, "Playfair Display", 600, col, "end", ls=7))
    els.append(text(130, 520, "Věci stárnou.", 26, "Playfair Display", 500, col, "start", italic=True))
    els.append(text(PW - 130, 520, "OTEVŘETE", 12, "Inter", 600, col, "end", ls=5))
    els.append(diamond(PW - 112, 515, 4, col))
    return "".join(els)


def back_cover(foil=False):
    """Centre panel, outside: emblem and monogram. Local coordinates 0..900."""
    col = "#000" if foil else GOLD
    cream = "#000" if foil else CREAM
    els = []
    if not foil:
        els.append(guilloche(250, 262, 144, 164))
    els.append(pigeon(250, 262, 288, fill=col))
    els.append(text(478, 262, "HSPG", 104, "Playfair Display", 600, col, "start", ls=15))
    els.append(rule(480, 856, 288, w=1.1, stroke=col))
    els.append(rule(480, 640, 294, w=0.6, stroke=col))
    els.append(text(481, 322, "ČIŠTĚNÍ A OCHRANA POVRCHŮ", 13.5, "Inter", 600, cream, "start", ls=5.2))
    els.append(text(480, 372, "Věci stárnou. My zůstáváme.", 25, "Playfair Display", 500, col, "start", italic=True))
    els.append(text(481, 470, "DUŠAN HOLUB", 13, "Inter", 600, cream, "start", ls=5))
    els.append(text(481, 496, PHONE + "   ·   " + WEB.upper(), 13, "Inter", 600, col, "start", ls=3))
    # numbered edition, the number is written by hand
    els.append(text(856, 470, "ČÍSLOVANÁ EDICE", 10.5, "Inter", 600, cream, "end", ls=4))
    els.append(text(778, 498, "Nº", 16, "Playfair Display", 500, col, "end", italic=True))
    els.append(rule(786, 856, 500, w=0.8, stroke=col))
    return "".join(els)


def inside_centre(foil=False):
    col = "#000" if foil else GOLD
    els = []
    if not foil:
        els.append(villa(PW / 2, 436, False, "b", random.Random(22)))
    els.append(text(PW / 2, 64, "My zůstáváme.", 34, "Playfair Display", 500, col, "middle", italic=True))
    els.append(diamond(PW / 2 - 150, 58, 4, col))
    els.append(diamond(PW / 2 + 150, 58, 4, col))
    els.append(text(PW / 2, 520, "ČIŠTĚNÍ A OCHRANA POVRCHŮ · BEZ LEŠENÍ, Z PLOŠINY · CELÁ ČR", 11.5, "Inter", 600,
                    "#000" if foil else CREAM, "middle", ls=3.6))
    return "".join(els)


def inside_left(foil=False):
    """Left door, inside: the five steps. Local coordinates 0..450."""
    col = "#000" if foil else GOLD
    els = [text(DW / 2, 150, "POSTUP", 12.5, "Inter", 600, col, "middle", ls=6),
           diamond(DW / 2 - 70, 145, 3.5, col), diamond(DW / 2 + 70, 145, 3.5, col)]
    y = 210
    for num, name in STEPS:
        els.append(text(118, y, num, 24, "Playfair Display", 600, col, "end", ls=2))
        if not foil:
            els.append(text(142, y, name, 16, "Inter", 600, CREAM, "start", ls=1.2))
            els.append(rule(70, DW - 70, y + 20, w=0.5, opacity=0.6))
        y += 58
    if not foil:
        els.append(text(DW / 2, 522, "FOTO PŘED A PO U KAŽDÉ ZAKÁZKY", 9.5, "Inter", 600, MUTED, "middle", ls=2.6))
    return "".join(els)


def inside_right(foil=False):
    """Right door, inside: contact. Local coordinates 0..450."""
    col = "#000" if foil else GOLD
    els = [pigeon(DW / 2, 150, 110, fill=col),
           text(DW / 2, 246, "HSPG", 44, "Playfair Display", 600, col, "middle", ls=11),
           rule(120, DW - 120, 264, w=1.0, stroke=col), diamond(DW / 2, 264, 4, col)]
    if foil:
        return "".join(els)
    els.append(text(DW / 2, 300, "DUŠAN HOLUB", 15, "Inter", 600, CREAM, "middle", ls=6))
    els.append(text(DW / 2, 344, PHONE, 27, "Inter", 700, CREAM, "middle", ls=1))
    els.append(text(DW / 2, 376, WEB.upper(), 17, "Inter", 600, GOLD, "middle", ls=4))
    q, pad = 70, 6
    qx, qy = DW / 2 - q / 2, 408
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


def g(inner, dx, dy):
    return f'<g transform="translate({dx},{dy})">{inner}</g>'


def side_a(foil=False, deboss=False):
    """Flat sheet, outside, seen with side A up: [right door | back cover | left door]."""
    col = "#000" if foil else GOLD
    front = closed_front(foil, deboss)
    els = [f'<clipPath id="cr"><rect x="{DW}" y="0" width="{DW}" height="{PH}"/></clipPath>'
           f'<clipPath id="cl"><rect x="0" y="0" width="{DW}" height="{PH}"/></clipPath>',
           f'<g transform="translate({-DW},0)"><g clip-path="url(#cr)">{front}</g></g>',
           f'<g transform="translate({PW + DW},0)"><g clip-path="url(#cl)">{front}</g></g>']
    if deboss:
        return "".join(els)
    els.append(g(back_cover(foil), DW, 0))
    els.append(frame(PANEL_L, col) + frame(PANEL_C, col) + frame(PANEL_R, col))
    return "".join(els)


def side_b(foil=False):
    """Flat sheet, inside, as the reader opens it: [left door | centre | right door]."""
    col = "#000" if foil else GOLD
    return "".join([g(inside_left(foil), 0, 0), g(inside_centre(foil), DW, 0), g(inside_right(foil), PW + DW, 0),
                    frame(PANEL_L, col) + frame(PANEL_C, col) + frame(PANEL_R, col)])


def closed_preview():
    """Closed card seen from the front, crest coordinates 0..900."""
    return (closed_front()
            + frame(([(0, PEAK), (DW, 0), (DW, PH), (0, PH)], [0, 0, 60, 60]))
            + frame(([(DW, 0), (PW, PEAK), (PW, PH), (DW, PH)], [0, 0, 60, 60])))
