# Úkol 21: H-WEATHER CONTROL – plánovač termínu s počasím, rychlá rezervace (sleva 10 %), dárkový kupon a kalendář majitele
> Priorita P1 · Závisí na: 00 (pojistka nasazení), 01 (funkce, Blobs, panel majitele / AI centrum), 02 (`submission-created` – sloučit, ne přepsat) · Čeká na majitele: podmínky slevy a kuponu (`content/planovac.json` → `potvrzeno`), kapacita týmu za den, pravidla počasí podle technického listu H-STONE (`content/pocasi-prace.json` → `potvrzeno`), kalendář zakázek v Google + proměnná `HSPG_KALENDAR_ICS_URL` (zadává sám) · Rozsah: hotový otestovaný kód z balíčku (funkce, knihovny, stránky `/planovac/` a `/kupon/`, sekce v AI centru), náhrada funkce `/api/pocasi` (licence), odkazy na plánovač, pravidla akce, zásady. Dvě fáze (A – kód a náhled, B – obsah a produkce).

## Proč (s důkazy)
- **Majitel 4. 10.:** „musí to fungovat dokonale – kalendář, počasí a plánování pro zákazníka; v případě rychlé rezervace v našem plánovači 10 % sleva a dárkový kupon pro sousedy a známé – 1 litr H-STONE impregnace zdarma“. Dále chce počasí „kvůli kalendáři“ – plánovat zakázky podle předpovědi (H-WEATHER CONTROL).
- **Licence počasí – nutná změna:** stávající `/api/pocasi` (stránka `/akce/`, „Suché dny u vás“) vrací `"zdroj":"Open-Meteo.com"` (ověřeno GET 4. 10.). Bezplatné API Open-Meteo je podle podmínek **jen pro nekomerční použití** („Integrating our service into commercial products or promotional activities“ = komerční, https://open-meteo.com/en/terms); komerční tarif stojí od 29 USD/měsíc. **MET Norway** (api.met.no, Norský meteorologický institut) má data pod CC BY 4.0 / NLOD 2.0 – **komerční použití zdarma, bez klíče** (https://api.met.no/doc/License, https://api.met.no/doc/TermsOfService). Podmínky: identifikační User-Agent s kontaktem, respektovat `Expires`/`If-Modified-Since`, souřadnice nejvýš 4 desetinná místa, < 20 požadavků/s, uvést zdroj + odkaz na licenci + že data byla upravena, nepoužívat slovo „Yr“. Česko pokrývá globální model ECMWF (~9 km): hodinově ~2,5 dne, pak po 6 h, celkem **~9 dní**; pro ČR chybí pravděpodobnost srážek a nárazy větru (ověřeno na Kolíně, Praze, Brně, Ostravě, Liberci).
- **Obce bez cizí služby:** seznam obcí a částí obcí ČR z **ČÚZK – RÚIAN** (soubor `ST_UZSZ`, otevřená data CC BY 4.0, komerčně dovoleno, zdroj „ČÚZK, rok“) je přibalený jako `content/obce.json` (6 258 obcí, 9 024 částí obcí, souřadnice WGS84). Geokódování Open-Meteo je také jen nekomerční, Mapy.com zakazují ukládat výsledky (podmínky 4.6.2), Nominatim zakazuje našeptávač a hromadné dotazy – proto lokální seznam (nic neodchází ven, žádný klíč, žádné kredity navíc).
- **Kalendář:** Google Kalendář umí bez OAuth a bez klíčů dvě věci: (1) **tajná adresa iCal** kalendáře (jen čtení, jde resetovat) – server z ní čte obsazenost a místa zakázek; (2) **přihlášení k odběru kalendáře z URL** – Google si stáhne náš kalendář s varováním počasí (obnovuje ho sám zhruba jednou za 8–24 h, interval nejde ovlivnit; aktuální stav je vždy v panelu). Vložený Google kalendář (iframe), který majitel má, vyžaduje veřejný kalendář, nastavuje cookie `NID` (reklama/analytika, 6 měsíců) a posílá IP návštěvníků Googlu → jen po kliknutí a se záznamem v zásadách; plánovač na webu ho **nepotřebuje** (ukazuje volno/obsazeno sám, bez cookies).

## Cíl (měřitelný)
1. `/planovac/` – zákazník zadá obec (našeptávač z lokálního seznamu), uvidí 21 dní: volno/obsazeno (z kalendáře zakázek, bez jakýchkoli detailů), u dnů v dosahu předpovědi srážky, teploty a vítr (jen fakta), vybere termín a náhradní termín, volitelně kód kuponu, odešle rezervaci (Netlify Forms `hspg-rezervace`). Funguje **i bez JavaScriptu** (obyčejný formulář s polem data) a **bez AI**.
2. Sleva 10 % a kupon jsou na stránce, v H-BOT FAQ, v pravidlech akce a v oznámení majiteli u každé rezervace („Sleva: 10 %…“, „Kupon HS-…: PLATNÝ/NEPLATNÝ“). Kupon jde použít jen tolikrát, kolik je na něm (atomicky), a jen jednou na rezervaci.
3. `/api/pocasi` odpovídá **stejným tvarem jako dnes** (stránka `/akce/` beze změny funguje), ale ze zdroje MET Norway; ven odchází jen zaokrouhlená poloha obce.
4. Majitel v AI centru (sekce H-WEATHER CONTROL) vidí pro obec a typ práce 9 dní s hodnocením ✅ vhodné / ⚠️ riziko / ⛔ nevhodné a důvody; přehled zakázek z kalendáře a rezervací z plánovače s hodnocením; odkaz na kalendář s varováním pro Google; vytváří a ruší kupony.
5. Žádný nový neomezený zdroj spotřeby kreditů: veřejné odpovědi drží CDN Netlify (10–30 min, `Netlify-Vary`), předpověď a kalendář mají mezipaměť v Blobs, ověření kuponu má limit 20/h na návštěvníka a 2 000/den celkem.

## Rozsah (ANO / NE výslovně)
ANO: soubory z balíčku (tabulka v kroku 2), sloučení `submission-created` s verzí z úkolu 02, náhrada stávající funkce `pocasi`, odkazy na `/planovac/` (homepage CTA, `/akce/`, patička nebo menu podle úkolu 08), sitemap (`/planovac/` ano; `/kupon/` a `/planovac/dekujeme/` ne, `noindex`), pravidla akce (`/pravidla-akce/`), zásady ochrany osobních údajů (nové účely), testy, náhled, produkce po schválení.
NE: OAuth ani servisní účet Google, zápis do Google Kalendáře, platby online, vlastní SMS brána, rezervace „natvrdo“ (rezervace je **žádost o termín**, potvrzuje ji tým), hodnocení vhodnosti počasí pro zákazníky (jen fakta), vložený Google kalendář bez kliknutí, nové API klíče (Open-Meteo, OpenWeatherMap, Mapy.com…), změna DNS/MX.

## Postup – fáze A (kód a náhled)
1. `git -C ../hspg-balicek pull`, větev `ukol-21-planovac-pocasi` z aktuální `main`.
2. **Převzetí souborů** z `../hspg-balicek/balicek/web/` (cesty uvnitř = cílové cesty ve webHSPGH):

   | Soubor | Co dělá |
   |---|---|
   | `netlify/lib/pocasi/zdroj.mjs` | MET Norway: User-Agent, mezipaměť Blobs `hspg-pocasi` + paměť, `Expires`/`If-Modified-Since`, záloha při výpadku (≤ 6 h) |
   | `netlify/lib/pocasi/vyhodnoceni.mjs` | vyhodnocení dne pro práci (interní) + fakta pro zákazníky (`souhrnDne`) |
   | `netlify/lib/pocasi/ical.mjs` | čtení iCal (včetně opakování DAILY/WEEKLY, EXDATE, RECURRENCE-ID) a výroba kalendáře (RFC 5545) |
   | `netlify/lib/pocasi/obce.mjs` + `content/obce.json` + `scripts/build-obce.mjs` | obec z textu adresy (ulice se zahodí), lokální vyhledání, našeptávač; data ČÚZK |
   | `netlify/lib/planovac/{obsazenost,kupony,rezervace,prehled}.mjs` | obsazenost z kalendáře, kupony, rezervace, přehled pro majitele a tajný odkaz kalendáře |
   | `netlify/functions/planovac.mjs` | `/api/planovac` (veřejné, CDN 10 min) |
   | `netlify/functions/pocasi.mjs` | `/api/pocasi` – **náhrada** stávající funkce, stejné rozhraní |
   | `netlify/functions/kupon.mjs` | `/api/kupon` (ověření veřejně s limitem; vytvoření/seznam/zrušení jen majitel) |
   | `netlify/functions/pocasi-prace.mjs` | `/api/pocasi-prace` (jen majitel) |
   | `netlify/functions/pocasi-kalendar.mjs` | `/api/pocasi-kalendar/<klíč>.ics` (kalendář s varováním pro Google) |
   | `netlify/functions/submission-created.mjs` | **sloučit** s verzí z úkolu 02: přidat `zpracujRezervaci` a volání v handleru (rezervace do Blobs, uplatnění kuponu, text slevy a kuponu do oznámení) |
   | `netlify/lib/ai/limity.mjs` | export `aktualizuj`; paměťové úložiště umí `list`/`delete` (testy) |
   | `content/planovac.json`, `content/pocasi-prace.json` | nabídky, kapacita, horizont; interní pravidla počasí |
   | `content/firma.json` | směrování `hspg-rezervace` → `poptavky` (jen tento klíč) |
   | `content/hbot-faq.json` → `node scripts/build-hbot.mjs` | 3 nové odpovědi (rezervace, kupon, déšť); rychlá otázka „Jak si rezervovat termín?“ |
   | `planovac/index.html`, `planovac/dekujeme/index.html`, `kupon/index.html`, `assets/planovac.{js,css}` | stránky pro zákazníky |
   | `ai-centrum/index.html`, `assets/ai-centrum.{js,css}` | sekce H-WEATHER CONTROL & plánovač |

   Stránky z balíčku mají hlavičku a patičku podle kopie webu ze 4. 10. – **sjednoť je s aktuální `main`** (úkoly 03, 04, 08: patička s kontakty, odkaz Reklamace, jednotné menu). Netlify musí formulář `hspg-rezervace` najít ve statickém HTML (je v `planovac/index.html`); pokud web používá build (úkol 07), ověř, že se stránky kopírují do výstupu.
3. **Stávající funkce `pocasi`:** najdi její zdroj (`git grep -n "Open-Meteo\|open-meteo" netlify/`), porovnej rozhraní (`q`, 400/404, `dny[7]`, `cache-control: public,max-age=1800`) a nahraď ji souborem z balíčku. Starou verzi smaž (v Gitu zůstane). Na `/akce/` doplň pod „Suché dny u vás“ uvedení zdroje: „Na základě dat MET Norway (CC BY 4.0), upraveno“ s odkazy (`zdrojText`/`zdrojOdkaz` v odpovědi) – CC BY to vyžaduje všude, kde se data zobrazují. Úkol 09 krok 10 („počasí jen s obcí“) je tím splněný i na serveru (`obecZTextu` ulici zahodí).
4. **CSP a hlavičky (úkol 15):** stránky volají jen `/api/*` (`connect-src 'self'`), žádný iframe ani externí skript. `/api/pocasi-kalendar/*` musí vracet `text/calendar` (žádné přepsání hlaviček pro `/api/*`).
5. **Odkazy na plánovač:** homepage (vedle hlavní výzvy), `/akce/` („Chcete rovnou termín? Plánovač →“), H-BOT (FAQ), patička nebo menu. Text vždy pravdivý: „Rezervujte termín online – sleva 10 % podle podmínek akce“.
6. **Testy:** v `../hspg-balicek`: `npm test` (unit, včetně `testy/unit/pocasi-planovac.test.mjs`) a `HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta> npm run test:e2e` (včetně `planovac.test.mjs`, `pocasi-panel.test.mjs`). Testy nevolají internet (falešná předpověď a kalendář v `testy/pomocne.mjs`). `node scripts/build-obce.mjs --kontrola` a `node scripts/build-hbot.mjs --kontrola` musí projít.
7. **Náhled zdarma** (`node scripts/nasadit.mjs`) a ověření na adrese náhledu:
   - `curl -sS "<náhled>/api/pocasi?q=Kolín"` → `"zdroj":"MET Norway"`, 7 dní, `cache-control: public,max-age=1800`;
   - `curl -sS "<náhled>/api/planovac?obec=Kolín" | head -c 600` → 21 dní, `kalendar:false` (dokud majitel nenastaví proměnnou), počasí u prvních ~9 dní;
   - `curl -sSI "<náhled>/api/planovac?obec=Kolín"` dvakrát → druhá odpověď z CDN (`cache-status` obsahuje `hit`) – jinak nahlas;
   - `/planovac/` na mobilu 375 px a desktopu, bez JS (DevTools → vypnout JS) jde odeslat;
   - přihlášení do AI centra → H-WEATHER CONTROL → Kolín → 9 dní s hodnocením; „Zobrazit odkaz“ → `curl -sS <odkaz> | head -5` → `BEGIN:VCALENDAR`;
   - **testovací rezervaci** odešli jen se souhlasem majitele a s „TEST“ ve jméně (KONTEXT §4 bod 5) → oznámení obsahuje „Sleva: 10 %“ a stav kuponu.
8. Hlášení fáze A a stop.

## Postup – fáze B (obsah, majitel, produkce)
9. **Majitel – kalendář zakázek** (Claude v Chrome ho provede, úloha C11; hesla ani tajné adresy nikdo jiný nečte ani neopisuje):
   - v Google Kalendáři vytvořit **samostatný** kalendář „HSPG – zakázky“ (ne hlavní – jeho adresa by prozradila e-mail);
   - zakázky zapisovat jako události s **Místem** „Ulice č., PSČ Obec“ nebo „Obec (okres)“ (u obcí se stejným jménem okres povinně – např. Lipová je v 5 okresech); typ práce stačí v názvu („impregnace“, „mytí“, „H-BIO“);
   - Nastavení kalendáře → Integrace kalendáře → **Tajná adresa ve formátu iCal** → zkopírovat a **sám** vložit do Netlify → Project configuration → Environment variables → `HSPG_KALENDAR_ICS_URL` (projeví se po nejbližším nasazení). Adresu nikomu neposílat, při úniku v Googlu „Resetovat“;
   - po nasazení: AI centrum → H-WEATHER CONTROL → „Kalendář s varováním v Google“ → zkopírovat odkaz → Google Kalendář → Další kalendáře → + → **Přidat z URL**.
10. **Vložený Google kalendář (iframe), který majitel má:** na web ho **nevkládej**, dokud majitel výslovně nepotvrdí, že ho chce i přes cookies Googlu. Pokud ano: jen samostatný kalendář s volbou „Zobrazit pouze volno/obsazeno (skrýt podrobnosti)“, nikdy hlavní kalendář; iframe až po kliknutí („Zobrazit obsazenost z Google – Google ukládá cookies“), `frame-src https://calendar.google.com` jen na té stránce, záznam do seznamu cookies (úkol 10) a zásad (úkol 09). Od majitele potřebuješ jen `src` z kódu iframu, ne tajnou adresu.
11. **Podmínky nabídek:** projdi s majitelem `content/planovac.json` → `sleva.podminky` a `kupon.podminky` (místa `[DOPLNIT]`: z čeho se sleva počítá, sčítání slev, minimální cena, forma „1 litr zdarma“, platnost a počet domácností). Po jeho „ano“ nastav `potvrzeno: true`, odstraň `[DOPLNIT]` a podmínky přenes na `/pravidla-akce/` (nové sekce „Sleva 10 % za rychlou rezervaci v plánovači“ a „Dárkový kupon pro sousedy a známé“) – text jen z `planovac.json`. Do té doby stránka ukazuje „Podmínky akce vám potvrdíme v nabídce“.
12. **Pravidla počasí:** `content/pocasi-prace.json` jsou výchozí odhady z technických listů jiných výrobců (zdroje níže). Až majitel dodá technický list H-STONE (a H-BIO, H-CLEAN), porovnej a nastav `potvrzeno: true`. Do té doby panel u hodnocení ukazuje upozornění; zákazník hodnocení nikdy nevidí.
13. **Kapacita:** `kapacitaZakazekNaDen` (výchozí 1) potvrdí majitel.
14. **Zásady ochrany osobních údajů (úkol 09):** nové účely – rezervace termínu (formulář; v Blobs jen termín, obec, služba, kód kuponu, číslo rezervace; smazání 30 dní po termínu), kupony (kód, počet a čas použití, interní poznámka majitele bez kontaktů), plánovač počasí (MET Norway dostává jen zaokrouhlenou polohu obce, žádné osobní údaje), kalendář zakázek v Google Kalendáři majitele (Google jako zpracovatel). Bez iframu Google se nic dalšího nemění.
15. Sloučení do `main` a produkce jen se schválením majitele (`node scripts/nasadit.mjs --produkce --schvaleno "…"`), ideálně v dávce s dalšími úkoly.

## Zdroje výchozích pravidel počasí (`content/pocasi-prace.json`)
Jen interní orientace – **nejsou to údaje H-STONE** (ten technický list nemá zveřejněný) a na web se nepíšou ani se nejmenují cizí výrobky. Čísla ověřena z PDF (pdftotext) 4. 10. 2026:

| Pravidlo | Rozsah v listech | Zdroje |
|---|---|---|
| Teplota vzduchu a podkladu | min. +5 °C (Sika, Mapei, Den Braven, Soudal, Remmers BFA), přísněji +10 °C (Remmers rozpouštědlové, Lithofin), +15 °C (Weber); max. +25 °C (Remmers, Lithofin, Weber) až +35 °C (Sika PDS, Mapei, Soudal) | [Sikagard-703 W](https://nga.sika.com/content/dam/dms/ng01/e/sikagard-703-w.pdf), [Remmers Funcosil SNL](https://media.remmers.com/celum/export/documents/TM_0602_en_GB_86209.pdf), [Mapei Antipluviol](https://industrialcoatingsltd.com/cdn/shop/files/Antipluviol_TDS.pdf), [Den Braven PRIME](https://eshop.zofi.cz/admin/files/ModuleItem/2391/technicky-list-den-braven-prime-impregnace-zdiva-64477fb4b4896.pdf), [Soudal](https://media.hornbach.cz/hb/technicaldatasheet/as.120154229.pdf), [Weber](https://eshop.zofi.cz/admin/files/ModuleItem/979/technicky-list-5dbc20b6f35ff.pdf), [Lithofin Splash-Stop W](https://www.lithofin.com/fileadmin/Downloads/TM/EN/tm_EN_053_LithofinSplashStopW.pdf) |
| Bez deště po nanesení | ~1 h (Remmers krém) · 3 h při +20 °C (Sika 703 W, 706) · 3–4 h (Weber) · 8 h (Lithofin) · 24 h (Soudal, Sikagard Facade ES) – v chladu déle (údaje Sika platí při +20 °C) | viz výše, [Sikagard Facade ES](https://esp.sika.com/dms/getdocument.get/51b327ec-95f9-4e42-b615-971c0b1cb110/sikagard_facade.pdf) |
| Suchý podklad / déšť předem | všechny listy: suchý podklad bez vlhkých míst; po mytí nebo biocidu nechat proschnout **2 dny** (Den Braven), **min. 48 h** (Soudal) | Den Braven, Soudal, [Sikagard-400 (US)](https://usa.sika.com/content/dam/dms/us01/1/sikagard-400-enviroseal.pdf) |
| Mráz | nenanášet na zmrzlý podklad (Den Braven, Soudal); Sika US: ne, pokud do 12 h klesne pod +4 °C | Den Braven, Soudal, Sikagard-400 |
| Vlhkost, mlha | max. 85 % RV (Mapei); ne v mlze (Weber); chránit před kondenzací (Remmers) | Mapei, Weber, Remmers |
| Vítr, slunce | ne ve větru a na přímém slunci / ohřátém povrchu (Mapei, Remmers, Lithofin, Weber) – **žádný list neuvádí číslo**; 8 m/s (nárazy 12) je volba majitele | – |
| Biocid / odstraňovač řas | +5 až +30 °C (Remmers BFA), +5 až +25 °C (Weber), 10–25 °C a ~4 h bez deště (Lithofin ALGEX) | [Remmers BFA](https://media.remmers.com/celum/export/documents/TM_0673_es_ES_187643.pdf), [Weber odstraňovač](https://www.cz.weber/files/cz/2018-03/TL_odstranovac_ras_mechu_a_lisejniku_01.pdf), [Lithofin ALGEX](https://www.lithofin.com/fileadmin/Downloads/TM/EN/tm_EN_032_LithofinALGEX.pdf) |
| Tlakové mytí | žádná čísla výrobců; prakticky: ne v mrazu, a impregnace až po proschnutí (viz výše) | – |

Výchozí hodnoty v `pocasi-prace.json` leží uvnitř těchto rozsahů (impregnace 5–30 °C, 24 h sucho před, 12 h po, mráz 24 h, RV 85 %, vítr 8/12 m/s). Plánovací zásada pro majitele: **impregnaci plánovat nejdřív 48 h po mytí nebo biocidu** (u zakázky „mytí + impregnace“ dva termíny). Přeložené listy mohou obsahovat chyby (český list Mapei vynechal zápor „Ne-“) – rozhoduje originál a technický list H-STONE.

## Akceptační kritéria
- [ ] `npm test` a e2e balíčku proti webHSPGH prošly (uveď počty), `build-obce --kontrola` a `build-hbot --kontrola` OK.
- [ ] `/api/pocasi?q=Kolín` na náhledu: `"zdroj":"MET Norway"`, 7 dní, stejná pole jako dřív (`obec, okres, dny[{datum, srazky, pravdepodobnost, tmin, tmax, vitr, sucho}]`), `/akce/` „Suché dny“ funguje a ukazuje uvedení zdroje.
- [ ] `git grep -n "open-meteo" -- netlify/ assets/ '*.html'` nic nenajde (kromě zásad, pokud tam byl zmíněný – oprav na MET Norway).
- [ ] `/planovac/`: 21 dní, obsazeno/volno, počasí jen jako fakta s uvedením zdroje (MET Norway + ČÚZK), bez JS jde odeslat, axe 0 chyb, 375 px bez vodorovného posunu.
- [ ] Rezervace (TEST, se souhlasem majitele) → oznámení obsahuje termín, „Sleva: 10 %“ a stav kuponu; kupon se započítal jednou.
- [ ] AI centrum → H-WEATHER CONTROL: obec, přehled, odkaz na kalendář (vrací `text/calendar`), kupony vytvořit/zrušit.
- [ ] Druhý stejný požadavek na `/api/planovac` jde z CDN (`cache-status` … `hit`), ověření kuponu po 20 pokusech vrací 429.
- [ ] Pravidla akce a zásady doplněné (nebo `[DOPLNIT]` + hlášení, co chybí od majitele).

## Ověření
Kroky 6, 7 a po produkci totéž na `https://hspg.cz` (jen GET, žádné odesílání formulářů bez souhlasu).

## Bez AI / s AI
Celý úkol je bez AI: plánovač, počasí, kupony i kalendář fungují s `AI_ZAPNUTO=0`. H-BOT odpovídá na „rezervace / kupon / déšť“ z FAQ okamžitě.

## Nepřekročitelná pravidla
KONTEXT §4. Zvlášť: tajná adresa kalendáře jen v proměnné Netlify (nikdy v kódu, logu, chatu ani v odpovědi API – kód ji z chybových hlášek maže); odkaz na kalendář s varováním je tajný (jen v panelu majitele); zákazník nikdy nevidí názvy, místa ani lidi z kalendáře; žádné hodnocení „vhodné pro impregnaci“ pro zákazníky; žádné nové klíče; nabídky jen podle `content/planovac.json`.

## Hlášení po dokončení
Podle KONTEXT §5. Navíc: výstupy `curl` z kroku 7, potvrzení, že stará funkce `pocasi` je pryč, seznam míst, kde je odkaz na plánovač, a pro majitele: „1) Vytvořte kalendář HSPG – zakázky a vložte jeho tajnou adresu iCal do Netlify (HSPG_KALENDAR_ICS_URL). 2) Potvrďte podmínky slevy a kuponu a kapacitu za den. 3) Pošlete technický list H-STONE pro pravidla počasí.“
