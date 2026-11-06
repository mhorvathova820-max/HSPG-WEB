# Rešerše (22. 10. 2026): haptika, zvuk, Uiverse, OpenRouter, orchestrace agentů, WebGL na mobilu

Shrnutí výsledků výzkumného úkolu k „Globální AI architektuře“ majitele. Závěry jsou zapracované do úkolů 49, 52, 56, 57 a do KONTEXT §4.

## Závěry
1. **Haptika:** `navigator.vibrate` jen Chromium/Android a jen po gestu; Firefox 129 API odstranil, Safari ho nemá; na iPhonu z webu vibrace nejde (hack se skrytým `switch` po iOS 26.5 nefunguje). → opt-in, krátké vzory (10 ms potvrzení, [12, 60, 18] fajfka, [8, 40, 8] srdce, [30, 50, 30] chyba), vždy s vizuálním ekvivalentem; nikdy slibovat „haptiku na všech telefonech“.
2. **Zvuk:** syntéza Web Audio, `AudioContext` až po gestu + `resume()`; iOS nechat `ambient` (ne `playback`); zvuky 50–200 ms, tiché (špička do −12 dBFS), bez dozvuku nad 200 ms; nic při načtení/hoveru; volbu ukládat až po aktivním přepnutí a uvést v zásadách (ePrivacy čl. 5(3)).
3. **Uiverse:** MIT – doložka povinná (`web/LICENSES-THIRD-PARTY.md`), každou komponentu přepsat na tokeny, nativní `<button>`/`<input>`, `:focus-visible`, reduced-motion; vhodná tlačítka, fajfka, switch, střídmý loader; nevhodné neon/glitch/3D.
4. **OpenRouter:** `provider.zdr: true` + `data_collection: "deny"`, pole `models` jako záloha, klíč s `limit` v USD a `limit_reset`; `openrouter/auto` ne (nepředvídatelný model i cena, ZDR nutno vynutit); žebříčky modelů si odporují – rozhodčím jsou vlastní testy. Dvě oddělené cesty: runtime rada (Netlify Function, limit 10 USD/měsíc) a vývojová (jen Claude Code, limit 20 USD/měsíc).
5. **Agenti:** Claude Code = mozek i ruce (podagenti, soubory, build, testy); Claude v Chrome kontroluje náhledy (OpenRouter sám nevolá); Claude Design předává návrh handoffem; CI (Playwright, axe 0 chyb, Lighthouse LCP ≤ 2,5 s, CLS ≤ 0,1, grep zakázaných vzorů) je rozhodčí. „Všichni agenti na plné obrátky“ je vize, ne fakt – na web nepatří.
6. **WebGL (HOLUB 360):** ≤ 50 draw calls, ≤ 100 000 trojúhelníků, DPR ≤ 1,5, bez stínů; Three.js až po LCP, LCP = statický poster; detekce slabého zařízení → poster.

## Co z původní vize nejde nebo je riskantní
Vibrace bez akce uživatele · obcházení tichého režimu iOS · kopírování Uiverse 1:1 bez revize · neomezený klíč OpenRouteru · 3D nad LCP na úvodní stránce · marketingové věty o „haptice na každém telefonu“ nebo „FPS na každém telefonu“ · „agenti pracují trvale autonomně“.

## Zdroje (výběr)
caniuse.com/mdn-api_navigator_vibrate · issues.chromium.org/issues/40512244 · developer.mozilla.org (Firefox 129) · webkit.org/blog/15865 (Safari 18) · developer.chrome.com/blog/autoplay · bugs.webkit.org/237322 · headlesslaw.com (EDPB 2/2023) · uiverse.io a github.com/uiverse-io/galaxy (MIT) · openrouter.ai/docs (model-fallbacks, zdr, api-keys, limits) · code.claude.com/docs/en/sub-agents · claude.com/product/design · web.dev LCP · utsubo.com (Three.js tipy)
