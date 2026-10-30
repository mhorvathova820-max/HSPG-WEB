# Úkol 54: Štít obsahu – výhrada vytěžování dat, ochrana před kopírováním a rámováním, postup proti kopiím
> Priorita P1 · Závisí na: 00, 08 (šablona hlavičky a patičky), 15 (hlavičky v `netlify.toml`) · Čeká na majitele: rozhodnutí o ochranných známkách (podklady v `balicek/DOKUMENTY-K-ODESLANI-2026-10-22.docx`), seznam fotografií k podpisu (IPTC), zda zveřejnit e-mail pro oznámení porušení práv.

## Proč a co to je (R20)
Majitel chce, aby web nikdo nemohl kopírovat a napodobit. Prohlížeč musí stránku zobrazit, a co zobrazí, lze uložit –
**technicky zabránit kopírování nelze** a prostředky, které to předstírají (blokování F12 a pravého tlačítka, zamlžování
kódu, zahlcení konzole), jsou trvale odmítnuté (KONTEXT §4.11). Štít obsahu je to, co skutečně funguje:
1. **Právo, strojově čitelně:** výhrada vytěžování textů a dat (TDM) podle § 39c autorského zákona (zákon č. 429/2022 Sb.)
   a čl. 4 směrnice (EU) 2019/790 – platí jen tehdy, když je vyjádřena strojově čitelně. Bez ní smí kdokoliv web
   legálně vytěžovat, včetně trénování AI.
2. **Technika, která nevadí zákazníkům:** zákaz vložení webu do cizího rámu, ochrana obrázků a videí proti přímému
   vkládání na cizí weby (hotlinking), podpis autorství ve fotografiích.
3. **Důkaz a postup:** verzovaný repozitář s datem, sledování kopií, výzva k odstranění (takedown).
4. **Co kopírovat nejde:** živá kalkulace z ceníku majitele (`/api/*`, Blobs), Standard HOLUB, péče SENTINEL, skutečné
   realizace a hodnocení, ochranné známky. Vzhled se okopírovat dá, firma ne.

## Soubory v balíčku
| Soubor | Cíl ve webHSPGH |
|---|---|
| `web/.well-known/tdmrep.json` | `/.well-known/tdmrep.json` (beze změny) |
| `sablony/stit/hlavicka-a-paticka.html` | meta tagy do `<head>` a odstavec do patičky každé stránky (úkol 08) |
| `sablony/stit/robots-ai.txt` | připojit na konec stávajícího `/robots.txt` (nepřepisovat; vyhledávače zůstávají povolené) |

## Postup
1. Větev `ukol-54-stit`. Zkopíruj soubory podle tabulky. V `robots.txt` ověř, že `Sitemap:` řádek zůstal a že `User-agent: *` nemá `Disallow: /`.
2. **Hlavičky** (`netlify.toml`, sekce `[[headers]]` pro `/*`; sladit s úkolem 15, žádné duplicity):
   ```
   tdm-reservation = "1"
   tdm-policy = "https://hspg.cz/podminky-uziti/"        # jen pokud stránka existuje (úkol 04); jinak vynechat
   X-Frame-Options = "SAMEORIGIN"
   Content-Security-Policy = "… ; frame-ancestors 'self'"  # doplnit do stávající CSP, nepřepisovat ji
   Referrer-Policy = "strict-origin-when-cross-origin"
   ```
   Pro `/media/*`, `/assets/foto/*` a `/video/*` (podle skutečných cest): `Cross-Origin-Resource-Policy = "same-site"`
   – obrázky a videa pak nejdou vložit přímo do cizí stránky. Výjimka: obrázky, které mají být sdílené (og:image pro
   sociální sítě) – ty nechat bez CORP, nebo je dát do samostatné složky `/sdileni/`.
