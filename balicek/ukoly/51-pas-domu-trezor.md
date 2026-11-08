# Úkol 51: Pas domu – trezor (nový vzhled `/pas-domu`)
> Priorita P2 · Závisí na: 14 (přístupové kódy a ochrana `/api/sentinel/validate`), 50 (SENTINEL, podmínky záruky) · Čeká na majitele: přístupové kódy ke stávajícím pasům (úkol 14), TEST pas pro ověření na náhledu.

## Co to dělá
- Pas se otevře **kódem pasu `HS-RRRR-ČČČČ` + přístupovým kódem** z certifikátu: `POST /api/sentinel/validate { sentinel_code, pristup }`.
- Odkaz z certifikátu `…/pas-domu#kod=…&pristup=…`: kód se z adresního řádku smaže dřív, než odejde jakýkoli požadavek (inline skript v `<head>` + pojistka v JS).
- Vykresluje jen whitelist polí z API (textContent), neznámá pole zahodí; každé selhání = jedna neutrální hláška (neprozradí, který údaj nesedí).
- Stav péče SENTINEL a podmínka záruky podle data zakázky (nová podmínka R15, nebo původní pro domy před 22. 10. 2026); počasí pro obec. Bez AI, bez externích knihoven a písem.

## Soubory z balíčku
`assets/pas-trezor.js`, `pas-trezor.css`; `pas-domu/trezor.html` (šablona); `ukazky/pas-trezor.html` (ukázka s fiktivními daty – **nenasazovat**). Test: e2e `pas-trezor.test.mjs`.

## Postup
1. Větev `ukol-51-pas-trezor` až po úkolu 14 – bez přístupového kódu trezor nespouštět.
2. Napoj na skutečná pole `/api/sentinel/validate` (kontrakt v `pas-trezor.js` u „Pole z kontraktu“); co API nevrací, nezobrazovat.
3. `/pas-domu` → nový vzhled; staré odkazy z certifikátů s kódem v dotazu (`?kod=`) přesměruj na `#kod=` tak, aby kód nezůstal v logu (ověř, kde se loguje).
4. Hlavičky pro `/pas-domu*`: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`.

## Akceptace
- [ ] e2e `pas-trezor` zelené; na náhledu s TEST pasem od majitele.
- [ ] Kód z adresy zmizí před prvním požadavkem (test); špatný kód nebo přístup → jedna neutrální hláška; limit pokusů podle úkolu 14 → 429.
- [ ] 390 × 844 bez posunu, axe bez vážných chyb, prefers-reduced-motion bez animací.
- [ ] Hlášení a stop.
