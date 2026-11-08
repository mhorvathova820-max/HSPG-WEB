"""Build the HSPG couture cards (crest die-cut, gold foil).

Run from marketing/vizitky:  python3 src/build.py [strecha fasada dlazba]

Per variant it writes to out/:
  <key>_tisk.pdf     4 pages: front, back, front foil mask, back foil mask;
                     vector art + CutContour spot line on every page
  <key>_vysek.svg    cut line only (mm units, same page as the PDF)
  <key>_lic.png / <key>_rub.png   previews, <key>_nahled.jpg  mock-up
Requires: Node.js + Playwright (Chromium), Python: numpy, Pillow,
opencv-python-headless, segno, reportlab, pypdf.
"""
import io
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageFilter
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import CMYKColorSep
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import art  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
RENDER = ROOT / "src" / "render.cjs"

MARGIN = 80
PAGE_W, PAGE_H = art.W + 2 * MARGIN, art.H + 2 * MARGIN
BLEED = 20

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
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PAGE_W} {PAGE_H}" {size}>'
            f'<g transform="translate({MARGIN},{MARGIN})">{inner}</g></svg>')


def render_png(inner, tmp, name, scale=2, bg="transparent"):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(inner, size_mm=False), bg))
    png = tmp / f"{name}.png"
    subprocess.run(["node", str(RENDER), "png", str(html), str(png), str(PAGE_W), str(PAGE_H), str(scale)], check=True)
    return Image.open(png)


def render_pdf(inner, tmp, name):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(inner)))
    pdf = tmp / f"{name}.pdf"
    subprocess.run(["node", str(RENDER), "pdf", str(html), str(pdf), str(PAGE_W / 10), str(PAGE_H / 10)], check=True)
    return pdf


def cut_overlay_pdf(segs, pages):
    """CutContour spot colour (100 % magenta), 0.25 pt, on `pages` pages."""
    buf = io.BytesIO()
    w_pt, h_pt = PAGE_W / 10 / 25.4 * 72, PAGE_H / 10 / 25.4 * 72
    c = rl_canvas.Canvas(buf, pagesize=(w_pt, h_pt))
    spot = CMYKColorSep(0, 1, 0, 0, spotName="CutContour", density=1)
    k = w_pt / PAGE_W

    def P(p):
        return (p[0] + MARGIN) * k, h_pt - (p[1] + MARGIN) * k

    for _ in range(pages):
        c.setStrokeColor(spot)
        c.setLineWidth(0.25)
        p = c.beginPath()
        for s in segs:
            if s[0] == "M":
                p.moveTo(*P(s[1]))
            elif s[0] == "L":
                p.lineTo(*P(s[1]))
            elif s[0] == "C":
                p.curveTo(*P(s[1]), *P(s[2]), *P(s[3]))
            else:
                p.close()
        c.drawPath(p, stroke=1, fill=0)
        c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def mockup(front, back, path):
    s = 0.5
    f = front.resize((int(front.width * s), int(front.height * s)), Image.LANCZOS)
    b = back.resize((int(back.width * s), int(back.height * s)), Image.LANCZOS)
    pad = 50
    W, H = f.width + b.width + pad * 3, max(f.height, b.height) + pad * 2
    board = Image.new("RGBA", (W, H), (232, 226, 213, 255))
    for img, x in ((f, pad), (b, pad * 2 + f.width)):
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(img.getchannel("A").point(lambda a: int(a * 0.4)))
        sh = sh.filter(ImageFilter.GaussianBlur(16))
        board.alpha_composite(sh, (x + 8, pad + 18))
        board.alpha_composite(img, (x, pad))
    board.convert("RGB").save(path, quality=93)


def build(key):
    label = art.VARIANTS[key][0].title()
    OUT.mkdir(exist_ok=True)
    cut = art.shape(0)
    cut_d = art.segs_to_svg(cut)
    bleed_d = art.segs_to_svg(art.shape(-BLEED))
    card = f'<path d="{bleed_d}" fill="{art.BG}"/>'
    white = f'<path d="{bleed_d}" fill="#ffffff"/>'
    faces = {
        "front": card + art.front(key),
        "back": card + art.back(key),
        "foil_front": white + art.front(key, foil=True),
        "foil_back": white + art.back(key, foil=True),
    }
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        clip = f'<clipPath id="c"><path d="{cut_d}"/></clipPath>'
        f_png = render_png(f'{clip}<g clip-path="url(#c)">{faces["front"]}</g>', tmp, "front")
        b_png = render_png(f'{clip}<g clip-path="url(#c)">{faces["back"]}</g>', tmp, "back")
        f_png.save(OUT / f"{key}_lic.png")
        b_png.save(OUT / f"{key}_rub.png")
        mockup(f_png, b_png, OUT / f"{key}_nahled.jpg")

        writer = PdfWriter()
        cuts = cut_overlay_pdf(cut, 4)
        for i, name in enumerate(("front", "back", "foil_front", "foil_back")):
            page = PdfReader(render_pdf(faces[name], tmp, name)).pages[0]
            page.merge_page(cuts.pages[i])
            writer.add_page(page)
        writer.add_metadata({"/Title": f"HSPG vizitka – {label}", "/Author": "HSPG"})
        with open(OUT / f"{key}_tisk.pdf", "wb") as fh:
            writer.write(fh)
    (OUT / f"{key}_vysek.svg").write_text(
        svg_doc(f'<path d="{cut_d}" fill="none" stroke="#ff00ff" stroke-width="2.5" id="CutContour"/>'))
    print(f"  {key}: hotovo -> out/{key}_tisk.pdf")


if __name__ == "__main__":
    keys = sys.argv[1:] or list(art.VARIANTS)
    for k in keys:
        build(k)
