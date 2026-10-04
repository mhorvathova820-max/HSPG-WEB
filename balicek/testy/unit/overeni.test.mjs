import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Ověřovací soubory vyhledávačů se nesmí změnit ani o bajt (úkol 20).
const SOUBORY = {
  "seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt": "0629bb66964fae2450f0ff2a25aaffa08d9e09126a7af8cb687b2ec87f8c8848",
  "seznam-wmt-Po3dPd1HHqS4CTM5jhDFxRDnV1pXDnq0.txt": "e16f3c6eb2878279a63db072070d92a6e46e3032d1d3abca7a5d8d943a2a1095",
  "BingSiteAuth.xml": "5ec8d274566438c03739efa40203f2af03dc8f6124073ad276ee79fc17db6dd4",
  "meta-tagy.html": "8878af3edd913857987a408a1d29d46ef477e2f0de324112e401829364ee2d13",
};

test("ověřovací soubory Seznamu a Bingu jsou beze změny (SHA-256 z úkolu 20)", async () => {
  for (const [nazev, otisk] of Object.entries(SOUBORY)) {
    const data = await readFile(new URL(`../../web/overeni/${nazev}`, import.meta.url));
    assert.equal(createHash("sha256").update(data).digest("hex"), otisk, nazev);
  }
  for (const kod of ["UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI", "Po3dPd1HHqS4CTM5jhDFxRDnV1pXDnq0"]) {
    const seznam = await readFile(new URL(`../../web/overeni/seznam-wmt-${kod}.txt`, import.meta.url), "utf8");
    assert.equal(seznam, kod, "obsah = kód z názvu souboru, bez nového řádku");
  }
  const meta = await readFile(new URL("../../web/overeni/meta-tagy.html", import.meta.url), "utf8");
  assert.match(meta, /^<meta name="seznam-wmt" content="nlvnOcCHi14kMJErM2X5QfqvaB0BGZWV">\n<meta name="msvalidate.01" content="875C77503943F9156A5D5B2F76A6B8FC">\n$/);
  const bing = await readFile(new URL("../../web/overeni/BingSiteAuth.xml", import.meta.url), "utf8");
  assert.ok(bing.includes("875C77503943F9156A5D5B2F76A6B8FC"), "Bing: soubor i meta tag mají stejný kód");
});