3. **Fotografie:** do všech fotografií realizací zapsat IPTC/XMP pole Creator = „Dušan Holub – HSPG“, Copyright Notice
   = „© 2020–2026 Dušan Holub – HOLUB Surface Protection Group“, Web Statement = `https://hspg.cz/` (např. `exiftool
   -IPTC:By-line="…" -IPTC:CopyrightNotice="…" -XMP-xmpRights:WebStatement=https://hspg.cz/ -overwrite_original soubor.jpg`).
   Netlify Image CDN metadata zachovává jen někdy – ověř na jednom souboru po nasazení (stáhnout a `exiftool`).
   Nevkládat vodoznak přes fotky před/po (snižuje důvěru); stačí malý podpis v rohu u galerií.
4. **Patička a meta** z `hlavicka-a-paticka.html`; rok v „2020–2026“ generovat z data sestavení, ne natvrdo.
5. **Sledování kopií (ruční, 1× měsíčně, zapsat do `docs/provoz.md`):** Google vyhledání přesných vět z webu v uvozovkách
   (např. „Pět kroků ochrany povrchu, které nezkracujeme“), obrázky zpětně (Google Lens / TinEye) u 5 hlavních fotek,
   kontrola `tdmrep.json` a hlaviček (`curl -sI https://hspg.cz/ | grep -i -E "tdm|frame|policy"`).
6. **Postup při nalezení kopie** (`docs/kopie-postup.md`): 1) uložit důkaz (snímek, adresa, datum, archiv.org),
   2) výzva provozovateli kopie e-mailem (vzor v `DOKUMENTY-K-ODESLANI`), 3) po 7 dnech oznámení hostingu / registrátorovi
   (abuse@, WHOIS) a Googlu (žádost o odstranění z vyhledávání podle autorského práva), 4) u napodobení značky advokát
   (nekalá soutěž § 2976 OZ, ochranná známka). Nic z toho nedělá agent sám – jen připraví podklady, posílá majitel.
7. **Ochranné známky** – jen informace pro majitele (podklady v DOKUMENTY-K-ODESLANI): slovní známky „HSPG“, „HOLUB
   Surface Protection Group“, „H-STONE“, „HOLUB CORE QUANTUM SENSE“, případně obrazová známka holuba; třídy Niceského
   třídění 37 (čištění a ochrana budov), 1 (impregnační přípravky), 2 (nátěrové hmoty), 42 (software – kalkulace,
   HOLUB 360). Přihláška u ÚPV (elektronicky, poplatek 5 000 Kč za známku do 3 tříd, každá další třída 500 Kč – ověřit
   aktuální sazbu na upv.gov.cz v den podání). Až známka existuje, do patičky „HSPG® a H-STONE® jsou ochranné známky“.

## Co se NEDĚLÁ (trvale, §4.11)
Blokování pravého tlačítka, výběru textu, klávesy F12 a nástrojů vývojáře; zamlžování kódu nad minifikaci; skripty,
které zamrazí prohlížeč nebo zahltí konzoli; skryté „pasti“ v obsahu; blokování vyhledávačů.

## Akceptace
- [ ] `curl -s https://hspg.cz/.well-known/tdmrep.json` vrací JSON s `"tdm-reservation": 1`; `curl -sI https://hspg.cz/` obsahuje `tdm-reservation: 1`, `x-frame-options: SAMEORIGIN` a CSP s `frame-ancestors 'self'`.
- [ ] Každá stránka má `<meta name="tdm-reservation" content="1">` a odstavec v patičce (test v `tests/`: projde všechny HTML v `dist/`).
- [ ] `robots.txt`: GPTBot, ClaudeBot, Google-Extended, CCBot, Bytespider zakázány; `User-agent: *` beze změny; `Sitemap:` zůstal; Google Search Console neukazuje nové chyby procházení.
- [ ] Vložení `https://hspg.cz/` do `<iframe>` na cizí doméně se zablokuje (ověřit v náhledu zdarma).
- [ ] `exiftool` u jedné nasazené fotografie ukazuje Creator a Copyright.
- [ ] `docs/provoz.md` má měsíční kontrolu kopií, `docs/kopie-postup.md` existuje.
- [ ] Hlášení a stop.
