# Úkol 09: Zásady ochrany osobních údajů a souhlasy
> Priorita P0 · Závisí na: 02, 03 (pokud jsou sloučené 04 a 13, navazuje i na ně) · Čeká na majitele: doba uchování poptávek (12 měsíců / 3 roky), zda existuje newsletter „Holubí pošta“, výběr AI pro veřejného asistenta a schválení textu zásad, případně právníkem (otázky O1–O11) · Rozsah: registr skutečného zpracování, serverové úpravy, bez kterých by zásady nebyly pravdivé, jedno nové znění zásad (česky + anglické shrnutí), správné právní tituly u formulářů a odkazy na zásady. Tři fáze: **A** zpracování a registr (hlášení), **B** text zásad a formuláře (náhled, hlášení, **nesloučit**), **C** doplnění po rozhodnutí majitele, schválení a sloučení.

## Proč (s důkazy)
Zdroj: kopie živého webu z 4. 10. 2026 (zásady na živém webu jsou s kopií shodné), GET na hspg.cz a kód balíčku `balicek/web`. Čísla řádků platí pro živý web, ve zdroji se mohou lišit. U souborů balíčku (`asistent.mjs`, `limity.mjs`, `hbot-panel.js` …) se odkazuje na funkce a texty, ne na řádky – balíček se průběžně mění, hledej je přes `grep`.

| # | Zjištění | Důkaz | Audit |
|---|---|---|---|
| 1 | Zásady uvádějí FormSubmit jako kanál poptávkového formuláře a Netlify jen jako „provoz a doručování webu“. Ve skutečnosti ukládá všechny formuláře (`hspg-poptavka`, `hspg-akce`, `hspg-zavolejte`, `hspg-recenze`, `hspg-fotky`) včetně fotografií Netlify Forms. FormSubmit sloužil jen jako záloha a úkol 03 ho odstranil. | `/ochrana-osobnich-udaju.html` ř. 96 (čl. 5) a ř. 98 (sekce Hodnocení: „záložně FormSubmit“), `/pravidla-akce/` ř. 73 | pravni #5a, formulare #21 |
| 2 | „Holubí pošta“ (zasílání informací se souhlasem) existuje jen v textu zásad. Na webu není žádný formulář k přihlášení. | grep kopie webu „Holubí pošt“ → 1 výskyt (zásady ř. 94) | pravni #5b, formulare #10 |
| 3 | Na webu jsou dvě odlišná znění. `/pravidla-akce/#gdpr` (ř. 68–74) má vlastní účely, příjemce (FormSubmit na prvním místě) a uchování („12 měsíců … účetní a daňové předpisy“, ř. 72). Zásady (ř. 95) uvádějí „po dobu záruky (10 let) a dále dle zákonných lhůt“. | | pravni #5d |
| 4 | Zásady nepokrývají řadu účelů: uchazeče o práci (`kariera.html` ř. 180: telefon, e-mail, Facebook; slovo „uchazeč“ se v zásadách vyskytuje 0×), dodavatele (`spoluprace.html` ř. 93–95), WhatsApp (`index.html` ř. 2003, odkaz `wa.me`), pas domu a registr zakázek (`pas-domu.html` ř. 253–304, `/api/sentinel/validate`), reklamace (úkol 04), zdroj návštěvy, oznámení a potvrzení zákazníkovi (úkol 02) a úložiště v prohlížeči (Cache Storage service workeru, `hspg-svetly`). Chybí i informace podle čl. 13 odst. 2 písm. e a f GDPR (zda je poskytnutí údajů povinné, automatizované rozhodování) a datum revize. Stránka uvádí jen „Platné od 22. 8. 2026“ (ř. 89). | | pravni #5c, #5e, #5f, formulare #20 |
| 5 | **AI:** sekce zásad `#hbot-ai` jmenuje jen Anthropic. Asistent z úkolu 01 posílá dotaz dvěma poskytovatelům (jeden píše, druhý kontroluje). Výchozí pořadí je `claude,gemini,gpt,grok` (`asistent.mjs` → `poradi()`) a Grok běží přes `OPENROUTER_API_KEY`, který do funkcí vkládá Netlify AI Gateway (`poskytovatele.mjs` → `POSKYTOVATELE.grok`, KONTEXT §2). Vlastní klíč nastavený v Netlify má přednost, pak AI nejde přes Gateway, ale přímo k poskytovateli. Interní `/api/ai` posílá text majitele bez maskování. Ukázkový text v AI centru zní „Paní Nováková z Kolína…“ (`placeholder` pole dotazu v `ai-centrum/index.html` a `hbot-majitel.js`). | | ai #3, pravni #9 |
| 6 | **„Souhlas“ tam, kde je titulem smlouva.** Na `/akce/` (ř. 156–157) je jediné povinné pole „Souhlasím se zpracováním osobních údajů pro přípravu cenové nabídky a se zásadami … a pravidly akce“ (payload `Souhlas se zpracováním osobních údajů=ano`). Průvodce na homepage má v kroku 6 (`index.html` ř. 2200, payload ř. 2244) povinné „Souhlasím se zpracováním osobních údajů pro přípravu cenové nabídky“. H-BOT má u zavolání zpět „Souhlasím se zpracováním jména a telefonu“ (`hbot-panel.js`, pole `name="souhlas"`) a zásady `#hbot` uvádějí „na základě vašeho souhlasu“. Zásady přitom (ř. 94) uvádějí čl. 6 odst. 1 písm. b a pravidla (ř. 70) „jednání o smlouvě … a oprávněný zájem“. Souhlas podmíněný službou není svobodný (čl. 7 odst. 4 GDPR). Spojení s pravidly akce navíc brání dát ho odděleně. | | pravni #4, formulare #10 |
| 7 | Payload formulářů nenese verzi zásad, takže nejde doložit, jaké znění zákazník viděl. | | formulare #10 |
| 8 | **Úložiště limitů** (Netlify Blobs `hspg-ai`): klíče `limit/k10/<otisk>`, `limit/kden/<otisk>` a `limit/login/<otisk>` (`limity.mjs` → `povolVerejnyDotaz`, `povolPokusOPrihlaseni`) se nikdy nemažou (knihovna nevolá `delete`). Otisk (`otiskKlienta`) nepoužívá tajnou sůl, jde tedy o pseudonymizaci, ne o anonymizaci. Úkol 02 stejný postup použil pro otisk e-mailu (úložiště `hspg-oznameni`). Věta „otisk IP na 1 den“ ani komentář v záhlaví `limity.mjs` by dnes nebyly pravdivé. | | nový nález v kódu balíčku |
| 9 | **Odkazy:** 234 z 247 stránek (231 okresních, `/cisteni-dlazby/`, `/cisteni-fasad/`, `/cisteni-strech/`) má v patičce jen „Nastavení cookies“ (`#cookies`), odkaz na zásady chybí. Na `/en` vede „Privacy policy“ na českou stránku (`en.html` ř. 355). `og:description` a `twitter:description` zásad píšou „… společností HOLUB …“ (ř. 19, 27), provozovatelem je ale OSVČ. Upozornění o AI v H-BOT (`hbot-panel.js`, zpráva „Na vlastní otázky odpovídají spolupracující AI …“) na zásady neodkazuje. | | pravni #5, předávka z 13 |
| 10 | **Počasí:** `/akce/` posílá na `/api/pocasi` celý obsah pole adresy (ř. 188–189). GET `/api/pocasi?q=Náměstí 1, Kolín` vrací `"obec":"Kolín"`, obec tedy vybírá až server. Zásady (`#pocasi`) tvrdí, že Open-Meteo dostává jen obec. Ověř ve zdroji funkce `pocasi`. | GET 4. 10. | KONTEXT §2 |

**V pořádku (zachovat):** údaje o správci odpovídají ARES (Dušan Holub, Pernerova 10/32, 186 00 Praha 8 – Karlín, neplátce DPH). Adresa ÚOOÚ je správně. Před souhlasem web neodešle žádný požadavek na cizí domény. Clarity maskuje formulářová pole. `/recenze/` má poctivý oddělený souhlas se zveřejněním. `hspg-fotky` na `/akce/dekujeme/` má místo zaškrtávacího pole informační větu („Fotky použijeme jen k posouzení povrchu a přípravě nabídky (zásady)“), která je **vzorem pro ostatní formuláře**. Kotvy `#fotky`, `#recenze`, `#hbot`, `#hbot-ai`, `#pocasi`, `#messenger` a `#cookies` (na `#cookies` vede 248 odkazů) se používají a musí zůstat.

