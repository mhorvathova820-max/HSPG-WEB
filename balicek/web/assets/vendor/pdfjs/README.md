# PDF.js 6.4.299 (hostováno u sebe, sestavení „legacy“ pro starší prohlížeče)

- Zdroj: npm `pdfjs-dist@6.4.299` – soubory `legacy/build/pdf.min.mjs` a `legacy/build/pdf.worker.min.mjs` beze změny obsahu,
  jen s příponou `.js` (každý hosting je posílá jako JavaScript – moduly s jiným typem MIME prohlížeč odmítne).
- Licence: Apache License 2.0 (soubor `LICENSE`), © Mozilla a přispěvatelé.
- Použití: `assets/hspg-konkurence.js` – v prohlížeči z PDF nabídky vytáhne jen text pro porovnání se
  Standardem HOLUB; soubor se nikam nenahrává. Načítá se až po výběru souboru, žádné CDN.
- Aktualizace: jen přesná verze starší aspoň 14 dní; po výměně spustit e2e test porovnání.
