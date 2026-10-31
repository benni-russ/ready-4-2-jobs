// Feedback-Feinschliff: Rahmen, Bearbeiten-Schutz und neue Abläufe. Testdaten frei erfunden.
import { chromium, URLAPP, SP, kanaele } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";

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
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const hin = (p, hash) => p.evaluate((h) => { location.hash = h; }, hash);
const profil = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.R42J_CORE.tresor.daten().profil)));
const krumen = (p) => p.locator(".rj-breadcrumb li").allInnerTexts();

export async function einrichten(ctx) {
  const p = await ctx.newPage();
  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  await p.keyboard.type("Testperson Muster");
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
  await p.evaluate(() => { window.__wahl = "zweiter-ort"; });
  await p.getByRole("button", { name: "Zweiten Ort wählen" }).click();
  await p.getByText("Zweiter Ort: zweiter-ort").waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Testperson");
  await p.getByLabel("Nachname").fill("Muster");
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Wofür bewirbst du dich?" }).waitFor();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  return p;
}

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
  await ctx.addInitScript(stub);
  const logs = [];
  ctx.on("page", (s) => {
    s.on("pageerror", (e) => logs.push("pageerror: " + e.message));
    s.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
  });
  const p = await einrichten(ctx);

  // Rahmen
  ok("Logo nennt den langen Namen", (await p.locator(".rj-logo__sub").first().innerText()) === "Ready 4 2 Jobs");
  ok("Fenstertitel nennt den langen Namen", (await p.title()).includes("Ready 4 2 Jobs"), await p.title());
  ok("Übersicht ohne Breadcrumb", (await p.locator(".rj-breadcrumb").count()) === 0);
  await hin(p, "#/stammdaten/interview");
  await p.locator(".rj-breadcrumb").waitFor();
  const k = await krumen(p);
  ok("Breadcrumb KI-Interview", k.length === 3 && k[1].includes("Stammdaten"), k);
  await p.locator(".rj-breadcrumb a", { hasText: "Stammdaten" }).click();
  await p.waitForFunction(() => location.hash === "#/stammdaten");
  ok("Breadcrumb führt zurück", true);

  await hin(p, "#/uebersicht");
  await p.getByRole("heading", { name: "Übersicht" }).waitFor();
  await p.waitForTimeout(150);
  await p.keyboard.press("Control+k");
  ok("Strg+K fokussiert die Suche", await p.evaluate(() => !!document.activeElement.closest(".rj-searchbar")));
  await p.keyboard.press("Escape");
  await p.locator("main").click({ position: { x: 5, y: 5 } });
  await p.keyboard.press("/");
  ok("/ fokussiert die Suche", await p.evaluate(() => !!document.activeElement.closest(".rj-searchbar")));
  ok("/ landet nicht im Feld", (await p.locator(".rj-searchbar input").inputValue()) === "");
  await p.keyboard.press("Escape");
  const kbd = await p.locator(".rj-searchbar kbd").allInnerTexts();
  ok("Tastenkürzel sichtbar", kbd.includes("Strg+K") && kbd.includes("/"), kbd);

  // Bearbeiten-Schutz
  await hin(p, "#/stammdaten/persoenlich");
  await knopf(p, "Bearbeiten").waitFor();
  ok("Ausgefülltes Formular ist geschützt", (await p.getByLabel("Vorname").count()) === 0);
  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("a/b");
  ok("/ im Feld bleibt ein Zeichen", (await p.getByLabel("Ort").first().inputValue()) === "a/b");
  await p.getByLabel("Ort").first().fill("Musterstadt");
  ok("Entwurf bleibt außerhalb des Tresors", !(await profil(p)).adresse?.ort);

  await p.locator(".rj-sidebar a, .rj-nav a", { hasText: "Wissen" }).first().click();
  await p.getByRole("dialog").waitFor();
  ok("Verlassen fragt nach", await p.getByRole("heading", { name: "Änderungen verwerfen?" }).isVisible());
  ok("Adresse bleibt stehen", (await p.evaluate(() => location.hash)).includes("persoenlich"));
  await knopf(p, "Weiter bearbeiten").click();
  ok("Entwurf übersteht die Rückfrage", (await p.getByLabel("Ort").first().inputValue()) === "Musterstadt");

  // Der abgewiesene Link hinterlässt einen gleichen Verlaufseintrag, darum zweimal zurück.
  await p.goBack();
  await p.goBack();
  await p.getByRole("dialog").waitFor();
  ok("Browser-Zurück fragt nach", true);
  await knopf(p, "Weiter bearbeiten").click();
  await p.waitForTimeout(150);
  ok("Keine Rückfrage-Schleife", (await p.getByRole("dialog").count()) === 0);

  await knopf(p, "Abbrechen").click();
  await knopf(p, "Bearbeiten").waitFor();
  ok("Abbrechen verwirft", !(await profil(p)).adresse?.ort);

  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("Musterstadt");
  await knopf(p, "Speichern").click();
  await p.locator(".rj-savestate[data-stand=gespeichert]").waitFor();
  ok("Speichern schreibt und meldet", (await profil(p)).adresse?.ort === "Musterstadt");

  // Sperren sichert den Entwurf verschlüsselt.
  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("Beispielstadt");
  await p.getByRole("button", { name: "Sperren" }).first().click();
  await p.getByLabel("Passwort", { exact: true }).waitFor();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  ok("Sperre speichert den Entwurf", (await profil(p)).adresse?.ort === "Beispielstadt", await profil(p));

  // Breite Bildschirme
  await p.setViewportSize({ width: 1920, height: 1080 });
  await hin(p, "#/stammdaten/persoenlich");
  await knopf(p, "Bearbeiten").waitFor();
  const breit = await p.evaluate(() => document.querySelector(".rj-content").getBoundingClientRect().width);
  ok("1920 px nutzt die Breite", breit > 1200 && breit <= 1560, breit);
  await p.screenshot({ path: `${SP}/feinschliff-${channel}-1920.png` });

  // Status-Icons, Kompetenzfilter, Punkte im Vergleich
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.bewerbungen.neu({ firma: "Beispiel GmbH", titel: "Sachbearbeitung", ausrichtungId: K.tresor.daten().ausrichtungen[0].id, sprache: "de", anrede: "sie" });
  });
  await hin(p, "#/");
  await p.locator(".rj-appcard").first().waitFor();
  ok("Wenige Einträge ohne Filter", (await p.getByLabel("Firma oder Stelle suchen").count()) === 0 && (await p.locator(".rj-seg button").count()) === 2);
  await p.evaluate(() => { window.R42J_SEITEN.UEBERSICHT_FILTER_AB = 1; });
  await hin(p, "#/einstellungen");
  await hin(p, "#/");
  await p.getByLabel("Firma oder Stelle suchen").waitFor();
  await p.locator("main").getByRole("combobox").first().click();
  ok("Status-Filter mit Icons", (await p.locator(".rj-dropdown [role=option] svg").count()) >= 5);
  await p.keyboard.press("Escape");

  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.stammdaten.speichern("kompetenzen", { id: K.uuid(), name: { de: "Excel" }, synonyme: [], kategorie: "it", ausrichtungen: [] });
    K.stammdaten.speichern("kompetenzen", { id: K.uuid(), name: { de: "Moderation" }, synonyme: [], kategorie: "sozial", ausrichtungen: [] });
  });
  await hin(p, "#/stammdaten/kompetenzen");
  await p.getByText("Moderation").waitFor();
  await p.locator(".rj-filterbar").getByRole("combobox").click();
  await p.getByRole("option", { name: "IT" }).click();
  ok("Kompetenzfilter", (await p.getByText("Moderation").count()) === 0 && (await p.getByText("Excel").count()) === 1);

  const punkte = await p.evaluate(() => {
    const V = window.R42J_CORE.vergleich;
    const k = [{ id: "gehalt", typ: "auto", gewicht: 1 }];
    return V.teilpunkte([{ id: "a", angebot: { bruttoJahr: 40000 } }, { id: "b", angebot: { bruttoJahr: 60000 } }], k, 0).gehalt;
  });
  ok("Teilpunkte vergleichen Angebote", punkte[0] === 0 && punkte[1] === 10, punkte);

  const zweite = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const a = K.tresor.daten().bewerbungen[0];
    const n = K.bewerbungen.neu({ firma: "Andere AG", titel: "Einkauf", ausrichtungId: K.tresor.daten().ausrichtungen[0].id, sprache: "de", anrede: "sie" });
    K.bewerbungen.aendern(n.id, (b) => { b.angebot = { bruttoJahr: 40000 }; });
    return a.id;
  });
  await hin(p, "#/vergleich/angebot/" + zweite);
  await p.getByRole("heading", { name: "Punkte je Kriterium" }).waitFor();
  const zeile = p.locator("tr", { hasText: "Gehalt" }).first();
  ok("Fehlende Angabe ohne Punkte", (await zeile.innerText()).includes("Angabe fehlt"), await zeile.innerText());
  await p.getByRole("spinbutton").first().fill("60000").catch(() => p.locator("main input").first().fill("60000"));
  await p.waitForFunction(() => [...document.querySelectorAll("main tr")].some((t) => /Gehalt/.test(t.innerText) && /10 von 10/.test(t.innerText)));
  ok("Punkte erscheinen beim Tippen", true);

  // Anlagen-Vorschläge
  const vor = await p.evaluate(() => {
    const A = window.R42J_CORE.anlagen;
    return [
      A.vorschlag("Arbeitszeugnis_Muster_2024.pdf"),
      A.vorschlag("scan.pdf", "Zertifikat\ngeboren am 01.02.1990\nMusterstadt, 12. März 2024"),
      A.vorschlag("bewerbungsfoto-2023-06-30.jpg"),
      A.vorschlag("31.02.2024 notiz.pdf"),
    ];
  });
  ok("Vorschlag aus dem Dateinamen", vor[0].kategorie === "zeugnis-arbeit" && vor[0].stichwoerter.join() === "Arbeitszeugnis,Muster,2024" && !vor[0].datum, vor[0]);
  ok("Vorschlag aus dem Text nimmt das späteste Datum", vor[1].kategorie === "zertifikat" && vor[1].datum === "2024-03-12", vor[1]);
  ok("Datum im Dateinamen", vor[2].kategorie === "foto" && vor[2].datum === "2023-06-30", vor[2]);
  ok("Unmögliches Datum entfällt", !vor[3].datum, vor[3]);

  const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj\n4 0 obj<</Length 53>>stream\nBT /F1 12 Tf 20 100 Td (Zertifikat 12.03.2024) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>";
  await hin(p, "#/anlagen");
  await p.locator('input[type="file"]').setInputFiles({ name: "dokument.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf) });
  await p.getByRole("button", { name: "Vorschlag prüfen" }).waitFor({ timeout: 15000 });
  const anlage = await p.evaluate(() => window.R42J_CORE.tresor.daten().anlagen.at(-1));
  ok("PDF-Inhalt liefert den Vorschlag", anlage.kategorie === "zertifikat" && anlage.datum === "2024-03-12", anlage);
  await p.getByRole("button", { name: "Vorschlag prüfen" }).click();
  await p.getByRole("dialog").getByLabel("Titel").waitFor();
  await p.keyboard.press("Escape");

  // Katalog mit KI
  await hin(p, "#/vorbereitung/kataloge");
  await p.getByRole("button", { name: "Mit KI erstellen" }).click();
  const dlgKi = p.getByRole("dialog");
  await dlgKi.getByLabel("Thema").fill("Grundlagen Buchhaltung");
  const prompt = await dlgKi.getByLabel("Prompt", { exact: false }).first().inputValue();
  ok("Prompt ohne Profildaten", prompt.includes("Grundlagen Buchhaltung") && !prompt.includes("Testperson") && !prompt.includes("Musterstadt"));
  const antwort = dlgKi.getByPlaceholder(/./).last();
  await antwort.fill("kein json");
  await dlgKi.getByRole("button", { name: "Prüfen und übernehmen" }).click();
  await dlgKi.locator(".rj-alert--danger").waitFor();
  ok("Ungültige Antwort meldet Klartext", true);
  await antwort.fill(JSON.stringify({ fragen: [{ typ: "mc", frage: "Was ist 2+2?", antworten: ["3", "4"], richtig: [1], erklaerung: "Addition" }] }));
  await dlgKi.getByRole("button", { name: "Prüfen und übernehmen" }).click();
  await dlgKi.getByRole("button", { name: "Katalog speichern" }).click();
  await dlgKi.waitFor({ state: "detached" });
  const eigen = await p.evaluate(() => window.R42J_CORE.fragen.eigene().map((k) => k.datei));
  ok("Katalog liegt in daten/fragen", eigen.includes("Grundlagen-Buchhaltung.json"), eigen);

  // Meldungen liegen nie auf einer Aktion.
  await hin(p, "#/stammdaten/persoenlich");
  await knopf(p, "Bearbeiten").click();
  await p.evaluate(() => window.R42J_CORE.meldung("Probe"));
  await p.locator(".rj-toast").first().waitFor();
  const verdeckt = () => p.evaluate(() => [...document.querySelectorAll(".rj-editbar__aktionen button, .rj-dialog__foot button")].filter((k) => {
    const x = k.getBoundingClientRect();
    return document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2)?.closest(".rj-toast");
  }).length);
  ok("Meldung lässt Speichern frei", (await verdeckt()) === 0);
  await knopf(p, "Abbrechen").click();
  await p.waitForFunction(() => !document.querySelector(".rj-toast"), null, { timeout: 15000 });

  // Speicheranzeige nur bei echtem Speichern.
  const stand = () => p.evaluate(() => window.R42J_CORE.speicherStand.get().stand);
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.waitForFunction(() => window.R42J_CORE.speicherStand.get().stand === "leerlauf", null, { timeout: 8000 });
  await p.evaluate(() => window.R42J_CORE.tresor.aendern(() => {}));
  ok("Ohne Änderung kein Speichern", (await stand()) === "leerlauf", await stand());
  await p.evaluate(() => window.R42J_CORE.tresor.aendern((d) => { d.einstellungen.sperreMinuten = 16; }));
  ok("Änderung zeigt Speichern", (await stand()) === "speichert");
  await p.waitForFunction(() => window.R42J_CORE.speicherStand.get().stand === "gespeichert", null, { timeout: 6000 });
  await p.waitForFunction(() => window.R42J_CORE.speicherStand.get().stand === "leerlauf", null, { timeout: 6000 });
  ok("Gespeichert verschwindet wieder", true);

  // Sprunglink und Taste /
  await hin(p, "#/uebersicht");
  await p.getByRole("heading", { name: "Übersicht", exact: true }).first().waitFor();
  ok("Sprunglink ist erstes Ziel", await p.evaluate(() => document.querySelector("a[href], button, input").className.includes("rj-skiplink")));
  await p.locator(".rj-skiplink").focus();
  await p.keyboard.press("Enter");
  ok("Sprunglink führt zum Inhalt", (await p.evaluate(() => document.activeElement.tagName)) === "MAIN");
  await hin(p, "#/einstellungen");
  await p.getByRole("switch", { name: /Taste \// }).click();
  await hin(p, "#/uebersicht");
  await p.getByRole("heading", { name: "Übersicht", exact: true }).first().waitFor();
  await p.locator("main").focus();
  await p.keyboard.press("/");
  ok("Taste / lässt sich abschalten", (await p.evaluate(() => document.activeElement.tagName)) !== "INPUT");
  ok("Kürzel wird nicht mehr genannt", (await p.locator(".rj-searchbar__tasten kbd").count()) === 1);
  await p.evaluate(() => window.R42J_CORE.tresor.aendern((d) => { d.einstellungen.suchTaste = true; }));

  // Anschreiben: Schritte anklickbar, KI-Knöpfe im passenden Schritt
  const anschreibenId = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen[0].id);
  await hin(p, "#/bewerbungen/" + anschreibenId + "/anschreiben");
  await p.locator(".rj-stepper").getByRole("button", { name: "Inhalt" }).click();
  await p.getByRole("button", { name: "Schreiben mit KI" }).waitFor();
  ok("Schritt per Klick, KI-Entwurf beim Inhalt", (await p.getByRole("button", { name: "Korrigieren mit KI" }).count()) === 0);
  ok("Text gilt als Vorschlag", (await p.getByText("Die Texte sind Vorschläge.").count()) === 1);
  if (process.env.R42J_AUSGABE) await p.screenshot({ path: process.env.R42J_AUSGABE + "/anschreiben-inhalt.png" });
  await p.locator(".rj-stepper").getByRole("button", { name: "Prüfen" }).click();
  await p.getByRole("button", { name: "Korrigieren mit KI" }).waitFor();
  ok("KI-Korrektur beim Prüfen", (await p.getByRole("button", { name: "Schreiben mit KI" }).count()) === 0);

  // Übersicht und Einstellungen
  await hin(p, "#/");
  await p.getByLabel("Firma oder Stelle suchen").waitFor();
  const titel = await p.locator(".rj-filter__titel").allInnerTexts();
  ok("Filter tragen Überschriften", ["Status", "Sortieren", "Ansicht"].every((t) => titel.includes(t)), titel);
  ok("Filter und Sortierung mit Icon", (await p.locator(".rj-filter__titel svg").count()) >= 4);
  ok("Ansicht mit Icons", (await p.locator(".rj-seg button svg").count()) >= 2);
  await hin(p, "#/einstellungen");
  const farbe = p.getByRole("radio", { name: "Petrol" });
  await farbe.check({ force: true });
  ok("Farbschema mit Vorschau", (await p.locator(".rj-scheme__farbe").count()) > 3 && (await p.evaluate(() => window.R42J_CORE.store.get().farbschema)) === "petrol");

  // Migration
  const mig = await p.evaluate(() => {
    const K = window.R42J_CORE;
    return K.migrieren({ schema: 1, einstellungen: {}, bewerbungen: [{ dokumente: { mitFoto: true } }] });
  });
  ok("Migration ergänzt die neuen Felder", mig.schema === 2 && mig.einstellungen.suchTaste === true && mig.bewerbungen[0].dokumente.postversand === false, mig);

  // Wissen: Kategorie und Textwerkzeug
  await hin(p, "#/wissen/neu");
  await p.getByLabel("Titel").fill("Mein Bildartikel");
  const text = p.locator(".rj-texteditor textarea");
  await text.fill("Wort");
  await text.selectText();
  await p.getByRole("button", { name: "Fett" }).click();
  ok("Werkzeug setzt Fett", (await text.inputValue()) === "**Wort**", await text.inputValue());
  await text.press("Control+z");
  ok("Strg+Z nimmt es zurück", (await text.inputValue()) === "Wort", await text.inputValue());
  await text.selectText();
  await p.getByRole("button", { name: "Link einfügen" }).click();
  const dl = p.getByRole("dialog");
  await dl.getByLabel("Adresse").fill("http://beispiel.invalid");
  await knopf(dl, "Einfügen").click();
  await dl.getByText("muss mit https://").waitFor();
  await dl.getByLabel("Adresse").fill("https://beispiel.invalid");
  await knopf(dl, "Einfügen").click();
  await dl.waitFor({ state: "detached" });
  ok("Link eingesetzt", (await text.inputValue()) === "[Wort](https://beispiel.invalid)", await text.inputValue());
  await text.press("Control+End");
  await p.getByRole("button", { name: "Bild einfügen" }).click();
  await p.locator('input[type="file"][accept^="image"]').setInputFiles({ name: "skizze.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
  await dl.getByLabel("Was zeigt das Bild?").fill("Ein Punkt");
  await knopf(dl, "Einfügen").click();
  await dl.waitFor({ state: "detached" });
  await p.locator('.rj-prose img[alt="Ein Punkt"]').waitFor();
  ok("Bild in der Vorschau", true);
  await knopf(p, "Speichern").click();
  ok("Kategorie ist Pflicht", await p.getByText("Wähle eine Kategorie").first().isVisible());
  await p.getByLabel("Kategorie").click();
  await p.getByRole("option", { name: "Neue Kategorie anlegen …" }).click();
  await p.getByLabel("Name der neuen Kategorie").fill("Eigenes");
  await knopf(p, "Speichern").click();
  await p.locator('article img[alt="Ein Punkt"]').waitFor();
  ok("Artikel zeigt Bild nach dem Speichern", true);
  const html = await p.evaluate(() => window.R42J_CORE.wissen.alsHtml("![a](https://beispiel.invalid/x.png)\n\n![b](data:image/svg+xml;base64,PHN2Zy8+)\n\n<img src=x onerror=alert(1)>"));
  ok("Fremde Bilder entfallen", !html.includes("<img"), html);

  // Die ganze Karte in der Übersicht ist klickbar, nicht nur der Name
  await hin(p, "#/uebersicht");
  const karte = p.locator(".rj-appcard").first();
  const box = await karte.boundingBox();
  await p.mouse.click(box.x + box.width - 12, box.y + box.height - 12);
  await p.waitForFunction(() => /#\/bewerbungen\/[^/]+\/lebenslauf/.test(location.hash));
  ok("Klick auf die freie Kartenfläche öffnet den nächsten Schritt", true);
  ok("Offene Schritte haben ein sichtbares Symbol", await p.evaluate(() => !!window.R42J.icons.circle));

  // Fokus bleibt sichtbar: sortierte Spalte und aufklappbare Bereiche
  await hin(p, "#/bewerbungen");
  await p.locator("th button").first().click();
  await p.locator("th button").first().focus();
  await p.keyboard.press("Shift+Tab");
  await p.keyboard.press("Tab");
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok("Sortierte Spalte zeigt den Fokusring", ring === "solid", ring);

  // Bei 320 px (400 % Zoom) läuft nichts seitlich über
  await p.setViewportSize({ width: 320, height: 800 });
  for (const ziel of ["#/vergleich", "#/stammdaten/stationen", "#/einstellungen"]) {
    await hin(p, ziel);
    await p.waitForSelector("h1");
    await p.waitForTimeout(400); // Die Seitenleiste klappt animiert ein
    const zuviel = await p.evaluate(() => ({ px: document.documentElement.scrollWidth - innerWidth, bei: [...document.querySelectorAll("body *")].filter((e) => e.scrollWidth > e.clientWidth && e.clientWidth > 0 && getComputedStyle(e).display !== "inline").slice(0, 8).map((e) => e.tagName + "." + e.className + " " + e.scrollWidth + ">" + e.clientWidth) }));
    ok("Kein Querscrollen bei 320 px: " + ziel, zuviel.px <= 0, zuviel);
  }
  await p.setViewportSize({ width: 1280, height: 800 });

  // Nach dem Versand gibt es keinen nächsten Schritt mehr, auch wenn Dokumente fehlen
  const versendet = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const b = K.tresor.daten().bewerbungen[0];
    K.bewerbungen.statusSetzen(b.id, "versendet", new Date().toISOString());
    return b.id;
  });
  await hin(p, "#/uebersicht");
  const gesendet = p.locator(".rj-appcard", { has: p.locator(`a[href="#/bewerbungen/${versendet}/details"]`) });
  await gesendet.waitFor();
  ok("Versendete Karte führt zu Details, ohne „Als Nächstes“", (await gesendet.locator(".rj-appcard__naechster").count()) === 0 && (await gesendet.locator(".rj-appcard__schritte").count()) === 0);

  // Einstellungen füllen die Breite
  await p.setViewportSize({ width: 1920, height: 1080 });
  await hin(p, "#/einstellungen");
  await p.waitForSelector(".rj-cards");
  const spalten = await p.evaluate(() => {
    const k = [...document.querySelectorAll(".rj-cards > .rj-card")].map((x) => x.getBoundingClientRect());
    return { nebeneinander: k.some((a, i) => k.some((b, j) => i !== j && a.top === b.top)), ueberlauf: document.documentElement.scrollWidth > innerWidth };
  });
  ok("Einstellungen nutzen bei 1920 px mehrere Spalten", spalten.nebeneinander && !spalten.ueberlauf, spalten);
  await hin(p, "#/wissen/star-methode");
  await p.waitForSelector(".rj-wissen-artikel");
  const mitte = await p.evaluate(() => {
    const a = document.querySelector(".rj-wissen-artikel").getBoundingClientRect();
    const m = document.querySelector(".rj-main, main").getBoundingClientRect();
    return Math.abs(a.left + a.width / 2 - (m.left + m.width / 2));
  });
  ok("Wissen-Artikel steht mittig", mitte < 20, mitte);
  await p.setViewportSize({ width: 1280, height: 800 });

  // Anlagen und Postversand
  const v = await p.evaluate(() => window.R42J_CORE.anlagen.vorschlagFuer({ id: "x", mime: "image/png", dateiname: "Arbeitszeugnis_2021.png" }));
  ok("Vorschlag für gespeicherte Anlage", v.kategorie === "zeugnis-arbeit" && v.stichwoerter.includes("2021"), v);
  const post = await p.evaluate(() => {
    const d = { absender: "A", empfaenger: ["Firma", "Str. 1", "12345 Ort"], ruecksende: "A · B · C", postversand: true, ort: "Ort", datum: "1.1.", betreff: "B", anrede: "H", absaetze: ["T"], gruss: "G", name: "N", anlagen: [] };
    const inhalt = window.R42J_CORE.anschreibenVorlage(d).content;
    const f = inhalt.find((x) => x.text === "Firma\nStr. 1\n12345 Ort");
    return { y: f.absolutePosition.y, marken: inhalt.find((x) => x.canvas).canvas.length, ruecksende: inhalt.some((x) => x.text === "A · B · C") };
  });
  ok("Postversand: Anschrift im Sichtfenster", Math.abs(post.y - (62.7 * 72) / 25.4) < 0.1, post);
  ok("Postversand: Marken und Rücksendeangabe", post.marken === 3 && post.ruecksende, post);
  const kopf = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const pr = K.tresor.daten().profil;
    const alt = [pr.telefon, pr.email];
    pr.telefon = "0123 456789";
    pr.email = "test@example.org";
    const zeilen = K.anschreiben.fertig(K.tresor.daten().bewerbungen[0]).absender.split("\n");
    pr.telefon = alt[0];
    pr.email = alt[1];
    return zeilen;
  });
  ok("Briefkopf: Kontakt in zweiter Zeile", kopf.length === 2 && kopf[1] === "0123 456789 · test@example.org" && !kopf[0].includes("@"), kopf);

  // Neuladen bleibt angemeldet, Sperren nicht. Der Schlüssel liegt nie im Klartext.
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await hin(p, "#/einstellungen");
  await p.reload();
  await p.waitForSelector(".rj-shell");
  ok("Neuladen bleibt angemeldet", await p.evaluate(() => window.R42J_CORE.tresor.offen()));
  const sitzung = await p.evaluate(() => {
    const s = JSON.parse(sessionStorage.getItem("r42j.sitzung"));
    return { laenge: s.verpackt.length, felder: Object.keys(s).sort().join() };
  });
  ok("Sitzung hält nur Verpacktes", sitzung.felder === "id,verpackt,zuletzt" && sitzung.laenge > 44, sitzung);
  await p.evaluate(() => { const s = JSON.parse(sessionStorage.getItem("r42j.sitzung")); s.zuletzt -= 31 * 1000; sessionStorage.setItem("r42j.sitzung", JSON.stringify(s)); });
  ok("Gemerkte Sitzung bleibt nur kurz gültig", await p.evaluate(async () => (await window.R42J_CORE.sitzung.fortsetzen()) === null));
  await p.reload();
  await p.getByRole("button", { name: /Testperson Muster/ }).waitFor();
  await p.getByRole("button", { name: /Testperson Muster/ }).click();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  // Wie ein wiederhergestellter Tab: sessionStorage ist noch da, aber es war kein Neuladen.
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.goto("about:blank");
  await p.goto(URLAPP);
  await p.getByRole("button", { name: /Testperson Muster/ }).waitFor();
  ok("Ohne Neuladen fragt R42J nach dem Passwort", !(await p.evaluate(() => window.R42J_CORE.tresor.offen())));
  ok("Ohne Neuladen ist die Sitzung gelöscht", (await p.evaluate(() => sessionStorage.getItem("r42j.sitzung"))) === null);
  await p.getByRole("button", { name: /Testperson Muster/ }).click();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  // Countdown vor der automatischen Sperre
  // Im Hintergrund warnt der Tab schon drei Minuten vorher, ohne Countdown im Fenster.
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    window.R42J_CORE.sperreVerlaengern();
    window.R42J_CORE.tresor.daten().einstellungen.sperreMinuten = 2.5;
  });
  await p.waitForFunction(() => document.title === "R42J sperrt sich gleich");
  ok("Hintergrund-Tab warnt früher", (await p.locator(".rj-sperrcountdown").count()) === 0);
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  ok("Zurück im Tab endet die frühe Warnung", (await p.title()).includes("Ready 4 2 Jobs"), await p.title());
  await p.evaluate(() => { window.R42J_CORE.tresor.daten().einstellungen.sperreMinuten = 1.05; });
  const weiter = p.getByRole("button", { name: "Weiterarbeiten" });
  await weiter.waitFor();
  ok("Tab-Titel warnt", (await p.title()) === "R42J sperrt sich gleich", await p.title());
  ok("Countdown zählt", /^R42J sperrt sich in 0:\d\d|^R42J sperrt sich in 1:00/.test(await p.locator(".rj-sperrcountdown strong").innerText()));
  ok("Countdown wird nur einmal angesagt", (await p.locator('.rj-sperrcountdown [role="alert"]').count()) === 1 && (await p.locator('.rj-sperrcountdown [role="timer"]').getAttribute("aria-live")) === "off");
  await weiter.evaluate((k) => k.click());
  ok("Weiterarbeiten bricht den Countdown ab", (await weiter.count()) === 0 && (await p.evaluate(() => window.R42J_CORE.tresor.offen())));
  await p.waitForFunction(() => document.title.includes("Ready 4 2 Jobs"));
  ok("Tab-Titel kehrt zurück", true);
  await weiter.waitFor();
  await p.mouse.move(300, 300);
  await p.mouse.move(320, 320);
  await weiter.waitFor({ state: "detached" });
  ok("Mausbewegung bricht den Countdown ab", true);
  await p.evaluate(() => { window.R42J_CORE.tresor.daten().einstellungen.sperreMinuten = 0.02; });
  await p.waitForFunction(() => !window.R42J_CORE.tresor.offen());
  await p.getByLabel("Passwort", { exact: true }).waitFor();
  ok("Ohne Reaktion sperrt R42J", (await p.locator(".rj-sperrcountdown").count()) === 0);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  await p.evaluate(() => { window.R42J_CORE.tresor.daten().einstellungen.sperreMinuten = 10; });
  // Der Name unter dem Brief lässt sich je Bewerbung ändern, leer gilt wieder der aus dem Profil.
  const briefName = () => p.evaluate(() => {
    const K = window.R42J_CORE;
    return K.anschreiben.fertig(K.tresor.daten().bewerbungen[0]).name;
  });
  const nameVorher = await briefName();
  await hin(p, "#/bewerbungen/" + anschreibenId + "/anschreiben");
  await p.getByRole("button", { name: "Unterschrift" }).click();
  await p.getByLabel("Name unter dem Brief").fill("Dr. Testperson Muster");
  ok("Name unter dem Brief geändert", (await briefName()) === "Dr. Testperson Muster");
  await p.getByLabel("Name unter dem Brief").fill("");
  ok("Leerer Name fällt auf das Profil zurück", (await briefName()) === nameVorher);

  await p.evaluate(() => window.R42J_CORE.jetztSperren());
  await p.waitForFunction(() => !window.R42J_CORE.tresor.offen());
  ok("Sperren löscht die Sitzung", (await p.evaluate(() => sessionStorage.getItem("r42j.sitzung"))) === null);
  await p.reload();
  await p.getByRole("button", { name: /Testperson Muster/ }).waitFor();
  ok("Nach dem Sperren fragt R42J wieder", !(await p.evaluate(() => window.R42J_CORE.tresor.offen())));

  ok("Keine Fehler in der Konsole", logs.length === 0, logs);
  await b.close();
}
console.log(fehlerZahl ? fehlerZahl + " FEHLER" : "ALLES OK");
process.exit(fehlerZahl ? 1 : 0);
