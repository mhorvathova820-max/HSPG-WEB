# Úkol 26: Mapa příležitostí (jen majitel)
> Priorita P2 · Závisí na: 21 (kupony), 23 (`/api/mereni`), 25 (konzole: mapa, zakázky v `/api/konzole`) · Čeká na majitele: potvrzení ceníku (viz úkol 27, `content/cenik-potvrzeni.json`), souhlas zákazníka, pokud má leták zmínit jeho zakázku.

## Co to dělá
Majitel v konzoli zvolí **obec nebo ulici** → server projde budovy z RÚIAN, každou změří jádrem `/api/mereni` (`lib/mereni/mereni.mjs`) a uloží:
- plochu střechy a fasád (bez společných zdí), typ (způsob využití), podlaží, druh konstrukce;
- **riziko mechu 0–100 (odhad):** orientace střešních ploch (sever, severovýchod, severozápad = vyšší; u sedlové střechy z hřebene podle obdélníku `obdelnik`), sklon (nízký = vyšší), **výška zeleně v okolí** (DMP − DMR v pásu 3–15 m kolem půdorysu, bez sousedních budov z RÚIAN; víc na jižní straně = víc stínu). Váhy v `content/mapa-prilezitosti.json`, ne v kódu; po prvních zakázkách je majitel může upravit;
- **odhadovanou hodnotu zakázky** jako pásmo v Kč = plochy × sazby z `content/ceny.json`, jen když je ceník potvrzený; jinak řazení podle m² × rizika bez Kč.

**Výstup:** budovy a ulice seřazené podle odhadované hodnoty · vrstva v mapě konzole (GeoJSON, barva podle skóre) · **seznam pro roznos letáků** po ulicích (jen adresy, počet budov, kampaňový kupon s omezeným počtem použití, tisk seznamu A4 a letáků A6 s QR do plánovače).
**Po dokončené zakázce** (stav „hotovo“ v `/api/konzole`): návrh podobných střech do 200 m (stejný typ, plocha ±50 %, podobný sklon a riziko) pro **sousedské kupony** (úkol 21). Majitel návrh schválí, nic se nerozesílá samo.

## Pojistky
- **Na pozadí s limity:** background funkce Netlify (`mapa-prilezitosti-background`) po dávkách; když ji tarif nemá, běh po krocích z konzole jako Lovec SVJ. Průběh a výsledky v Blobs `hspg-mapa`, tlačítko Stop. Denní strop budov a celková doba v `content/mapa-prilezitosti.json`; na náhledu změřit spotřebu na jedné ulici a uvést ji v hlášení.
- **Mezipaměť:** výsledek podle kódu stavebního objektu 180 dní (sdílená s `/api/mereni`); znovu se neměří.
- **Šetrnost ke ČÚZK:** User-Agent s kontaktem, nejvýš 2 souběžné dotazy, pauzy mezi budovami, v hromadném režimu méně bodů výškopisu (např. 6 na střechu, 8 v pásu zeleně), seznam budov stránkovat; přečíst podmínky služeb ČÚZK a v hlášení uvést, co říkají o hromadném použití. Velké obce rozdělit po ulicích.
- **Žádné údaje o vlastnících ani obyvatelích:** žádné nahlížení do katastru (LV), žádná jména, žádné propojení s jinými zdroji. Letáky bez jména, bez adresy příjemce („nevhazujte reklamu“ respektovat – pokyn pro roznos na seznamu).
- **Vše označené jako odhad:** u každého čísla „odhad z mapových podkladů (ČÚZK), ne prohlídka“; výškopis je z let 2009–2013 (zeleň mohla vyrůst) – uvést.
- Leták zmíní dokončenou zakázku jen s písemným souhlasem zákazníka; jinak obecný text. Žádné vymyšlené reference.
- Výsledky jen pro majitele, nikdy veřejně.

## Právně sporné
Adresa rodinného domu je přes katastr dohledatelná k vlastníkovi, takže seznam může být osobním údajem. Bezpečná varianta: oprávněný zájem s minimem údajů (adresa, plochy, skóre), doba uchování 180 dní, nic nespojovat s katastrem, doplnit do zásad (úkol 09). Bytové domy (SVJ) a firmy jsou bez tohoto rizika.

## Postup a akceptace
1. Větev `ukol-26-mapa`; `lib/mapa/{beh,riziko}.mjs`, funkce, nastavení `content/mapa-prilezitosti.json`, okno „Mapa příležitostí“ v konzoli.
- [ ] Testy s uloženými odpověďmi RÚIAN a výškopisu (bez internetu): severní střecha se stromy > jižní bez zeleně; plochá střecha; budova bez výškopisu → riziko „neznámé“, ne nula; strop dávky a Stop; mezipaměť (druhý běh nevolá ČÚZK).
- [ ] Bez potvrzeného ceníku žádné Kč; s potvrzeným pásmo, ne jedno číslo.
- [ ] Návrh sousedů do 200 m po stavu „hotovo“ jen jako návrh ke schválení.
- [ ] Žádné jméno ani údaj z katastru v datech (`git grep` + test obsahu Blobs).
- [ ] Náhled: jedna ulice, čas, počet dotazů na ČÚZK a spotřeba v hlášení; hlášení a stop.
