# Úkol 58: Jedna cesta zákazníka, stránka HOLUB Partner a obrazovka „Dnes“ v panelu majitele
> Priorita P3 · Závisí na: 55 (opravy živého webu), 48 (Cena hned), 49 (HOLUB 360), 21 (plánovač), 51 (Pas domu), 25 (panel majitele) · Čeká na majitele: lhůty odpovědí („do 24 hodin“ zákazníkům, „do 2 pracovních dnů“ partnerům), technický list H-STONE pro architekty, výběr textů (část 4). Zdroj: rada AI 22. 10. 2026 (`RADA-VYSLEDKY-VIZUAL-2026-10-22.md`, role Claude Opus a Muse) posouzená koordinátorem.

## Co to je
Web dnes nabízí dobré kusy (kalkulace, HOLUB 360, plánovač, Pas domu), ale ne **jednu cestu**. Tento úkol je spojí: každá veřejná stránka končí stejnými dvěma tlačítky, partneři dostanou vlastní vstup a majitel po přihlášení první obrazovku „Dnes“. Nic z toho nemění ceník, jádro ani texty záruky – ty řeší úkoly 50 a 55.

## 1. Jedna hlavní cesta (veřejný web)
Orientační cena → Předběžná rezervace → Předání a Pas domu → Péče SENTINEL BASE.
- **Menu (6 položek):** Služby · Cena hned · HOLUB 360 · Standard HOLUB · Péče SENTINEL · HOLUB Partner. Hlavička vpravo: telefon + pilulka „Vybrat termín“. Patička: Pas domu · Záruka · Naše práce · Kontakt · Ochrana osobních údajů · Licence · Pravidla akce (jen pokud akce trvá, úkol 55).
- **Konec každé stránky:** stejná dvě tlačítka „Spočítat orientační cenu“ (otevře panel Cena hned, `data-hbot-cena`) a „Vybrat termín“ (`/planovac/`). Na mobilu je má už lišta – sekce se na ≤ 600 px zkrátí na jednu větu.
- **Kroky 2–4 (povrchy, plochy, kalendář):** zpět vždy bez ztráty dat; rozpracovaná kalkulace jen v `sessionStorage` (klíč `hspg-kalkulace-rozprac`), **nikdy s kontaktními údaji**. Jediné místo s osobními údaji je krok Kontakt (jméno, telefon, e-mail, adresa) s větou „Adresu potřebujeme k výjezdu a ověření ploch.“ a informační větou podle R21 (bez políčka souhlasu).
- **Péči SENTINEL nabízet jen 3×:** u volby ochrany (cesta A), na kartě ceny (věta o záruce) a po předání (Pas domu). Ne ve formuláři rezervace, ne v potvrzení.
- **Slova:** „předběžná rezervace“ (nikdy „objednávka“), „orientační cena“ (nikdy „nabídka“), „předávací list“ (nikdy „certifikát“).
- **Nové stavy:** offline („Jste offline. Ruční zadání a výpočet ceny fungují dál.“ – kalkulace je v prohlížeči), termín mezitím obsazen („Tento den se mezitím obsadil. Nejbližší volné dny: …“ – plánovač vrátí tři nejbližší), selhání animace/pečeti → cena se ukáže hned bez obálky (platí, `KLID` větev v `hbot-nabidka.js`).
- **E-mail po rezervaci** (`submission-created.mjs`, šablona z úkolu 03): předmět „Předběžná rezervace · [datum] · HSPG“; rozsah, orientační cena, věta „Termín je předběžný. Závazný bude po ověření ploch a podpisu smlouvy.“, co připravit (přístup, voda, parkování), kontakt, zrušení jedním odkazem (`/planovac/?zrusit=<kód>` – kód z rezervace, bez osobních údajů v adrese).
- **Měření cesty:** jen agregované počty kroků 1→7 přes GTM po souhlasu (úkol 10), bez vlastních cookies.

## 2. Stránka `/partner/` – HOLUB Partner
Vstup z menu a patičky; H-BOT ji nabídne na slova „SVJ“, „správce“, „developer“, „projekt“, „spolupráce“ (rozcestník úkol 56 – jen když stránka existuje). Čtyři karty, u každé jen to, co firma doloží:
| Karta | Co se nabízí (pravdivě) | Tlačítko |
|---|---|---|
| Správci SVJ | orientační cena pro více domů v jednom výpočtu (bytový dům, slevy od 1 000 / 2 500 m² z ceníku); PDF podklad pro shromáždění (rozsah, 5 kroků, orientační cena, podmínky záruky); Pas domu pro každý objekt; jeden kontakt | „Připravit podklad pro shromáždění“ |
| Developeři | ošetření před předáním, termíny podle harmonogramu, předávací list s fotodokumentací pro kupující | „Domluvit ošetření před předáním“ |
| Architekti a projektanti | popis 5 kroků do technické zprávy, vzorník RAL pro cestu B, technický list H-STONE `[DOPLNIT: majitel]` | „Vyžádat technické podklady“ |
| Dodavatelé | formulář obor · region · kontakt (Netlify form `hspg-partner`, honeypot, bez políčka souhlasu – R21) | „Nabídnout spolupráci“ |
**Zakázané:** provize, slevy nad ceník, „exkluzivita“, počty partnerů a reference bez písemného potvrzení majitele (KONTEXT §4.1, 2024/825 / zák. 634/1992 Sb.). Po odeslání: „Děkujeme. Ozveme se do `[DOPLNIT: majitel – lhůta]`.“ Neplátce DPH uvést v první větě stránky.

