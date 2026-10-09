# Úkol 27: Okamžitá cena z adresy pro zákazníka (veřejná stránka)
> Priorita P2 · Závisí na: 02 (formuláře), 09 (zásady, souhlasy), 21 (plánovač, kupony), 23 (měření), **25 d (navazuje přímo, vzhled H-BOT v3)** · Čeká na majitele: potvrzení ceníku, slib „cena do 24 hodin“ (reakční doba, úkol 18).

## Co to dělá
Stránka `/cena-z-adresy/` + funkce `/api/cena-z-adresy`, vzhled podle **HBOT Budoucnost v3** (Claude Design, stejný designový systém jako konzole v9). Navazuje na **úkol 25 část d** (H-BOT v3 do skenu vede) – dělá se hned po ní.

**Krok 1 – sken domu (podle v3):**
1. Zákazník zadá adresu → našeptávač přes server (RÚIAN), vybere jedno adresní místo.
2. **Letecký snímek** (ortofoto ČÚZK, uvést „© ČÚZK“) s **obrysem** z katastrální mapy přes `/api/mereni` (ne nejbližší budova z OSM; OSM jen záloha s upozorněním) a **tři plochy jako odhad**. Měření umí střechu, fasády a půdorys; pokud v3 ukazuje zpevněné plochy kolem domu, ty `/api/mereni` neměří → pole pro zákazníka nebo vynechat, nic nedopočítávat. U ploch „odhad z mapových podkladů“.
3. Pod tím **„Cenu Vám pošleme do 24 hodin“** a formulář (souhlas, viz Pojistky).
4. **Po odeslání** volné dny z plánovače (`/api/planovac`) a pole pro kupon; sleva za rychlou rezervaci jen podle podmínek úkolu 21.

**Krok 2 – orientační cenové pásmo (až po potvrzení ceníku):** nad formulářem pásmo z `content/ceny.json` (vybraná služba × plocha, minimum a doprava z ceníku, šířka pásma v `content/cena-z-adresy.json`) s větou **„Orientační cena, přesnou potvrdíme na místě. Nejsme plátci DPH.“**

**Potvrzený ceník:** `content/cenik-potvrzeni.json` = `{ "platnost_od": "…", "potvrdil": "majitel", "datum": "…" }`. Ceny se ukážou jen, když `platnost_od` souhlasí s `content/ceny.json`. Bez potvrzení (nebo po změně ceníku) stránka **cenu neukáže** a zůstane u „Cenu Vám pošleme do 24 hodin“. Stejné pravidlo použije úkol 25 (nabídky, H-BOT) a 26.

## Pojistky
- **Přísné omezení dotazů:** na IP (hash, ne IP v logu) např. 5 měření/h a 15/den, celkový denní strop (nastavitelný); po stropu jen formulář. Jen adresa vybraná z našeptávače, žádné souřadnice ani hromadné dotazy. Bez AI (žádné kredity za AI).
- **Žádné přesné výkresy cizích domů veřejně** – jen plochy a obrys (bod 2).
- **Cena jen jako pásmo** s větou o potvrzení na místě; nikdy jedno přesné číslo.
- **Formulář:** souhlas nezaškrtnutý předem, odkaz na zásady (úkol 09), účel „cenová nabídka“, doba uchování podle 09; poptávka přes stávající cestu z úkolu 02. V logu žádná celá adresa ani kontakt (jen obec).
- Ochrana proti robotům bez cizí služby (past pro roboty + limity); případná CAPTCHA jen se zápisem do zásad.
- Výkon: LCP do 2,5 s; snímek, obrys a měření až po výběru adresy, bez těžké mapové knihovny (jeden výřez ortofota + SVG obrys). Letecký snímek se načítá z ČÚZK – uvést v zásadách (úkol 09).

## Postup a akceptace
1. Větev `ukol-27-cena-z-adresy`; stránka, funkce, `content/cena-z-adresy.json`, `content/cenik-potvrzeni.json` (bez data – vyplní majitel).
- [ ] Bez potvrzení ceníku odpověď API ani stránka neobsahuje žádnou částku v Kč (test).
- [ ] S potvrzením pásmo odpovídá `ceny.json` (test výpočtu), věta o potvrzení na místě a o DPH je vždy u ceny.
- [ ] Odpověď API neobsahuje výšky, `model3d`, strany ani sousední budovy (test).
- [ ] Limity: 6. měření za hodinu z jedné IP → 429 a nabídka formuláře; denní strop; druhý dotaz na stejnou adresu nevolá ČÚZK.
- [ ] Termíny a kupon z plánovače fungují; formulář se souhlasem projde na náhledu s označením TEST (produkční formulář jen se souhlasem majitele).
- [ ] Krok 1 funguje bez potvrzeného ceníku: snímek s obrysem z katastru, tři plochy s „odhad“, „Cenu Vám pošleme do 24 hodin“, po odeslání volné dny a kupon.
- [ ] Lighthouse mobil: LCP ≤ 2,5 s, přístupnost bez chyb; 375 px a **390 × 844** (snímky do hlášení – nikdo je zatím neověřil); hlášení a stop.
