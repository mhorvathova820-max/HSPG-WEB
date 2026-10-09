# Úkol 24: Lovec SVJ – veřejné kontakty na SVJ panelových domů (`/api/lovec-svj`)
> Priorita P2 · Závisí na: 01 (přihlášení majitele), 21 (kupony, plánovač), 22 (brána AI), 23 (měření) · Čeká na majitele: zapnutí Perplexity v Netlify AI Gateway, schválení textu nabídky v dopise, právní posouzení (viz níže) · Kód hotový v balíčku, testy 7/7.

## Co to dělá
Jen přihlášený majitel. Běh po krocích (každé volání = jedna fáze jednoho subjektu, průběh v Blobs `hspg-lovec`):
1. **Vstup:** obec, nejvýš N subjektů na běh (výchozí 25, max 50), volitelně bytová družstva (205).
2. **ARES:** SVJ (právní forma 145) se sídlem v obci; přeskočí seznam „neozývat“ a už schválené.
3. **Budova:** sídlo změří `/api/mereni` (úkol 23, kód adresního místa z ARES). Cíl = bytový dům se 4+ podlažími. Panel = druh konstrukce RÚIAN 4/41/43. **Skóre 0–100:** fasády až 60 b. (3 000 m²), střecha až 30 b. (1 000 m²), panel +10 – jen pořadí, ne slib zakázky.
4. **Hledání:** Perplexity (přes bránu AI) navrhne stránku + kontakt. Server stránku sám stáhne (robots.txt, bez přihlášení, ochrana proti interním adresám) a ověří: kontakt na stránce doslova je, stránka uvádí IČO nebo adresu SVJ, řádek s kontaktem mluví o SVJ/výboru/správci a ne o bytě či obyvateli; pak Claude posoudí výřez. Uloží se jen ověřený kontakt (zdrojová adresa, citace řádku, datum). Neověřené se zahodí s důvodem.
5. **Statutární orgán:** jen když majitel zapne `osloveniJmenem` – jméno a funkce předsedy z veřejného rejstříku, jen pro adresu „k rukám“. Datum narození a bydliště se zahodí hned při načtení. Výchozí: „k rukám výboru společenství“.
6. **Návrhy → databáze:** návrh se do databáze zapíše až akcí `schvalit` (zdroj, datum, právní základ, kanály, `emailPovolen: false`).
7. **Dopis:** jen pro schválený záznam. Mistral napíše text jen z ověřených faktů, Claude zkontroluje; neprojde-li ani na druhý pokus → šablona. Povinný blok (odkud máme údaje, oprávněný zájem, jak odmítnout s kódem, „schéma, ne zaměření“) vkládá kód, ne AI. QR do plánovače s jednorázovým kuponem (1 l H-STONE). Výstup HTML A4 → v prohlížeči **Tisk → Uložit jako PDF**.
8. **Neozývat:** `{ akce: "neozyvat", ico }` nebo `{ akce: "neozyvat", kod }` (kód z dopisu) – trvalý seznam, smaže návrh i záznam, další běhy subjekt přeskočí, dopis nejde.

API: `POST {akce:"start", obec, n?, druzstva?, osloveniJmenem?}` · `POST {akce:"krok", beh}` (opakovat do `hotovo`) · `GET ?beh=ID` · `GET ?navrhy=1` · `GET ?databaze=1` · `GET ?neozyvat=1` · `POST {akce:"schvalit", ico, kontakty?:[index]}` · `POST {akce:"zamitnout", ico}` · `POST {akce:"dopis", ico}`. Limit 300 požadavků / 10 min.

## Co nejde a bezpečná varianta
- **Okres jako vstup:** ARES neumí filtr podle okresu → jen obec (okres slouží k rozlišení stejnojmenných obcí).
- **Velká města (Praha, Brno, Ostrava…):** ARES vydá nejvýš 1 000 výsledků na dotaz → odpověď 422. Varianta: později dotaz po částech obce/ulicích (samostatný úkol).
- **Časový limit funkce:** fáze hledání čeká na Perplexity. Pokud na náhledu krok překročí limit synchronní funkce Netlify, převést jen krok `hledani` na background funkci (`lovec-svj-background`), zbytek beze změny.
- **PDF na serveru:** bez knihovny pro PDF (velikost, údržba) → tisk z prohlížeče.
- **Hledání přes Gemini:** neimplementováno; bez Perplexity běh projde měření a dá „návrh bez kontaktu“ (dopis na adresu sídla jde i tak).
- **Webová stránka pro odhlášení:** zatím není; odmítnutí e-mailem/telefonem s kódem, majitel zadá kód.

## Právně sporné body (pro majitele / právníka)
- **Telefon:** obchodní hovory jsou od 2022 omezené (zákon o elektronických komunikacích, § 96 – princip předchozího souhlasu účastníka); zda a jak to platí pro číslo správce/SVJ, musí posoudit právník. Bezpečná varianta: **telefonovat jen se souhlasem nebo stávajícímu zákazníkovi**; jinak jen dopis.
- **E-mail:** hromadné rozesílání systém nemá (zákon 480/2004 Sb., § 7). `emailPovolen` nastavuje majitel ručně jen při souhlasu nebo u stávajícího zákazníka.
- **Jméno předsedy:** osobní údaj z veřejného rejstříku; výchozí vypnuto, ukládá se jen jméno a funkce. Bezpečná varianta: nechat vypnuté.
- **Oprávněný zájem:** před ostrým provozem doplnit do zásad ochrany osobních údajů (úkol 09) kategorii „kontakty SVJ z veřejných zdrojů“ a test vyvážení oprávněného zájmu.

## Postup pro agenta ve VS Code
1. Větev `ukol-24-lovec-svj` z aktuální `main`; převezmi `netlify/functions/lovec-svj.mjs`, `netlify/lib/lovec/{zdroje,beh,dopis}.mjs`, `netlify/lib/mereni/mereni.mjs` (jádro měření přesunuté z funkce) + upravené `functions/mereni.mjs` a `lib/mereni/zdroje.mjs` (druh konstrukce); závislost `qrcode` (MIT).
2. `npm test` v balíčku (106, z toho `testy/unit/lovec-svj.test.mjs` 7: běh se zahozením kontaktu obyvatele a interní adresy, robots.txt, schválení, dopis Mistral/šablona, neozývat podle IČO i kódu, jméno předsedy bez data narození, přihlášení). Testy používají uložené odpovědi, internet nevolají.
3. Náhled zdarma → majitel v Netlify AI Gateway zapne Perplexity (spotřebuje kredity) → jeden běh `obec: "Kolín", n: 3`; změř dobu kroku `hledani` (viz limit výše), výsledky ukaž majiteli. Dopis vytiskni do PDF a dej majiteli ke kontrole.
4. Panel (konzole v3): seznam návrhů podle skóre, u kontaktu odkaz na zdroj a citace, tlačítka Schválit / Zamítnout / Neozývat / Dopis. Žádné tlačítko pro hromadný e-mail.
5. Hlášení a stop; produkce jen se schválením majitele.

## Nepřekročitelná pravidla
Žádné vymyšlené kontakty, rozměry ani nabídky; co se neověří, zahodit. Jen veřejné zdroje, robots.txt, žádné weby za přihlášením, žádné údaje obyvatel. Do databáze jen po schválení majitelem. Seznam „neozývat“ je trvalý.
