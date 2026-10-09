# Úkol 25: Nová konzole majitele (v8) za tlačítkem „Vše ve tvých rukách“ a H-BOT pro zákazníky (v2)
> Priorita P1 · Závisí na: 01, 21, 22 (fáze A), 23, 24 · **Nahrazuje fázi B úkolu 22** (export v8 místo v3) · Čeká na majitele: export z Claude Design, viz „Co dodá majitel“ · Čtyři části a–d, po každé hlášení a stop.

## Podklad z Claude Design
- `HBOT Majitel v8.dc.html` – konzole majitele na jedné stránce: Rozkaz (mise přes okna), scéna se strážci, Tým a zadání, Publikační balíček, Počasí a plánování (přístroj počasí a času), Plán zakázek, Zakázka z adresy (hledání i podle názvu místa, mapy ČÚZK s katastrem, ruční měření, výkresy, nabídka bez DPH), Kupony s tiskem, Kontakty (ARES, dopisy), SEO radar, Připojení, Deník hlášení, nástěnka Zakázky, denní úkoly, statistiky.
- `HBOT Budoucnost v2.dc.html` – H-BOT pro zákazníky.

**Kam to majitel vloží:** v Claude Design Share → Export → Project HTML (zip) → otevřít
`https://github.com/mhorvathova820-max/HSPG-WEB/upload/claude/peaceful-johnson-juqa6w/balicek/navrhy`
→ přetáhnout zip (jeden nebo dva; ideálně pojmenované `hbot-majitel-v8.zip`, `hbot-budoucnost-v2.zip`, max. 25 MB na soubor) → „Commit directly to the claude/peaceful-johnson-juqa6w branch“ → Commit changes.

**Agent:** `git -C ../hspg-balicek pull`, pak `unzip -o ../hspg-balicek/balicek/navrhy/*.zip -d ../hspg-navrhy/` – **mimo složku webu**, prototyp se nikdy nenasadí. Export je podklad pro vzhled, ne hotový kód: převzít rozložení, CSS a texty rozhraní; logiku napsat znovu nad API níže. Nejdřív si vypiš, co v exportu je: přímá volání AI (`window.claude`, `api.anthropic`, `api.openai`, `generativelanguage`, `api.mistral`, `api.groq`, `api.x.ai`, `api.perplexity`, `openrouter`), pole pro klíče, `localStorage`, externí skripty a písma, ukázková data (jména, adresy, čísla, ceny, statistiky). Seznam dej do hlášení části a.

## 1. Jeden panel
Konzole nahradí vzhled `/ai-centrum/` (noindex) – plovoucí tlačítko „Vše ve tvých rukách“ po přihlášení otevře ji, ne druhý panel vedle. Na stránce konzole se zákaznický plovoucí panel nezobrazuje. Stávající přihlášení (`/api/majitel`, token v `sessionStorage`) zůstává.

## 2. Okna → server (místo prototypu)
| Okno v8 | Napojení | Poznámka |
|---|---|---|
| Tým a zadání, Rozkaz | `/api/ai` = `/api/agent/:id` | modely z přepínače (úkol 22); krok mise s dopadem ven (uložení, tisk, dopis, publikace) jen po tlačítku „Potvrdit“ |
| Scéna se strážci | stav z `/api/ai-stav` | jen vzhled |
| Počasí a plánování, Plán zakázek | `/api/pocasi-prace`, odkaz na `/api/pocasi-kalendar/<klíč>.ics`, `/api/pocasi` | přístroj času = čas Europe/Prague |
| Kupony s tiskem | `/api/kupon` (vytvoření, seznam, zrušení) | QR bez externí služby (knihovna `qrcode` už v balíčku); podmínky z `content/planovac.json` |
| Zakázka z adresy | `/api/mereni` | hledání podle názvu místa jen přes server (RÚIAN; Nominatim se zámkem 1 dotaz/s), mapy přímo z ČÚZK s uvedením „© ČÚZK“; u výkresu „Schéma z mapových podkladů, ne geodetické zaměření“ |
| Kontakty | `/api/lovec-svj` | návrhy, schválení, neozývat, dopisy; vyhledání jednoho subjektu v ARES (IČO/název) jako nová akce jen pro čtení |
| Připojení | `GET /api/ai-stav` | jen ukazuje, které proměnné jsou v Netlify; **pole pro klíče z prototypu odstranit** |
| Publikační balíček | `/api/ai` | jen návrhy textů ke stažení/zkopírování, nic se samo nepublikuje |
| SEO radar | – | bez napojeného zdroje stav „nepřipojeno“ a kontrolní seznam z úkolů 11 a 20; žádná vymyšlená čísla |

Přímá volání AI z prohlížeče a ukládání klíčů v prohlížeči **odstranit**.

## 3. Data na server
Zakázky, plán, deník hlášení, denní úkoly a statistiky → nová funkce `/api/konzole` (Blobs `hspg-konzole`), jen přihlášený majitel, kontrola původu, limit požadavků, max. velikost záznamu, atomické zápisy (`aktualizuj`), osobní údaje zákazníků nikdy v logu, export JSON pro zálohu. Kontakty = databáze Lovce SVJ, kupony = `/api/kupon` (nic dvakrát). Statistiky počítá server jen ze skutečných dat. Data z prototypu se nepřenáší (jsou ukázková) – začíná se prázdně. V prohlížeči smí zůstat jen nastavení vzhledu (téma, kompaktní režim).

## 4. Strana zákazníka
Vzhled H-BOTa podle Budoucnost v2 nad stávající `/api/asistent` (rozhraní funkce beze změny). Odpovědi jen z ověřených faktů (`assets/hbot-znalosti.json`, `build-hbot.mjs --kontrola`). **Bez cen**, dokud majitel nepotvrdí ceník (viz níže) – na cenu odpoví odkazem na nabídku/plánovač. Odkazy do `/planovac/` a na `/kupon/`.