## 3. Panel majitele – první obrazovka „Dnes“
Po přihlášení (úkol 25) desktop 3 sloupce, mobil 1 sloupec ve stejném pořadí:
1. **Čeká na vás** – poptávky bez odpovědi (nejstarší nahoře), u každé „Odpovědět“ a „Zavolat“ (`tel:`).
2. **Nejbližší termín** – datum, rozsah, verdikt počasí **textem** „Vhodné · Hraniční · Nevhodné“ + důvod (WCAG 1.4.1), tlačítka „Přesunout termín“ a „Napsat zákazníkovi“ (otevře předvyplněný e-mail, nic neodesílá samo).
3. **Rada AI (jen jedna)** – text + „Proč?“ / „Použít“ / „Zamítnout“; AI nikdy neodesílá zprávu zákazníkovi bez potvrzení majitele.
Pod tím sbalené sekce: Rezervace (21 dní) · H-WEATHER CONTROL · Kupony · Lovec SVJ · Pasy domů · Nastavení. Horní lišta: „Vše ve tvých rukách“ · datum · „Aktuální · před N min“.
Stavy: načítání = zlatá nit + kostry (žádné kolečko déle než 400 ms bez textu); prázdno „Žádná nová poptávka. Až přijde, uvidíte ji tady jako první.“ / „Na příštích 21 dní není nic naplánováno.“ → „Otevřít kalendář“ / „Dnes nemám doporučení.“; chyba „Poptávky se nenačetly.“ → „Načíst znovu“ / „Předpověď počasí není k dispozici. Termíny zatím neověřujeme.“; odhlášení po nečinnosti: rozepsaná odpověď zůstane v zařízení jen bez osobních údajů (`sessionStorage`).

## 4. Nabídka textů (Muse, volitelně – vybere majitel; bez výběru zůstávají stávající texty po úkolu 55)
- Úvod: „Povrch domu. Čistý, chráněný, v klidu.“ · „Čištění a ochrana střech, fasád, dlažeb a fotovoltaiky. Postup znáte předem. Orientační cenu si spočítáte během chvíle.“ · tlačítka „Spočítat orientační cenu“ · „Prohlédnout dům v HOLUB 360“.
- Služby: „Každý povrch má svůj postup.“ · Standard: „Pět kroků. Jeden standard.“ · Cena hned: „Orientační cena, sestavená před vašima očima.“ · SENTINEL: „Péče, která drží dům v rytmu.“ · Pas domu: „Historie vašeho domu na jednom místě.“ · Plánovač: „Vyberte den, který patří vám.“ · Partner: „HOLUB Partner – domy v dlouhodobé péči“.
- Nepoužít z návrhu Muse: pozdravy „Jsem H-BOT, AI asistent…“ (AI se hlásí jen, když odpovídá) a popisy fází HOLUB 360 se „sklonem“ a „komínem“ (neměří se).

## Soubory
Šablony hlavičky/patičky (úkol 08), `partner/index.html` (nová), `assets/hbot-rozcestnik` obsah (`content/hbot-rozcestnik.json` – přidat cíl „HOLUB Partner“ až po nasazení stránky), panel majitele (`assets/konzole*.js`, úkol 25), `netlify/functions/submission-created.mjs` (e-mail po rezervaci), `planovac.js` (stav „termín obsazen“, zrušení odkazem).

## Akceptace
- [ ] Každá veřejná stránka končí stejnými dvěma tlačítky; mobil ≤ 600 px bez duplicity s lištou; axe bez vážných chyb.
- [ ] `/partner/`: 4 karty, formulář bez políčka souhlasu s informační větou, žádné z „zakázaných“ slov (test grepem: provize, exkluziv, sleva – mimo ceník).
- [ ] Rozpracovaná kalkulace v `sessionStorage` neobsahuje jméno, telefon, e-mail ani adresu (test).
- [ ] Panel „Dnes“: tři karty v daném pořadí, verdikt počasí i textem, „Použít“ radu nikdy neodešle zprávu bez potvrzení (test).
- [ ] E-mail po rezervaci má větu o předběžnosti a odkaz na zrušení bez osobních údajů v adrese (test).
- [ ] Hlášení se snímky (konec stránky, `/partner/`, „Dnes“ desktop + mobil) a stop.

## Návrat zpět
Stránka `/partner/` a sekce „Dnes“ jsou přidané soubory – smazat; tlačítka na konci stránek jsou jedna sdílená šablona (úkol 08) – odebrat include.
