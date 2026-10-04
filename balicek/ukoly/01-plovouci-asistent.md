# Úkol 01: Plovoucí asistent „H-SPG CORE · Budoucnost ve Vašich rukách“ (zákazník + majitel)
> Priorita P0 · Závisí na: 00 · Čeká na majitele: heslo `HSPG_PANEL_HESLO` v Netlify · Rozsah: převzetí hotového a otestovaného kódu z `balicek/web/`

## Proč
Majitel chce na webu plovoucí tlačítko, ve kterém AI spolupracují – pro zákazníka jinak a pro majitele jinak –
a web přitom musí být špičkový i **bez AI**. Kód je hotový a otestovaný (42 jednotkových testů, 11 testů
v Chromiu nad kopií živého webu). Nahrazuje dosavadní H-BOT (`/assets/hbot.js` je vložený na 243 stránkách
s `defer`, takže **HTML stránek se měnit nemusí**).

## Co kód dělá
| Pro koho | Chování |
|---|---|
| Zákazník | Rychlé otázky → okamžitá odpověď z ověřených FAQ (bez AI, zdarma). Vlastní otázka → jasná shoda s FAQ odpoví hned; jinak **spolupracující AI**: jedna napíše odpověď jen ze schválených znalostí, druhá (jiný poskytovatel) ji ověří nebo opraví. Zákazník živě vidí „Claude píše odpověď… / Gemini ověřuje fakta…“ a u odpovědi štítek „✓ Odpověď ověřila druhá AI · Claude + Gemini“. Telefony a e-maily z textu se do AI neposílají. Zavolání zpět přes Netlify formulář `hspg-zavolejte`. |
| Bez AI | Žádný klíč / `AI_ZAPNUTO=0` / vyčerpaný rozpočet / limit / chyba / 12 s bez odpovědi → odpoví FAQ nebo nabídne zavolání; po 2 chybách se AI na zbytek návštěvy nevolá. Návštěvník chybu nevidí. |
| Majitel | V panelu „Přihlášení majitele“ (heslo `HSPG_PANEL_HESLO` → podepsaný token na 12 h, 5 chybných pokusů = zámek 15 min). Karta **„Vše ve tvých rukách“**: všechny AI najednou (porovnání vedle sebe) nebo spolupráce (návrh → kontrola pravdivosti → finál), hotové úlohy včetně **„Zkontroluj tuto stránku“**, stav AI, útrata v Kč i v kreditech Netlify, odkaz na velké AI centrum `/ai-centrum/`. |
| Mobil (≤ 760 px) | Spodní lišta má 3 položky: Zavolat · **Zeptat se** · Cena do 24 h. Panel se otevře jako spodní list přes celou šířku nad lištou souhlasu. |
| Výkon | Při načtení stránky jen malý zavaděč (tlačítko + lišta). Panel, styly a znalosti se stáhnou až při najetí / fokusu / dotyku. |

## Mapování souborů (balíček → webHSPGH)
| Z `balicek/web/` | Do webHSPGH | Poznámka |
|---|---|---|
| `assets/hbot.js` | `assets/hbot.js` | **nahrazuje** starý H-BOT |
| `assets/hbot-panel.js`, `hbot-majitel.js`, `ai-klient.js`, `hbot.css`, `hbot-znalosti.json` | `assets/` | nové |
| `ai-centrum/index.html` | `ai-centrum/index.html` | nové, interní (noindex) |
| `netlify/functions/asistent.mjs`, `majitel.mjs`, `ai.mjs`, `ai-stav.mjs` | adresář funkcí webu | nové; `/api/asistent`, `/api/majitel`, `/api/ai`, `/api/ai-stav` |
| `netlify/functions/submission-created.mjs` | adresář funkcí webu | patří k úkolu 02 – zkopíruj teď, nastavení kanálů v úkolu 02 |
| `netlify/lib/ai/*.mjs` | `netlify/lib/ai/` | sdílená knihovna (relativní importy `../lib/ai/…` a `../../../content/…`) |
| `content/firma.json`, `content/hbot-faq.json` | `content/` | nové; `firma.json` = jediný zdroj faktů o firmě pro asistenta |
| `content/ceny.json`, `content/sentinel.json` | — | **nepřepisovat** – ve webHSPGH už jsou (zdroj `assets/ceny.js`). Jen porovnej (`diff`); kopie v balíčku je z živého webu 4. 10. |
| `scripts/build-hbot.mjs` | `scripts/` | generuje `assets/hbot-znalosti.json` z `content/` |

