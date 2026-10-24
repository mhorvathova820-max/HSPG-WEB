# Three.js – vlastní kopie (bez CDN)

- Balíček: `three@0.184.0` (r184, vydán 16. 4. 2026) z registru npm, `npm pack three@0.184.0`
  (sha1 tarballu `5bca0a3851eea5345e4c205567b40dfa49b791b5`, shodné s `dist.shasum` v registru).
- Licence: MIT, viz `LICENSE` (Copyright © 2010–2026 three.js authors). Soubor LICENSE musí zůstat vedle kódu.
- Převzato beze změny: `build/three.module.min.js`, `build/three.core.min.js` (načítá ho three.module.min.js), `LICENSE`.
- Upraveno: `examples/jsm/controls/OrbitControls.js` – jediná změna je cesta importu `'three'` →
  `'./three.module.min.js'` (prohlížeč bez import map; CSP bez inline skriptů).
- Používá jen `assets/holub360-scena.js` (stránka `/holub-360/`); načítá se až po prvním vykreslení stránky
  a jen když prohlížeč umí WebGL a uživatel nemá zapnuté omezení pohybu.
- Aktualizace: stáhnout novou přesnou verzi přes `npm pack`, zkopírovat stejné soubory, zopakovat úpravu importu
  a projít `npm run test:e2e` (test `holub360.test.mjs`).

SHA-256:
```
36a60b0120335f89a80a0dab70292292b0ec414b3d05e83cd09a3ea428c6712a  three.module.min.js
6486aa0d719cfa87ec88dc47223b59b1fb8417a1a407fc0e52467c943e2f8cc9  three.core.min.js
845c827054bda45b84ae0e9e0db4e707f75d2182af9cd88787b2cac86aeef8ef  OrbitControls.js
8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc  LICENSE
```
