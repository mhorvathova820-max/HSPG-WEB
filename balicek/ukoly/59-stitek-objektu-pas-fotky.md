# Úkol 59: Štítek SENTINEL na objektu – pas otevřený z QR, fotky před/po a postup ošetření
> Priorita **P1** (štítek visí na veřejné budově – musí fungovat od prvního naskenování) · Závisí na: 14 fáze **B1** (registr, přístupové kódy, `sentinel-validate`), 51 (trezor), 50 (Standard HOLUB) · Rozhodnutí: KONTEXT R22 · Čeká na majitele: **soukromé předání** údajů zakázky (kód pasu, přístupový kód ze štítku, druh objektu, obec, povrchy a plochy, datum, šarže, data kroků), písemný souhlas vlastníka nebo uživatele objektu se zveřejněním fotek v pasu, fotky bez osob, potvrzení záruky (cesta A/B) a tarifu SENTINEL u zakázky.

## Co to je
- Na budově zákazníka visí štítek 120 × 80 mm s QR: `https://hspg.cz/pas-domu#kod=<kód pasu>&pristup=<přístupový kód>` – přesně kontrakt odkazu z certifikátu (úkol 14 B1.5). Kdo naskenuje (např. ředitelka školy), uvidí pas bez psaní kódů; kód z adresy zmizí dřív, než odejde jakýkoli požadavek.
- Pas objektu ukazuje: **druh objektu a obec** (nikdy název, adresu ani kontakty), stav záruky, další kontrolu, péči SENTINEL, **fotodokumentaci před/po s jezdcem**, **postup ošetření** (kroky Standardu HOLUB s daty a krátkým veřejným zápisem), historii, materiály a šarže, srážky a předpověď.
- Majitel bude fotky a zápisy posílat průběžně. Data jsou v registru (Netlify Blobs) – **doplnění dat nepotřebuje nasazení** (žádné kredity), stránka je ukáže při dalším otevření.

## Kód z balíčku (větev `claude/sentinel-stitek-pas-foto`)
- `assets/pas-trezor.js`, `assets/pas-trezor.css`:
  - volitelná pole `objekt`, `postup`, `cesta`; `fotky[].misto` – dvojice stejného místa (`pred` + `po`) → porovnání s jezdcem (skutečný `<input type="range">` s popiskem: dotyk, myš, šipky; štítky Před/Po se ořezávají se svou stranou), ostatní fotky v mřížce, nejvýš 24 fotek, adresy jen z vlastního webu;
  - postup: názvy a popisy kroků **jen** ze `content/standard.json` (přes `assets/hspg-cenik.json`), z registru jen číslo kroku, datum a text; cesta A/B u posledního kroku standardu; nezapsané kroky se nedomýšlejí;
  - pořadí modulů: stav (záruka, kontrola, péče) → doklady práce (fotky, postup) → podrobnosti; na šířce ≥ 1100 px fotky (7/12) a postup (5/12) vedle sebe; tisk rozloží porovnání na dvě fotky vedle sebe.
- e2e `balicek/testy/e2e/pas-trezor.test.mjs` – test „úkol 59“ (dvojice, mřížka, cizí adresa, jezdec klávesnicí i tažením, ořez vrstvy, postup ze standardu, cesta A, druh objektu, 390 × 844 bez posunu, axe) a čištění volitelných polí ve statickém testu.
- `ukazky/pas-trezor.html` + `ukazky/ukazka-fasada-pred.svg` / `-po.svg` – ukázka s **ilustracemi** (ne fotky), **nenasazovat**.

## Kontrakt – rozšíření úkolu 14 B1.4
Odpověď 200 z `/api/sentinel/validate` smí navíc obsahovat (jen vyplněná pole):
```json
{
  "objekt": "Mateřská škola",
  "cesta": "A",
  "postup": [{ "cislo": "01", "datum": "2026-10-14", "text": "Fasáda omytá tlakem a teplotou vody podle materiálu." }],
  "fotky": [
    { "src": "/api/pas-foto/<id>", "typ": "pred", "misto": "Uliční fasáda", "datum": "2026-10-14", "alt": "fasáda se zeleným nánosem" },
    { "src": "/api/pas-foto/<id>", "typ": "po", "misto": "Uliční fasáda", "datum": "2026-10-15", "alt": "fasáda po ošetření" }
  ]
}
```
- `objekt` = druh budovy (≤ 60 znaků; panel nabídne: Rodinný dům, Bytový dům, Mateřská škola, Základní škola, Administrativní budova, Hala, Jiný objekt). Nikdy název, adresa, jméno.
- `cesta` = `A` | `B` podle `content/standard.json`. Záruka se dál počítá jen u položek `ochrana_hstone.*` (úkol 14 B1.2), u cesty B bez čísla (R21).
- `postup[].cislo` = číslo kroku standardu (`01`–`05`), `datum` ISO, `text` ≤ 240 znaků. **Text je veřejný:** bez značky biocidu (R15), bez jmen, adres a cen, jen pravdivá tvrzení (KONTEXT §4.1). Názvy kroků registr neukládá.
- `fotky[]`: `typ` `pred` | `po`, `misto` ≤ 80 znaků (stejný text = jedna dvojice), `alt` popisuje, co je na fotce. Pole se posílá jen při `souhlas.fotky === true`.

