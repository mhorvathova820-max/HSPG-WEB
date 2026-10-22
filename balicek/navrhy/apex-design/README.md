# Prototyp „HSPG Apex – kompletní návrh“ (Claude Design, 22. 10. 2026)

Zdrojové soubory pěti interaktivních desek z Claude Design (formát `.dc.html`: HTML + CSS v `<helmet>` + logika `class Component extends DCLogic`).
Slouží jako vzor pro úkoly 48, 49, 56 a 57 – přebírejte vzhled, texty, časování a choreografii, ne runtime (soubor `support.js` je součást editoru Claude Design, na webu se nepoužívá).

| Deska | Co ukazuje |
|---|---|
| `Main.dc.html` | HOLUB 360 · zaměření na dálku: hejno 4 holubů (Měří · Počítá · Ověřuje · Komunikuje) sedí na hřebeni, do úkolu vzlétne vždy jeden; sken střechy, obrys, kóty jen pro to, co měření opravdu vrací (délka, šířka, obvod, půdorys – plochy jako ODHAD); volba cesty A/B pro střechu a fasádu → obálka s pečetí → orientační cena počítaná ze sazeb ceníku, zaokrouhlení na desítky, záruka jen pro cestu A |
| `Tlacitko.dc.html` | pulzující plaketa H-BOT (dávky 4,2 s, nikdy po otevření) a rozcestník celého webu (8 dlaždic), oznámení AI Act v uvítání |
| `CenaHned.dc.html` | Cena hned: povrchy, cesty A / B / Čištění a ošetření (radiogroup), Standard 01–05, odstíny RAL, živá orientační cena, karta „Váháte?“, biocidní věta čitelně |
| `Mobil.dc.html` | 390 px: adresa a tlačítko nahoře, scéna, hejno, dlaždice, obálka, cena; spodní lišta Zavolat · Zeptat se · Cena hned |
| `Mikro.dc.html` | mikrointerakce: zlaté tlačítko, fajfka, srdce, pečeť, nit, pulz, nápověda, chyba – u každého vzor vibrace a zvuk, vypínač „Zvuk a vibrace“ |

Revize a seznam dalších změn: `../../REVIZE-APEX-2026-10-22.md` (20 změn; S/M hotové v prototypu 22. 10., L – let po `offset-path` je v Main, sjednocení pečeti a jednoho SVG holuba je úkol 56/57).

## v9 (22. 10. 2026)
Zvuk a vibrace výchozí vypnuté s pozvánkou „Zapnout“ (R21) · „Přeskočit animaci → rovnou k ceně“ ve fázích 1–4 (stejná cena) · na obálce „otevřením nic neobjednáváte, orientační výpočet, ne nabídka“ (§ 1732/2 OZ) · záruka u cesty B bez čísla · bublina bez sklonu · dlaždice „IČO 09291881 · od roku 2020“ místo nedoložených čísel · Mikro: karta Pozvánka, políčko jen pro newsletter · řádek dopravy jednou větou.
