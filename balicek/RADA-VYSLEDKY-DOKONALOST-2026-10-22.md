# Rada 5 AI (OpenRouter) – kolo 3 „zdokonalení prototypu Apex v9“: výsledky a rozhodnutí (22. 10. 2026)

Zadání: `RADA-ZADANI-DOKONALOST-2026-10-22.md` (odesláno 22. 10. dopoledne, cena kola ≈ 1,0 USD). Odpověděly Gemini Pro (choreografie), Claude Opus (texty pozvánky, úložiště, dvě věty), Grok (kritika v9 + právo, s rešerší stavu transpozice 2024/825), GPT Astra (CSS pečeť/obálka/kontrolní body/pozvánka – ověřil si `apex-tokens.css`), Muse (texty). Koordinátor posoudil proti KONTEXT §3–4 a R21.

## 1. Zapracováno hned (balíček `hspg-zazitek.js` 1.2.0, CSS, testy; prototyp v10)
| Bod | Kdo | Kde |
|---|---|---|
| Cíle pozvánky **≥ 44 px** (ne 32) | Claude, GPT, Grok | `hbot.css`, `holub360-apex.css`, prototyp (`.pozvanka .ano/.ne`), e2e test měří |
| Odpočet 9 s se **zastaví při ukazateli nebo fokusu** na pozvánce (WCAG 1.4.13; ✕ ji vypne kdykoli); při skrytí se fokus vrátí na přepínač | Claude, GPT | `hspg-zazitek.js` (`naplanujZmizeni`, `fokusUvnitr`), e2e test „s ukazatelem nezmizí“ |
| **Vibrace jen na dotykovém zařízení s `navigator.vibrate`** (Android); iPhone i stolní prohlížeče: přepínač „Zvuk“, pozvánka „Zvuk je vypnutý.“, potvrzení bez slova vibrace | Claude, Grok, Muse (+ nezávislá revize) | `hspg-zazitek.js` (`NABIZI_VIBRACE`, texty), unit + e2e test |
| Pozvánka na HOLUB 360 **v kartě adresy** (druhý přepínač `#h3a-zazitek-karta`, v toku) – v hlavičce byla při kliknutí na „Změřit“ mimo výřez | nezávislá revize | `holub-360/index.html`, `holub360-apex.js`, CSS, e2e test měří polohu ve výřezu |
| Věta k cestě B i v **PDF kalkulace a čl. 7 návrhu smlouvy** (karta, PDF a smlouva si neodporují) | nezávislá revize | `hspg-dokumenty.js`, e2e test čte PDF |
| `aria-label` přepínače stálý, stav jen v `aria-pressed`; **`title` „Zvuk a vibrace: vypnuto/zapnuto“** | Claude, Muse | `vykresliPrepinac` |
| Po „Zapnout“ **3 s potvrzení** `role="status"` „Zapnuto. Vypnete stejným tlačítkem.“ | Claude | `ukazStav`, `.hz-stav` |
| **Zápis do `sessionStorage` až po rozhodnutí zákazníka** („Zapnout“ nebo ✕); samo zmizení se pamatuje jen do nového načtení (ePrivacy čl. 5(3), § 89 odst. 3 ZEK) | Grok (přísnější výklad než Claude) | `pozvankaRozhodnuta`, unit + e2e test „zobrazení samo nic nezapíše“ |
| ✕ nikdy nezapíná efekty; pozvánka nepřebírá fokus a **není živá oblast** (nekřičí přes stavový řádek zaměření) | Claude, GPT | `pozvanka()` – `role="group"`, bez `aria-live` |
| Bublina „Komunikuje“: „Zaměření z obrysu je hotové. Odhad pro váš dům: střecha ≈ X m², fasáda ≈ Y m². Údaje předávám do kalkulace, kde si je můžete zkontrolovat a upravit.“ | Muse | prototyp v10 (Main) |
| Tlačítko „**Přeskočit animaci → rovnou k orientační ceně**“; „Rezervovat termín“ → „**Požádat o termín**“ (nic neobjednáváte) | Muse, Grok | prototyp v10 (Main, Mobil); balíček má „Vybrat termín v plánovači“ – neutrální, beze změny |
| Karta ceny ukázky: „**Ukázkový dům – tato čísla se na vaši adresu nepřenášejí.**“ | Grok | prototyp v10 (Main, Mobil) |
| Dlaždice úvodu: „Záruka 10 let **na H-STONE** při péči SENTINEL BASE“ (vazba na cestu A) | Grok | prototyp v10 (Tlacitko) |
| Věta do zásad ochrany soukromí (tři technické záznamy, bez souhlasu, s odkazem na čl. 5 odst. 3 a § 89 odst. 3) – návrh pro advokáta | Claude | úkol 55 bod 5a (text níže) |
| Komunita na Facebooku: „Fotografie z naší práce sdílíme ve facebookové skupině [název] – k [datum] má [počet] členů.“ jen jako prostý odkaz, bez widgetu/pixelu | Claude | úkol 55 (nahrazuje dřívější znění) |
| Náhrada „přesně 76 %“: „Podle ceníku od 1. 10. 2026 stojí na fasádě neviditelný štít (cesta A) 168 Kč/m² a barevná renovace v odstínu RAL (cesta B) 298 Kč/m². Každá cesta řeší něco jiného: A chrání současný vzhled, B mění barvu.“ – **bez slov „ušetříte“ / „levnější“** | Claude, Grok | úkol 55 |
| 3 věty k přepínači (nápověda): „Krátké zvuky a jemné vibrace potvrzují otevření pečeti, dokončení výpočtu a uložení volby. Zvuk i vibrace jsou ve výchozím stavu vypnuté a zapínají se pouze po vašem klepnutí. Kdykoli je můžete vypnout, postup k orientační ceně funguje stejně i bez nich.“ | Muse | úkol 56 (text tooltipu/nápovědy) |

