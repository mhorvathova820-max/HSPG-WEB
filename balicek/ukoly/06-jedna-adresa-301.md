# Úkol 06: Jedna adresa pro každou stránku (301)
> Priorita P1 · Závisí na: 00 (podle `PORADI.md` jsou před tímto úkolem sloučené i 01, 02, 17, 03, 04, 05, 13 a 09; dotčené soubory mění hlavně 01 (H-BOT), 04 (`/reklamace/`), 05 (`/zaruka`), 09 (zásady a souhlasy) a 17 (`/offline/`, `sw.js`); jejich stav ověř v kroku 1) · Čeká na majitele: jen krok 17 (pravidlo pro `tourmaline-dasik-9de005.netlify.app`): kam míří callback URL webhooku Facebooku a zda tuto adresu volá jiná služba; produkční nasazení jen po schválení v dávce · Rozsah: **fáze A** = jedna podoba adres (canonical, og:url, hreflang, JSON-LD, odkazy, sitemap), 301 ze starých podob, kontrolní skripty a testy, vše ověřené na náhledu; **fáze B** = generátor sitemap s pravdivým `lastmod`, zařazení do buildu a pravidlo pro netlify.app (jen po potvrzení majitele). Po fázi A podej hlášení. Texty, vzhled a adresy okresních stránek se nemění.

## Proč (s důkazy)
Zdroje: ověřené nálezy `audit-seo` #4, #5, #14 a `audit-nasazeni_provoz` #11, #19. Dále kopie živého webu (mirror ze 4. 10. 2026), dotazy GET na https://hspg.cz a https://tourmaline-dasik-9de005.netlify.app ze 4. 10. 2026 odpoledne a dokumentace Netlify. Čísla řádků platí pro živý web, ve zdroji se mohou lišit.

**1. Devět stránek má dvě adresy.** `/x` i `/x.html` vracejí 200 se stejným obsahem:

| Stránka | Velikost (obě podoby) |
|---|---|
| `/cenik` | 40 530 B |
| `/kalkulacka-svj` | 45 684 B |
| `/en` | 44 473 B |
| `/pas-domu` | 38 304 B |
| `/nabidka-svj` | 32 116 B |
| `/kariera` | 27 836 B |
| `/ochrana-osobnich-udaju` | 27 142 B |
| `/reference` (noindex) | 24 829 B |
| `/spoluprace` | 20 791 B |

CDN Netlify je ukládá jako dvě položky: ve stejnou chvíli měla `/cenik.html` `cache-status: hit` a `/cenik` `fwd=miss`.

**2. Signály si odporují.** Interní odkazy vedou na `/x`, hlavička stránek a sitemap na `/x.html`.
- **Odkazy:** v mirroru vede na `/x` 785 odkazů `<a>`: `/cenik` 483× na 244 stránkách, `/ochrana-osobnich-udaju` 262× na 247 stránkách, `/pas-domu` 12×, `/kariera` 12×, `/spoluprace` 4×, `/kalkulacka-svj` 4×, `/nabidka-svj` 3×, `/reference` 3× a `/en` 2×. Ostatní interní odkazy (adresáře jako `/akce/` nebo `/cisteni-strech/kolin/`) jsou v podobě, kterou Netlify vrací bez přesměrování. Jedinou výjimkou v HTML je odkaz, který na homepage vytváří inline JS (níže).
- **Adresy hspg.cz s `.html`:** 28 výskytů v 10 souborech:

| Kde | Počet | Soubory |
|---|---|---|
| `<link rel="canonical">` | 9 | všech 9 stránek z tabulky výše (ř. 10, u `spoluprace.html` ř. 52, u `reference.html` ř. 104) |
| `<meta property="og:url">` | 9 | totéž |
| `item` v BreadcrumbList (JSON-LD) | 6 | `cenik`, `kalkulacka-svj`, `kariera`, `nabidka-svj`, `ochrana-osobnich-udaju`, `pas-domu` |
| `<link rel="alternate" hreflang="en">` | 2 | `index.html` ř. 20, `en.html` ř. 12 → `https://hspg.cz/en.html` |
| `"url"` v JSON-LD | 1 | `en.html` ř. 35 |
| viditelný text odkazu | 1 | `nabidka-svj.html` ř. 216: „úplný ceník na `<a href='/cenik'>hspg.cz/cenik.html</a>`“ (odkaz vede správně, text ne; audit to nezachytil) |

- **Sitemap** (`sitemap.xml`, živá verze se shoduje s kopií): 8 z 245 `<loc>` má `.html` (cenik, nabidka-svj, kalkulacka-svj, pas-domu, kariera, spoluprace, en, ochrana-osobnich-udaju; `/reference` v sitemap není, má noindex). Dále 2× `xhtml:link hreflang="en"` → `/en.html`.
- **Odkazy na `.html` v JS a JSON:**

| Soubor | Místo | Odkaz |
|---|---|---|
| `index.html` | souhlas v průvodci poptávkou, v mirroru ř. 2200 (`consentText.innerHTML`) | `/ochrana-osobnich-udaju.html` |
| `assets/souhlas.js` | ř. 94, lišta cookies, načítá ji všech 247 stránek (audit tento výskyt nezachytil) | `/ochrana-osobnich-udaju.html#cookies` |
| `assets/hbot.js` | starý H-BOT, ř. 23, 45, 49, 209. Úkol 01 ho nahrazuje | `/cenik.html`, `/cenik.html#sentinel`, `/nabidka-svj.html`, `/ochrana-osobnich-udaju.html` |
| `content/hbot-faq.json` | z balíčku úkolu 01, ř. 8, 30, 34 | `/cenik.html`, `/cenik.html#sentinel`, `/nabidka-svj.html` |
| `assets/hbot-panel.js` | z balíčku úkolu 01, ř. 210 (souhlas u „Zavolejte mi“) | `/ochrana-osobnich-udaju.html` |
| `sw.js` | kořen webu, ř. 12 a 54 (předukládání a offline záloha) | `/404.html` – **výjimka**, `404.html` se nepřesměrovává (krok 8), odkaz zůstává |
| `netlify/lib/ai/pravidla.mjs` | z balíčku úkolu 01, ř. 19 (pokyn pro AI) | „odkazy jako hspg.cz/cenik.html“ |

Google si kanonickou adresu v takové situaci může zvolit sám. Skutečný stav podle Search Console 4. 10. (`KONTEXT.md` §2): v indexu je jen úvodní stránka, `/cenik.html` je „Objeveno – momentálně neindexováno“ a `/cenik` Google nezná. Rozporné signály jsou jednou z uvedených příčin, druhou (okresní stránky bez odkazů) řeší úkol 12. Seznam web zatím nezná (ověření v Seznam Webmasteru řeší úkol 11).

