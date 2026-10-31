// M9: Update-Prüfung nur nach Einwilligung, erweiterte PDF-Schrift und Start aus dem entpackten Release-ZIP.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, URLAPP, SP, kanaele, pdfInfo } from "./hilfen.mjs";
import { demoProfilAnlegen, ordnerStub } from "./demo-profil.mjs";
import { bauen, lesen } from "../tools/release-zip.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const NAMEN = "Şahin Yılmaz Łukasz Żółć Dvořák Őrsi Nguyễn";

for (const channel of kanaele()) {
  console.log("== M9 " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(ordnerStub);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));

  // Jede Anfrage ins Netz wird gezählt, die Antwort kommt vom Test.
  const anfragen = [];
  let antwort = { status: 200, body: JSON.stringify({ tag_name: "v9.9.9", html_url: "https://example.org/falle" }) };
  await ctx.route(/^https?:/, (r) => {
    anfragen.push(r.request().url());
    return r.fulfill({ ...antwort, contentType: "application/json", headers: { "access-control-allow-origin": "*" } });
  });

  await p.goto(URLAPP);
  await demoProfilAnlegen(p);
  await p.waitForTimeout(300);
  ok("Ohne Einwilligung kein Netzaufruf", anfragen.length === 0, anfragen);
  const ohne = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    return { start: await K.update.beimStart(), klick: await K.update.pruefen(), hinweis: K.update.hinweis() };
  });
  ok("Update-Funktionen ohne Einwilligung wirkungslos", !ohne.start && !ohne.klick && !ohne.hinweis && anfragen.length === 0, { ohne, anfragen });

  await p.evaluate(() => { window.R42J_CORE.tresor.aendern((d) => { d.einstellungen.updatePruefung = true; }); });
  await p.evaluate(() => window.R42J_CORE.update.beimStart(new Date(2030, 0, 1, 9)));
  ok("Mit Einwilligung genau ein Aufruf bei GitHub", anfragen.length === 1 && anfragen[0] === "https://api.github.com/repos/benni-russ/ready-4-2-jobs/releases/latest", anfragen);
  await p.evaluate(() => window.R42J_CORE.update.beimStart(new Date(2030, 0, 1, 20)));
  ok("Höchstens einmal am Tag", anfragen.length === 1, anfragen);
  await p.evaluate(() => window.R42J_CORE.update.beimStart(new Date(2030, 0, 2, 9)));
  ok("Am nächsten Tag wieder", anfragen.length === 2, anfragen);

  const hinweis = await p.evaluate(() => window.R42J_CORE.update.hinweis());
  ok("Link entsteht aus der Version, nicht aus der Antwort", hinweis?.link === "https://github.com/benni-russ/ready-4-2-jobs/releases/tag/v9.9.9", hinweis);
  await p.evaluate(() => { location.hash = "#/uebersicht"; });
  await p.getByText("Version 9.9.9 ist verfügbar").waitFor();
  ok("Hinweis in der Übersicht", true);
  await p.getByRole("button", { name: "Hinweis ausblenden" }).click();
  await p.getByText("Version 9.9.9 ist verfügbar").waitFor({ state: "detached" });
  ok("Hinweis lässt sich ausblenden", true);

  for (const [name, a] of [
    ["manipulierte Version", { status: 200, body: JSON.stringify({ tag_name: "v9.9.9/../../böse" }) }],
    ["Serverfehler", { status: 500, body: "{}" }],
    ["kaputte Antwort", { status: 200, body: "kein JSON" }],
  ]) {
    antwort = a;
    const r = await p.evaluate(async () => {
      const K = window.R42J_CORE;
      const still = await K.update.beimStart(new Date(2031, 0, 1));
      const klick = await K.update.pruefen().then(() => null, (e) => K.fehlerText(e));
      return { still, klick };
    });
    ok(name + ": beim Start still, beim Klick mit Meldung", r.still === null && /GitHub war nicht erreichbar/.test(r.klick), r);
  }
  antwort = { status: 200, body: JSON.stringify({ tag_name: "v1.0.0" }) };
  const gleich = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    await K.update.pruefen();
    return K.update.hinweis();
  });
  ok("Gleiche Version zeigt keinen Hinweis", gleich === null, gleich);
  const vergleich = await p.evaluate(() => {
    const n = window.R42J_CORE.update.neuer;
    return [n("1.10.0", "1.9.9"), n("2.0.0", "10.0.0"), n("1.0.0", "1.0.0"), n("x", "1.0.0")];
  });
  ok("Versionen werden als Zahlen verglichen", JSON.stringify(vergleich) === "[true,false,false,false]", vergleich);

  // Die Einwilligung lässt sich zurücknehmen.
  await p.evaluate(() => { window.R42J_CORE.tresor.aendern((d) => { d.einstellungen.updatePruefung = false; }); });
  const vorher = anfragen.length;
  await p.evaluate(() => window.R42J_CORE.update.beimStart(new Date(2032, 0, 1)));
  ok("Nach dem Abschalten kein Aufruf", anfragen.length === vorher, anfragen);

  // Lebenslauf mit Namen aus Latin Extended und Vietnamesisch.
  const cv = await p.evaluate(async (namen) => {
    const K = window.R42J_CORE;
    const [vor, ...nach] = namen.split(" ");
    K.tresor.aendern((d) => {
      d.profil.vorname = vor;
      d.profil.nachname = nach.join(" ");
    });
    const r = await K.lebenslauf.erstellen({ ausrichtungId: "a1", sprache: "de", akzent: "petrol", mitInteressen: false });
    return { base64: btoa(Array.from(r.bytes, (c) => String.fromCharCode(c)).join("")), fremd: r.hinweise.filter((h) => h.text === "cv.hinweisZeichen") };
  }, NAMEN);
  const pfad = join(SP, `m9-${channel}-cv.pdf`);
  writeFileSync(pfad, Buffer.from(cv.base64, "base64"));
  const info = pdfInfo(pfad);
  const text = info.text.join("\n").normalize("NFC");
  for (const wort of NAMEN.split(" ")) ok("Lebenslauf enthält " + wort, text.includes(wort), text.slice(0, 200));
  ok("Schrift eingebettet", info.schriften.length > 0 && info.schriften.every((s) => s[1]), info.schriften);
  ok("Keine fehlenden Zeichen gemeldet", cv.fremd.length === 0, cv.fremd);

  ok("Keine Laufzeitfehler", fehler.length === 0, fehler);
  await b.close();

  // Das Release-ZIP entpackt starten.
  const ziel = join(SP, "m9-release-" + channel);
  rmSync(ziel, { recursive: true, force: true });
  mkdirSync(ziel, { recursive: true });
  const zip = join(ziel, "r42j.zip");
  bauen(zip);
  for (const e of lesen(zip)) {
    const datei = join(ziel, "inhalt", e.name);
    mkdirSync(dirname(datei), { recursive: true });
    writeFileSync(datei, e.inhalt);
  }
  const b2 = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const p2 = await (await b2.newContext({ locale: "de-DE" })).newPage();
  const meldungen = [];
  p2.on("pageerror", (e) => meldungen.push(e.message));
  p2.on("console", (m) => m.type() === "error" && meldungen.push(m.text()));
  await p2.goto(pathToFileURL(join(ziel, "inhalt", "app", "index.html")).href);
  await p2.getByRole("button", { name: "Ordner auswählen" }).waitFor();
  ok("Entpacktes ZIP startet ohne Konsolenfehler", meldungen.length === 0, meldungen);
  await p2.goto(pathToFileURL(join(ziel, "inhalt", "LIESMICH.html")).href);
  const bilder = await p2.evaluate(async () => {
    const liste = [...document.images];
    for (const i of liste) { i.loading = "eager"; await i.decode().catch(() => {}); }
    return liste.map((i) => [i.getAttribute("src"), i.naturalWidth]);
  });
  ok("LIESMICH zeigt seine Bilder", bilder.length === 3 && bilder.every((x) => x[1] > 0), bilder);
  await b2.close();
  rmSync(ziel, { recursive: true, force: true });
}
console.log(fehlerZahl ? `${fehlerZahl} Fehler` : "M9 bestanden");
process.exit(fehlerZahl ? 1 : 0);
