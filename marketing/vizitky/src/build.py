"""Build print-ready HSPG die-cut cards (front, back, cut contour).

Run from marketing/vizitky:  python3 src/build.py [strecha fasada dlazba]

Per variant it writes to out/:
  <key>_tisk.pdf     3 pages (front, back, back foil mask), vector art + CutContour spot line
  <key>_vysek.svg    cut line only (mm units, same page as the PDF)
  <key>_lic.png      front preview, <key>_rub.png back preview
  <key>_nahled.jpg   front + back mock-up
Requires: Node.js + Playwright (Chromium), Python: numpy, Pillow,
opencv-python-headless, segno, reportlab, pypdf.
"""
import io
import math
import pathlib
import subprocess
import sys
import tempfile

import cv2
import numpy as np
import segno
from PIL import Image, ImageFilter
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import CMYKColorSep
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import art  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
RENDER = ROOT / "src" / "render.cjs"

# geometry, 1 unit = 0.1 mm
ART_W, ART_H = 900, 700
MARGIN = 80                       # page margin around the art box
PAGE_W, PAGE_H = ART_W + 2 * MARGIN, ART_H + 2 * MARGIN
BORDER = 30                       # white sticker border outside the art (3 mm)
CLOSE = 36                        # fills gaps between spray drops etc.
BLEED = 20                        # back colour runs 2 mm past the cut
SAFE = 35                         # back text stays 3.5 mm inside the cut
HAIR = 16                         # gold hairline runs 1.6 mm inside the cut
PX = 2                            # raster px per unit for contour work (20 px/mm)

PHONE = "+420 736 618 486"
WEB = "hspg.cz"
CLAIM = "Věci stárnou. My zůstáváme."

FONTS = f"""
@font-face{{font-family:'Playfair Display';src:url('{ROOT}/assets/fonts/PlayfairDisplay.ttf');font-weight:400 900}}
@font-face{{font-family:'Playfair Display';font-style:italic;src:url('{ROOT}/assets/fonts/PlayfairDisplay-Italic.ttf');font-weight:400 900}}
@font-face{{font-family:'Inter';src:url('{ROOT}/assets/fonts/Inter-SemiBold.otf');font-weight:600}}
@font-face{{font-family:'Inter';src:url('{ROOT}/assets/fonts/Inter-Bold.otf');font-weight:700}}
"""


def html_page(svg, bg="transparent"):
    return (f"<!doctype html><html><head><meta charset='utf-8'><style>{FONTS}"
            f"@page{{size:{PAGE_W / 10}mm {PAGE_H / 10}mm;margin:0}}"
            f"html,body{{margin:0;padding:0;background:{bg}}}svg{{display:block}}</style></head>"
            f"<body>{svg}</body></html>")


def svg_doc(inner, size_mm=True):
    size = (f'width="{PAGE_W / 10}mm" height="{PAGE_H / 10}mm"' if size_mm
            else f'width="{PAGE_W}" height="{PAGE_H}"')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'viewBox="0 0 {PAGE_W} {PAGE_H}" {size}>{inner}</svg>')


def render_png(svg_inner, tmp, name, scale=PX, bg="transparent"):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(svg_inner, size_mm=False), bg))
    png = tmp / f"{name}.png"
    subprocess.run(["node", str(RENDER), "png", str(html), str(png), str(PAGE_W), str(PAGE_H), str(scale)], check=True)
    return Image.open(png)


def render_pdf(svg_inner, tmp, name):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(svg_inner)))
    pdf = tmp / f"{name}.pdf"
    subprocess.run(["node", str(RENDER), "pdf", str(html), str(pdf), str(PAGE_W / 10), str(PAGE_H / 10)], check=True)
    return pdf


def disk(radius_px):
    r = int(round(radius_px))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def silhouette(alpha):
    """Binary die-cut mask (uint8 0/255) from the art's alpha channel."""
    m = (alpha > 24).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, disk(CLOSE * PX))
    # fill interior holes
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(m)
    cv2.drawContours(filled, cnts, -1, 255, thickness=-1)
    m = cv2.dilate(filled, disk(BORDER * PX))
    # round off small kinks so the knife can follow it
    m = cv2.GaussianBlur(m, (0, 0), sigmaX=12 * PX)
    return ((m > 127).astype(np.uint8)) * 255


