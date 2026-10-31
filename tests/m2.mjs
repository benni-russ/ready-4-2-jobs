import { chromium, URLAPP, SP, kanaele, pdfInfo, profilWaehlen } from "./hilfen.mjs";

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
const lesen = (p, pfad) => p.evaluate(async (pfad) => {
  let d = await navigator.storage.getDirectory();
  const t = pfad.split("/");
  for (const s of t.slice(0, -1)) d = await d.getDirectoryHandle(s);
  const f = await (await d.getFileHandle(t[t.length - 1])).getFile();
  return new TextDecoder("latin1").decode(await f.arrayBuffer());
}, pfad);
const liste = (p, pfad) => p.evaluate(async (pfad) => {
  let d = await navigator.storage.getDirectory();
  for (const s of pfad.split("/")) d = await d.getDirectoryHandle(s);
  const n = []; for await (const e of d.values()) n.push(e.name); return n;
}, pfad);
const daten = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.R42J_CORE.tresor.daten())));
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const dlg = (p) => p.locator(".rj-dialog");
async function speichern(p) { await dlg(p).getByRole("button", { name: "Speichern" }).click(); await dlg(p).waitFor({ state: "detached" }); }
async function reiter(p, name) { await p.getByRole("tab", { name }).click(); }
async function scr(p, name) { await p.screenshot({ path: `${SP}/m2-${name}.png`, fullPage: true }); }
async function neuLaden(p) {
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.goto("about:blank"); await p.goto(URLAPP);
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
}
function pdf(text) {
  return Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj\n4 0 obj<</Length ${text.length + 20}>>stream\nBT (${text}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
}
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
  ok("Stepper 8 Schritte", (await p.locator(".rj-stepper > *, .rj-stepper li").count()) >= 8);
  await scr(p, `${channel}-onb7`);
  await p.setViewportSize({ width: 375, height: 760 });
  await p.setViewportSize({ width: 1920, height: 1080 });
  ok("Onboarding nutzt die Breite", (await p.locator("main").evaluate((e) => e.getBoundingClientRect().width)) > 1000);
  if (process.env.R42J_AUSGABE) await p.screenshot({ path: process.env.R42J_AUSGABE + "/onboarding-1920.png" });
  await p.setViewportSize({ width: 1280, height: 800 });
  if (process.env.R42J_AUSGABE) await p.screenshot({ path: process.env.R42J_AUSGABE + "/onboarding-1280.png" });
  await p.setViewportSize({ width: 375, height: 700 });
  ok("Onboarding 375 px ohne Querscroll", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await scr(p, `${channel}-onb7-375`);
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.getByLabel("Vorname").fill("Testperson");
  await p.getByLabel("Nachname").fill("Muster");
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();

  await p.getByRole("heading", { name: "Wofür bewirbst du dich?" }).waitFor();
  await knopf(p, "Zu R42J").click();
  await p.getByText("Bitte fülle dieses Feld aus.").first().waitFor();
  ok("Schritt 8: Pflichtfeld", true);
  await p.getByLabel(/^Name/).fill("Personal");
  await scr(p, `${channel}-onb8`);
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  let d = await daten(p);
  ok("Onboarding legt Ausrichtung an", d.ausrichtungen.length === 1 && d.ausrichtungen[0].name === "Personal");
  ok("Onboarding speichert Profil", d.profil.vorname === "Testperson" && d.profil.nachname === "Muster", d.profil);

  // Stammdaten: Persönliches.
  await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = "#/stammdaten"; });
  await p.getByRole("tab", { name: "Persönliches" }).waitFor();
  await p.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await p.getByLabel("Ort").first().fill("Musterstadt");
  await p.getByLabel("Telefon").fill("+49 30 000000");
  await p.getByLabel("LinkedIn").fill("https://example.org/in/muster");
  await p.getByLabel("Kündigungsfrist").fill("3 Monate");
  d = await daten(p);
  ok("Entwurf bleibt vor dem Speichern draußen", !JSON.stringify(d.profil).includes("Musterstadt"), d.profil);
  await p.getByRole("button", { name: "Speichern", exact: true }).click();
  await p.getByRole("button", { name: "Bearbeiten", exact: true }).waitFor();
  await scr(p, `${channel}-persoenlich`);
  d = await daten(p);
  ok("Persönliches gespeichert", JSON.stringify(d.profil).includes("Musterstadt") && JSON.stringify(d.profil).includes("3 Monate"), d.profil);

  // Ausrichtung mit zweiter Ausrichtung.
  await reiter(p, "Ausrichtungen");
  await knopf(p, "Ausrichtung anlegen").click();
  await dlg(p).getByRole("button", { name: "Speichern" }).click();
  await dlg(p).getByText("Bitte fülle dieses Feld aus.").first().waitFor();
  ok("Ausrichtung: Pflichtfeld im Dialog", true);
  await dlg(p).getByLabel(/^Name/).fill("Vertrieb");
  await speichern(p);
  ok("Ausrichtung angelegt", (await daten(p)).ausrichtungen.length === 2);

  // Kompetenz mit Synonym, DE ohne EN.
  await reiter(p, "Kompetenzen");
  await knopf(p, "Kompetenz anlegen").click();
  await dlg(p).getByLabel(/^Name/).first().fill("Entgeltabrechnung");
  await dlg(p).getByPlaceholder("Synonym hinzufügen …").fill("Payroll");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(100);
  ok("Dialog bleibt bei Enter im Tag-Feld offen", await dlg(p).isVisible());
  await scr(p, `${channel}-kompetenz-dialog`);
  await speichern(p);
  d = await daten(p);
  ok("Kompetenz mit Synonym", d.kompetenzen[0]?.synonyme?.[0] === "Payroll", d.kompetenzen);
  await scr(p, `${channel}-kompetenzen`);
  ok("Lücke sichtbar", (await p.getByText("Übersetzung fehlt").count()) > 0 || (await p.locator('[title*="Übersetzung"]').count()) > 0);

  // Station.
  await reiter(p, "Stationen");
  await knopf(p, "Station anlegen").click();
  await dlg(p).getByLabel(/^Bezeichnung/).first().fill("Sachbearbeitung Personal");
  await dlg(p).getByLabel(/^Firma/).fill("Beispiel GmbH");
  await dlg(p).getByLabel(/^Von/).fill("13/2021");
  await dlg(p).getByRole("button", { name: "Speichern" }).click();
  await dlg(p).getByText("kein gültiger Monat").first().waitFor();
  ok("Station: Monat geprüft", true);
  await dlg(p).getByLabel(/^Von/).fill("03/2021");
  await dlg(p).getByLabel(/Läuft noch/).check();
  await scr(p, `${channel}-station-dialog`);
  await speichern(p);
  d = await daten(p);
  ok("Station gespeichert", d.stationen[0]?.von === "2021-03" && d.stationen[0]?.bis === "heute", d.stationen);
  await scr(p, `${channel}-stationen`);

  // Erfolg: Stichpunkt.
  await reiter(p, "Erfolge");
  await knopf(p, "Erfolg anlegen").click();
  await dlg(p).getByLabel(/^Situation/).first().fill("Lohnläufe dauerten zu lange");
  await dlg(p).getByLabel(/^Aktion/).first().fill("Abläufe umgestellt");
  await dlg(p).getByLabel(/^Ergebnis/).first().fill("30 % schneller");
  await dlg(p).getByRole("button", { name: "Aus Aktion und Ergebnis übernehmen" }).click();
  await p.waitForTimeout(100);
  await scr(p, `${channel}-erfolg-dialog`);
  await speichern(p);
  d = await daten(p);
  ok("Erfolg mit Stichpunkt", (d.erfolge[0]?.cvStichpunkt?.de || "").includes("Abläufe umgestellt"), d.erfolge);

  // Zertifikat, Sprache, Interesse im selben Reiter.
  await reiter(p, "Zertifikate & mehr");
  await knopf(p, "Zertifikat anlegen").click();
  await dlg(p).getByLabel(/^Name/).fill("Personalfachkauffrau");
  await dlg(p).getByLabel(/^Aussteller/).fill("Beispiel-Kammer");
  await dlg(p).getByLabel(/^Ausgestellt/).fill("12.05.2022");
  await speichern(p);
  await knopf(p, "Sprache anlegen").click();
  await dlg(p).getByLabel(/^Sprache/).first().fill("Deutsch");
  await speichern(p);
  await knopf(p, "Interesse anlegen").click();
  await dlg(p).getByLabel(/^Interesse/).first().fill("Klettern");
  await speichern(p);
  await scr(p, `${channel}-weiteres`);
  d = await daten(p);
  ok("Zertifikat, Sprache, Interesse", d.zertifikate.length === 1 && d.sprachen.length === 1 && d.interessen.length === 1);

  // Suche über Synonym.
  await p.keyboard.press("Control+k");
  const such = p.locator(".rj-searchbar input");
  await such.waitFor();
  await such.fill("payrol");
  await p.getByText("Entgeltabrechnung").first().waitFor();
  await scr(p, `${channel}-suche`);
  ok("Suche findet Kompetenz über Synonym (mit Tippfehler/Präfix)", true);
  await such.fill("xyzqq");
  await p.getByText(/Nichts gefunden/).waitFor();
  ok("Suche: leeres Ergebnis erklärt", true);
  await such.fill("payroll");
  await p.getByText("Entgeltabrechnung").first().waitFor();
  await p.keyboard.press("Enter");
  await dlg(p).getByRole("heading", { name: "Kompetenz bearbeiten" }).waitFor();
  ok("Enter öffnet den Eintrag", /stammdaten\/kompetenzen\//.test(p.url()));
  await p.waitForFunction(() => document.activeElement.closest(".rj-dialog"));
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" });
  await p.waitForTimeout(100);
  ok("Fokus nach Treffer-Dialog im Inhalt", await p.evaluate(() => document.activeElement.tagName === "MAIN"));

  // Anlagen.
  await p.evaluate(() => { location.hash = "#/anlagen"; });
  await p.getByRole("heading", { name: "Anlagen" }).first().waitFor();
  const GEHEIM = "ZZGEHEIMZZ";
  const eingabe = p.locator('input[type="file"]');
  await eingabe.setInputFiles([
    { name: "zeugnis.pdf", mimeType: "application/pdf", buffer: pdf(GEHEIM) },
    { name: "foto.png", mimeType: "image/png", buffer: PNG },
  ]);
  await p.getByText("Hinzugefügt: 2").waitFor({ timeout: 8000 });
  await eingabe.setInputFiles([{ name: "boese.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ das ist keine PDF") }]);
  await p.getByText(/keine PDF-, JPG- oder PNG-Datei/).waitFor();
  ok("Falscher Dateityp wird abgewiesen", (await daten(p)).anlagen.length === 2);
  await scr(p, `${channel}-anlagen`);
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  d = await daten(p);
  const pdfA = d.anlagen.find((a) => a.mime === "application/pdf");
  const pngA = d.anlagen.find((a) => a.mime === "image/png");
  ok("Metadaten", pdfA?.seiten === 1 && pdfA.dateiname === "zeugnis.pdf", pdfA);
  const profilDir = (await liste(p, "r42j/daten")).find((n) => /^[0-9a-f-]{36}$/.test(n));
  const pfadEnc = `r42j/daten/${profilDir}/anlagen/${pdfA.id}.enc`;
  const enc = await lesen(p, pfadEnc);
  ok("Anlage verschlüsselt", enc.length > 0 && !enc.includes(GEHEIM) && !enc.includes("%PDF"));
  // Stammdaten-Verweis auf die Anlage.
  await p.evaluate((id) => { window.R42J_CORE.tresor.aendern((d) => { d.stationen[0].anlagen = [id]; d.profil.foto = id; }); }, pdfA.id);

  // Neustart, Vorschau.
  await neuLaden(p);
  await p.goto("about:blank"); await p.goto(URLAPP + "#/anlagen");
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  await p.getByRole("button", { name: /Vorschau von zeugnis/ }).click();
  await p.locator(".rj-filepreview iframe").waitFor();
  ok("PDF-Vorschau nach Neustart", (await p.locator(".rj-filepreview iframe").getAttribute("src")).startsWith("blob:"));
  await p.waitForTimeout(600);
  await scr(p, `${channel}-vorschau-pdf`);
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" });
  await p.getByRole("button", { name: /Vorschau von foto/ }).click();
  await p.locator(".rj-filepreview img").waitFor();
  const breite = await p.evaluate(async () => { const i = document.querySelector(".rj-filepreview img"); await i.decode(); return i.naturalWidth; });
  ok("Bild-Vorschau entschlüsselt", breite === 1, breite);
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" });

  // Bearbeiten und löschen.
  await p.getByRole("button", { name: /zeugnis bearbeiten/ }).click();
  await dlg(p).getByLabel("Titel").fill("Arbeitszeugnis Beispiel");
  await dlg(p).getByPlaceholder("Stichwort hinzufügen …").fill("wichtig");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(100);
  await speichern(p);
  await p.keyboard.press("Control+k");
  await such.waitFor();
  await such.fill("wichtig");
  await p.getByRole("option", { name: /Arbeitszeugnis Beispiel/ }).waitFor();
  ok("Suche findet Anlage über Tag", true);
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: /Arbeitszeugnis Beispiel löschen/ }).click();
  await dlg(p).getByRole("button", { name: "Löschen" }).click();
  await p.getByText("Arbeitszeugnis Beispiel").first().waitFor({ state: "detached" });
  await p.getByText("Gelöscht").first().waitFor();
  d = await daten(p);
  ok("Löschen entfernt Verweise", d.stationen[0].anlagen.length === 0 && !d.profil.foto, [d.stationen[0].anlagen, d.profil.foto]);
  ok("Löschen entfernt Datei", !(await liste(p, `r42j/daten/${profilDir}/anlagen`)).includes(pdfA.id + ".enc"));

  // KI-Import.
  await p.goto("about:blank"); await p.goto(URLAPP + "#/stammdaten/import");
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.getByRole("heading", { name: "Lebenslauf importieren" }).first().waitFor();
  const lebenslauf = "Testperson Muster\nMusterweg 3, 12345 Musterstadt\ntest@example.org\n+49 170 1234567\nSachbearbeitung bei Beispiel GmbH";
  await p.getByLabel("Dein Lebenslauf als Text").fill(lebenslauf);
  await p.waitForTimeout(100);
  const prompt = await p.locator(".rj-prompt, .rj-promptpanel, pre").first().innerText().catch(() => "");
  const voll = prompt + (await p.locator(".rj-prompt textarea").first().inputValue().catch(() => ""));
  ok("Prompt maskiert", voll.includes("{{") && !voll.includes("test@example.org") && !voll.includes("+49 170 1234567"), voll.slice(-300));
  await scr(p, `${channel}-import`);
  const antwortFeld = p.getByLabel("Antwort", { exact: false }).last();
  async function pruefe(text) {
    await antwortFeld.fill(text);
    await p.getByRole("button", { name: "Prüfen und übernehmen" }).click();
    await p.waitForTimeout(150);
  }
  await pruefe("Tut mir leid, das kann ich nicht.");
  await p.getByText(/Datenblock/).first().waitFor();
  ok("KI: Antwort ohne JSON verständlich", true);
  await pruefe('```json\n{"profil": {"vorname": "x"');
  await p.getByText(/unvollständig oder fehlerhaft/).first().waitFor();
  ok("KI: kaputtes JSON verständlich", true);
  await pruefe('{"sprache":"de","stationen":[{"typ":"beruf","titel":"x"}]}');
  await p.getByText(/fehlt/).first().waitFor();
  ok("KI: fehlendes Pflichtfeld verständlich", (await p.locator(".rj-alert").first().innerText()).includes("organisation") || (await p.locator(".rj-alert").first().innerText()).includes("Eintrag 1"));
  await scr(p, `${channel}-import-fehler`);
  await pruefe('Gerne, hier ist das Ergebnis:\n```json\n{"sprache":"de","profil":{"vorname":"{{VORNAME}}","nachname":"{{NACHNAME}}","titel":"Dr.","email":"{{EMAIL}}","telefon":"{{TELEFON}}"},"stationen":[{"typ":"beruf","titel":"Sachbearbeitung","organisation":"Beispiel AG","von":"2019-01","bis":"2021-02"}],"kompetenzen":[{"name":"Excel","synonyme":["Tabellenkalkulation"],"kategorie":"it"}],"zertifikate":[],"sprachen":[{"sprache":"Englisch","niveau":"B2"}],"interessen":[]}\n```\nViel Erfolg.');
  await p.getByText(/Die Antwort passt/).first().waitFor();
  await p.waitForTimeout(100);
  await scr(p, `${channel}-import-vorschau`);
  await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await p.waitForTimeout(300);
  d = await daten(p);
  ok("KI: übernommen", d.stationen.some((s) => s.organisation === "Beispiel AG") && d.kompetenzen.some((k) => JSON.stringify(k.name).includes("Excel")), d.stationen.length);
  ok("KI: Platzhalter zurück / Vorhandenes bleibt", d.profil.vorname === "Testperson" && d.profil.titel === "Dr." && !JSON.stringify(d).includes("{{"), d.profil);

  // Backup mit Anlage.
  const vorPng = pngA.id;
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  const backupNamen = await p.evaluate(() => Object.keys(window.R42J_CORE.backup || {}));
  console.log("  backup-api", backupNamen.join(","));

  // Sperren entfernt Index.
  await p.keyboard.press("Control+k");
  await such.waitFor(); await such.fill("excel");
  await p.getByText("Excel").first().waitFor();
  await p.keyboard.press("Escape");
  await p.evaluate(() => { location.hash = "#/einstellungen"; }); await p.getByRole("button", { name: "Jetzt sperren" }).click();
  await p.getByLabel("Passwort", { exact: true }).waitFor();
  ok("Sperren: Suche nicht mehr erreichbar", (await p.locator(".rj-shell").count()) === 0);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");

  // Englisch und schmale Fenster, dunkler Modus.
  await p.goto("about:blank"); await p.goto(URLAPP + "#/stammdaten/stationen");
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  await p.setViewportSize({ width: 375, height: 760 });
  await p.waitForTimeout(300);
  for (const s of ["persoenlich", "stationen", "kompetenzen", "weiteres"]) {
    await p.evaluate((s) => { location.hash = "#/stammdaten/" + s; }, s);
    await p.waitForTimeout(150);
    const q = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`375 px ohne Querscroll: ${s}`, q <= 0, q);
    await scr(p, `${channel}-375-${s}`);
  }
  await p.evaluate(() => { location.hash = "#/anlagen"; });
  await p.waitForTimeout(150);
  ok("375 px ohne Querscroll: anlagen", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.evaluate(() => { window.R42J.setTheme("dark"); location.hash = "#/stammdaten/kompetenzen"; });
  await p.waitForTimeout(150);
  await scr(p, `${channel}-dark`);
  await p.evaluate(() => window.R42J.setTheme("light"));
  await p.evaluate(() => window.R42J_CORE.setSprache ? window.R42J_CORE.setSprache("en") : null);

  const schlecht = logs.filter((l) => !l.startsWith("log:") && !l.startsWith("info:") && !l.startsWith("debug:"));
  ok("Konsole sauber", schlecht.length === 0, schlecht);
  await b.close();
}
console.log(fehlerZahl ? `\n${fehlerZahl} FEHLER` : "\nALLES OK");
process.exit(fehlerZahl ? 1 : 0);
