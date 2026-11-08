"""Build the HSPG folding card ("Vila", gate-fold triptych).

Run from marketing/vizitky:  python3 src/build.py

Writes to out/:
  vila_tisk.pdf      4 pages: side A (outside), side B (inside), foil mask A,
                     foil mask B; CutContour and Crease spot lines on every page
  vila_vysek.svg     cut and crease lines only
  vila_zavreno.png   closed card, front      vila_rub.png   back cover
  vila_otevreno.png  open spread             vila_nahled.jpg  mock-up
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
BLEED = 20

FONTS = f"""
@font-face{{font-family:'Playfair Display';src:url('{ROOT}/assets/fonts/PlayfairDisplay.ttf');font-weight:400 900}}
@font-face{{font-family:'Playfair Display';font-style:italic;src:url('{ROOT}/assets/fonts/PlayfairDisplay-Italic.ttf');font-weight:400 900}}
@font-face{{font-family:'Inter';src:url('{ROOT}/assets/fonts/Inter-SemiBold.otf');font-weight:600}}
@font-face{{font-family:'Inter';src:url('{ROOT}/assets/fonts/Inter-Bold.otf');font-weight:700}}
"""


def html_page(svg, pw, ph):
    return (f"<!doctype html><html><head><meta charset='utf-8'><style>{FONTS}"
            f"@page{{size:{pw / 10}mm {ph / 10}mm;margin:0}}"
            f"html,body{{margin:0;padding:0;background:transparent}}svg{{display:block}}</style></head>"
            f"<body>{svg}</body></html>")


def svg_doc(inner, w, h, size_mm=True):
    pw, ph = w + 2 * MARGIN, h + 2 * MARGIN
    size = f'width="{pw / 10}mm" height="{ph / 10}mm"' if size_mm else f'width="{pw}" height="{ph}"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {pw} {ph}" {size}>'
            f'<g transform="translate({MARGIN},{MARGIN})">{inner}</g></svg>')


def render_png(inner, w, h, tmp, name, scale=2):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(inner, w, h, size_mm=False), w + 2 * MARGIN, h + 2 * MARGIN))
    png = tmp / f"{name}.png"
    subprocess.run(["node", str(RENDER), "png", str(html), str(png), str(w + 2 * MARGIN), str(h + 2 * MARGIN), str(scale)], check=True)
    return Image.open(png)


def render_pdf(inner, w, h, tmp, name):
    html = tmp / f"{name}.html"
    html.write_text(html_page(svg_doc(inner, w, h), w + 2 * MARGIN, h + 2 * MARGIN))
    pdf = tmp / f"{name}.pdf"
    subprocess.run(["node", str(RENDER), "pdf", str(html), str(pdf), str((w + 2 * MARGIN) / 10), str((h + 2 * MARGIN) / 10)], check=True)
    return pdf


def overlay_pdf(cut_segs, creases, w, h, pages):
    """CutContour (magenta, solid) and Crease (cyan, dashed) spot lines."""
    buf = io.BytesIO()
    pw, ph = w + 2 * MARGIN, h + 2 * MARGIN
    w_pt, h_pt = pw / 10 / 25.4 * 72, ph / 10 / 25.4 * 72
    c = rl_canvas.Canvas(buf, pagesize=(w_pt, h_pt))
    cut = CMYKColorSep(0, 1, 0, 0, spotName="CutContour", density=1)
    crease = CMYKColorSep(1, 0, 0, 0, spotName="Crease", density=1)
    k = w_pt / pw

    def P(p):
        return (p[0] + MARGIN) * k, h_pt - (p[1] + MARGIN) * k

    for _ in range(pages):
        c.setStrokeColor(cut)
        c.setLineWidth(0.25)
        c.setDash([])
        p = c.beginPath()
        for s in cut_segs:
            if s[0] == "M":
                p.moveTo(*P(s[1]))
            elif s[0] == "L":
                p.lineTo(*P(s[1]))
            elif s[0] == "C":
                p.curveTo(*P(s[1]), *P(s[2]), *P(s[3]))
            else:
                p.close()
        c.drawPath(p, stroke=1, fill=0)
        c.setStrokeColor(crease)
        c.setDash([4, 3])
        for x in creases:
            c.line(*P((x, 0)), *P((x, h)))
        c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def mockup(closed, back, spread, path):
    s = 0.5
    cl = closed.resize((int(closed.width * s), int(closed.height * s)), Image.LANCZOS)
    bk = back.resize((int(back.width * s), int(back.height * s)), Image.LANCZOS)
    sp = spread.resize((int(spread.width * s), int(spread.height * s)), Image.LANCZOS)
    pad = 50
    W = max(cl.width + bk.width + pad * 3, sp.width + pad * 2)
    H = cl.height + sp.height + pad * 3
    board = Image.new("RGBA", (W, H), (232, 226, 213, 255))
    x0 = (W - cl.width - bk.width - pad) // 2
    for img, x, y in ((cl, x0, pad), (bk, x0 + cl.width + pad, pad), (sp, (W - sp.width) // 2, pad * 2 + cl.height)):
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(img.getchannel("A").point(lambda a: int(a * 0.4)))
        sh = sh.filter(ImageFilter.GaussianBlur(16))
        board.alpha_composite(sh, (x + 8, y + 18))
        board.alpha_composite(img, (x, y))
    board.convert("RGB").save(path, quality=93)


def main():
    OUT.mkdir(exist_ok=True)
    W, H = art.FW, art.PH
    cut = art.shape(art.FLAT, art.FLAT_R, 0)
    cut_d = art.segs_to_svg(cut)
    bleed_d = art.segs_to_svg(art.shape(art.FLAT, art.FLAT_R, -BLEED))
    card = f'<path d="{bleed_d}" fill="{art.BG}"/>'
    white = f'<path d="{bleed_d}" fill="#ffffff"/>'
    # side B is the reverse of the sheet, drawn as seen from its own side (no mirroring):
    # the outline is symmetric, the printer turns the sheet
    faces = {
        "A": card + art.side_a(),
        "B": card + art.side_b(),
        "foilA": white + art.side_a(foil=True),
        "foilB": white + art.side_b(foil=True),
    }
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        clip = f'<clipPath id="c"><path d="{cut_d}"/></clipPath>'
        # previews
        crest = art.segs_to_svg(art.shape(*art.CREST, 0))
        crest_bleed = art.segs_to_svg(art.shape(*art.CREST, -BLEED))
        cclip = f'<clipPath id="cc"><path d="{crest}"/></clipPath>'
        closed = render_png(f'{cclip}<g clip-path="url(#cc)"><path d="{crest_bleed}" fill="{art.BG}"/>{art.closed_preview()}</g>'
                            f'<path d="M{art.DW},0 V{H}" stroke="#000" stroke-width="1.2" opacity=".55"/>', art.PW, H, tmp, "closed")
        back = render_png(f'{cclip}<g clip-path="url(#cc)"><path d="{crest_bleed}" fill="{art.BG}"/>{art.back_cover()}'
                          f'{art.frame(art.CREST)}</g>', art.PW, H, tmp, "back")
        spread = render_png(f'{clip}<g clip-path="url(#c)">{faces["B"]}</g>'
                            f'<path d="M{art.DW},0 V{H} M{art.PW + art.DW},0 V{H}" stroke="#000" stroke-width="1" opacity=".35"/>',
                            W, H, tmp, "spread")
        closed.save(OUT / "vila_zavreno.png")
        back.save(OUT / "vila_rub.png")
        spread.save(OUT / "vila_otevreno.png")
        mockup(closed, back, spread, OUT / "vila_nahled.jpg")

        writer = PdfWriter()
        cuts = overlay_pdf(cut, [art.DW, art.PW + art.DW], W, H, 4)
        for i, name in enumerate(("A", "B", "foilA", "foilB")):
            page = PdfReader(render_pdf(faces[name], W, H, tmp, name)).pages[0]
            page.merge_page(cuts.pages[i])
            writer.add_page(page)
        writer.add_metadata({"/Title": "HSPG – skládaná vizitka Vila", "/Author": "HSPG"})
        with open(OUT / "vila_tisk.pdf", "wb") as fh:
            writer.write(fh)
    (OUT / "vila_vysek.svg").write_text(svg_doc(
        f'<path d="{cut_d}" fill="none" stroke="#ff00ff" stroke-width="2.5" id="CutContour"/>'
        f'<path d="M{art.DW},0 V{H} M{art.PW + art.DW},0 V{H}" fill="none" stroke="#00aaff" stroke-width="2" stroke-dasharray="8 6" id="Crease"/>',
        W, H))
    print("  hotovo -> out/vila_tisk.pdf")


if __name__ == "__main__":
    main()
