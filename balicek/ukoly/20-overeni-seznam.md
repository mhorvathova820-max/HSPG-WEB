# Úkol 20: Ověření webu v Seznam Webmasteru (soubor)
> Priorita P1 · Závisí na: 00 (pojistka `scripts/nasadit.mjs`) · Čeká na majitele: schválení produkčního nasazení (soubor jede s nejbližším schváleným nasazením), kliknutí na „Ověřit“ v Seznam Webmasteru · Rozsah: jeden statický soubor v kořeni webu, test, který ho hlídá, ověření na náhledu a po nasazení na produkci. Jedna fáze, malý úkol – dělej ho hned po úkolu 00 (nebo po právě rozpracovaném úkolu).

## Proč (s důkazy)
Seznam web hspg.cz vůbec nezná (site:hspg.cz nic, KONTEXT §2). Majitel 4. 10. vygeneroval v Seznam Webmasteru ověření vlastnictví **souborem**:

- adresa: `https://hspg.cz/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt`
- obsah: `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI`

Ověřovací kód není tajný (je veřejně na webu), do repozitáře patří. 4. 10. vrací adresa na produkci 404 (stránka „nenalezeno“), proto Seznam web ověřit nemůže.

## Cíl (měřitelný)
- `https://hspg.cz/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` vrací **200**, `content-type: text/plain` a tělo **přesně** `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI` (bez HTML, bez přesměrování).
- Soubor nezmizí při dalších úkolech (06 přesměrování, 07 výkon, 19 sestavení `dist/`) – hlídá ho test.

## Rozsah (ANO / NE výslovně)
ANO: soubor v kořeni publikované složky (hodnota `publish` v `netlify.toml`; pokud web používá sestavení, tak tam, odkud se kopírují statické soubory do výstupu), test, kontrola přesměrování a `robots.txt`, nasazení s nejbližší schválenou dávkou.
NE: meta tag `seznam-wmt` (soubor stačí, dvě metody najednou nejsou potřeba), DNS a MX (beze změny), sitemap (soubor do ní nepatří), samostatné produkční nasazení jen kvůli souboru (pokud ho majitel výslovně nechce hned – stojí 15 kreditů).

## Postup
1. Větev `ukol-20-overeni-seznam` z aktuální `main`.
2. Zjisti publikovanou složku: `grep -n "publish" netlify.toml`. Pokud se web sestavuje (např. `dist/` z úkolu 19), najdi, odkud se kopírují statické soubory, a soubor dej tam, aby se do výstupu dostal beze změny.
3. Vytvoř soubor **bez koncového nového řádku a bez mezer**:
   `printf '%s' 'UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI' > <publish>/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt`
   Ověř: `wc -c <soubor>` → `32`.
4. Přesměrování a hlavičky: projdi `_redirects`, `netlify.toml` (`[[redirects]]`, `[[headers]]`) a edge funkce (`netlify/edge-functions/*`, jejich `config.path`). Žádné pravidlo nesmí tuto adresu přesměrovat, přepsat (rewrite na `index.html` nebo 404) ani jí dát HTML. Netlify pravidlo bez vynucení existující soubor nepřebije; nebezpečná jsou jen pravidla s `!` v `_redirects` nebo `force = true` v `netlify.toml`, která adresu pokryjí (např. `/*`), a edge funkce s takovou cestou. Pokud takové pravidlo existuje, přidej **před něj** výjimku `/seznam-wmt-*  /seznam-wmt-:splat  200` (bez `!`) a zdůvodni to v hlášení.
5. `robots.txt` nesmí adresu zakazovat (žádné `Disallow`, které by ji pokrylo). Do `sitemap.xml` soubor nepřidávej; pokud sitemap generuje skript, ověř, že ho nepřidá (`.txt` vynech).
6. Test (stávající sada testů webu, `node --test`, bez nových závislostí), např. `tests/overeni-vyhledavacu.test.mjs`:
   - soubor existuje v publikované složce (případně ve výstupu sestavení) a jeho obsah je přesně `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI` (32 bajtů),
   - `robots.txt` ho nezakazuje a `sitemap.xml` ho neobsahuje,
   - žádné pravidlo v `_redirects` / `netlify.toml` nemá zdroj, který by adresu zachytil (alespoň: pravidla se zdrojem `/*` nebo `/seznam-wmt*` musí mít výjimku z kroku 4).
7. Náhled zdarma: `node scripts/nasadit.mjs` → na adrese náhledu `curl -sS -D - <náhled>/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` → 200, `text/plain`, tělo přesně kód.
8. Sloučení do `main` a produkce **jen se schválením majitele** a v dávce s nejbližším produkčním nasazením (typicky úkol 01): `node scripts/nasadit.mjs --produkce --schvaleno "…"`. Pokud majitel výslovně chce ověřit Seznam hned, samostatné nasazení je v pořádku (15 kreditů, limit 1× denně platí).
9. Po nasazení na produkci: `curl -sS -D - https://hspg.cz/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` → 200 a přesný obsah. Teprve potom majitel (nebo Claude v Chrome s ním, úloha C7) klikne v Seznam Webmasteru na **Ověřit** a odešle sitemap `https://hspg.cz/sitemap.xml`.

## Akceptační kritéria
- [ ] `wc -c <publish>/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` → 32 a `cat` vypíše přesně `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI`.
- [ ] Nový test prošel (uveď název a počet testů celé sady).
- [ ] Náhled: 200, `content-type: text/plain…`, tělo přesně kód (vlož výstup `curl -sS -D -` bez cookies).
- [ ] Produkce (po schváleném nasazení): totéž na `https://hspg.cz/…`.
- [ ] `git grep -n "seznam-wmt" -- '*.html'` nic (meta tag se nepřidal) a `sitemap.xml` soubor neobsahuje.

## Ověření
Kroky 6, 7 a 9. Na produkci jen čtení (`curl` GET), žádné odesílání formulářů.

## Bez AI / s AI
Úkol se AI netýká.

## Nepřekročitelná pravidla
KONTEXT §4: produkce jen přes `scripts/nasadit.mjs` se schválením majitele, MX a DNS beze změny, žádná hesla ani klíče v kódu (ověřovací kód Seznamu není tajný).

## Hlášení po dokončení
Podle KONTEXT §5. Navíc: kde soubor leží, zda bylo nutné upravit přesměrování, výstup `curl` z náhledu (a z produkce, pokud už se nasazovalo), a připomínka majiteli: „Po nasazení klikněte v Seznam Webmasteru na Ověřit a odešlete sitemap.“
