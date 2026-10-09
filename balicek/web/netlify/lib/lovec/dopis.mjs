// Lovec SVJ (úkol 24) – osobní dopis pro schválené SVJ. Text napíše Mistral jen z dodaných faktů, Claude ho
// zkontroluje na pravdivost; když kontrola neprojde ani na druhý pokus (nebo AI není), použije se šablona.
// Povinné části (odkud máme údaje, jak odmítnout další oslovení, kdo jsme) doplňuje vždy kód, ne AI.
// Výstup: HTML pro tisk na A4 (v prohlížeči „Tisk → Uložit jako PDF“) s QR kódem do plánovače s kuponem.
import QRCode from "qrcode";
import { PRAVIDLA_PRAVDIVOSTI } from "../ai/pravidla.mjs";
import { volejAI } from "./beh.mjs";

const cz = (x, j) => (x == null ? null : `${Math.round(x).toLocaleString("cs-CZ")} ${j}`);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function faktaDopisu(z, firma, { kupon, kodOdmitnuti }) {
  const b = z.budova || {};
  return {
    adresat: z.nazev, sidlo: z.sidlo, ico: z.ico, osloveni: z.predseda?.osloveni || null,
    dum: {
      podlazi: b.podlazi, panelovy: b.panel, plochaPudorysu: cz(b.plochaPudorysu, "m²"), fasady: cz(b.fasady, "m²"), strecha: cz(b.strecha, "m²"),
      poznamka: "Rozměry jsou schéma z mapových podkladů (ČÚZK), ne geodetické zaměření.",
    },
    nabidka: "Zaměření domu na místě zdarma a nezávazná cenová nabídka na čištění a ochranu fasády a střechy.",
    kupon: kupon ? { kod: kupon.kod, nabidka: "1 litr impregnace H-STONE zdarma k zakázce", platnostDo: kupon.platnostDo } : null,
    odesilatel: { znacka: firma.znacka, provozovatel: firma.provozovatel, ico: firma.ico, telefon: firma.telefon_zobrazeni, email: firma.email, web: firma.web },
    zdroje: ["veřejný rejstřík (ARES)", "ČÚZK – RÚIAN a výškopis", ...(z.schvalenyKontakt?.url ? [`web ${z.schvalenyKontakt.url}`] : [])],
    kodOdmitnuti,
  };
}

const SYSTEM_MISTRAL = `${PRAVIDLA_PRAVDIVOSTI}
Napiš krátký, slušný obchodní dopis (česky, vykání, nejvýš 1 400 znaků, bez oslovení a bez podpisu – ty doplní šablona)
pro společenství vlastníků jednotek. Použij POUZE fakta z JSON: rozměry domu (jako orientační schéma z map), nabídku zaměření
zdarma a kupon. Žádné ceny, slevy, termíny, reference, záruky, pojištění ani technologie, které v JSON nejsou. Žádné superlativy.`;
const SYSTEM_KONTROLA = `${PRAVIDLA_PRAVDIVOSTI}
Zkontroluj dopis proti faktům v JSON. Je v něm cokoli, co fakta neobsahují (čísla, ceny, sliby, záruky, reference, termíny)?
Odpověz POUZE JSON: {"ok":true|false,"problemy":["…"]}`;

export function sablonaDopisu(f) {
  const d = f.dum;
  const rozmery = [d.fasady && `fasády přibližně ${d.fasady}`, d.strecha && `střecha přibližně ${d.strecha}`].filter(Boolean).join(" a ");
  return [
    `obracím se na vás jako ${f.odesilatel.znacka} – čistíme a chráníme fasády, střechy a zpevněné plochy.`,
    rozmery ? `Podle veřejných mapových podkladů má váš dům ${rozmery}. ${d.poznamka}` : d.poznamka,
    `Nabízíme vám ${f.nabidka.charAt(0).toLowerCase()}${f.nabidka.slice(1)}`,
    f.kupon ? `S kódem ${f.kupon.kod} k zakázce získáte ${f.kupon.nabidka.replace(/ k zakázce$/, "")} (platí do ${f.kupon.platnostDo}). Termín si můžete vybrat přes QR kód.` : "",
  ].filter(Boolean).join("\n\n");
}

