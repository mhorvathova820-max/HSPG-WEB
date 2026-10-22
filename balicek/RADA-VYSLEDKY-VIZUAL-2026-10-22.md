# Rada 5 AI (OpenRouter) – kolo 2 „vizuální a zákaznická dokonalost celého webu“: výsledky a rozhodnutí (22. 10. 2026)

Zadání: `RADA-ZADANI-VIZUAL-2026-10-22.md`. Odpověděly Gemini Pro (art direction, choreografie), Claude Opus (cesta zákazníka a partnera, panel majitele), Grok (kritika živého webu a prototypu, právo), GPT Astra (komponenty; přečetl si PORADI.md, úkol 57, `apex-tokens.css` a `hspg-zazitek.js`) a Muse Wonder (texty). Cena kola ≈ 1,3 USD. Koordinátor (Claude Code) odpovědi posoudil proti KONTEXT §3–4; níže je, co se **přijímá a kde je to zapracované**, co se **odmítá a proč**, a co **čeká na majitele**. Kolo 3 (`RADA-ZADANI-DOKONALOST`) nebylo odesláno – jeho otázky z větší části pokrylo toto kolo a balíček; případné další kolo až nad prototypem v9.

## 1. Shoda všech pěti (přijato)
| Bod | Kdo | Kde zapracováno |
|---|---|---|
| **„Přeskočit → rovnou k ceně“** musí být od první vteřiny vidět (≥ 44 px) a kdo animaci přeskočí, dostane **stejné číslo** | Gemini, Opus, Grok | balíček: pečeť jde rozlomit hned, „Zobrazit cenu bez animace“ (úkol 48); hejno HOLUB 360 svítí jen podle skutečných fází (úkol 56); **prototyp v9**: tlačítko „Přeskočit → k ceně“ během fází 1–4 |
| Jedna veřejná pravda: **5 kroků, SENTINEL BASE/PLUS/PRESTIGE, jedna cesta „Cena hned“, „orientační cena“ nikdy „nabídka“** – na živém webu to dnes neplatí a rozbíjí důvěru dřív než vizuál | Grok, Opus, Muse | úkol 55 (P0) – beze změny, potvrzeno |
| **Věta „ne nabídka“ musí stát u ceny i před ní** (§ 1732 odst. 2 OZ: reklama za určenou cenu se má za nabídku, pokud z ní jasně neplyne opak) | Grok, Opus | balíček: obálka „Otevřením nic neobjednáváte – orientační výpočet, ne nabídka.“ (`hbot-nabidka.js`, `holub-360/index.html`); karta ceny má větu pod částkou (bylo) |
| Záruka **10 let jen s podmínkou SENTINEL BASE ve stejné větě**, nikde samotné „10 let“ | Grok, Opus, Muse | úkol 55 bod 4, jádro (`sentinel.podminka_zaruky`) |
| Kóty **krokev / sklon** a cokoli, co se neměří, do scény nepatří; ukázka musí být označená „příklad z ceníku, ne váš dům“ | Grok (+ dřívější revize) | prototyp v8 (hotovo: jen délka, šířka, obvod, půdorys ≈; štítek UKÁZKA) |
| Blur jen na jednom panelu (mobil), žádné 3D ani Canvas před prvním vykreslením | Gemini, Grok | úkol 49 doplněk 22. 10. (rozpočty WebGL), `hbot.css` (blur jen panel) |

## 2. Přijato z jednotlivých rolí
**Gemini – art direction**
- Křivky pohybu jako tokeny (`--apex-ease-out-expo`, `--apex-ease-lux`, `--apex-ease-spring`, `--apex-ease-seal`) – doplnit do `assets/apex-tokens.css` jako aliasy k `--apex-krivka` (úkol 57; nic se nepřepisuje).
- Tabulka „prvek · spouštěč · ms · křivka · co bez pohybu“ – přijata jako kontrolní seznam pro úkoly 48/49/56 (každá animace má statickou variantu při `prefers-reduced-motion`; v balíčku už platí a testuje se).
- Chybový stav bez agresivní červené (jantarový pulz rámečku) – odpovídá Apexu; `hn-chyba` zůstává zlatý/jantarový.