**3. Duplicitní cesty `index.html` a hostitel netlify.app** (audit-seo #14, nasazeni #11, závažnost nízká).
- 200 vracejí: `/index.html` (244 544 B, totéž co `/`), `/akce/index.html`, `/recenze/index.html`, `/pravidla-akce/index.html`, `/cisteni-strech/index.html`, `/cisteni-strech/kolin/index.html`, `/cisteni-dlazby/praha/index.html`, `/akce/dekujeme/index.html` a `/reel/index.html`.
- `https://tourmaline-dasik-9de005.netlify.app/` i `/cenik.html` vracejí 200 se stejným `etag` jako hspg.cz a bez `X-Robots-Tag`. `robots.txt` na tomto hostiteli vrací 200 (stejný obsah jako na hspg.cz). Riziko zmírňuje canonical, který všude míří na hspg.cz. Náhledy a permalinky mají jiný hostitel (`<id>--tourmaline-dasik-9de005.netlify.app`), permalinky navíc hlavičku `x-robots-tag: noindex` (audit nasazeni #11).
- Funkce jsou přes netlify.app dosažitelné (`/api/pocasi?q=Praha` → 200, audit nasazeni #11). Na produkci běží i funkce `facebook-webhook` (`KONTEXT.md` §1).

**4. Co Netlify už normalizuje sám** (GET na živý web):

| Požadavek | Výsledek |
|---|---|
| `/cenik/` | 301 → `/cenik` |
| `/CENIK.html` | 301 → `/cenik` |
| `/en/` | 301 → `/en` |
| `/index` | 301 → `/` |
| `/akce` | 301 → `/akce/` |
| `/cisteni-strech/kolin` | 301 → `/cisteni-strech/kolin/` |
| `/cisteni-strech/kolin.html` | 301 → `/cisteni-strech/kolin/` |
| `/cenik.html`, `/index.html`, `/…/index.html` | **200 (duplicita)** |

Odpovídá to výchozímu chování Netlify podle [support guide k lomítkům a Pretty URLs](https://answers.netlify.com/t/support-guide-how-can-i-alter-trailing-slash-behaviour-in-my-urls-will-enabling-pretty-urls-help/31191) (revize 7/2025): soubor `/blog.html` se vrací na `/blog` i `/blog.html` a `/blog/` přesměruje na `/blog`. Adresář `/blog/index.html` se vrací na `/blog/`. Volba Pretty URLs má podle průvodce přesměrovat `/blog.html` → `/blog`. Živý web to nedělá a vlákno na fóru Netlify z 8/2026 („Pretty URLs config option doesn't redirect .html“) hlásí, že volba to nedělá. Na Pretty URLs proto nespoléháme. Pracovník Netlify na fóru (vlákno 13063) upozornil, že pravidlo `/article.html /article 301!` může skončit nekonečným přesměrováním. Ověřený audit má toto chování v seznamu neověřeného („Nutno otestovat na draft deployi“), proto je test na náhledu povinný (krok 9).

**5. `lastmod` v sitemap neodpovídá změnám** (audit-seo #5, nasazeni #19).
- Rozložení `lastmod`: 232× 2026-09-29, 10× 2026-09-12, 2× 2026-09-27, 1× 2026-10-03 (`/spoluprace.html`). `/` má 2026-09-12.
- `index.html` přitom obsahuje `"uploadDate":"2026-09-15"` (ř. 47) a „Real job confirmed by the owner on 2026-09-27“ (ř. 1461, v `en.html` ř. 174).
- Všech 245 záznamů má `changefreq` a `priority`.
- Sitemap se podle auditu udržuje ručně (ověř ve zdroji).
- **Build:** komentář v živém `sw.js` (ř. 7–8) říká, že verzi service workeru razítkuje `scripts/build-site.mjs` do `dist/sw.js`. Publikovaný adresář tedy nejspíš není kořen repozitáře, ale sestavený `dist/` (ověř v kroku 2; počítají s tím i úkoly 07, 09, 10, 11 a 17).
- [Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): „ignores `<priority>` and `<changefreq>`“. `lastmod` používá, jen když je „consistently and verifiably accurate“. Má odrážet poslední významnou změnu (hlavní obsah, strukturovaná data, odkazy), ne např. rok v copyrightu.

## Cíl (měřitelný)
1. **Jedna adresa na stránku.** Adresa stránky je cesta, kterou Netlify vrací bez přesměrování: `x.html` → `/x`, `x/index.html` → `/x/`, `index.html` → `/`. Canonical, `og:url`, `<loc>` a `xhtml:link` v sitemap, hreflang, BreadcrumbList, `url` v JSON-LD a interní odkazy (HTML, JS, JSON) používají jen tuto podobu. `node scripts/kontrola-adres.mjs` → 0 nálezů.
2. **Na náhledu:**
   - každá URL ze sitemap vrátí 200 bez přesměrování,
   - každá stará podoba (`/x.html`, `/index.html`, `/…/index.html`) vrátí právě jeden 301 na kanonickou adresu, cíl vrací 200 a query string se zachová,
   - výjimka je přípustná jen pro typ pravidla, u kterého Netlify prokazatelně vytvoří smyčku. Musí být doložená výstupem `curl` v hlášení.
3. **Generovaná sitemap** (fáze B): `sitemap.xml` vytváří skript. Obsahuje jen indexovatelné stránky, jejichž canonical je jejich vlastní adresa. `lastmod` se mění jen při změně obsahu stránky, ne při změně CSS. `--kontrola` → kód 0.
4. **netlify.app** (jen po potvrzení majitele): `https://tourmaline-dasik-9de005.netlify.app/<cesta>` → 301 na `https://hspg.cz/…`. Ověří se po schváleném produkčním nasazení. Bez potvrzení se nic nemění a hlášení uvádí „čeká na majitele“.
5. **Nic jiného se nemění:** texty, vzhled, `title`, `description`, struktura JSON-LD, okresní adresy, `robots.txt` a formuláře. Diff HTML obsahuje jen změny adres (test v Ověření).

## Rozsah (ANO / NE výslovně)
**ANO:**
- adresy v canonical, `og:url`, hreflang, BreadcrumbList a `url` v JSON-LD všech `x.html` stránek: 9 z tabulky, `zaruka.html` z úkolu 05, pokud existuje, a všechny další, které najde krok 2. Pokud adresu vkládá generátor, oprav generátor,
- odkazy na `.html` v JS a JSON podle tabulky v části Proč a přegenerování `assets/hbot-znalosti.json`,
- `sitemap.xml`: ve fázi A ruční oprava adres, ve fázi B generátor a `content/lastmod.json`,
- generovaný blok pravidel 301 v `_redirects`,
- knihovna `scripts/lib/adresy.mjs`, skripty `scripts/kontrola-adres.mjs`, `scripts/build-presmerovani.mjs`, `scripts/build-sitemap.mjs` a `scripts/over-adresy.mjs`,
- testy, zařazení generátorů do build příkazu a sekce v `CLAUDE.md`,
- pokud se `PUB` sestavuje (`build-site.mjs` → `dist/`) a build nekopíruje `_redirects` nebo `sitemap.xml`: jen doplnění tohoto kopírování (krok 2),
- pravidlo pro hostitele netlify.app, jen po potvrzení majitele (krok 17).

**NE (patří jinam):**
- okresní adresy `/cisteni-*/<okres>/`, jejich slučování, mazání a 301 na krajské huby → **úkol 12**. Tady zůstávají beze změny a dostávají jen obecné pravidlo pro `…/index.html`, které úkol 12 respektuje,
- viditelné drobečky, struktura JSON-LD (`@id`, LocalBusiness, JobPosting), `title`, `description` a OG obrázek → **úkol 11**. Tady se mění jen hodnota adresy,
- `robots.txt` (včetně `Disallow: /rd-control-panel/`) a hlavičky `X-Robots-Tag` → **úkoly 11 a 15**. `robots.txt` tu neměň,
- `Cache-Control` a otisky souborů → **úkol 07**,
- spouštění kontrol v CI a kontrola po nasazení → **úkol 19** (tady jen skripty, které CI zavolá),
- monitoring dostupnosti → **úkol 15**,
- hlavička, patička a menu (`navigace.json`) → **úkol 08**. Odkazy už jsou v kanonické podobě, 08 ji jen dodrží,
- text zásad a obsah lišty cookies → **úkoly 09 a 10**. Tady se mění jen adresa odkazu v `souhlas.js`,
- Search Console, Seznam Webmaster a odeslání sitemap → majitel nebo Claude v Chrome (C7),
- nastavení projektu Netlify: Pretty URLs, domény, přesměrování www, HSTS, přejmenování projektu. **Neměnit**, platí okamžitě pro produkci,
- stránka 404: `/404` i `/404.html` vracejí 200, mají noindex a nejsou v sitemap. Beze změny, jen návrh do hlášení,
- `http://www.hspg.cz/…` → 2 skoky (https, pak apex) jsou standard kvůli HSTS. Beze změny,
- MX, DNS, produkční nasazení mimo schválenou dávku.

## Postup

### Fáze A – jedna podoba adres a 301 (ověřeno na náhledu)
1. **Větev `ukol-06-jedna-adresa` z aktuální `main`:** `git fetch`, `git switch main`, `git pull --ff-only`, `git switch -c ukol-06-jedna-adresa`. Pak `git -C ../hspg-balicek pull`.
   - Do hlášení zapiš, které úkoly jsou v `main` (`git log --oneline -30`), zvlášť 01 (existuje `assets/hbot-panel.js`), 04 (`reklamace/index.html`), 05 (`zaruka.html`), 17 (`offline/index.html`, změny `sw.js`), 09, 11, 12 a 13.
   - Pokud je sloučená fáze B úkolu 12 (301 okresních stránek na huby), **zastav se a nahlas to**, protože pořadí neodpovídá `PORADI.md`.

2. **Najdi v repozitáři soubory, které generují:**
   - publikovaný adresář a build příkaz (`netlify.toml` → `[build] publish` a `command`, `package.json` → `scripts`) a způsob nasazení (`scripts/nasadit.mjs` nasazuje adresář přes `--dir` bez buildu na Netlify),
   - **zdroj × výstup:** existuje `scripts/build-site.mjs` a publikuje se sestavený `dist/` (viz Proč, bod 5)? Je `dist/` v `.gitignore`? Kopíruje build `_redirects`, `_headers`, `sitemap.xml` a `robots.txt` ze zdroje do výstupu, nebo je vytváří? Dál v zadání platí:
     - `SRC` = verzovaný zdroj stránek (dnes nejspíš kořen repozitáře). Generátory z tohoto úkolu čtou stránky ze `SRC` a zapisují **verzované** soubory ve `SRC` (`_redirects`, `sitemap.xml`, `content/lastmod.json`). `git log` se ptá na zdrojový soubor. Do `dist/` nic ručně nepiš.
     - `PUB` = publikovaný adresář z `netlify.toml`. Pokud je `PUB` = `SRC` (publish `.`), obojí splývá.
     - Pokud se `PUB` sestavuje, generátory zařaď do build příkazu **před** kopírování do `PUB` a ověř, že build `_redirects` a `sitemap.xml` do `PUB` zkopíruje beze změny (jinak kopírování doplň v `build-site.mjs`, nic jiného v něm neměň). Pokud některé stránky vznikají až v `PUB` a ve zdroji nejsou, zapiš je do hlášení a generátory nad nimi spusť stejně (stránka mimo Git dostane při prvním běhu dnešní datum, krok 13),
   - canonical, `og:url`, hreflang a JSON-LD:
     - ručně psané stránky (`*.html` v kořeni, `akce/`, `pravidla-akce/`, `recenze/`, `reel/` …),
     - šablona `scripts/build-regions.mjs` (232 stránek s `data-gen="build-regions"`),
     - `scripts/build-zaruka.mjs` (úkol 05) a stránky z úkolu 04 (`reklamace/`),
   - `sitemap.xml` (ručně, nebo generátor?) a `robots.txt`,
   - pravidla přesměrování a hlaviček: `_redirects` a `_headers` ve zdroji i v publikovaném adresáři, `netlify.toml` (`[[redirects]]`, `[[headers]]`). Zjisti, jak je směrováno `/api/*`: pravidlem, nebo `config.path` ve funkcích. Zapiš i cesty, kterým pravidla hlaviček posílají `X-Robots-Tag: noindex` (krok 3, `jeIndexovatelna`),
   - cíle formulářů a `fetch` (v mirroru: `fetch('/')`, `fetch(location.pathname)` na `/akce/`, `action='/akce/dekujeme/'`, `action='/recenze/?odeslano=1'`),
   - všechny výskyty adres s `.html` mimo komentáře:
     ```bash
     git grep -nE "hspg\.cz/[A-Za-z0-9/_-]+(\.html|/index\.html)" -- . ':!node_modules' ':!*.md'
     git grep -nE "[\"'(=]/[A-Za-z0-9/_-]+(\.html|/index\.html)" -- '*.html' 'assets/' 'content/' 'netlify/' 'sw.js' '*.webmanifest' ':!node_modules'
     git grep -n "netlify\.app" -- . ':!node_modules'
     ```
     Výsledek porovnej s tabulkami v části Proč a rozdíly zapiš do hlášení (nálezy navíc i výskyty, které už neexistují). Komentáře s názvem souboru nejsou odkazy, např. `assets/svj-podklad.js` ř. 1 „…on kalkulacka-svj.html“ nebo komentáře v `assets/en-sections.*`. Odkazy na `/404.html` (`sw.js`) jsou povolená výjimka.
   - testovací infrastrukturu (`tests/`, `npm test`) a HTML parser v `package.json` (např. `cheerio`, `node-html-parser`).

3. **Pravidlo adres.** Zapiš ho do `CLAUDE.md` (už ve fázi A, krok 12; fáze B sekci doplní v kroku 18) a do knihovny:

   | Soubor v publikovaném adresáři | Kanonická adresa | Stará podoba → 301 |
   |---|---|---|
   | `index.html` | `https://hspg.cz/` | `/index.html` |
   | `x.html` (např. `cenik.html`, `zaruka.html`) | `https://hspg.cz/x` | `/x.html` |
   | `x/index.html`, `a/b/index.html` | `https://hspg.cz/x/`, `https://hspg.cz/a/b/` | `/x/index.html`, `/a/b/index.html` |

   Proč `/x` bez `.html`:
   - 785 interních odkazů už vede na `/x` a ostatní interní odkazy mají stejnou logiku. Varianta s `.html` by vyžadovala změnit 785 odkazů,
   - Netlify vrací `/x` bez přesměrování a `/x/` sám přesměruje na `/x`,
   - adresáře zůstávají s lomítkem, tak je Netlify vrací a tak už jsou v sitemap (234+ URL).

   Strukturu souborů neměň, tedy žádné přesouvání `cenik.html` → `cenik/index.html` (změnila by se adresa).

   **Knihovna `scripts/lib/adresy.mjs`** (bez závislostí na síti):
   - `ZAKLAD = "https://hspg.cz"`,
   - `cestaZeSouboru(rel)` → `/`, `/cenik`, `/akce/`, `/cisteni-strech/kolin/`,
   - `nactiStranky(adresar = SRC)` vrátí pole `{ soubor, cesta, url, robots, canonical, ogUrl, hreflang[], jsonLdUrl[] }` pro všechna `*.html` v zadaném adresáři (zdroj, nebo po buildu `PUB`). Přeskočí `node_modules/`, `assets/`, `media/`, `dist/` (při čtení zdroje), `tests/`, `docs/`, `scripts/`, skryté složky (`.netlify/`, `.nahled/` z úkolu 12) a další složky, které nejsou stránky (ověř),
   - `jeIndexovatelna(stranka)` vrátí `false` při `noindex` v meta robots, při `X-Robots-Tag: noindex` z pravidel hlaviček (krok 2), u `404.html` a u interních cest `/ai-centrum/` a `/rd-control-panel/`. Seznam interních cest je pojistka pro případ, že by z nich meta zmizela.

4. **Oprava stránek.** Nahraď absolutní adresy s `.html` podle pravidla. Měň jen hodnotu adresy, nic jiného na řádku:
   - canonical a `og:url` na 9 stránkách, na `zaruka.html` a na dalších `x.html` z kroku 2,
   - `hreflang="en"` v `index.html` a `en.html` → `https://hspg.cz/en`,
   - `item` v BreadcrumbList (6 stránek) a `"url"` v JSON-LD `en.html`,
   - viditelný text odkazu v `nabidka-svj.html` („hspg.cz/cenik.html“ → „hspg.cz/cenik“). Ostatní text věty neměň,
   - pokud adresu vkládá generátor (např. `build-zaruka.mjs` do `zaruka.html`), oprav zdroj a výstup přegeneruj. Vygenerované výstupy ručně neupravuj.

5. **Odkazy v JS a JSON.** Odstraň `.html`, kotvy a query zachovej:

   | Soubor | Staré | Nové |
   |---|---|---|
   | `index.html` (průvodce, souhlas) | `/ochrana-osobnich-udaju.html` | `/ochrana-osobnich-udaju` |
   | `assets/souhlas.js` | `/ochrana-osobnich-udaju.html#cookies` | `/ochrana-osobnich-udaju#cookies` |
   | `content/hbot-faq.json` | `/cenik.html`, `/cenik.html#sentinel`, `/nabidka-svj.html` | `/cenik`, `/cenik#sentinel`, `/nabidka-svj` |
   | `assets/hbot-panel.js` | `/ochrana-osobnich-udaju.html` | `/ochrana-osobnich-udaju` |
   | `netlify/lib/ai/pravidla.mjs` | „odkazy jako hspg.cz/cenik.html“ | „odkazy jako hspg.cz/cenik“ |
   | `assets/hbot.js` (jen pokud 01 není sloučený) | 4× `.html` | bez `.html` |

   - Pak spusť `node scripts/build-hbot.mjs` (přegeneruje `assets/hbot-znalosti.json`) a `node scripts/build-hbot.mjs --kontrola`.
   - Pokud cílová stránka nemá kotvu `#cookies` nebo `#sentinel`, nic nevymýšlej. Zapiš to do hlášení; kontrola v kroku 7 to vypíše jako varování.
   - Pokud odkaz mezitím upravil úkol 09, 10 nebo 13, změň jen adresu.

6. **Sitemap ve fázi A** (ruční oprava, aby byl každý nasaditelný stav konzistentní; generátor přijde ve fázi B):
   - nahraď 8× `<loc>` s `.html` a 2× `xhtml:link hreflang="en"` (`/en.html` → `/en`),
   - `lastmod` ve fázi A neměň,
   - pokud existují `/zaruka` (05) a `/reklamace/` (04), musí být v sitemap právě jednou a v kanonické podobě,
   - pokud sitemap generuje skript (krok 2), oprav zdroj a přegeneruj. Opravuj verzovaný `sitemap.xml` ve `SRC`, ne kopii v `dist/`.

7. **Kontrola offline `scripts/kontrola-adres.mjs [adresář]`** (výchozí `SRC`; po buildu ji jde spustit i nad `PUB`). Při nálezu skončí kódem 1 a vypíše `soubor:řádek – co`. Na konci vždy vypíše souhrn `stránek N, indexovatelných M, nálezů K, varování V` (M používají akceptační kritéria). Kontroluje:
   - každá stránka s canonical: canonical = `ZAKLAD + cestaZeSouboru(soubor)`. Indexovatelná stránka canonical mít musí,
   - `og:url` = canonical, kde `og:url` je,
   - hreflang a adresy v JSON-LD (`url`, `item`, `@id` bez fragmentu), které míří na hspg.cz, jsou kanonické adresy existujících stránek. Tedy žádné `.html`, žádné `/index.html` a u adresáře koncové lomítko,
   - hreflang je vzájemný (cs ↔ en, x-default),
   - interní odkazy (`href`, `action` v HTML) a řetězce začínající `/` v `assets/*.js`, `sw.js`, `content/*.json` a `netlify/**/*.mjs`: žádný nemíří na `.html` ani `/index.html`, jedinou výjimkou je `/404.html`. Odkaz na stránku vede na existující kanonickou adresu (`/assets/`, `/media/` a `/api/` přeskoč),
   - kotva v odkazu na jinou stránku existuje jako `id` na cílové stránce. Jen varování, kotvu může vytvářet JS,
   - sitemap: množina `<loc>` = kanonické URL indexovatelných stránek, bez duplicit a bez stránek s noindex. `xhtml:link` odpovídá hreflang na stránkách,
   - komentáře (`<!-- -->`, `/* */`, `//`) se nekontrolují.

8. **Přesměrování – generovaný blok v `_redirects`.** `scripts/build-presmerovani.mjs` zapíše blok mezi značky do verzovaného `_redirects` ve `SRC`, který build kopíruje do `PUB` (krok 2; při `PUB` = `SRC` je to tentýž soubor). Pokud soubor neexistuje, vytvoří ho. Seznam stránek bere ze `SRC` a ze stránek, které vznikají až v buildu (krok 2). Pravidla v `_redirects` Netlify zpracuje před `netlify.toml` a vyhrává první shoda ([dokumentace](https://docs.netlify.com/manage/routing/redirects/overview/#rule-processing-order)). Ruční pravidla, která web má v `netlify.toml`, nech tam.
   ```
   # >>> adresy – generuje scripts/build-presmerovani.mjs (úkol 06), needitovat ručně
   /cenik.html              /cenik              301!
   /en.html                 /en                 301!
   …                        (jedno pravidlo pro každý x.html, abecedně)
   /index.html              /                   301!
   /:a/index.html           /:a/                301!
   /:a/:b/index.html        /:a/:b/             301!
   # <<< adresy
   ```
   - `!` je nutný. Soubor na staré cestě existuje a bez `!` by Netlify vrátil soubor a pravidlo by se neuplatnilo ([shadowing](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/#shadowing)).
   - Pravidla `x.html` generuj pro všechna `*.html` kromě `index.html` v jakékoli hloubce (`/a/x.html` → `/a/x`). **Vynech** `404.html` (Netlify ho používá pro neexistující adresy), ověřovací soubory (`google*.html` apod.) a soubory, které nejsou stránky. Seznam vynechaných dej do hlášení.
   - Počet úrovní `/:a/…/index.html` odvoď z nejhlubšího `index.html` ve výstupu (dnes 2).
   - **Umístění bloku:**
     - **za** konkrétní ruční pravidla, např. `/reklamace.html /reklamace/ 301` z úkolu 04,
     - **za** budoucí blok úkolu 12 pro okresní stránky, aby okresní `…/index.html` šly jedním skokem na hub,
     - **před** jakékoli obecné pravidlo se splatem (`/*`).
   - Text mimo značky generátor nemění.
   - `--kontrola`: nic nezapíše a skončí kódem 1, pokud by se blok změnil.
   - Zařaď do build příkazu za všechny generátory HTML (`build-regions`, `build-ceny`, `build-zaruka`, `build-kontakty` …, podle toho, co existuje).

9. **Test smyčky na náhledu (povinný, náhled je zdarma).**
   - Spusť build, `node scripts/kontrola-adres.mjs`, commitni, pak `npm run nahled` (tedy `node scripts/nasadit.mjs`). Výsledek je adresa náhledu `N`.
   - Spusť `node scripts/over-adresy.mjs "$N"` (krok 10) a ručně tři typy pravidel:
     ```bash
     for p in /cenik.html /index.html /cisteni-strech/kolin/index.html "/cenik.html?utm_source=test"; do
       curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $p\n" "$N$p"; done   # → 301 na /cenik, /, /cisteni-strech/kolin/, /cenik?utm_source=test
     for p in /cenik / /cisteni-strech/kolin/; do
       curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $p\n" "$N$p"; done   # → 200 bez přesměrování (žádná smyčka)
     curl -sL --max-redirs 3 -o /dev/null -w '%{http_code} %{num_redirects}\n' "$N/cenik.html"   # → 200 1
     ```
   - **Pokud některý typ pravidla vytvoří smyčku** (`/x` nebo `/` vrací 301 samo na sebe, nebo `--max-redirs` skončí chybou):
     - tento typ z bloku vyřaď přepínačem generátoru (např. `PRAVIDLA = { html, indexKoren, indexAdresare }`), nasaď nový náhled a ověř,
     - kanonickou podobu pak zajistí canonical, sitemap a odkazy. Ověřený audit to označuje za hlavní a postačující krok,
     - jinou techniku (edge funkce, přepnutí Pretty URLs, přesun souborů) nezaváděj. Jen ji navrhni v hlášení i s dopadem na kredity (edge funkce = vyvolání při každém požadavku na danou cestu).
   - Pokud placeholdery `/:a/index.html` nefungují (vrací 200 nebo 404 místo 301), zkus explicitní pravidlo pro každý adresář (generátor je umí vypsat). Výsledek zapiš.
   - **Formuláře:** nic neposílej metodou POST. Pravidla přesměrování nerozlišují metodu, takže GET na `/`, `/akce/`, `/recenze/` a `/akce/dekujeme/` (200 bez přesměrování) pokryje i cíle formulářů. Test v kroku 11 navíc ověří, že žádný cíl formuláře ani `fetch` ve zdroji nemíří na podobu, kterou blok přesměrovává.

10. **Kontrola online `scripts/over-adresy.mjs <základní URL> [--pub <adresář>] [--soubezne 3]`.** Jen GET, výchozí souběh 3. Tělo odpovědi čte jen u stránek kvůli canonical, jinak ho zahodí (`res.body.cancel()`).
    - Načte `<základ>/sitemap.xml`. Každou `<loc>` přepíše na základní URL a ověří: 200, žádné přesměrování, canonical v HTML = původní `<loc>`.
    - Seznam stránek vezme z publikovaného adresáře (stejná knihovna), ne natvrdo:
      - `x.html`: `/x.html` → 301, `location` (vyřešená vůči URL požadavku) má stejný host a cestu `/x`, cíl vrací 200 bez dalšího přesměrování. `/x/` → 301 `/x` (nativně Netlify),
      - adresář: `/…/index.html` → 301 `/…/` → 200. `/…` bez lomítka → 301 `/…/`,
      - `/index.html` → 301 `/`,
      - stránky mimo sitemap (noindex: `/reference`, `/recenze/`, `/reel/`, `/akce/dekujeme/` …): 200 na kanonické adrese a 301 ze staré podoby.
    - Query string: `/cenik.html?utm_source=test` → `/cenik?utm_source=test` (Netlify ho u 301 předává, [dokumentace](https://docs.netlify.com/manage/routing/redirects/redirect-options/#query-parameters)).
    - Neexistující adresa vrací 404.
    - Souhrn: počty OK a chyb podle typu, seznam chyb, kód 1 při chybě.
    - Jeden běh je asi 750 požadavků a asi 8 MB, tedy řádově desetiny kreditu. Spouštěj ručně, ne ve smyčce.

11. **Testy** (`node:test` nebo rámec webu, fixtury v dočasné složce):
    - `cestaZeSouboru` pro všechny tři typy a hloubky,
    - `kontrola-adres.mjs` nad fixturou:
      - najde: canonical s `.html`, `og:url` ≠ canonical, breadcrumb s `.html`, odkaz `/x.html` v JS, `/index.html`, nevzájemné hreflang a stránku s noindex v sitemap,
      - čistá fixtura → kód 0,
      - komentář s `x.html` → bez nálezu,
    - `build-presmerovani.mjs`:
      - blok má pravidlo pro každý `x.html`, `/index.html` a úrovně podle hloubky, nemá ho pro `404.html`,
      - ruční pravidla mimo značky se nezmění,
      - druhý běh nic nezmění,
      - po přidání stránky skončí `--kontrola` kódem 1,
    - cíle formulářů a `fetch` ve zdroji nejsou přesměrovávané podoby,
    - celý web: `kontrola-adres.mjs` nad `SRC` (a po buildu nad `PUB`, pokud se liší) → 0 nálezů.

12. **`CLAUDE.md` a hlášení fáze A.** Zapiš sekci „Adresy (úkol 06)“ s body z kroku 18, které platí už po fázi A (pravidlo adres, zákaz `.html` a `/index.html`, umístění ručních pravidel, příkazy `kontrola-adres.mjs` a `over-adresy.mjs`). Pak hlášení (viz Hlášení). Fáze B nečeká na majitele (kromě kroku 17), začni ji po hlášení.

> Pokud celou fázi A v jednom sezení nestihneš, rozděl ji: **A1** = kroky 1–7, z kroku 11 testy knihovny a kontroly a sekce v `CLAUDE.md` (jen soubory, žádná nová pravidla přesměrování, dá se sloučit samostatně). **A2** = kroky 8–10 a zbylé testy z kroku 11 (přesměrování a test na náhledu). Po A1 podej hlášení s výsledkem kontroly a pushni větev.

### Fáze B – generovaná sitemap s pravdivým `lastmod`, netlify.app
13. **`content/lastmod.json` a otisk obsahu.** Pro každou indexovatelnou stránku se ukládá `{ "otisk": "sha256:…", "datum": "RRRR-MM-DD" }`. Klíčem je cesta, klíče jsou seřazené.
    - **Otisk** = SHA-256 normalizovaného textu (sloučené mezery) z těchto částí:
      - `<title>`, meta description, meta robots a canonical,
      - každý blok JSON-LD (`JSON.parse` → `JSON.stringify`),
      - viditelný text `<body>` bez `<script>`, `<style>`, `<template>` a komentářů, bez roku v „© RRRR“,
      - seznam `href` odkazů v `<body>` (podle Googlu jsou odkazy významná změna).
    - Do otisku nepatří CSS (inline ani soubory), skripty, atributy `class` a `style` ani pořadí atributů.
    - **Datum:**
      - stránka bez záznamu (první běh nebo nová stránka) → `git log -1 --format=%cs -- <zdrojový soubor ve SRC>`. Pokud soubor není v Gitu nebo má necommitnuté změny → dnešní datum (Europe/Prague),
      - změněný otisk → dnešní datum,
      - stejný otisk → datum zůstává.
    - Pro testy umožni podstrčit „dnes“ proměnnou (např. `SITEMAP_DNES=2026-10-10`).
    - Pokud historie Gitu začíná zálohou z úkolu 00, dostanou stránky při prvním běhu datum posledního commitu souboru. Je to horní odhad, ne vymyšlené datum, a další změny už budou přesné. Uveď to v hlášení.

14. **`scripts/build-sitemap.mjs`** (používá `scripts/lib/adresy.mjs`):
    - zahrne jen indexovatelné stránky, jejichž canonical je jejich vlastní adresa. Indexovatelná stránka s jiným nebo chybějícím canonical → chyba (kód 1), ne tiché vynechání,
    - `<loc>` = kanonická URL, `<lastmod>` z `content/lastmod.json`, `xhtml:link` ze značek hreflang na stránce (dnes `/` a `/en`),
    - `changefreq` a `priority` vynech (Google je ignoruje),
    - pořadí: `/` první, pak abecedně. Výstup je deterministický,
    - `--kontrola`: nic nezapíše a skončí kódem 1, pokud by se změnil `sitemap.xml` nebo `content/lastmod.json`,
    - zapisuje verzovaný `sitemap.xml` ve `SRC` (build ho zkopíruje do `PUB`, krok 2),
    - zařaď ho do build příkazu jako poslední generátor, za `build-presmerovani` (za nimi smí být už jen kopírování do `PUB`). `robots.txt` (řádek `Sitemap:`) neměň,
    - úkol 12 bude sitemap měnit jen přes tento generátor. Stránky s noindex nebo bez souboru v sitemap nebudou.

15. **Testy fáze B:**
    - změna jen `<style>` nebo `class` → otisk i datum zůstanou. Změna textu, ceny v textu, JSON-LD nebo odkazu → datum = podstrčený dnešek,
    - nová stránka → datum z `git log` (fixtura s dočasným repozitářem), nebo dnešek, pokud není v Gitu,
    - stránka s noindex v sitemap není. Indexovatelná stránka s canonical jinam → kód 1,
    - `--kontrola` po změně textu → kód 1, po běhu generátoru → 0. Dva běhy za sebou nic nezmění,
    - celý web: množina `<loc>` = indexovatelné stránky podle `kontrola-adres.mjs`. Počet uveď v hlášení (dnes 245 + nové stránky z úkolů 04 a 05).

16. **Náhled:** `npm run nahled`, znovu `node scripts/over-adresy.mjs "$N"` a `curl -s "$N/sitemap.xml"`.

17. **netlify.app → hspg.cz (jen po potvrzení majitele).**
    - **Proč opatrně:** pravidlo `https://tourmaline-dasik-9de005.netlify.app/* https://hspg.cz/:splat 301!` přesměruje na tomto hostiteli **všechno**, i `/api/*` a funkce. Externí služba, která volá funkci přes netlify.app (např. webhook Facebooku na `facebook-webhook`), by dostala 301 a webhook by přestal fungovat. Navíc ho nejde ověřit na náhledu, protože náhled má jiný hostitel.
    - **Agent:** do hlášení dej výsledek `git grep -n "netlify\.app"` a způsob směrování `/api/*` (krok 2).
    - **Majitel** potvrdí, že nic externího nevolá `tourmaline-dasik-9de005.netlify.app`. Callback URL webhooku najde v Meta for Developers → aplikace → Webhooks, zkontroluje i případné další služby. Pokud callback míří na netlify.app, majitel ho nejdřív přepne na stejnou cestu na `https://hspg.cz` a ověří, že webhook funguje.
    - **Teprve pak** přidej jako **první** řádek `_redirects`, mimo generovaný blok:
      ```
      # netlify.app → hspg.cz (úkol 06; potvrdil majitel <kdy, kde>)
      https://tourmaline-dasik-9de005.netlify.app/*  https://hspg.cz/:splat  301!
      ```
      Netlify tento zápis podporuje pro domény přiřazené k projektu ([domain-level redirects](https://docs.netlify.com/manage/routing/redirects/redirect-options/#domain-level-redirects)). Na náhledu ověř jen to, že dál vrací 200, tedy že pravidlo náhled nerozbilo.
    - **Ověření** až po schváleném produkčním nasazení v dávce: příkazy v Ověření. Pro `…netlify.app/cenik.html` jsou 2 skoky (host, pak `.html`), což je na duplicitním hostiteli přijatelné.
    - **Vrácení:** smazat řádek, náhled, schválené nasazení.
    - **Bez potvrzení** pravidlo nepřidávej a v hlášení uveď „čeká na majitele“. Kontrolu v CI po nasazení přidá úkol 19.

18. **`CLAUDE.md` – sekce „Adresy (úkol 06)“** (založená v kroku 12, tady ji doplň o body fáze B):
    - pravidlo adres (tabulka z kroku 3),
    - zákaz `.html` a `/index.html` v odkazech, meta a JSON-LD (výjimka `/404.html` v `sw.js`),
    - ruční pravidla přesměrování (přesun nebo zrušení stránky, návrhy z úkolů 15 a 18) patří do `_redirects` **nad** generovaný blok. U přesunuté stránky přidej i její staré podoby (`/x.html`, `/x/index.html`), aby vedly jedním skokem na nový cíl,
    - nová stránka = soubor podle pravidla a build (`build-presmerovani`, `build-sitemap`),
    - `lastmod` se ručně nepíše,
    - před commitem `node scripts/kontrola-adres.mjs`, na náhledu `node scripts/over-adresy.mjs <náhled>`,
    - pravidlo pro netlify.app a proč se netýká náhledů.

19. **Hlášení fáze B.**

## Akceptační kritéria
**Fáze A:**
- [ ] `node scripts/kontrola-adres.mjs` (zdroj) i `node scripts/kontrola-adres.mjs "$PUB"` (po buildu) → kód 0, `nálezů 0`. Souhrn (`stránek N, indexovatelných M`) a varování o kotvách jsou v hlášení.
- [ ] Oba `git grep` z Ověření (absolutní a relativní adresy s `.html` nebo `/index.html`, kromě `/404.html`) → nic.
- [ ] `sitemap.xml`: `grep -c '\.html'` → 0. `grep -o '<loc>' | wc -l` = M ze souhrnu `kontrola-adres.mjs` (uveď).
- [ ] `node scripts/build-presmerovani.mjs --kontrola` → kód 0. Blok má právě jedno pravidlo pro každý `x.html` (příkaz `awk` z Ověření = počet `x.html` stránek bez vynechaných, seznam vynechaných v hlášení) a žádné pro `404.html` (`grep -c` → 0).
- [ ] Pokud se `PUB` sestavuje: `cmp` z Ověření → `_redirects` a `sitemap.xml` jsou v `PUB` shodné se zdrojem.
- [ ] Na náhledu `node scripts/over-adresy.mjs "$N"` → 0 chyb (počty podle typu v hlášení). Jinak výjimka typu pravidla se smyčkou, doložená výstupem `curl`.
- [ ] Na náhledu `curl -sL --max-redirs 3 … "$N/cenik.html"` → `200 1`. `/`, `/akce/`, `/recenze/`, `/akce/dekujeme/`, `/cenik` a `/en` → 200 bez `location`.
- [ ] Diff HTML obsahuje jen změny adres: oba `git diff --word-diff` z Ověření (proti `git merge-base main HEAD`) → 0.
- [ ] `node scripts/build-hbot.mjs --kontrola` → aktuální. Pokud je sloučený 01: příkaz s `../hspg-balicek` z Ověření (`npm test` a `npm run test:e2e` proti webHSPGH) → vše prošlo.
- [ ] Testy úkolu i `npm test` webu prochází (uveď počty).
- [ ] `grep -n "Adresy (úkol 06)" CLAUDE.md` → 1 řádek (sekce z kroku 12).

**Fáze B:**
- [ ] `node scripts/build-sitemap.mjs --kontrola` → kód 0. `sitemap.xml` nemá `changefreq` ani `priority` (`grep -cE` → 0), nemá `.html` ani stránku s noindex (kontrola z fáze A → 0 nálezů). `grep -o '<loc>' | wc -l` = M (uveď).
- [ ] `node --test tests/sitemap.test.mjs` → fail 0. Testy pokrývají: změna jen CSS nezmění `lastmod`, změna textu, ceny, JSON-LD nebo odkazu ho nastaví na dnešek, generátor je idempotentní.
- [ ] Příkaz `node -e` z Ověření → `true true` (`/` má `lastmod` ≥ 2026-10-04 a žádné datum není v budoucnosti).
- [ ] `build-presmerovani` a `build-sitemap` jsou v build příkazu poslední generátory (za nimi jen kopírování do `PUB`; výpis příkazu z Ověření). Po buildu je `git status --porcelain` prázdný (výstup je commitnutý a aktuální; ignorovaný `dist/` se nepočítá).
- [ ] Na náhledu `over-adresy.mjs` → 0 chyb. `curl -s "$N/sitemap.xml" | grep -o '<loc>' | wc -l` = M.
- [ ] netlify.app: buď je potvrzení majitele citované v hlášení, pravidlo je první pravidlo v `_redirects` (`head -2 _redirects | grep -c netlify.app` → 1) a po produkčním nasazení `curl` ukazuje 301. Nebo je v hlášení „čeká na majitele“ a `grep -c "netlify\.app" _redirects` → 0.
- [ ] Sekce „Adresy (úkol 06)“ v `CLAUDE.md` obsahuje i body fáze B z kroku 18 (`lastmod`, `build-sitemap`, netlify.app).

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>                 # např. dist; při publish "." je PUB=.
npm run build                                          # nebo build příkaz z netlify.toml → bez chyby
node scripts/kontrola-adres.mjs                        # zdroj → „nálezů 0“, kód 0; souhrn „stránek N, indexovatelných M“ do hlášení
node scripts/kontrola-adres.mjs "$PUB"                 # výstup buildu → „nálezů 0“, kód 0
node scripts/build-presmerovani.mjs --kontrola         # → kód 0
node scripts/build-hbot.mjs --kontrola                 # (úkol 01) → aktuální
node --test tests/adresy.test.mjs                      # → pass N, fail 0
npm test                                               # → testy webu prošly (počty)
(cd ../hspg-balicek && npm test && HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta k Chromiu> npm run test:e2e)   # (úkol 01) → vše prošlo

# absolutní adresy s .html (včetně šablon ve scripts/) → nic
git grep -nE "hspg\.cz/[A-Za-z0-9/_-]+(\.html|/index\.html)" -- . ':!node_modules' ':!tests' ':!*.md' ':!scripts/*adres*' ':!scripts/build-presmerovani.mjs'
# relativní odkazy s .html v publikovaných souborech a funkcích → nic (/404.html je povolená výjimka)
git grep -nE "[\"'(=]/[A-Za-z0-9/_-]+(\.html|/index\.html)" -- '*.html' 'assets/' 'content/' 'netlify/' 'sw.js' '*.webmanifest' ':!node_modules' ':!tests' | grep -v '/404\.html'
grep -o "<loc>" sitemap.xml | wc -l; grep -c "\.html" sitemap.xml               # → M (ze souhrnu kontroly); 0
# blok přesměrování: počet pravidel x.html, žádné pro 404.html
sed -n '/^# >>> adresy/,/^# <<< adresy/p' _redirects | awk '$1 ~ /\.html$/ && $1 !~ /index\.html$/' | wc -l   # → počet x.html stránek bez vynechaných
sed -n '/^# >>> adresy/,/^# <<< adresy/p' _redirects | grep -c '^/404\.html'     # → 0
# jen pokud se PUB sestavuje (PUB ≠ .): build kopíruje generované soubory beze změny
cmp _redirects "$PUB/_redirects" && cmp sitemap.xml "$PUB/sitemap.xml"           # → bez výstupu
# diff HTML jen v adresách: každé odebrané slovo obsahovalo .html, žádné přidané .html neobsahuje
Z=$(git merge-base main HEAD)                          # jen změny této větve, i když se main mezitím posunula
git diff "$Z" --word-diff=porcelain -- '*.html' ':!tests' | grep -E '^-[^-]' | grep -vc '\.html'   # → 0
git diff "$Z" --word-diff=porcelain -- '*.html' ':!tests' | grep -E '^\+[^+]' | grep -c '\.html'   # → 0
grep -n "Adresy (úkol 06)" CLAUDE.md                   # → 1 řádek

N=<adresa náhledu z npm run nahled>
node scripts/over-adresy.mjs "$N"                      # → 0 chyb, počty podle typu
for p in /cenik.html /en.html /reference.html /index.html /akce/index.html /cisteni-strech/kolin/index.html "/cenik.html?utm_source=test"; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $p\n" "$N$p"; done          # → 301 na kanonickou podobu
for p in / /cenik /en /akce/ /recenze/ /akce/dekujeme/ /cisteni-strech/kolin/; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $p\n" "$N$p"; done          # → 200, prázdný redirect_url
curl -sL --max-redirs 3 -o /dev/null -w '%{http_code} %{num_redirects}\n' "$N/cenik.html"   # → 200 1
curl -s "$N/cenik" | grep -o '<link rel="canonical"[^>]*>'                         # → href="https://hspg.cz/cenik"
curl -s "$N/" | grep -o '<link rel="alternate" hreflang="en"[^>]*>'                # → href="https://hspg.cz/en"
curl -s "$N/sitemap.xml" | grep -c '\.html'                                        # → 0

# fáze B
node scripts/build-sitemap.mjs --kontrola              # → kód 0
node --test tests/sitemap.test.mjs                     # → pass N, fail 0
grep -cE "<changefreq>|<priority>" sitemap.xml         # → 0
grep -o "<loc>" sitemap.xml | wc -l                    # → M (ze souhrnu kontrola-adres.mjs)
grep -oE "<lastmod>[^<]+" sitemap.xml | sort | uniq -c # → rozložení dat do hlášení
node -e 'const d=JSON.parse(require("fs").readFileSync("content/lastmod.json","utf8"));const dnes=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Prague"}).format(new Date());console.log(d["/"].datum>="2026-10-04",Object.values(d).every(z=>z.datum<=dnes))'   # → true true
grep -nE '^\s*command' netlify.toml; npm pkg get scripts.build   # → build-presmerovani a build-sitemap jsou poslední generátory
npm run build && git status --porcelain                # → prázdné
grep -c "netlify\.app" _redirects                      # → 0 bez potvrzení majitele; s potvrzením: head -2 _redirects | grep -c netlify.app → 1
curl -s "$N/sitemap.xml" | grep -o '<loc>' | wc -l     # → M (na novém náhledu z kroku 16)

# až po schváleném produkčním nasazení (GET, jednou)
node scripts/over-adresy.mjs https://hspg.cz           # → 0 chyb
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://hspg.cz/cenik.html   # → 301 https://hspg.cz/cenik
# jen pokud je pravidlo pro netlify.app (krok 17):
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://tourmaline-dasik-9de005.netlify.app/       # → 301 https://hspg.cz/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://tourmaline-dasik-9de005.netlify.app/cenik  # → 301 https://hspg.cz/cenik
```

Testy, které agent přidá:
- **`tests/adresy.test.mjs`:**
  - knihovna `adresy.mjs`,
  - `kontrola-adres.mjs` nad fixturami,
  - `build-presmerovani.mjs` (blok, ruční pravidla, idempotence, `--kontrola`),
  - cíle formulářů a `fetch`,
  - kontrola celého zdroje (`SRC`) a po buildu i `PUB`.
- **`tests/sitemap.test.mjs`** (fáze B): otisk, datum, výběr stránek, `--kontrola`, idempotence.
- Skripty `scripts/kontrola-adres.mjs` a `scripts/over-adresy.mjs` jsou samostatně spustitelné, aby je mohlo volat CI (úkol 19) a monitoring (úkol 15).
- **Na náhledu i produkci jen GET**, souběh nejvýš 3, žádné odeslání formuláře.

## Bez AI / s AI
Úkol AI nevolá ani nemění její chování.
- **Bez AI:** H-BOT odkazuje z FAQ (`content/hbot-faq.json` → `assets/hbot-znalosti.json`) na kanonické adresy. Funguje stejně i při `AI_ZAPNUTO=0`.
- **S AI:** model dostává pokyn psát odkazy bez `.html` (`netlify/lib/ai/pravidla.mjs`). Když AI `.html` přesto napíše, odkaz díky 301 funguje.
- Ověř přes `node scripts/build-hbot.mjs --kontrola` a testy balíčku úkolu 01, bez volání API.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Jen adresy:** měníš hodnoty URL a pravidla přesměrování. Žádné změny textů, vzhledu, `title`, `description` ani struktury JSON-LD. Žádné nové tvrzení na webu (ani o SEO).
- **Okresní adresy beze změny** (úkol 12). Žádnou stránku nemaž a nepřidávej noindex.
- **Nastavení Netlify neměň:** Pretty URLs, domény, www, HSTS ani jiná nastavení projektu. Změny platí hned pro produkci. Vše se řeší soubory v repozitáři.
- **Nasazení** jen `node scripts/nasadit.mjs`: náhled zdarma, produkce jen po schválení majitelem a v dávce. Pravidlo pro netlify.app se dá ověřit až po produkčním nasazení, proto ho přidávej jen s potvrzením majitele (krok 17).
- **Na náhledu i produkci jen GET**, souběh nejvýš 3. Žádné POST ani odesílání formulářů (ani testovacích). `over-adresy.mjs` spouštěj ručně, ne ve smyčce.
- **`robots.txt` neměň.** Do sitemap nedávej stránky s noindex.
- **Generované výstupy** (okresní stránky, `hbot-znalosti.json`, `sitemap.xml` ve fázi B, blok v `_redirects`) ručně neupravuj. Uprav zdroj a přegeneruj.
- **Soubory úkolu 01** měň jen v rozsahu adres z tabulky v kroku 5 a zapiš je jako předávku pro balíček.
- **Žádná tajemství** v kódu, commitech ani hlášení. MX ani DNS se nemění.

## Hlášení po dokončení
Po **fázi A** i **fázi B** formát z `KONTEXT.md` §5 a k tomu:
- **výsledek kroku 2:**
  - kde jsou pravidla (`_redirects` / `netlify.toml`), build příkaz a publikovaný adresář,
  - `SRC` × `PUB`: zda existuje `scripts/build-site.mjs` a `dist/`, zda je `dist/` v `.gitignore`, co build kopíruje a které stránky vznikají až ve výstupu,
  - zda se sitemap generovala,
  - jak je směrováno `/api/*`,
  - výsledek `git grep netlify.app`,
  - nálezy navíc a výskyty, které už neexistují, proti části Proč,
- **tabulka před a po:** počty výskytů `.html` podle typu (canonical, `og:url`, hreflang, BreadcrumbList, `url` v JSON-LD, viditelný text, sitemap, odkazy v JS a JSON),
- **test smyčky:** výstup `curl` pro každý typ pravidla, co je v bloku a co bylo vyřazeno a proč. Seznam souborů vynechaných z pravidel (`404.html` …),
- **výstup `over-adresy.mjs`** (počty podle typu) a adresa náhledu,
- **fáze B:**
  - počet URL v sitemap a rozložení `lastmod` podle dat,
  - 3 ukázkové záznamy z `content/lastmod.json`,
  - poznámka k datu při prvním běhu,
- **netlify.app:** potvrzeno (kdo, kdy, citace) / čeká na majitele,
- **předávky:**
  - **07:** měř na kanonických adresách (`/cenik`, `/kalkulacka-svj` …).
  - **11:** URL v BreadcrumbList jsou kanonické. Viditelné drobečky a `@id` zůstávají na 11.
  - **12:**
    - blok úkolu 12 v `_redirects` patří **nad** blok úkolu 06,
    - sitemap měnit jen přes `build-sitemap.mjs`,
    - používej `cestaZeSouboru()`.
  - **19:**
    - v CI spouštět `kontrola-adres.mjs`, `build-presmerovani.mjs --kontrola` a `build-sitemap.mjs --kontrola`,
    - po nasazení `over-adresy.mjs https://hspg.cz` a kontrola 301 z netlify.app,
    - checkout s celou historií (`fetch-depth: 0`) kvůli `git log` v generátoru.
  - **15:** monitoring může volat `over-adresy.mjs`.
  - **Balíček:** `balicek/web` má stále odkazy s `.html` v `content/hbot-faq.json` (ř. 8, 30, 34), `assets/hbot-panel.js` (ř. 210) a `netlify/lib/ai/pravidla.mjs` (ř. 19). Navrhni opravu, aby se při dalším převzetí nevrátily. Testy balíčku `balicek/testy/e2e/hbot.test.mjs` (ř. 23, 156, 227) otevírají `/cenik.html` a `/en.html`. Server balíčku přesměrování nezná, takže fungují dál, ale navrhni sjednocení na `/cenik` a `/en`.
- **checklist pro majitele** (po schváleném produkčním nasazení; může provést Claude v Chrome v rámci C7):
  - [ ] Search Console: znovu odeslat `https://hspg.cz/sitemap.xml`, v kontrole URL zadat `https://hspg.cz/cenik` a požádat o indexování.
  - [ ] Po 2–4 týdnech: Search Console → Stránky, zda jsou `/cenik` a další hlavní stránky indexované (4. 10. byla v indexu jen úvodní stránka) a jakou kanonickou adresu u `/cenik` zvolil Google.
  - [ ] Krok 17: callback URL webhooku Facebooku a další služby volající netlify.app.
- **návrhy mimo rozsah:**
  - `/404` a `/404.html` vracejí 200 (noindex). Ponechat, nebo řešit v úkolu 15.
  - allowlist odkazů v H-BOT z kanonických adres (audit-ai #17, mapováno na úkol 01).
  - alternativa k pravidlům, která vytvořila smyčku (jen pokud nastala).