## Cíl (měřitelný)
1. **Jeden zdroj pravdy o zpracování:** `content/zpracovani.json` obsahuje účely, údaje, právní tituly, příjemce, předávání mimo EHP, doby uchování, úložiště v prohlížeči a povolené AI. Generují se z něj bloky zásad a verze ve formulářích. Kód se jím řídí (AI, push) a test selže, pokud formulář, externí služba volaná z funkcí nebo poskytovatel AI v registru chybí.
2. **Jedno znění zásad** na `/ochrana-osobnich-udaju` obsahuje všechny náležitosti čl. 13 GDPR, sekce podle kroku B4 a anglické shrnutí `#english`. Pravidla akce, formuláře, H-BOT a `/en` na zásady jen odkazují. FormSubmit se v zásadách nevyskytuje ani jednou, Holubí pošta také ne (pokud O2 = neexistuje). Stránka má číslo verze a datum revize.
3. **Správné tituly:** žádný formulář nemá text „Souhlasím se zpracováním“. Poptávka, zavolání zpět, fotky a reklamace mají informační větu s odkazem na příslušnou sekci. Pravidla akce mají samostatné pole. Souhlas zůstává jen tam, kde je skutečně titulem: zveřejnění hodnocení a reference, newsletter (pokud bude) a cookies (úkol 10). Každý payload nese `Verze zásad`.
4. **Tvrzení v zásadách jsou technicky pravdivá a otestovaná:**
   - AI dostávají jen poskytovatelé uvedení v registru.
   - Push neobsahuje osobní údaje, dokud registr daný kanál jako příjemce osobních údajů neuvádí.
   - Otisky v Blobs vznikají s tajnou denní solí a mažou se nejpozději po 2 dnech.
   - Interní AI dostává pseudonymizovaný text.
   - Open-Meteo dostává jen obec.
5. **Nic se nezveřejní bez schválení:** text jde na produkci až po písemném schválení majitelem. `node scripts/build-zasady.mjs --brana` skončí kódem 1, dokud zbývá `[DOPLNIT` nebo chybí schválení. Přes `npm run produkce` se pak nic nenasadí.

## Rozsah
**ANO:**
- inventura zpracování a podklady o příjemcích (`docs/zpracovani/`, mimo publikovaný adresář)
- registr `content/zpracovani.json` a generátor `scripts/build-zasady.mjs` včetně brány před produkcí (`preprodukce` a kontrola v `scripts/nasadit.mjs`)
- serverové úpravy, bez kterých by zásady nebyly pravdivé:
  - povolení AI z registru (`asistent.mjs`, `ai.mjs`)
  - pojistka pushe (`submission-created.mjs`)
  - tajná sůl a mazání otisků (`limity.mjs`, otisk e-mailu z úkolu 02, plánovaný úklid)
  - pseudonymizace interní AI
  - počasí jen s obcí
  - logování bez obsahu dotazů
- nové znění `/ochrana-osobnich-udaju` včetně `<head>` a anglického shrnutí
- texty u formulářů `hspg-poptavka`, `hspg-akce`, `hspg-zavolejte`, `hspg-fotky`, `hspg-recenze` a `hspg-reklamace` (pokud existuje z úkolu 04) a pole `Verze zásad`
- sekce o osobních údajích a cookies v `/pravidla-akce/` (nahradí ji odkaz)
- odkazy z H-BOT (upozornění o AI), `/kariera`, `/spoluprace`, `/en` a z patičky generovaných stránek (jen odkaz)
- vzorové texty v AI centru
- postup vyřízení žádostí a mazání pro majitele
- testy

