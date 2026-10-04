import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Ověřovací soubory vyhledávačů se nesmí změnit ani o bajt (úkol 20).
const SOUBORY = {
  "seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt": "0629bb66964fae2450f0ff2a25aaffa08d9e09126a7af8cb687b2ec87f8c8848",
  "BingSiteAuth.xml": "5ec8d274566438c03739efa40203f2af03dc8f6124073ad276ee79fc17db6dd4",
};

test("ověřovací soubory Seznamu a Bingu jsou beze změny (SHA-256 z úkolu 20)", async () => {
  for (const [nazev, otisk] of Object.entries(SOUBORY)) {
    const data = await readFile(new URL(`../../web/overeni/${nazev}`, import.meta.url));
    assert.equal(createHash("sha256").update(data).digest("hex"), otisk, nazev);
  }
  const seznam = await readFile(new URL("../../web/overeni/seznam-wmt-UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI.txt", import.meta.url), "utf8");
  assert.equal(seznam, "UwjLAVRvccQ9DfNFWiVyaCujsuJobTkI", "obsah = kód z názvu souboru, bez nového řádku");
});
