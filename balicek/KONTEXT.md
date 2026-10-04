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
- **Kredity Netlify = riziko výpadku celého webu.** Tarif Personal: 1 000 kreditů / období (11. 9.–10. 10.), zbývalo 426. Spotřeba: 32 produkčních nasazení × 15 = 480, přenos dat 77,9, požadavky 8,7, AI 7,1. **Auto-recharge ZAPNUTO majitelem 4. 10.** (Personal: +500 kreditů za 5 USD při vyčerpání) – web se kvůli kreditům nepozastaví, ale každé dobití stojí peníze, proto pravidla šetření (§4.4) platí dál. Bez auto-recharge by Netlify po vyčerpání kreditů pozastavil projekty týmu.
  Ceník kreditů (dokumentace Netlify): produkční nasazení 15 · **náhledové a větvové nasazení 0 (zdarma)** · přenos dat 20 / GB · požadavky 2 / 10 000 · výpočet 10 / GB-hodina · formuláře 0 · AI 180 / 1 USD. Upozornění e-mailem při 50 / 75 / 100 % chodí vlastníkovi týmu. Auto-recharge (Personal): 500 kreditů za 5 USD – zapíná jen vlastník týmu.
  Největší položky: produkční nasazení a videa na homepage (22 souborů MP4, celkem ~16 MB).
- **Odznak „Powered by Netlify“** už je vypnutý (přepnuto v Netlify, na webu se nenačítá).
- **Google (ověřeno v prohlížeči 4. 10.):** Firemní profil existuje – **nezakládat druhý**. 4. 10. uloženo rozšířením Claude v Chrome s výslovným souhlasem majitele: název **„HOLUB Surface Protection Group“** (velká písmena jako na webu); kategorie Tlakové mytí (hlavní), Impregnační služby, Čištění okapů, Údržba solárních panelů, Malíř (samostatná kategorie pro čištění střech ani fasád v nabídce Googlu není – ověřeno ve výběru); datum otevření **červen 2020**; obslužná oblast **jen Česko**; telefon, web https://hspg.cz/, Facebook https://www.facebook.com/HolubSurfaceProtection; veřejně bez adresy; Po–So 7:00–19:00; 12 služeb s cenami shodnými s `content/ceny.json`. Další úpravy profilu jen po výslovném „ano“ majitele. **Po změně oblasti Google profil přepnul do stavu „Je vyžadováno ověření“** – jediná nabízená metoda je **video, natáčí ho majitel** (adresa sídla je vyplněná jen ve formuláři ověření). Do ověření nejsou změny veřejně vidět. Chybí fotky, příspěvky, recenze (0). Odkaz pro psaní recenzí: https://g.page/r/CfDMNxuuAwDqEBM/review – **na web až po ověření profilu**; agent před nasazením ověří, že odkaz otevře formulář recenze (jinak blok recenzí Google nevytvářet). **Search Console** ověřená, sitemap odeslaná (245 adres: 14 hlavních + 231 okresních, lastmod většinou 29. 9.). **Indexace 4. 10.:** Google má v indexu jen úvodní stránku; `/cenik.html` a `/cisteni-strech/` „Objeveno – momentálně neindexováno“ (bez odkazující stránky), `/cenik` a `/akce/` Google nezná – příčina: interní odkazy vedou na `/cenik`, sitemap a canonical na `/cenik.html` (úkol 06) a okresní stránky nemají odkazy z hlavních stránek (úkol 12). **Seznam** web nezná (site:hspg.cz nic, na název firmy vychází „ochrana proti holubům“). **Seznam Webmaster:** majitel 4. 10. vygeneroval ověření **souborem** `https://hspg.cz/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` s obsahem `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI` (v balíčku `web/overeni/`, kód není tajný); 4. 10. adresa vrací 404 – soubor přidá úkol 20 s nejbližším schváleným nasazením, pak majitel klikne na „Ověřit“. Oba ověřovací soubory nesmí zmizet, změnit se ani se přesměrovat (hlídá test z úkolu 20). **Bing Webmaster:** majitel 4. 10. stáhl ověřovací soubor `BingSiteAuth.xml` (v balíčku `web/overeni/`, kód není tajný); 4. 10. `https://hspg.cz/BingSiteAuth.xml` vrací 404 – soubor přidá úkol 20 spolu se Seznamem, pak majitel klikne na „Ověřit“ (import ze Search Console je jen náhradní cesta). Firmy.cz: podle IČO jen holý záznam „Dušan Holub, Pernerova 10/32, Praha“ – převzetí dělá majitel.
- **ARES:** IČO 09291881, Dušan Holub, sídlo Pernerova 10/32, 186 00 Praha 8 – Karlín, vznik 29. 6. 2020.
- **Facebook a vyhledávání:** web má v JSON-LD jen sdílecí odkaz Facebooku (`/share/…`) – kanonický je https://www.facebook.com/HolubSurfaceProtection. Google u značky zobrazuje i texty z Facebooku „25 let zkušeností“ a „Technologie z Velké Británie“ – podnikání vzniklo 2020, tvrzení musí majitel doložit nebo upravit (rozhodnutí majitele, souvisí s úkolem 13).
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
| R9 | Auto-recharge kreditů Netlify zapnuté | hotovo 4. 10. |
| R8 | Rozpočet AI – varianta B: zákazníkům odpovídají levnější rychlé modely (Claude Sonnet 5.5, Gemini 2.5 Flash, GPT-5 mini), majitel má v panelu nejlepší (Claude Opus 5.5, Gemini 2.5 Pro, GPT-5); doporučeno zapnout auto-recharge kreditů | rozhodnuto 4. 10. (v kódu) |