**Claude Opus – cesta zákazníka a partnera, panel majitele** → nový **úkol 58** (P3):
- Jedna hlavní cesta: Orientační cena → Předběžná rezervace → Předání a Pas domu → Péče SENTINEL BASE; na konci každé stránky stejná dvě tlačítka; krok s osobními údaji je jediný (kontakt), rozpracovaná kalkulace jen v `sessionStorage` bez kontaktů.
- Péči SENTINEL nabízet jen ve 3 chvílích (volba ochrany u cesty A, karta ceny, po předání) – ne ve formuláři rezervace.
- Stránka **HOLUB Partner** se 4 kartami (správci SVJ, developeři, architekti, dodavatelé) a jen s tím, co firma doloží; **zakázané:** provize, slevy, „exkluzivita“, počty partnerů bez písemného potvrzení majitele.
- Panel majitele začíná obrazovkou **„Dnes“** (Čeká na vás · Nejbližší termín s verdiktem počasí textem · jedna Rada AI s „Proč? / Použít / Zamítnout“), AI nic neodesílá sama.
- Texty chybových stavů (adresa nenalezena, více budov, limit, offline, termín mezitím obsazen, selhání animace → cena hned) – porovnáno s `holub-360/index.html`: stávající texty jsou pravdivé a srozumitelné, ponechány; „offline“ a „termín obsazen“ doplní úkol 58.
- Riziko „rezervace = závazná smlouva“ → všude „předběžná rezervace“, NÁVRH smlouvy s vodoznakem (platí, úkol 48).
- Měření cesty jen agregovaně a bez osobních údajů (po souhlasu, úkol 10).

**Grok – kritika** (k živému webu; vše do úkolu 55, bod 6):
- „**Garantovaný certifikát**“ → „**předávací list**“: neoprávněná značka jakosti je podle přílohy č. 1 písm. b) zákona č. 634/1992 Sb. klamavá vždy; slovo „certifikát“ pro vlastní dokument nepoužívat nikde (ani v PDF, ani u Pasu domu).
- Věta, kterou další odstavec bere zpět („Pod námi tašky nepraskají“, „0 Kč za lešení“, „technik nemusí na místo“, „Mech nemá z čeho žít“, „jediná impregnace, kterou používáme“ vs. SANAKRYL/ETERNAL v ceníku) → podmínka do téhož nadpisu, účinky mědi a H-STONE jen „může zpomalit“, cizí systémy vysvětlit nebo z ceníku sundat.
- **Los** („každá 10. poptávka zdarma do 99 m²“): nikdy na úvodu, ve Standardu ani na partnerské cestě; pokud zůstane, celé podmínky vedle slibu (R11 – podmínky zatím chybí → do té doby los z úvodu pryč).
- „Otevřít trasu v mapě“ → „**Navigovat k nám**“ (odkaz zůstává; slovo z embarga pryč).
- Neplátce DPH stejně čitelně jako mezisoučet (obálka, karta ceny, partner) – `hn-cena-dph` ≥ 12,5 px.
- Řádek dopravy musí být jedna srozumitelná věta („64 km od Hradce Králové: prvních 30 km zdarma, 34 km × 12 Kč = 408 Kč“), ne „zdarma × 12 Kč“.
- Právní rámec: směrnice 2024/825 není k 22. 10. 2026 v českém právu vyhlášená (sněmovní tisk 53) – argumentovat § 4, 5, 5a a přílohou č. 1 zákona č. 634/1992 Sb.; § 1732 odst. 2 OZ platí už dnes.
- Kontrast zlata a LCP na 390 px měřit, ne odhadovat – e2e axe + Lighthouse v CI (úkol 53).

**GPT Astra – komponenty**
- Věta u vzorníku RAL „Zobrazení na displeji je orientační. Odstín potvrďte podle fyzického vzorníku.“ – balíček už má („Barvy na obrazovce jsou orientační – přesný odstín potvrdí vzorník při zaměření.“), ponecháno.
- Vysvětlivky jako nativní `<details>` (klávesnice, bez JS) a stavová nit `aria-busy` bez falešných procent – shodné s úkolem 57 (`ap-nit`) a `hn-detail`; „Escape uvnitř vysvětlivky nesmí zavřít H-BOT“ → doplněno do akceptace úkolu 57.
- Upozornil na rozpor „zvuk výchozí zapnuto vs. zadání vypnuto“ → vyřešeno R21 (výchozí vypnuto s pozvánkou).

