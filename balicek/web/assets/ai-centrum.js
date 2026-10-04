/* AI centrum HSPG – řízení stránky /ai-centrum/ („Vše ve tvých rukách“).
   Mluví jen s vlastními adresami webu: /api/majitel, /api/ai-stav a /api/ai (přes /assets/ai-klient.js).
   Robot H-BOT (jádro s logem a AI na oběžné dráze) jen ukazuje, co se právě děje: které AI pracují
   a kdo komu předává práci. Nic nepředstírá – každý spoj se rozsvítí jen při skutečném volání AI. */
(function () {
  "use strict";
  const AI = window.HSPG_AI;
  const ULOHY = Object.fromEntries(Object.entries(AI.ULOHY).filter(([k]) => k !== "stranka"));
  const $ = (id) => document.getElementById(id);
  const el = (tag, trida, text) => {
    const e = document.createElement(tag);
    if (trida) e.className = trida;
    if (text != null) e.textContent = text;
    return e;
  };
  const TOKEN_KLIC = "hspg-majitel-token", PLATNOST_KLIC = "hspg-majitel-platnost";
  const MENE_POHYBU = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const VYCHOZI_HLAS = "Připraven. Napište zadání a stiskněte Odeslat.";

  // Aplikace, které do cizí stránky vložit nejde (Claude Code, Claude Design, Claude Pro = chat claude.ai…) – otevírají se v nové kartě.
  const POMOCNICI = [
    ["Cl", "Claude Pro", "Chat, texty a dokumenty", "https://claude.ai/"],
    ["CC", "Claude Code", "Úpravy webu a kódu", "https://claude.ai/code"],
    ["CD", "Claude Design", "Návrhy stránek a grafiky", "https://claude.ai/design"],
    ["GPT", "ChatGPT", "Chat, texty a obrázky", "https://chatgpt.com/"],
    ["Ge", "Gemini", "Chat a služby Google", "https://gemini.google.com/"],
    ["Gr", "Grok", "Chat a dění na síti X", "https://grok.com/"],
    ["Px", "Perplexity", "Hledání s uvedením zdrojů", "https://www.perplexity.ai/"],
    ["Co", "Copilot", "Chat a Microsoft 365", "https://copilot.microsoft.com/"],
    ["Mi", "Mistral", "Evropská AI (Le Chat)", "https://chat.mistral.ai/"],
  ];
  const NAPOVEDA = {
    vsechny: () => "Každá zapnutá AI odpoví zvlášť a odpovědi porovnáte vedle sebe.",
    spoluprace: () => "Tři kroky za sebou: první AI napíše návrh, druhá zkontroluje pravdivost, třetí sepíše finální verzi (3 dotazy).",
    porada: () => {
      const n = zapnute().length;
      if (n < 2) return "Porada potřebuje aspoň dvě zapnuté AI.";
      return `Každá AI napíše návrh, pak si návrhy navzájem oponují a vybraná AI sepíše závěr (${2 * n + 1} dotazů – počítejte s vyšší útratou).`;
    },
  };

  // Úložiště prohlížeče je jen pohodlí – když nefunguje, centrum běží dál.
  const relace = {
    token() { try { return Number(sessionStorage.getItem(PLATNOST_KLIC) || 0) > Date.now() ? sessionStorage.getItem(TOKEN_KLIC) : null; } catch { return null; } },
    uloz(t, p) { try { sessionStorage.setItem(TOKEN_KLIC, t); sessionStorage.setItem(PLATNOST_KLIC, String(p)); } catch {} },
    smaz() { try { sessionStorage.removeItem(TOKEN_KLIC); sessionStorage.removeItem(PLATNOST_KLIC); } catch {} },
  };
  // Historie jen v sessionStorage (zmizí se zavřením karty a při odhlášení); stará kopie z localStorage se smaže.
  const historie = {
    get() { try { return JSON.parse(sessionStorage.getItem("hspgHistorie") || "[]"); } catch { return []; } },
    set(h) { try { sessionStorage.setItem("hspgHistorie", JSON.stringify(h)); } catch {} },
    smaz() { try { sessionStorage.removeItem("hspgHistorie"); localStorage.removeItem("hspgHistorie"); } catch {} },
  };
  try { localStorage.removeItem("hspgHistorie"); } catch {}

  let token = relace.token();
  // Prošlé přihlášení: token i historie zadání (často údaje zákazníků) se smažou hned při načtení.
  if (!token) { relace.smaz(); historie.smaz(); }
  let ai = [];                 // [{id, nazev, zapnuto, model, klic}]
  let stavServer = null;
  let konverzace = {};         // id -> [{role, text}]
  let preruseni = null;
  let casovac = null;          // doznění toku po dokončení

  const ZNACKY = { claude: "Cl", gpt: "GPT", gemini: "Ge", grok: "Gr", mistral: "Mi", deepseek: "DS", llama: "Ll", perplexity: "Px" };
  const jmeno = (id) => (ai.find((a) => a.id === id) || {}).nazev || id;
  const znacka = (id) => ZNACKY[id] || jmeno(id).slice(0, 2);
  const barva = (id) => AI.BARVY[id] || "#7addff";
  const zapnute = () => ai.filter((a) => a.zapnuto);
  const kc = (x) => (x < 10 ? x.toFixed(2) : String(Math.round(x))).replace(".", ",");
  const statText = (s) => `${s.vstup} + ${s.vystup} tokenů` + (s.kc ? ` · ≈ ${kc(s.kc)} Kč` : "");
  const zkrat = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

  /* ---------- Robot: jádro, uzly AI, spoje ---------- */
  const R = 36;                // poloměr oběžné dráhy v % šířky jádra
  let poloha = {};
  const najdi = (trida, id) => [...$("reaktor").querySelectorAll(trida)].find((x) => x.dataset.ai === id);

  function postavReaktor() {
    const r = $("reaktor");
    r.querySelectorAll(".uzel,.spoj,.most").forEach((e) => e.remove());
    poloha = {};
    const n = ai.length;
    ai.forEach((a, i) => {
      // Čtyři AI stojí v rozích (osy zůstanou volné), jiný počet začíná nahoře.
      const uhel = (n === 4 ? -135 : -90) + (360 / n) * i, rad = (uhel * Math.PI) / 180;
      poloha[a.id] = { x: 50 + R * Math.cos(rad), y: 50 + R * Math.sin(rad), uhel };
    });
    ai.forEach((a) => {
      const s = el("span", "spoj");
      s.dataset.ai = a.id;
      s.style.transform = `rotate(${poloha[a.id].uhel}deg)`;
      s.append(el("i"));
      r.append(s);
    });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = poloha[ai[i].id], B = poloha[ai[j].id];
      const m = el("span", "most");
      m.dataset.a = ai[i].id; m.dataset.b = ai[j].id;
      m.style.left = A.x + "%"; m.style.top = A.y + "%";
      m.style.width = Math.hypot(B.x - A.x, B.y - A.y) + "%";
      m.style.transform = `rotate(${(Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI}deg)`;
      m.append(el("i"));
      r.append(m);
    }
    ai.forEach((a) => {
      const u = el("span", "uzel" + (a.zapnuto ? "" : " vypnuto"));
      u.dataset.ai = a.id;
      u.style.left = poloha[a.id].x + "%"; u.style.top = poloha[a.id].y + "%";
      u.style.setProperty("--c", barva(a.id));
      const st = el("span", "stitek");
      st.append(el("span", "jmeno", a.nazev), el("span", "co", a.zapnuto ? "připraven" : "bez klíče"));
      u.append(el("span", "kotouc", znacka(a.id)), st);
      r.append(u);
    });
  }
  function uzel(id, stav, text) {
    const u = najdi(".uzel", id);
    if (!u) return;
    u.classList.remove("aktivni", "hotovo", "chyba");
    if (stav) u.classList.add(stav);
    if (text != null) u.querySelector(".co").textContent = text;
  }
  // Tok dat: od/komu je id AI nebo "jadro". zap = true | false | "oboje" (jen mezi dvěma AI).
  function tok(od, komu, zap) {
    if (od === "jadro" || komu === "jadro") {
      const s = najdi(".spoj", od === "jadro" ? komu : od);
      if (!s) return;
      s.classList.remove("tam", "zpet");
      if (zap) s.classList.add(od === "jadro" ? "tam" : "zpet");
      return;
    }
    if (od === komu) return;
    const m = [...$("reaktor").querySelectorAll(".most")].find((x) => (x.dataset.a === od && x.dataset.b === komu) || (x.dataset.a === komu && x.dataset.b === od));
    if (!m) return;
    m.classList.remove("tam", "zpet", "oboje");
    if (zap) m.classList.add(zap === "oboje" ? "oboje" : m.dataset.a === od ? "tam" : "zpet");
  }
  function ticho() {
    $("reaktor").querySelectorAll(".tam,.zpet,.oboje").forEach((x) => x.classList.remove("tam", "zpet", "oboje"));
  }
  function hlas(text, chyba) {
    const s = $("stav");
    s.textContent = text;
    s.classList.toggle("chyba", !!chyba);
  }
  // Stanice postupu: [[název, popisek], …]; bezi = index právě běžící (větší než poslední = vše hotovo).
  function linka(stanice, bezi) {
    const l = $("linka");
    l.textContent = "";
    stanice.forEach((s, i) => {
      const li = el("li", i < bezi ? "hotovo" : i === bezi ? "bezi" : "");
      li.append(el("b", "", s[0]));
      if (s[1]) li.append(el("small", "", s[1]));
      l.append(li);
    });
  }
  function klid(text) {
    clearTimeout(casovac);
    ticho();
    $("reaktor").classList.remove("pracuje");
    ai.forEach((a) => uzel(a.id, null, a.zapnuto ? "připraven" : "bez klíče"));
    linka([], 0);
    hlas(text || VYCHOZI_HLAS);
  }
  // Po dokončení: výsledek se „vrátí“ do jádra, pak spoje zhasnou.
  function dozni(id) {
    ticho();
    if (id) tok(id, "jadro", true);
    casovac = setTimeout(ticho, 1800);
  }

  /* ---------- Přihlášení ---------- */
  function odhlas(zprava) {
    relace.smaz(); token = null;
    // Historie obsahuje zadání (často údaje zákazníků) – po odhlášení v prohlížeči nezůstane.
    historie.smaz(); $("historie").textContent = "";
    if (preruseni) preruseni.abort();
    // Zadání a odpovědi v poli i na stránce také pryč.
    konverzace = {}; $("dotaz").value = ""; $("sloupce").textContent = ""; $("info").textContent = "";
    $("aplikace").classList.add("skryte"); $("prihlaseni").classList.remove("skryte");
    $("prihlaseniChyba").textContent = zprava || "";
  }
  async function nactiAplikaci() {
    stavServer = await AI.nactiStav(token);
    ai = stavServer.ai;
    $("prihlaseni").classList.add("skryte");
    $("aplikace").classList.remove("skryte");
    vykresli();
  }
  $("formPrihlaseni").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("prihlaseniChyba").textContent = "Ověřuji…";
    try {
      let zarizeni = "";
      try { zarizeni = localStorage.getItem("hspg-majitel-zarizeni") || ""; } catch {}
      const r = await fetch("/api/majitel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ heslo: $("heslo").value, zarizeni }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.token) throw new Error(j.chyba || "Přihlášení selhalo.");
      relace.uloz(j.token, j.platnost); token = j.token;
      // Známé zařízení majitele: výjimka z celkového zámku přihlášení (cizí pokusy ho nezamknou).
      try { if (j.zarizeni) localStorage.setItem("hspg-majitel-zarizeni", j.zarizeni); } catch {}
      $("heslo").value = ""; $("prihlaseniChyba").textContent = "";
      await nactiAplikaci();
    } catch (err) { $("prihlaseniChyba").textContent = err.message; }
  });
  $("odhlasit").addEventListener("click", () => odhlas());

  /* ---------- Vykreslení ---------- */
  function moznosti(sel, polozky, hodnota) {
    sel.textContent = "";
    for (const [v, t] of polozky) sel.append(new Option(t, v));
    if (hodnota != null && polozky.some(([v]) => v === hodnota)) sel.value = hodnota;
  }
  function vykresli() {
    $("cipy").textContent = "";
    for (const a of ai) {
      const c = el("span", "cip" + (a.zapnuto ? " on" : ""), a.zapnuto ? `${a.nazev} ✓` : `${a.nazev}: chybí ${a.klic}`);
      c.title = a.zapnuto ? a.model : `Vložte ${a.klic} do Netlify → Environment variables`;
      $("cipy").append(c);
    }
    const predvolba = new URLSearchParams(location.search).get("uloha");
    moznosti($("uloha"), Object.entries(ULOHY).map(([k, u]) => [k, u.nazev]), ULOHY[predvolba] ? predvolba : $("uloha").value || null);
    const role = AI.obsazeni(zapnute());
    const seznam = zapnute().map((a) => [a.id, a.nazev]);
    for (const [id, klic] of [["rAutor", "autor"], ["rKontrola", "kontrola"], ["rFinal", "final"]]) moznosti($(id), seznam, role[klic]);
    $("nastroje").textContent = "";
    for (const [zn, nazev, popis, url] of POMOCNICI) {
      const a = el("a", "nastroj");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      const t = el("span"); t.append(el("b", "", nazev), el("small", "", popis));
      a.append(el("span", "zn", zn), t, sipka());
      $("nastroje").append(a);
    }
    postavReaktor();
    vykresliSloupce();
    vykresliHistorii();
    if (!zapnute().length) { $("info").textContent = "Žádná AI nemá klíč. Vložte ho do Netlify a obnovte stránku."; hlas("Žádná AI nemá klíč – nemám komu práci předat.", true); }
  }
  function sipka() {
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    for (const [k, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"], ["focusable", "false"]]) s.setAttribute(k, v);
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M7 17 17 7M9 7h8v8");
    s.append(p);
    return s;
  }
  function karta(id, nazev, model, jeAI) {
    const s = el("article", "panel sloupec");
    s.id = "s-" + id;
    s.style.setProperty("--c", barva(id));
    const h = el("h2");
    if (jeAI) h.append(el("span", "kotouc", znacka(id)));
    h.append(nazev, el("span", "model", model));
    const v = el("div", "vystup prazdne", "Zatím bez odpovědi.");
    v.setAttribute("aria-live", "polite");
    const pata = el("div", "pata");
    const kop = el("button", "", "Kopírovat"); kop.type = "button";
    const stat = el("span"); stat.dataset.stat = "";
    kop.addEventListener("click", () => { if (navigator.clipboard) navigator.clipboard.writeText(s.dataset.final || v.innerText); });
    pata.append(kop, stat);
    s.append(h, v, pata);
    $("sloupce").append(s);
    return s;
  }
  function vykresliSloupce() {
    konverzace = {}; // doplňující dotaz smí navazovat jen na to, co je ve sloupcích vidět
    const rezim = $("rezim").value;
    $("role").classList.toggle("vidno", rezim !== "vsechny");
    $("role").dataset.rezim = rezim;
    $("rFinalPopis").textContent = rezim === "porada" ? "Závěr sepíše" : "3. Spojí finální verzi";
    $("napoveda").textContent = NAPOVEDA[rezim]();
    $("sloupce").textContent = "";
    $("sloupce").className = "sloupce" + (rezim === "vsechny" ? " pocet-" + zapnute().length : "");
    if (rezim === "vsechny") {
      for (const a of zapnute()) {
        const s = karta(a.id, a.nazev, a.model, true);
        const f = el("form", "doplnek");
        const inp = el("input"); inp.setAttribute("aria-label", `Doplňující dotaz jen pro ${a.nazev}`); inp.placeholder = `Doplňující dotaz jen pro ${a.nazev}`;
        const b = el("button", "", "→"); b.type = "submit"; b.setAttribute("aria-label", `Odeslat doplňující dotaz pro ${a.nazev}`);
        f.append(inp, b);
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          if (inp.value.trim() && !preruseni) { spust([a.id], inp.value.trim(), true); inp.value = ""; }
        });
        s.append(f);
      }
    } else {
      const s = karta(rezim, rezim === "porada" ? "Porada AI" : "Spolupráce AI", rezim === "porada" ? "návrhy → oponentura → závěr" : "návrh → kontrola → finál");
      s.classList.add("vlaknova");
      s.querySelector(".pata button").textContent = "Kopírovat finální verzi";
    }
    klid();
  }
  $("rezim").addEventListener("change", vykresliSloupce);
  $("vycistit").addEventListener("click", () => {
    if (preruseni) preruseni.abort();
    konverzace = {}; vykresliSloupce(); $("info").textContent = "";
  });

  function zacni() {
    clearTimeout(casovac);
    preruseni = new AbortController();
    $("odeslat").disabled = true; $("zastavit").disabled = false;
    // Za běhu nejde přepnout režim, úlohu ani role (překreslení by skrylo běžící placená volání).
    for (const id of ["rezim", "uloha", "rAutor", "rKontrola", "rFinal"]) $(id).disabled = true;
    ticho();
    ai.forEach((a) => uzel(a.id, null, a.zapnuto ? "čeká" : "bez klíče"));
    $("reaktor").classList.add("pracuje");
    if (window.matchMedia && matchMedia("(max-width: 1023px)").matches) $("reaktor").parentElement.scrollIntoView({ behavior: MENE_POHYBU ? "auto" : "smooth", block: "start" });
    return preruseni.signal;
  }
  function skonci() {
    $("odeslat").disabled = false; $("zastavit").disabled = true;
    for (const id of ["rezim", "uloha", "rAutor", "rKontrola", "rFinal"]) $(id).disabled = false;
    preruseni = null;
    $("reaktor").classList.remove("pracuje");
    obnovSpotrebu();
  }
  $("zastavit").addEventListener("click", () => { if (preruseni) preruseni.abort(); });

  const zpravaChyby = (e) => {
    if (e.status === 401) { odhlas("Přihlášení vypršelo. Přihlaste se znovu."); return "Přihlášení vypršelo."; }
    return e.name === "AbortError" ? "Zastaveno." : e.message;
  };

  /* ---------- Vlákno: zprávy, které si AI předávají ---------- */
  function vlakno(s) {
    const v = s.querySelector(".vystup");
    v.textContent = ""; v.classList.remove("prazdne", "chyba");
    const ol = el("ol", "vlakno");
    v.append(ol);
    return ol;
  }
  // Když majitel sleduje konec vlákna, stránka se posouvá s přibývajícím textem; když odroluje výš, necháme ho číst.
  function sDrzenim(ol, zmena) {
    const sleduje = ol.getBoundingClientRect().bottom <= window.innerHeight + 48;
    zmena();
    if (!sleduje) return;
    const pres = ol.getBoundingClientRect().bottom - window.innerHeight + 24;
    if (pres > 0) window.scrollBy(0, pres);
  }
  // o: { od, komu, role, final, robot } – od je id AI; robot = zpráva od H-BOT (zadání).
  function zprava(ol, o) {
    const li = el("li", "zprava" + (o.final ? " final" : "") + (o.robot ? " robot" : ""));
    li.style.setProperty("--c", o.robot ? "#eef2f5" : barva(o.od));
    const k = el("span", "kotouc", o.robot ? null : znacka(o.od));
    if (o.robot) { const im = el("img"); im.src = "/assets/v/logo-160.webp"; im.alt = ""; im.width = 36; im.height = 36; k.append(im); }
    const telo = el("div", "zp-telo"), hlava = el("div", "zp-hlava"), text = el("div", "zp-text"), pata = el("div", "zp-pata");
    hlava.append(el("b", "", o.robot ? "H-BOT" : jmeno(o.od)), el("span", "zp-komu", "→ " + o.komu), el("span", "zp-role", o.role));
    telo.append(hlava, text, pata);
    li.append(k, telo);
    sDrzenim(ol, () => ol.append(li));
    return {
      text(t) { sDrzenim(ol, () => { text.textContent = t; }); },
      hotovo(stat) { if (stat) pata.textContent = statText(stat); },
      chyba(t) { text.className = "zp-text chyba"; text.textContent = t; },
    };
  }
  const zadaniZprava = (ol, komu, dotaz) =>
    zprava(ol, { robot: true, komu, role: "Zadání" }).text(`„${zkrat(dotaz.replace(/\s+/g, " "), 220)}“\nS každým zadáním posílám pravidla pravdivosti HSPG.`);

  /* ---------- Režim 1: všechny najednou ---------- */
  async function spust(ids, dotaz, doplnek = false) {
    const signal = zacni();
    const pokyn = ULOHY[$("uloha").value].pokyn;
    $("info").textContent = "Pracuji…";
    const stanice = [["Zadání"], ["Odpovědi", ids.length === 1 ? jmeno(ids[0]) : `${ids.length} AI současně`], ["Hotovo"]];
    linka(stanice, 1);
    hlas(ids.length === 1 ? `${jmeno(ids[0])} odpovídá na doplňující dotaz.` : `Zadání jsem předal ${ids.length} AI. Odpovídají současně, každá zvlášť.`);
    const vysledky = {};
    let ok = 0;
    await Promise.all(ids.map(async (id) => {
      const s = $("s-" + id); const v = s.querySelector(".vystup");
      if (!doplnek || !konverzace[id]) konverzace[id] = [];
      konverzace[id].push({ role: "user", text: dotaz });
      if (!doplnek) v.textContent = "";
      v.classList.remove("prazdne", "chyba");
      if (doplnek) v.append(el("div", "krok", "Doplňující dotaz: " + dotaz));
      const cil = el("div"); v.append(cil);
      uzel(id, "aktivni", "píše…"); tok("jadro", id, true);
      try {
        const { text, stat } = await AI.zavolej({ ai: id, zpravy: konverzace[id], pokyn, token, signal, naText: (t) => { cil.textContent = t; v.scrollTop = v.scrollHeight; } });
        konverzace[id].push({ role: "assistant", text: text || "(prázdná odpověď)" });
        vysledky[id] = text;
        s.querySelector("[data-stat]").textContent = statText(stat);
        ok++;
        uzel(id, "hotovo", "hotovo");
      } catch (e) {
        konverzace[id].pop();
        cil.className = "chyba"; cil.textContent = zpravaChyby(e);
        uzel(id, "chyba", e.name === "AbortError" ? "zastaveno" : "chyba");
      }
      tok("jadro", id, false);
    }));
    ulozHistorii({ rezim: "vsechny", uloha: $("uloha").value, dotaz, vysledky });
    linka(stanice, 3);
    $("info").textContent = "Hotovo.";
    hlas(signal.aborted ? "Zastaveno." : ok === ids.length ? (ok === 1 ? `Hotovo. ${jmeno(ids[0])} odpověděl.` : `Hotovo. Odpověděly všechny AI (${ok}).`) : `Hotovo. Odpovědělo ${ok} z ${ids.length} AI.`, !ok && !signal.aborted);
    skonci();
  }

  /* ---------- Režim 2: spolupráce (návrh → kontrola → finál) ---------- */
  async function spolupracuj(dotaz) {
    const signal = zacni();
    const pokyn = ULOHY[$("uloha").value].pokyn;
    const role = { autor: $("rAutor").value, kontrola: $("rKontrola").value, final: $("rFinal").value };
    const poradi = [role.autor, role.kontrola, role.final];
    const s = $("s-spoluprace"); const ol = vlakno(s);
    const stanice = [["Zadání"], ["Návrh", jmeno(role.autor)], ["Kontrola", jmeno(role.kontrola)], ["Finál", jmeno(role.final)], ["Hotovo"]];
    const CINNOST = ["píše návrh", "kontroluje pravdivost návrhu", "sepisuje finální verzi"], KRATCE = ["píše návrh…", "kontroluje…", "píše finál…"];
    zadaniZprava(ol, jmeno(role.autor), dotaz);
    let kroky = {};
    let posledni = null;
    let posledniZprava = null;
    try {
      kroky = await AI.spolupracuj({
        autor: role.autor, kontrola: role.kontrola, final: role.final, dotaz, pokyn, token, signal,
        naKrok: (i, nazev, id) => {
          $("info").textContent = `${i}/3 ${nazev.toLowerCase()}…`;
          ticho();
          if (posledni) uzel(posledni, "hotovo", "předáno");
          if (i === 1) tok("jadro", id, true); else if (posledni === id) tok("jadro", id, true); else tok(posledni, id, true);
          uzel(id, "aktivni", KRATCE[i - 1]);
          linka(stanice, i);
          hlas(`Krok ${i} ze 3: ${jmeno(id)} ${CINNOST[i - 1]}.`);
          posledni = id;
          const z = zprava(ol, { od: id, komu: i < 3 ? jmeno(poradi[i]) : "vám", role: nazev, final: i === 3 });
          posledniZprava = z;
          return (t) => { z.text(t); };
        },
      });
      s.dataset.final = kroky.final;
      s.querySelector("[data-stat]").textContent = "Kopírovat zkopíruje jen finální verzi.";
      uzel(role.final, "hotovo", "hotovo");
      linka(stanice, 5);
      dozni(role.final);
      $("info").textContent = "Hotovo.";
      hlas(`Hotovo. Návrh napsal ${jmeno(role.autor)}, pravdivost zkontroloval ${jmeno(role.kontrola)}, finální verzi sepsal ${jmeno(role.final)}.`);
    } catch (e) {
      const t = zpravaChyby(e);
      ticho();
      if (posledni) uzel(posledni, "chyba", e.name === "AbortError" ? "zastaveno" : "chyba");
      if (posledniZprava) posledniZprava.chyba(t); // krok, který selhal, nesmí dál „psát“
      ol.parentElement.append(el("div", "chyba", t));
      $("info").textContent = "";
      hlas(e.name === "AbortError" ? "Zastaveno." : "Spolupráce se nedokončila: " + t, e.name !== "AbortError");
    }
    ulozHistorii({ rezim: "spoluprace", uloha: $("uloha").value, dotaz, vysledky: kroky, role });
    skonci();
  }

  /* ---------- Režim 3: porada (návrhy → vzájemná oponentura → závěr) ---------- */
  async function porada(dotaz) {
    const ucast = zapnute().map((a) => a.id);
    if (ucast.length < 2) { $("info").textContent = "Porada potřebuje aspoň dvě zapnuté AI."; return; }
    const signal = zacni();
    const pokyn = ULOHY[$("uloha").value].pokyn;
    const zaver = $("rFinal").value;
    const s = $("s-porada"); const ol = vlakno(s);
    const stanice = [["Zadání"], ["Návrhy", `${ucast.length} AI`], ["Oponentura", "navzájem"], ["Závěr", jmeno(zaver)], ["Hotovo"]];
    const soucet = { vstup: 0, vystup: 0, kc: 0, dotazu: 0 };
    const pricti = (st) => { soucet.vstup += st.vstup || 0; soucet.vystup += st.vystup || 0; soucet.kc += st.kc || 0; soucet.dotazu++; };
    const kolo = (t) => ol.append(el("li", "kolo", t));
    const vysledky = {};
    let chybaPorady = null;
    // Jedno volání jedné AI se zprávou ve vlákně; vrací text, nebo null při chybě.
    const volej = async (id, komu, roleNazev, zpravy, pokynKola, final, maxTokenu) => {
      const z = zprava(ol, { od: id, komu, role: roleNazev, final });
      try {
        const { text, stat } = await AI.zavolej({ ai: id, zpravy, pokyn: pokynKola, token, signal, maxTokenu, naText: (t) => z.text(t) });
        z.text(text || "(prázdná odpověď)"); z.hotovo(stat); pricti(stat);
        return text || null;
      } catch (e) {
        z.chyba(zpravaChyby(e));
        uzel(id, "chyba", e.name === "AbortError" ? "zastaveno" : "chyba");
        // Zastavení, odhlášení, vyčerpaný rozpočet (402) a příliš dlouhý vstup (413) poradu ukončí –
        // další kola by jen platila za volání, která rozpočet nebo server stejně odmítne.
        if (e.name === "AbortError" || [401, 402, 413].includes(e.status)) chybaPorady = e;
        return null;
      }
    };
    try {
      zadaniZprava(ol, "všem AI", dotaz);
      // Kolo 1 – každá AI napíše vlastní návrh.
      $("info").textContent = "1/3 návrhy…"; linka(stanice, 1);
      hlas(`Kolo 1 ze 3: ${ucast.length} AI píší každá svůj návrh.`);
      kolo("Kolo 1 · návrhy");
      ucast.forEach((id) => { uzel(id, "aktivni", "píše návrh…"); tok("jadro", id, true); });
      const navrhy = {};
      await Promise.all(ucast.map(async (id) => {
        const t = await volej(id, "všem", "Návrh", [{ role: "user", text: dotaz }], pokyn, false);
        tok("jadro", id, false);
        if (t) { navrhy[id] = t; uzel(id, "hotovo", "návrh hotov"); }
      }));
      if (chybaPorady) throw chybaPorady;
      const zive = ucast.filter((id) => navrhy[id]);
      if (!zive.length) throw new Error("Žádná AI nenapsala návrh.");
      // Jediný návrh = porada neproběhla; zbytečný placený závěr se nevolá.
      if (zive.length === 1) {
        vysledky.final = navrhy[zive[0]]; vysledky.pisar = zive[0];
        s.dataset.final = navrhy[zive[0]];
        throw new Error(`Návrh napsala jen ${jmeno(zive[0])} – porada neproběhla, výsledek je její návrh.`);
      }
      // Vstup serveru má strop 60 000 znaků: návrhy (a připomínky) se do dalších kol poměrně zkrátí.
      const naKus = Math.max(1500, Math.floor((54000 - dotaz.length) / (2 * zive.length)));
      const zkrat = (t) => (t.length > naKus ? t.slice(0, naKus) + "\n[zkráceno]" : t);
      // Kolo 2 – každá AI čte návrhy ostatních a píše připomínky.
      const pripominky = {};
      if (zive.length > 1) {
        $("info").textContent = "2/3 oponentura…"; linka(stanice, 2);
        hlas(`Kolo 2 ze 3: AI si čtou návrhy navzájem a píší připomínky.`);
        kolo("Kolo 2 · vzájemná oponentura");
        ticho();
        zive.forEach((a, i) => zive.slice(i + 1).forEach((b) => tok(a, b, "oboje")));
        zive.forEach((id) => uzel(id, "aktivni", "oponuje…"));
        await Promise.all(zive.map(async (id) => {
          const ostatni = zive.filter((x) => x !== id);
          const text = "ZADÁNÍ (jediný zdroj faktů):\n" + dotaz + "\n\nTVŮJ NÁVRH:\n" + zkrat(navrhy[id]) + "\n\nNÁVRHY OSTATNÍCH:\n" +
            ostatni.map((x) => `--- ${jmeno(x)} ---\n${zkrat(navrhy[x])}`).join("\n\n") +
            "\n\nPorovnej návrhy se zadáním a s pravidly pravdivosti. Napiš stručně v bodech (nejvýš 120 slov): 1) co je v kterém návrhu vymyšlené nebo nepodložené, 2) co z návrhů ostatních převzít, 3) co chybí. Nepiš novou verzi.";
          const t = await volej(id, ostatni.map(jmeno).join(", "), "Připomínky", [{ role: "user", text }], "Jsi přísný oponent. Hlídáš pravdivost a srozumitelnost.", false, 1500); // krátké připomínky = malá rezervace rozpočtu
          if (t) { pripominky[id] = t; uzel(id, "hotovo", "oponoval"); }
        }));
        if (chybaPorady) throw chybaPorady;
      }
      // Kolo 3 – vybraná AI sepíše závěr ze všech návrhů a připomínek.
      const pisar = navrhy[zaver] ? zaver : zive[0];
      $("info").textContent = "3/3 závěr…"; linka(stanice, 3);
      hlas(`Kolo 3 ze 3: ${jmeno(pisar)} sepisuje závěr ze všech návrhů a připomínek.`);
      kolo("Kolo 3 · závěr");
      ticho();
      zive.filter((x) => x !== pisar).forEach((x) => tok(x, pisar, true));
      if (zive.length === 1) tok("jadro", pisar, true);
      uzel(pisar, "aktivni", "píše závěr…");
      const podklady = "ZADÁNÍ:\n" + dotaz + "\n\nNÁVRHY:\n" + zive.map((x) => `--- ${jmeno(x)} ---\n${zkrat(navrhy[x])}`).join("\n\n") +
        (Object.keys(pripominky).length ? "\n\nPŘIPOMÍNKY Z PORADY:\n" + Object.keys(pripominky).map((x) => `--- ${jmeno(x)} ---\n${zkrat(pripominky[x])}`).join("\n\n") : "") +
        "\n\nNapiš finální verzi, která vezme z návrhů to nejlepší a zapracuje všechny oprávněné připomínky. Vrať jen hotový text.";
      const final = await volej(pisar, "vám", "Finální verze", [{ role: "user", text: podklady }], pokyn, true);
      if (chybaPorady) throw chybaPorady;
      if (!final) throw new Error("Závěr se nepodařilo sepsat.");
      vysledky.final = final; vysledky.pisar = pisar;
      s.dataset.final = final;
      uzel(pisar, "hotovo", "hotovo");
      linka(stanice, 5);
      dozni(pisar);
      $("info").textContent = "Hotovo.";
      hlas(`Hotovo. Poradilo se ${zive.length} AI, závěr sepsal ${jmeno(pisar)}.`);
    } catch (e) {
      ticho();
      $("info").textContent = "";
      hlas(e.name === "AbortError" ? "Zastaveno." : "Porada se nedokončila: " + (e.status === 401 ? "přihlášení vypršelo." : e.message), e.name !== "AbortError");
    }
    s.querySelector("[data-stat]").textContent = soucet.dotazu ? `Porada: ${soucet.dotazu} dotazů · ${statText(soucet)}` : "";
    ulozHistorii({ rezim: "porada", uloha: $("uloha").value, dotaz, vysledky: { final: vysledky.final }, role: { final: vysledky.pisar } });
    skonci();
  }

  $("odeslat").addEventListener("click", () => {
    const dotaz = $("dotaz").value.trim();
    if (!dotaz) { $("info").textContent = "Napište zadání."; $("dotaz").focus(); return; }
    if (!zapnute().length || preruseni) return;
    const prvni = $("sloupce").querySelector(".sloupec");
    if (prvni) delete prvni.dataset.final;
    const rezim = $("rezim").value;
    if (rezim === "spoluprace") spolupracuj(dotaz);
    else if (rezim === "porada") porada(dotaz);
    else spust(zapnute().map((a) => a.id), dotaz);
  });
  // Ctrl/⌘ + Enter v poli zadání odešle.
  $("dotaz").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("odeslat").click(); } });

  /* ---------- Historie a spotřeba ---------- */
  function ulozHistorii(zaznam) {
    if (!token) return; // po automatickém odhlášení (401) se zadání neukládá
    const h = historie.get();
    h.unshift({ ...zaznam, cas: new Date().toISOString() });
    historie.set(h.slice(0, 30));
  }
  async function obnovSpotrebu() {
    if (!token) return;
    try { stavServer = await AI.nactiStav(token); } catch {}
    vykresliHistorii();
  }
  function radek(bunky, tag) {
    const tr = el("tr");
    for (const b of bunky) { const c = el(tag || "td", "", b.text != null ? b.text : b); if (b.colSpan) c.colSpan = b.colSpan; tr.append(c); }
    return tr;
  }
  function vykresliHistorii() {
    const u = stavServer && stavServer.utrata;
    // Útrata v záhlaví
    const box = $("rozpocet");
    if (u && stavServer.limitKc) {
      const podil = Math.min(1, u.celkemKc / stavServer.limitKc);
      box.hidden = false;
      $("rozpocetCisla").textContent = `≈ ${kc(u.celkemKc)} z ${stavServer.limitKc} Kč`;
      const p = $("rozpocetPruh");
      p.firstElementChild.style.width = Math.round(podil * 100) + "%";
      p.classList.toggle("plny", podil >= 0.8);
      box.title = stavServer.kredity ? `≈ ${stavServer.kredity.utraceno} z ${stavServer.kredity.limit} kreditů Netlify` : "";
    } else box.hidden = true;
    // Tabulka spotřeby
    const t = $("spotreba");
    t.textContent = "";
    t.append(radek(["Toto období", "Dotazů", "Tokeny vstup", "Tokeny výstup", "≈ Kč"], "th"));
    let nejake = false;
    for (const a of ai) {
      const x = u && u.ai && u.ai[a.id];
      if (!x) continue;
      nejake = true;
      t.append(radek([a.nazev, String(x.dotazu), x.vstup.toLocaleString("cs"), x.vystup.toLocaleString("cs"), x.kc.toFixed(1).replace(".", ",")]));
    }
    if (!nejake) { const tr = radek([{ text: "Zatím nic.", colSpan: 5 }]); tr.firstElementChild.className = "prazdne"; t.append(tr); }
    if (u) t.append(radek([{ text: "Celkem / limit", colSpan: 4 }, `${Math.round(u.celkemKc)} / ${stavServer.limitKc} Kč`], "th"));
    // Seznam minulých zadání
    const seznam = $("historie");
    seznam.textContent = "";
    historie.get().forEach((z) => {
      const li = el("li");
      const popis = el("span", "", `${new Date(z.cas).toLocaleString("cs")} · ${(ULOHY[z.uloha] || {}).nazev || ""} · ${z.dotaz}`);
      const b = el("button", "", "Otevřít"); b.type = "button";
      b.addEventListener("click", () => otevriZaznam(z));
      li.append(popis, b);
      seznam.append(li);
    });
  }
  function otevriZaznam(z) {
    if (preruseni) return;
    $("dotaz").value = z.dotaz;
    if (ULOHY[z.uloha]) $("uloha").value = z.uloha;
    $("rezim").value = z.rezim;
    vykresliSloupce();
    const v = z.vysledky || {};
    if (z.rezim === "vsechny") {
      for (const [id, text] of Object.entries(v)) {
        const s = $("s-" + id);
        if (!s) continue;
        const vy = s.querySelector(".vystup"); vy.classList.remove("prazdne"); vy.textContent = text;
        konverzace[id] = [{ role: "user", text: z.dotaz }, { role: "assistant", text }]; // doplněk navazuje na otevřený záznam
      }
    } else {
      const s = $("s-" + z.rezim);
      if (s) {
        const ol = vlakno(s);
        const r = z.role || {};
        // Starší záznamy nemají uložené obsazení rolí – zpráva se pak ukáže bez jména AI (jako od H-BOT).
        const pridej = (klic, kdo, komu, role, final) => {
          if (!v[klic]) return;
          zprava(ol, kdo ? { od: kdo, komu, role, final } : { robot: true, komu, role, final }).text(v[klic]);
        };
        if (z.rezim === "spoluprace") {
          pridej("navrh", r.autor, r.kontrola ? jmeno(r.kontrola) : "kontrole", "Návrh");
          pridej("kontrola", r.kontrola, r.final ? jmeno(r.final) : "finální verzi", "Kontrola pravdivosti");
        }
        pridej("final", r.final, "vám", "Finální verze", true);
        if (v.final) s.dataset.final = v.final;
      }
    }
    hlas("Otevřel jsem uložené zadání z historie.");
    scrollTo({ top: 0, behavior: MENE_POHYBU ? "auto" : "smooth" });
  }

  if (token) nactiAplikaci().catch((e) => odhlas(e.status === 401 ? "Přihlášení vypršelo." : e.message));
})();
