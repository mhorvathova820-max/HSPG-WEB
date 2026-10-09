# Úkol 27: Okamžitá cena z adresy pro zákazníka (veřejná stránka)
> Priorita P2 · Závisí na: 02 (formuláře), 09 (zásady, souhlasy), 21 (plánovač, kupony), 23 (měření), 25 d (H-BOT odkáže sem) · Čeká na majitele: potvrzení ceníku, slib „cena do 24 hodin“ (reakční doba, úkol 18).

## Co to dělá
Stránka `/cena-z-adresy/` + funkce `/api/cena-z-adresy`:
1. Zákazník zadá adresu → našeptávač přes server (RÚIAN), vybere jedno adresní místo.
2. **Zjednodušené změření** (jádro `/api/mereni`, mezipaměť podle kódu adresy): **jen obrys** (zjednodušený, zaokrouhlený) a **plochy** – půdorys, fasády, střecha, počet podlaží. Žádné výšky po stranách, výkresy, 3D ani sousední budovy.
3. **Orientační cenové pásmo** z `content/ceny.json` (vybraná služba × plocha, minimum a doprava z ceníku, šířka pásma v `content/cena-z-adresy.json`) s větou **„Orientační cena, přesnou potvrdíme na místě. Nejsme plátci DPH.“**
4. **Volné termíny** z plánovače (`/api/planovac`) s polem pro kupon; sleva za rychlou rezervaci jen podle podmínek úkolu 21.

**Potvrzený ceník:** `content/cenik-potvrzeni.json` = `{ "platnost_od": "…", "potvrdil": "majitel", "datum": "…" }`. Ceny se ukážou jen, když `platnost_od` souhlasí s `content/ceny.json`. Bez potvrzení (nebo po změně ceníku) stránka **cenu neukáže** a nabídne „Cenu vám pošleme do 24 hodin“ s formulářem. Stejné pravidlo použije úkol 25 (nabídky, H-BOT) a 26.

## Pojistky
- **Přísné omezení dotazů:** na IP (hash, ne IP v logu) např. 5 měření/h a 15/den, celkový denní strop (nastavitelný); po stropu jen formulář. Jen adresa vybraná z našeptávače, žádné souřadnice ani hromadné dotazy. Bez AI (žádné kredity za AI).
- **Žádné přesné výkresy cizích domů veřejně** – jen plochy a obrys (bod 2).
- **Cena jen jako pásmo** s větou o potvrzení na místě; nikdy jedno přesné číslo.
- **Formulář:** souhlas nezaškrtnutý předem, odkaz na zásady (úkol 09), účel „cenová nabídka“, doba uchování podle 09; poptávka přes stávající cestu z úkolu 02. V logu žádná celá adresa ani kontakt (jen obec).
- Ochrana proti robotům bez cizí služby (past pro roboty + limity); případná CAPTCHA jen se zápisem do zásad.
- Výkon: LCP do 2,5 s, měření a obrys (malé SVG) až po odeslání adresy, bez těžké mapové knihovny.

## Postup a akceptace
1. Větev `ukol-27-cena-z-adresy`; stránka, funkce, `content/cena-z-adresy.json`, `content/cenik-potvrzeni.json` (bez data – vyplní majitel).
- [ ] Bez potvrzení ceníku odpověď API ani stránka neobsahuje žádnou částku v Kč (test).
- [ ] S potvrzením pásmo odpovídá `ceny.json` (test výpočtu), věta o potvrzení na místě a o DPH je vždy u ceny.
- [ ] Odpověď API neobsahuje výšky, `model3d`, strany ani sousední budovy (test).
- [ ] Limity: 6. měření za hodinu z jedné IP → 429 a nabídka formuláře; denní strop; druhý dotaz na stejnou adresu nevolá ČÚZK.
- [ ] Termíny a kupon z plánovače fungují; formulář se souhlasem projde na náhledu s označením TEST (produkční formulář jen se souhlasem majitele).
- [ ] Lighthouse mobil: LCP ≤ 2,5 s, přístupnost bez chyb, 375 px; hlášení a stop.
