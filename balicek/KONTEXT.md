# KONTEXT – fakta, rozhodnutí a pravidla pro všechny úkoly

Tento soubor čte agent (VS Code Claude Code) před KAŽDÝM úkolem. Je to jediný zdroj pravdy o stavu
webu a o rozhodnutích majitele. Co tu není potvrzené, se na web nepíše.

## 1. Kde je co
| Co | Kde |
|---|---|
| Zdroj webu hspg.cz | lokální složka **webHSPGH** (větev `main`) na počítači majitele |
| Produkce | Netlify projekt **tourmaline-dasik-9de005** → https://hspg.cz (nasazováno ručně přes API, bez Gitu) |
| Netlify funkce na produkci | `facebook-webhook`, `holub-ai`, `pocasi`, `rd-stav`, `sentinel-validate` |
| Tento balíček | repozitář `mhorvathova820-max/HSPG-WEB`, větev `claude/peaceful-johnson-juqa6w`, složka `balicek/` |
| Hotový kód k převzetí | `balicek/web/` – cesty uvnitř odpovídají cílovým cestám ve webHSPGH |
| Testy balíčku | `balicek/testy/` (`npm test`, `npm run test:e2e`) |

## 2. Fakta ověřená k 4. 10. 2026
- **Provozovatel:** Dušan Holub, OSVČ (ne s.r.o.), IČO 09291881, neplátce DPH. Značka HOLUB – HSPG (Holub Surface Protection Group). Telefon +420 736 618 486, pracovní doba Po–So 7:00–19:00.
- **Záruka:** H-STONE **10 let** – potvrdil majitel (HSPG_MASTER_CONTEXT v1.1). Podmínka: technická kontrola alespoň jednou za 24 měsíců (v tarifu SENTINEL START zdarma). Text záruky smí být jen na jednom centrálním místě (data), stránky ho přebírají. Údaj „15 let“ je zastaralý – nikde nepoužívat.
- **E-maily:** schránky @hspg.cz běží na **Seznam Email Profi** a fungují (DKIM szn1, SPF i DMARC pass). `info@`, `poptavky@`, `reklamace@`, `spoluprace@`, `podpora@` doručují do stejné schránky a jsou ověřené i jako odesílatel. Web může přejít z `profiserv@seznam.cz` na adresy @hspg.cz; `profiserv@seznam.cz` zůstává jako záložní kopie.
- **DNS (Wedos):** MX → Seznam, SPF `include:spf.seznam.cz`, DMARC `p=none`, `www` → CNAME Netlify. **MX NEMĚNIT** (na Wedosu je jen DNS; změna MX by rozbila funkční poštu).
- **Poptávky:** Netlify Forms (`hspg-poptavka`, `hspg-zavolejte`, `hspg-akce`, `hspg-recenze`, `hspg-fotky`). Oznámení z Netlify chodí na `profiserv@seznam.cz` i `info@hspg.cz` a **dorazila** (předmět „Form submission from hspg-… form“) – majitel je přehlédl mezi 2 710 nepřečtenými. Problém = viditelnost, ne doručení. Všech 8 dosavadních odeslání vypadá jako testy.
- **AI na webu:** `/api/holub-ai` běží přes **Netlify AI Gateway** – Netlify sám vkládá do funkcí `ANTHROPIC_API_KEY`/`ANTHROPIC_BASE_URL`, `OPENAI_API_KEY`/`OPENAI_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_BASE_URL`, `OPENROUTER_API_KEY`/`OPENROUTER_BASE_URL` a účtuje v **kreditech Netlify** (1 USD = 180 kreditů). Vlastní klíč nastavený v Netlify má přednost. Gateway **nepředává hlavičky požadavků** (beta funkce nefungují), max. 200k vstupních tokenů. Nové klíče Gemini/xAI/OpenWeatherMap **nezakládat**. Počasí: web odkazuje na open-meteo.com – ověř ve zdroji funkce `pocasi`.
- **Kredity Netlify = riziko výpadku celého webu.** Tarif Personal: 1 000 kreditů / období (11. 9.–10. 10.), zbývalo 426. Spotřeba: 32 produkčních nasazení × 15 = 480, přenos dat 77,9, požadavky 8,7, AI 7,1. Auto-recharge vypnuté. **Po vyčerpání kreditů Netlify pozastaví projekty týmu** („Site not available“, nejdou ani formuláře).
- **Odznak „Powered by Netlify“** už je vypnutý (přepnuto v Netlify, na webu se nenačítá).
- **Google:** Firemní profil už existuje („HOLUB surface protection group“) – nezakládat druhý, dokončit a ověřit stávající. Firmy.cz: záznam je nepřevzatý (bez webu, telefonu, oboru) – převzetí dělá majitel.
- **Měření (Lighthouse, homepage, 4. 10.):** mobil výkon 83 (LCP 3,6 s, TBT 290 ms), desktop 84 (**CLS 0,259**), přístupnost / SEO / best practices 100. Homepage HTML 245 KB (inline CSS ~87 KB, inline JS ~44 KB), 15 videí, výška na mobilu 21 855 px.
- **Audit z prohlížeče (Claude v Chrome, 255 URL):** 0 rozbitých odkazů, 0 chyb konzole, žádný vodorovný posun na 375 px, všechny stránky mají title/description/canonical/1×H1/og:image, GTM a Clarity až po souhlasu. Nálezy: dvojí adresy `/x` i `/x.html` (9 stránek), 17 z 29 obrázků homepage bez width/height, cache CSS/JS/fontů jen 1 h, `ceny.js` bez `defer`, 12 posterů stahováno hned, menu se kolem 1000 px láme, 5–6 různých hlaviček a dvě palety, `/cisteni-strech/` bez IČO v patičce, písmo < 12 px (homepage 36 prvků), okresní stránky 445–528 slov se shodou ~52 %.