## 5. Postup po částech (každá: větev `ukol-25x-…`, testy, náhled `node scripts/nasadit.mjs`, hlášení, stop, schválení majitele; produkce jen po „nasaď“)
**a) Scéna, Rozkaz, Tým, Počasí**
- [ ] Bez přihlášení `/ai-centrum/` načte jen přihlášení; skripty a obrázky scény se stáhnou až po přihlášení (dynamický import; ověřit e2e nebo v Network).
- [ ] Tým a Rozkaz volají jen `/api/agent/<role>`; převzetí úlohy Claudem je vidět („⟲ … převzal úlohu“).
- [ ] Počasí ukazuje data z `/api/pocasi-prace`; odkaz na kalendář jen pro majitele.
- [ ] `git grep -nE "window\.claude|api\.anthropic|api\.openai|generativelanguage|api\.groq|api\.mistral|api\.x\.ai|api\.perplexity|openrouter|localStorage.*(key|klic|token)"` v kódu webu = 0.
- [ ] Jediný panel (plovoucí panel zákazníka na `/ai-centrum/` není), stávající e2e AI centra prošly, axe 0 chyb.

**b) Zakázka z adresy a Kupony**
- [ ] Adresa i název místa → měření z `/api/mereni`; náměstí bez čísla nabídne adresy; mapy ČÚZK se zdrojem; ruční měření označené „ruční měření z mapy“.
- [ ] Nabídka **bez DPH** s větou „Nejsme plátci DPH.“; ceny jen z potvrzeného ceníku, jinak `[cena doplní majitel]` a žádný součet; tisk do PDF z prohlížeče; zákazníkovi se nic neodešle bez potvrzení majitele.
- [ ] Kupon: vytvoření, seznam, zrušení a tisk s QR přes `/api/kupon`; nepotvrzené podmínky = „podmínky potvrdíme v nabídce“.

**c) Zakázky, Kontakty, Lovec SVJ** (pracuje s osobními údaji → před produkcí musí být zapnutý druhý faktor přihlášení)
- [ ] Druhý faktor: TOTP (RFC 6238) v `/api/majitel`; zapnutí v konzoli po přihlášení heslem (QR jen jednou, potvrzení kódem), tajemství jen na serveru (Blobs), nikdy v odpovědi, logu ani chatu; nouzové vypnutí proměnnou v Netlify.
- [ ] `/api/konzole` s testy (bez přihlášení 401, limit, velikost, souběžný zápis); nástěnka, plán, deník, denní úkoly a statistiky čtou ze serveru, po obnovení stránky a na jiném zařízení stejná data.
- [ ] Kontakty: návrhy podle skóre se zdrojem a citací, Schválit / Zamítnout / Neozývat (i podle kódu z dopisu) / Dopis; běh Lovce po krocích s průběhem a tlačítkem Stop. **Žádné tlačítko pro hromadný e-mail**; e-mail se ukáže jen u záznamu s `emailPovolen`.

**d) Strana zákazníka**
- [ ] H-BOT v2 nad `/api/asistent`; první načtení stránky nestahuje skripty H-BOTa ani nevolá `/api/*` (jako úkol 01); stávající e2e H-BOTa prošly + nové pro v2.
- [ ] Odpověď na cenu neobsahuje číslo, dokud není ceník potvrzený; odkazy na `/planovac/` a `/kupon/` fungují.

## 6. Výkon a přístupnost (platí pro všechny části)
- [ ] Veřejné stránky: LCP do 2,5 s (Lighthouse mobil na náhledu, `/`, `/cenik.html`, `/planovac/`; čísla před/po v hlášení), CLS do 0,1.
- [ ] Scéna konzole jen po přihlášení a líně; `prefers-reduced-motion` vypne animace (CSS i smyčky v JS – test s emulací).
- [ ] Mobil do 640 px: kompaktní režim bez scény, okna jako seznam; ovládání klávesnicí, viditelné zaměření, 375 px bez vodorovného posunu.
- [ ] Písma a skripty z exportu hostovat u sebe (žádné Google Fonts ani CDN – GDPR, CSP z úkolu 15 nerozšiřovat bez důvodu).

## 7. Pravdivost a právo
Žádná ukázková data ve výrobě (seznam z exportu → `git grep` = 0, prázdné stavy místo nich). Nabídky bez DPH (majitel je neplátce). Nic se neodešle ani nezveřejní bez potvrzení majitele. Žádný hromadný e-mail na získané adresy (480/2004 Sb., § 7; KONTEXT R14).

## 8. Co dodá majitel
- **Ceník:** na webu je `content/ceny.json` (platnost od 1. 10. 2026) – potvrdit, že platí pro H-BOT a nabídky z konzole, nebo dodat nový.
- **Podmínky kuponu** (`content/planovac.json`, místa `[DOPLNIT]`).
- **Technický list H-STONE** (pravidla počasí v `content/pocasi-prace.json`).
- **Klíče v Netlify** (`HSPG_KLIC_ANTHROPIC/OPENAI/GEMINI/MISTRAL/GROQ`, zadává sám, hodnoty nikomu).
- **Zapnutí Perplexity** v Netlify AI Gateway (pro Lovce SVJ).
- **Druhý faktor:** aplikace pro ověřování v telefonu, naskenování QR při zapnutí (část c).
- Export z Claude Design do `balicek/navrhy/` (postup nahoře).

## Nepřekročitelná pravidla
KONTEXT §4 a R8–R14; hodnoty klíčů nikdy v kódu, logu, chatu ani v odpovědi API; nic neslučovat ani nenasazovat do produkce bez schválení majitele.
