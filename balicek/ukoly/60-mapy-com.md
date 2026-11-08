# Úkol 60: Mapy.com pro Claude a panel majitele – adresy, letecký snímek, panorama, trasy (`/api/mapa`, nástroje brány)
> Priorita P1 · Závisí na: 59 (brána MCP, společné ověření majitele), 22 · Čeká na majitele: `HSPG_KLIC_MAPY` v Netlify (developer.mapy.com → projekt → API klíč), volitelně `MAPY_MESICNI_LIMIT_KREDITU`.

Rozhodnutí majitele 8. 11. 2026 (R23): Claude má mít přístup k Mapy.com a využít z nich všechno, co jde – **přes API klíč v Netlify** (ne přes osobní předplatné Premium, to firmě nic nepřidává). Tarif Basic: 250 000 kreditů měsíčně zdarma, dál 1,60 Kč / 1 000; strop v kódu drží spotřebu pod kvótou.

## Co to dělá
- `netlify/lib/ai/mapy.mjs` – adaptér REST API `api.mapy.com/v1` (klíč jen v hlavičce `X-Mapy-Api-Key`): geokódování, našeptávač, zpětné geokódování, trasa (vč. průjezdních bodů, provoz, bez dálnic/mýta), matice vzdáleností (≤ 100 dvojic), výškopis, **statický snímek** (sada `aerial` / `basic` / `outdoor` / `aerial-names-overlay` / `winter`, zlatá značka, volitelný obrys střechy) a **panorama** (pohled z ulice). Souřadnice vždy `[lon, lat]`; „lat,lon“ pro ČR se opraví. Počítadlo kreditů v Blobs `mapy/kredity/<měsíc>`, strop `MAPY_MESICNI_LIMIT_KREDITU` (výchozí 200 000 < 250 000 zdarma) → žádný nový zdroj útraty (§4.4).
- **Brána MCP (`/api/mcp`) – nové nástroje:** `mapa_adresa`, `mapa_snimek` (vrací obrázek jako MCP `image` + text), `mapa_panorama`, `mapa_trasa`, `mapa_matice`, `mapa_vyska`; `ai_stav` ukazuje stav Mapy.com a kredity za měsíc. Claude tak v kterékoli relaci (claude.ai, Cowork, Chrome, Desktop, Claude Code) najde objekt, podívá se na střechu shora i z ulice a spočítá přejezdy party.
- **`/api/mapa`** – totéž pro panel majitele (POST JSON `{ akce, … }`, Bearer token panelu / OAuth brány / `HSPG_MCP_TOKEN`; obrázky jako data URL, klíč neopouští server). Akce `adresa`, `zpetne`, `snimek`, `panorama`, `trasa`, `matice`, `vyska`, `stav`. Limit 120 volání / 10 min společný s panelem a bránou.
- `netlify/lib/ai/pristup-majitele.mjs` – společné ověření Bearer (panel / OAuth / pevný token) pro `/api/mcp` i `/api/mapa`.
- Adresy objektů jdou do Mapy.com beze změny (účel = najít objekt); Seznam.cz je zpracovatel → doplnit do seznamu zpracovatelů (úkol 09). **Embargo trvá:** v textech pro zákazníky nikdy „letecké snímky“, „satelitní snímky“, „z map“ – snímky jsou interní podklad pro nabídku.

## Soubory z balíčku
`netlify/lib/ai/mapy.mjs`, `netlify/lib/ai/pristup-majitele.mjs`, `netlify/lib/ai/mcp.mjs` (rozšířeno), `netlify/functions/mcp.mjs` (ověření sdílené), `netlify/functions/mapa.mjs`. Testy `mapy` (5) + upravené `mcp`, `mcp-sdk`. Žádná nová závislost.

## Postup
1. Větev `ukol-60-mapy-com` (po úkolu 59). Přenes soubory; cesta `/api/mapa` je v `config.path`, v `netlify.toml` nic navíc.
2. `npm test` (balíček) – 234 testů zelených; žádný test nevolá skutečné Mapy.com.
3. Náhled zdarma. Ověř (s tokenem panelu z `/api/majitel`):
   - `POST /api/mapa {"akce":"stav"}` → `zapnuto` podle toho, zda je klíč v Netlify; bez klíče akce `adresa` vrátí `ok:false` s textem „chybí HSPG_KLIC_MAPY“ (ne 500).
   - S klíčem: `{"akce":"adresa","dotaz":"Stavební 1066, Hradec Králové"}` → souřadnice a PSČ; `{"akce":"snimek","misto":"Stavební 1066, Hradec Králové"}` → `obrazek` data URL (JPEG, letecký, zlatá značka); `{"akce":"trasa","start":"Stavební 1066, Hradec Králové","cil":"Pernerova 10/32, Praha"}` → `delkaM`, `trvaniS`.
   - Přes bránu MCP (MCP Inspector nebo Claude s konektorem): `mapa_snimek` vrátí obrázek, `ai_stav` ukáže „Mapy.com: zapnuto · kredity …“.
   - V logu funkcí jen `udalost`, `akce`, `stav`, `ms` – žádná adresa ani klíč.
4. Produkce až po schválení majitelem (15 kreditů; lze spojit s nasazením úkolu 59).
5. Proměnné v Netlify (zadává majitel, scope Functions): `HSPG_KLIC_MAPY` (povinná), `MAPY_MESICNI_LIMIT_KREDITU` (volitelná, výchozí 200000). Klíč nikdy nevidíš, nežádáš a nevypisuješ.
6. Panel majitele (navazující práce, ne v tomto úkolu): na obrazovce poptávky / „Dnes“ tlačítka „Snímek objektu“, „Pohled z ulice“ a „Přejezd ze skladu“ volající `/api/mapa`; obrázky zobrazit jen přihlášenému majiteli, nikdy je nevkládat do nabídek pro zákazníky bez jeho rozhodnutí.

## Akceptace
- [ ] Unit testy zelené; `git grep -nE "X-Mapy-Api-Key: |apikey="` najde jen dokumentaci, žádný klíč v repozitáři.
- [ ] Náhled: `stav`, `adresa`, `snimek`, `trasa` podle kroku 3; strop kreditů (`MAPY_MESICNI_LIMIT_KREDITU=8` na náhledu → druhé volání 402) funguje.
- [ ] `ai_stav` přes bránu ukazuje kredity; `mapa_snimek` v Claude zobrazí obrázek.
- [ ] Zásady (úkol 09): Seznam.cz / Mapy.com doplněn mezi zpracovatele.
- [ ] Hlášení a stop.