def mask_to_path(mask, mirror=False):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if len(cnts) != 1:
        areas = sorted((cv2.contourArea(c) for c in cnts), reverse=True)
        raise SystemExit(f"die-cut silhouette is not one piece: {len(cnts)} parts, areas {areas[:4]}")
    raw = cnts[0][:, 0, :].astype(float) / PX
    # resample evenly (~0.8 mm) so the Catmull-Rom curve cannot overshoot corners
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([raw, raw[:1]]), axis=0).T))]
    ts = np.arange(0, seg[-1], 8.0)
    closed = np.vstack([raw, raw[:1]])
    c = np.column_stack([np.interp(ts, seg, closed[:, 0]), np.interp(ts, seg, closed[:, 1])])
    if mirror:
        c[:, 0] = PAGE_W - c[:, 0]
    pts = c.tolist()
    n = len(pts)
    # closed Catmull-Rom -> cubic Bezier
    d = [f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}")
    d.append("Z")
    return " ".join(d), pts


def qr_path(data, x, y, size):
    qr = segno.make(data, error="m", micro=False)
    mat = [list(r) for r in qr.matrix]
    n = len(mat)
    q = 2  # quiet zone in modules (the white card adds more)
    cell = size / (n + 2 * q)
    parts = []
    for r, row in enumerate(mat):
        c = 0
        while c < n:
            if row[c]:
                start = c
                while c < n and row[c]:
                    c += 1
                parts.append(f"M{x + (start + q) * cell:.3f},{y + (r + q) * cell:.3f}h{(c - start) * cell:.3f}v{cell:.3f}h{-(c - start) * cell:.3f}z")
            else:
                c += 1
    return "".join(parts)


def icon_phone(x, y, s, color):
    return (f'<g transform="translate({x},{y}) scale({s / 24})"><path fill="{color}" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6'
            'l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5'
            'c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></g>')


def icon_web(x, y, s, color):
    return (f'<g transform="translate({x},{y}) scale({s / 24})" fill="none" stroke="{color}" stroke-width="2">'
            '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9'
            'c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></g>')


BLOCK_W, BLOCK_H = 600, 340       # back content block, laid out at scale 1


def largest_rect(mask, cell=5, aspect=(BLOCK_W, BLOCK_H)):
    """Axis-aligned rectangle (page units) inside a 0/255 mask that fits the
    largest copy of a block with the given aspect."""
    step = cell * PX
    h, w = mask.shape[0] // step, mask.shape[1] // step
    grid = mask[:h * step, :w * step].reshape(h, step, w, step).min(axis=(1, 3)) > 0
    heights = np.zeros(w, int)
    best = (0, 0, 0, 0, 0)  # area, x0, y0, x1, y1 in cells
    for r in range(h):
        heights = np.where(grid[r], heights + 1, 0)
        stack = []
        for c in range(w + 1):
            cur = heights[c] if c < w else 0
            start = c
            while stack and stack[-1][1] >= cur:
                start, hh = stack.pop()
                area = min((c - start) / aspect[0], hh / aspect[1])
                if area > best[0]:
                    best = (area, start, r - hh + 1, c, r + 1)
            stack.append((start, cur))
    _, x0, y0, x1, y1 = best
    return x0 * cell, y0 * cell, x1 * cell, y1 * cell


