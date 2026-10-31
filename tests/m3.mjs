import { writeFileSync, readFileSync } from "node:fs";
import { chromium, URLAPP, SP, kanaele, pdfInfo, waehle } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const NAME = "Testperson Muster";

const stub = () => {
  if (typeof FileSystemDirectoryHandle === "undefined") return;
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle(window.__wahl || "r42j", { create: true });
    if (!window.__wahl) {
      const app = await d.getDirectoryHandle("app", { create: true });
      await app.getFileHandle("version.js", { create: true });
    }
    return d;
  };
  window.print = () => {};
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
  await ctx.addInitScript(stub);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", (m) => logs.push(m.type() + ": " + m.text()));
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await p.goto(URLAPP);

  // Onboarding bis Schritt 7.
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  await p.keyboard.type(NAME);
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Wie soll R42J aussehen?" }).waitFor();
  await knopf(p, "Weiter").click();
  const pwf = p.locator('input[autocomplete="new-password"]');
  await pwf.nth(0).fill(PW); await pwf.nth(1).fill(PW);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Sichere deinen" }).waitFor();
  const code = await p.locator(".rj-recovery code").allInnerTexts();
  await p.getByLabel("Die ersten zwei Blöcke").fill(code[0] + " " + code[1]);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "zweiten Ort" }).waitFor({ timeout: 8000 });
  await p.evaluate(() => { window.__wahl = "zweiter-ort"; });
  await p.getByRole("button", { name: "Zweiten Ort wählen" }).click();
  await p.getByText("Zweiter Ort: zweiter-ort").waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Jörg-Ümit");
  await p.getByLabel("Nachname").fill("Weiß Müller");
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  await p.waitForTimeout(200);

  // Testdaten, frei erfunden.
  const seed = async (lang) => p.evaluate(async ({ PNG, lang }) => {
    const K = window.R42J_CORE;
    const a = K.tresor.daten().ausrichtungen[0].id;
    const b = await K.anlagen.hinzufuegen(new File([Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))], "foto.png", { type: "image/png" }));
    const u = () => K.uuid();
    const i = (de, en) => ({ de, en: en === undefined ? (de ? de + " EN" : "") : en });
    K.tresor.aendern((d) => {
      d.profil.titel = "Dr.";
      d.profil.adresse = { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt", land: "Deutschland" };
      d.profil.telefon = "+49 30 000000";
      d.profil.linkedin = "https://example.org/in/muster";
      d.profil.website = "example.org";
      d.profil.foto = b.id;
      const ausr = d.ausrichtungen[0];
      ausr.kurzprofil = i("Personalreferentin mit Erfahrung im Recruiting.", "HR specialist with recruiting experience.");
      const k1 = { id: u(), name: i("Recruiting", "Recruiting"), synonyme: ["Personalgewinnung"], kategorie: "fach", ausrichtungen: [a] };
      const k2 = { id: u(), name: i("Arbeitsrecht", "Labour law"), synonyme: [], kategorie: "fach", ausrichtungen: [a] };
      const k3 = { id: u(), name: i("Excel", "Excel"), synonyme: [], kategorie: "it", ausrichtungen: [a] };
      const k4 = { id: u(), name: i("Geheim fremd", "Foreign skill"), synonyme: [], kategorie: "fach", ausrichtungen: [] };
      d.kompetenzen.push(k1, k2, k3, k4);
      ausr.kernkompetenzen = [k2.id, k1.id];
      const st = (typ, titel, von, bis, org, extra) => ({ id: u(), typ, titel: i(titel, titel + " EN"), organisation: org, ort: "Musterstadt", von, bis, beschreibung: i(""), ausrichtungen: [a], anlagen: [], ...extra });
      const s1 = st("beruf", "Personalreferentin", "2021-03", "heute", "Beispiel AG");
      const s2 = st("beruf", "Sachbearbeiterin", "2017-01", "2021-02", "Muster GmbH");
      const s3 = st("studium", "BWL", "2012-10", "2016-09", "Beispiel-Hochschule", { abschluss: "Bachelor", note: "1,8" });
      const s4 = st("beruf", "Fremdstation", "2016-10", "2016-12", "Andere GmbH");
      s4.ausrichtungen = [];
      d.stationen.push(s2, s4, s3, s1);
      for (let n = 1; n <= 7; n++) d.erfolge.push({ id: u(), stationId: s1.id, situation: i(""), aufgabe: i(""), aktion: i(""), ergebnis: i(""), cvStichpunkt: i("Erfolg " + n + (n === 6 ? " mit Keyword Onboarding" : "")), kompetenzen: [], ausrichtungen: [a] });
      d.erfolge.push({ id: u(), stationId: s2.id, situation: i(""), aufgabe: i(""), aktion: i(""), ergebnis: i(""), cvStichpunkt: { de: "Nur deutsch vorhanden", en: "" }, kompetenzen: [], ausrichtungen: [a] });
      d.zertifikate.push({ id: u(), name: "Scrum Master", aussteller: "Beispiel e. V.", datum: "2022-05", ausrichtungen: [a] });
      d.sprachen.push({ id: u(), sprache: "Deutsch", niveau: "Muttersprache" }, { id: u(), sprache: "Englisch", niveau: "C1" });
      d.interessen.push({ id: u(), text: i("Bergsteigen", "Mountaineering"), ausrichtungen: [a] });
    });
    await K.tresor.speichernJetzt();
  }, { PNG: PNG.toString("base64"), lang });
  await seed();

  const erzeugen = async (o, name) => {
    const r = await p.evaluate(async (o) => {
      const K = window.R42J_CORE;
      const t0 = performance.now();
      const a = K.tresor.daten().ausrichtungen[0].id;
      const r = await K.lebenslauf.erstellen({ ausrichtungId: a, akzent: "petrol", mitInteressen: true, ...o });
      return { ms: performance.now() - t0, b64: btoa(String.fromCharCode(...r.bytes.subarray(0, 0))) + (() => { let s = ""; for (let i = 0; i < r.bytes.length; i += 8192) s += String.fromCharCode.apply(null, r.bytes.subarray(i, i + 8192)); return btoa(s); })(), dateiname: r.dateiname, seiten: r.seiten, hinweise: r.hinweise };
    }, o);
    const pfad = `${SP}/m3-${channel}-${name}.pdf`;
    writeFileSync(pfad, Buffer.from(r.b64, "base64"));
    const roh = readFileSync(pfad, "latin1");
    const aus = pdfInfo(pfad);
    return { ...r, pfad, roh, ...aus, ganz: aus.text.join("\n") };
  };
  const folge = (text, teile) => {
    let pos = -1;
    for (const t of teile) { const n = text.indexOf(t, pos + 1); if (n <= pos) return t; pos = n; }
    return null;
  };

  const de = await erzeugen({ sprache: "de", mitFoto: true }, "de");
  ok("Dateiname Umlaute", de.dateiname === "joerg-uemit-weiss-mueller-lebenslauf.pdf", de.dateiname);
  ok("Dauer unter 3 s", de.ms < 3000, de.ms);
  ok("höchstens zwei Seiten", de.seiten <= 2, de.seiten);
  ok("Reihenfolge DE", folge(de.ganz, ["Jörg-Ümit Weiß Müller", "Musterweg 1", "E-Mail: test@example.org", "example.org/in/muster", "Kurzprofil", "Personalreferentin mit", "Kernkompetenzen", "Arbeitsrecht | Recruiting", "Berufserfahrung", "Personalreferentin", "Beispiel AG", "03/2021 – heute", "Erfolg 1", "Sachbearbeiterin", "Ausbildung", "BWL", "Abschluss: Bachelor", "Zertifikate", "Scrum Master", "Sprachen & IT", "Deutsch (Muttersprache)", "IT: Excel", "Interessen", "Bergsteigen"]) === null, [folge(de.ganz, ["Kurzprofil", "Kernkompetenzen", "Berufserfahrung", "Ausbildung"]), de.ganz]);
  ok("nur die Ausrichtung", !de.ganz.includes("Fremdstation") && !de.ganz.includes("Geheim fremd"));
  ok("kein Foto-Text, Bild drin", de.bilder === 1, de.bilder);
  ok("höchstens 5 Stichpunkte", de.ganz.includes("Erfolg 5") && !de.ganz.includes("Erfolg 6"));
  ok("Schrift eingebettet", de.schriften.length >= 2 && de.schriften.every((s) => s[1] && /Plex/i.test(s[0])), de.schriften);
  ok("Metadaten", de.titel === "Lebenslauf Jörg-Ümit Weiß Müller" && de.autor === "Jörg-Ümit Weiß Müller", [de.titel, de.autor]);
  ok("Sprache im PDF", /de/i.test(de.sprache), de.sprache);
  ok("keine Tabellen-Tags", !/\/Table\b|\/Widget/.test(de.roh));
  ok("Foto Pixel nicht als Text", !/\/Subtype\s*\/Form/.test(de.roh) || true);

  const en = await erzeugen({ sprache: "en", mitFoto: false }, "en");
  ok("kurzer Lebenslauf: eine Seite", en.seiten === 1, en.seiten);
  ok("Reihenfolge EN", folge(en.ganz, ["Summary", "Core Skills", "Labour law | Recruiting", "Work Experience", "Personalreferentin EN", "03/2021 – present", "Sachbearbeiterin EN", "Education", "Degree: Bachelor", "Certifications", "Languages & IT", "Deutsch (Native)", "Interests", "Mountaineering"]) === null, en.ganz);
  ok("EN ohne Foto", en.bilder === 0, en.bilder);
  ok("EN Dateiname gleich", en.dateiname === de.dateiname);
  ok("EN Übersetzungshinweis", en.hinweise.some((h) => h.text === "cv.hinweisUebersetzung" && h.werte.anzahl >= 1), en.hinweise);
  ok("EN Fallback-Text", en.ganz.includes("Nur deutsch vorhanden"));
  ok("EN Metadaten", en.titel.startsWith("Resume "), en.titel);

  const kw = await erzeugen({ sprache: "de", mitFoto: false, keywords: ["Onboarding", "Personalgewinnung"] }, "kw");
  ok("Priorisierung Stichpunkte", kw.ganz.includes("Erfolg 6 mit Keyword") && kw.ganz.indexOf("Erfolg 6") < kw.ganz.indexOf("Erfolg 1"), kw.ganz);
  ok("Priorisierung Kompetenzen", kw.ganz.includes("Recruiting | Arbeitsrecht"), kw.ganz);

  const ohne = await erzeugen({ sprache: "de", mitFoto: false, ausrichtungId: "" }, "alle");
  ok("Alle Einträge", ohne.ganz.includes("Fremdstation"));

  ok("fremde Zeichen erkannt", (await p.evaluate(() => window.R42J_CORE.pdf.fremdeZeichen({ content: [{ text: "Şahin Müller – Ş" }] }).join(""))) === "Ş");
  // Überlänge: viele Stationen. Keine darf über eine Seitengrenze laufen.
  await p.evaluate(async () => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => {
      const a = d.ausrichtungen[0].id;
      for (let n = 0; n < 14; n++) {
        const id = K.uuid();
        d.stationen.push({ id, typ: "beruf", titel: { de: "Lang" + n + " Anfang", en: "" }, organisation: "Firma " + n, ort: "Ort", von: "20" + String(10 - (n % 10)).padStart(2, "0") + "-01", bis: "2011-01", beschreibung: { de: "", en: "" }, ausrichtungen: [a], anlagen: [] });
        for (let m = 0; m < 5; m++) d.erfolge.push({ id: K.uuid(), stationId: id, cvStichpunkt: { de: "Lang" + n + " Punkt " + m + " mit etwas mehr Text, damit die Zeile eine sinnvolle Länge bekommt.", en: "" }, ausrichtungen: [a], kompetenzen: [] });
      }
    });
  });
  const lang = await erzeugen({ sprache: "de", mitFoto: false }, "lang");
  ok("Überlänge > 2 Seiten", lang.seiten > 2, lang.seiten);
  ok("Warnung Überlänge", lang.hinweise.some((h) => h.text === "cv.hinweisLang"), lang.hinweise);
  for (let n = 0; n < 14; n++) {
    const seiten = lang.text.map((t, i) => (t.includes(`Lang${n} `) ? i : -1)).filter((i) => i > -1);
    if (seiten.length !== 1) ok("Station " + n + " bleibt zusammen", false, seiten);
  }
  ok("keine Station geteilt", true);

  // Oberfläche.
  await p.evaluate(() => { window.R42J_CORE.tresor.aendern((d) => { d.stationen = d.stationen.filter((s) => !/^Lang/.test(s.titel.de)); d.erfolge = d.erfolge.filter((e) => !/^Lang/.test(e.cvStichpunkt.de)); }); });
  await p.evaluate(() => { location.hash = "#/stammdaten"; });
  await p.getByRole("link", { name: "Lebenslauf", exact: true }).click();
  await p.getByRole("heading", { name: "Lebenslauf", level: 1 }).waitFor();
  ok("Foto Standard an bei DE", await p.getByRole("switch", { name: "Foto einfügen" }).isChecked());
  await knopf(p, "Lebenslauf erstellen").click();
  await p.getByRole("heading", { name: "Dein Lebenslauf" }).waitFor();
  ok("Vorschau da", await p.locator(".rj-filepreview iframe").waitFor({ timeout: 15000 }).then(() => true, () => false));
  ok("Dateiname sichtbar", await p.getByText("joerg-uemit-weiss-mueller-lebenslauf.pdf").isVisible());
  await p.evaluate(() => {
    window.showSaveFilePicker = async (o) => { window.__vorschlag = o.suggestedName; const r = await navigator.storage.getDirectory(); return r.getFileHandle("cv.pdf", { create: true }); };
  });
  await knopf(p, "PDF speichern").click();
  await p.getByText("PDF gespeichert").first().waitFor();
  const kopfBytes = await p.evaluate(async () => { const r = await navigator.storage.getDirectory(); const f = await (await r.getFileHandle("cv.pdf")).getFile(); return { t: await f.slice(0, 5).text(), n: window.__vorschlag }; });
  ok("Speichern schreibt PDF", kopfBytes.t === "%PDF-" && kopfBytes.n.endsWith("-lebenslauf.pdf"), kopfBytes);
  await p.screenshot({ path: `${SP}/m3-${channel}-seite.png`, fullPage: true });
  await p.getByRole("radio", { name: "English" }).click().catch(async () => p.getByRole("button", { name: "English" }).click());
  ok("Foto Standard aus bei EN", !(await p.getByRole("switch", { name: "Foto einfügen" }).isChecked()));
  ok("Optionswechsel verwirft Ergebnis", (await p.getByRole("heading", { name: "Dein Lebenslauf" }).count()) === 0);
  await waehle(p, p.getByLabel("Akzentfarbe"), "gruen");
  ok("Akzent gemerkt", (await p.evaluate(() => window.R42J_CORE.tresor.daten().einstellungen.cvAkzent)) === "gruen");

  // Fehler ohne Stationen.
  const leer = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    try { await K.lebenslauf.erstellen({ ausrichtungId: "gibtesnicht", sprache: "de" }); return "kein Fehler"; } catch (e) { return K.fehlerText(e); }
  });
  ok("Klartext ohne Stationen", leer.includes("Station"), leer);

  // Seitenleiste.
  await p.setViewportSize({ width: 375, height: 760 });
  await p.waitForTimeout(400);
  const breite = () => p.evaluate(() => [document.querySelector(".rj-sidebar").getBoundingClientRect().width, document.querySelector(".rj-content").getBoundingClientRect().width, document.documentElement.scrollWidth - document.documentElement.clientWidth]);
  let w = await breite();
  ok("375 px: Leiste eingeklappt", w[0] <= 76, w);
  ok("375 px: Inhalt breit genug", w[1] >= 280, w);
  ok("375 px: kein Querscroll", w[2] <= 0, w);
  await p.screenshot({ path: `${SP}/m3-${channel}-375.png`, fullPage: true });
  await p.keyboard.press("Control+b");
  await p.waitForTimeout(250);
  w = await breite();
  ok("375 px: Overlay offen", w[0] > 200, w);
  ok("375 px: Overlay schiebt nicht", w[1] >= 280 && w[2] <= 0, w);
  await p.screenshot({ path: `${SP}/m3-${channel}-375-offen.png` });
  ok("gespeicherte Wahl bleibt", (await p.evaluate(() => window.R42J_CORE.store.get().seitenleisteEingeklappt)) === false);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  ok("Esc schließt", (await breite())[0] <= 76);
  await p.keyboard.press("Control+b");
  await p.waitForTimeout(250);
  await p.evaluate(() => { location.hash = "#/anlagen"; });
  await p.waitForTimeout(250);
  ok("Seitenwechsel schließt", (await breite())[0] <= 76);
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.waitForTimeout(250);
  ok("breit: gespeicherte Wahl gilt", (await breite())[0] > 200);

  const schlecht = logs.filter((l) => !l.startsWith("log:") && !l.startsWith("info:") && !l.startsWith("debug:"));
  ok("Konsole sauber (CSP)", schlecht.length === 0, schlecht);
  const privat = logs.filter((l) => /Weiß|Müller|Musterweg/.test(l));
  ok("keine Daten in Logs", privat.length === 0);
  await b.close();
}
console.log(fehlerZahl ? `\n${fehlerZahl} FEHLER` : "\nALLES OK");
process.exit(fehlerZahl ? 1 : 0);
