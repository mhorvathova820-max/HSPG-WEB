import { test } from "node:test";
import assert from "node:assert/strict";
import { muzeDoProdukce } from "../../web/scripts/nasadit.mjs";

const ted = Date.parse("2026-10-04T15:00:00Z");
const zaklad = { zaznamy: [], ted, vetev: "main", cisto: true, schvaleno: "majitel 4. 10. v chatu" };

test("produkce: bez schválení, mimo main nebo s rozdělanou prací zamítnuto", () => {
  assert.equal(muzeDoProdukce({ ...zaklad, schvaleno: undefined }).ok, false);
  assert.equal(muzeDoProdukce({ ...zaklad, vetev: "ukol-01-plovouci-asistent" }).ok, false);
  assert.equal(muzeDoProdukce({ ...zaklad, cisto: false }).ok, false);
  assert.equal(muzeDoProdukce(zaklad).ok, true);
});

test("produkce: nejvýš 1× denně, nouzové nasazení s důvodem projde", () => {
  const dnes = [{ cas: "2026-10-04T08:00:00Z" }];
  assert.equal(muzeDoProdukce({ ...zaklad, zaznamy: dnes }).ok, false);
  assert.equal(muzeDoProdukce({ ...zaklad, zaznamy: dnes, nouzove: "formuláře nefungují" }).ok, true);
  assert.equal(muzeDoProdukce({ ...zaklad, zaznamy: [{ cas: "2026-10-03T20:00:00Z" }] }).ok, true, "včerejší nasazení neblokuje");
  assert.equal(muzeDoProdukce({ ...zaklad, zaznamy: dnes, limit: 2 }).ok, true);
});
