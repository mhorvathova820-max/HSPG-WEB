// Render an HTML file to a transparent PNG or a vector PDF with Chromium.
// Usage:
//   node render.cjs png <in.html> <out.png> <widthPx> <heightPx> <scale>
//   node render.cjs pdf <in.html> <out.pdf> <widthMm> <heightMm>
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {

const [mode, input, output, w, h, scale = '1'] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  if (mode === 'png') {
    const page = await browser.newPage({
      viewport: { width: Number(w), height: Number(h) },
      deviceScaleFactor: Number(scale),
    });
    await page.goto(pathToFileURL(resolve(input)).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: output, omitBackground: true });
  } else if (mode === 'pdf') {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(input)).href);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: output, width: `${w}mm`, height: `${h}mm`, printBackground: true, pageRanges: '' });
  } else {
    throw new Error(`unknown mode ${mode}`);
  }
} finally {
  await browser.close();
}
})().catch((err) => { console.error(err); process.exit(1); });
