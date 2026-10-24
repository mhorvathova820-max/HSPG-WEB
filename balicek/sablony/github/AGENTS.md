# AGENTS.md – pravidla pro všechny AI agenty (Claude Code, GitHub Copilot a další)

Web **hspg.cz** – HOLUB Surface Protection Group (čištění a ochrana střech, fasád a dlažeb). Úkoly, ověřená fakta
a rozhodnutí majitele jsou v balíčku `mhorvathova820-max/HSPG-WEB` → `balicek/KONTEXT.md` a `balicek/ukoly/`.
Při rozporu platí KONTEXT a `CLAUDE.md` tohoto repozitáře.

## Role
- **Claude Code (VS Code)** – hlavní vývojář a koordinátor: úkoly z balíčku, kontrola pull requestů od Copilota, hlášení majiteli.
- **GitHub Copilot coding agent** – menší úkoly z issue se štítkem `copilot`; vždy vlastní větev a pull request do `main`. Nikdy nenasazuje.
- **Majitel** – schvaluje sloučení do `main` a každé produkční nasazení.

## Nepřekročitelná pravidla
1. **Žádná hesla, tokeny ani klíče** v kódu, commitech, logu, issue, PR ani chatu – jen proměnné prostředí v Netlify, které zadává majitel.
2. **Produkce** jen `node scripts/nasadit.mjs --produkce --schvaleno "…"` se souhlasem majitele, nejvýš 1× denně. Agenti na GitHubu nenasazují nikdy. Kredity Netlify nesmí klesnout na nulu.
3. **Pravdivost:** žádné vymyšlené reference, recenze, hodnocení, certifikace, pojištění, čísla ani technologie (směrnice EU 2024/825, § 2980 OZ).
4. **Ceny** jen z `content/ceny.json` přes `assets/hspg-cena.js`; bez potvrzeného ceníku (`content/cenik-potvrzeni.json`) žádná částka. Výsledek kalkulace je **orientační cena**, nikdy „nabídka“ (§ 1732 OZ).
5. **Záruka 10 let** vždy s podmínkou péče SENTINEL BASE ve stejném bloku a větou „Zákonná práva z vadného plnění tím nejsou dotčena.“ Text podmínky jen z `content/sentinel.json`.
6. **Embargo v textech pro zákazníky:** ne „letecké mapy“, „satelitní snímky“, „Google Maps“, „katastr“, „RÚIAN“ – místo toho „HOLUB CORE QUANTUM SENSE · zaměření na dálku“. Licence „© ČÚZK“, „© přispěvatelé OpenStreetMap“ a „MET Norway (CC BY 4.0)“ zůstávají. Zásady ochrany údajů zdroje dat uvádějí pravdivě.
7. **Osobní údaje do AI** jen pseudonymizované (`netlify/lib/ai/pseudonymizace.mjs`); Muse Wonder nikdy s osobními údaji; přes OpenRouter jen modely se ZDR.
8. **Neměnit DNS ani MX**, nemazat projekty v Netlify ani záznam `tajemstvi/token` v Blobs; žádný force-push; nepřepínat cizí větve.
9. **Žádný nový neomezený zdroj spotřeby** (smyčky, automatická nasazení, nechráněné placené endpointy, velké soubory bez limitu).
10. **Formuláře:** testovací odeslání jen s označením TEST a se souhlasem majitele.
11. Vzhled Apex: tokeny `apex-*` z `assets/apex-tokens.css`, žádné CDN ani cizí písma, WCAG 2.1 AA, 390 px bez vodorovného posunu, prefers-reduced-motion.

## Co Copilot nedělá (patří Claude Code a majiteli)
Ceny a ceník, platby, formuláře s osobními údaji, AI a klíče, `netlify.toml`, hlavičky a CSP, přesměrování, nasazení, právní texty (smlouva, podmínky, zásady).

## Před každým pull requestem
- `npm test` · `npm run test:e2e` (když se mění `assets/` nebo stránky) · `node scripts/build-hbot.mjs --kontrola`
- Popis PR podle šablony: co a proč, jak ověřeno (výstup testů, snímky 1440 a 390 px), rizika, „Co potřebuji od majitele: …“.