## Postup
### Fáze 0 – stav (jen čtení)
1. `git -C ../hspg-balicek pull`, větev `ukol-59-stitek-objektu` z aktuální `main`.
2. Zjisti a zapiš do hlášení: je hotová fáze B1 úkolu 14 (registr `hspg-registr`, přístupové kódy, nový `sentinel-validate`, limit 429) a úkol 51 (trezor na `/pas-domu`)? Pokud ne, udělej je teď v rozsahu **B1.1–B1.6 a 51** (panel A, B2 a C počkají). Když chybí předpoklady z úkolu 01 (`netlify/lib/ai/limity.mjs`, `autorizace.mjs`), zastav se a nahlas to – nic neobcházej.

### Fáze 1 – registr a veřejné fotky
1. Schéma (B1.2): `fotky` z dvojice `{pred, po, povrch}` na seznam `[{ id, typ, misto, datum, alt, typ_souboru, sirka, vyska }]` (staré záznamy převeď: `misto` = název povrchu); nová pole `objekt`, `cesta`, `postup`, `stitek: { vytisten: "RRRR-MM-DD" } | null`. Validace a délky polí v jednom modulu (B1.2).
2. `GET /api/pas-foto/<id>`: `id` = 26 znaků Crockford Base32 ze 128 bitů `crypto.randomBytes`, nezávislé na kódu pasu. Klíč `fotoindex/<id>` → kód zakázky. Vrátí obrázek, jen když zakázka existuje, `stav === "aktivni"` a `souhlas.fotky === true`; jinak vždy stejná 404. Hlavičky: `content-type` z metadat, `cache-control: private, max-age=3600`, `x-robots-tag: noindex`, `x-content-type-options: nosniff`, `cross-origin-resource-policy: same-origin`, `referrer-policy: no-referrer`. Odvolaný souhlas → fotky přestanou chodit do hodiny.
3. `sentinel-validate` přidá pole z kontraktu výše (`fotky[].src` = `/api/pas-foto/<id>`). Whitelist test (B1.4) rozšiř o nová pole a o kontrolu, že se bez souhlasu `fotky` neposílají.
4. Zakázka s vytištěným štítkem: přístupový kód **už existuje** (je v QR). Přidej jednorázovou cestu pro přihlášeného – `POST /api/registr` (nebo `/api/registr/<kod>/pristup`) s polem `pristup` jen tehdy, když zakázka kód ještě nemá; normalizace a tvar jako B1.3, uloží se jen SHA-256 otisk, hodnota se nikam nevypisuje. Panel u zakázky se `stitek` před „Vydat nový přístupový kód“ upozorní: **„Kód je vytištěný na štítku objektu. Nový kód štítek vyřadí – bude potřeba vytisknout nový.“**
5. Testy (unit + e2e) a `npm run nahled` (zdarma). Produkce až po schválení majitelem – jedno nasazení (15 kreditů) spolu s B1/51, pokud jdou zároveň.

### Fáze 2 – založení zakázky ze štítku
1. Údaje i přístupový kód ti majitel předá **soukromě** (chat ve VS Code / soubor mimo repozitář). Do Gitu, issue, PR, hlášení ani logu je nepiš; v terminálu je nepiš do příkazové řádky (historie) – použij soubor mimo repozitář nebo proměnnou prostředí jen pro daný příkaz.
2. Založ zakázku (panel B2, nebo do jeho dokončení lokální skript, který importuje stejný modul schématu a zapisuje přes `@netlify/blobs` s přihlášeným `netlify` CLI): druh objektu, obec, povrchy a plochy, datum, materiály, šarže, `cesta`, `postup`, `stitek.vytisten`, souhlasy s dokladem.
3. Ověř na produkci **vlastním telefonem majitele** (nebo `zxing` z tiskového PDF štítku → otevřít v prohlížeči): pas se otevře sám, adresa je bez `#`, údaje sedí, v pasu není název ani adresa objektu.

### Fáze 3 – průběžné doplňování (pokyn majitele „Doplň do pasu …“)
1. **Fotky:** bez osob a dětí, bez SPZ a cedulí se jmény (jinak nepoužít nebo ořezat); delší strana ≤ 1600 px, WebP 0,8 (JPEG 0,85), bez EXIF/GPS – stejná pravidla jako 14 B2.3. Každá fotka: `typ`, `misto` (pro dvojici stejný text, např. „Uliční fasáda“, „Vstup“, „Sokl u hřiště“), `datum` pořízení, `alt`.
2. **Postup:** krok `01`–`05`, datum, krátký veřejný text (pravidla výše). Opravy přepíšou záznam téhož kroku a data.
3. Zápis jde do registru (panel nebo skript z fáze 2) – **bez nasazení**. Pak otevři pas přes odkaz ze štítku a pošli majiteli snímek obrazovky z telefonu (390 px).

## Akceptace
- [ ] QR ze štítku (z tiskového PDF přes `zxing`, pak telefonem) otevře na produkci pas bez psaní kódů; fragment zmizí z adresy před prvním požadavkem (e2e z úkolu 51).
- [ ] Pas ukazuje druh objektu a obec, nikdy název, adresu ani kontakt (whitelist test).
- [ ] Dvojice před/po = porovnání s jezdcem (dotyk, myš, klávesnice), ostatní fotky v mřížce; bez souhlasu žádné fotky a `/api/pas-foto/<id>` vrací 404.
- [ ] Postup ukazuje jen zapsané kroky s názvy ze Standardu HOLUB, cestu A/B u posledního kroku.
- [ ] Panel varuje před vydáním nového kódu u zakázky se štítkem.
- [ ] `npm test`, e2e `pas-trezor` (10/10), axe bez vážných chyb, 390 × 844 bez vodorovného posunu.
- [ ] Doplnění fotek a kroků nevyžaduje nasazení.
- [ ] V Gitu, PR ani hlášení není přístupový kód, název ani adresa objektu.
- [ ] Hlášení a stop.
