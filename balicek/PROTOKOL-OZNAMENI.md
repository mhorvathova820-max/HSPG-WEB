# Protokol oznámení „nic mi neuteče“ (R24, 8. 11. 2026)

Pokyn majitele (Dušan Holub, 8. 11. 2026): *„Ať mi každý agent pošle oznámení, pokud bude nějaký úkol důležitý – ať zavolá, pošle oznámení, a ještě vymysli něco, aby mi nic neuteklo; s oznámením chci veškeré důležité podklady a skript hovoru.“* Platí pro všechny agenty HOLUB AI (centrála, HERMES/dodavatelé, ARTEMIS, LYNKEUS, GIGI, IRIS, ATHÉNA, APOLLÓN, PROMETHEUS, ARGUS), pro tuto relaci (dodavatelé, web) i pro agenty ve VS Code a v Chromu (ti hlásí přes chat a Předávací deník).

## 1. Co je „důležitý úkol“ (spouští protokol)
- naplánovaný hovor nebo schůzka (30 min předem; nový termín hned po domluvě),
- odpověď partnera, dodavatele, zákazníka nebo úřadu, která čeká na jeho rozhodnutí nebo slib HSPG (cena, podmínky, smlouva, NDA, termín),
- termín do 24 hodin (odevzdání nabídky, platba, registrace, konec zkušební doby, obnovení předplatného),
- cokoli, co stojí peníze nad 1 000 Kč nebo mění veřejné sdělení HSPG,
- chyba, která zastavila běh agenta nebo web (produkce nefunguje, formulář nedoručuje, klíč vypršel),
- nová poptávka zákazníka (do 15 minut od přijetí).

## 2. Kanály – vždy všechny, do 2 minut od události
1. **Push** (PushNotification, do 200 znaků): první věta = co udělat a kdy („Za 30 min hovor s Larius – voláte vy, +39 …; podklady v e-mailu“). Bez osobních údajů navíc, bez klíčů.
2. **Hovor** na +420 736 618 486 (Speko, česky, ženský hlas, nejvýš 2 minuty): kdo volá („HOLUB AI“), co se děje, co má udělat, že podklady jsou v e-mailu; na konci zopakovat čas a jméno firmy. Když nezvedne, jedno opakování za 5 minut. Nejvýš 3 hovory denně mimo hovory k naplánovaným schůzkám. Zůstatek Speko hlídat – pod 5 USD poslat majiteli odkaz na dobití (billing.checkout, 20 USD).
3. **E-mail s podklady** na dusanholub716@gmail.com, předmět `[HOLUB AI] <firma / věc> – <datum a čas>`, štítek `HSPG Dodavatelé`/`HOLUB AI` podle oblasti. Obsah vždy v tomto pořadí:
   - **Situace ve 3 větách** (kdo, co chce, kde jsme),
   - **Rozhodnutí, které čeká na majitele** (otázka + doporučení + co se stane, když neodpoví),
   - **Skript hovoru**: pozdrav a představení (1 věta), 3 cíle hovoru, 5 otázek, naše nabídka (jen ověřená fakta – pravidlo §4.1 KONTEXT.md, žádná čísla bez zdroje), námitky a odpovědi (3), další krok a termín, závěrečná věta; cizí jazyk = věty v tom jazyce + česky,
   - **Podklady**: odkaz na vlákno v Gmailu, dokument „HSPG – dokumenty k odeslání“ / centrálu, Teams/telefon, cenové a smluvní podmínky partnera, co jsme slíbili a dokdy, otevřené body z minulé komunikace,
   - **Po hovoru**: co zapsat (3 věty do chatu nebo deníku) a kdo udělá další krok.
4. **Kalendář** (Google Kalendář přes konektor; když není, kalendář na zařízení): událost s připomínkou 30 min a 5 min, v popisu stejné podklady a odkaz na e-mail. Jedna událost na jeden hovor – před vytvořením hledat duplicitu.
5. **Pojistky, aby nic neuteklo:**
   - **Eskalace:** když majitel do 15 minut před hovorem nepotvrdí („ok“ v chatu, odpověď na e-mail nebo zvednutý hovor), druhý hovor + druhý push; u termínů do 24 h opakování po 2 hodinách, nejvýš 3×.
   - **Ranní přehled v 07:00** (push + e-mail, hovor jen když je ten den hovor nebo termín): dnešní hovory a schůzky s podklady, termíny do 48 h, odpovědi partnerů od včerejška, rozhodnutí čekající na „ano“, stav rozpočtů (Netlify kredity, Speko, Mapy.com, AI) a co agenti přes noc udělali. Odesílá tato relace (dodavatelé) z vlastního plánu; centrála doplní položky ostatních agentů přes `state/waiting`.
   - **Nedělní přehled v 18:00:** týden dopředu – hovory, termíny, co potvrdit.
   - **Jeden zdroj pravdy:** každý hovor a termín je v centrále (`state/calls`), v Gmailu (štítek) a v kalendáři; co není zapsané, neexistuje.
   - **Potvrzení přijetí:** agent v hlášení uvede, které kanály doručil (push ✓, hovor ✓/nezvednuto, e-mail ✓, kalendář ✓).

## 3. Co se neposílá
- Hesla, klíče, tokeny, čísla účtů ani karet – nikdy, ani do e-mailu.
- Osobní údaje kontaktních osob do veřejného repozitáře (jen firma a role); v e-mailu majiteli mohou být.
- Žádné sliby partnerům jménem majitele bez jeho „ano“ (pravidla kampaně dodavatelů).

## 4. Zavedení
- Tato relace (dodavatelé, web): připomínky hovorů a ranní přehled podle bodu 2 a 5 od 9. 11. 2026.
- Centrála HOLUB AI: úkol v `tasks` (agent `centrala`) – zapracovat protokol do zadání všech agentů a do připomínek hovorů (`state/calls`), přidat e-mail s podklady a hovor ke každé připomínce; zapsat protokol do `state/protokol-oznameni`.
- Agenti ve VS Code a v Chromu: u důležitého zjištění (produkce nefunguje, chybí klíč, rozhodnutí majitele) napsat do chatu řádek začínající **„DŮLEŽITÉ PRO MAJITELE:“** – tato relace ho převezme a doručí všemi kanály.