def back_block(label, foil=False):
    """Contact block, BLOCK_W x BLOCK_H, origin top-left.

    With foil=True only the elements that get hot foil are drawn, in black:
    logo, wordmark, rule and claim."""
    gold = "#000000" if foil else art.GOLD
    cream = art.CREAM
    muted = "#aeb9cf"
    q, pad = 112, 8
    qx = BLOCK_W - q - pad
    line2 = ("Celá ČR · foto před a po" if "dlažb" in label.lower()
             else "Bez lešení – z plošiny · celá ČR")
    steps = "ČIŠTĚNÍ · ODMAŠTĚNÍ · OŠETŘENÍ · OPLACH · OCHRANNÁ VRSTVA"
    logo = ROOT / ("assets/logo_black.png" if foil else "assets/logo_gold.png")
    foil_els = [
        f'<image href="{logo}" x="0" y="0" width="{105 * 0.83:.1f}" height="105"/>',
        f'<text x="100" y="72" font-family="Playfair Display" font-weight="600" font-size="74" letter-spacing="7" fill="{gold}">HSPG</text>',
        f'<path d="M0,146 H{BLOCK_W}" stroke="{gold}" stroke-width="1.6"/>',
        f'<path d="M0,152 H{BLOCK_W * 0.42:.0f}" stroke="{gold}" stroke-width="0.8"/>',
        f'<text x="{BLOCK_W}" y="188" text-anchor="end" font-family="Playfair Display" font-style="italic" font-weight="500" font-size="28" fill="{gold}">Věci stárnou.</text>',
        f'<text x="{BLOCK_W}" y="222" text-anchor="end" font-family="Playfair Display" font-style="italic" font-weight="500" font-size="28" fill="{gold}">My zůstáváme.</text>',
    ]
    if foil:
        return "".join(foil_els)
    return "".join(foil_els + [
        f'<text x="104" y="110" font-family="Inter" font-weight="600" font-size="20" letter-spacing="5" fill="{cream}">DUŠAN HOLUB</text>',
        f'<rect x="{qx - pad}" y="0" width="{q + 2 * pad}" height="{q + 2 * pad}" rx="6" fill="{cream}"/>',
        f'<rect x="{qx - pad + 4}" y="4" width="{q + 2 * pad - 8}" height="{q + 2 * pad - 8}" rx="4" fill="none" stroke="{art.GOLD}" stroke-width="1"/>',
        f'<path d="{qr_path("https://" + WEB, qx, pad, q)}" fill="{art.BG}"/>',
        f'<text x="0" y="186" font-family="Inter" font-weight="600" font-size="21" fill="{muted}">Čištění a ochrana · {label.lower()}</text>',
        f'<text x="0" y="214" font-family="Inter" font-weight="600" font-size="21" fill="{muted}">{line2}</text>',
        icon_phone(0, 240, 28, art.GOLD),
        f'<text x="40" y="266" font-family="Inter" font-weight="700" font-size="36" letter-spacing="1" fill="{cream}">{PHONE}</text>',
        icon_web(1, 285, 25, art.GOLD),
        f'<text x="40" y="307" font-family="Inter" font-weight="600" font-size="27" letter-spacing="2" fill="{cream}">{WEB}</text>',
        f'<text x="{BLOCK_W}" y="{BLOCK_H - 2}" text-anchor="end" font-family="Inter" font-weight="600" font-size="13" letter-spacing="2.2" fill="{muted}">{steps}</text>',
    ])


def back_content(label, safe_mask):
    x0, y0, x1, y1 = largest_rect(safe_mask)
    rw, rh = x1 - x0, y1 - y0
    s = min(rw / BLOCK_W, rh / BLOCK_H, 1.2)
    ox = x0 + (rw - BLOCK_W * s) / 2
    oy = y0 + (rh - BLOCK_H * s) / 2
    tf = f'transform="translate({ox:.1f},{oy:.1f}) scale({s:.4f})"'
    block = f'<g {tf}>{back_block(label)}</g>'
    foil = f'<g {tf}>{back_block(label, foil=True)}</g>'
    # gold pigeon watermark in the biggest free area left over
    rest = safe_mask.copy()
    pad = 25 * PX
    rest[max(0, int(oy * PX) - pad):int((oy + BLOCK_H * s) * PX) + pad,
         max(0, int(ox * PX) - pad):int((ox + BLOCK_W * s) * PX) + pad] = 0
    dist = cv2.distanceTransform((rest > 0).astype(np.uint8), cv2.DIST_L2, 5)
    r = dist.max() / PX
    wm = ""
    if r > 45:
        cy, cx = np.unravel_index(dist.argmax(), dist.shape)
        hgt = 1.45 * r
        wm = (f'<image href="{ROOT}/assets/logo_gold.png" x="{cx / PX - hgt * 0.83 / 2:.1f}" y="{cy / PX - hgt / 2:.1f}" '
              f'width="{hgt * 0.83:.1f}" height="{hgt:.1f}" opacity=".16"/>')
    print(f"    back block {rw}x{rh} units, scale {s:.2f}, watermark r={r:.0f}")
    return wm + block, foil


def cut_overlay_pdf(pts_list):
    """One page per entry, CutContour spot colour (100 % magenta), 0.25 pt."""
    buf = io.BytesIO()
    w_pt, h_pt = PAGE_W / 10 / 25.4 * 72, PAGE_H / 10 / 25.4 * 72
    c = rl_canvas.Canvas(buf, pagesize=(w_pt, h_pt))
    spot = CMYKColorSep(0, 1, 0, 0, spotName="CutContour", density=1)
    k = w_pt / PAGE_W
    for pts in pts_list:
        c.setStrokeColor(spot)
        c.setLineWidth(0.25)
        p = c.beginPath()
        n = len(pts)
        p.moveTo(pts[0][0] * k, h_pt - pts[0][1] * k)
        for i in range(n):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            p.curveTo(c1[0] * k, h_pt - c1[1] * k, c2[0] * k, h_pt - c2[1] * k, p2[0] * k, h_pt - p2[1] * k)
        p.close()
        c.drawPath(p, stroke=1, fill=0)
        c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def mockup(front, back, path):
    """Front and back side by side on a navy board with a soft shadow."""
    s = 0.5
    f = front.resize((int(front.width * s), int(front.height * s)), Image.LANCZOS)
    b = back.resize((int(back.width * s), int(back.height * s)), Image.LANCZOS)
    pad = 60
    W, H = f.width + b.width + pad * 3, max(f.height, b.height) + pad * 2
    board = Image.new("RGBA", (W, H), (226, 231, 238, 255))
    for img, x in ((f, pad), (b, pad * 2 + f.width)):
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(img.getchannel("A").point(lambda a: int(a * 0.35)))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        board.alpha_composite(sh, (x + 10, pad + 16))
        board.alpha_composite(img, (x, pad))
    board.convert("RGB").save(path, quality=92)


