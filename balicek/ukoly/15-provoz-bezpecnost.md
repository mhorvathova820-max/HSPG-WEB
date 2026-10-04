# Úkol 15: Provoz – kredity, monitoring, bezpečnostní hlavičky
> Priorita P1 · Závisí na: 00 (kroky s AI a formuláři potřebují sloučené úkoly 01 a 02, bez nich je přeskoč a nahlas) · Čeká na majitele: rozhodnutí o auto-recharge, založení uptime monitoru, adresa pro reporty DMARC a změny DNS u Wedosu (**MX neměnit**), souhlas s CAA a s HSTS preload, souhlas s odstraněním `holub-ai`, rozpočet produkčních nasazení, schválení produkce · Rozsah: **fáze A** = pojistka kreditů, dohled, sběr hlášení CSP a 404, `security.txt`, nic se nevynucuje → hlášení a stop. **Fáze B** (nejdřív 14 dní po produkčním nasazení fáze A) = vynucená CSP, odstranění `holub-ai`, další krok DMARC, rozhodnutí o HSTS preload. Stav zadání: v1, po bezpečnostním auditu se může zpřesnit (před začátkem `git -C ../hspg-balicek pull`).

## Proč (s důkazy)
Zdroje: `KONTEXT.md` §2, `audit-nasazeni_provoz.json` #10, #14, #17, #18, #22 a `audit-ai_integrace.json` #11, #14. Dále GET na https://hspg.cz, veřejné DNS a kopie živého webu (247 stránek), vše ze 4. 10. 2026.

**Kredity Netlify rozhodují o dostupnosti celého webu** (`KONTEXT.md` §2)
- Tarif má 1 000 kreditů na období (11. 9.–10. 10.). Zbývalo 426. Spotřeba: 32 produkčních nasazení × 15 = 480, přenos dat 77,9, požadavky 8,7, AI 7,1. Auto-recharge je vypnuté.
- **Po vyčerpání Netlify pozastaví projekty týmu** („Site not available“). Nefungují ani formuláře.
- Netlify posílá e-mail při 50, 75 a 100 % jen vlastníkovi týmu. Upozornění na 90 % ani týdenní přehled neexistují.
- `scripts/nasadit.mjs` (úkol 00) hlídá nejvýš 1 produkční nasazení denně. Rozpočet na celé období ale nehlídá. Při 1 nasazení denně by se za 30 dní spotřebovalo 450 kreditů.
- Odhad útraty AI v kreditech už vrací `/api/ai-stav` (`kredity.utraceno` / `kredity.limit`) a ukazuje ho panel majitele (úkol 01). Počítá se za kalendářní měsíc, období Netlify ale běží od 11. do 10.