**Způsob práce:** majitel si přeje pracovat přes VS Code; rozšíření Claude v Chrome v Netlify nic nenastavuje (úkoly C1, C2 a C10 dělá majitel sám nebo agent ve VS Code přes `netlify` CLI).

**Doporučení majiteli (kredity):** koupit jednorázově rezervu kreditů (credit pack, např. 1 000 kreditů) – zakoupené kredity nepropadají, takže web má polštář i při selhání platby u auto-recharge; mít u Netlify platnou kartu a číst e-maily Netlify o spotřebě a platbách.

**Čeká na majitele** (do té doby jen struktura a `[DOPLNIT: …]`, nic natvrdo): tvrzení z Facebooku „25 let zkušeností“ a „Technologie z Velké Británie“ · doba uchování poptávek (12 měsíců / 3 roky) · newsletter „Holubí pošta“ (pokud neexistuje, smazat ze zásad) · stav HYDRA-5 / MAST / RAIL / SCAN 5 / SENTINEL (hotové / ve vývoji / interní název) · pojištění odpovědnosti (pojišťovna, limit, doklad) · technické listy H-STONE / H-BIO / H-CLEAN · doklad, že H-BIO je povolený biocid · obchodní a reklamační podmínky schválené právníkem · skutečné zakázky s fotkami před/po a souhlasy majitelů domů · text spotu · zda dát repozitář `HSPG-WEB` jako soukromý.

## 4. Nepřekročitelná pravidla (platí pro každý úkol)
1. **Pravdivost:** žádné vymyšlené reference, recenze, hodnocení (AggregateRating jen ze skutečných recenzí), čísla, ocenění, certifikáty, loga, „úspěchy“, pojistné částky ani technické parametry. Chybějící fakt = `[DOPLNIT: …]` a nahlásit. Žádné superlativy bez důkazu. Nedokončené technologie neprezentovat jako hotové.
2. **Tajemství:** žádná hesla, tokeny ani klíče v kódu, commitech, logu ani chatu – jen Netlify → Environment variables. Heslo interního panelu (`HSPG_PANEL_HESLO`, 16+ znaků) zadá majitel sám. Heslo, které se objevilo v e-mailu „Master plán“, je prozrazené – nikde ho nepoužívej.
3. **Git a dva agenti:** pracuj jen ve vlastní větvi `ukol-NN-nazev` (z aktuální `main`), nepřepínej cizí větve v cizím pracovním stromu, žádný force-push, žádné mazání cizí rozdělané práce, do `main` jen přes pull request / sloučení po ověření.
4. **Kredity Netlify NIKDY nesmí klesnout na nulu – web se nesmí pozastavit (požadavek majitele).** Vrstvy ochrany: (a) majitel: auto-recharge zapnuté, rezerva zakoupených kreditů (nepropadají) a platná platební karta; (b) kód: pojistka nasazení, rozpočet AI s rezervací a nouzovým vypínačem v panelu (bez nasazení), pravidla Netlify proti hromadným požadavkům (`/api/asistent`, `/media/*`); (c) dohled: e-maily Netlify při 50/75/100 %, týdenní kontrola spotřeby (úkol 15). Žádná změna nesmí přidat nový neomezený zdroj spotřeby (smyčky, automatická nasazení, nechráněné placené endpointy, velké soubory bez limitu).
   Nasazuj **výhradně** přes `node scripts/nasadit.mjs` (z balíčku `balicek/web/scripts/nasadit.mjs`, zavádí úkol 00). Bez parametrů = náhled zdarma – tak testuj vše. Produkce (15 kreditů) jen `--produkce --schvaleno "…"` po výslovném schválení majitelem, z čisté `main`, nejvýš 1× denně (nouzově `--nouzove "důvod"` jen při výpadku). Přímé `netlify deploy --prod` je zakázané. Nic nenasazuj tak, aby vznikl nekonečný cyklus (watch, automatické nasazení při každém uložení).
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
