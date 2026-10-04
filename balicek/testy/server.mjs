// Testovací server: kopie živého webu (HSPG_MIRROR) + soubory balíčku + /api/* s falešnými AI.
// Nic se neposílá ven, žádná AI se skutečně nevolá. Použití:
//   HSPG_MIRROR=/cesta/k/mirror/hspg.cz node balicek/testy/server.mjs   (ruční prohlížení na :8787)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { vytvorAsistenta } from "../web/netlify/functions/asistent.mjs";
import { vytvorPrihlaseni } from "../web/netlify/functions/majitel.mjs";
import { vytvorAI } from "../web/netlify/functions/ai.mjs";
import { vytvorStav } from "../web/netlify/functions/ai-stav.mjs";
import { env as testEnv, falesnyAdapter, pametoveUloziste, HESLO } from "./pomocne.mjs";

const BALICEK = fileURLToPath(new URL("../web/", import.meta.url));
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

async function existuje(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

// rezim: "ai" (spolupráce funguje) | "bez-ai" (žádné klíče) | "chyba" (AI padají)
// zaseknout: { "METODA /cesta": [content-type, začátek těla] } – pošle hlavičky a začátek těla a dál nic
// (simulace visícího spojení pro testy časových limitů v prohlížeči).
export async function spustServer({ rezim = "ai", port = 0, mirror = process.env.HSPG_MIRROR, zaseknout = {} } = {}) {
  if (!mirror) throw new Error("Nastav HSPG_MIRROR na složku s kopií webu (wget --mirror https://hspg.cz).");
  const e = rezim === "bez-ai" ? { HSPG_PANEL_HESLO: HESLO } : testEnv();
  const ul = pametoveUloziste();
  const pomale = (text) => falesnyAdapter({ text, zpozdeni: 15 });
  const adaptery = rezim === "chyba"
    ? { claude: falesnyAdapter({ chyba: "down" }), gemini: falesnyAdapter({ chyba: "down" }), gpt: falesnyAdapter({ chyba: "down" }), grok: falesnyAdapter({ chyba: "down" }) }
    : {
        claude: falesnyAdapter({
          text: (p) => (p.zpravy[0].text.includes("NÁVRH ODPOVĚDI") ? '{"ok": true, "odpoved": ""}' : "Čištění střechy začíná od 99 Kč/m². Přesnou cenu spočítáme z mapy do 24 hodin – stačí poslat adresu na hspg.cz/akce/ nebo zavolat +420 736 618 486."),
        }),
        gemini: falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' }),
        gpt: pomale("Návrh od ChatGPT: Dobrý den, děkujeme za poptávku."),
        grok: pomale("Grok"),
      };
  // Ve streamu interních volání ať odpovídá každá AI jinak, ať je vidět, kdo co napsal.
  for (const [id, a] of Object.entries(adaptery)) {
    const puvodni = a.stream;
    if (rezim !== "chyba") a.stream = async function* (p) { let prvni = true; for await (const x of puvodni.call(a, { ...p })) { if (x.text && prvni) { prvni = false; yield { text: `[${id}] ${x.text}` }; } else yield x; } };
  }
  const api = {
    "/api/asistent": vytvorAsistenta({ env: e, adaptery, uloziste: ul }),
    "/api/majitel": vytvorPrihlaseni({ env: e, uloziste: ul, zdrzeniMs: 0 }),
    "/api/ai": vytvorAI({ env: e, adaptery, uloziste: ul }),
    "/api/ai-stav": vytvorStav({ env: e, uloziste: ul }),
  };
  const formulare = [];

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const telo = await new Promise((ok) => { const c = []; req.on("data", (x) => c.push(x)); req.on("end", () => ok(Buffer.concat(c))); });
      const zasek = zaseknout[`${req.method} ${url.pathname}`];
      if (zasek) {
        res.writeHead(200, { "content-type": zasek[0], "cache-control": "no-store" });
        res.write(zasek[1]);
        return; // spojení zůstane otevřené bez konce těla
      }
      if (api[url.pathname]) {
        const r = await api[url.pathname](new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : telo }), { ip: "127.0.0.1" });
        res.writeHead(r.status, Object.fromEntries(r.headers));
        if (r.body) for await (const kus of r.body) res.write(kus);
        return res.end();
      }
      if (req.method === "POST" && url.pathname === "/") {
        formulare.push(Object.fromEntries(new URLSearchParams(telo.toString())));
        res.writeHead(200, { "content-type": "text/html" });
        return res.end("ok");
      }
      let cesta = decodeURIComponent(url.pathname);
      if (cesta.endsWith("/")) cesta += "index.html";
      const kandidati = [join(BALICEK, normalize(cesta)), join(mirror, normalize(cesta)), join(mirror, normalize(cesta) + ".html")];
      for (const k of kandidati) {
        if (!k.startsWith(BALICEK) && !k.startsWith(mirror)) continue;
        if (await existuje(k)) {
          res.writeHead(200, { "content-type": TYPY[extname(k)] || "application/octet-stream" });
          return res.end(await readFile(k));
        }
      }
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("404");
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  await new Promise((ok) => server.listen(port, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, formulare, zavri: () => new Promise((ok) => { server.close(ok); server.closeAllConnections?.(); }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await spustServer({ port: 8787, rezim: process.env.REZIM || "ai" });
  console.log(`Testovací web: ${s.url} (heslo majitele: ${HESLO})`);
}
