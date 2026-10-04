/* AI centrum HSPG – řízení stránky /ai-centrum/ („Vše ve tvých rukách“).
   Mluví jen s vlastními adresami webu: /api/majitel, /api/ai-stav a /api/ai (přes /assets/ai-klient.js),
   sekce H-WEATHER CONTROL & plánovač navíc s /api/pocasi-prace, /api/kupon a /api/planovac (až na vyžádání).
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
    // H-WEATHER CONTROL: zakázky, rezervace, tajný odkaz kalendáře a kupony také pryč, běžící požadavky se zruší.
    hwcVycisti();
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

  /* ---------- H-WEATHER CONTROL & plánovač ----------
     Počasí pro zakázku, přehled zakázek a rezervací, tajný odkaz na kalendář s varováním a dárkové kupony.
     Při načtení stránky ani po přihlášení se nic nestahuje – data až po otevření sekce a kliknutí.
     Každý požadavek má limit 15 s; 401 = odhlášení, 503 = vlídná zpráva a „Zkusit znovu“ (jen na kliknutí,
     nikdy automaticky – žádné smyčky požadavků). Data ze serveru jdou do stránky jen přes textContent,
     odkazy jen s https://. Hodnocení počasí je interní pomůcka pro majitele, zákazníci ho nevidí. */
  const HWC_LIMIT_MS = 15000;
  const NB = " ";
  const HWC_TABY = ["pocasi", "zakazky", "kalendar", "kupony"];
  const UROVEN = { vhodne: ["✅", "vhodné"], riziko: ["⚠️", "riziko"], nevhodne: ["⛔", "nevhodné"], neznamo: ["❔", "bez předpovědi"] };
  const SPOLEHLIVOST = { vysoka: "vysoká", stredni: "střední", nizka: "nízká" };
  const DNY_TYDNE = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
  // Záloha pro text kuponu, když /api/planovac neodpoví (zdroj pravdy: content/planovac.json → kupon).
  const KUPON_ZALOHA = { nazev: "Dárkový kupon pro sousedy a známé", nabidka: "1 litr impregnace H-STONE zdarma" };
  const hwc = { tab: "pocasi", rizeni: new Set(), navrhy: new Map(), navrhCasovac: null, navrhRizeni: null, pocasiRizeni: null, kuponyNacteny: false, nabidka: null, nabidkaData: null, typy: null };

  const cislo = (x, des = 1) => Number(x).toLocaleString("cs-CZ", { maximumFractionDigits: des });
  const jednotka = (x, j, des = 1) => (x == null ? "—" : `${cislo(x, des)}${NB}${j}`);
  // Nezlomitelná mezera po jednopísmenných předložkách a spojkách a mezi číslem a slovem (texty z JSON).
  const typo = (s) => String(s || "").replace(/(^|[\s(])([vkszaiouVKSZAIOU]) /g, `$1$2${NB}`).replace(/(\d) (?=[\p{L}%°])/gu, `$1${NB}`);
  // Kalendářní den v Česku (ISO RRRR-MM-DD) pro okamžik t – nezávisle na časovém pásmu prohlížeče.
  const denPraha = (t = Date.now()) => {
    try { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date(t)); } catch { return new Date(t).toISOString().slice(0, 10); }
  };
  const dnesPraha = () => denPraha();
  const rozdilDni = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const datumCz = (iso, rok = true) => {
    const [r, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
    return d ? `${d}.${NB}${m}.` + (rok ? `${NB}${r}` : "") : "—";
  };
  const denCz = (iso) => {
    const [r, m, d] = String(iso).split("-").map(Number);
    return `${DNY_TYDNE[new Date(Date.UTC(r, m - 1, d)).getUTCDay()] || ""} ${datumCz(iso, false)}`.trim();
  };
  const relativne = (iso) => ({ 0: "dnes", 1: "zítra", 2: "pozítří" })[rozdilDni(dnesPraha(), iso)] || "";
  const casCz = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "—";
    return new Date(t).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\. /g, "." + NB);
  };
  const jeHttps = (url) => typeof url === "string" && /^https:\/\/[^\s"'<>\\]+$/.test(url);
  function odkazEl(url, text) {
    if (!jeHttps(url)) return document.createTextNode(text || String(url || ""));
    const a = el("a", "", text || url);
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    return a;
  }
  // Text s adresami https:// → uzly, adresy jako odkazy (tečka na konci věty do odkazu nepatří).
  function sOdkazy(text) {
    const f = document.createDocumentFragment();
    String(text || "").split(/(https:\/\/[^\s,;()]+)/).forEach((kus, i) => {
      if (!kus) return;
      if (i % 2 === 0) { f.append(kus); return; }
      const [, url, tecky] = kus.match(/^(.*?)(\.*)$/);
      f.append(odkazEl(url), tecky);
    });
    return f;
  }
  const popisMista = (m) => (m.castObce ? `${m.obec} – část obce ${m.castObce} (okres ${m.okres})` : `${m.obec} (okres ${m.okres}${m.pou ? `, ${m.pou}` : ""})`);
  const nabidkaKuponu = () => (hwc.nabidkaData && hwc.nabidkaData.kupon) || KUPON_ZALOHA;

  // Stavový řádek (role=status). Tlačítko „Zkusit znovu“ leží vedle něj, ne uvnitř živé oblasti.
  function hwcStav(id, text, { chyba = false, znovu = null } = {}) {
    const p = $(id);
    p.textContent = text || "";
    p.classList.toggle("chyba", !!chyba);
    p.parentElement.querySelectorAll(".hwc-znovu").forEach((b) => b.remove());
    if (znovu) {
      const b = el("button", "hwc-znovu", "Zkusit znovu");
      b.type = "button";
      b.addEventListener("click", () => { b.remove(); znovu(); });
      p.parentElement.append(b);
    }
  }
  function hwcChyba(id, e, znovu) {
    if (e.status === 401 || e.name === "AbortError") return; // odhlášení / zrušeno novějším požadavkem
    hwcStav(id, e.message, { chyba: true, znovu: e.opakovat ? znovu : null });
  }

  // Jeden požadavek: Bearer token (kromě veřejných adres), limit 15 s, 401 → odhlášení, 503 → zkusit znovu.
  async function hwcVolej(url, { metoda = "GET", telo, verejne = false, signal } = {}) {
    if (!verejne && !token) throw Object.assign(new Error("Přihlášení vypršelo."), { status: 401 });
    const ac = new AbortController();
    let vyprselo = false;
    const limit = setTimeout(() => { vyprselo = true; ac.abort(); }, HWC_LIMIT_MS);
    const zrus = () => ac.abort();
    if (signal) { if (signal.aborted) ac.abort(); else signal.addEventListener("abort", zrus); }
    hwc.rizeni.add(ac);
    try {
      const hlavicky = {};
      if (!verejne) hlavicky.authorization = "Bearer " + token;
      if (telo !== undefined) hlavicky["content-type"] = "application/json";
      const r = await fetch(url, { method: metoda, headers: hlavicky, body: telo === undefined ? undefined : JSON.stringify(telo), cache: verejne ? "default" : "no-store", signal: ac.signal });
      let d = null;
      try { d = await r.json(); } catch (e) { if (ac.signal.aborted) throw e; }
      if (r.status === 401 && !verejne) {
        odhlas("Přihlášení vypršelo. Přihlaste se znovu.");
        throw Object.assign(new Error("Přihlášení vypršelo."), { status: 401 });
      }
      if (r.status === 503) throw Object.assign(new Error((d && d.chyba) || "Služba je teď dočasně nedostupná. Zkuste to prosím za chvíli."), { status: 503, opakovat: true });
      if (!d || typeof d !== "object") throw Object.assign(new Error(`Server vrátil neočekávanou odpověď (HTTP ${r.status}). Je funkce nasazená?`), { status: r.status || 1, opakovat: r.status >= 500 });
      if (!r.ok) throw Object.assign(new Error(d.chyba || `Chyba serveru (HTTP ${r.status}).`), { status: r.status, opakovat: r.status >= 500 });
      return d;
    } catch (e) {
      if (e.status) throw e;
      if (vyprselo) throw Object.assign(new Error(`Server neodpověděl do ${HWC_LIMIT_MS / 1000}${NB}s.`), { opakovat: true });
      if (ac.signal.aborted) throw Object.assign(new Error("Zrušeno."), { name: "AbortError" });
      throw Object.assign(new Error("Spojení se serverem selhalo – zkontrolujte připojení."), { opakovat: true });
    } finally {
      clearTimeout(limit);
      hwc.rizeni.delete(ac);
      if (signal) signal.removeEventListener("abort", zrus);
    }
  }

  // Veřejné údaje plánovače (sleva, kupon, „potvrzeno“) – jednou za otevření, CDN je drží 10 min.
  function dejNabidku() {
    if (!hwc.nabidka) {
      hwc.nabidka = hwcVolej("/api/planovac", { verejne: true }).then(
        (d) => (hwc.nabidkaData = d && d.kupon ? d : null),
        () => { hwc.nabidka = null; return null; },
      );
    }
    return hwc.nabidka;
  }

  /* Otevření sekce a záložky (role tablist: šipky, Home, End). */
  function hwcPrepni(id, fokus) {
    hwc.tab = id;
    for (const t of HWC_TABY) {
      const on = t === id, tab = $("hwcTab-" + t);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      $("hwcPanel-" + t).hidden = !on;
    }
    if (fokus) $("hwcTab-" + id).focus();
    if (id === "kupony" && !hwc.kuponyNacteny && !$("hwcObsah").hidden) nactiKupony();
  }
  $("hwcOtevrit").addEventListener("click", () => {
    const otevrit = $("hwcObsah").hidden;
    $("hwcObsah").hidden = !otevrit;
    $("hwcOtevrit").setAttribute("aria-expanded", String(otevrit));
    $("hwcOtevrit").textContent = otevrit ? "Skrýt sekci" : "Otevřít sekci";
    if (otevrit) hwcPrepni(hwc.tab, false);
  });
  HWC_TABY.forEach((t, i) => {
    $("hwcTab-" + t).addEventListener("click", () => hwcPrepni(t, false));
    $("hwcTab-" + t).addEventListener("keydown", (e) => {
      const cil = { ArrowRight: HWC_TABY[(i + 1) % HWC_TABY.length], ArrowLeft: HWC_TABY[(i + HWC_TABY.length - 1) % HWC_TABY.length], Home: HWC_TABY[0], End: HWC_TABY[HWC_TABY.length - 1] }[e.key];
      if (cil) { e.preventDefault(); hwcPrepni(cil, true); }
    });
  });

  /* Společné kousky vykreslení: hodnocení dne, důvody, hodnoty, upozornění, zdroj. */
  function hodnoceni(v) {
    const u = UROVEN[v.uroven] ? v.uroven : "neznamo";
    const p = el("p", "hwc-uroven");
    const ikona = el("span", "hwc-ikona", UROVEN[u][0]);
    ikona.setAttribute("aria-hidden", "true");
    p.append(ikona, " ", el("b", "", UROVEN[u][1]));
    return p;
  }
  function duvody(v) {
    const ul = el("ul", "hwc-duvody");
    for (const x of Array.isArray(v.duvody) ? v.duvody : []) ul.append(el("li", "u-" + (UROVEN[x.uroven] ? x.uroven : "neznamo"), typo(x.text)));
    return ul;
  }
  function hodnoty(v) {
    const h = v.hodnoty || {};
    const dl = el("dl", "hwc-hodnoty");
    const pridej = (dt, dd) => {
      if (dd == null) return;
      const g = el("div");
      g.append(el("dt", "", dt), el("dd", "", dd));
      dl.append(g);
    };
    const okno = v.okno ? ` ${v.okno.od}–${v.okno.do}${NB}h` : "";
    pridej("Srážky" + okno, h.srazkyPrace == null ? null : jednotka(h.srazkyPrace, "mm"));
    if (h.pravdepodobnostMax != null) pridej("Pravděpodobnost srážek", "až " + jednotka(h.pravdepodobnostMax, "%", 0));
    if (h.teplotaMin != null || h.teplotaMax != null) {
      const zaporna = (h.teplotaMin ?? 0) < 0 || (h.teplotaMax ?? 0) < 0;
      pridej("Teplota", `${h.teplotaMin == null ? "—" : cislo(h.teplotaMin)}${zaporna ? " až " : "–"}${h.teplotaMax == null ? "—" : cislo(h.teplotaMax)}${NB}°C`);
    }
    if (h.vitrMax != null) pridej("Vítr", "až " + jednotka(h.vitrMax, "m/s") + (h.narazyMax != null ? `, nárazy ${jednotka(h.narazyMax, "m/s")}` : ""));
    if (h.vlhkostMax != null) pridej("Vlhkost", "až " + jednotka(h.vlhkostMax, "%", 0));
    if (h.srazkyPred != null || h.srazkyPo != null) pridej("Déšť před / po", `${jednotka(h.srazkyPred, "mm")} / ${jednotka(h.srazkyPo, "mm")}`);
    pridej("Spolehlivost", SPOLEHLIVOST[v.spolehlivost] || "—");
    return dl;
  }
  // Upozornění na nepotvrzená pravidla; výrobek se bere z názvu typu („Impregnace (H-STONE)“).
  function bannerPravidel(nazvyTypu) {
    const vyrobky = [...new Set(nazvyTypu.map((n) => (String(n || "").match(/\((H-[A-Z]+)\)/) || [])[1]).filter(Boolean))];
    const p = el("p", "hwc-banner hwc-pozor hwc-pravidla");
    p.setAttribute("role", "note");
    p.textContent = `Pravidla jsou výchozí odhad – porovnejte je s${NB}technickým listem ${vyrobky.length ? vyrobky.join(" / ") : "použitého přípravku"} a${NB}potvrďte (content/pocasi-prace.json).`;
    return p;
  }
  function zdrojPredpovedi(z, aktualizovano, zastarale) {
    const p = el("p", "hwc-zdroj");
    if (z && z.text) {
      p.append("Zdroj předpovědi: ", sOdkazy(z.text));
      if (jeHttps(z.odkaz)) p.append(" · ", odkazEl(z.odkaz, new URL(z.odkaz).hostname));
    }
    if (aktualizovano) p.append(` · aktualizováno ${casCz(aktualizovano)}`);
    if (zastarale) p.append(" · ", el("span", "hwc-stitek pozor", "uložená kopie – zdroj teď neodpovídá"));
    return p;
  }

  /* 1) Počasí pro zakázku: obec (našeptávač z /api/planovac?navrh=), typ práce → /api/pocasi-prace. */
  $("hwcObec").addEventListener("input", () => {
    clearTimeout(hwc.navrhCasovac);
    const t = $("hwcObec").value.trim();
    if (t.length < 2 || hwc.navrhy.has(t)) return;
    hwc.navrhCasovac = setTimeout(() => nactiNavrhy(t), 300);
  });
  async function nactiNavrhy(t) {
    if (hwc.navrhRizeni) hwc.navrhRizeni.abort();
    const ac = (hwc.navrhRizeni = new AbortController());
    try {
      const d = await hwcVolej("/api/planovac?navrh=" + encodeURIComponent(t.slice(0, 60)), { verejne: true, signal: ac.signal });
      if (hwc.navrhy.size > 400) hwc.navrhy.clear();
      const dl = $("hwcNavrhy");
      dl.textContent = "";
      for (const m of Array.isArray(d.navrhy) ? d.navrhy.slice(0, 8) : []) {
        if (!m || typeof m.obec !== "string") continue;
        const p = popisMista(m);
        hwc.navrhy.set(p, m);
        dl.append(new Option(p, p));
      }
    } catch { /* našeptávač je jen pohodlí – obec jde napsat i bez něj */ }
  }
  $("hwcFormPocasi").addEventListener("submit", (e) => { e.preventDefault(); vyhodnot(); });
  async function vyhodnot(volba) {
    const vstup = $("hwcObec").value.trim();
    const m = volba || hwc.navrhy.get(vstup) || (vstup ? { obec: vstup.slice(0, 120) } : null);
    if (!m) { hwcStav("hwcStavPocasi", "Napište obec.", { chyba: true }); $("hwcObec").focus(); return; }
    clearTimeout(hwc.navrhCasovac);
    const q = new URLSearchParams({ obec: m.obec, typ: $("hwcTyp").value });
    if (m.kod) q.set("kod", String(m.kod));
    if (hwc.pocasiRizeni) hwc.pocasiRizeni.abort(); // novější dotaz nahradí starší
    const ac = (hwc.pocasiRizeni = new AbortController());
    const box = $("hwcVysledekPocasi");
    box.setAttribute("aria-busy", "true");
    hwcStav("hwcStavPocasi", `Vyhodnocuji počasí: ${m.obec}…`);
    try {
      const d = await hwcVolej("/api/pocasi-prace?" + q, { signal: ac.signal });
      if (Array.isArray(d.nejednoznacne)) vykresliVyber(box, d.nejednoznacne);
      else vykresliPocasi(box, d);
    } catch (e) {
      if (e.name !== "AbortError") box.textContent = "";
      hwcChyba("hwcStavPocasi", e, () => vyhodnot(m));
    } finally {
      if (hwc.pocasiRizeni === ac) { hwc.pocasiRizeni = null; box.removeAttribute("aria-busy"); }
    }
  }
  // Víc obcí stejného jména: tlačítka s okresy → nový dotaz s kódem obce.
  function vykresliVyber(box, seznam) {
    box.textContent = "";
    const jmeno = (seznam[0] && seznam[0].obec) || $("hwcObec").value.trim();
    const f = el("fieldset", "hwc-vyber");
    f.append(el("legend", "", `Obcí „${jmeno}“ je víc – vyberte okres:`));
    const volby = el("div", "hwc-volby");
    for (const m of seznam.slice(0, 40)) {
      if (!m || typeof m.obec !== "string") continue;
      const b = el("button", "", m.castObce ? `${m.obec} – část obce ${m.castObce}, okres ${m.okres}` : `okres ${m.okres}${m.pou ? ` (${m.pou})` : ""}`);
      b.type = "button";
      b.addEventListener("click", () => {
        const p = popisMista(m);
        hwc.navrhy.set(p, m);
        $("hwcObec").value = p;
        vyhodnot(m);
      });
      volby.append(b);
    }
    f.append(volby);
    box.append(f);
    hwcStav("hwcStavPocasi", `Obec „${jmeno}“ je v seznamu ${seznam.length}× – vyberte okres.`);
  }
  function vykresliPocasi(box, d) {
    box.textContent = "";
    if (d.typy && typeof d.typy === "object") {
      hwc.typy = d.typy;
      moznosti($("hwcTyp"), Object.entries(d.typy).map(([k, v]) => [k, String(v)]), d.typ || $("hwcTyp").value);
    }
    const misto = d.misto || {};
    const dny = Array.isArray(d.dny) ? d.dny : [];
    const hlava = el("div", "hwc-vysledek-hlava");
    hlava.append(el("h4", "hwc-h4", misto.obec ? popisMista(misto) : "Výsledek"), el("p", "hwc-tip", `${d.typNazev || ""}${dny[0] && dny[0].okno ? ` · pracovní doba ${dny[0].okno.od}–${dny[0].okno.do}${NB}h` : ""}`));
    box.append(hlava);
    if (d.pravidlaPotvrzena === false) box.append(bannerPravidel([d.typNazev]));
    if (!dny.length) box.append(el("p", "prazdne", "Předpověď pro tuto obec teď nepokrývá žádný den v pracovní době."));
    const ol = el("ol", "hwc-dny");
    const pocty = { vhodne: 0, riziko: 0, nevhodne: 0 };
    for (const v of dny) {
      if (v.uroven in pocty) pocty[v.uroven]++;
      const li = el("li", "hwc-den u-" + (UROVEN[v.uroven] ? v.uroven : "neznamo"));
      li.dataset.datum = String(v.datum);
      li.dataset.uroven = String(v.uroven);
      const hl = el("div", "hwc-den-hlava");
      const kdy = el("p", "hwc-kdy");
      kdy.append(el("b", "", denCz(v.datum)));
      const rel = relativne(v.datum);
      if (rel) kdy.append(" ", el("small", "", rel));
      hl.append(kdy, hodnoceni(v));
      li.append(hl, duvody(v), hodnoty(v));
      ol.append(li);
    }
    if (dny.length) box.append(ol);
    box.append(zdrojPredpovedi(d.zdroj, d.aktualizovano, d.zastarale));
    hwcStav("hwcStavPocasi", `${misto.obec || "Obec"}: ${dny.length} dní – nevhodné ${pocty.nevhodne}, riziko ${pocty.riziko}, vhodné ${pocty.vhodne}.`);
  }

  /* 2) Zakázky a rezervace: GET ?prehled=1 – kalendář zakázek + rezervace z plánovače s hodnocením. */
  $("hwcNacistPrehled").addEventListener("click", nactiPrehled);
  async function nactiPrehled() {
    const b = $("hwcNacistPrehled"), box = $("hwcVysledekPrehled");
    b.disabled = true;
    box.setAttribute("aria-busy", "true");
    hwcStav("hwcStavPrehled", "Načítám zakázky, rezervace a předpověď…");
    try {
      const [d] = await Promise.all([hwcVolej("/api/pocasi-prace?prehled=1"), dejNabidku()]);
      vykresliPrehled(box, d);
    } catch (e) {
      hwcChyba("hwcStavPrehled", e, nactiPrehled);
    } finally {
      b.disabled = false;
      box.removeAttribute("aria-busy");
    }
  }
  function stavKalendare(k) {
    const box = el("div", "hwc-kal");
    if (!k.nastaveno) {
      const p = el("div", "hwc-banner hwc-info");
      p.append(el("b", "", "Kalendář zakázek není připojený. "), "Vložte do Netlify proměnnou ", el("code", "", "HSPG_KALENDAR_ICS_URL"),
        " = tajná adresa iCal vašeho kalendáře zakázek (Google Kalendář → Nastavení → kalendář → Integrace kalendáře). Adresu nikomu neposílejte.");
      p.append(el("small", "hwc-tip", `Použijte samostatný kalendář (např. „HSPG – zakázky“), ne hlavní. Do té doby přehled ukazuje jen rezervace z${NB}plánovače.`));
      box.append(p);
    } else if (k.chyba) {
      const p = el("div", "hwc-banner chyba");
      p.append(el("b", "", "Kalendář zakázek se nepodařilo načíst. "), "Zkontrolujte v Netlify proměnnou ", el("code", "", "HSPG_KALENDAR_ICS_URL"), ` (tajná adresa iCal). Přehled teď ukazuje jen rezervace z${NB}plánovače.`);
      box.append(p);
    } else {
      const p = el("p", "hwc-tip");
      p.append(el("span", "hwc-stitek ok", "Kalendář zakázek připojen"));
      if (k.stazeno) p.append(` · staženo ${casCz(k.stazeno)}`);
      if (k.zastarale) p.append(" · ", el("span", "hwc-stitek pozor", "uložená kopie – kalendář teď neodpovídá"));
      box.append(p);
    }
    const s = k.preskoceno || {};
    const casti = [];
    if (s.opakovane > 0) casti.push(`${s.opakovane}× opakovaná událost se složitým pravidlem (měsíční, roční…) – zadejte termíny jednotlivě`);
    if (s.zrusene > 0) casti.push(`${s.zrusene}× zrušená událost`);
    if (s.bezCasu > 0) casti.push(`${s.bezCasu}× událost bez data`);
    if (casti.length) box.append(el("p", "hwc-tip", "Nezapočteno z kalendáře: " + casti.join("; ") + "."));
    return box;
  }
  function slevaText() {
    const s = hwc.nabidkaData && hwc.nabidkaData.sleva;
    if (!s || !s.procent) return "Sleva za rezervaci v plánovači podle podmínek akce";
    return `Sleva ${s.procent}${NB}% za rezervaci v${NB}plánovači` + (s.potvrzeno ? "" : " (podmínky zatím nepotvrzené)");
  }
  function polozkaKarta(p) {
    const ok = !p.chyba && p.vysledek;
    const u = ok && UROVEN[p.vysledek.uroven] ? p.vysledek.uroven : "neznamo";
    const li = el("li", "hwc-polozka u-" + u);
    li.dataset.zdroj = p.zdroj === "rezervace" ? "rezervace" : "kalendar";
    const hl = el("div", "hwc-polozka-hlava");
    hl.append(
      el("span", "hwc-odznak" + (p.zdroj === "rezervace" ? " rez" : ""), p.zdroj === "rezervace" ? `Rezervace #${p.cislo ?? "?"}` : "Kalendář"),
      el("b", "hwc-nazev", p.nazev || "(bez názvu)"),
    );
    li.append(hl);
    const volba = [...$("hwcTyp").options].find((o) => o.value === p.typ);
    const typNazev = p.typNazev || (hwc.typy && hwc.typy[p.typ]) || (volba && volba.textContent) || p.typ || "";
    const kde = [p.obec ? (p.okres ? `${p.obec} (okres ${p.okres})` : p.obec) : null, typNazev,
      ok && p.vysledek.okno ? `okno ${p.vysledek.okno.od}–${p.vysledek.okno.do}${NB}h` : null].filter(Boolean);
    li.append(el("p", "hwc-kde", kde.join(" · ")));
    if (p.misto && p.misto !== p.obec) li.append(el("p", "hwc-tip", "Místo v události: " + p.misto));
    if (ok) li.append(hodnoceni(p.vysledek), duvody(p.vysledek), hodnoty(p.vysledek));
    else li.append(el("p", "hwc-chyba-text", "❔ " + (p.chyba || "Počasí nejde vyhodnotit.")));
    if (p.zdroj === "rezervace") {
      const r = el("p", "hwc-rez");
      r.append(p.kupon
        ? el("span", "hwc-stitek " + (p.kuponOk ? "ok" : "pozor"), p.kuponOk ? `Kupon platný – ${nabidkaKuponu().nabidka}` : "Kupon neplatný nebo neověřený – zkontrolujte")
        : el("span", "hwc-stitek", "Bez kuponu"), " ", el("span", "hwc-stitek", slevaText()));
      li.append(r);
    }
    return li;
  }
  function vykresliPrehled(box, d) {
    box.textContent = "";
    box.append(stavKalendare(d.kalendar || {}));
    const polozky = Array.isArray(d.polozky) ? d.polozky : [];
    const nepotvrzene = polozky.filter((p) => p.pravidlaPotvrzena === false).map((p) => p.typNazev);
    if (nepotvrzene.length) box.append(bannerPravidel(nepotvrzene));
    const horizont = d.horizont ? datumCz(d.horizont, false) : "";
    if (!polozky.length) box.append(el("p", "prazdne", `Do ${horizont || "konce předpovědi"} nejsou v${NB}kalendáři ani v${NB}plánovači žádné zakázky.`));
    const skupiny = new Map();
    for (const p of polozky) {
      if (!skupiny.has(p.datum)) skupiny.set(p.datum, []);
      skupiny.get(p.datum).push(p);
    }
    for (const [datum, seznam] of skupiny) {
      const sk = el("div", "hwc-skupina");
      const h = el("h4", "hwc-h4", denCz(datum));
      const rel = relativne(datum);
      if (rel) h.append(" ", el("small", "", rel));
      const ul = el("ul", "hwc-polozky");
      for (const p of seznam) ul.append(polozkaKarta(p));
      sk.append(h, ul);
      box.append(sk);
    }
    const mimo = Array.isArray(d.rezervaceMimoHorizont) ? d.rezervaceMimoHorizont : [];
    const sk = el("div", "hwc-skupina");
    sk.append(el("h4", "hwc-h4", `Rezervace mimo dosah předpovědi${horizont ? ` (po ${horizont})` : ""}`));
    if (!mimo.length) sk.append(el("p", "prazdne", "Žádné."));
    else {
      const ul = el("ul", "hwc-mimo");
      for (const r of mimo) {
        const li = el("li");
        li.append(el("span", "hwc-odznak rez", `Rezervace #${r.cislo ?? "?"}`), " ",
          el("b", "", denCz(r.termin)), ` · ${r.obec || "bez obce"}${r.sluzba ? ` · ${r.sluzba}` : ""}${r.nahradni ? ` · náhradní termín ${datumCz(r.nahradni, false)}` : ""}`);
        if (r.kupon) li.append(" ", el("span", "hwc-stitek " + (r.kuponOk ? "ok" : "pozor"), r.kuponOk ? "kupon platný" : "kupon zkontrolujte"));
        ul.append(li);
      }
      sk.append(ul);
    }
    box.append(sk, zdrojPredpovedi(d.zdroj));
    hwcStav("hwcStavPrehled", `Načteno: ${polozky.length} ${polozky.length === 1 ? "položka" : polozky.length > 1 && polozky.length < 5 ? "položky" : "položek"} v${NB}dosahu předpovědi, ${mimo.length} ${mimo.length === 1 ? "rezervace" : "rezervací"} později.`);
  }

  /* 3) Kalendář s varováním v Google: tajný odkaz (POST odkaz / novy-odkaz). */
  $("hwcOdkaz").addEventListener("click", () => nactiOdkaz("odkaz"));
  $("hwcNovyOdkaz").addEventListener("click", () => {
    if (!confirm("Vytvořit nový odkaz? Starý odkaz přestane fungovat – v Google Kalendáři starý kalendář odeberte a přidejte nový.")) return;
    nactiOdkaz("novy-odkaz");
  });
  $("hwcOdkazKopirovat").addEventListener("click", () => kopiruj($("hwcOdkazPole").value, $("hwcOdkazPole"), "hwcStavKalendar", "Odkaz je zkopírovaný. Vložte ho v Google Kalendáři (Přidat z URL)."));
  async function nactiOdkaz(akce) {
    const tlacitka = [$("hwcOdkaz"), $("hwcNovyOdkaz")];
    tlacitka.forEach((b) => { b.disabled = true; });
    hwcStav("hwcStavKalendar", akce === "odkaz" ? "Načítám odkaz…" : "Vytvářím nový odkaz…");
    try {
      const d = await hwcVolej("/api/pocasi-prace", { metoda: "POST", telo: { akce } });
      if (!jeHttps(d.odkaz)) throw new Error("Server nevrátil platný odkaz.");
      $("hwcOdkazPole").value = d.odkaz;
      $("hwcOdkazBox").hidden = false;
      hwcStav("hwcStavKalendar", akce === "odkaz" ? "Odkaz je připravený – zkopírujte ho do Google Kalendáře." : "Nový odkaz je připravený, starý už nefunguje. V Google Kalendáři starý kalendář odeberte a přidejte tento.");
    } catch (e) {
      hwcChyba("hwcStavKalendar", e, () => nactiOdkaz(akce));
    } finally {
      tlacitka.forEach((b) => { b.disabled = false; });
    }
  }
  async function kopiruj(text, pole, idStavu, hlaska) {
    try {
      await navigator.clipboard.writeText(text);
      hwcStav(idStavu, hlaska || "Zkopírováno.");
    } catch {
      if (pole) { pole.focus(); pole.select(); }
      hwcStav(idStavu, "Schránka není dostupná – text je označený, zkopírujte ho klávesami Ctrl+C (na Macu ⌘+C).");
    }
  }

  /* 4) Dárkové kupony: vytvoření, karta k tisku, texty k odeslání, seznam a zrušení. */
  async function nactiKupony(hlaska) {
    hwc.kuponyNacteny = true;
    hwcStav("hwcStavSeznam", "Načítám kupony…");
    dejNabidku().then((n) => { if (token) vykresliNabidky(n); });
    try {
      const d = await hwcVolej("/api/kupon?seznam=1");
      vykresliKupony(Array.isArray(d.kupony) ? d.kupony : [], hlaska);
    } catch (e) {
      hwc.kuponyNacteny = false;
      hwcChyba("hwcStavSeznam", e, () => nactiKupony(hlaska));
    }
  }
  function vykresliNabidky(n) {
    const box = $("hwcStavNabidek");
    box.textContent = "";
    if (!n || !n.kupon) return;
    $("hwcNabidkaKupon").textContent = typo(`${n.kupon.nazev || KUPON_ZALOHA.nazev}: ${n.kupon.nabidka || KUPON_ZALOHA.nabidka}. Kód zákazník zadá v plánovači nebo na stránce kuponu.`);
    const nepotvrzene = [];
    if (n.sleva && n.sleva.potvrzeno === false) nepotvrzene.push(`„${n.sleva.nazev || "sleva za rezervaci"}“`);
    if (n.kupon.potvrzeno === false) nepotvrzene.push(`„${n.kupon.nazev || "dárkový kupon"}“`);
    if (nepotvrzene.length) {
      box.append(el("p", "hwc-banner hwc-pozor", typo(`Podmínky zatím nejsou potvrzené: ${nepotvrzene.join(" a ")}. Dokud je nepotvrdíte (content/planovac.json → potvrzeno: true), web u nich ukazuje, že podmínky upřesníte v nabídce.`)));
    }
  }
  function stavKuponu(k) {
    if (!k.aktivni) return ["zrušený", "chyba"];
    if (String(k.platnostDo) < dnesPraha()) return ["vypršel", "pozor"];
    if ((Array.isArray(k.pouziti) ? k.pouziti.length : 0) >= k.maxPouziti) return ["vyčerpaný", "pozor"];
    return ["aktivní", "ok"];
  }
  function vykresliKupony(seznam, hlaska) {
    const ul = $("hwcKupony");
    ul.textContent = "";
    let n = 0;
    for (const k of seznam) {
      if (!k || typeof k.kod !== "string") continue;
      n++;
      const [stav, trida] = stavKuponu(k);
      const li = el("li", "hwc-kupon" + (trida === "ok" ? "" : " neaktivni"));
      li.dataset.kod = k.kod;
      const hl = el("div", "hwc-kupon-hlava");
      hl.append(el("b", "hwc-kod", k.kod), el("span", "hwc-stitek " + trida, stav));
      li.append(hl);
      if (k.poznamka) li.append(el("p", "hwc-pozn", k.poznamka));
      const pouzito = Array.isArray(k.pouziti) ? k.pouziti.length : 0;
      li.append(el("p", "hwc-tip", `Použito ${pouzito} z${NB}${k.maxPouziti} domácností · platí do ${datumCz(k.platnostDo)}${Number.isFinite(Date.parse(k.vytvoreno)) ? ` · vytvořen ${datumCz(denPraha(Date.parse(k.vytvoreno)))}` : ""}`));
      const akce = el("div", "akce");
      if (trida === "ok") {
        const karta = el("button", "", "Karta a texty");
        karta.type = "button";
        karta.setAttribute("aria-label", `Karta a texty kuponu ${k.kod}`);
        karta.addEventListener("click", () => ukazKartu(k, k.odkaz));
        akce.append(karta);
      }
      if (k.aktivni) {
        const z = el("button", "hwc-zrusit", "Zrušit");
        z.type = "button";
        z.setAttribute("aria-label", `Zrušit kupon ${k.kod}`);
        z.addEventListener("click", () => zrusKupon(k.kod, z));
        akce.append(z);
      }
      if (akce.childElementCount) li.append(akce);
      ul.append(li);
    }
    hwcStav("hwcStavSeznam", hlaska || (n ? `Vydaných kuponů: ${n}.` : "Zatím žádné kupony."));
  }
  async function zrusKupon(kod, tlacitko) {
    if (!confirm(`Zrušit kupon ${kod}? Zákazníci ho pak už nebudou moci použít a zrušení nejde vrátit.`)) return;
    tlacitko.disabled = true;
    hwcStav("hwcStavSeznam", `Ruším kupon ${kod}…`);
    try {
      await hwcVolej("/api/kupon", { metoda: "POST", telo: { akce: "zrusit", kod } });
      if ($("hwcKarta").dataset.kod === kod) { $("hwcKarta").hidden = true; $("hwcKarta").textContent = ""; delete $("hwcKarta").dataset.kod; }
      await nactiKupony(`Kupon ${kod} je zrušený.`);
    } catch (e) {
      tlacitko.disabled = false;
      hwcChyba("hwcStavSeznam", e, () => zrusKupon(kod, tlacitko));
    }
  }
  $("hwcFormKupon").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pozn = $("hwcPoznamka"), max = $("hwcMax"), dni = $("hwcPlatnost");
    [pozn, max, dni].forEach((x) => x.removeAttribute("aria-invalid"));
    const spatne = (pole, text) => { pole.setAttribute("aria-invalid", "true"); hwcStav("hwcStavKupon", text, { chyba: true }); pole.focus(); };
    const text = pozn.value.replace(/\s+/g, " ").trim();
    if (text.length > 80) return spatne(pozn, "Poznámka může mít nejvýš 80 znaků.");
    if (/@/.test(text) || /(?:\d[\s\-/.]*){9,}/.test(text)) return spatne(pozn, "Do poznámky nepište telefon ani e-mail – stačí např. „sousedé Novákových“.");
    const m = Number(max.value), d = Number(dni.value);
    if (!Number.isInteger(m) || m < 1 || m > 50) return spatne(max, "Počet domácností zadejte celým číslem od 1 do 50.");
    if (!Number.isInteger(d) || d < 1 || d > 730) return spatne(dni, "Platnost zadejte celým číslem od 1 do 730 dní.");
    const b = $("hwcVytvorit");
    b.disabled = true; // dvojklik nesmí vytvořit dva kupony
    hwcStav("hwcStavKupon", "Vytvářím kupon…");
    try {
      const [r] = await Promise.all([hwcVolej("/api/kupon", { metoda: "POST", telo: { akce: "vytvorit", poznamka: text, maxPouziti: m, platnostDni: d } }), dejNabidku()]);
      if (!r.kupon || !/^HS-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(r.kupon.kod)) throw new Error("Server nevrátil platný kupon.");
      pozn.value = "";
      ukazKartu(r.kupon, r.odkaz);
      hwcStav("hwcStavKupon", `Kupon ${r.kupon.kod} je vytvořený, platí do ${datumCz(r.kupon.platnostDo)}.`);
      nactiKupony();
    } catch (err) {
      hwcChyba("hwcStavKupon", err, null); // vytvoření se automaticky neopakuje (mohly by vzniknout dva kupony)
    } finally {
      b.disabled = false;
    }
  });
  function textKuponu(k, odkaz) {
    return `Dobrý den, posílám vám dárkový kupon od HOLUB – HSPG: ${typo(nabidkaKuponu().nabidka)} k${NB}zakázce. Kód ${k.kod}, platí do ${datumCz(k.platnostDo)}. Rezervace: ${odkaz}`;
  }
  function ukazKartu(k, odkaz) {
    const obal = $("hwcKarta");
    obal.textContent = "";
    obal.dataset.kod = k.kod;
    const url = jeHttps(odkaz) ? odkaz : "";
    const nab = nabidkaKuponu();
    const karta = el("div", "hwc-karta");
    karta.setAttribute("role", "group");
    karta.setAttribute("aria-label", `Dárkový kupon ${k.kod}`);
    karta.append(
      el("p", "hwc-karta-znacka", "HOLUB – HSPG"),
      el("p", "hwc-karta-titul", typo(nab.nazev || KUPON_ZALOHA.nazev)),
      el("p", "hwc-karta-nabidka", `${typo(nab.nabidka || KUPON_ZALOHA.nabidka)} k${NB}zakázce`),
      el("p", "hwc-karta-kod", k.kod),
      el("p", "hwc-karta-platnost", `Platí do ${datumCz(k.platnostDo)} pro ${k.maxPouziti} ${k.maxPouziti === 1 ? "domácnost" : k.maxPouziti < 5 ? "domácnosti" : "domácností"}, každou jednou.`),
    );
    if (url) {
      const p = el("p", "hwc-karta-odkaz", "Rezervace: ");
      p.append(odkazEl(url, url.replace(/^https:\/\//, "")));
      karta.append(p);
    }
    const ovl = el("div", "hwc-karta-ovladani");
    const lab = el("label", "", "Text pro SMS nebo e-mail");
    lab.htmlFor = "hwcSms";
    const sms = el("textarea");
    sms.id = "hwcSms";
    sms.readOnly = true;
    sms.rows = 4;
    sms.value = textKuponu(k, url || odkaz || "");
    const akce = el("div", "akce");
    const tl = (text, fn) => { const b = el("button", "", text); b.type = "button"; b.addEventListener("click", fn); akce.append(b); return b; };
    if (url) tl("Kopírovat odkaz", () => kopiruj(url, null, "hwcStavKupon", "Odkaz na kupon je zkopírovaný."));
    tl("Kopírovat text pro SMS/e-mail", () => kopiruj(sms.value, sms, "hwcStavKupon", "Text pro SMS nebo e-mail je zkopírovaný."));
    tl("Tisk karty", () => tiskniKartu(karta));
    ovl.append(lab, sms, akce);
    obal.append(karta, ovl);
    obal.hidden = false;
    obal.scrollIntoView({ behavior: MENE_POHYBU ? "auto" : "smooth", block: "nearest" });
  }
  // Tisk jen karty: kopie do samostatného obalu v <body>, tiskový styl skryje vše ostatní.
  function tiskniKartu(karta) {
    let obal = document.getElementById("hwcTiskObal");
    if (!obal) { obal = el("div", "hwc-tisk-obal"); obal.id = "hwcTiskObal"; document.body.append(obal); }
    obal.textContent = "";
    obal.append(karta.cloneNode(true));
    document.body.classList.add("hwc-tisk");
    addEventListener("afterprint", () => { document.body.classList.remove("hwc-tisk"); obal.textContent = ""; }, { once: true });
    window.print();
  }

  // Po odhlášení (i automatickém při 401) v sekci nic nezůstane a běžící požadavky se zruší.
  function hwcVycisti() {
    for (const ac of hwc.rizeni) ac.abort();
    hwc.rizeni.clear();
    clearTimeout(hwc.navrhCasovac);
    hwc.navrhy.clear();
    Object.assign(hwc, { kuponyNacteny: false, nabidka: null, nabidkaData: null, pocasiRizeni: null, navrhRizeni: null });
    for (const id of ["hwcVysledekPocasi", "hwcVysledekPrehled", "hwcKupony", "hwcKarta", "hwcNavrhy", "hwcStavNabidek"]) $(id).textContent = "";
    for (const id of ["hwcStavPocasi", "hwcStavPrehled", "hwcStavKalendar", "hwcStavKupon", "hwcStavSeznam"]) hwcStav(id, "");
    for (const id of ["hwcObec", "hwcOdkazPole", "hwcPoznamka"]) $(id).value = "";
    $("hwcKarta").hidden = true;
    delete $("hwcKarta").dataset.kod;
    $("hwcOdkazBox").hidden = true;
    const tisk = document.getElementById("hwcTiskObal");
    if (tisk) tisk.textContent = "";
    $("hwcObsah").hidden = true;
    $("hwcOtevrit").setAttribute("aria-expanded", "false");
    $("hwcOtevrit").textContent = "Otevřít sekci";
    hwcPrepni("pocasi", false);
  }

  if (token) nactiAplikaci().catch((e) => odhlas(e.status === 401 ? "Přihlášení vypršelo." : e.message));
})();