const jsonZTextu = (t) => { const m = String(t || "").match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

// deps: { adaptery, env, ulAI, ted } – stejné jako u volejAI. Vrací { text, autor: "mistral"|"sablona", kontrola }.
export async function napisDopis(fakta, deps) {
  const data = JSON.stringify({ ...fakta, kodOdmitnuti: undefined });
  let pripominky = "";
  for (let pokus = 0; pokus < 2; pokus++) {
    let text;
    try { text = await volejAI({ id: "mistral", ...deps, system: SYSTEM_MISTRAL, text: `FAKTA:\n${data}${pripominky}`, maxTokenu: 700 }); }
    catch { break; }
    text = String(text || "").trim().slice(0, 1600);
    if (!text) break;
    let k = null;
    try { k = jsonZTextu(await volejAI({ id: "claude", ...deps, system: SYSTEM_KONTROLA, text: `FAKTA:\n${data}\n\nDOPIS:\n${text}`, maxTokenu: 300 })); } catch { k = null; }
    if (k?.ok === true) return { text, autor: "mistral", kontrola: "claude: ok" };
    if (!k) break; // bez kontroly se AI text nepoužije
    pripominky = `\n\nOPRAV tyto problémy předchozí verze: ${(k.problemy || []).join("; ")}`;
  }
  return { text: sablonaDopisu(fakta), autor: "sablona", kontrola: "šablona z ověřených faktů" };
}

export async function htmlDopisu({ text, fakta, odkazQR, datum }) {
  const qr = odkazQR ? await QRCode.toString(odkazQR, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : "";
  const o = fakta.odesilatel;
  // Jméno předsedy (jen z veřejného rejstříku a jen když to majitel zapnul) patří do adresy „k rukám“ – oslovení
  // v 5. pádě a rod se ze jména spolehlivě určit nedají, proto neutrální „Dobrý den“.
  const kRukam = fakta.osloveni ? `<br>k rukám předsedy výboru: ${esc(fakta.osloveni)}` : "<br>k rukám výboru společenství";
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Dopis – ${esc(fakta.adresat)}</title>
<style>@page{size:A4;margin:20mm 18mm}body{font:11pt/1.5 Georgia,serif;color:#111;max-width:174mm;margin:0 auto}
.hl{display:flex;justify-content:space-between;font:9pt/1.4 Arial,sans-serif;color:#333}.adresat{margin:18mm 0 10mm}
.qr{display:flex;gap:6mm;align-items:center;margin:8mm 0;font:9pt/1.4 Arial,sans-serif}.qr svg{width:28mm;height:28mm}
.pravni{margin-top:10mm;border-top:1px solid #999;padding-top:3mm;font:8pt/1.4 Arial,sans-serif;color:#333}p{margin:0 0 3.5mm}</style></head><body>
<div class="hl"><div><b>${esc(o.znacka)}</b><br>${esc(o.provozovatel)}, IČO ${esc(o.ico)}</div><div style="text-align:right">${esc(o.telefon)}<br>${esc(o.email)}<br>${esc(o.web)}</div></div>
<div class="adresat">${esc(fakta.adresat)}${kRukam}<br>${esc(fakta.sidlo)}</div>
<p style="text-align:right">${esc(datum)}</p>
<p>Dobrý den,</p>
${String(text).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p>S pozdravem<br><br>${esc(o.provozovatel)}<br>${esc(o.znacka)}</p>
${qr ? `<div class="qr">${qr}<div>Vyberte si termín zaměření v plánovači:<br>${esc(odkazQR)}</div></div>` : ""}
<div class="pravni"><b>Odkud máme vaše údaje:</b> ${esc(fakta.zdroje.join("; "))}. Údaje o společenství zpracováváme na základě oprávněného zájmu (nabídka služeb), jen pro toto oslovení.
<b>Nepřejete si další dopisy?</b> Napište na ${esc(o.email)} nebo zavolejte ${esc(o.telefon)} (kód ${esc(fakta.kodOdmitnuti)}) – zapíšeme vás na seznam „neoslovovat“ a už se neozveme.
Rozměry domu jsou schéma z mapových podkladů, ne geodetické zaměření.</div>
</body></html>`;
}
