# Úkol 20: Ověření webu v Seznam Webmasteru a Bing Webmaster Tools (soubory)
> Priorita P1 · Závisí na: 00 (pojistka `scripts/nasadit.mjs`) · Čeká na majitele: schválení produkčního nasazení (soubory jedou s nejbližším schváleným nasazením), kliknutí na „Ověřit“ v Seznam Webmasteru a v Bing Webmaster Tools · Rozsah: dva statické soubory v kořeni webu (kopie bajt po bajtu z balíčku), test, který je hlídá, ověření na náhledu a po nasazení na produkci. Jedna fáze, malý úkol – dělej ho hned po úkolu 00 (nebo po právě rozpracovaném úkolu).

## Proč (s důkazy)
Seznam web hspg.cz vůbec nezná (site:hspg.cz nic, KONTEXT §2). Majitel 4. 10. stáhl ověřovací soubory:

| Vyhledávač | Adresa na webu | Soubor v balíčku | Velikost | SHA-256 |
|---|---|---|---|---|
| Seznam Webmaster | `https://hspg.cz/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` | `balicek/web/overeni/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` (obsah `UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI`, bez nového řádku) | 32 B | `0629bb66964fae2450f0ff2a25aaffa08d9e09126a7af8cb687b2ec87f8c8848` |
| Bing Webmaster Tools | `https://hspg.cz/BingSiteAuth.xml` | `balicek/web/overeni/BingSiteAuth.xml` | 85 B | `5ec8d274566438c03739efa40203f2af03dc8f6124073ad276ee79fc17db6dd4` |

Ověřovací kódy nejsou tajné (soubory jsou veřejně na webu), do repozitáře patří. 4. 10. obě adresy na produkci vrací 404 (stránka „nenalezeno“), proto ověření neprojde.

## Cíl (měřitelný)
- Obě adresy vrací **200**, bez přesměrování a bez HTML: Seznam `content-type: text/plain…` a tělo přesně kód; Bing `content-type` XML (`application/xml` nebo `text/xml`) a tělo shodné se souborem z balíčku.
- Soubory nezmizí ani se nezmění při dalších úkolech (06 přesměrování, 07 build do `dist/`, 19 CI) – hlídá je test.

## Rozsah (ANO / NE výslovně)
ANO: oba soubory v kořeni publikované složky (hodnota `publish` v `netlify.toml`; pokud web používá build, tak tam, odkud se statické soubory kopírují do výstupu), test, kontrola přesměrování, hlaviček a `robots.txt`, nasazení s nejbližší schválenou dávkou.
NE: meta tagy `seznam-wmt` a `msvalidate.01` (soubory stačí), DNS a MX (beze změny), sitemap (soubory do ní nepatří), úprava obsahu souborů (ani formátování XML), samostatné produkční nasazení jen kvůli souborům (pokud ho majitel výslovně nechce hned – stojí 15 kreditů).

## Postup
1. `git -C ../hspg-balicek pull`, pak větev `ukol-20-overeni-vyhledavacu` z aktuální `main`.
2. Zjisti publikovanou složku: `grep -n "publish" netlify.toml`. Pokud se web sestavuje (např. `dist/` z úkolu 07 fáze B), najdi, odkud se kopírují statické soubory, a soubory dej tam, aby se do výstupu dostaly beze změny.
3. Zkopíruj oba soubory **bajt po bajtu** (žádné otevírání v editoru, žádné formátování):
   `cp ../hspg-balicek/balicek/web/overeni/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt ../hspg-balicek/balicek/web/overeni/BingSiteAuth.xml <publish>/`
   Ověř `sha256sum <publish>/seznam-wmt-*.txt <publish>/BingSiteAuth.xml` proti tabulce výše. Do `.gitattributes` webu přidej `seznam-wmt-*.txt -text` a `BingSiteAuth.xml -text` (na Windows by Git jinak mohl převést konce řádků).