def build(key):
    label, scene = art.SCENES[key]
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        art_g = f'<g transform="translate({MARGIN},{MARGIN})">{scene(str(ROOT / "assets/logo_gold.png"))}</g>'

        alpha = np.array(render_png(art_g, tmp, "alpha").getchannel("A"))
        cut_mask = silhouette(alpha)
        cut_d, cut_pts = mask_to_path(cut_mask)
        back_cut_d, back_pts = mask_to_path(cut_mask, mirror=True)
        bleed_d, _ = mask_to_path(cv2.dilate(cut_mask, disk(BLEED * PX)), mirror=True)
        bleed_d_front, _ = mask_to_path(cv2.dilate(cut_mask, disk(BLEED * PX)))
        safe_mask = cv2.flip(cv2.erode(cut_mask, disk(SAFE * PX)), 1)
        hair_mask = cv2.erode(cut_mask, disk(HAIR * PX))
        hair_d, _ = mask_to_path(hair_mask)
        back_hair_d, _ = mask_to_path(hair_mask, mirror=True)
        hair = f'fill="none" stroke="{art.GOLD}" stroke-width="2.2"'

        front_svg = (f'<path d="{bleed_d_front}" fill="{art.BG}"/>'
                     f'<path d="{hair_d}" {hair}/>{art_g}')
        content, foil = back_content(label, safe_mask)
        back_svg = (f'<path d="{bleed_d}" fill="{art.BG}"/>'
                    f'<path d="{back_hair_d}" {hair}/>{content}')
        foil_svg = (f'<rect width="{PAGE_W}" height="{PAGE_H}" fill="#ffffff"/>'
                    f'<path d="{back_hair_d}" fill="none" stroke="#000000" stroke-width="2.2"/>{foil}')

        # back text must sit inside the safe zone
        txt_alpha = np.array(render_png(content, tmp, "txt").getchannel("A"))
        outside = (txt_alpha > 40) & (safe_mask == 0)
        if outside.any():
            ys, xs = np.where(outside)
            print(f"  ! {key}: back content leaves the safe zone at {outside.sum()} px, "
                  f"x {xs.min() / PX:.0f}-{xs.max() / PX:.0f}, y {ys.min() / PX:.0f}-{ys.max() / PX:.0f}")
        else:
            print(f"  {key}: back content inside the safe zone")

        # previews: clip to the cut, with a hairline to show the knife
        f_png = render_png(f'<clipPath id="c"><path d="{cut_d}"/></clipPath><g clip-path="url(#c)">{front_svg}</g>'
                           , tmp, "front", scale=2)
        b_png = render_png(f'<clipPath id="c"><path d="{back_cut_d}"/></clipPath><g clip-path="url(#c)">{back_svg}</g>',
                           tmp, "back", scale=2)
        f_png.save(OUT / f"{key}_lic.png")
        b_png.save(OUT / f"{key}_rub.png")
        mockup(f_png, b_png, OUT / f"{key}_nahled.jpg")

        # print PDF: vector art + CutContour on top
        writer = PdfWriter()
        cuts = cut_overlay_pdf([cut_pts, back_pts, back_pts])
        for i, (svg, name) in enumerate(((front_svg, "front"), (back_svg, "back"), (foil_svg, "foil"))):
            page = PdfReader(render_pdf(svg, tmp, name)).pages[0]
            page.merge_page(cuts.pages[i])
            writer.add_page(page)
        writer.add_metadata({"/Title": f"HSPG vizitka – {label} (výsek)", "/Author": "HSPG"})
        with open(OUT / f"{key}_tisk.pdf", "wb") as fh:
            writer.write(fh)

        (OUT / f"{key}_vysek.svg").write_text(
            svg_doc(f'<path d="{cut_d}" fill="none" stroke="#ff00ff" stroke-width="2.5" id="CutContour"/>'))
    print(f"  {key}: hotovo -> out/{key}_tisk.pdf")


if __name__ == "__main__":
    keys = sys.argv[1:] or list(art.SCENES)
    for k in keys:
        build(k)
