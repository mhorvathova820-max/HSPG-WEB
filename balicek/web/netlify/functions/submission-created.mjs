// Netlify ji spustí při každém ověřeném odeslání formuláře (Netlify Forms, název souboru je povinný).
// Druhý, nezávislý kanál doručení poptávky – vedle e-mailových oznámení Netlify, která nemusí dorazit.
// Kanály (každý se zapne vyplněním proměnných v Netlify):
//   ntfy (push do mobilu, aplikace ntfy):  NTFY_TEMA (dlouhé náhodné jméno), volitelně NTFY_SERVER
//   Telegram:                              TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//   E-mail přes SMTP (Seznam):             SMTP_UZIVATEL, SMTP_HESLO; volitelně SMTP_HOST, SMTP_PORT.
//     Komu: podle content/firma.json (smerovani_formularu → emaily), vždy s kopií na emaily.zaloha.
//     NOTIFIKACE_EMAIL (volitelně) přepíše adresáta – např. pro test na jednu schránku.
//   Potvrzení zákazníkovi (e-mailem):      POTVRZENI_ZAKAZNIKOVI=1 + schválený text v firma.json (úkol 02), vyžaduje SMTP
//   Push (ntfy/Telegram) nese jen typ a číslo poptávky. Jméno a telefon v pushi až s OZNAMENI_S_UDAJI=1
//   – ntfy.sh i Telegram jsou další příjemci osobních údajů a musí být uvedeni v zásadách.
import firma from "../../content/firma.json" with { type: "json" };

const INTERNI = new Set(["form-name", "_honey", "bot-field", "g-recaptcha-response", "souhlas-pravidla", "ip", "user_agent", "referrer", "subject"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function shrnuti(payload) {
  const data = payload?.data || {};
  const formular = payload?.form_name || data["form-name"] || "formulář";
  const pole = Object.entries(data)
    .filter(([k, v]) => !INTERNI.has(k) && v != null && String(v).trim() !== "" && typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v).slice(0, 500)}`);
  const cislo = String(payload?.id || "").slice(-6).toUpperCase() || "—";
  const email = Object.entries(data).find(([k, v]) => /mail/i.test(k) && EMAIL_RE.test(String(v || "").trim()))?.[1]?.trim() || null;
  const pole1 = (re) => Object.entries(data).find(([k, v]) => !INTERNI.has(k) && re.test(k) && typeof v === "string" && v.trim())?.[1]?.trim().slice(0, 60);
  // Předmět, který je vidět i v přeplněné schránce: kdo, telefon, odkud.
  const kdo = [pole1(/jm[eé]no|name/i), pole1(/telefon|phone|^tel/i)].filter(Boolean).join(", ");
  return {
    formular,
    cislo,
    email,
    titulek: `🕊 Poptávka${kdo ? ` – ${kdo}` : ""} (${formular}) #${cislo}`,
    text: `${pole.join("\n")}\n\nPřijato: ${payload?.created_at || new Date().toISOString()}\nNetlify: Forms → ${formular}`,
    kratce: `🕊 Nová poptávka (${formular}) #${cislo}`,
  };
}

// Obsah pushe: bez osobních údajů, pokud je majitel výslovně nepovolí.
const push = (s, env) =>
  env.OZNAMENI_S_UDAJI === "1"
    ? { titulek: s.titulek, text: s.text }
    : { titulek: s.kratce, text: "Podrobnosti v e-mailu a v Netlify → Forms." };

async function ntfy(s0, env, f) {
  const s = push(s0, env);
  const server = (env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
  // JSON publikace: diakritika v titulku nepotřebuje kódování hlaviček.
  const r = await f(server, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: env.NTFY_TEMA, title: s.titulek, message: s.text, priority: 4, tags: ["bird"] }),
  });
  if (!r.ok) throw new Error(`ntfy ${r.status}`);
}

async function telegram(s0, env, f) {
  const s = push(s0, env);
  const r = await f(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `${s.titulek}\n\n${s.text}`.slice(0, 4000), disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`telegram ${r.status}`);
}

async function smtpTransport(env) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.seznam.cz",
    port,
    secure: port === 465,
    auth: { user: env.SMTP_UZIVATEL, pass: env.SMTP_HESLO },
  });
}

