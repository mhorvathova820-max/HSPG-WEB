# Úkol 23: Měření budovy z adresy na serveru (`/api/mereni`)
> Priorita P1 · Závisí na: 01 (přihlášení majitele), 22 (konzole v3 ho zobrazí) · Čeká na majitele: nic (bez klíčů a registrací) · Kód hotový v balíčku, testy 5/5.

## Co to dělá
Majitel zadá adresu → server vrátí jeden JSON: půdorys (polygon v metrech), plocha, obvod, strany s délkou a orientací, fasády po stranách (bez společných zdí se sousedy), výška okapu a hřebene, sklon a tvar střechy, plocha střechy, data pro prostorový model, přesnost a zdroje. Vždy s větou **„Schéma z mapových podkladů, ne geodetické zaměření.“**

## Zdroje (ověřeno 9. 10. 2026, veřejné, bez klíče)
| Údaj | Zdroj | Licence |
|---|---|---|
| adresa, adresní místo, stavební objekt: **půdorys z katastrální mapy**, počet podlaží, zastavěná plocha, způsob využití (oficiální číselník), sousední budovy | ČÚZK RÚIAN – `ags.cuzk.gov.cz/arcgis/rest/services/RUIAN` (geokodér + vrstvy 1 a 3) | CC BY 4.0, „ČÚZK, 2026“ |
| výška okapu a hřebene, sklon | ČÚZK **DMP 1G − DMR 5G** (`ags.cuzk.gov.cz/arcgis2/…/dmp1g|dmr5g/ImageServer/identify`), střední chyba 0,4 m / 0,18 m, rastr 2 m | CC BY 4.0 |
| záloha obrysu | OpenStreetMap: Overpass (střídání 3 serverů), pak polygon z Nominatim (zámek 1 dotaz/s v Blobs, User-Agent s kontaktem) | ODbL 1.0 |

## Co veřejné služby neumožňují (a jak to kód řeší)
- **Hromadný dotaz na výškopis (`getSamples`) služba zakazuje (403).** Jde jen dotaz na jeden bod → nejvýš 12 bodů uvnitř půdorysu × 2 služby, souběžně nejvýš 6 dotazů, celkový limit 14 s; pomalý bod se vynechá.
- **Výškopis je z leteckého skenování 2009–2013** – novější stavby v něm nejsou; pak se výška odhadne z počtu podlaží (3 m/podlaží + 0,5 m, ±15 %) a odpověď to říká.
- **Rastr 2 m** nerozliší sedlovou a valbovou střechu ani vikýře a komíny; plocha střechy (půdorys ÷ cos sklonu) platí pro obě, bez přesahů.
- **Členité budovy** (různě vysoká křídla) mají tvar „nepravidelná“: fasády s mediánem výšky, rozsah výšek ve výstupu.
- Vnitřní dvory: plocha se odečte, jejich fasády se nepočítají (upozornění ve výstupu).

## Postup pro agenta ve VS Code
1. Větev `ukol-23-mereni` z aktuální `main`; převezmi `netlify/functions/mereni.mjs`, `netlify/lib/mereni/{geometrie,zdroje,sjtsk}.mjs`, upravený `scripts/build-obce.mjs` (převod S-JTSK přesunut do `lib/mereni/sjtsk.mjs`).
2. `npm test` v balíčku (99, z toho `testy/unit/mereni.test.mjs` 5: s půdorysem, bez půdorysu → OSM, náměstí → nabídka adres, přihlášení a limit, geometrie). Testy používají záznam odpovědí RÚIAN (`testy/fixtures/mereni-ruian.json`) a nevolají internet.
3. Náhled zdarma → v AI centru (nebo konzoli v3) zavolej `POST /api/mereni { adresa }` s tokenem majitele na 3 adresách (rodinný dům, řadový dům na náměstí, náměstí bez čísla) a výsledek ukaž majiteli. Odpověď s kódem adresy se drží v Blobs (`hspg-mereni`) 180 dní.
4. Zobrazení (konzole v3, úkol 22 fáze B): půdorys a pohledy kreslit z `pudorys.body` a `fasady`, střechu z `strecha`, 3D z `model3d`; u každého čísla zdroj a „schéma, ne zaměření“; zdroje ČÚZK/OSM uvést pod výkresem.
5. Hlášení a stop; produkce jen se schválením majitele.

## Nepřekročitelná pravidla
Žádné vymyšlené rozměry: co zdroj nevrátí, je `null` s upozorněním. Limit 60 měření / 10 min, jen majitel. Podmínky ČÚZK (CC BY 4.0), OSM (ODbL) a Nominatim (1 dotaz/s) dodržet a zdroje vždy uvést.
