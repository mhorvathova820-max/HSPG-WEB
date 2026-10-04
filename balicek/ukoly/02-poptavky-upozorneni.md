# Úkol 02: Poptávky – viditelnost a druhý kanál upozornění
> Priorita P0 · Závisí na: 00, 01 · Čeká na majitele: kanál upozornění (ntfy nebo Telegram) a jeho nastavení, heslo pro SMTP (`SMTP_HESLO`) v Netlify, schválení textu potvrzení zákazníkovi a lhůty odpovědi, souhlas s testovacími odesláními `TEST` · Rozsah: zapnutí a doladění funkce `submission-created`, předmět a Reply-To oznámení, číslo poptávky, zdroj návštěvy, návod pro majitele, koncový test na náhledu. Dvě fáze: **A** kód a testy lokálně (bez odesílání), **B** koncový test s majitelem na náhledu.

## Proč (s důkazy)
- **Oznámení dorazila, ale zapadla.** Netlify posílá oznámení o odeslaných formulářích na `profiserv@seznam.cz` i `info@hspg.cz` s předmětem „Form submission from hspg-… form“. Majitel je přehlédl mezi 2 710 nepřečtenými e-maily. Problém je tedy ve viditelnosti, ne v doručení. Všech 8 dosavadních odeslání vypadá jako testy (`KONTEXT.md` §2).
- **Předmět ani Reply-To nejsou nastavené** (audit-formulare #3). Ve zdroji živého webu není `name="subject"` v žádném formuláři (mirror: 0 souborů). Podle dokumentace Netlify ([Form notifications](https://docs.netlify.com/manage/forms/notifications/)) jde předmět nastavit v UI (Forms → Submission notifications → Options → Edit notifications) nebo skrytým polem `subject` ve formuláři. Pole v HTML má přednost před UI a je verzované, proto ho tento úkol používá. Atribut `data-remove-prefix` odstraní předponu „[Netlify]“ a hodnota smí obsahovat `%{formName}`, `%{siteName}` a `%{submissionId}`. Reply-To vznikne jen z pole `name="email"`. Průvodce na homepage ale posílá `hspg-poptavka` s polem **`E-mail`** (`index.html`, skrytý registrační formulář i `submitLead`), takže „Odpovědět“ míří na Netlify (`formresponses@netlify.com`), ne na zákazníka. `hspg-akce` má pole `email` správně.
- **Zákazník nemá číslo poptávky a fotky se párují jen podle telefonu** (audit-formulare #15). Žádný payload nenese identifikátor. `assets/fotky-upload.js` píše „podle něj [telefonu] fotky přiřadíme k poptávce“.
- **Poptávky nenesou zdroj návštěvy** (audit-formulare #19). Pole `Zdroj` je jen statické: „Web HSPG / Vypustit holuba“, „Web HSPG / stránka akce“, „Web HSPG / stránka hodnocení“, „H-BOT“. V kódu webu není žádné zpracování `utm_*`, `gclid` ani `fbclid` (grep mirroru: 0, kromě skriptu Netlify).
- **Druhý kanál je hotový, ale vypnutý.** Funkci `netlify/functions/submission-created.mjs` převzal úkol 01. Dokud nejsou nastavené proměnné, jen zapíše do logu „není nastaven žádný kanál“. Netlify ji spouští **jen pro ověřená (ne spamová) odeslání** a volání podepisuje (JWS), viz [Event-triggered functions](https://docs.netlify.com/build/functions/trigger-on-events/).
- **Funkce má mezery, které tento úkol opraví:**
  - Každý formulář označí jako „🕊 Poptávka“, i hodnocení z `/recenze/`.
  - Potvrzení zákazníkovi posílá s napevno psaným textem, který majitel neschválil, a to i u hodnocení.
  - Nepozná číslo poptávky z formuláře.
  - Do textu e-mailu propisuje i technická pole.
  - SMTP a push nemají časový limit.

## Cíl (měřitelný)
1. Majitel se o každém ověřeném (ne spamovém) odeslání kteréhokoli formuláře dozví **do 60 s** pushem do mobilu (ntfy nebo Telegram) a **do 2 min** e-mailem ve složce „Poptávky“. Ověří se v koncovém testu (fáze B) u všech 5 formulářů.
2. Všechna oznámení (Netlify i SMTP) mají český předmět začínající `[HSPG]` s typem formuláře a číslem poptávky. U poptávky a akce (pole `email`) funguje „Odpovědět“ přímo zákazníkovi v oznámení Netlify i v SMTP e-mailu. U hodnocení (`Kontakt (nezveřejňuje se)`) jen v SMTP e-mailu.
3. Poptávka, zavolání zpět a fotky nesou stejné **číslo poptávky**, které zákazník vidí po odeslání.
4. Poptávky nesou zdroj návštěvy podle pravidla v kroku A8, které se nijak neopírá o úložiště prohlížeče.
5. Push neobsahuje osobní údaje, dokud není `OZNAMENI_S_UDAJI=1`. Potvrzení zákazníkovi odchází jen se schváleným textem.

## Rozsah
**ANO:**
- funkce `submission-created` a její testy
- pole `subject`, `email`, `Číslo poptávky` a pole zdroje ve formulářích `hspg-poptavka`, `hspg-zavolejte`, `hspg-akce`, `hspg-fotky` a `hspg-recenze` (statické registrační formuláře i JS payloady)
- zobrazení čísla poptávky po odeslání
- nový sdílený skript pro číslo a zdroj
- kontrola (bez změny) příjemců oznámení Netlify
- návod pro majitele
- koncový test na náhledu (fáze B)

**NE:**
- adresy na webu, `data-mail`, odstranění FormSubmitu a mailto zálohy (audit #1, #4, #5, #6) → **úkol 03**
- formulář `hspg-reklamace` → **úkol 04** (tento úkol jen připraví štítek a směrování)
- text zásad, nové příjemce v zásadách a doba uchování (#21) → **úkol 09**; export a mazání podání v Netlify Forms → **úkol 19**
- lišta souhlasu, kategorie analytika/marketing, GA4 a `generate_lead` → **úkol 10** (stávající `dataLayer.push` neměň)
- okresní stránky → **úkol 12** (odkazy neupravuj)
- slib „do 24 hodin“ → **úkol 18** (slib reakční doby; čítač „24 h“ na homepage patří úkolům 13 a 17)
- přehled poptávek v interním panelu → zatím žádný úkol (úkol 14 ho má jen jako návrh, potřebuje nový token), zapiš do návrhů
- týdenní kontrola Forms vs. oznámení a monitoring funkce → **úkol 15**
- nálezy #7, #9, #11, #12 a #16 (průvodce není `<form>`, chování bez JS, děkovací stránka soutěže, neutrální poptávkový formulář, jednotné chyby) → **úkoly 17 a 18** (tady nedělat)
- produkční nasazení
- změna DNS nebo MX

## Postup

### Fáze A – kód a testy (lokálně, nic se neodesílá ven)
1. **Větev `ukol-02-poptavky-upozorneni` z aktuální `main`** (úkol 01 musí být sloučený, jinak se zastav a nahlas). Před začátkem `git -C ../hspg-balicek pull`.
2. **Najdi v repozitáři soubory, které generují:**
   - homepage průvodce `hspg-poptavka` a skryté registrační formuláře `hspg-poptavka` a `hspg-zavolejte` (v živém `index.html` jsou těsně před `</body>`)
   - `/akce/` (`form#poptavka[name=hspg-akce]` a inline skript s `fetch(location.pathname…)` a `ulozProHolubaLet`)
   - `/akce/dekujeme/` (`form#fotky-form[name=hspg-fotky]` a inline skript mazající `sessionStorage` `hspg-holub-lead`)
   - `/recenze/` (`form#recenze-form[name=hspg-recenze]`)
   - `assets/fotky-upload.js`, `assets/holub-let.js`, `assets/hbot-panel.js` (z úkolu 01; callback `zavolejteMi`)
   - adresář funkcí (`netlify.toml` → `[functions]`), `content/firma.json`, `package.json`

   Pokud se HTML generuje skriptem, uprav generátor, ne výstup. Zjisti také, zda formuláře ve zdroji mají `netlify-honeypot` (na živém webu ho Netlify odstraňuje, z mirroru to nejde poznat). **Jen zapiš do hlášení, neměň.** Dále zjisti adresář `publish`. Nové neveřejné soubory (testy, návod) nesmí skončit na webu.
3. **Ověř předpoklady:**
   - `submission-created.mjs` a `content/firma.json` existují.
   - `nodemailer` a `@netlify/blobs` jsou v `package.json` (Blobs kvůli limitu potvrzení v kroku A5).
   - Ověř v dokumentaci Netlify ([Event-triggered functions](https://docs.netlify.com/build/functions/trigger-on-events/)), že funguje i starší konvence „název souboru + `export default async (req)` → `(await req.json()).payload`“, kterou funkce používá. Dokumentace ji dnes uvádí jako podporovanou vedle novější `export default { formSubmitted(event) {…} }`. **Nepřepisuj** ji, pokud to dokumentace nevyžaduje.
4. **`content/firma.json` – štítky formulářů a text potvrzení** (jediné místo; nic natvrdo ve funkci):
   ```json
   "nazvy_formularu": { "hspg-poptavka": "Poptávka", "hspg-akce": "Poptávka (akce)", "hspg-zavolejte": "Zavolat zpět",
     "hspg-fotky": "Fotky k poptávce", "hspg-recenze": "Hodnocení", "hspg-reklamace": "Reklamace", "*": "Formulář" },
   "potvrzeni_zakaznikovi": {
     "schvaleno": false,
     "formulare": ["hspg-poptavka", "hspg-akce"],
     "predmet": "Přijali jsme vaši poptávku {{cislo}} – HOLUB – HSPG",
     "text": "Dobrý den,\n\nděkujeme, vaši poptávku jsme přijali pod číslem {{cislo}}. [DOPLNIT: lhůta odpovědi potvrzená majitelem – např. „Ozveme se do 2 hodin v pracovní době.“; bez potvrzení: „Ozveme se v pracovní době {{pracovni_doba}}.“]\nPokud spěcháte, volejte {{telefon_zobrazeni}}.\n\n{{znacka}} · {{provozovatel}}, IČO {{ico}}\n{{web}}\n\nTento e-mail byl odeslán automaticky na základě formuláře na hspg.cz. Pokud jste nic neodesílali, e-mail prosím ignorujte."
   }
   ```
   Slib „do 2 hodin“ **nikam jinam nepiš**. Na webu dnes není (mirror: 0 výskytů). Web na 238 z 247 HTML stránek (mirror) slibuje cenu „do 24 hodin“, a text potvrzení s tím nesmí být v rozporu.
5. **Funkce `submission-created.mjs`** (převzatá z balíčku). Uprav ji, testy jsou v kroku A11.
   - **Typ:** štítek z `nazvy_formularu`. Nadpis e-mailu: `[HSPG] 🕊 <štítek> <číslo> – <jméno>, <telefon>`. Push: `[HSPG] <štítek> <číslo>` bez osobních údajů (stávající logika `OZNAMENI_S_UDAJI`).
   - **Číslo:** použij `data["Číslo poptávky"]`, pokud odpovídá `^P-\d{6}-[A-HJ-NP-Z2-9]{4}$`. Jinak použij stávající záložní hodnotu (posledních 6 znaků `payload.id`). Neplatnou hodnotu ignoruj, nepropisuj ji do předmětu.
   - **Text e-mailu:** vynech technická pole `subject`, `ip`, `user_agent` (přidej je do `INTERNI`). Ověř v payloadu testovacího odeslání (fáze B), zda je Netlify přidává. Soubory (fotky) neuváděj jako URL, jen jako „Přílohy: N (v Netlify → Forms)“. Tvar souborového pole ověř v payloadu.
   - **Reply-To:** z pole `email`. Jinak z prvního pole, jehož **hodnota** je platný e-mail (pokryje `Kontakt (nezveřejňuje se)` na `/recenze/`).
   - **Časové limity:** pro ntfy a Telegram `AbortSignal.timeout(5000)`. Pro nodemailer `connectionTimeout: 5000`, `greetingTimeout: 5000`, `socketTimeout: 8000`. Výchozí server `smtp.seznam.cz:465` ověř v nápovědě Seznam Email Profi. Pokud uvádí jiný, majitel nastaví `SMTP_HOST`/`SMTP_PORT`.
   - **Potvrzení zákazníkovi** odejde jen při splnění všech podmínek:
     - `POTVRZENI_ZAKAZNIKOVI=1`
     - `potvrzeni_zakaznikovi.schvaleno === true`
     - text neobsahuje `[DOPLNIT`
     - formulář je v `potvrzeni_zakaznikovi.formulare`
     - e-mail zákazníka je platný

     Text nesmí obsahovat nic, co zákazník napsal (jen číslo a údaje z `firma.json`). Limit: nejvýš **3 potvrzení na stejnou adresu za 24 h** a **30 za den celkem**. Ukládej do Netlify Blobs (úložiště `hspg-oznameni`) jen otisk adresy (SHA-256 adresy a dne, jako `otiskKlienta` v `netlify/lib/ai/limity.mjs`), nikdy adresu samotnou. Po překročení limitu potvrzení tiše vynech a zapiš do logu.
   - Zachovej stávající chování:
     - 200 i při chybě kanálu (Netlify by jinak opakoval)
     - `cc` na `emaily.zaloha`
     - směrování podle `smerovani_formularu`
     - `NOTIFIKACE_EMAIL` pro test
     - `console.error` při selhání
6. **Sdílený skript `assets/poptavka-zdroj.js`** (pokud jméno koliduje, zvol jiné a uveď ho v hlášení). Bez závislostí, rozhraní `window.HSPGPoptavka`:
   - `cislo()` vrátí `P-RRMMDD-XXXX` (4 znaky z `crypto.getRandomValues`, abeceda bez 0/O/1/I). Tvar se záměrně liší od kódu pasu domu `HS-RRRR-ČČČČ`.
   - `pole(nazevFormulare, cislo)` vrátí objekt skrytých polí: `subject`, `Číslo poptávky` (jen u poptávkových formulářů), `Předchozí stránka`, `Kampaň`, `Reklamní kliknutí` (prázdná pole vynech).
   - `subject` má tvar `[HSPG] <štítek> <číslo>` se stejnými štítky jako `nazvy_formularu`. Shodu hlídá test v kroku A11.
   - Pole zdroje (`Předchozí stránka`, `Kampaň`, `Reklamní kliknutí`) vrací jen pro `hspg-poptavka`, `hspg-akce` a `hspg-zavolejte`. Pro `hspg-fotky` vrátí jen `subject` a `Číslo poptávky`. `hspg-recenze` funkci nepoužívá (jen statický `subject`).
   - Stávající pole `Zdroj` nech beze změny (e2e test balíčku ho kontroluje).
7. **Formuláře** (skrytá pole doplň do **statického registračního HTML formuláře** i do JS payloadu, jinak je Netlify neuloží; dokumentace vyžaduje, aby registrační formulář obsahoval všechna pole):

   | Formulář | Změny |
   |---|---|
   | `hspg-poptavka` (homepage) | přejmenuj `E-mail` → `email` (registrační formulář i `submitLead`). Přidej `subject`, `Číslo poptávky` a pole zdroje. Číslo zobraz v potvrzení odeslání v panelu průvodce a ulož do `hspg-holub-lead` jako `cislo` |
   | `hspg-akce` (`/akce/`) | přidej skrytá pole do `<form>`. Statická hodnota `subject` je `[HSPG] Poptávka (akce) %{submissionId}` a platí pro odeslání bez JS. JS ji před odesláním přepíše na číslo. Číslo ulož v `ulozProHolubaLet` do `hspg-holub-lead` |
   | `hspg-zavolejte` (H-BOT) | v `hbot-panel.js` (`zavolejteMi`) přidej pole z `HSPGPoptavka.pole('hspg-zavolejte', …)`. Skript načti líně při otevření formuláře, stejně jako panel načítá `hbot-majitel.js`, nevkládej ho do 243 stránek. Děkovná zpráva musí dál začínat „Děkujeme. Ozveme se“ (e2e test balíčku) a doplň „Číslo požadavku: P-…“. Registrační formulář v `index.html` rozšiř o nová pole |
   | `hspg-fotky` (`/akce/dekujeme/`) | přidej skrytá pole `Číslo poptávky` a `subject` (statická hodnota `[HSPG] Fotky k poptávce %{submissionId}`). Na stránce načti `poptavka-zdroj.js` před `fotky-upload.js` a v `fotky-upload.js` (čte `hspg-holub-lead` před smazáním) je vyplň přes `HSPGPoptavka.pole('hspg-fotky', lead.cislo)`, jen pokud číslo existuje. Na stránce zobraz „Číslo vaší poptávky: …“, také jen pokud číslo existuje. Bez čísla zůstává statický `subject` a párování podle telefonu |
   | `hspg-recenze` | jen `subject` = `[HSPG] Hodnocení %{submissionId}` (bez čísla a bez zdroje) |

   Ke každému `<input name="subject">` v registračním formuláři dej `data-remove-prefix`.
8. **Zdroj návštěvy – rozhodnutí a zdůvodnění.** Žádné ukládání v prohlížeči. Pole se skládají až v okamžiku odeslání a jen z toho, co stránka zná:
   - `Předchozí stránka`: z `document.referrer`. U stejného webu jen **cesta bez query** (query může obsahovat adresu, např. `/akce/?adresa=`), u cizího webu jen doména (např. `google.com`). Web posílá `Referrer-Policy: strict-origin-when-cross-origin` (ověřeno na živém webu), takže u přechodu v rámci webu je URL předchozí stránky k dispozici celá.
   - `Kampaň`: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` a `utm_content` z URL aktuální stránky, a pokud tam nejsou, z URL předchozí stránky stejného webu. Pokrývá to typický případ vstup s UTM → přechod na formulář.
   - `Reklamní kliknutí` (`gclid`, `fbclid`) **jen se souhlasem s marketingem**. Dnes jediná volba „Přijmout“ ukládá `localStorage['hspg-souhlas'] = 'analytika'` (`assets/souhlas.js`) a zapíná i reklamní signály. Stav čti jen přes jednu funkci `maSouhlas('marketing')`, kterou úkol 10 přepojí na samostatnou kategorii.

   **Zdůvodnění:**
   - Dle § 89 odst. 3 zákona o elektronických komunikacích a výkladu EDPB (Guidelines 2/2023) potřebuje souhlas i ukládání do `sessionStorage`/`localStorage`, nejen cookies. Uložení vstupní stránky přes celou návštěvu by tedy souhlas vyžadovalo. Navržené řešení nic neukládá. Pole jsou součástí poptávky, kterou návštěvník sám odesílá, právní titul je oprávněný zájem (vyhodnocení, odkud poptávky přicházejí) a úkol 09 to doplní do zásad.
   - `gclid`/`fbclid` slouží jen k párování s reklamními systémy, proto pouze se souhlasem.
   - Vícekrokovou atribuci po souhlasu pokrývá GA4 (úkol 10).

   **Omezení (uveď v hlášení):** při více než jednom přechodu mezi stránkami se UTM ztratí. Existující `hspg-holub-lead` v `sessionStorage` zůstává, protože je nezbytný pro službu, o kterou zákazník požádal (děkovací stránka, fotky).
9. **Oznámení Netlify.** Předmět jde nastavit i v UI Netlify, ale pole `subject` z kroku A7 má podle dokumentace přednost. V UI předmět neměň. Pokud tam nějaký vlastní je, zapiš ho do hlášení. Zjisti jen pro čtení, kam oznámení chodí: Netlify → Forms → Submission notifications (`app.netlify.com/projects/<projekt>/forms?tab=notifications`), nebo přes CLI, např. `netlify api listHooksBySiteId` (ve výpisu jen typ, událost a příjemce, žádné tokeny). Pokud nemáš přístup, požádej majitele o snímek obrazovky. **Příjemce neměň.** Doporučení do hlášení: po dobu alespoň 14 dní ponechat oznámení Netlify na `info@hspg.cz` i `profiserv@seznam.cz` jako nezávislou zálohu. Duplicitní e-maily třídí filtr do složky „Poptávky“. O dalším nastavení rozhodne majitel.
10. **Návod pro majitele** – připrav text do hlášení a do `docs/poptavky-upozorneni.md`, jen pokud `docs/` není v publikovaném adresáři (jinak jen do hlášení). Názvy položek v rozhraní Seznamu a ntfy ověř a případně oprav:
    - **Push (doporučeno ntfy):** nainstalovat aplikaci ntfy (Android/iOS). Vymyslet téma generátorem hesel (např. 32 náhodných malých písmen a číslic) a přihlásit ho v aplikaci. Totéž jméno zadat do Netlify → Environment variables jako `NTFY_TEMA`. Jméno tématu funguje jako heslo (kdo ho zná, čte zprávy na veřejném ntfy.sh), proto ho nikam jinam nepsat. Push proto ve výchozím stavu nenese osobní údaje. **Alternativa Telegram:** bot přes @BotFather, `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID` jen do Netlify.
    - **E-mail přes SMTP:** `SMTP_UZIVATEL=info@hspg.cz` a `SMTP_HESLO`. Pokud schránka používá dvoufázové ověření a Seznam nabízí heslo pro aplikace, použít to, jinak heslo schránky. Zadává se **jen v Netlify**, nikdy do chatu, e-mailu ani souboru. Po každé změně hesla schránky (checklist úkolu 00) je nutné `SMTP_HESLO` aktualizovat, jinak e-mailový kanál přestane fungovat (push poběží dál). DNS se nemění: SPF `include:spf.seznam.cz` a DKIM už odesílání přes Seznam pokrývají. **MX neměnit.**
    - **Filtry ve schránce Seznam** (v `info@hspg.cz` i v `profiserv@seznam.cz`, Nastavení → Filtry). Tři pravidla, všechna s akcí „přesunout do složky **Poptávky**“ a „označit jako důležité / hvězdičkou“, pokud to filtr umí:
      1. předmět obsahuje `[HSPG]`
      2. odesílatel obsahuje `netlify.com` (oznámení chodí z `formresponses@netlify.com`)
      3. předmět obsahuje `Form submission` (oznámení před nasazením tohoto úkolu)

      Zkontrolovat složky Spam a Hromadné a odesílatele `formresponses@netlify.com` a `info@hspg.cz` označit jako důvěryhodné. Ve stávajících nepřečtených vyhledat „Form submission“ a přesunout do složky Poptávky.
    - **Kde jsou všechna podání:** Netlify → Forms (ověřená i Spam). Tam je zdroj pravdy.
11. **Testy** (v adresáři testů webHSPGH, `node --test`, bez nových závislostí kromě Playwrightu, pokud ještě není; testy se nesmí publikovat):
    - `tests/oznameni.test.mjs`. Převezmi `balicek/testy/unit/znalosti-a-oznameni.test.mjs` (část oznámení) a rozšiř ji. Testy musí pokrýt:
      - štítky všech formulářů včetně `*`
      - číslo z pole versus záložní číslo a ignorování neplatného čísla
      - předmět `[HSPG] …`
      - že push ani v titulku, ani v textu neobsahuje jméno, telefon, e-mail ani adresu
      - Reply-To z `email` i z `Kontakt (nezveřejňuje se)`
      - `cc` na `profiserv@seznam.cz`
      - směrování na 5 schránek
      - že `subject`, `ip` a `user_agent` nejsou v textu e-mailu
      - že potvrzení neodejde při `schvaleno:false`, při `[DOPLNIT` v textu, bez `POTVRZENI_ZAKAZNIKOVI=1` ani u `hspg-recenze`
      - limit potvrzení 3/24 h (paměťové úložiště jako `pametoveUloziste`)
      - že text potvrzení neobsahuje text zadaný zákazníkem
      - selhání všech kanálů → 200
      - timeout fetch → kanál selže a ostatní doběhnou
    - `tests/e2e/formulare.test.mjs` (Playwright). Web servíruj lokálně malým statickým serverem v testu (`node:http`, jen publikovaný adresář z kroku A2; cesty jako `balicek/testy/server.mjs`: adresář → `index.html`, `/x` → `/x.html`). **Server balíčku `balicek/testy/server.mjs` sem nepoužívej:** soubory z `balicek/web/` servíruje přednostně, takže by místo upraveného `hbot-panel.js` a `firma.json` z webHSPGH dostal test původní verze z balíčku. `/api/*` server obsluhovat nemusí, formulář „Zavolejte mi“ otevři přímo jeho tlačítkem. **Všechny POST zachyť přes `page.route` a odpověz 200. Požadavky na jiný původ než lokální server zablokuj (`route.abort()`) a zaznamenej. Žádný z nich nesmí být POST, nic nesmí odejít ven.** Pro každý z 5 formulářů vyplň a odešli formulář s daty `TEST` a ověř:
      - payload má `subject` začínající `[HSPG] `
      - payload `hspg-poptavka` má klíč `email` a nemá `E-mail`
      - `Číslo poptávky` odpovídá regexu (u poptávka/akce/zavolejte) a `hspg-fotky` nese stejné číslo jako předchozí poptávka
      - **každý klíč payloadu existuje v registračním formuláři** stejného jména (u `hspg-poptavka` a `hspg-zavolejte` skryté formuláře v `index.html`)
      - `/?utm_source=test&utm_campaign=a` → payload z homepage má `Kampaň` s `utm_source=test`
      - přechod z okresní stránky na `/akce/` → `Předchozí stránka` = cesta okresní stránky
      - `gclid` v URL bez souhlasu → pole `Reklamní kliknutí` chybí, s `hspg-souhlas=analytika` je přítomné
      - `poptavka-zdroj.js` nevytvoří žádný nový klíč v `localStorage`, `sessionStorage` ani cookies (porovnej před a po; `hspg-holub-lead` je výjimka)
      - číslo poptávky je vidět na homepage po odeslání, na `/akce/dekujeme/` i v H-BOT
    - Statický test: hodnoty `subject` v HTML a `poptavka-zdroj.js` používají štítky z `content/firma.json` → `nazvy_formularu`. Každý z 5 registračních formulářů má právě jeden `<input name="subject">` s `data-remove-prefix`.
12. **Hlášení fáze A** (formát níže) a **zastav se**. Majitel nastaví proměnné, nainstaluje ntfy, schválí text potvrzení (nebo ponechá `schvaleno:false`) a souhlasí s testem na náhledu.

### Fáze B – koncový test s majitelem (náhledové nasazení, ne produkce)
13. Ověř, že majitel nastavil v Netlify proměnné **pro kontext, ve kterém běží náhledové nasazení**. V Netlify ověř, pro které kontexty proměnná platí. Proměnné:
    - `NTFY_TEMA` (nebo `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`)
    - `SMTP_UZIVATEL`, `SMTP_HESLO`
    - volitelně `NOTIFIKACE_EMAIL` pro test

    `OZNAMENI_S_UDAJI` **nenastavovat**, dokud úkol 09 neuvede ntfy/Telegram v zásadách. `POTVRZENI_ZAKAZNIKOVI=1` jen pokud majitel schválil text a `schvaleno` je `true`. Hodnoty nikdy nevypisuj.
14. `npm run nahled` (pojistka z úkolu 00 – náhled zdarma, nikdy `--prod`) → odkaz na náhled. Ověř, že Netlify formuláře na náhledu zaregistroval (Forms) a že se odeslání z náhledu objeví v Netlify → Forms. **Pokud se podání z náhledu nezpracují, zastav se.** Test na produkci je možný jen s výslovným souhlasem majitele po produkčním nasazení v dávce (`KONTEXT.md` §4.4, §4.5).
15. **S majitelem a s jeho souhlasem** odešli na náhledu každý formulář **jednou**, vždy s `TEST` ve jménu i poznámce (např. „TEST Holub – neodpovídat“). Použij majitelův vlastní telefon a e-mail, nikdy cizí. Formuláře: homepage průvodce, `/akce/` s jednou malou fotkou, H-BOT „Zavolejte mi“, fotky na `/akce/dekujeme/`, `/recenze/` (majitel pak hodnocení nezveřejní). U každého zapiš:
    - čas odeslání → push (s) → e-mail (s)
    - předmět Netlify oznámení i SMTP e-mailu
    - Reply-To (u poptávky a akce)
    - složku „Poptávky“
    - záznam v Netlify Forms (ověřené, ne spam)
    - log funkce (`ok`, žádné `selhalo`)
16. Prohlédni si payload jednoho podání (Forms nebo log), zda Netlify přidává `ip`, `user_agent`, `referrer`, a tvar souborového pole. Pokud se liší od předpokladu z kroku A5, uprav funkci a testy.
17. Po testu požádej majitele o smazání `TEST` podání v Netlify → Forms (nebo je smaž sám s jeho souhlasem) a zapiš to do hlášení.

## Akceptační kritéria
- [ ] `node --test tests/oznameni.test.mjs` – vše prošlo, hlášení uvádí počet testů a jejich názvy z kroku A11.
- [ ] `node --test tests/e2e/formulare.test.mjs` – vše prošlo. Během testu neodešel žádný požadavek mimo lokální server (test to ověřuje).
- [ ] `grep -rnoE "<input[^>]*name=['\"]subject['\"][^>]*>" "$PUB" --include=*.html | grep -v node_modules` najde právě 5 tagů (registrační formuláře `hspg-poptavka`, `hspg-zavolejte`, `hspg-akce`, `hspg-fotky`, `hspg-recenze`) a `… | grep -vc data-remove-prefix` = 0. `$PUB` je publikovaný adresář z kroku A2. Hledá se jen tag `<input>`, aby se nezapočítal inline JS, který `subject` přepisuje.
- [ ] `grep -rnE "name=['\"]E-mail['\"]|['\"]E-mail['\"][[:space:]]*:" <soubor(y) homepage z kroku A2>` → 0 (registrační formulář ani payload `submitLead` už `E-mail` nemají). Klíč `email` v payloadu ověřuje e2e test.
- [ ] `git diff main --name-only | grep -cE "(^|/)cisteni-[a-z]+/[a-z-]+/"` = 0 (okresní stránky beze změny).
- [ ] `git grep -nE "(NTFY_TEMA|SMTP_HESLO|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)[[:space:]]*=[[:space:]]*[^=[:space:]]"` nenajde nic (jen názvy v dokumentaci, žádné hodnoty; porovnání `===` vzor nezachytí).
- [ ] `git diff main -U0 | grep "^+" | grep "2 hodin" | grep -vF "[DOPLNIT"` → nic (slib je jen uvnitř `[DOPLNIT: …]`).
- [ ] `node -e "const f=JSON.parse(require('fs').readFileSync('content/firma.json'));process.exit(f.potvrzeni_zakaznikovi.schvaleno===false?0:1)"` → kód 0 (platný JSON a `schvaleno` je `false`, dokud majitel text neschválí).
- [ ] Fáze B: u všech 5 formulářů na náhledu přišel push do 60 s a e-mail do 2 min. Podání je v Netlify Forms mezi ověřenými. Předměty začínají `[HSPG]` bez „[Netlify]“. Reply-To u poptávky a akce = testovací e-mail. Filtr přesunul e-maily do „Poptávky“. Tabulka časů je v hlášení.
- [ ] Fáze B: push neobsahoval jméno, telefon, e-mail ani adresu (snímek nebo přepis titulku a textu).
- [ ] Fáze B: `TEST` podání jsou smazaná (nebo majitel potvrdil, že je smaže).

## Ověření
```bash
PUB=<absolutní cesta k publikovanému adresáři webHSPGH z kroku A2>
node --test tests/oznameni.test.mjs                  # očekávej: pass N, fail 0
CHROMIUM=<cesta> node --test tests/e2e/formulare.test.mjs   # pass, fail 0, žádný externí požadavek
grep -rnoE "<input[^>]*name=['\"]subject['\"][^>]*>" "$PUB" --include=*.html | grep -v node_modules   # 5 tagů
grep -rnoE "<input[^>]*name=['\"]subject['\"][^>]*>" "$PUB" --include=*.html | grep -v node_modules | grep -vc data-remove-prefix   # 0
git grep -nE "(NTFY_TEMA|SMTP_HESLO|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)[[:space:]]*=[[:space:]]*[^=[:space:]]"  # nic
git diff main -U0 | grep "^+" | grep "2 hodin" | grep -vF "[DOPLNIT"   # nic
cd ../hspg-balicek && npm test && HSPG_MIRROR="$PUB" CHROMIUM=<cesta> npm run test:e2e   # testy balíčku proti webu dál projdou (H-BOT; server balíčku servíruje přednostně soubory balíčku, upravený hbot-panel.js testuje formulare.test.mjs)
```
Fáze B: `curl -s <náhled>/` → 200; log funkce `submission-created` v Netlify (Logs → Functions) po každém odeslání bez „no channel“ a bez „selhalo“. Časy push a e-mailu měř hodinkami telefonu od kliknutí na Odeslat.

Testy, které agent přidá: `tests/oznameni.test.mjs` (jednotkové, funkce) a `tests/e2e/formulare.test.mjs` (Playwright, 5 formulářů, číslo, zdroj, shoda payloadu s registrací, žádné úložiště bez souhlasu).

## Bez AI / s AI
Úkolu se AI netýká. Upozornění, e-maily i formulář „Zavolejte mi“ v H-BOT fungují bez AI (i při `AI_ZAPNUTO=0`).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Zvlášť pro tento úkol:
- **Žádné testovací odeslání do produkčních formulářů.** Na náhledu jen se souhlasem majitele a s `TEST`, s majitelovým telefonem a e-mailem. Po testu podání smazat.
- **Tajemství** (`SMTP_HESLO`, `NTFY_TEMA`, `TELEGRAM_*`) zadává majitel jen v Netlify. Nikdy v kódu, `docs/`, hlášení, chatu ani v logu (funkce je nesmí logovat).
- `OZNAMENI_S_UDAJI` zůstává vypnuté, dokud zásady (úkol 09) neuvádějí ntfy/Telegram. Potvrzení zákazníkovi jen se schváleným textem. Žádný nový slib lhůty („do 2 hodin“) bez potvrzení majitele.
- Příjemce oznámení Netlify neměň bez souhlasu majitele. **MX a DNS neměnit.**
- Nic neukládat do prohlížeče kvůli zdroji návštěvy. `gclid`/`fbclid` jen se souhlasem.
- Nasazení jen přes pojistku (`npm run nahled`); produkce jen po schválení majitelem a v dávce, není součástí úkolu.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5, zvlášť po fázi A a po fázi B, a navíc:
- **Fáze A:**
  - seznam změněných souborů
  - výsledky testů (počty)
  - stav `netlify-honeypot` ve zdroji
  - publikovaný adresář a kam šly testy a návod
  - současní příjemci oznámení Netlify (jen adresy)
  - návod pro majitele (krok A10)
  - seznam proměnných k nastavení (jen názvy)
  - text potvrzení zákazníkovi ke schválení
  - rozhodnutí o zdroji návštěvy včetně omezení
  - diff změn v souborech převzatých z balíčku (`submission-created.mjs`, `hbot-panel.js`, `firma.json`), aby se promítly zpět do balíčku
- **Fáze B:**
  - odkaz na náhled
  - tabulka 5 formulářů (push s / e-mail s / Forms / předmět / Reply-To / složka)
  - zjištěný tvar payloadu (pole `ip`/`user_agent`/`referrer`, soubory)
  - potvrzení smazání `TEST` podání
- **Návrhy mimo rozsah:**
  - audit-formulare #7, #9, #11, #12, #16 (patří do úkolů 17 a 18)
  - #21 (doba uchování a mazání podání) → úkoly 09 (zásady) a 19 (export a mazání)
  - přehled poptávek v interním panelu (zatím žádný úkol)
  - případně chybějící `netlify-honeypot`