// Kam e-mail o odeslání formuláře: { to, cc } podle směrování ve firma.json.
export function adresat(formular, env = process.env, f = firma) {
  const em = f.emaily || {};
  const sm = f.smerovani_formularu || {};
  const to = env.NOTIFIKACE_EMAIL || em[sm[formular] || sm["*"]] || em.info || em.zaloha;
  const cc = em.zaloha && em.zaloha !== to ? em.zaloha : undefined;
  return { to, cc };
}

// Potvrzení zákazníkovi odejde jen se schváleným textem a jen u vybraných formulářů (úkol 02, krok A5).
// Do té doby (firma.json bez potvrzeni_zakaznikovi.schvaleno) se neposílá, ani když je POTVRZENI_ZAKAZNIKOVI=1 –
// jinak by šlo přes formulář posílat e-maily z firemní schránky na cizí adresy. Limity na adresu a den doplní úkol 02.
export function potvrzeniPovoleno(formular, env, firmaData) {
  const pz = firmaData?.potvrzeni_zakaznikovi;
  return env.POTVRZENI_ZAKAZNIKOVI === "1" && pz?.schvaleno === true && Array.isArray(pz.formulare) &&
    pz.formulare.includes(formular) && !JSON.stringify(pz).includes("[DOPLNIT");
}

export function vytvorOznameni({ env = process.env, f = fetch, transport, firmaData = firma } = {}) {
  return async function handler(req) {
    let payload;
    try {
      payload = (await req.json())?.payload;
    } catch {
      return new Response("bad request", { status: 400 });
    }
    if (!payload) return new Response("bad request", { status: 400 });
    const s = shrnuti(payload);
    const ulohy = [];
    if (env.NTFY_TEMA) ulohy.push(["ntfy", () => ntfy(s, env, f)]);
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) ulohy.push(["telegram", () => telegram(s, env, f)]);
    const smtp = env.SMTP_UZIVATEL && env.SMTP_HESLO;
    const komu = adresat(s.formular, env, firmaData);
    if (smtp && komu.to) {
      ulohy.push(["email", async () => {
        const t = transport || (await smtpTransport(env));
        await t.sendMail({
          from: `"Web HSPG" <${env.SMTP_UZIVATEL}>`,
          to: komu.to,
          ...(komu.cc ? { cc: komu.cc } : {}),
          subject: s.titulek,
          text: s.text,
          ...(s.email ? { replyTo: s.email } : {}),
        });
      }]);
    }
    if (smtp && s.email && potvrzeniPovoleno(s.formular, env, firmaData)) {
      ulohy.push(["potvrzeni", async () => {
        const t = transport || (await smtpTransport(env));
        await t.sendMail({
          from: `"HOLUB – HSPG" <${env.SMTP_UZIVATEL}>`,
          to: s.email,
          subject: `Přijali jsme vaši poptávku #${s.cislo}`,
          text: `Dobrý den,\n\nděkujeme, vaši poptávku jsme přijali pod číslem ${s.cislo}. Ozveme se vám během pracovní doby (Po–So 7:00–19:00).\nPokud spěcháte, volejte +420 736 618 486.\n\nHOLUB – HSPG\nhttps://hspg.cz\n\nTento e-mail byl odeslán automaticky na základě formuláře na hspg.cz.`,
        });
      }]);
    }
    if (!ulohy.length) {
      console.warn("submission-created: není nastaven žádný kanál oznámení (NTFY_TEMA / TELEGRAM_* / SMTP_*)");
      return new Response("no channel", { status: 200 });
    }
    const vysledky = await Promise.allSettled(ulohy.map(([, fn]) => fn()));
    const chyby = vysledky.map((v, i) => (v.status === "rejected" ? `${ulohy[i][0]}: ${v.reason?.message}` : null)).filter(Boolean);
    if (chyby.length) console.error("submission-created: selhalo", chyby.join("; "));
    // 200 i při částečném selhání – Netlify by jinak opakoval a odeslal duplicitní oznámení.
    return new Response(chyby.length === ulohy.length ? "all failed" : "ok", { status: 200 });
  };
}

export default vytvorOznameni();