## 3. Rozhodnutí majitele
| # | Rozhodnutí | Stav |
|---|---|---|
| R1 | Záruka H-STONE 10 let zůstává | potvrzeno |
| R2 | Odznak Netlify vypnout | hotovo |
| R3 | Plovoucí tlačítko, kde AI spolupracují – jinak pro majitele, jinak pro zákazníka | hotový kód v `balicek/web` |
| R4 | Název tlačítka „H-SPG CORE · Budoucnost ve Vašich rukách“, vzhled grafit `#0D0F12`, zlatý lem `#C9A227`, tyrkysová záře `#00F0FF` | v kódu |
| R5 | 5 firemních schránek + záložní kopie na Seznam | v kódu (`content/firma.json`) |
| R6 | Web musí být špičkový a plně funkční i **bez AI**; funkčnost nesmí záviset na placené verzi Claude | architektura balíčku |
| R7 | Paleta webu: tmavě modrá + zlatá (antracit/cyan jen u AI tlačítka a v interním panelu) | platí |

**Čeká na majitele** (do té doby jen struktura a `[DOPLNIT: …]`, nic natvrdo): doba uchování poptávek (12 měsíců / 3 roky) · newsletter „Holubí pošta“ (pokud neexistuje, smazat ze zásad) · stav HYDRA-5 / MAST / RAIL / SCAN 5 / SENTINEL (hotové / ve vývoji / interní název) · pojištění odpovědnosti (pojišťovna, limit, doklad) · technické listy H-STONE / H-BIO / H-CLEAN · doklad, že H-BIO je povolený biocid · obchodní a reklamační podmínky schválené právníkem · skutečné zakázky s fotkami před/po a souhlasy majitelů domů · text spotu · zda dát repozitář `HSPG-WEB` jako soukromý.

## 4. Nepřekročitelná pravidla (platí pro každý úkol)
1. **Pravdivost:** žádné vymyšlené reference, recenze, hodnocení (AggregateRating jen ze skutečných recenzí), čísla, ocenění, certifikáty, loga, „úspěchy“, pojistné částky ani technické parametry. Chybějící fakt = `[DOPLNIT: …]` a nahlásit. Žádné superlativy bez důkazu. Nedokončené technologie neprezentovat jako hotové.
2. **Tajemství:** žádná hesla, tokeny ani klíče v kódu, commitech, logu ani chatu – jen Netlify → Environment variables. Heslo interního panelu (`HSPG_PANEL_HESLO`, 16+ znaků) zadá majitel sám. Heslo, které se objevilo v e-mailu „Master plán“, je prozrazené – nikde ho nepoužívej.
3. **Git a dva agenti:** pracuj jen ve vlastní větvi `ukol-NN-nazev` (z aktuální `main`), nepřepínej cizí větve v cizím pracovním stromu, žádný force-push, žádné mazání cizí rozdělané práce, do `main` jen přes pull request / sloučení po ověření.
4. **Kredity Netlify:** produkční nasazení jen po dávkách (ideálně 1× denně a jen po schválení majitelem); průběžně testuj lokálně (`netlify dev`) nebo na náhledovém nasazení. Každé produkční nasazení stojí 15 kreditů. Před nasazením zkontroluj zbývající kredity.
5. **Formuláře:** nikdy neodesílej testovací data do produkčních formulářů bez souhlasu majitele; pokud ano, vždy s označením `TEST`.
6. **Bez AI musí vše fungovat:** každá AI funkce má zálohu (FAQ, formulář, telefon) a časový limit; bez klíče, při chybě, limitu nebo vyčerpaném rozpočtu web běží dál a návštěvník nic nepozná.
7. **Rozsah:** dělej jen to, co úkol říká. Co nesouvisí, zapiš do hlášení jako návrh.
8. **Ověření:** každé akceptační kritérium ověř příkazem nebo testem a výsledek uveď v hlášení. „Vypadá dobře“ není ověření.
9. **Čeština na webu:** nezlomitelná mezera po jednopísmenných předložkách a spojkách (v, k, s, z, a, i, o, u) a mezi číslem a jednotkou; uvozovky „…“.

## 5. Formát hlášení po každém úkolu
```
ÚKOL NN – hotovo / částečně / blokováno
Větev: … | Commity: …
Ověření: (příkaz → výsledek, čísla)
Čeká na majitele: …
Návrhy mimo rozsah: …
```