## 2. Přijato do zadání (ne hned do kódu)
- **Gemini – choreografie:** kompletní CSS (offset-path po obrysu, 3 polohy křídel přes `steps(1)`, kontrolní body v 0,52/0,98/1,40 s, přelet k panelu `M737,169 C560,110 310,140 115,250`, kamera `perspective(1200px) scale(1.06) rotateX(2deg)` 4,2 s, statická varianta při reduced-motion). Prototyp v8/v9 už má ekvivalent (let po obrysu, kóty, kontroly, bublina); Gemini zpřesňuje **mávání ve 3 polohách `steps(1)`** a **jeden záběr kamery** → doplněno do `ukoly/49-holub-360.md` jako volitelný krok pro produkční scénu (po LCP, jen bez reduced-motion). Upozornění Gemini: `offset-rotate: auto` otočí holuba podle směru kreslení symbolu – ověřit v prohlížeči.
- **GPT – pečeť jako `<details>`** (funguje bez JS, Enter/mezerník), pečeť ze dvou polovin s `clip-path` a prasknutím 360 ms, kontrolní body s neutrálním obrysem a fajfkou až po skutečné kontrole, `is-bez-pohybu` pro přeskočení → zapsáno do úkolu 48 jako alternativní implementace obálky (stávající `hn-obalka` zůstává; při přepracování použít `<details>`).

## 3. Odmítnuto nebo ponecháno na majiteli (s důvodem)
| Návrh | Kdo | Rozhodnutí |
|---|---|---|
| Fázi „Ověřuje“ přejmenovat na „Náčrt“, žádné fajfky („značka jakosti v obraze“) | Grok | **Ponecháno:** v produkci „Ověřuje“ znamená skutečné kontroly (výběr budovy, úplnost dat – `holub360-hejno.js`); kontrolní body jsou popsané jako „kontrolní body obrysu“, nikde „certifikát“/„ověřeno stavby“. U smyšleného domu v prototypu je štítek UKÁZKA + nová věta na kartě. |
| „QUANTUM SENSE“ v zákaznické větě pryč | Grok | **Majitel (R15/§4.10):** název zůstává jen jako název; věta „Plocha je odhad, potvrdí ji člověk na místě“ je už v HOLUB 360 (`data-hotovo`). Atribuce © ČÚZK zůstává u dat (licence). |
| PDF se nesmí jmenovat „NÁVRH smlouvy“ | Grok | **Majitel + advokát (KONTEXT):** NÁVRH s vodoznakem „nezávazné“ trvá do konečného znění od advokáta; H-BOT ho nabízí až po kartě ceny. |
| Věta „ne nabídka“ nad částkou **stejně velká jako součet** | Grok | **Částečně:** věta je na obálce i na kartě hned u částky (12,5 px, plný kontrast); stejná velikost jako částka by rozbila hierarchii – test čitelnosti v e2e (axe) trvá. |
| Pozvánka na mobilu „v toku, ne jako toast“ | Grok | **Ponecháno:** pozvánka je ukotvená pod přepínačem v hlavičce panelu (ne přes cenu, ne přes lištu); na 390 px je uvnitř panelu H-BOTa. |
| Při zapnutém zvuku v reduced-motion jen potvrzovací zvuky (ne křídla) | Claude | **Odmítnuto:** zvuk není pohyb; křídla zní jen při skutečném startu zaměření a jen po opt-in. |
| 48 px cíle | GPT | Projektové pravidlo je 44 px (WCAG 2.5.5 AAA; 2.5.8 AA žádá 24 px); použito 44 px. |
| Druhé tlačítko pozvánky „Ne, děkuji“ textem | Muse | V hlavičce H-BOTa není místo; ✕ má `aria-label` „Nechat vypnuté“. |

## 4. Čeká na majitele / advokáta
- Větu o třech technických záznamech do `/ochrana-osobnich-udaju.html` schválí advokát (úkol 55 bod 5a).
- Název facebookové skupiny, počet členů a datum (úkol 55).
- Stav sněmovního tisku 53 (transpozice 2024/825): k 20. 10. 2026 schválen Sněmovnou, v Senátu – do vyhlášení argumentovat zákonem č. 634/1992 Sb. (Grok, ověřit na psp.cz).
