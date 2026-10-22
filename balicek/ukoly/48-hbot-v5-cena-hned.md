# Úkol 48: H-BOT v5 – zlatý holub, „Cena hned“, PDF kalkulace, NÁVRH smlouvy a porovnání nabídek
> Priorita P1 · Závisí na: 01, 50 (cenové jádro), 52 (`/api/konkurence` – nasadit ve stejné dávce) · Čeká na majitele: advokát (konečné znění smlouvy o dílo, obchodní a reklamační podmínky), potvrzení lhůty 60 dnů (odstoupení při posunu kvůli počasí) a „12 Kč/km za jednu cestu“, doklad k tvrzení o měděném hřebenovém prvku (text v FAQ je do té doby zmírněný), zda se minimum zakázky 4 900 Kč počítá včetně dopravy (dnes ano), nebo jen za práci – viz `balicek/RADA-AI-2026-10-22.md`.

## Co to dělá
- **Vzhled v5 (R18):** plaketa se zlatým 3D origami holubem nad střechou (canvas, žádný robot ani kulaté logo), hejno holubů při otevření, panel Apex. **AI Act čl. 50:** štítek „AI asistent“ a věta o AI v panelu; okamžitou cenu počítá ceník, ne AI.
- **„Cena hned“ (R16):** objekt → povrchy → ochrana (A / B s odstíny RAL / jen čištění) → plochy (m², nebo obvod × výška; obec pro odhad dopravy) → zapečetěná obálka → **orientační cena** přesně z cenového jádra. Bez potvrzeného ceníku žádná částka. Tlačítko „Zobrazit cenu bez animace“, omezení pohybu = bez obálky a hejna.
- **Dokumenty jen v prohlížeči:** PDF „Orientační cenová kalkulace“ a **NÁVRH smlouvy o dílo** (vodoznak NÁVRH, rámeček „není nabídkou podle § 1732 OZ“, čl. 1–10, přílohy). pdfmake je hostovaný u sebe a stáhne se až po kliknutí; údaje do NÁVRHU se nikam neodesílají.
- **Porovnání s jinou nabídkou:** PDF/TXT → text v prohlížeči (pdf.js u sebe, soubor se nenahrává) → `/api/konkurence` → neutrální přehled bodů Standardu HOLUB („uvedeno“ s citací / „v nabídce neuvedeno“). Žádné hodnocení nabídky ani zhotovitele (§ 2980 OZ).
- **Vstupy:** `data-hbot-cena` na libovolném odkazu (bez JS vede dál na `/akce/`), `#cena` v adrese, na mobilu lišta „Zavolat · Zeptat se · Cena hned“. „Plochu neznám – změříme ji na dálku“ → `/holub-360/#h3a-adresa` (úkol 49). „Zavolejte mi k této kalkulaci“ předvyplní souhrn kalkulace (`NK-…`).
- Texty už obsahují závěry rady AI (22. 10. 2026): „orientační“ u každé ceny, „Orientační výpočet, ne nabídka“, „DPH se nepřipočítává“, podmínka SENTINEL BASE hned u záruky, zákonná práva nedotčena.

## Soubory z balíčku
- `assets/`: `hbot.js`, `hbot-panel.js`, `hbot.css`, `hbot-nabidka.js`, `hspg-dokumenty.js`, `hspg-konkurence.js`, `hbot-znalosti.json` (generovaný, úkol 50)
- `assets/vendor/pdfmake/` (0.3.11, MIT; písmo Roboto Apache 2.0) a `assets/vendor/pdfjs/` (6.4.299 legacy, Apache 2.0) – soubory LICENSE a README ponechat
- `netlify/lib/pocasi/obce.mjs` (návrhy obcí se souřadnicemi pro odhad dopravy)
- Testy: e2e `hbot.test.mjs`, `hbot-kalkulace.test.mjs`; unit `dokumenty.test.mjs`; zástupce webu `testy/fixtures/web/` (bez `HSPG_MIRROR`)

## Postup
1. Větev `ukol-48-hbot-v5`. Přenes soubory (nahrazují H-BOT z úkolů 01/25; rozhraní `window.HSPG_HBOT_ZAVADEC` a `window.HSPG_HBOT` zůstává).
2. Na stránkách s cenou (ceník, služby, homepage) přidej `data-hbot-cena` k odkazům „Cena / Kalkulace / Nezávazná cena“ na `/akce/` – odkaz zůstává jako záloha bez JS.
3. Hlavičky: `/assets/vendor/*` `Cache-Control: public, max-age=31536000, immutable`. CSP: pdfmake ani pdf.js nepotřebují `unsafe-eval` (pdf.js běží s `isEvalSupported:false`, worker ze stejného původu). Na náhledu ověř stažení obou PDF s vynucenou CSP z úkolu 15.
4. Měření (úkol 10): `dataLayer` dostává jen názvy kroků a počty (`hbot_kalkulace`, `hbot_konkurence`) – nikdy obec, plochy ani kontakty.
5. A/B testy z rady (GPT) až po úkolu 10: „Cena hned“ vs. „Spočítat orientační cenu“; obálka vs. okamžitý rozpis.

## Akceptace
- [ ] `npm test` + `npm run test:e2e` (hbot, hbot-kalkulace) zelené – na zástupci i na kopii webu (`HSPG_MIRROR`).
- [ ] Cena v obálce = `HSPGCena.spocitej` (test); bez potvrzeného ceníku žádné Kč; PDF kalkulace obsahuje cenu, „není nabídkou ve smyslu § 1732“ a větu o biocidech; NÁVRH má vodoznak, zaškrtávací pole v čl. 8 a ČOI v čl. 9.
- [ ] Bez kliknutí na H-BOT se nestahuje nic z kalkulace; pdfmake a pdf.js až po kliknutí na PDF / porovnání (Lighthouse: žádný nárůst JS při načtení stránky).
- [ ] Mobil 390 × 844 a 375: panel přes celou šířku, bez vodorovného posunu, axe bez vážných chyb; prefers-reduced-motion bez obálky a hejna.
- [ ] Porovnání: 11. kontrola za hodinu z jedné IP → 429; text nabídky se neukládá ani neloguje.
- [ ] **Před produkcí:** majitel jednou větou potvrdil ceník od 1. 10. 2026 (citace v hlášení) – jinak v `content/cenik-potvrzeni.json` smaž `datum` (ceny, sazby ani slevy se pak neukážou).
- [ ] Hlášení se snímky (desktop + mobil: plaketa, panel, obálka, výsledek, PDF) a stop.
