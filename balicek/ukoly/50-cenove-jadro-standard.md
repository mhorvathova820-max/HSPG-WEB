# Úkol 50: Cenové jádro, Standard HOLUB, péče SENTINEL a stránka `/standard-holub/`
> Priorita P1 · Závisí na: 00; 05 (záruka z jednoho místa) a 08 (šablona hlavičky) ideálně dřív – když ještě nejsou, 50 přinese data záruky sám a hlavičku převezme z `/planovac/` · Čeká na majitele: nic nového (R15, R16 rozhodnuto 22. 10. 2026); konečné znění záruky ověří advokát (KONTEXT „Čeká na majitele“).

## Co to dělá
- **Jedno cenové jádro** `assets/hspg-cena.js` pro H-BOT (48), HOLUB 360 (49), PDF (48) a Pas domu (51). Čísla jen z `content/ceny.json`; částka se ukáže jen s potvrzeným ceníkem (`content/cenik-potvrzeni.json`, pravidlo úkolu 27). Jádro čte `assets/hspg-cenik.json` (jeden požadavek), záložně `/content/*.json`.
- **Standard HOLUB (R15):** 5 kroků (01 Čištění, 02 Odmaštění, 03 Ošetření biocidy, 04 Oplach, 05 Ochranná vrstva), cesta A (2× H-STONE) / B (barevná renovace v odstínu RAL/NCS) – jediný zdroj `content/standard.json`.
- **Péče SENTINEL (R15):** BASE 499 / PLUS 2 490 / PRESTIGE 5 890 Kč ročně, BASE = podmínka trvání záruky 10 let; text podmínky jen v `content/sentinel.json` (úkol 05).
- **Tokeny Apex (R18):** `assets/apex-tokens.css` – jen proměnné a třídy `apex-*`, stávající vzhled webu se nemění.
- **Nová stránka `/standard-holub/`** generovaná z dat (`scripts/stranka-standard.mjs`, **needitovat ručně**) + `assets/standard-holub.css` (`sh-*`). Funguje bez JS; tlačítka „Spočítat cenu hned“ otevřou kalkulaci H-BOTa (`data-hbot-cena`), bez JS vedou na `/akce/`.
- Generované soubory: `assets/hbot-znalosti.json`, `assets/hspg-cenik.json`, `standard-holub/index.html` – `node scripts/build-hbot.mjs`; `--kontrola` patří do CI (úkol 19).

## Soubory z balíčku (`balicek/web/` → kořen webHSPGH)
| Soubor | Poznámka |
|---|---|
| `content/standard.json`, `sentinel.json`, `cenik-potvrzeni.json` | nové / přepsat |
| `content/ceny.json`, `firma.json` (`zaruka`), `pocasi-prace.json`, `hbot-faq.json` | **sloučit** se stávajícími podle diffu balíčku (Skip Pay vypnuto, souřadnice základen, technologické okno R17) |
| `assets/hspg-cena.js`, `apex-tokens.css`, `standard-holub.css` | nové |
| `assets/hspg-cenik.json`, `hbot-znalosti.json`, `standard-holub/index.html` | generované |
| `scripts/build-hbot.mjs`, `scripts/stranka-standard.mjs` | build |
| `netlify/lib/ai/znalosti.mjs` | odpovědi „Jaký je postup?“ a „Jak funguje trvalá péče?“ |

## Postup
1. Větev `ukol-50-standard`. Přenes soubory; `content/*.json` slučuj, nepřepisuj naslepo (`git -C ../hspg-balicek diff a7ca530~1 -- balicek/web/content`).
2. `node scripts/build-hbot.mjs`, pak `node scripts/build-hbot.mjs --kontrola` (musí projít).
3. Hlavička a patička `/standard-holub/` podle šablony webu (úkol 08): generátor má kopii z `/planovac/`. Když šablonu měníš, uprav `scripts/stranka-standard.mjs`, ne vygenerované HTML.
4. `sitemap.xml` + `/standard-holub/`; odkaz z ceníku, z patičky (Služby) a z FAQ H-BOTa (už v datech).
5. Kontrola tvrzení (úkol 13): žádné „certifikovaný“, „oborový standard“, „nejlepší“, žádná značka biocidu; u biocidů věta z `standard.json`.

## Akceptace
- [ ] `npm test` (unit `cena`, `cenik-prohlizec`, `stranka-standard`) a e2e `standard-holub.test.mjs` zelené; `build-hbot --kontrola` OK.
- [ ] Bez potvrzeného ceníku stránka ani jádro neukážou žádné Kč/m² (test).
- [ ] U každé zmínky „10 let“ je ve stejném bloku podmínka SENTINEL BASE a „Zákonná práva z vadného plnění tím nejsou dotčena.“
- [ ] Rich Results Test: HowTo a BreadcrumbList bez chyb; Lighthouse mobil LCP ≤ 2,5 s, přístupnost bez chyb; 390 × 844 bez vodorovného posunu (snímky do hlášení).
- [ ] Hlášení podle KONTEXT §5 a stop.