**Dohled chybí** (audit-nasazeni_provoz #14, audit-ai_integrace #11 a #14)
- Zdravotní adresa neexistuje: `GET /api/health`, `/api/zdravi` i `/zdravi.txt` vrací 404 (ověřeno). Zda existuje externí uptime monitor, zvenku zjistit nejde.
- Stav AI v `/api/ai-stav` znamená jen „klíč existuje“ (`zapnuto: jeZapnuty(id, env)`). Neplatný klíč, vyčerpaný kredit (402) ani neexistující model se v něm neprojeví.
- `asistent.mjs` při selhání jen zapíše `console.warn`. Počty odpovědí AI, záložních odpovědí, chyb podle kódu ani latence se nikde neukládají.
- U formulářů není kontrola, že každé odeslání v Netlify Forms spustilo i upozornění (úkol 02 ji výslovně předává sem).
- 404 se nikde nezaznamenávají. Stránka 404 existuje a vrací správně stav 404 („Stránka nenalezena | HOLUB HSPG“).

**Hlavičky a DNS** (ověřeno `curl` a DNS dotazem 4. 10. 2026)

| Co | Stav | Nález |
|---|---|---|
| CSP | jen `content-security-policy-report-only`, **bez `report-uri` i `report-to`** | `script-src 'self' 'unsafe-inline' …`, takže ani v režimu Report-Only nehlásí inline skripty. `form-action 'self' https://formsubmit.co` (FormSubmit odstraňuje úkol 03). `img-src` nemá `blob:`, přitom `/akce/` vykresluje náhled fotky přes `URL.createObjectURL` (úkol 17, nález #15). Vynucená CSP chybí. |
| HSTS | `max-age=31536000; includeSubDomains`, bez `preload` | audit #22 (hstspreload.org: „preload missing“) |
| `/.well-known/security.txt` | **404** | audit #22, ověřeno |
| ostatní | `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP: same-origin`, `X-Permitted-Cross-Domain-Policies: none` | v pořádku, neměnit |
| DMARC | `v=DMARC1; p=none; adkim=r; aspf=r`, **bez `rua`** | politika nic nechrání ani neměří (audit #10) |
| SPF / MX | `v=spf1 include:spf.seznam.cz ~all`, MX `…mx1/mx2.emailprofi.seznam.cz` | pošta funguje, **MX neměnit** |
| CAA | žádný záznam | audit #17. Certifikát je podle auditu (CT log) od Let's Encrypt a platí do 5. 12. 2026. Obnovuje ho Netlify. |
| DNSSEC, HTTP→HTTPS | aktivní; `http://hspg.cz/` → 301 na `https://hspg.cz/` | v pořádku |

**Funkce na produkci** (GET bez přihlášení, ověřeno 4. 10. 2026; POST se netestoval)

| Adresa | Stav | Tělo |
|---|---|---|
| `/api/holub-ai` | 405 | `{"chyba":"Method Not Allowed"}` |
| `/api/rd-stav` | 405 | `{"chyba":"Method Not Allowed"}` |
| `/api/pocasi` | 400, s `?q=Praha` 200 | `{"chyba":"Zadejte prosím obec."}`, s obcí JSON s polem `dny` a `"zdroj":"Open-Meteo.com"`, `cache-control: public,max-age=1800` |
| `/api/sentinel/validate` | 400 | česká hláška o formátu kódu |
| `/api/webhooks/facebook` | 403 | `Forbidden` |
| `/api/asistent` | 404 | úkol 01 ještě není na produkci |

Odpovědi bez přihlášení jsou v pořádku a žádná neobsahuje výpis chyby (stack trace). Zdroj funkcí ale nikdo nekontroloval. Živý `assets/hbot.js` volá `/api/holub-ai` (kopie webu, ř. 184). Po úkolu 01 se volat přestane a funkce zůstane jako nepoužívaná veřejná adresa.

Počasí odpovídá ze zdroje Open-Meteo, takže klíč OpenWeatherMap zřejmě není potřeba. **Ověř ve zdroji funkce `pocasi`** (krok 3).

**Inventura pro CSP** (kopie webu, 247 stránek)
- Inline skripty s kódem jsou na 5 stránkách: `/` (43 682 znaků), `/kalkulacka-svj` (6 322), `/pas-domu` (7 371), `/akce/` (7 885) a `/recenze/` (5 072). Úkol 07 přesouvá inline JS homepage do souboru.
- Inline handler je 1: `onload="this.rel='stylesheet'"` u `holub-let.css` na `/`. Úkol 07 ho odstraňuje. Odkazy `javascript:` ani `eval`/`new Function` v `assets/*.js` nejsou.
- Bloků JSON-LD je 479. Nejsou spustitelné a `script-src` se na ně nevztahuje.
- Stylů je 745 bloků `<style>` a 481 atributů `style=""`. `style-src 'unsafe-inline'` proto v této fázi zůstává.
- Externí skripty jsou jen GTM a Clarity. Načítá je `assets/souhlas.js` až po souhlasu. `<iframe>` na webu není. Service worker `/sw.js` registruje `assets/souhlas.js`.

**Zálohy:** zdroj webu řeší úkol 00 (Git) a export a mazání Netlify Forms úkol 19. Výpis DNS zóny zálohovaný není (audit #13). Hodnoty proměnných prostředí jsou jen v Netlify.

## Cíl (měřitelný)
1. **Kredity:** týdenní kontrola ukáže čerpání období, počet produkčních nasazení a odhad AI v kreditech. Pro prahy 50 / 75 / 90 / 100 % platí určené kroky. `nasadit.mjs` odmítne produkci nad rozpočet období (výchozí 10 nasazení = 150 kreditů), výjimkou je jen `--nouzove`.
2. **Dostupnost:** externí monitor kontroluje `/zdravi.txt` každých 5 min a homepage a `/api/zdravi` každou hodinu. Zkušební výpadek doručí upozornění majiteli do mobilu. Monitoring stojí nejvýš ~6 kreditů za období.
3. **AI:** majitel vidí u každé AI semafor a za 24 h počty odpovědí AI, záložních odpovědí a chyb podle kódu a p95 latence. Při chybě 401, 402, 403 nebo 404 dostane push do 15 min (1× denně za typ). Kontrola stavu nespotřebuje žádné tokeny.
4. **Formuláře:** týdenní kontrola porovná počet ověřených odeslání v Netlify Forms s počtem spuštění `submission-created` a úspěšných kanálů. Každý rozdíl je v hlášení vysvětlený.
5. **Hlášení prohlížečů:** porušení CSP a návštěvy 404 se sbírají anonymně, jen jako počty. Týdenní přehled obsahuje top 10.
6. **Hlavičky:** fáze A = přísná kandidátní CSP v režimu Report-Only s reporty a `security.txt` (200, platné `Expires`). Fáze B = vynucená CSP po 14 dnech bez neočekávaných porušení, Playwright bez porušení, `/api/holub-ai` → 404.
7. **Pošta a DNS:** DMARC má `rua` (majitel) a do 8 týdnů `p=quarantine` bez ztráty legitimní pošty. HSTS preload jen s rozhodnutím majitele po inventuře subdomén. Týdenní kontrola hlásí každou změnu MX, SPF, DMARC, CAA a `www`.
8. **Žádná funkce nevrací stack trace** (test a kontrola zdroje). Žádná nová data neobsahují osobní údaje.

## Rozsah
**ANO:**
- knihovna provozních počítadel (Netlify Blobs `hspg-provoz`)
- měření a pasivní zdraví AI v `asistent.mjs`, `ai.mjs` a `ai-stav.mjs`, nová funkce jen pro majitele `/api/provoz-stav` a zobrazení v panelu majitele (`assets/hbot-majitel.js`)
- upozornění pushem
- počítadla v `submission-created.mjs` (jen počty)
- sběrné funkce `/api/csp-hlaseni` a `/api/chyba-404`, skript `assets/chyba-404.js` na stránce 404
- `/api/zdravi` a `/zdravi.txt`
- CSP z jednoho zdroje (generátor a `--kontrola`) včetně reportů, `security.txt`
- rozpočet období v `nasadit.mjs`
- týdenní skript `scripts/provoz-tyden.mjs`
- příručka `docs/provoz.md`, checklist pro majitele a doplnění `CLAUDE.md`
- testy a kroky do CI z úkolu 19
- ve fázi B vynucení CSP, odstranění `holub-ai` a HSTS `preload` (jen se souhlasem)

**NE:**
- Git, rotace hesel, zapnutí auto-recharge, MFA účtů → **úkol 00**, Claude v Chrome C1/C3 (zde jen připomínka v checklistu)
- chování H-BOT, FAQ, prompty, limity AI → **úkol 01** (zde jen měření bez změny odpovědí)
- obsah upozornění, předmět, Reply-To, kanály → **úkol 02** (zde jen počítání)
- odstranění FormSubmitu v kódu → **úkol 03** (zde jen kontrola `form-action` v CSP)
- `Cache-Control`, otisky souborů, přesun inline JS homepage, `publish = "dist"` → **úkol 07**
- lišta souhlasu, GA4/GTM, konverze → **úkol 10** (zde jen povolené hosty v CSP podle reportů)
- `robots.txt` a interní cesty v něm → **úkol 11**
- `/rd-control-panel/`, `rd-stav`, `sentinel-validate`, AI centrum → **úkol 14** (může převzít `/api/provoz-stav`)
- CI, export a mazání Netlify Forms, doba uchování → **úkol 19**
- přesměrování nalezených 404 → **úkol 06** (zde jen návrhy)
- jakákoli změna DNS. Dělá ji majitel u Wedosu (Claude v Chrome C8 ho může provést). **MX nikdy.** Blokace převodu domény → Chrome C8
- nové API klíče (Gemini, xAI, OpenWeatherMap) – **nezakládat**
- produkční nasazení bez schválení

## Postup

### Fáze A – dohled, sběr hlášení, pojistka kreditů (nic se nevynucuje)
1. **Větev `ukol-15-provoz-bezpecnost` z aktuální `main`** (`git fetch`, `git switch main`, `git pull`, `git switch -c ukol-15-provoz-bezpecnost`). Zapiš, které úkoly už jsou v `main` (`git log --oneline -30`). Bez úkolu 00 se zastav. Bez 01 vynech kroky 5–6, bez 02 krok 7 a nahlas to.
2. **Najdi v repozitáři soubory, které generují:**
   - hlavičky: `netlify.toml` (`[[headers]]`) a/nebo `_headers`. Kde je dnes CSP a HSTS a kde hlavičky `/ai-centrum/*` z úkolu 01?
   - publikační adresář a build (`[build] publish`, `command`, `package.json`). Po úkolu 07 může být `dist` a `npm run build`. Nové neveřejné soubory (`docs/`, `tests/`, konfigurace skriptů) nesmí skončit na webu.
   - zdroj stránky 404 (`404.html` nebo generátor)
   - adresář funkcí a zdroje všech funkcí: `facebook-webhook`, `holub-ai`, `pocasi`, `rd-stav`, `sentinel-validate`, `asistent`, `majitel`, `ai`, `ai-stav`, `submission-created`
   - `netlify/lib/ai/limity.mjs` (vzor práce s Blobs), `scripts/nasadit.mjs`, `.nasazeni-produkce.json`, `CLAUDE.md`
   - testy a CI (`.github/workflows/` z úkolu 19), exportní skript Netlify Forms z úkolu 19 a kam ukládá výstup

   Pokud se HTML generuje skriptem, měň generátor, ne výstup.
3. **Inventura (jen čtení, výsledek do hlášení):**
   - **Proměnné prostředí:** vypiš jména, která kód čte, např. `git grep -ohE "env\.[A-Z][A-Z0-9_]+|env\[[\"'][A-Z0-9_]+|Netlify\.env\.get\([\"'][A-Z0-9_]+" -- '*.js' '*.mjs' | sort -u`. Doplň jména skládaná za běhu (`CENA_<ID>_VSTUP`, `klic` v `POSKYTOVATELE`). Porovnej je se jmény nastavenými v Netlify. Seznam jmen ti dá majitel (snímek obrazovky), nebo použij výpis z CLI, který ukáže **jen klíče**. Pokud příkaz vypisuje i hodnoty, nepoužívej ho. Označ, co dodává Netlify AI Gateway (`ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_GEMINI_BASE_URL`, `OPENROUTER_*`) a co se nezakládá (klíče Gemini, xAI, OpenWeatherMap).
   - **Funkce `pocasi`:** ověř ve zdroji, že volá Open-Meteo bez klíče. Pokud čte proměnnou typu `OPENWEATHER*`, nahlas ji jako kandidáta na smazání (smaže majitel). Nic nezakládej.
   - **Výpis chyb:** ve zdroji všech funkcí najdi odpovědi, které vracejí `e.stack`, `String(e)`, `e.message` nebo `err` celé. U veřejných funkcí smí jít ven jen obecná česká hláška. U interních (`/api/ai`) smí jít zpráva poskytovatele bez stacku. Nálezy oprav a zapiš (soubor, řádek, co odešlo ven).
   - **`holub-ai`:** `git grep -n "holub-ai"` (po úkolu 01 zbude jen funkce sama, případně dokumentace) a `curl -s https://hspg.cz/assets/hbot.js | grep -c "holub-ai"`.
   - **CSP:** nový skript `scripts/csp-inventura.mjs`. Projde **publikovaný výstup** (ne šablony) a vypíše po stránkách:
     - inline skripty s kódem (SHA-256, velikost; `application/ld+json` a jiné nespustitelné typy vynech)
     - atributy `on*=`, odkazy `javascript:`
     - počty `<style>` a `style=""`
     - externí původy v `src`/`href`, `<iframe>`

     Porovnej výsledek se stavem v části Proč a rozdíly vysvětli.
   - **Subdomény:** veřejně ověř `www` (CNAME na Netlify). Majitele požádej o snímek seznamu DNS záznamů z Wedosu, je potřeba pro rozhodnutí o HSTS preload ve fázi B. Celou zónu zvenku vyjmenovat nejde.
4. **Knihovna `netlify/lib/provoz.mjs`** (vzor `limity.mjs`, úložiště `getStore({ name: "hspg-provoz", consistency: "strong" })`, v testech `pametoveUloziste`):
   - `pricti(ul, oblast, den, cesta, n = 1)` připočte k vnořenému počítadlu v klíči `<oblast>/<RRRR-MM-DD>`.
   - `zapisLatenci(ul, den, ms)` vede histogram v košících 0,5 / 1 / 2 / 3 / 4 / 6 / 8 / 10 / 12+ s. p50 a p95 se počítají z košíků.
   - `souhrn(ul, oblast, dny)` sečte posledních N dní.
   - Strop na klíč a den: nejvýš 300 různých položek, další se počítají jako `ostatni`.
   - Uchování 90 dní: při prvním zápisu dne smaž klíč téže oblasti starý 91 dní (jedno `delete`, bez výpisu úložiště).
   - **Pravidlo dat:** jen počty a kódy. Žádný text dotazu, IP, otisk IP, obsah formuláře, e-mail, telefon ani celá URL s query.
   - **Náhled vs. produkce:** sdílené úložiště webu (`getStore`) je společné pro náhledy i produkci. Zjisti, jak funkce pozná publikované produkční nasazení (`context.deploy.published` nebo `context.deploy.context`, ověř v dokumentaci Netlify Functions a na náhledu). Zápisy z jiného kontextu ukládej s předponou `nahled/`.
   - Souběžné zápisy můžou ztratit přírůstek. Pro dohled to stačí, v souhrnu ho označ jako „orientační“.
   - Chyba úložiště nikdy neshodí volající funkci (`try/catch`, `waitUntil`).
5. **Měření a pasivní zdraví AI** (audit-ai_integrace #14, #11). **Odpovědi a chování funkcí se nemění**, testy balíčku z úkolu 01 musí projít beze změny.
   - `asistent.mjs`: u každého POST zapiš do oblasti `ai`:
     - výsledek `rezim` (`ai`, `ai_overeno`, `predat`, `chyba`, `bez_ai` s důvodem `vypnuto` / `bez-klice` / `rozpocet`, `limit`)
     - u každého poskytovatele `ok` nebo kód chyby (`e.status`, jinak `timeout` / `sit`)
     - latenci celé odpovědi
   - `ai.mjs` (interní): jen `ok` a kód chyby poskytovatele, kvůli zdraví.
   - Zdraví poskytovatele ukládej do klíče `zdravi/<id>`: `posledni_ok` a `posledni_chyba { kod, cas }`. Semafor:

     | Stav | Kdy | Text pro majitele |
     |---|---|---|
     | šedá | AI nemá klíč nebo `AI_ZAPNUTO=0` | „vypnuto“ |
     | zelená | úspěch za 24 h a po něm žádná chyba 401/402/403/404 | „funguje“ |
     | oranžová | za 24 h bez provozu, nebo jen timeouty a 429 | „bez provozu“ / „pomalá odpověď“ / „limit poskytovatele“ |
     | červená | po posledním úspěchu chyba 401/403, 402 nebo 404 | „neplatný klíč nebo přístup“ / „vyčerpaný kredit“ / „model nedostupný – zkontroluj `<ID>_MODEL`“ (jméno proměnné z `POSKYTOVATELE`) |
   - `ai-stav.mjs`: k dosavadním polím (beze změny) přidej `zdravi` (semafor a text na poskytovatele) a `provoz` (souhrn 24 h a 7 dní: dotazy, podíl záložních odpovědí, chyby podle kódu, p50/p95). **Žádné volání AI**, test ověří 0 volání adaptérů.
   - `/api/provoz-stav` (nová funkce jen pro přihlášeného majitele, ověření přes `overPozadavek` jako `ai-stav`) vrátí souhrn 7 dní pro oblasti `ai`, `formulare`, `404` a `csp` (jen počty, top 10). Využije ji týdenní kontrola a později interní panel (úkol 14).
   - `assets/hbot-majitel.js`: u každé AI ukaž semafor a text a k tomu řádek „24 h: AI N · záložní N (x %) · chyby: 402×1 … · p95 x,x s“. Přidej i řádek „Provoz 7 dní: formuláře N · 404 N · CSP N“ z `/api/provoz-stav`. Zachovej styl karty, bez nových inline skriptů a bez nových závislostí.
   - Volitelně a nejvýš 30 min: tlačítko majitele „Ověřit teď“ přes bezplatný dotaz na informace o modelu (např. `models.retrieve`). Ověř na náhledu, zda ho Netlify AI Gateway podporuje. Pokud ne (404/405), krok vynech a nahlas. Generování textu jako test zdraví nepoužívej nikdy.
6. **Upozornění pushem** (`netlify/lib/upozorneni.mjs`):
   - Kanál je stejný jako v úkolu 02 (`NTFY_TEMA`, případně `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`). Funkci odeslání z `submission-created.mjs` přesuň do sdílené knihovny bez změny chování, testy úkolu 02 musí projít.
   - Spouštěče:
     - chyba poskytovatele 401/403/402/404
     - podíl záložních odpovědí > 20 % při ≥ 10 dotazech za den
     - útrata AI ≥ 80 % a ≥ 100 % `AI_MESICNI_LIMIT_KC`
   - Každý typ nejvýš 1× denně. Deduplikace je v klíči `upozorneni/<den>`. Timeout je 5 s a selhání nesmí ovlivnit odpověď návštěvníkovi.
   - Text zprávy: `[HSPG] AI: Claude – vyčerpaný kredit (402). H-BOT odpovídá z FAQ.` Žádný text dotazu ani osobní údaj. Bez nastaveného kanálu jen `console.warn`.
7. **Počítadla formulářů** v `submission-created.mjs`: oblast `formulare`, položky `<form_name>.prijato` a `<form_name>.<kanál>_ok` / `<kanál>_selhalo`. Nic z obsahu podání. Chování z úkolu 02 se nemění (200 i při chybě, kopie, směrování).

   Zjisti, jak dlouho Netlify na tarifu drží logy funkcí. Pokud méně než 7 dní, přidej do funkce `holub-ai` jen počítadlo volání podle metody (oblast `holub-ai`). Nic jiného v ní neměň. Slouží jako důkaz pro krok 21.
8. **Sběrné funkce** (jen POST, odpověď 204, žádné cookies, `cache-control: no-store`):
   - `/api/csp-hlaseni` přijme `application/csp-report` (pole `csp-report`) i `application/reports+json` (pole objektů `type: "csp-violation"`). Uloží jen tyto údaje:
     - direktivu (`effective-directive`)
     - režim (`disposition`)
     - původ blokovaného zdroje (jen `scheme://host`, případně `inline` / `eval` / `data` / `blob`)
     - cestu dokumentu bez query a fragmentu

     Hlášení ze `chrome-extension:`, `moz-extension:` a `safari-web-extension:` počítej zvlášť jako `rozsireni`.
   - `/api/chyba-404` přijme JSON jako `text/plain` (z `navigator.sendBeacon`). Uloží:
     - cestu (bez query a fragmentu, nejvýš 120 znaků; e-mailové adresy a číselné řetězce delší než 5 číslic nahraď `[x]`)
     - odkud: cestu u stejného webu, doménu u cizího (pravidlo jako v úkolu 02)
   - Společné limity obou sběračů:
     - tělo nejvýš 8 KB, jinak 413
     - jiná metoda než POST → 405
     - nejvýš 2 000 zápisů za den na sběrač, nad limit 204 bez zápisu
     - žádné zpracování IP
   - Ověř v dokumentaci Netlify (Rate limiting pro funkce), zda je limit požadavků na tarifu dostupný. Pokud ano, nastav ho v `config` obou sběračů: omezené požadavky pak funkci vůbec nespustí a nečerpají výpočet.
   - `assets/chyba-404.js` (soubor, žádný inline skript) vlož do stránky 404 s `defer`. Na jiných stránkách se nenačítá. Neukládá nic do prohlížeče.
9. **Zdravotní adresy:**
   - `/zdravi.txt` je statický soubor s textem `HSPG-OK` a hlavičkami `X-Robots-Tag: noindex` a `Cache-Control: no-cache`. Není v sitemap.
   - `/api/zdravi` (GET) vrací `{"ok":true}` s `cache-control: no-store`. Nevolá nic externího a nečte Blobs, takže ověřuje jen běh funkcí. Neprozrazuje verze ani proměnné.
10. **CSP z jednoho zdroje, režim Report-Only:**
    - `scripts/csp-politika.mjs` je jediné místo s direktivami a povolenými hosty a přepínačem `rezim: "report-only" | "vynutit"`.
    - `scripts/build-hlavicky.mjs`:
      - z publikovaného výstupu spočítá SHA-256 zbylých inline skriptů
      - zapíše hlavičku do souboru s hlavičkami mezi značky `CSP:START` / `CSP:END`
      - zapíše `Reporting-Endpoints: csp="/api/csp-hlaseni"`
      - `--kontrola` skončí kódem 1, pokud hlavička neodpovídá výstupu

      Pokud web má build (úkol 07), zařaď ho za něj.
    - Kandidát (ve fázi A **jen Report-Only**):
      ```
      default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self';
      script-src 'self' <sha256 zbylých inline skriptů> https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms;
      style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: <hosty měření z dnešní CSP>;
      connect-src 'self' <hosty měření z dnešní CSP>; font-src 'self'; media-src 'self'; frame-src 'none';
      worker-src 'self'; manifest-src 'self'; report-uri /api/csp-hlaseni; report-to csp
      ```
    - `form-action 'self'` jen pokud `git grep -n formsubmit` po úkolu 03 nic nenajde. Jinak `formsubmit.co` ponech a nahlas.
    - `blob:` v `img-src` jen pokud ho potřebují náhledy fotek (úkol 17).
    - Hosty měření přeber z dnešní hlavičky. Další přidej jen podle úkolu 10 a hlášení, nikdy obecné `https:` ani `*`.
    - Ověř na náhledu, zda Chrome přijme relativní adresu v `Reporting-Endpoints` (DevTools → Application → Reporting API). Pokud ne, použij absolutní adresu toho nasazení. `report-uri` s relativní cestou funguje i ve Firefoxu.
    - Ostatní bezpečnostní hlavičky ani HSTS ve fázi A neměň. Hlavičky `/ai-centrum/*` z úkolu 01 zůstávají.
11. **`/.well-known/security.txt`** (RFC 9116), `Content-Type: text/plain; charset=utf-8`:
    ```
    Contact: mailto:info@hspg.cz
    Expires: <datum vytvoření + nejvýš 365 dní, formát 2027-09-30T22:00:00.000Z>
    Preferred-Languages: cs, en
    Canonical: https://hspg.cz/.well-known/security.txt
    ```
    - Adresu ber z `content/firma.json` (`emaily.info`), test hlídá shodu. Majitel ji může změnit. `info@hspg.cz` je po úkolu 03 v JSON-LD veřejně i jako čistý text.
    - Žádné `Policy`, `Acknowledgments` ani tvrzení o certifikacích či odměnách.
    - Ověř na náhledu, že Netlify CLI soubor ve složce `.well-known` nasadí (složky začínající tečkou se při nasazení můžou vynechávat).
12. **Pojistka kreditů v `scripts/nasadit.mjs`** (rozšíření úkolu 00, čistá testovaná funkce):
    - `obdobi(ted, denObnovy)` vrátí aktuální období. Výchozí den obnovy je 11 (`KREDITY_OBDOBI_DEN`). Aktuální datum obnovy ověř v Usage & billing.
    - `muzeDoProdukce` navíc spočítá produkční nasazení v období z `.nasazeni-produkce.json`. Při dosažení `NASAZENI_ZA_OBDOBI_LIMIT` (výchozí 10) produkci zamítne s hláškou „PRODUKCE ZAMÍTNUTA: rozpočet období vyčerpán“, výjimkou je `--nouzove`.
    - Před každou produkcí vypiš: „Období 11. 9.–10. 10.: N nasazení = N×15 kreditů z rozpočtu 150. Zkontroluj zbývající kredity v Usage & billing.“
    - Zdůvodnění výchozí hodnoty: ostatní položky minulého období dělaly ~94 kreditů, strop AI je ~190 kreditů za měsíc (úkol 01) a monitoring ≤ 6. Dohromady s 10 nasazeními ~440 z 1 000. Číslo potvrdí majitel.
13. **Týdenní kontrola `scripts/provoz-tyden.mjs`** (jen čtení: GET, DNS, TLS, čtení Netlify API a Blobs; **nikdy POST**). Výstup je Markdown na stdout se stavem `OK / POZOR / KRITICKÉ`. Návratový kód 0 / 1 / 2. Očekávané hodnoty jsou v `scripts/provoz-ocekavani.json`.

    | Oblast | Kontrola |
    |---|---|
    | dostupnost | `/`, `/zdravi.txt` (`HSPG-OK`), `/api/zdravi`, kanonický ceník (úkol 06) a `/akce/` → 200 a čas odpovědi |
    | hlavičky | CSP obsahuje `report-uri`, HSTS je **právě jednou**, ostatní hlavičky z tabulky v části Proč existují, `/ai-centrum/` má `X-Robots-Tag: noindex` |
    | `security.txt` | 200 a `Expires` víc než 30 dní dopředu (jinak POZOR) |
    | TLS | platnost certifikátu ≥ 21 dní (jinak POZOR, < 7 dní KRITICKÉ) a vydavatel |
    | DNS | MX = hosty Seznamu (**změna = KRITICKÉ**), SPF obsahuje `include:spf.seznam.cz`, DMARC odpovídá očekávanému kroku, CAA (pokud je) obsahuje `letsencrypt.org`, `www` je CNAME na Netlify |
    | funkce | očekávané stavy GET z tabulky v části Proč (`/api/asistent` GET 200), těla bez stack trace |
    | kredity | nasazení v období z `.nasazeni-produkce.json`. `--zbyva N` (číslo z Usage & billing) přepočte na % s krokem podle prahu. Zjisti (`npx netlify api --list`, dokumentace), zda Netlify API čerpání kreditů vrací – pokud ano, čti ho automaticky. AI v kreditech čti z Blobs `hspg-ai` (`utrata/RRRR-MM`) |
    | AI | souhrn 7 dní a semafor (Blobs `hspg-provoz`) |
    | formuláře | ověřená odeslání za 7 dní po formulářích z Netlify API proti `formulare.*.prijato` a `*_ok`. Data podání zpracuj jen v paměti, vypiš **jen počty** |
    | 404 a CSP | top 10 za 7 dní (návrhy přesměrování pro úkol 06) |
    | zálohy | `main` = `origin/main` a čistý strom, poslední export Forms (úkol 19) ≤ 7 dní, DNS beze změny proti očekávání |
    | ruční body | Netlify Logs → Functions (chyby za 7 dní), přehled uptime monitoru, Usage & billing (checkboxy pro majitele) |

    Režim `--verejne` dělá jen dostupnost, hlavičky, `security.txt`, TLS, DNS a funkce. Nepotřebuje přihlášení, takže jde spustit v plánovaném CI. Netlify API a Blobs čti přes přihlášené CLI (`npx netlify blobs:get --help`, `npx netlify api --list` – názvy příkazů ověř). Pokud úkol 19 má pomocníka pro API, použij ho.

    Prahy kreditů (čerpání období):

    | Práh | Krok |
    |---|---|
    | < 50 % | OK |
    | ≥ 50 % | POZOR v týdenním hlášení, zkontrolovat položky (přenos dat, videa) |
    | ≥ 75 % | produkce jen v jedné schválené dávce do konce období |
    | ≥ 90 % | produkce jen `--nouzove`. Majitel rozhodne o auto-recharge nebo dokoupení a zváží `AI_ZAPNUTO=0` |
    | 100 % | KRITICKÉ – web je pozastavený. Majitel okamžitě dokoupí kredity nebo zapne auto-recharge (postup v `docs/provoz.md`) |
14. **Příručka `docs/provoz.md`** (mimo publikovaný adresář; jinak jen do hlášení):
    - kredity a prahy
    - dávkové nasazování
    - nastavení uptime monitoru (tabulka níže)
    - týdenní rutina: kdo a kdy `[DOPLNIT: majitel / agent, den v týdnu]`, příkaz a kam s výstupem
    - plán DMARC (tabulka níže)
    - CAA
    - kritéria HSTS preload
    - obnova `security.txt` (měsíc před `Expires`)
    - zálohy a obnova:
      - Git (úkol 00)
      - export Forms (úkol 19)
      - DNS podle `provoz-ocekavani.json` (obnovu dělá majitel u Wedosu)
      - jména proměnných v Netlify (hodnoty jen ve správci hesel majitele)
    - postup při výpadku: web pozastavený, AI nefunguje, poptávky nechodí, certifikát, chybné nasazení (vrácení přes Netlify → Deploys → starší nasazení → Publish deploy; zda se účtuje jako produkční nasazení, ověř v dokumentaci)

    Do `CLAUDE.md` přidej krátkou sekci: týdenní kontrola, rozpočet nasazení. Nový inline skript nebo externí host znamená `node scripts/build-hlavicky.mjs`, od fáze B je CSP vynucená.

    **Monitor pro majitele** (bezplatný tarif UptimeRobot nebo Better Stack; aktuální podmínky ověř: interval, počet monitorů, push do mobilu, hlídání certifikátu):

    | Monitor | Adresa | Interval | Úspěch | Odhad kreditů za období |
    |---|---|---|---|---|
    | web | `https://hspg.cz/zdravi.txt` | 5 min | 200 a text `HSPG-OK` (pozastavený web text nemá) | ~1,7 (8 640 požadavků) |
    | homepage | `https://hspg.cz/` | 60 min | 200 a slovo `HOLUB` (v titulku) | ~1–4 (720 × 57 KB komprimovaně / 245 KB bez komprese) |
    | funkce | `https://hspg.cz/api/zdravi` | 60 min | 200 a `"ok":true` | < 1 a výpočet |
    | certifikát | hspg.cz | podle služby | upozornění 14 dní před expirací | 0 |

    Homepage každých 5 min by stála ~10–42 kreditů za období (8 640 × 57–245 KB při 20 kreditech/GB), proto ji hlídej jen 1× za hodinu. Upozornění chodí do mobilní aplikace i e-mailem. Žádný monitor nesmí posílat POST ani formuláře.

    **DMARC – kroky** (DNS mění majitel u Wedosu, jen záznam `_dmarc`, **MX neměnit**):

    | Krok | Záznam `_dmarc.hspg.cz` | Kdy |
    |---|---|---|
    | 1 | `v=DMARC1; p=none; rua=mailto:[DOPLNIT: adresa pro reporty]; adkim=r; aspf=r` | hned po fázi A |
    | 2 | `v=DMARC1; p=quarantine; pct=25; rua=mailto:…; adkim=r; aspf=r` | po ≥ 2–4 týdnech reportů, kde všechny zdroje @hspg.cz mají `dmarc=pass` |
    | 3 | totéž bez `pct` (= 100 %) | po dalších ≥ 2 týdnech bez problémů |
    | (4) | `p=reject` | jen rozhodnutím majitele, nejdřív o 4 týdny později |

    - Doporučená adresa pro reporty je nový alias `dmarc@hspg.cz` s filtrem do složky „DMARC“. Všech 5 firemních adres končí ve stejné schránce a denní XML reporty by zahltily poptávky.
    - Odesílatelé k ověření:
      - Seznam Email Profi
      - funkce přes `smtp.seznam.cz` (úkol 02)
      - newsletter „Holubí pošta“, jen pokud existuje (čeká na majitele)
    - Oznámení Netlify chodí z `netlify.com`, DMARC hspg.cz se jich netýká.
    - Před krokem 2 ověř testovacím e-mailem z každého zdroje `dmarc=pass` (hlavičky zprávy).

    **CAA (volitelně, se souhlasem majitele):** `hspg.cz. CAA 0 issue "letsencrypt.org"`, `CAA 0 issuewild ";"`, `CAA 0 iodef "mailto:[DOPLNIT]"`.
    - Předtím ověř vydavatele v Netlify → Domain management → HTTPS.
    - Riziko: pokud Netlify změní vydavatele, obnova certifikátu selže. Proto CAA až po zapnutí hlídání certifikátu (monitor a týdenní kontrola).
15. **Testy** (struktura testů webu, `node --test`, Playwright z úkolů 02/19; nic nesmí odejít ven, všechny POST mimo lokální server zachyť přes `page.route`):
    - `tests/provoz/provoz-lib.test.mjs`:
      - počítadla, histogram, p95, strop 300 položek, mazání po 90 dnech, předpona `nahled/`
      - uložený JSON neobsahuje testovací text dotazu, e-mail, telefon ani IP
    - `tests/provoz/ai-metriky.test.mjs`:
      - výsledky `asistent` se započítají
      - adaptér s `status: 402` → semafor červená „vyčerpaný kredit“ a push 1×, druhá chyba téhož dne push nepošle
      - 404 → text s `CLAUDE_MODEL`
      - `ai-stav` nevolá žádný adaptér
      - odpovědi `asistent` jsou shodné s dosavadními testy

      Rozšiř `falesnyAdapter` z balíčku o volbu `status` (výchozí 500).
    - `tests/provoz/sberace.test.mjs`: oba formáty CSP hlášení, odstranění query, rozšíření prohlížeče zvlášť, 405, 413, denní strop, anonymizace cesty 404
    - `tests/provoz/formulare-pocty.test.mjs`: počty podle formuláře a kanálu. Testy úkolu 02 projdou beze změny.
    - `tests/provoz/chyby-bez-stacku.test.mjs`: každá importovatelná funkce s neplatným vstupem (špatná metoda, neplatný JSON, chybějící pole, výjimka v závislosti) vrátí tělo bez `/\bat .+:\d+:\d+|node_modules|\/var\/task|\.m?js:\d+/`
    - `tests/provoz/security-txt.test.mjs`: povinná pole, `Expires` v budoucnu a ≤ 365 dní, adresa = `firma.json` → `emaily.info`
    - `tests/provoz/nasadit-obdobi.test.mjs`:
      - hranice 10./11. dne, přelom měsíce a roku
      - 10 nasazení v období → 11. zamítnuto, s `--nouzove` povoleno
      - stávající testy úkolu 00 projdou
    - `tests/provoz/provoz-tyden.test.mjs` (lokální server a podvržené DNS a TLS):
      - prahy 50/75/90/100 → správný krok
      - změněné MX → KRITICKÉ a kód 2
      - chybějící HSTS → POZOR
      - výstup nikdy neobsahuje data podání
    - `tests/provoz/csp-politika.test.mjs`:
      - `script-src` bez `'unsafe-inline'` a `'unsafe-eval'`
      - žádné holé `https:` ani `*`
      - `report-uri` existuje
      - `build-hlavicky.mjs --kontrola` po změně inline skriptu selže
    - `tests/e2e/csp.test.mjs` (Playwright): lokální server přidá ke každé stránce kandidátní hlavičku ze `csp-politika.mjs` a `addInitScript` sbírá události `securitypolicyviolation`.
      - Stránky: `/`, ceník, `/akce/`, `/recenze/`, `/kalkulacka-svj`, `/pas-domu`, jedna okresní stránka, `/en`, 404.
      - Projdi je bez souhlasu i se souhlasem. GTM a Clarity podvrhni prázdnou odpovědí přes `page.route`.
      - Na `/akce/` vyber testovací obrázek bez odeslání (náhled `blob:`).
      - Očekávání: 0 porušení, nebo jen porušení zdokumentovaná v hlášení.
16. **CI (úkol 19):** pokud workflow existuje, přidej `node scripts/build-hlavicky.mjs --kontrola`, nové testy a týdenní plánovaný běh `node scripts/provoz-tyden.mjs --verejne`. Plánovaný běh jen kontroluje, **nikdy nenasazuje** a nepotřebuje tajemství. Neúspěch pošle GitHub e-mailem. Pokud CI není, zapiš to do hlášení.
17. **Náhled** (`node scripts/nasadit.mjs`, 0 kreditů, nejvýš 2× za fázi):
    - ověř hlavičky, `security.txt`, `/zdravi.txt`, `/api/zdravi`, 405 sběračů na GET
    - v Chromiu na náhledu ověř, že vyvolané testovací porušení CSP (vložený skript v DevTools) dorazí do sběrače a v Blobs je s předponou `nahled/`
    - otevři neexistující URL a ověř záznam 404
    - jedna otázka H-BOT a v panelu majitele semafor a počty (přihlásí se majitel, heslo nezadáváš ty)
    - ověř i se zaregistrovaným `sw.js`, že stránka dostává novou hlavičku
18. **Hlášení fáze A** (formát níže) s prvním výstupem `provoz-tyden.mjs --verejne` a checklistem pro majitele. **Zastav se.**

### Mezi fázemi – checklist pro majitele (vlož do hlášení fáze A)
- [ ] Rozhodnout o auto-recharge (Netlify → Usage & billing; úkol 00, Claude v Chrome C1) a ověřit, že e-maily o čerpání 50 / 75 / 100 % chodí do čtené schránky.
- [ ] Potvrdit rozpočet produkčních nasazení na období (výchozí 10 = 150 kreditů).
- [ ] Založit uptime monitor podle tabulky (krok 14) s upozorněním do mobilu. Vyzkoušet ho dočasně chybným klíčovým slovem a agentovi poslat jen potvrzení nebo snímek bez přihlašovacích údajů.
- [ ] Netlify → Notifications: e-mail při neúspěšném nasazení (deploy failed). Search Console: zapnutá e-mailová upozornění.
- [ ] DMARC krok 1 u Wedosu (alias pro reporty, záznam `_dmarc`). **MX neměnit.** Claude v Chrome (C8) může provést.
- [ ] CAA: souhlas ano/ne a adresa pro `iodef`.
- [ ] Snímek seznamu DNS záznamů z Wedosu pro rozhodnutí o HSTS preload a seznam plánovaných subdomén.
- [ ] Kontakt v `security.txt` (výchozí `info@hspg.cz`).
- [ ] Schválit produkční nasazení fáze A v dávce s dalšími úkoly.

### Fáze B – vynucení a úklid (nejdřív 14 dní po produkčním nasazení fáze A)
19. Větev `ukol-15-provoz-faze-b` z aktuální `main` (fáze A musí být sloučená a na produkci ≥ 14 dní), `git -C ../hspg-balicek pull`.
20. **CSP:**
    - Vyhodnoť sběrač za ≥ 14 dní (a `tests/e2e/csp.test.mjs` proti aktuálnímu `main`). Každé porušení zařaď: očekávané (rozšíření prohlížečů, cizí kód) / chyba politiky (doplnit konkrétní host) / chyba kódu (opravit).
    - Zbylé inline skripty přednostně přesuň do souborů beze změny obsahu a pořadí. `defer` přidej jen tam, kde na skriptu nic nezávisí; pozor na `window.HSPG_CENY` (úkol 07). Hash ponech jen tam, kde přesun nejde, a hlídej ho přes `--kontrola` v CI.
    - Když 7 dní po sobě nepřijde žádné neočekávané porušení, přepni `rezim` na `vynutit`. Hlavička `Content-Security-Policy` má stejnou politiku a reporty zůstávají.
    - Na náhledu ověř Playwrightem 0 porušení a funkčnost: průvodce na homepage, kalkulačka SVJ, pas domu, `/akce/` s náhledem fotky (bez odeslání), `/recenze/`, H-BOT, lišta souhlasu včetně načtení GTM a Clarity po souhlasu.
21. **Odstranění `holub-ai`.** Všechny podmínky:
    - úkol 01 je na produkci ≥ 7 dní
    - `curl -s https://hspg.cz/assets/hbot.js | grep -c holub-ai` = 0
    - za 7 dní žádné volání z webu (jen případné roboty). Důkaz: Netlify → Logs → Functions `holub-ai`, nebo počítadlo `holub-ai` z kroku 7
    - `git grep -n holub-ai` najde jen funkci
    - souhlas majitele

    Pak smaž soubor funkce a její konfiguraci nebo přesměrování. Proměnné, které používala jen ona, vypiš majiteli (jména; smaže je on). Na náhledu: `/api/holub-ai` → 404, H-BOT odpovídá. V `provoz-ocekavani.json` změň očekávaný stav na 404.
22. **DMARC:** zkontroluj záznam (`node -e` s `dns.promises.resolveTxt("_dmarc.hspg.cz")`). Majitel uloží reporty (přílohy) do složky **mimo repozitář** a ty z nich udělej souhrn: zdroj, počet, SPF/DKIM/DMARC výsledek. Nic necommituj. Pokud jsou všechny legitimní zdroje `pass`, připrav majiteli krok 2 a později 3. Očekávaný krok uprav v `provoz-ocekavani.json`.
23. **HSTS preload** jen na výslovné rozhodnutí majitele, až když:
    - podle snímku zóny má každá subdoména s webovým záznamem funkční HTTPS (`curl -sI https://<sub>.hspg.cz`)
    - majitel potvrdil, že každá budoucí subdoména bude jen HTTPS

    Pak přidej `preload` k `max-age=31536000; includeSubDomains`, ověř, že je hlavička jen jedna, a doménu na hstspreload.org odešle **majitel**. Jde o dlouhodobý závazek, odebrání ze seznamu trvá měsíce. Bez rozhodnutí zapiš do `docs/provoz.md` „preload neprováděn – důvod“.
24. Spusť `provoz-tyden.mjs` (plný režim, s majitelem přihlášeným v Netlify CLI), aktualizuj `docs/provoz.md` a podej hlášení fáze B.

## Akceptační kritéria
### Fáze A
- [ ] `node --test tests/provoz/*.test.mjs` – vše prošlo (počty v hlášení), testy balíčku úkolu 01 (`npm test`, `npm run test:e2e`) a testy úkolů 00 a 02 projdou beze změny.
- [ ] `CHROMIUM=<cesta> node --test tests/e2e/csp.test.mjs` – 0 nezdokumentovaných porušení na 9 typech stránek, žádný požadavek mimo lokální server.
- [ ] `node scripts/build-hlavicky.mjs --kontrola` → kód 0. Počet hashů v CSP = počet inline skriptů s kódem z `csp-inventura.mjs`.
- [ ] Náhled: `curl -sI <náhled>/` obsahuje `content-security-policy-report-only` s `report-uri /api/csp-hlaseni`, `script-src` bez `'unsafe-inline'`, a `reporting-endpoints`. `strict-transport-security` je právě 1×. Ostatní hlavičky z tabulky v části Proč beze změny.
- [ ] Náhled: testovací porušení CSP a návštěva neexistující URL se objeví v souhrnu (předpona `nahled/`).
- [ ] Náhled: `/.well-known/security.txt` → 200, `text/plain`, `Contact` a `Expires` (budoucí, ≤ 365 dní). `/zdravi.txt` → `HSPG-OK`. `/api/zdravi` → `{"ok":true}`. GET na oba sběrače → 405.
- [ ] Panel majitele na náhledu ukazuje semafor u každé AI a řádek 24 h. `/api/ai-stav` obsahuje `zdravi` a `provoz` a test potvrdil 0 volání AI.
- [ ] `node scripts/nasadit.mjs --produkce` bez schválení → „PRODUKCE ZAMÍTNUTA“. Test rozpočtu období prošel.
- [ ] `node scripts/provoz-tyden.mjs --verejne` doběhne, výstup je v hlášení a neobsahuje data podání.
- [ ] Inventura v hlášení: jména proměnných (bez hodnot), zjištění o `pocasi` (Open-Meteo, žádný klíč), výsledek kontroly výpisu chyb, odkazy na `holub-ai`, čísla CSP inventury.
- [ ] `npx -y gitleaks detect --source . --no-banner` bez nálezů. `git diff main | grep -nE "^\+.*(NTFY_TEMA|TELEGRAM_BOT_TOKEN|HSPG_PANEL_HESLO|_API_KEY)\s*=\s*\S"` nenajde nic (v testech jen zjevné atrapy jako `"test"`).
- [ ] Nové neveřejné soubory nejsou na náhledu: `curl -s -o /dev/null -w '%{http_code}' <náhled>/docs/provoz.md` → 404, stejně tak `/scripts/provoz-ocekavani.json` a `/tests/provoz/provoz-lib.test.mjs`.
- [ ] `/api/provoz-stav` bez přihlášení → 401 (nebo 503 bez nastaveného hesla). S tokenem majitele vrátí jen počty, test ověřil, že odpověď neobsahuje testovací osobní údaje.

### Fáze B
- [ ] Souhrn CSP hlášení za ≥ 14 dní je v hlášení: počty podle direktiv, co bylo opraveno, 7 dní bez neočekávaného porušení.
- [ ] Náhled i (po schválení) produkce: `curl -sI https://hspg.cz/ | grep -i "^content-security-policy:"` → vynucená politika s `report-uri`. Playwright 0 porušení. Ruční kontrola funkcí ze kroku 20 prošla.
- [ ] `curl -s -o /dev/null -w '%{http_code}' https://hspg.cz/api/holub-ai` → 404 (po produkci) a H-BOT odpovídá.
- [ ] `_dmarc.hspg.cz` obsahuje `rua`. Krok DMARC odpovídá plánu a `provoz-ocekavani.json`.
- [ ] HSTS: buď `preload` s rozhodnutím majitele a potvrzením z hstspreload.org (pending / preloaded), nebo zápis „neprováděn – důvod“ v `docs/provoz.md`.
- [ ] Uptime monitor běží a zkušební upozornění dorazilo do mobilu (potvrzení majitele).

## Ověření
```bash
node --test tests/provoz/*.test.mjs                         # pass N, fail 0
CHROMIUM=<cesta> node --test tests/e2e/csp.test.mjs         # pass, 0 porušení, žádný externí požadavek
node scripts/csp-inventura.mjs                              # tabulka; inline skripty s kódem = počet hashů
node scripts/build-hlavicky.mjs --kontrola; echo $?         # 0
node scripts/nasadit.mjs --produkce; echo $?                # „PRODUKCE ZAMÍTNUTA…“, 3
node scripts/provoz-tyden.mjs --verejne; echo $?            # Markdown, 0 nebo 1 (POZOR vysvětlit)
curl -sI <náhled>/ | grep -iE "content-security-policy|reporting-endpoints|strict-transport-security"
curl -s <náhled>/.well-known/security.txt                   # Contact, Expires, Preferred-Languages, Canonical
curl -s <náhled>/zdravi.txt                                 # HSPG-OK
curl -s <náhled>/api/zdravi                                 # {"ok":true}
curl -s -o /dev/null -w '%{http_code}\n' <náhled>/api/csp-hlaseni   # 405
node -e 'require("dns").promises.resolveTxt("_dmarc.hspg.cz").then(r=>console.log(r.flat().join("")))'
node -e 'require("dns").promises.resolveMx("hspg.cz").then(console.log)'   # hosty emailprofi.seznam.cz – beze změny
cd ../hspg-balicek && npm test && HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta> npm run test:e2e   # H-BOT beze změny
```
Proti produkci jen GET a jen pár běhů. Žádné testovací odeslání formulářů ani POST na produkční funkce.

Testy, které agent přidá: `tests/provoz/provoz-lib`, `ai-metriky`, `sberace`, `formulare-pocty`, `chyby-bez-stacku`, `security-txt`, `nasadit-obdobi`, `provoz-tyden`, `csp-politika` (jednotkové) a `tests/e2e/csp.test.mjs` (Playwright).

## Bez AI / s AI
- Dohled, sběrače, hlavičky, týdenní kontrola i upozornění fungují bez AI. Při `AI_ZAPNUTO=0` nebo bez klíčů ukazuje semafor „vypnuto“ a upozornění AI se neposílají.
- Kontrola zdraví AI je pasivní (z provozu) a nespotřebuje tokeny. Volitelné „Ověřit teď“ používá jen bezplatný dotaz na model.
- Upozornění při vyčerpaném kreditu nebo chybě AI říká, že H-BOT odpovídá z FAQ. Návštěvník nic nepozná (`KONTEXT.md` §4.6).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Zvlášť pro tento úkol:
- **MX nikdy neměnit.** DNS (DMARC, CAA) mění jen majitel u Wedosu po souhlasu. Agent DNS jen čte.
- **Nové API klíče nezakládat** (Gemini, xAI, OpenWeatherMap). AI běží přes Netlify AI Gateway a počasí přes Open-Meteo.
- **Heslo z e-mailu „Master plán“ je prozrazené** – nikde ho nepoužívej. Do panelu se přihlašuje majitel sám, heslo nikdy nezadáváš, nečteš ani nevypisuješ.
- **Jen čtení proti produkci:** GET, DNS a TLS. Žádný POST, žádné formuláře, žádné odesílání cizích formulářů (hstspreload.org, monitor, Search Console dělá majitel).
- **Data:** do Blobs, logů, hlášení ani výstupu skriptů jen počty a kódy. Žádný text dotazu, osobní údaj, IP ani celé URL s query. Data podání z API jen v paměti.
- **Veřejný balíček:** do balíčku a veřejných míst nepiš podrobnosti slabin. Nálezy bezpečnostní kontroly patří do soukromého repozitáře webu a hlášení majiteli. Žádná tvrzení o „certifikovaném zabezpečení“ ani „nepřetržitém dohledu“ na webu.
- **CSP:** ve fázi A jen Report-Only. Vynutit až po splnění kritérií ve fázi B. Nikdy `'unsafe-eval'`, obecné `https:` ani `*`. Stávající hlavičky (XFO, `nosniff`, Referrer-Policy, Permissions-Policy, COOP) neoslabovat.
- **`holub-ai`** mazat až po splnění všech podmínek kroku 21 a se souhlasem majitele. **HSTS preload** jen s výslovným rozhodnutím majitele.
- **Kredity:** monitoring podle intervalů v tabulce. Žádné automatické nasazení (ani z plánovaného CI). Náhled zdarma přes `scripts/nasadit.mjs`, produkce jen po schválení v dávce.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5, zvlášť po fázi A a po fázi B, a navíc:
- **Fáze A:**
  - inventura z kroku 3 (proměnné jen jménem, `pocasi`, výpis chyb, `holub-ai`, CSP)
  - seznam nových a změněných souborů
  - diff souborů převzatých z balíčku (`asistent.mjs`, `ai.mjs`, `ai-stav.mjs`, `submission-created.mjs`, `hbot-majitel.js`, `nasadit.mjs`), aby se promítly zpět do balíčku
  - výsledky testů (počty)
  - odkaz na náhled a výpis hlaviček
  - výsledek ověření `.well-known` na náhledu a relativní adresy v `Reporting-Endpoints`
  - zda Netlify API vrací čerpání kreditů, zda je na tarifu rate limiting funkcí a zda Gateway podporuje dotaz na model
  - první výstup `provoz-tyden.mjs --verejne`
  - checklist pro majitele
- **Fáze B:**
  - souhrn CSP hlášení a výsledná politika
  - důkazy k odstranění `holub-ai`
  - stav DMARC a souhrn reportů
  - rozhodnutí o HSTS preload
  - týdenní kontrola (plný režim)
- **Týdenní hlášení** (výstup `provoz-tyden.mjs`, majitel nebo agent podle `docs/provoz.md`): stav OK / POZOR / KRITICKÉ po oblastech, % kreditů a krok podle prahu, nasazení v období, AI za 7 dní, formuláře Forms vs. upozornění, top 404 a CSP, zálohy.
- **Návrhy mimo rozsah:**
  - top 404 → přesměrování (úkol 06)
  - zobrazení `/api/provoz-stav` v interním panelu (úkol 14)
  - hosty měření z hlášení CSP (úkol 10)
  - pokud zásady (úkol 09) neuvádějí sběr anonymních počtů 404 a CSP, návrh doplnění
  - MTA-STS a TLS-RPT (audit #10, později)
