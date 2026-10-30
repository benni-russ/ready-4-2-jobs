// M4: Bewerbung von der Stelle bis zum Versand. Testdaten frei erfunden.
import { writeFileSync } from "node:fs";
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

// Minimaler MIME-Parser: Prüft die Datei von außen, statt dem Erzeuger zu glauben.
function emlParsen(puffer) {
  const text = puffer.toString("latin1");
  const trenner = text.indexOf("\r\n\r\n");
  const kopfRoh = text.slice(0, trenner).replace(/\r\n[ \t]+/g, " ");
  const kopf = Object.fromEntries(kopfRoh.split("\r\n").map((z) => [z.slice(0, z.indexOf(":")).toLowerCase(), z.slice(z.indexOf(":") + 2)]));
  const grenze = /boundary="([^"]+)"/.exec(kopf["content-type"])[1];
  const stuecke = text.slice(trenner + 4).split("--" + grenze);
  const ende = stuecke.pop();
  const teile = stuecke.slice(1).map((s) => {
    const t = s.replace(/^\r\n/, "");
    const i = t.indexOf("\r\n\r\n");
    const kopfTeil = t.slice(0, i);
    const koerper = t.slice(i + 4).replace(/\r\n$/, "");
    return { kopf: kopfTeil, koerper, bytes: Buffer.from(koerper.replace(/\r\n/g, ""), "base64"), zeilen: koerper.split("\r\n") };
  });
  return { kopf, teile, ende, nurCrlf: !/[^\r]\n/.test(text) };
}
function wortDekodieren(s) {
  return s.replace(/=\?UTF-8\?B\?([^?]+)\?=\s*/g, (_, b) => Buffer.from(b, "base64").toString("utf8")).trim();
}