4. Přesměrování a hlavičky: projdi `_redirects`, `netlify.toml` (`[[redirects]]`, `[[headers]]`) a edge funkce (`netlify/edge-functions/*`, jejich `config.path`). Netlify pravidlo bez vynucení existující soubor nepřebije; nebezpečná jsou jen pravidla s `!` v `_redirects` nebo `force = true` v `netlify.toml`, která adresy pokryjí (např. `/*`), a edge funkce s takovou cestou. Pokud takové pravidlo existuje, přidej **před něj** výjimky `/seznam-wmt-*  /seznam-wmt-:splat  200` a `/BingSiteAuth.xml  /BingSiteAuth.xml  200` (bez `!`) a zdůvodni to v hlášení. Hlavičky (např. CSP, `X-Robots-Tag: noindex` pro všechno) ověření nevadí, ale `content-type` nesmí být HTML.
5. `robots.txt` nesmí adresy zakazovat (žádné `Disallow`, které by je pokrylo). Do `sitemap.xml` je nepřidávej; pokud sitemap generuje skript, ověř, že `.txt` a `BingSiteAuth.xml` vynechá.
6. Test (stávající sada testů webu, `node --test`, bez nových závislostí), např. `tests/overeni-vyhledavacu.test.mjs`:
   - oba soubory existují v publikované složce (po zavedení `dist/` i ve výstupu buildu) a jejich SHA-256 odpovídá tabulce,
   - `robots.txt` je nezakazuje a `sitemap.xml` je neobsahuje,
   - žádné vynucené pravidlo v `_redirects` / `netlify.toml` nemá zdroj, který by je zachytil, bez výjimky z kroku 4.
7. Náhled zdarma: `node scripts/nasadit.mjs` → na adrese náhledu `curl -sS -D - <náhled>/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt` a `curl -sS -D - <náhled>/BingSiteAuth.xml` → 200, správný `content-type`, tělo shodné se souborem (`curl -sS <adresa> | sha256sum`).
8. Sloučení do `main` a produkce **jen se schválením majitele** a v dávce s nejbližším produkčním nasazením (typicky úkol 01): `node scripts/nasadit.mjs --produkce --schvaleno "…"`. Pokud majitel výslovně chce ověřit hned, samostatné nasazení je v pořádku (15 kreditů, limit 1× denně platí).
9. Po nasazení na produkci totéž na `https://hspg.cz/…` (oba soubory). Teprve potom majitel (nebo Claude v Chrome s ním, úloha C7) klikne v Seznam Webmasteru i v Bing Webmaster Tools na **Ověřit** a odešle sitemap `https://hspg.cz/sitemap.xml`.

## Akceptační kritéria
- [ ] `sha256sum` obou souborů v publikované složce odpovídá tabulce (vlož výstup).
- [ ] Nový test prošel (uveď název a počet testů celé sady).
- [ ] Náhled: obě adresy 200, správný `content-type`, SHA-256 těla shodné (vlož výstup `curl -sS -D -` a `| sha256sum`).
- [ ] Produkce (po schváleném nasazení): totéž na `https://hspg.cz/…`.
- [ ] `git grep -nE "seznam-wmt|msvalidate" -- '*.html'` nic (meta tagy se nepřidaly) a `sitemap.xml` soubory neobsahuje.

## Ověření
Kroky 6, 7 a 9. Na produkci jen čtení (`curl` GET), žádné odesílání formulářů.

## Bez AI / s AI
Úkol se AI netýká.

## Nepřekročitelná pravidla
KONTEXT §4: produkce jen přes `scripts/nasadit.mjs` se schválením majitele, MX a DNS beze změny, žádná hesla ani klíče v kódu (ověřovací kódy Seznamu a Bingu nejsou tajné).

## Hlášení po dokončení
Podle KONTEXT §5. Navíc: kde soubory leží, zda bylo nutné upravit přesměrování, výstupy `curl` z náhledu (a z produkce, pokud už se nasazovalo) a připomínka majiteli: „Po nasazení klikněte v Seznam Webmasteru i v Bing Webmaster Tools na Ověřit a odešlete sitemap.“