**NE (patří jinam, jen zapiš do hlášení):**
- Lišta souhlasu, kategorie analytika/marketing a odstavce o Clarity a GTM → **úkol 10**. Odstavce o Clarity a GTM převezmi beze změny, přidej jen seznam úložišť v prohlížeči.
- Dobrovolnost účasti v akci, poptávka mimo soutěž a minimalizace povinných polí → **úkol 18**. Pole pro pravidla akce tu jen oddělíš.
- Body 1–7 pravidel akce a návrh pravidel v2 → **úkol 13**.
- Skript, který maže podání v Netlify Forms podle doby uchování, a záloha exportu → **úkol 19**. Tento úkol mu dodá doby v registru.
- Přístup k pasu domu (náhodný token) a souhlasy v registru zakázek → **úkol 14**.
- Sjednocení patiček → **úkol 08** (tady se přidává jen odkaz).
- Odstranění FormSubmitu a e-mailové adresy → **úkol 03** (musí být sloučený, ověř v kroku A1). Zakládání nových schránek (`gdpr@`): **nezakládat**, kontakt je `info@hspg.cz`.
- Zavedení newsletteru (formulář, double opt-in) → jen návrh, pokud ho majitel v O2 chce.
- Formuláře pro kariéru a spolupráci (formulare #20) → jen návrh a otázka O11. Tady jen sekce v zásadách a odkazy.
- Text záruky a její délka → **úkol 05**. V zásadách se délka záruky nepíše natvrdo.
- Produkční nasazení, DNS a MX.

## Postup

### Fáze A – skutečné zpracování a registr (nic se nezveřejňuje)
1. **Větev `ukol-09-zasady-souhlasy` z aktuální `main`** a `git -C ../hspg-balicek pull`.
   - Ověř, že jsou sloučené úkoly 02 (`submission-created.mjs` s `nazvy_formularu`, pole `Číslo poptávky`) a 03 (`grep -rIil formsubmit "$PUB"` nic nenajde). Pokud ne, zastav se a nahlas.
   - Zjisti, zda jsou sloučené úkoly 04 (`hspg-reklamace`) a 13 (nový text kariéry, `docs/tvrzeni/pravidla-akce-v2-navrh.md`), a postup tomu přizpůsob.
2. **Najdi v repozitáři soubory, které generují:**
   - stránku zásad, `/pravidla-akce/` a `/akce/` (formulář `hspg-akce` a inline skript)
   - průvodce na homepage (`submitLead`, krok 6, skryté registrační formuláře před `</body>`)
   - `/akce/dekujeme/` s `assets/fotky-upload.js`, dále `/recenze/` a `/reklamace` (úkol 04)
   - `kariera.html`, `spoluprace.html`, `en.html` a šablonu patičky v `scripts/build-regions.mjs`
   - H-BOT (`assets/hbot-panel.js`, `assets/hbot-majitel.js`) a `ai-centrum/index.html`
   - funkce (`netlify.toml` → `[functions]`): `asistent`, `ai`, `ai-stav`, `majitel`, `submission-created`, `pocasi`, `facebook-webhook`, `rd-stav`, `sentinel-validate`, `holub-ai`
   - knihovnu `netlify/lib/ai/`, `assets/souhlas.js` a `sw.js`
   - build: hlavička živého `sw.js` zmiňuje `scripts/build-site.mjs` a `dist/sw.js`, ověř to.

   Publikační adresář (`$PUB`) a build příkaz zapiš do hlášení. Pokud se HTML generuje, uprav generátor, ne výstup.
3. **Inventura** → `docs/zpracovani/inventura.md` (mimo `$PUB`). Pouze čti kód, nic neodesílej. Tabulka: odkud → jaké údaje → kam (služba, funkce, úložiště) → jak dlouho → kdo je vidí. Povinně projdi:
   - **Formuláře:** každý `<form>` a JS payload (`form-name`, pole, soubory), včetně polí z úkolu 02 (`subject`, `Číslo poptávky`, `Předchozí stránka`, `Kampaň`, `Reklamní kliknutí`) a 04.
   - **Funkce:** co přijímají, kam volají ven (`fetch`, SDK, SMTP), co ukládají (Blobs, soubory) a co logují. `console.*` nesmí vypisovat text dotazu, jméno, telefon, e-mail ani adresu. Pokud ano, oprav to a uveď v hlášení.
   - **`pocasi`:** co přesně odchází na Open-Meteo (URL dotazu).
   - **`facebook-webhook`:** co ukládá a loguje, na která slova odpovídá automaticky a jakým textem. Pokud odpověď tvrdí něco o „satelitní analýze“, předej to úkolu 13 (`POSUDEK-MASTER-PLANU.md` to označuje za nepravdivé).
   - **`rd-stav` a `sentinel-validate`:** kde je uložený registr zakázek, jaká pole obsahuje a co z něj vrací veřejně (podle auditu obec, plocha, datum, materiály a poznámka).
   - **`holub-ai`** (dokud běží): zda loguje nebo ukládá obsah rozhovoru (zásady dnes tvrdí „Obsah rozhovoru sami neukládáme“).
   - **Prohlížeč:**
     - `localStorage`: `hspg-souhlas`, `hspg-svetly` a `hspg-cookies-ok` (na homepage se zapisuje jen po kliknutí na `[data-action="prijmoutCookies"]` a prvek `#cookie-banner` v kopii webu chybí; ověř, jestli jde o mrtvý kód → návrh pro úkol 10)
     - `sessionStorage`: `hspg-holub-lead` (co obsahuje a kdy se maže), tokeny majitele (`hspg-majitel-token`, `hspg-majitel-platnost`) a `hspgHistorie` (historie AI centra – nepseudonymizovaná zadání a odpovědi, maže se odhlášením v AI centru a zavřením karty); v `localStorage` navíc `hspg-majitel-zarizeni` (jen na zařízení majitele: podepsaný příznak zařízení na 90 dní, výjimka z celkového zámku přihlášení; bez osobních údajů)
     - Cache Storage (`sw.js` ukládá navštívené stránky)
   - **Netlify** (jen pro čtení, v UI nebo přes `netlify api`): jsou zapnuté Netlify Analytics nebo Real User Monitoring? Kam chodí oznámení Forms (převezmi z hlášení úkolu 02)? Které z proměnných `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` a `XAI_API_KEY` jsou v Netlify nastavené jako vlastní klíč? Zapiš **jen názvy**, hodnoty nikdy nevypisuj ani neukládej. Vlastní klíč znamená, že daná AI nejde přes AI Gateway, ale přímo k poskytovateli (KONTEXT §2), a zásady to musí popsat.

   Každou nesrovnalost mezi kódem a dnešními zásadami nebo komentáři v kódu zapiš do hlášení.
4. **Podklady o příjemcích** → `docs/zpracovani/smlouvy.md`. U každého příjemce uveď:
   - přesný název subjektu a roli (zpracovatel / samostatný správce / subzpracovatel přes Netlify)
   - co dostává a kde data zpracovává
   - záruku při předání mimo EHP: certifikaci v EU-US Data Privacy Framework ověř na dataprivacyframework.gov, jinak standardní smluvní doložky v DPA
   - odkaz na DPA nebo podmínky a dobu uchování u příjemce
   - u AI také, zda data využívá k trénování
   - řádek `Ověřeno: RRRR-MM-DD` (datum ověření), nebo `Ověřeno: neověřeno`

   Čti jen přes GET z oficiálních stránek. Povinně zpracuj:
   - **Netlify:** hosting, Forms, Functions, Blobs a AI Gateway. Z dokumentace AI Gateway zjisti, kdo je smluvní stranou vůči Anthropic, OpenAI, Google a OpenRouter a jak se nakládá s daty.
   - **AI:** Anthropic, OpenAI, Google (u Gemini ověř, že nejde o bezplatnou úroveň s trénováním na datech) a OpenRouter s poskytovateli modelů pro majitele: xAI (Grok), Mistral AI, DeepSeek (provozovatelé modelu u OpenRouteru se mění – Netlify posílá jen k poskytovatelům s nulovým uchováváním dat, ZDR), Meta (Llama, přes provozovatele ZDR) a Perplexity (hledá na webu). Seznam ověř proti `POSKYTOVATELE` v `netlify/lib/ai/poskytovatele.mjs`.
   - **Seznam.cz:** Email Profi a zvlášť bezplatná schránka `profiserv@seznam.cz`, kam jde záložní kopie oznámení (ověř, jaké podmínky zpracování pro ni platí).
   - **Open-Meteo** a **Meta** (Messenger, WhatsApp, Facebook – samostatný správce).
   - **Microsoft (Clarity) a Google (GTM/GA):** jen převezmi z dnešního textu, mění je úkol 10.
   - **ntfy / Telegram:** jen pokud je majitel v úkolu 02 zapnul.

   Co ověřit nejde, označ `neověřeno`. Do zásad se nic neověřeného nepíše jako fakt. Věta „Vše na základě zpracovatelských smluv“ smí zůstat jen s doloženou smlouvou.
5. **Registr `content/zpracovani.json`** (mimo `$PUB`; `content/` se dnes nepublikuje, `/content/ceny.json` vrací 404). Údaje o správci se nekopírují, berou se z `content/firma.json`. Zkrácená struktura:
   ```json
   {
     "verze": "2026-10-DD",
     "platne_od": null,
     "schvaleno": { "majitel": false, "kdo": null, "datum": null, "pravnik": null },
     "newsletter": { "existuje": null },
     "ai": { "verejny_asistent": ["claude", "gemini", "gpt"], "interni": ["claude", "gemini", "gpt", "grok"] },
     "prijemci": {
       "netlify": { "nazev": "[ověř přesný název]", "role": "zpracovatel", "co": "hosting a funkce, Netlify Forms (poptávky včetně fotografií), Blobs, AI Gateway", "kde": "[ověř]", "zaruka": "[ověř]", "osobni_udaje": true, "hostitele": [], "zdroj": "docs/zpracovani/smlouvy.md#netlify" },
       "anthropic": { "ai": "claude", "hostitele": ["api.anthropic.com"], "...": "..." },
       "ntfy": { "osobni_udaje": false, "podminka": "NTFY_TEMA", "hostitele": ["ntfy.sh"] }
     },
     "ucely": [
       { "id": "poptavka", "kotva": "poptavky", "nazev": "Poptávka a cenová nabídka",
         "formulare": ["hspg-poptavka", "hspg-akce", "hspg-fotky"],
         "udaje": ["jméno a příjmení", "telefon", "e-mail", "adresa objektu", "povrch a služba", "poznámka", "fotografie", "navržené termíny", "číslo poptávky", "zdroj návštěvy"],
         "titul": "čl. 6 odst. 1 písm. b GDPR – jednání o smlouvě na vaši žádost",
         "povinnost": "Bez kontaktu a adresy nabídku připravit nemůžeme, ostatní údaje jsou dobrovolné.",
         "prijemci": ["netlify", "seznam"],
         "uchovani": { "mesice": null, "text": "[DOPLNIT: 12 měsíců / 3 roky od odeslání, pokud nevznikne zakázka – O1]" } }
     ],
     "uloziste_prohlizece": [
       { "nazev": "hspg-souhlas", "typ": "localStorage", "ucel": "vaše volba v liště cookies", "doba": "do smazání v prohlížeči", "bez_souhlasu": true }
     ]
   }
   ```
   Pravidla registru:
   - Každý účel z inventury má záznam: poptávka, zavolání zpět, fotky, akce, zakázka a záruka, reklamace, pas domu a registr zakázek, hodnocení, reference, veřejný asistent AI, interní AI, počasí, zprávy (telefon, e-mail, Messenger, WhatsApp), uchazeči, dodavatelé, zdroj návštěvy, provoz a bezpečnost, cookies a úložiště. Newsletter jen při `newsletter.existuje === true`.
   - Co rozhoduje majitel, je `[DOPLNIT: … – Ox]` a `mesice: null`. Doby uchování jsou strojově čitelné (`mesice`), protože z nich bude číst mazací skript úkolu 19.
   - `ai.verejny_asistent` je výchozí návrh do rozhodnutí O4: bez Groku, aby měl veřejný asistent co nejméně příjemců. `ai.interni` zachovává majitelův požadavek „všechny AI“ (4. 10. potvrzeno: přidat i další – dnes `claude, gpt, gemini, grok, mistral, deepseek, llama, perplexity`). Pokud v něm zůstane Grok, registr musí obsahovat i OpenRouter a xAI.

   **Bod zastavení:** když sezení nestačí na celou fázi A, commitni a pushni větev po kroku 5 (dokumenty a registr, kód beze změny) s průběžným hlášením. Kroky 6–12 navážou ve stejné větvi v dalším sezení.
6. **AI jen od poskytovatelů v registru.**
   - `asistent.mjs` → `poradi(env)`: k filtru `POSKYTOVATELE[id] && jeZapnuty(id, env)` přidej podmínku, že `id` je v `ai.verejny_asistent` (import `../../content/zpracovani.json` se stejnou konvencí jako `firma.json` v `submission-created.mjs`).
   - `ai.mjs` (interní): poskytovatel mimo `ai.interni` vrátí 400 „Tato AI není povolená v zásadách.“
   - `GET /api/asistent` pak hlásí jen povolené AI, takže upozornění v H-BOT a zásady jmenují stejné poskytovatele.
7. **Push bez osobních údajů, dokud ho registr neuvádí.** V `submission-created.mjs` se osobní údaje v ntfy nebo Telegramu pošlou jen tehdy, když je `OZNAMENI_S_UDAJI=1` **a zároveň** má daný kanál v registru `osobni_udaje: true`. Do `INTERNI` přidej `Verze zásad` (do e-mailu majiteli nepatří).
8. **Otisky v Netlify Blobs: tajná denní sůl a mazání.** V `netlify/lib/ai/limity.mjs`:
   - Nahraď `otiskKlienta(ip, ted)` funkcí `otisk(ul, hodnota, ted)` = SHA-256(`sul|hodnota`), kde `sul` je 32 náhodných bajtů z `crypto.randomBytes` uložených pod `sul/<den>`. Vznikne při prvním použití v daný den. Zapisuj ji podmíněně `setJSON(…, { onlyIfNew: true })` jako `aktualizuj()` v `limity.mjs`. Výsledek vyhodnoť jako `tajemstviServeru()` v `autorizace.mjs`: úspěch je jen `modified: true` s neprázdným `etag`; při `modified: false` sůl mezitím zapsal souběžný požadavek, načti ji; jinak vyhoď výjimku a sůl do mezipaměti neukládej (volající vrátí 503 nebo režim bez AI). Test: `pametoveUloziste` se `setJSON`, který vrací `{modified:true, etag:""}` → `otisk()` vyhodí výjimku.
   - Klíče limitů přesuň pod den: `limit/<den>/k10/<otisk>`, `limit/<den>/kden/<otisk>`, `limit/<den>/login/<otisk>`. Úložiště `hspg-oznameni` z úkolu 02 (otisk e-mailu) převeď stejně.
   - Úklid `uklid(ul, ted)`: nejvýš jednou za hodinu (značka `uklid/posledni`) smaž `list({ prefix })` + `delete` všechny klíče `limit/<den>/…` a `sul/<den>` starší než včerejšek. Celkovou útratu (`utrata/<měsíc>`) nech, osobní údaje neobsahuje.
   - Úklid běží při volání funkcí a navíc v plánované funkci `netlify/functions/uklid-otisku.mjs` (`export const config = { schedule: "@daily" }`) pro obě úložiště (`hspg-ai` i `hspg-oznameni`). Bez ní by ve dnech bez návštěv staré otisky a soli zůstaly a věta o 2 dnech by neplatila. Plánované funkce běží jen na produkčním nasazení. Je to jedno volání denně, kredity to prakticky nezatíží.
   - Převeď všechna volání (`asistent.mjs`, `majitel.mjs`, `submission-created.mjs`). Argument zachovej: `otiskKlienta(sitKlienta(ip), ted)` → `await otisk(ul, sitKlienta(ip), ted)` (IPv6 po sítích /64). `vratPokusOPrihlaseni(ul, klient, …)` musí vracet pokus do stejného klíče `limit/<den>/login/<otisk>` jako `povolPokusOPrihlaseni` (v `majitel.mjs` se čas počítá jednou: `const t = ted()`); `limit/login-vse` ponech. Čítače dál jen přes `pricti` / `vrat` z `limity.mjs`. Pokud se ve webu používá `pametoveUloziste` pro testy, doplň do něj `list` a `delete`.
   - Komentář v záhlaví `limity.mjs` přepiš tak, aby odpovídal skutečnosti (tajná denní sůl, mazání po 2 dnech).
   - Do zásad pak smí věta: „Na ochranu před zneužitím ukládáme nejdéle 2 dny otisk IP adresy vytvořený s denně měněným tajným klíčem. Po smazání klíče už otisk nejde přiřadit k IP adrese.“

   Do kódu, logu ani hlášení nepiš nic, co by usnadnilo zpětné dohledání otisků.
9. **Interní AI: pseudonymizace.**
   - Nový modul `netlify/lib/ai/soukromi.mjs`:
     - přesuň do něj `maskujKontakty` z `asistent.mjs` (re-export v `asistent.mjs` zachovej kvůli zpětné kompatibilitě se stávajícími importy)
     - přidej `pseudonymizuj(text)`:
       - e-mail → `[EMAIL]`, telefon → `[TELEFON]`
       - u řádků se štítkem (`Jméno`, `Příjmení`, `Jméno a příjmení`, `Jméno ke zveřejnění`, `Kontakt…`, `E-mail`/`email`, `Telefon`, `Adresa…`) nahraď hodnotu `[ZÁKAZNÍK]`, `[KONTAKT]`, `[TELEFON]` nebo `[ADRESA]`; u adresy ponech jen část za poslední čárkou (obec)
       - ve volném textu nahraď vzor „ulice + číslo popisné“ za `[ADRESA]`
       - telefon a e-mail firmy z `firma.json` nemaskuj
   - Volej ho v `ai.mjs` na každé zprávě i na volitelném `pokyn` před odesláním.
   - V `ai-centrum/index.html` a `hbot-majitel.js` změň ukázkový text na „Např.: Poptávka z Kolína – čištění eternitové střechy 120 m²…“ a pod pole přidej poznámku: „Jména, adresy, telefony a e-maily se před odesláním AI nahrazují značkami. Jména ve volném textu nepoznáme spolehlivě, nepište je.“
   - Jména ve volném textu se spolehlivě rozpoznat nedají. Netvrď to v zásadách ani v testech.
10. **Počasí jen s obcí.** Ve zdroji funkce `pocasi` ověř a testem (mock `fetch`) potvrď, že na Open-Meteo odchází jen obec. Na `/akce/` posílej na `/api/pocasi` jen část adresy za poslední čárkou (pokud čárka chybí, celé pole jako dnes). Server dál obec vybírá sám.
11. **Testy fáze A** (`node --test`, bez nových závislostí):
    - `tests/soukromi.test.mjs`:
      - `poradi` s falešnými klíči `TEST` pro všechny AI vrátí jen ID z `ai.verejny_asistent`; `ai.mjs` odmítne AI mimo `ai.interni`
      - `GET` na handler z `vytvorAsistenta` (falešné klíče `TEST` pro všechny AI, `pametoveUloziste()`, žádné volání ven) vrátí v `poskytovatele` právě názvy (`POSKYTOVATELE[id].nazev`) z `ai.verejny_asistent`
      - push: s `OZNAMENI_S_UDAJI=1` a `osobni_udaje:false` v titulku ani textu není jméno, telefon, e-mail ani adresa
      - otisk: stejná hodnota ve stejný den dá stejný otisk, jiný den jiný; se dvěma různými solemi pro stejný den a hodnotu vyjdou různé otisky; po úklidu nezůstane klíč ani sůl starší než včerejšek (pro `hspg-ai` i `hspg-oznameni`); `uklid-otisku.mjs` exportuje `config.schedule`
      - `pseudonymizuj`:
        - vstup „Jméno: Jan Novák\nTelefon: 777 123 456\nAdresa objektu: Lipová 12, Kolín“ → `[ZÁKAZNÍK]`, `[TELEFON]`, `[ADRESA], Kolín`
        - ve volném textu „volejte 777 123 456, Lipová 12, Kolín“ zmizí telefon i ulice
        - telefon firmy zůstane
      - počasí: dotaz „Lipová 12, Kolín“ vede k upstream URL bez „Lipová“
      - žádné `console.*` ve funkcích nedostane text dotazu (spy na `console`)
    - `tests/zasady.test.mjs` (část A):
      - registr jde parsovat a každý účel má `titul`, `udaje`, `prijemci` a `uchovani`
      - každý `form-name` v `$PUB` (HTML i JS) má účel
      - každý hostitel `https://…` a `smtp.…` v `netlify/functions/**` a `netlify/lib/**` patří příjemci v registru
      - `ai.*` ⊆ klíče `POSKYTOVATELE` a ke každé AI existuje příjemce s `ai: id`; Grok bez `XAI_API_KEY` vyžaduje příjemce `openrouter`
      - každý příjemce z registru má v `docs/zpracovani/smlouvy.md` sekci (kotva ze `zdroj`) s řádkem `Ověřeno: RRRR-MM-DD` nebo `Ověřeno: neověřeno`
12. **Hlášení fáze A** (formát níže) a commit. Pokud sezení pokračuje, pokračuj fází B ve stejné větvi.

### Fáze B – jedno znění zásad, formuláře a odkazy (náhled, nesloučit)
1. **Archiv:** ulož dnešní zásady a pravidla akce do `docs/zpracovani/archiv/2026-08-22-zasady.html` a `…-pravidla-akce.html` (mimo `$PUB`). Dosavadní payloady verzi nenesly, archiv dokládá, co zákazníci viděli.
2. **Generátor `scripts/build-zasady.mjs`** podle konvence ostatních build skriptů (značky `<!-- XXX:START -->` / `END`, `--kontrola` = nic nezapíše a skončí kódem 1, pokud by se něco změnilo):
   - V zásadách přepíše bloky `ZPRACOVANI:PREHLED`, `:PRIJEMCI`, `:PREDAVANI`, `:DOBY`, `:AI`, `:ULOZISTE` a `:VERZE` z registru. Generuje je jako seznam karet (`<dl>`), ne jako širokou tabulku, aby na 360 px nevznikl vodorovný posun.
   - Ve všech formulářích a registračních formulářích nastaví `value` u `<input type="hidden" name="Verze zásad">` a v JS přepíše hodnotu za značkou `/*ZASADY:VERZE*/` (konvence jako `/*KONTAKT:ROLE*/` z úkolu 03).
   - `--brana`: kód 0, jen pokud platí všechno z tohoto seznamu:
     - `schvaleno.majitel === true` s vyplněným `kdo` a `datum`
     - `platne_od` je vyplněné
     - `newsletter.existuje` je boolean
     - poptávka má číselné `mesice`
     - v registru ani ve vygenerovaných souborech není `[DOPLNIT`
     - jinak vypíše, co chybí, a skončí kódem 1
   - Napoj generátor do build příkazu (za `build-kontakty`).
   - **Brána před produkcí na dvou místech**, protože KONTEXT §4 bod 4 dovoluje i přímé `node scripts/nasadit.mjs --produkce` a to npm skript `preprodukce` obejde:
     - Do `package.json` přidej `"preprodukce": "node scripts/build-zasady.mjs --brana"`. Pokud `preprodukce` už existuje, připoj bránu za stávající příkaz (`… && node scripts/build-zasady.mjs --brana`), nepřepisuj ho.
     - V `scripts/nasadit.mjs` (kopie ve webHSPGH) spusť při `--produkce` před nasazením `node scripts/build-zasady.mjs --brana`, pokud soubor existuje. Kód ≠ 0 = produkce zamítnuta s výpisem brány. Náhled bránu nespouští. Ostatní logiku pojistky (schválení, větev `main`, čistý strom, denní limit) neměň. Diff do hlášení pro balíček.
3. **`<head>` zásad:** v `og:description` a `twitter:description` nahraď „společností“ textem „Informace o zpracování osobních údajů – Dušan Holub, HOLUB – HSPG.“ Canonical a drobečky nech beze změny (jednotné adresy řeší úkol 06).
4. **Text zásad.** Zachovej stávající `id` (`fotky`, `recenze`, `hbot`, `hbot-ai`, `pocasi`, `messenger`, `cookies`) a přidej nové. Piš srozumitelně, krátkými větami, bez superlativů a nových tvrzení. Na webu dodrž nezlomitelné mezery (KONTEXT §4 bod 9).

   | `id` | Obsah |
   |---|---|
   | `spravce` | Dušan Holub, OSVČ, IČO 09291881, sídlo podle ARES a značka HOLUB – HSPG. Kontakt `info@hspg.cz` (odkaz `data-kontakt="info"` z úkolu 03) a telefon. Pověřenec pro ochranu osobních údajů: `[DOPLNIT: je jmenován? – O3]`. Větu „není jmenován“ napiš až po potvrzení majitelem (posoudí i právník). |
   | `prehled` | Vygenerovaný přehled: účel → údaje → právní titul → doba → příjemci, s odkazem na sekci. |
   | `poptavky` | Poptávka z průvodce i z `/akce/` a číslo poptávky. Uložení v Netlify Forms včetně fotografií. Oznámení majiteli e-mailem (Seznam) a push bez osobních údajů. Potvrzení zákazníkovi jen pokud je zapnuté (úkol 02). Titul čl. 6 odst. 1 písm. b. |
   | `zdroj` | Pole `Předchozí stránka` a `Kampaň`: oprávněný zájem zjistit, odkud poptávky přicházejí. Pole `Reklamní kliknutí` jen se souhlasem s marketingem. Nic se kvůli tomu neukládá v prohlížeči (úkol 02). |
   | `fotky` | Současný text. Větu o odstranění údajů o poloze ponech jen tehdy, když ji potvrdí test z kroku B8. |
   | `akce` | Zařazení poptávky do akce a vyrozumění výherce. Titul čl. 6 odst. 1 písm. b (pravidla jsou smlouvou). Odkaz na `/pravidla-akce/`. |
   | `hbot` | Zavolání zpět na vaši žádost, titul čl. 6 odst. 1 písm. b (ne souhlas). Doba uchování stejná jako u poptávek. |
   | `hbot-ai` | Veřejný asistent: posílá se jen text otázky (telefony a e-maily se maskují). Vygenerovaný seznam poskytovatelů z `ai.verejny_asistent` a cesta k nim podle inventury (přes Netlify AI Gateway, nebo přímo, pokud je v Netlify vlastní klíč); jedna AI píše, druhá kontroluje. Co ukládáme a co ne (podle inventury). Doba uchování u poskytovatelů (ze `smlouvy.md`). Prosba nepsat osobní údaje. Odpovědi jsou orientační. Když je AI vypnutá, odpovídají ověřené FAQ. |
   | `interni-ai` | Majitel používá AI k přípravě textů. Údaje zákazníků se předem pseudonymizují (krok A9). Poskytovatelé z `ai.interni`. |
   | `pocasi` | Jen obec (ověřeno v kroku A10). |
   | `zakazky` | Smlouva, doklady a záruční dokumentace. Délku záruky nepiš natvrdo, použij „po dobu záruky“ nebo ji převezmi z centrálního zdroje úkolu 05. Lhůty pro doklady `[DOPLNIT: podle účetní / daňového poradce – O7]`. Připomínka technické kontroly a její kanál `[DOPLNIT – O8]`. |
   | `reklamace` | Jen pokud existuje úkol 04: vyřízení reklamace, titul čl. 6 odst. 1 písm. c a b, doba uchování `[DOPLNIT: právník]`. |
   | `pas-domu` | Co registr zakázek obsahuje a co pas domu ukazuje (podle inventury). Úkol 14 změní přístup, zásady se pak aktualizují z registru. |
   | `recenze`, `reference` | Současný text bez FormSubmitu. Souhlas jako titul zůstává. |
   | `messenger` | Zprávy přes telefon, e-mail, Messenger a WhatsApp. Meta je samostatný správce. Automatické odpovědi podle skutečného kódu `facebook-webhook`. |
   | `uchazeci` | Uchazeči o práci (telefon, e-mail, Facebook): titul čl. 6 odst. 1 písm. b, doba `[DOPLNIT: návrh 6 měsíců, déle jen se souhlasem – O6]`. |
   | `dodavatele` | Kontaktní osoby dodavatelů: oprávněný zájem, doba `[DOPLNIT – O6]`. |
   | `provoz` | Serverové záznamy u Netlify (doba podle `smlouvy.md`) a otisky pro limity (věta z kroku A8). |
   | `cookies` | Vygenerovaný seznam úložišť v prohlížeči (`ZPRACOVANI:ULOZISTE`, včetně Cache Storage). Odstavce o Clarity a GTM převezmi beze změny a obal je značkami `<!-- COOKIES:START -->` / `<!-- COOKIES:END -->`, které pak přepisuje generátor úkolu 10. Generátor zásad obsah mezi nimi nemění. |
   | `prijemci`, `predavani` | Vygenerované. Uveď jen ověřené záruky, zbytek je `neověřeno` → do hlášení, ne na web. |
   | `doby` | Vygenerovaná tabulka dob uchování. |
   | `prava` | Přístup, oprava, výmaz, omezení, přenositelnost, námitka proti oprávněnému zájmu a odvolání souhlasu. Vyřízení nejpozději do 1 měsíce (čl. 12 odst. 3). Stížnost u ÚOOÚ s adresou ověřenou na uoou.gov.cz. Kontakt `info@hspg.cz` nebo telefon. |
   | `povinnost` | Poskytnutí údajů není zákonnou povinností, bez kontaktu ale nelze připravit nabídku ani zavolat. |
   | `automatizace` | Neprobíhá automatizované rozhodování ani profilování s právními účinky (čl. 22). Odpovědi AI jsou jen informativní. |
   | `newsletter` | Jen pokud O2 = existuje. Jinak se slovo „Holubí pošta“ nevyskytuje nikde. |
   | `zmeny` | Verze, platnost od, datum poslední revize a stručný seznam změn oproti verzi z 22. 8. 2026. |
   | `english` | Anglické shrnutí (krok B5). |

5. **Anglické shrnutí** `<section id="english" lang="en">` na konci stránky (bez nové URL, kvůli úkolu 06):
   - správce a kontakt
   - účely a právní tituly v jednom řádku každý
   - příjemci s odkazem na český seznam, předávání mimo EHP
   - doby uchování
   - práva a ÚOOÚ
   - věta „The Czech version prevails.“

   **Bod zastavení:** když sezení nestačí na celou fázi B, commitni a pushni větev po kroku 5 (generátor a text zásad) s průběžným hlášením. Kroky 6–11 navážou ve stejné větvi.
6. **Formuláře** (statický registrační formulář i JS payload; 02 kontroluje testem, že každý klíč payloadu je v registraci):

   | Formulář | Změna |
   |---|---|
   | `hspg-poptavka` (homepage, krok 6) | Odstraň povinné zaškrtávací pole a `state.consent` z validace. Nad tlačítko odeslání dej informační větu: „Údaje použijeme jen k přípravě nabídky a domluvě zakázky. Podrobnosti v [Zásadách ochrany osobních údajů](/ochrana-osobnich-udaju#poptavky).“ V payloadu i v registraci nahraď `Souhlas se zpracováním osobních údajů` polem `Verze zásad`. |
   | `hspg-akce` (`/akce/`) | Zaškrtávací pole „Souhlas se zpracováním osobních údajů“ nahraď stejnou informační větou. Pro pravidla akce přidej samostatné pole `name="Účast v akci" value="ano"` s textem „Přihlašuji poptávku do akce ‚Vypusťte holuba‘ a souhlasím s [pravidly akce](/pravidla-akce/).“ Zatím ho nech `required`, protože bod 1 pravidel zařazuje každou poptávku z `/akce/`; dobrovolnost řeší úkol 18 spolu s 13. Přidej `Verze zásad`. |
   | `hspg-zavolejte` (H-BOT) | Zaškrtávací pole zůstává (`name="souhlas"` používá e2e test balíčku), mění se text: „Beru na vědomí, že jméno a telefon použijete jen k tomu, abyste mi zavolali ([zásady](/ochrana-osobnich-udaju#hbot)).“ Chybová hláška: „Potvrďte prosím, že berete na vědomí, k čemu údaje použijeme.“ V payloadu nahraď `Souhlas: ano` za `Informace o zpracování: potvrzeno` a přidej `Verze zásad`. Registraci v `index.html` uprav stejně. |
   | `hspg-fotky` | Text ponech, přidej `Verze zásad`. |
   | `hspg-recenze` | Souhlas se zveřejněním ponech (je skutečným titulem), přidej `Verze zásad`. |
   | `hspg-reklamace` (úkol 04) | Pokud má pole „souhlas se zpracováním“, nahraď ho informační větou s odkazem na `#reklamace`. Přidej `Verze zásad`. |

   Upravené testy úkolů 02 a 03 (vyplnění souhlasu na `/akce/`) přizpůsob novým polím.
7. **Pravidla akce:**
   - Obsah sekce `#gdpr` (ř. 68–74) nahraď větou: „Údaje z poptávky a z účasti v akci zpracováváme podle [Zásad ochrany osobních údajů](/ochrana-osobnich-udaju#akce). Vlastní ustanovení o osobních údajích tato pravidla nemají.“ `id="gdpr"` zachovej.
   - Sekci Cookies (ř. 76–77) zkrať na odkaz na `#cookies`.
   - Body 1–7 neměň (úkol 13).
   - Pokud existuje návrh `docs/tvrzeni/pravidla-akce-v2-navrh.md`, ověř, že v bodě o osobních údajích jen odkazuje na zásady.
8. **H-BOT, odkazy a fotky:**
   - **H-BOT:** na konec upozornění o AI v `hbot-panel.js` (zpráva „Na vlastní otázky odpovídají spolupracující AI …“) přidej „[Jak s dotazy nakládáme](/ochrana-osobnich-udaju#hbot-ai)“. Text „spolupracující AI (…)“ ponech kvůli e2e testu balíčku.
   - **Kariéra a spolupráce:** pod výzvu na `/kariera` přidej „Jak nakládáme s údaji uchazečů: [Zásady](/ochrana-osobnich-udaju#uchazeci).“ a na `/spoluprace` obdobně `#dodavatele`.
   - **`/en`:** „Privacy policy“ veď na `/ochrana-osobnich-udaju#english` a označení „(in Czech)“ z úkolu 13 odstraň **jen u tohoto odkazu**. U „Cookie settings“ ho nech, sekce `#cookies` zůstává česky. Tím je hotový i odkaz z kroku 21 úkolu 13.
   - **Patička generovaných stránek:** v šabloně `build-regions.mjs` (generuje 231 okresních stránek a `/cisteni-dlazby/`) a ručně na `/cisteni-fasad/` a `/cisteni-strech/` přidej před „Nastavení cookies“ odkaz „Ochrana osobních údajů“ ve stejné podobě adresy, jakou má většina webu (dnes `/ochrana-osobnich-udaju`). Pak stránky přegeneruj. Jde jen o odkaz, sjednocení patiček řeší úkol 08.
   - **Fotky:** e2e testem ověř, že fotka zmenšená na `/akce/` a v `fotky-upload.js` (canvas → JPEG) neobsahuje EXIF ani GPS. Testovací JPEG s GPS vytvoř v testu. Když test neprojde, věta o odstranění polohy ze zásad zmizí a zapíše se do hlášení.
9. **Postup pro majitele** → `docs/zpracovani/zadosti-a-mazani.md` (mimo `$PUB`). Obsah:
   - jak vyřídit žádost o přístup nebo výmaz: Netlify → Forms, schránky Seznam včetně `profiserv@seznam.cz`, registr zakázek, Messenger
   - měsíční ruční mazání podle tabulky dob, dokud nebude skript úkolu 19
   - lhůta 1 měsíc
   - vzor odpovědi
10. **Testy fáze B:**
    - **`tests/zasady.test.mjs` (část B):**
      - `build-zasady.mjs --kontrola` skončí kódem 0
      - zásady obsahují všechna `id` z tabulky B4 (podmíněná `reklamace` jen při existenci `hspg-reklamace`, `newsletter` jen při `newsletter.existuje === true`) a v `$PUB` existuje každá kotva, na kterou vede odkaz (HTML i JS)
      - v zásadách ani v pravidlech akce není `FormSubmit`
      - „Holubí pošt“ je jen při `newsletter.existuje === true`
      - „Souhlasím se zpracováním“ se nevyskytuje v `$PUB` ani v `assets/`
      - každý registrační formulář má `Verze zásad` = `verze` z registru
      - sekce `#english` má `lang="en"`
      - `/pravidla-akce/` nemá vlastní doby uchování (regex `měsíc|let` v sekci `#gdpr` → 0)
      - `package.json` → `scripts.preprodukce` obsahuje `build-zasady.mjs --brana` a `scripts/nasadit.mjs` ji při `--produkce` volá
    - **`tests/e2e/souhlasy.e2e.test.mjs`** (Playwright, lokální server jako u úkolu 02, všechny POST zachycené přes `page.route`, nic neodchází ven):
      - `/akce/`: chybí pole se slovem „zpracováním“, je tam jedno pole `Účast v akci` s odkazem na pravidla, payload má `Verze zásad` a nemá `Souhlas se zpracováním osobních údajů`
      - homepage průvodce: krok 6 nemá povinné zaškrtávací pole a payload má `Verze zásad`
      - H-BOT:
        - text u zavolání zpět neobsahuje „Souhlasím“ a payload má `Informace o zpracování`
        - upozornění o AI (falešná AI ze serveru balíčku) odkazuje na `#hbot-ai`
      - `/recenze/` a `/akce/dekujeme/`: payload má `Verze zásad`
      - zásady na 360 px: `scrollWidth <= innerWidth`
      - EXIF test z kroku B8
11. **Náhled a hlášení:**
    - Spusť všechny testy webu i testy balíčku proti webu.
    - Lighthouse (mobil) `/ochrana-osobnich-udaju`: přístupnost a SEO před úkolem a po něm.
    - Náhled přes `npm run nahled` (0 kreditů).
    - Pošli majiteli odkaz na náhled zásad se seznamem `[DOPLNIT]` a otázkami O1–O11.
    - **Hlášení fáze B a zastav se. Větev nesluč do `main`.**

### Fáze C – po rozhodnutí majitele
1. Odpovědi zapiš do registru:
   - doby uchování (`mesice` i text)
   - `newsletter.existuje`
   - výběr AI
   - účetní a daňové lhůty
   - kanály
2. Pokud newsletter neexistuje, odstraň ho ze zásad. Pokud existuje, jen ho popiš pravdivě a zavedení přihlášení navrhni jako samostatný úkol.
3. `node scripts/build-zasady.mjs`, pak `--kontrola` → 0.
4. Majitel text schválí písemně (e-mail nebo zpráva). Zapiš `schvaleno` (kdo, datum, zda prošel právníkem) a `platne_od` = datum plánovaného produkčního nasazení. `--brana` → 0.
5. `git fetch` a rebase na aktuální `main`, znovu všechny testy, nový náhled a krátká kontrola s majitelem. Pak sloučení do `main`.
6. Produkce jen přes `npm run produkce -- --schvaleno "…"` v dávce s dalšími úkoly (KONTEXT §4 bod 4). Pokud se nasazení posune, uprav `platne_od`.
7. Po nasazení ověř na živém webu GET dotazy z části Ověření.
8. Předej dál:
   - úkolu 19 doby uchování z registru
   - úkolu 02, zda smí zapnout `OZNAMENI_S_UDAJI` (jen pokud registr uvádí kanál s `osobni_udaje: true`)

### Otázky pro majitele (do hlášení fáze B)
- **O1** Doba uchování poptávek, ze kterých nevznikla zakázka: 12 měsíců, nebo 3 roky? 12 měsíců znamená méně uložených dat, 3 roky odpovídají obecné promlčecí lhůtě (§ 629 OZ). Rozhodnutí posoudí právník.
- **O2** Existuje „Holubí pošta“: kde se lidé přihlašují, kdo ji odebírá a čím se posílá? Pokud ne, ze zásad zmizí.
- **O3** Kdo text schválí a do kdy? Chcete před zveřejněním revizi právníkem? Máte jmenovaného pověřence pro ochranu osobních údajů (u OSVČ obvykle ne, potvrďte)?
- **O4** Veřejný asistent: souhlasíte s Claude a Gemini, případně ChatGPT jako zálohou? Grok jen v interním panelu, nebo vůbec?
- **O5** Upozornění do mobilu zůstanou bez osobních údajů (doporučeno)?
- **O6** Jak dlouho uchovávat údaje uchazečů o práci (návrh 6 měsíců, déle jen se souhlasem) a kontakty dodavatelů?
- **O7** Kdo vede účetnictví nebo daňovou evidenci (účetní, daňový poradce) a jaké lhůty pro doklady platí?
- **O8** Používáte WhatsApp a Messenger? Jak připomínáte technickou kontrolu: telefonem, SMS z mobilu, nebo e-mailem?
- **O9** Ponechat kopii oznámení na `profiserv@seznam.cz`? Podmínky zpracování u bezplatné schránky viz `smlouvy.md`.
- **O10** U formulářů stačí informační věta (doporučeno, méně povinných polí), nebo chcete zaškrtávací pole „Beru na vědomí…“? Formulace „Souhlasím se zpracováním“ se už nepoužije.
- **O11** Chcete formuláře pro kariéru a spolupráci? Šlo by o samostatný úkol (fotky a životopisy by se ukládaly v Netlify).

## Akceptační kritéria
Fáze A:
- [ ] `node --test tests/soukromi.test.mjs` – vše prošlo (uveď počet a názvy testů z kroku A11).
- [ ] `node --test tests/zasady.test.mjs` (část A) prošel: každý `form-name`, každý externí hostitel ve funkcích a každá povolená AI má záznam v registru.
- [ ] Test `GET` z `tests/soukromi.test.mjs` (falešné klíče `TEST` pro všechny AI, paměťové úložiště) prošel: `poskytovatele` obsahuje jen názvy z `ai.verejny_asistent`. Skutečné klíče se k tomu nepoužívají ani nezakládají.
- [ ] `git grep -nE 'limit/(k10|kden|login)/\$\{' netlify/` nic nenajde (klíče jsou pod dnem), `git grep -n "otiskKlienta"` také nic a `git grep -n "createHash" netlify/ | grep -v "lib/ai/limity.mjs"` nenajde nic, co počítá otisk IP nebo e-mailu (otisk e-mailu z úkolu 02 jde přes `otisk()`; jiné výskyty, např. ve `sentinel-validate`, vysvětli v hlášení).
- [ ] `git grep -n "schedule" netlify/functions/uklid-otisku.mjs` → 1 výskyt a test úklidu prošel pro obě úložiště.
- [ ] `docs/zpracovani/inventura.md` a `smlouvy.md` existují mimo publikovaný obsah (ve fázi B to potvrdí 404 na náhledu) a test `zasady.test.mjs` (část A) ověří, že každý příjemce z registru má v `smlouvy.md` sekci s řádkem `Ověřeno: RRRR-MM-DD` nebo `Ověřeno: neověřeno`.

Fáze B:
- [ ] `node scripts/build-zasady.mjs --kontrola` → kód 0. `--brana` → kód 1 a vypíše zbývající `[DOPLNIT]` a chybějící schválení.
- [ ] `node -p "require('./package.json').scripts.preprodukce"` obsahuje `build-zasady.mjs --brana` a `grep -c "build-zasady" scripts/nasadit.mjs` → ≥ 1.
- [ ] `grep -rIn "Souhlasím se zpracováním" "$PUB"` → nic. `grep -rIil "formsubmit" "$PUB"/ochrana-osobnich-udaju* "$PUB"/pravidla-akce/` → nic.
- [ ] `node --test tests/zasady.test.mjs` a `CHROMIUM=… node --test --test-concurrency=1 tests/e2e/souhlasy.e2e.test.mjs` – vše prošlo a žádný požadavek neodešel mimo lokální server.
- [ ] Testy úkolů 02 a 03 a testy balíčku (`npm test`, `npm run test:e2e` proti webu) dál prochází (uveď počty).
- [ ] V `$PUB` je odkaz na zásady na všech stránkách s patičkou: příkaz s patičkou z části Ověření vrátí 0 (dnes 234). Případné další stránky bez patičky vypiš v hlášení s důvodem.
- [ ] Lighthouse (mobil) `/ochrana-osobnich-udaju`: přístupnost ani SEO neklesly (uveď čísla před a po).
- [ ] Náhled: `curl -s <náhled>/ochrana-osobnich-udaju | grep -c 'id="uchazeci"'` → 1, `… | grep -c 'id="english"'` → 1, `… | grep -o '<meta[^>]*description[^>]*>' | grep -c "společností"` → 0.
- [ ] Náhled: `curl -s -o /dev/null -w "%{http_code}" <náhled>/docs/zpracovani/inventura.md` → 404 a totéž pro `/content/zpracovani.json`.

Fáze C:
- [ ] `--brana` → kód 0 a registr obsahuje `schvaleno.kdo`, `schvaleno.datum` a `platne_od`.
- [ ] Na živém webu po nasazení: `curl -s https://hspg.cz/ochrana-osobnich-udaju | grep -ci "formsubmit\|holubí pošt"` → 0 (Holubí pošta jen při O2 = existuje) a `curl -s https://hspg.cz/ochrana-osobnich-udaju | grep -c "$(node -p "require('./content/zpracovani.json').verze")"` → ≥ 1.

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
node scripts/build-zasady.mjs && node scripts/build-zasady.mjs --kontrola   # kód 0
node scripts/build-zasady.mjs --brana; echo "kód $?"                       # A/B: 1 + seznam, C: 0
node --test tests/soukromi.test.mjs tests/zasady.test.mjs                   # pass N, fail 0
CHROMIUM=<cesta> node --test --test-concurrency=1 tests/e2e/*.e2e.test.mjs  # vč. 02, 03 a souhlasy
grep -rIn "Souhlasím se zpracováním" "$PUB"                                  # nic
grep -rIc "Holubí pošt" "$PUB" | grep -v ":0$"                               # nic (pokud O2 = neexistuje)
grep -rLE "href=['\"]/ochrana-osobnich-udaju(\.html)?['\"]" --include=*.html "$PUB" | grep -vE '/(ai-centrum|rd-control-panel|offline)/' | wc -l   # 0 (interní stránky bez patičky jsou vyňaté jako v úkolu 08)
git grep -n "createHash" netlify/ | grep -v "lib/ai/limity.mjs"            # žádný otisk IP ani e-mailu mimo limity.mjs
git grep -nE "(api[_-]?key|token|secret|heslo)\s*[:=]\s*['\"][^'\"]{8,}" -- netlify scripts content   # nic
PUBABS=$(cd "$PUB" && pwd)
cd ../hspg-balicek && npm test && HSPG_MIRROR="$PUBABS" CHROMIUM=<cesta> npm run test:e2e   # stejně jako v úkolu 02
```
Testy, které agent přidá:
- `tests/soukromi.test.mjs`: povolení AI (včetně `GET` asistenta s falešnými klíči), pojistka pushe, otisky a úklid (i plánovaný), pseudonymizace, počasí, logy
- `tests/zasady.test.mjs`: registr ↔ kód, generátor, kotvy, zakázané výrazy, verze ve formulářích
- `tests/e2e/souhlasy.e2e.test.mjs`: texty a payloady formulářů, H-BOT, 360 px, EXIF

Formuláře se na náhledu ani na produkci neodesílají. Vše se testuje lokálně přes `page.route`.

## Bez AI / s AI
Zásady i formuláře fungují stejně bez AI. Upozornění o AI se v H-BOT ukáže jen při `ai:true`. Sekce `#hbot-ai` popisuje AI jako volitelnou („pokud je zapnutá“) a uvádí, že jinak odpovídají ověřené FAQ. Povolení AI z registru jen zmenšuje výběr poskytovatelů. Když nezbude žádný povolený, `GET /api/asistent` vrátí `ai:false` a H-BOT odpovídá z FAQ (KONTEXT §4 bod 6). Pseudonymizace interní AI běží na serveru a nemá vliv na zákaznický web.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Nezveřejňovat bez schválení:** větev se do `main` slučuje až ve fázi C po písemném schválení majitele. `[DOPLNIT]` se nikdy nedostane na produkci, hlídá to `--brana` v `preprodukce` i v `scripts/nasadit.mjs --produkce`.
- **Pravdivost:** zásady popisují jen ověřené zpracování. Příjemce, záruka předání nebo smlouva bez doložení se na web nepíše jako fakt. Žádná nová tvrzení o firmě, technologiích, recenzích ani pojištění. Délku záruky nepiš natvrdo (úkol 05).
- **Žádná data zákazníků** v repozitáři, testech, hlášení ani v logu. Testovací data jsou smyšlená a označená `TEST`. Otisky a soli se nikam nevypisují.
- **Formuláře:** nic neodesílat do produkčních ani náhledových formulářů. Nezakládat nové schránky (`gdpr@`), kontakt je `info@hspg.cz`. **MX ani DNS neměnit.**
- **AI:** nezakládat klíče Gemini, xAI ani jiné (KONTEXT §2). Měnit jen seznam povolených AI v registru.
- **Soubory z balíčku** (`asistent.mjs`, `ai.mjs`, `majitel.mjs`, `limity.mjs`, `submission-created.mjs`, `hbot-panel.js`, `hbot-majitel.js`, `ai-centrum/index.html`, `scripts/nasadit.mjs`) měň jen ve webHSPGH. Balíček `HSPG-WEB` neměň, diff uveď v hlášení.
- Produkce jen po schválení majitelem, v dávce a přes `scripts/nasadit.mjs`.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5, zvlášť po fázi A, B a C, a navíc:
- **Fáze A:**
  - publikační adresář a nalezené soubory
  - shrnutí inventury (tabulka) a nesrovnalosti kód ↔ zásady
  - stav příjemců ze `smlouvy.md` (ověřeno / neověřeno)
  - které AI jdou přes AI Gateway a které přímo přes vlastní klíč (jen názvy proměnných, žádné hodnoty)
  - výsledky testů (počty)
  - opravené logy
  - diff souborů převzatých z balíčku, aby se promítly zpět do balíčku
- **Fáze B:**
  - odkaz na náhled zásad
  - seznam všech `[DOPLNIT]` (soubor, místo, otázka)
  - otázky O1–O11
  - výstup `--brana`
  - Lighthouse před a po
  - výsledky testů včetně testů úkolů 02 a 03 a balíčku
  - výsledek EXIF testu
  - seznam změněných souborů
- **Fáze C:** kdo a kdy schválil, `verze` a `platne_od`, odkaz na nasazení a výsledky kontrol na živém webu.
- **Předávky:**
  - **10:** seznam úložišť v prohlížeči (`uloziste_prohlizece` v registru – úkol 10 je převezme do `content/mereni.json`, nebo je z registru čte, aby nebyla evidovaná dvakrát), značky `COOKIES:START/END` v sekci `#cookies`, otázka, zda Cache Storage service workeru potřebuje souhlas, mrtvý kód `hspg-cookies-ok` a odkaz „Details“ v liště na `/en` (`#english`). Anglické shrnutí zásad už existuje (`#english`), poznámka „anglické zásady → úkol 18“ v zadání 10 tím odpadá.
  - **14:** přístup k pasu domu a pole „poznámka“ v registru zakázek; zásady se po změně aktualizují z registru. `otiskKlienta()` už neexistuje: omezení pokusů v úkolu 14 použije `otisk(ul, sitKlienta(ip), ted)` a klíče `limit/<den>/…`, aby je mazal úklid.
  - **07:** `preprodukce` už obsahuje bránu zásad. Pokud úkol 07 přidává `npm run build`, připojí ho před ni a bránu zachová.
  - **13:** odkaz „Privacy policy“ na `/en` (krok 21 úkolu 13) je hotový.
  - **18:** pole `Účast v akci` je oddělené; dobrovolnost a neutrální poptávka spolu s pravidly v2 (13); nové formuláře převezmou informační větu a `Verze zásad`
  - **19:** doby uchování v `content/zpracovani.json` (`ucely[].uchovani.mesice`) pro mazací skript; do postupu patří i schránka `profiserv@seznam.cz`
  - **02:** pravidlo pro `OZNAMENI_S_UDAJI`; převod otisku e-mailu na tajnou sůl a plánovaný úklid `uklid-otisku`
  - **08:** odkaz na zásady v patičkách generovaných stránek
  - **13:** text automatické odpovědi Messengeru, pokud obsahuje nedoložená tvrzení
- **Návrhy mimo rozsah:**
  - formuláře pro kariéru a spolupráci (O11)
  - newsletter s double opt-in (O2)
  - service worker by neměl ukládat navigace s parametry v URL (`/akce/?adresa=…`)
  - záznamy o činnostech zpracování (čl. 30 GDPR) z registru podle posouzení právníka