**Muse – texty** (volitelné znění pro úkol 55/58; majitel může vybrat):
- Obálka: „Vaše orientační cena je připravena. Rozpis uvidíte po otevření. **Otevřením nic neobjednáváte.**“; pečeť „HOLUB · ORIENTAČNÍ CENA“ → **zapracováno** (balíček + prototyp).
- Úvod: „Povrch domu. Čistý, chráněný, v klidu.“ / „Čištění a ochrana střech, fasád, dlažeb a fotovoltaiky. Postup znáte předem. Orientační cenu si spočítáte během chvíle.“; Standard: „Pět kroků. Jeden standard.“; Cena hned: „Orientační cena, sestavená před vašima očima.“; SENTINEL: „Péče, která drží dům v rytmu.“; Partner: „HOLUB Partner – domy v dlouhodobé péči“ → nabídka textů v úkolu 58.

## 3. Odmítnuto (s důvodem)
| Návrh | Kdo | Proč ne |
|---|---|---|
| Hejno **9 holubů** při každém otevření H-BOTa, 4,45 s choreografie před číslem | Gemini | zdržuje cestu k ceně (shoda Grok/Opus), výkon na mobilu; symbolem je jeden holub + hejno 4 jen při skutečném zaměření (R20) |
| Celoobrazovková **scéna Staré Prahy** v Three.js pod HOLUB 360 s „© ČÚZK v rohu“ | Gemini | smyšlená kulisa; atribuce patří jen k datům, která se zobrazují; 3D jen po LCP a jen model domu zákazníka (úkol 49) |
| Kóty **hřeben · krokev · sklon**, „3 zlatá razítka střecha/fasáda/komín“ jako certifikace | Gemini, (Muse) | neměří se (revize 22. 10.); razítka v prototypu jsou jen **kontrolní body** obrysu – přejmenovat, nikdy „certifikát“ |
| Texty fází HOLUB 360 „POČÍTÁ – dopočítá sklon střechy“, „OVĚŘUJE – znovu projde střechu, fasádu a komín“ | Muse | nepravdivé: sklon se neměří, ověřuje se výběr budovy a úplnost dat (`holub360-hejno.js`) |
| Pozdravy „Jsem H-BOT, AI asistent…“ | Muse | H-BOT bez zapnuté AI odpovídá z FAQ – AI se hlásí jen, když odpovídá (AI Act čl. 50, úkol 01) |
| „U této scény žádný zvuk ani haptika, i když je přepínač zapnutý“ | Grok | zákazník, který si zvuk sám zapnul, ho má mít; vyřešeno výchozím vypnuto (R21) |
| „Zálohu 30 % na orientační kartu nedávat“ | Grok | věta o záloze je informace o platebních podmínkách (nad 100 000 Kč), ne výzva k platbě – zůstává, formulace „ve smlouvě bude záloha…“ |
| Partnerský formulář se **souhlasem** se zpracováním | Opus | právní základ je čl. 6 odst. 1 písm. b) GDPR – informační věta (R21), políčko jen pro newsletter |
| „Štítek trvanlivosti podle nařízení (EU) 2025/1960“ | Grok | netýká se služby; jen poznámka |

## 4. Čeká na majitele (nové body)
- Los /akce/: zrušit, nebo doplnit úplné podmínky (R11) – do té doby z úvodu pryč (úkol 55).
- Lhůta odpovědi partnerům („do 2 pracovních dnů“) a zákazníkům („do 24 hodin“) – potvrdit nebo zmírnit.
- Technický list H-STONE pro architekty (úkol 58) a doklad k měděnému prvku (trvá).
- Výběr textů Muse pro úvod a Standard (úkol 58 nabízí znění; bez výběru zůstávají stávající texty po opravách z úkolu 55).
