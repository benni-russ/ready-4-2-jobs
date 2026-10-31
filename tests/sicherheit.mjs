// Sicherheitsreview als Test: CSP, Klartext auf dem Stick, Konsole und Netz. Erklärung in docs/SICHERHEIT.md.
import { chromium, URLAPP, kanaele } from "./hilfen.mjs";
import { DEMO_PASSWORT, demoProfilAnlegen, ordnerStub } from "./demo-profil.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const GEHEIM = "Geheimmarker-Zebra-4711";

for (const channel of kanaele()) {
  console.log("== Sicherheit " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(ordnerStub);
  const p = await ctx.newPage();
  const konsole = [];
  const fehler = [];
  p.on("console", (m) => konsole.push(m.text()));
  p.on("pageerror", (e) => fehler.push(e.message));
  const netz = [];
  await ctx.route(/^https?:/, (r) => {
    netz.push(r.request().url());
    return r.abort();
  });

  await p.goto(URLAPP);

  const csp = await p.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "");
  const regel = Object.fromEntries(csp.split(";").map((t) => t.trim().split(/\s+/)).filter((t) => t[0]).map(([k, ...w]) => [k, w]));
  ok("CSP: Standard nur eigene Dateien", regel["default-src"]?.join(" ") === "'self'", regel["default-src"]);
  ok("CSP: Netz nur zur GitHub-API", regel["connect-src"]?.join(" ") === "https://api.github.com", regel["connect-src"]);
  ok("CSP: Skripte ohne eval und inline", regel["script-src"]?.join(" ") === "'self'", regel["script-src"]);
  ok("CSP: Formulare, Plugins und base zu", ["form-action", "object-src", "base-uri"].every((k) => regel[k]?.join(" ") === "'none'"), regel);
  // Erst nach dem Evaluate-Aufruf: Solange er läuft, setzt das Entwicklerprotokoll die CSP für eval aus.
  const sperrt = await p.evaluate(
    () =>
      new Promise((fertig) =>
        setTimeout(() => {
          const versuche = {};
          try { new Function("return 1")(); versuche.funktion = true; } catch { versuche.funktion = false; }
          try { (0, eval)("1"); versuche.eval = true; } catch { versuche.eval = false; }
          fertig(versuche);
        }),
      ),
  );
  ok("CSP blockt eval und new Function", !sperrt.funktion && !sperrt.eval, sperrt);
  const fremd = await p.evaluate(
    () =>
      new Promise((fertig) => {
        const s = document.createElement("script");
        s.src = "https://example.org/x.js";
        s.onerror = () => fertig("blockiert");
        s.onload = () => fertig("geladen");
        document.head.append(s);
      }),
  );
  ok("CSP blockt fremde Skripte", fremd === "blockiert", fremd);

  await demoProfilAnlegen(p);
  await p.evaluate(async (g) => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => {
      d.profil.nachname = g;
      d.profil.email = g.toLowerCase() + "@example.org";
    });
    await K.tresor.speichernJetzt();
  }, GEHEIM);

  // Eine Datei im Export-Ordner, wie sie das Öffnen einer Anlage hinterlässt.
  const exportOrdner = await p.evaluate(async (g) => {
    const K = window.R42J_CORE;
    await K.profile.exportSchreiben("probe.txt", new TextEncoder().encode(g));
    return true;
  }, GEHEIM);
  ok("Export-Datei angelegt", exportOrdner === true);

  let liste = await p.evaluate(`(${speicherText(GEHEIM)})()`);
  const klartext = liste.filter((e) => e.treffer && !e.pfad.includes("/export/"));
  ok("Tresor und Anlagen ohne Klartext", klartext.length === 0, klartext);
  ok("Tresor liegt verschlüsselt vor", liste.some((e) => e.pfad.endsWith("tresor.r42j")), liste.map((e) => e.pfad));
  ok("Keine Reste .tmp", !liste.some((e) => e.pfad.endsWith(".tmp")), liste.map((e) => e.pfad));

  const lokal = await p.evaluate((g) => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie + location.href, GEHEIM);
  ok("localStorage, Cookies und Adresse ohne Daten", !lokal.includes(GEHEIM), lokal.slice(0, 200));

  await p.evaluate(() => window.R42J_CORE.jetztSperren("hand"));
  await p.waitForFunction(() => !window.R42J_CORE.tresor.offen());
  await p.waitForFunction(() => window.R42J_CORE.ablauf.get().phase !== "app");
  liste = await p.evaluate(`(${speicherText(GEHEIM)})()`);
  const exp = liste.filter((e) => e.pfad.includes("/export/") && !e.ordner);
  ok("Export nach dem Sperren leer", exp.length === 0, exp);
  ok("Sperre entfernt den Schlüssel", await p.evaluate(() => !window.R42J_CORE.tresor.offen()));
  const dom = await p.evaluate(() => document.documentElement.outerHTML);
  ok("Gesperrte Seite zeigt keine Daten", !dom.includes(GEHEIM));

  // Beim Start wird der Export-Ordner ebenfalls geleert, auch ohne Sperren.
  await p.evaluate(() => window.R42J_CORE.profile.exportSchreiben("rest.txt", new TextEncoder().encode("rest")));
  await p.reload();
  await p.getByRole("button", { name: /Demo Mustermann/ }).waitFor();
  liste = await p.evaluate(`(${speicherText(GEHEIM)})()`);
  const rest = liste.filter((e) => e.pfad.includes("/export/") && !e.ordner);
  ok("Export nach dem Start leer", rest.length === 0, rest);

  const alles = konsole.join("\n");
  ok("Konsole ohne Daten", !alles.includes(GEHEIM) && !alles.includes(DEMO_PASSWORT), konsole.slice(0, 5));
  ok("Kein Netzverkehr", netz.length === 0, netz);
  ok("Keine Laufzeitfehler", fehler.length === 0, fehler);
  await b.close();
}
console.log(fehlerZahl ? `${fehlerZahl} Fehler` : "Sicherheit bestanden");
process.exit(fehlerZahl ? 1 : 0);

// Liest den ganzen Speicherbereich: Pfad, Größe und ob der Marker als Text vorkommt.
function speicherText(marker) {
  return `async () => {
    const wurzel = await navigator.storage.getDirectory();
    const liste = [];
    const gehen = async (ordner, pfad) => {
      for await (const [name, griff] of ordner.entries()) {
        const voll = pfad + "/" + name;
        if (griff.kind === "directory") {
          liste.push({ pfad: voll, ordner: true });
          await gehen(griff, voll);
        } else {
          const datei = await griff.getFile();
          const text = new TextDecoder("latin1").decode(await datei.arrayBuffer());
          liste.push({ pfad: voll, groesse: datei.size, treffer: text.includes(${JSON.stringify(marker)}) });
        }
      }
    };
    await gehen(wurzel, "");
    return liste;
  }`;
}
