# Zadání pro Claude Pro (aplikace claude.ai)

Claude Pro slouží majiteli na **rozhodnutí, texty a dokumenty**, které vyžadují jeho znalosti. Na chod webu
předplatné vliv nemá – web používá API přes Netlify a funguje i bez AI.

## Nastavení (jednou)
1. claude.ai → **Projects → Create project** „HSPG web“.
2. Do znalostí projektu (Project knowledge) nahraj z GitHubu: `balicek/KONTEXT.md`, `balicek/POSUDEK-MASTER-PLANU.md`, `balicek/ukoly/PORADI.md`, `balicek/web/content/firma.json`, `balicek/web/content/hbot-faq.json`, `balicek/web/content/ceny.json`, `balicek/web/content/sentinel.json`.
3. Do pokynů projektu (Project instructions) vlož text mezi čarami:

---

Pomáháš majiteli firmy HOLUB – HSPG (Dušan Holub, OSVČ, IČO 09291881) s obsahem a rozhodnutími pro web hspg.cz. Fakta ber jen ze znalostí projektu a z toho, co majitel výslovně řekne. Nikdy nevymýšlej reference, recenze, hodnocení, čísla, pojistné částky, certifikáty ani technické parametry; chybějící údaj označ [DOPLNIT: …] a zeptej se. Žádné superlativy bez důkazu. Nedokončené technologie (HYDRA, MAST, RAIL, SCAN 5) neprezentuj jako hotové. Výstupy pro web dávej v přesném formátu, který úkol žádá (JSON / Markdown), aby je majitel mohl předat agentovi ve VS Code. Na konci každého výstupu vypiš „Rozhodnutí, která jsi udělal“ a „Co je ještě [DOPLNIT]“.

---

## Úkoly (vkládej po jednom)

**P1 Rozhodnutí majitele** – „Projdi se mnou otevřená rozhodnutí z KONTEXT.md §3 (doba uchování poptávek 12 měsíců / 3 roky, newsletter Holubí pošta, stav HYDRA-5 / MAST / RAIL / SCAN 5 / SENTINEL, pojištění odpovědnosti, technické listy, doklad k H-BIO, slib reakční doby – do 2 hodin nebo do 24 hodin a zda platí i v neděli a svátky, zda repozitář HSPG-WEB přepnout na soukromý). Ptej se po jednom. Výstup: soubor ROZHODNUTI.md (tabulka: otázka, rozhodnutí, datum, doklad).“
→ Majitel předá ROZHODNUTI.md agentovi ve VS Code: „Ulož do repozitáře a promítni do KONTEXT podle úkolů.“

**P2 Doplnění častých otázek H-BOTa** – „Připrav nové otázky do content/hbot-faq.json (stejný formát: k = klíčová slova bez diakritiky i s ní, q = otázka, a = odpověď, volitelně link). Témata: chemie a zahrada / zvířata, vliv počasí a kdy se nepracuje, pojištění, co když se plocha liší od zaměření, reklamace, jak dlouho práce trvá, platba. Odpovědi jen z faktů, které ti řeknu – na každé téma se mě nejdřív zeptej. Výstup: JSON pole nových položek.“
→ VS Code agent je vloží do `content/hbot-faq.json` a spustí `node scripts/build-hbot.mjs`.

**P3 Zásady ochrany osobních údajů – podklad pro právníka** – „Podle úkolu 09 a KONTEXT.md připrav návrh zásad, který odpovídá skutečnému zpracování (Netlify Forms, Seznam e-mail, Netlify AI Gateway – Anthropic, OpenAI, Google; Microsoft Clarity a Google Tag Manager po souhlasu; ntfy/Telegram jen pokud je zapnu). Doby uchování a Holubí poštu vezmi z ROZHODNUTI.md. Výstup: Markdown + seznam otázek pro právníka.“

**P4 Obchodní podmínky a reklamační řád** – „Projdi se mnou návrh podmínek (vložím ho) a porovnej ho s tím, co web slibuje (záruka 10 let s kontrolou 1× za 24 měsíců, platby, záloha nad 100 000 Kč, tarify SENTINEL). Výstup: seznam rozporů, otázky pro právníka a čistá verze k revizi.“

**P5 Pravidla akce „Vypusťte holuba“** – „Doplň se mnou pravidla akce: doba trvání, kdo se může účastnit, co přesně je výhra, dojezdová vzdálenost, jak se vybírá výherce, daně, ochrana osobních údajů. Výstup: Markdown pro stránku /pravidla-akce/.“

**P6 Krajské stránky (až budou zakázky)** – „Pro kraj [název] připrav text stránky jen z těchto dat o zakázkách: [vložím]. Struktura podle úkolu 12. Žádné čítače ani realizace, které nejsou v datech.“

**P7 Facebook a odpovědi zákazníkům** – „Napiš příspěvek / odpověď na recenzi / odpověď na poptávku z těchto faktů: [vložím].“ (Totéž umí panel „Vše ve tvých rukách“ na webu po přihlášení – tam navíc porovnáš více AI.)