const ANZEIGE = `---
title: Personalreferent (m/w/d)
company: Beispiel Müller AG
source: https://example.org/stelle/42
---
# Personalreferent

Wir suchen Verstärkung. Du bringst Erfahrung im Recruiting mit und kennst dich im Arbeitsrecht aus.
Recruiting ist dein Kernthema. Excel und SAP sind Pflicht, Scrum ist willkommen.`;

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

  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForTimeout(100);
  await p.keyboard.type(NAME);
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Wie soll R42J aussehen?" }).waitFor();
  await knopf(p, "Weiter").click();
  const pwf = p.locator('input[autocomplete="new-password"]');
  await pwf.nth(0).fill(PW);
  await pwf.nth(1).fill(PW);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Sichere deinen" }).waitFor();
  const code = await p.locator(".rj-recovery code").allInnerTexts();
  await p.getByLabel("Die ersten zwei Blöcke").fill(code[0] + " " + code[1]);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "zweiten Ort" }).waitFor({ timeout: 8000 });
  await p.evaluate(() => {
    window.__wahl = "zweiter-ort";
  });
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

  await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const a = K.tresor.daten().ausrichtungen[0].id;
    const u = () => K.uuid();
    const i = (de, en) => ({ de, en: en || de });
    K.tresor.aendern((d) => {
      d.profil.adresse = { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt", land: "Deutschland" };
      d.profil.telefon = "+49 30 000000";
      d.profil.linkedin = "https://example.org/in/muster";
      d.profil.kuendigungsfrist = "3 Monate";
      d.profil.gehaltsvorstellung = "60.000 €";
      d.profil.verfuegbarAb = "2027-01-01";
      const k = (de, syn) => ({ id: u(), name: i(de), synonyme: syn || [], kategorie: "fach", ausrichtungen: [a] });
      const k1 = k("Recruiting", ["Personalgewinnung"]);
      const k2 = k("Arbeitsrecht");
      const k3 = k("Excel");
      d.kompetenzen.push(k1, k2, k3);
      const s = { id: u(), typ: "beruf", titel: i("Personalreferent"), organisation: "Beispiel AG", ort: "Musterstadt", von: "2021-03", bis: "heute", beschreibung: i(""), ausrichtungen: [a], anlagen: [] };
      d.stationen.push(s);
      d.erfolge.push({ id: u(), stationId: s.id, situation: i(""), aufgabe: i(""), aktion: i(""), ergebnis: i(""), cvStichpunkt: i("40 Stellen in 6 Monaten besetzt"), kompetenzen: [k1.id], ausrichtungen: [a], kennzahl: "" });
    });
    await K.tresor.speichernJetzt();
  });

  // Bewerbung aus Markdown anlegen.
  await p.evaluate(() => {
    location.hash = "#/bewerbungen";
  });
  await p.getByRole("heading", { name: "Noch keine Bewerbung" }).waitFor();
  await p.getByRole("link", { name: "Bewerbung anlegen" }).first().click();
  await p.locator('input[type="file"]').setInputFiles({ name: "anzeige.md", mimeType: "text/markdown", buffer: Buffer.from(ANZEIGE, "utf8") });
  await p.getByLabel(/^Firma/).and(p.locator("input")).waitFor();
  await p.waitForFunction(() => [...document.querySelectorAll("input")].some((x) => x.value === "Beispiel Müller AG"));
  ok("Markdown füllt Firma und Titel", true);
  await p.screenshot({ path: `${SP}/m4-${channel}-neu.png`, fullPage: true });
  await p.getByRole("button", { name: "Bewerbung anlegen" }).click();
  await p.getByRole("tab", { name: "Stelle" }).waitFor();

  const zustand = () =>
    p.evaluate(() => {
      const b = window.R42J_CORE.tresor.daten().bewerbungen[0];
      return JSON.parse(JSON.stringify(b));
    });
  const dokument = (art) => p.waitForFunction((art) => !!window.R42J_CORE.tresor.daten().bewerbungen[0].dokumente[art], art, { timeout: 120000 });
  let z = await zustand();
  ok("Bewerbung angelegt", z.firma.name === "Beispiel Müller AG" && z.stelle.link === "https://example.org/stelle/42", z.firma);
  ok("Quelle übernommen", !!z.stelle.quelle, z.stelle.quelle);
  ok("Keywords erkannt", z.keywords.extrahiert.length >= 4, z.keywords.extrahiert);
  ok("Treffer gefunden", z.keywords.treffer.length === 3, z.keywords.treffer);
  ok("Lücken gefunden", z.keywords.fehlend.includes("SAP"), z.keywords.fehlend);
  await p.locator(".rj-ring").waitFor();
  await p.screenshot({ path: `${SP}/m4-${channel}-stelle.png`, fullPage: true });

  // Lücke als Kompetenz anlegen hebt die Passung.
  const vorher = await p.evaluate(() => window.R42J_CORE.keywords.score(window.R42J_CORE.tresor.daten().bewerbungen[0].keywords));
  await p.getByRole("button", { name: "SAP als Kompetenz anlegen" }).click();
  await p.getByRole("button", { name: "SAP als Kompetenz anlegen" }).waitFor({ state: "detached" });
  const nachher = await p.evaluate(() => window.R42J_CORE.keywords.score(window.R42J_CORE.tresor.daten().bewerbungen[0].keywords));
  ok("Lücke wird Treffer", nachher > vorher, { vorher, nachher });

  // KI-Antwort über den Tresor-Workflow: Keyword kommt dazu.
  await p.getByLabel("Name", { exact: true }).fill("Dr. Beispiel");
  await waehle(p, p.getByLabel("Anrede", { exact: true }), "frau");
  await p.getByLabel("Adresse", { exact: true }).fill("Beispiel Müller AG\nHauptstraße 5\n54321 Musterdorf");
  await p.getByText("Anzeige mit einer KI auswerten").click();
  await p.getByRole("textbox", { name: /Antwort/ }).first().fill('{"keywords":["Workday"],"anforderungen":["Erfahrung"],"branche":"Handel"}');
  await p.getByRole("button", { name: /prüfen/i }).first().click();
  await p.getByRole("button", { name: "Übernehmen" }).click();
  z = await zustand();
  ok("KI-Keywords übernommen", z.keywords.manuell.includes("Workday") || z.keywords.fehlend.includes("Workday"), z.keywords);
  ok("KI füllt leere Felder", z.firma.branche === "Handel", z.firma.branche);

  // Lebenslauf als Snapshot.
  await p.getByRole("tab", { name: "Lebenslauf" }).click();
  await p.getByRole("button", { name: "Lebenslauf erstellen" }).click();
  await dokument("lebenslauf");
  z = await zustand();
  ok("Lebenslauf-Snapshot", !!z.dokumente.lebenslauf && z.dokumente.lebenslauf.groesse > 1000, z.dokumente);

  // Anschreiben.
  await p.getByRole("tab", { name: "Anschreiben" }).click();
  await p.getByText("Das Anschreiben passt auf eine Seite.").waitFor({ timeout: 30000 });
  await p.screenshot({ path: `${SP}/m4-${channel}-anschreiben.png`, fullPage: true });
  const brief = await p.locator(".rj-letter").innerText();
  ok("Vorschau: Platzhalter ersetzt", !/\{\{/.test(brief), brief);
  ok("Vorschau: Firma", brief.includes("Beispiel Müller AG"), brief);
  ok("Vorschau: Anrede", brief.includes("Sehr geehrte Frau Beispiel"), brief);
  ok("Vorschau: Erfolg statt Sammelzeile", brief.includes("40 Stellen in 6 Monaten besetzt") && !brief.includes("Stärken zählen"), brief);

  const v0 = await p.locator("textarea").first().inputValue();
  await p.getByRole("button", { name: "Anders formulieren" }).first().click();
  await p.waitForTimeout(100);
  ok("Andere Formulierung wechselt", (await p.locator("textarea").first().inputValue()) !== v0);

  await p.getByRole("switch", { name: "Eintrittstermin nennen" }).click();
  await p.waitForTimeout(100);
  ok("Rahmen in Vorschau", (await p.locator(".rj-letter").innerText()).includes("01.01.2027"));

  await p.getByRole("button", { name: "Anschreiben erstellen" }).click();
  await dokument("anschreiben");
  const pdfAus = async (art, name) => {
    const b64 = await p.evaluate(async (art) => {
      const K = window.R42J_CORE;
      const b = K.tresor.daten().bewerbungen[0];
      const bytes = await K.tresor.anlageLesen(b.dokumente[art].anlageId);
      let s = "";
      for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      return btoa(s);
    }, art);
    const pfad = `${SP}/m4-${channel}-${name}.pdf`;
    writeFileSync(pfad, Buffer.from(b64, "base64"));
    return pdfInfo(pfad);
  };
  const aus = await pdfAus("anschreiben", "anschreiben");
  ok("Anschreiben genau 1 Seite", aus.seiten === 1, aus.seiten);
  ok("Anschreiben echter Text", aus.text[0].includes("Weiß Müller") && aus.text[0].includes("Beispiel Müller AG"), aus.text[0]);
  ok("Anschreiben ohne Platzhalter", !aus.text[0].includes("{{"), aus.text[0]);
  ok("Schrift eingebettet", aus.schriften.every((s) => s[1]), aus.schriften);

  ok("keine rohen Textschlüssel", !/\b(anschreiben|bewerbung|stelle|match)\.[a-z]/.test(await p.locator(".rj-shell").innerText()));

  // Alle drei Bausteinsätze ergeben einen vollständigen Brief.
  const saetze = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const out = [];
    for (const [sprache, anrede] of [["de", "du"], ["en", "sie"], ["de", "sie"]]) {
      const b = JSON.parse(JSON.stringify(K.tresor.daten().bewerbungen[0]));
      K.anschreiben.satzWechseln(b, sprache, anrede);
      for (const a of K.anschreiben.ABSCHNITTE) {
        const v = K.anschreiben.andereFormulierung(b, a);
        b.anschreiben.abschnitte[a] = v.text;
        b.anschreiben.varianten[a] = v.id;
      }
      const r = await K.anschreiben.erstellen(b);
      out.push({ sprache, anrede, seiten: r.seiten, text: K.anschreiben.klartext(b) });
    }
    return out;
  });
  for (const s of saetze) ok(`Satz ${s.sprache}-${s.anrede} vollständig`, s.seiten === 1 && !s.text.includes("{{"), s);
  ok("Du-Satz duzt", /\b(euch|euer|eure|Hallo)\b/i.test(saetze[0].text) && !/\bIhre[rn]?\b/.test(saetze[0].text), saetze[0].text);

  // Bearbeitete Abschnitte überleben den Wechsel.
  const behalten = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const b = JSON.parse(JSON.stringify(K.tresor.daten().bewerbungen[0]));
    b.anschreiben.abschnitte.motivation = "Eigener Text";
    K.anschreiben.satzWechseln(b, "en", "sie");
    return { m: b.anschreiben.abschnitte.motivation, s: b.anschreiben.abschnitte.schluss };
  });
  ok("Satzwechsel behält eigenen Text", behalten.m === "Eigener Text" && !/freue/.test(behalten.s), behalten);

  // Überlänge wird gemeldet.
  const lang = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const b = JSON.parse(JSON.stringify(K.tresor.daten().bewerbungen[0]));
    b.anschreiben.abschnitte.motivation = "Viel Text zur Motivation. ".repeat(300);
    const r = await K.anschreiben.erstellen(b);
    return { seiten: r.seiten, hinweise: r.hinweise.map((h) => h.text) };
  });
  ok("Überlänge gemeldet", lang.seiten > 1 && lang.hinweise.includes("anschreiben.hinweisLang"), lang);

  // Anlagen: 10 Scans, Größe Klein < 5 MB.
  const scans = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const ids = [];
    for (let n = 0; n < 10; n++) {
      const c = document.createElement("canvas");
      c.width = 2480;
      c.height = 3508;
      const g = c.getContext("2d");
      g.fillStyle = "#faf7f0";
      g.fillRect(0, 0, c.width, c.height);
      // Rauschen wie auf einem Papierscan, sonst komprimiert JPEG unrealistisch gut.
      const bild = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < bild.data.length; i += 4) {
        const r = Math.random() * 40;
        bild.data[i] -= r;
        bild.data[i + 1] -= r;
        bild.data[i + 2] -= r;
      }
      g.putImageData(bild, 0, 0);
      g.fillStyle = "#222";
      g.font = "60px sans-serif";
      for (let y = 200; y < 3300; y += 90) g.fillText("Zeugnis " + (n + 1) + " Zeile " + y, 200, y);
      const blob = await new Promise((f) => c.toBlob(f, "image/jpeg", 0.92));
      const png = n === 9;
      let datei;
      if (png) {
        datei = new File([await new Promise((f) => c.toBlob(f, "image/png"))], "scan.png", { type: "image/png" });
      } else if (n % 2) {
        const doc = await window.PDFLib.PDFDocument.create();
        const j = await doc.embedJpg(await blob.arrayBuffer());
        doc.addPage([595, 842]).drawImage(j, { x: 0, y: 0, width: 595, height: 842 });
        datei = new File([await doc.save()], `zeugnis-${n}.pdf`, { type: "application/pdf" });
      } else {
        datei = new File([blob], `zeugnis-${n}.jpg`, { type: "image/jpeg" });
      }
      const a = await K.anlagen.hinzufuegen(datei);
      K.tresor.aendern((d) => {
        d.anlagen.filter((x) => x.id === a.id)[0].kategorie = "zeugnis-arbeit";
      });
      ids.push(a.id);
    }
    await K.tresor.speichernJetzt();
    return ids.length;
  });
  ok("10 Scans abgelegt", scans === 10);

  await p.getByRole("tab", { name: "Anlagen" }).click();
  await p.locator(".rj-size").waitFor({ timeout: 120000 });
  z = await zustand();
  ok("Vorauswahl aktiv", z.dokumente.anlagenAuswahl.length === 10, z.dokumente.anlagenAuswahl.length);

  const titel0 = await p.locator(".rj-filelist .rj-file__name").first().innerText();
  await p.getByRole("button", { name: /nach unten$/ }).first().click();
  await p.waitForTimeout(100);
  ok("Reihenfolge per Knopf", (await p.locator(".rj-filelist .rj-file__name").nth(1).innerText()) === titel0);
  ok("Fokus bleibt in der Liste", await p.evaluate(() => !!document.activeElement.closest(".rj-filelist") || document.activeElement === document.body));

  const groessen = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const ids = K.tresor.daten().bewerbungen[0].dokumente.anlagenAuswahl;
    const out = {};
    for (const stufe of ["original", "mittel", "klein"]) {
      const t0 = performance.now();
      const r = await K.anlagenPdf.erstellen({ ids, stufe, deckblatt: true, titel: "Anlagen", seite: "Seite", name: "Jörg-Ümit Weiß Müller" });
      out[stufe] = { bytes: r.bytes.length, seiten: r.seiten, ms: Math.round(performance.now() - t0), hinweise: r.hinweise.length };
    }
    return out;
  });
  console.log("       Größen", JSON.stringify(groessen));
  ok("Klein < 5 MB bei 10 Scans", groessen.klein.bytes < 5 * 1024 * 1024, groessen.klein);
  ok("Klein kleiner als Mittel", groessen.klein.bytes < groessen.mittel.bytes, groessen);
  ok("Mittel kleiner als Original", groessen.mittel.bytes < groessen.original.bytes, groessen);
  ok("Deckblatt plus 10 Seiten", groessen.klein.seiten === 11, groessen.klein);
  ok("keine Hinweise", groessen.klein.hinweise === 0, groessen.klein);

  await knopf(p, "Klein").click();
  await p.waitForFunction(() => window.R42J_CORE.tresor.daten().bewerbungen[0].dokumente.komprimierung === "klein");
  await p.locator('.rj-size[data-state="ok"]').waitFor({ timeout: 120000 });
  await p.screenshot({ path: `${SP}/m4-${channel}-anlagen.png`, fullPage: true });
  await p.getByRole("switch", { name: "Alles in einer PDF zusammenfassen" }).click();
  await p.getByRole("button", { name: "Anlagen-PDF erstellen" }).click();
  await dokument("gesamtPdf");
  const anl = await pdfAus("anlagenPdf", "anlagen");
  ok("Anlagen-PDF hat Deckblatt", anl.seiten === 11 && anl.text[0].includes("Anlagen"), anl.seiten);
  ok("Inhaltsverzeichnis mit Seitenzahl", /Seite 11/.test(anl.text[0]), anl.text[0]);
  const ges = await pdfAus("gesamtPdf", "gesamt");
  ok("Gesamt-PDF vollständig", ges.seiten === 1 + aus.seiten - 1 + (await pdfAus("lebenslauf", "cv")).seiten + 11, ges.seiten);

  // Versand.
  await p.getByRole("tab", { name: "Versand" }).click();
  await p.getByRole("button", { name: "E-Mail-Entwurf erstellen" }).click();
  await p.locator(".rj-dialog").waitFor();
  await p.screenshot({ path: `${SP}/m4-${channel}-email.png`, fullPage: true });
  await p.locator(".rj-dialog").getByLabel("An", { exact: true }).fill("bewerbung@example.org");
  await p.locator(".rj-dialog").getByLabel("Betreff").fill("Bewerbung als Personalreferent – Müller & Söhne: äöüß €");
  await p.locator(".rj-dialog").getByRole("button", { name: "E-Mail-Entwurf erstellen" }).click();
  await p.locator(".rj-dialog").waitFor({ state: "detached", timeout: 30000 });
  z = await zustand();
  ok("Entwurf gespeichert", z.emails.length === 1, z.emails);
  const eml = Buffer.from(
    await p.evaluate(async () => {
      const K = window.R42J_CORE;
      const b = K.tresor.daten().bewerbungen[0];
      const bytes = await K.tresor.anlageLesen(b.emails[0].anlageId);
      let s = "";
      for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      return btoa(s);
    }),
    "base64",
  );
  writeFileSync(`${SP}/m4-${channel}.eml`, eml);
  const m = emlParsen(eml);
  ok("eml: X-Unsent", m.kopf["x-unsent"] === "1", m.kopf);
  ok("eml: MIME-Version", m.kopf["mime-version"] === "1.0");
  ok("eml: multipart/mixed", /^multipart\/mixed/.test(m.kopf["content-type"]));
  ok("eml: To", m.kopf.to === "bewerbung@example.org", m.kopf.to);
  ok("eml: Betreff UTF-8", /^=\?UTF-8\?B\?/.test(m.kopf.subject) && wortDekodieren(m.kopf.subject) === "Bewerbung als Personalreferent – Müller & Söhne: äöüß €", m.kopf.subject);
  ok("eml: Absender kodiert", wortDekodieren(m.kopf.from).includes("Jörg-Ümit Weiß Müller") && m.kopf.from.includes("<test@example.org>"), m.kopf.from);
  ok("eml: nur CRLF", m.nurCrlf);
  ok("eml: Abschluss-Grenze", m.ende.startsWith("--"));
  ok("eml: Zeilen höchstens 76", m.teile.every((t) => t.zeilen.every((z) => z.length <= 76)));
  const textTeil = m.teile[0];
  ok("eml: Text base64 UTF-8", /text\/plain/.test(textTeil.kopf) && /charset="UTF-8"/.test(textTeil.kopf) && /base64/i.test(textTeil.kopf));
  ok("eml: Text enthält Anrede", textTeil.bytes.toString("utf8").includes("Sehr geehrte Frau Beispiel"), textTeil.bytes.toString("utf8"));
  const anh = m.teile.slice(1);
  ok("eml: Gesamt-PDF statt Einzelteile", anh.length === 1, anh.length);
  ok("eml: Anhang unverändert", anh[0].bytes.subarray(0, 5).toString() === "%PDF-" && anh[0].bytes.length === z.dokumente.gesamtPdf.groesse, anh[0].bytes.length);
  ok("eml: Anhang als attachment", /Content-Disposition: attachment/.test(anh[0].kopf) && /application\/pdf/.test(anh[0].kopf));

  // Header-Injection und Umlaut-Dateiname direkt am Erzeuger.
  const roh = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const bytes = K.eml.erzeugen({ an: "a@example.org\r\nBcc: boese@example.org", betreff: "x\r\nBcc: boese@example.org", text: "t", anhaenge: [{ name: "Lebenslauf Müller.pdf", mime: "application/pdf", bytes: new Uint8Array([1, 2, 3]) }] });
    return new TextDecoder().decode(bytes);
  });
  ok("eml: keine Header-Injection", !/^Bcc:/m.test(roh), roh.slice(0, 300));
  ok("eml: Dateiname RFC 5987", roh.includes("filename*=UTF-8''Lebenslauf%20M%C3%BCller.pdf"));

  // Öffnen legt den Entwurf in daten/export, Sperren räumt ihn weg.
  await p.getByRole("button", { name: "Entwurf zum Öffnen bereitlegen" }).click();
  await p.getByText("Entwurf liegt bereit").waitFor();
  await p.screenshot({ path: `${SP}/m4-${channel}-versand.png`, fullPage: true });
  const exportNamen = () =>
    p.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const r = await root.getDirectoryHandle("r42j");
      const ex = await (await r.getDirectoryHandle("daten")).getDirectoryHandle("export");
      const n = [];
      for await (const k of ex.keys()) n.push(k);
      return n;
    });
  ok("Entwurf im Export", (await exportNamen()).length === 1);

  // Portal-Felder.
  await p.getByRole("button", { name: "Über ein Portal" }).click();
  await p.locator(".rj-copyrow").first().waitFor();
  await p.screenshot({ path: `${SP}/m4-${channel}-portal.png`, fullPage: true });
  ok("Portal: Datum lesbar", (await p.locator(".rj-copyrow").filter({ hasText: "Eintrittstermin" }).innerText()).includes("01.01.2027"));
  const portalText = await p.locator(".rj-shell").innerText();
  ok("Portal: keine rohen Textschlüssel", !/\b(portal|dokument|bewerbung)\.(?!pdf\b|eml\b)[a-z]/.test(portalText), portalText.match(/\b(portal|dokument|bewerbung)\.[a-z]\S*/g));
  ok("Portal: Felder", (await p.locator(".rj-copyrow").count()) >= 8);
  await p.locator(".rj-copyrow").last().getByRole("button").click();
  await p.waitForTimeout(100);
  const kopiert = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok("Portal: Anschreiben voll kopiert", kopiert.includes("Sehr geehrte Frau Beispiel") && kopiert.length > 300, kopiert.length);

  // Als versendet markieren.
  await p.getByRole("button", { name: "Als versendet markieren" }).click();
  await p.locator(".rj-dialog").getByRole("button", { name: "Als versendet markieren" }).click();
  await p.locator(".rj-dialog").waitFor({ state: "detached" });
  z = await zustand();
  ok("Status versendet", !!z.versendetAm && z.status.some((v) => v.status === "versendet"), z.status);

  // Tresor enthält alles nach Neuladen, keine Klartext-PDFs auf der Platte.
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.getByRole("button", { name: "Sperren" }).first().click();
  await p.getByLabel("Passwort", { exact: true }).waitFor();
  await p.waitForTimeout(300);
  ok("Export beim Sperren geleert", (await exportNamen()).length === 0);
  await p.goto("about:blank");
  await p.goto(URLAPP + "#/bewerbungen");
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  await p.locator("table").waitFor();
  await p.screenshot({ path: `${SP}/m4-${channel}-liste.png`, fullPage: true });
  ok("Liste zeigt Bewerbung", (await p.locator("table").innerText()).includes("Beispiel Müller AG"));
  const nachLaden = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const b = K.tresor.daten().bewerbungen[0];
    const bytes = await K.tresor.anlageLesen(b.dokumente.anschreiben.anlageId);
    return { pdf: new TextDecoder().decode(bytes.subarray(0, 5)) };
  });
  ok("Snapshot nach Neuladen lesbar", nachLaden.pdf === "%PDF-", nachLaden);

  // Löschen entfernt Dokumente und Entwürfe.
  const geloescht = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const b = K.tresor.daten().bewerbungen[0];
    const ids = K.bewerbungen.SNAPSHOTS.filter((a) => b.dokumente[a]).map((a) => b.dokumente[a].anlageId).concat(b.emails.map((e) => e.anlageId));
    await K.bewerbungen.loeschen(b.id);
    let rest = 0;
    for (const id of ids) {
      try {
        await K.tresor.anlageLesen(id);
        rest++;
      } catch (e) {}
    }
    return { rest, anzahl: K.tresor.daten().bewerbungen.length };
  });
  ok("Löschen räumt Dateien weg", geloescht.rest === 0 && geloescht.anzahl === 0, geloescht);

  // Schmales Fenster und dunkles Design.
  const b2 = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen.length);
  ok("Testende: Bewerbung gelöscht", b2 === 0, b2);
  await p.setViewportSize({ width: 375, height: 760 });
  await p.evaluate(() => { location.hash = "#/bewerbungen/neu"; });
  await p.getByRole("heading", { name: "Neue Bewerbung" }).waitFor();
  await p.waitForTimeout(400);
  ok("375 px: kein Querscroll", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.evaluate(() => window.R42J.setTheme("dark"));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SP}/m4-${channel}-375-dunkel.png`, fullPage: true });

  const schlecht = logs.filter((l) => !l.startsWith("log:") && !l.startsWith("info:") && !l.startsWith("debug:"));
  ok("Konsole sauber (CSP)", schlecht.length === 0, schlecht);
  ok("keine Daten in Logs", !logs.some((l) => /Weiß|Müller|Musterweg/.test(l)));
  await b.close();
}
console.log(fehlerZahl ? `\n${fehlerZahl} FEHLER` : "\nALLES OK");
process.exit(fehlerZahl ? 1 : 0);