## Postup
1. Větev `ukol-01-plovouci-asistent` z aktuální `main`.
2. Stáhni balíček mimo webHSPGH: `git clone --depth 1 -b claude/peaceful-johnson-juqa6w https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek` (nebo `git -C ../hspg-balicek pull`, pokud už existuje).
3. Najdi v repozitáři: adresář funkcí (`netlify.toml` → `[functions] directory`), build skripty (`scripts/build-ceny.mjs`), `package.json`, `content/`. Pokud je adresář funkcí jiný než `netlify/functions`, uprav relativní importy v převzatých souborech tak, aby `netlify/lib/ai/` a `content/` byly dosažitelné.
4. Zkopíruj soubory podle tabulky. Pokud ve webu už existuje soubor stejného jména (kromě `assets/hbot.js`), **zastav se a slouč ručně** – nic nepřepisuj naslepo.
5. Závislosti do `package.json` webu (pokud chybí): `@anthropic-ai/sdk`, `openai`, `@google/genai`, `@netlify/blobs`, `nodemailer`. `npm install`.
6. Do build příkazu webu přidej `node scripts/build-hbot.mjs` (vedle generování ceníku). Kontrola aktuálnosti: `node scripts/build-hbot.mjs --kontrola`.
7. `netlify.toml`: pro `/ai-centrum/*` hlavičky `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Cache-Control: no-store`. **Nepřidávej** `/ai-centrum/` do `robots.txt` (cestu by to zveřejnilo; stačí noindex).
8. Zkontroluj CSP (`Content-Security-Policy-Report-Only`): `connect-src 'self'` stačí (vše jde přes vlastní `/api/*`).
9. Starý `/api/holub-ai` **odstraň v tomto úkolu** (bezpečnostní audit: veřejný placený endpoint bez ověřitelné ochrany útraty – kdokoli ho může volat a čerpat kredity Netlify, jejichž vyčerpání pozastaví web). Nejdřív `git grep -n "holub-ai"` – kromě starého `assets/hbot.js` (nahrazen) ho nesmí nic volat; pak smaž soubor funkce a případné přesměrování. Nové tlačítko používá `/api/asistent` s limity a rozpočtem; bez AI odpoví FAQ.
10. Proměnné v Netlify (nastaví majitel, ty je jen vypiš do hlášení): `HSPG_PANEL_HESLO` (povinné pro majitele). Volitelné: `AI_ZAPNUTO=0` (vypne AI pro zákazníky), `AI_MESICNI_LIMIT_KC` (výchozí 25 Kč ≈ 190 kreditů – přes AI Gateway se platí kredity Netlify a jejich vyčerpání pozastaví celý web), `ASISTENT_DENNI_LIMIT` (výchozí 40 dotazů/den), `ASISTENT_PORADI` (výchozí `claude,gemini,gpt,grok`), `CLAUDE_MODEL` / `OPENAI_MODEL` / `GEMINI_MODEL` / `XAI_MODEL`. **API klíče nezakládej** – dodává je Netlify AI Gateway.
11. Lokální ověření: `netlify dev` ve webHSPGH (Gateway lokálně nemusí být – asistent pak správně jede bez AI). Testy balíčku proti webu: v `../hspg-balicek` `npm install` a `HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta k Chromiu> npm run test:e2e` (server balíčku servíruje web + nové soubory + falešné AI; nic neodesílá ven).
12. Náhledové nasazení (ne produkce): ověř `GET /api/asistent` → `{"ai":true,"poskytovatele":[…]}`, jednu zákaznickou otázku, přihlášení majitele, „Všechny AI najednou“ s krátkým dotazem. Sleduj kredity (krátké dotazy).
13. Produkční nasazení až po schválení majitelem a v dávce s dalšími úkoly.

## Akceptační kritéria
- [ ] `npm test` i `npm run test:e2e` v balíčku proti webHSPGH: vše prošlo (uveď počty).
- [ ] Na náhledu: `curl -s <náhled>/api/asistent` vrací `ai:true`; při `AI_ZAPNUTO=0` vrací `ai:false` a H-BOT odpovídá z FAQ.
- [ ] Na náhledu zákaznická otázka „Kolik stojí čištění fasády u rodinného domu?“ → odpověď se štítkem „Odpověď ověřila druhá AI“ (nebo „Odpověď AI“, pokud je jen jedna AI).
- [ ] Přihlášení majitele špatným heslem → „Špatné heslo.“; správným → karta „Vše ve tvých rukách“ se stavem AI a kredity.
- [ ] První načtení `/cenik.html` nestahuje `hbot-panel.js` ani nevolá `/api/*` (Network panel nebo e2e test 1).
- [ ] Lighthouse mobil `/cenik.html` a `/`: výkon ani přístupnost neklesly oproti stavu před úkolem (uveď čísla před/po).
- [ ] `/ai-centrum/` vrací `X-Robots-Tag: noindex` a není v sitemap ani robots.txt.
- [ ] Funkce `holub-ai` ve zdroji neexistuje (`git grep -n holub-ai` → nic) a na náhledu `curl -s -o /dev/null -w '%{http_code}' -X POST <náhled>/api/holub-ai` vrací 404.
- [ ] Při výpadku úložiště (test `npm test` v balíčku) veřejná AI nic nevolá a H-BOT odpovídá z FAQ.
- [ ] `git grep -n "HSPG_PANEL_HESLO=" ` a hledání hesel/klíčů v diffu: nic.

## Bez AI / s AI
Bez AI (žádný klíč, Gateway nedostupná, `AI_ZAPNUTO=0`, rozpočet vyčerpán, limit, chyba, timeout 12 s): FAQ, zavolání zpět, poptávka – plná funkčnost. S AI: spolupráce dvou AI pro zákazníka, všech AI pro majitele. Rozpočet: `AI_MESICNI_LIMIT_KC` (odhad podle tokenů, ukládá se v Netlify Blobs `hspg-ai`); po překročení se veřejná AI sama vypne do konce měsíce.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Zvlášť: žádné klíče v kódu, MX neměnit, nic neodesílat do produkčních formulářů bez `TEST`, produkce jen po schválení.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 + seznam převzatých souborů, výsledky testů, čísla Lighthouse před/po, odkaz na náhled, seznam proměnných k nastavení majitelem.
