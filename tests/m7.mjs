// M7: Vorbereitung. Leitner mit gefälschter Uhr, Katalog-Import, STAR, Unternehmensfragen. Testdaten frei erfunden.
import { join } from "node:path";
import { chromium, URLAPP, SP, kanaele, profilWaehlen } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const NAME = "Testperson Muster";
const TAG1 = new Date("2026-03-10T10:00:00+01:00");
const TAG2 = new Date("2026-03-11T00:30:00+01:00");

const GUELTIG = {
  kategorie: "Testwissen",
  sprache: "de",
  fragen: [
    { id: "a", typ: "karte", frage: "Erfundene Frage eins", antworten: ["Antwort eins"], richtig: [0] },
    { id: "b", typ: "mc", frage: "Erfundene Frage zwei", antworten: ["Ja", "Nein"], richtig: [1], erklaerung: "Darum." },
  ],
};
const KAPUTT_FALSCH = { kategorie: "Kaputt", sprache: "de", fragen: [{ id: "a", typ: "mc", frage: "Frage", antworten: ["Ja", "Nein"], richtig: [5] }] };
const datei = (name, inhalt) => ({ name, mimeType: "application/json", buffer: Buffer.from(typeof inhalt === "string" ? inhalt : JSON.stringify(inhalt)) });

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
const hin = (p, ziel) =>
  p.evaluate((z) => {
    window.location.hash = z;
  }, ziel);

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(stub);
  const p = await ctx.newPage();
  const logs = [];
  const fremd = [];
  p.on("console", (m) => logs.push(m.type() + ": " + m.text()));
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await ctx.route(/^https?:/, (r) => {
    fremd.push(r.request().url());
    return r.abort();
  });
  await p.goto(URLAPP);

  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
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
  await p.getByLabel("Vorname").fill("Jörg");
  await p.getByLabel("Nachname").fill("Weiß Müller");
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  await p.getByRole("heading", { name: "Noch keine Bewerbung" }).waitFor();

  // Kataloge sind alle geladen.
  await p.getByRole("link", { name: "Vorbereitung" }).click();
  await p.getByRole("button", { name: "Interviewfragen lernen" }).waitFor();
  const bestand = await p.evaluate(() => window.R42J_CORE.fragen.gruppen("de").map((g) => [g.kategorie, g.fragen.length]));
  ok("Sechs Kategorien auf Deutsch", bestand.length === 6 && bestand.every((g) => g[1] >= 50), bestand);
  await p.screenshot({ path: join(SP, `m7-lernen-${channel}.png`), fullPage: true });

  // Leitner ohne Oberfläche, jeder Tag über die eigene Uhr.
  const leitner = await p.evaluate(() => {
    const L = window.R42J_CORE.lernen;
    const tag = (t) => new Date(2026, 2, t, 12);
    const wege = [];
    L.bewerten("probe", true, tag(1));
    wege.push({ ...L.stand("probe") });
    L.bewerten("probe", true, tag(3));
    wege.push({ ...L.stand("probe") });
    L.bewerten("probe", true, tag(7));
    wege.push({ ...L.stand("probe") });
    L.bewerten("probe", true, tag(15));
    wege.push({ ...L.stand("probe") });
    L.bewerten("probe", true, tag(31));
    wege.push({ ...L.stand("probe") });
    L.bewerten("probe", false, tag(31));
    wege.push({ ...L.stand("probe") });
    const fragen = [{ kartenId: "probe" }, { kartenId: "neu1" }];
    const heute = L.einteilen(fragen, new Date(2026, 2, 31, 23, 59));
    const morgen = L.einteilen(fragen, new Date(2026, 3, 1, 0, 1));
    L.vergessen(["probe"]);
    return { wege, heute: heute.faellig.length, neu: heute.neu.length, morgen: morgen.faellig.length, weg: L.stand("probe") || null };
  });
  ok("Gewusst steigt in die nächste Box", leitner.wege.slice(0, 5).map((s) => s.box).join() === "2,3,4,5,5", leitner.wege);
  ok("Abstände 2, 4, 8, 16 Tage", leitner.wege.slice(0, 4).map((s) => s.faellig).join() === "2026-03-03,2026-03-07,2026-03-15,2026-03-31", leitner.wege);
  ok("Nicht gewusst: zurück in Box 1, morgen fällig", leitner.wege[5].box === 1 && leitner.wege[5].faellig === "2026-04-01", leitner.wege[5]);
  ok("Bis Mitternacht nicht fällig, danach schon", leitner.heute === 0 && leitner.morgen === 1, leitner);
  ok("Neue Karte zählt als neu", leitner.neu === 1);
  ok("Vergessen entfernt den Stand", leitner.weg === null);

  // STAR, solange die Uhr noch echt läuft.
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((t) => {
      t.erfolge.push({ id: "e1", situation: { de: "Streit im Team um Dienstpläne" }, aufgabe: { de: "Einigung finden" }, aktion: { de: "Gespräch moderiert" }, ergebnis: { de: "Konflikt gelöst" }, tags: [] });
    });
  });
  await p.getByRole("tab", { name: "STAR-Training" }).click();
  await p.getByRole("combobox", { name: "Frage", exact: true }).click();
  await p.locator(".rj-dropdown__suche input").fill("Konflikt");
  await p.getByRole("option", { name: /Konflikt im Team/ }).click();
  await knopf(p, "Frage üben").click();
  await p.getByRole("heading", { name: "Passende Erfolge" }).waitFor();
  ok("Passender Erfolg wird vorgeschlagen", await p.locator("summary").getByText("Gespräch moderiert").isVisible());
  await p.screenshot({ path: join(SP, `m7-star-${channel}.png`), fullPage: true });
  await knopf(p, "Starten").click();
  await p.waitForTimeout(1300);
  await knopf(p, "Pause").click();
  await p.getByLabel("Notiz für das nächste Mal").fill("Ergebnis mit einer Zahl belegen");
  await knopf(p, "Übung speichern").click();
  await p.getByRole("heading", { name: "Bisherige Übungen" }).waitFor();
  const uebung = await p.evaluate(() => window.R42J_CORE.fragen.starVerlauf()[0]);
  ok("Übung mit Dauer und Bewertung gespeichert", uebung.sekunden >= 1 && uebung.bewertung === 3 && uebung.notiz.startsWith("Ergebnis"), uebung);

  // Katalog-Import: kaputte Dateien neben einer gültigen.
  await p.getByRole("tab", { name: "Kataloge" }).click();
  await p.getByRole("heading", { name: "Eigenen Katalog hinzufügen" }).waitFor();
  await p.locator('input[type="file"]').setInputFiles([datei("gut.json", GUELTIG), datei("kaputt.json", "{ das ist kein JSON"), datei("falsch.json", KAPUTT_FALSCH)]);
  await p.getByText("Diese Dateien wurden nicht geladen").waitFor();
  ok("Import bricht nicht ab: gültige Datei geladen", await p.getByRole("cell", { name: "gut.json", exact: true }).isVisible());
  ok("JSON-Fehler in Klartext", await p.getByText("kein gültiges JSON").isVisible());
  ok("Fehler nennt die Frage", await p.getByText("Frage 1: „richtig“").isVisible());
  await p.screenshot({ path: join(SP, `m7-kataloge-${channel}.png`), fullPage: true });

  // Kaputte Datei direkt im Ordner: Laden überspringt sie.
  await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const root = await navigator.storage.getDirectory();
    const liste = [];
    for await (const n of root.keys()) liste.push(n);
    const griff = await K.fs.ordner(K.profile.datenOrdner(), ["fragen"]);
    const f = await griff.getFileHandle("direkt.json", { create: true });
    const w = await f.createWritable();
    await w.write("[1, 2");
    await w.close();
  });
  await knopf(p, "Ordner neu lesen").click();
  await p.getByText("direkt.json").waitFor();
  ok("Kaputte Datei im Ordner wird gemeldet, Katalog bleibt", await p.getByRole("cell", { name: "gut.json", exact: true }).isVisible());
  await p.getByRole("tab", { name: "Lernen" }).click();
  await p.getByText("Übersprungene Katalogdateien mit Fehlern: 1").waitFor();
  ok("Warnung auf der Lernseite", true);
  await p.getByRole("button", { name: "Testwissen lernen" }).waitFor();
  ok("Eigener Katalog erscheint als Kategorie", true);
  await p.getByRole("tab", { name: "Kataloge" }).click();
  await knopf(p, "gut.json löschen").click();
  await p.getByRole("dialog").getByRole("button", { name: "Löschen" }).click();
  await p.getByText("Katalog gelöscht.").waitFor();
  ok("Eigener Katalog lässt sich löschen", (await p.getByRole("cell", { name: "gut.json", exact: true }).count()) === 0);
  await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const griff = await K.fs.ordner(K.profile.datenOrdner(), ["fragen"]);
    await griff.removeEntry("direkt.json");
  });
  await knopf(p, "Ordner neu lesen").click();
  await p.getByRole("tab", { name: "Lernen" }).click();

  // Akzeptanz: Eine falsch beantwortete Karte kommt am Folgetag wieder.
  await p.clock.setFixedTime(TAG1);
  await p.getByRole("button", { name: "Interviewfragen lernen" }).click();
  const erste = await p.locator(".rj-flash__q").innerText();
  await p.screenshot({ path: join(SP, `m7-karte-${channel}.png`), fullPage: true });
  await knopf(p, "Antwort zeigen").click();
  await knopf(p, "Nicht gewusst").click();
  await knopf(p, "Sitzung beenden").click();
  await p.getByRole("button", { name: "Interviewfragen lernen" }).waitFor();
  const amselben = await p.evaluate((frage) => {
    const K = window.R42J_CORE;
    const g = K.fragen.gruppen("de").find((x) => x.kategorie === "interview");
    const f = g.fragen.find((x) => x.frage === frage);
    return { faellig: K.lernen.einteilen(g.fragen).faellig.length, stand: K.lernen.stand(f.kartenId) };
  }, erste);
  ok("Am selben Tag nicht mehr fällig", amselben.faellig === 0 && amselben.stand.box === 1 && amselben.stand.faellig === "2026-03-11", amselben);

  await p.clock.setFixedTime(TAG2);
  await p.getByRole("tab", { name: "STAR-Training" }).click();
  await p.getByRole("tab", { name: "Lernen" }).click();
  await knopf(p, "Fällige lernen (1)").click();
  ok("Falsche Karte erscheint am Folgetag zuerst", (await p.locator(".rj-flash__q").innerText()) === erste);
  await p.waitForFunction(() => document.activeElement.classList.contains("rj-flash__q"));
  await p.keyboard.press("Space");
  await p.waitForFunction(() => document.activeElement.classList.contains("rj-flash__a"));
  await p.keyboard.press("2");
  await p.getByRole("heading", { name: "Sitzung abgeschlossen" }).waitFor();
  ok("Bedienung per Tastatur", true);
  await knopf(p, "Zurück zur Übersicht").click();

  // Auswahlfrage: Falsche Antwort wird aufgelöst, Status nicht nur über Farbe.
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    const g = K.fragen.gruppen("de").find((x) => x.kategorie === "mathe");
    window.__frage = g.fragen.find((f) => f.typ === "mc");
    // Die Reihenfolge ist zufällig, nur Auswahlfragen haben Tasten.
    window.__sitzung = K.lernen.sitzung;
    K.lernen.sitzung = (fragen) => fragen.filter((f) => f.typ === "mc").slice(0, 3);
  });
  await p.getByRole("button", { name: "Mathe & Dreisatz lernen" }).click();
  await p.locator(".rj-quiz button, .rj-quiz input").first().waitFor();
  await p.screenshot({ path: join(SP, `m7-quiz-${channel}.png`), fullPage: true });
  await p.keyboard.press("a");
  await p.getByRole("button", { name: "Weiter", exact: true }).waitFor();
  ok("Auswahlfrage wird nach der Wahl aufgelöst", await p.getByText(/^(Richtig\.|Nicht ganz\.)/).first().isVisible());
  await p.screenshot({ path: join(SP, `m7-quiz-aufgeloest-${channel}.png`), fullPage: true });
  await knopf(p, "Sitzung beenden").click();
  await p.evaluate(() => {
    window.R42J_CORE.lernen.sitzung = window.__sitzung;
  });

  // Unternehmensfragen
  const bid = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const ausrichtungId = K.tresor.daten().ausrichtungen[0].id;
    return K.bewerbungen.neu({ ausrichtungId, sprache: "de", anrede: "sie", firma: "Nordlicht GmbH", titel: "Personalreferent" }).id;
  });
  await hin(p, "#/vorbereitung/unternehmen/" + bid);
  await p.getByRole("heading", { name: "Neue Fragen erstellen" }).waitFor();
  const prompt = await p.locator(".rj-prompt, textarea, pre").first().inputValue().catch(() => "");
  const antwort = JSON.stringify({ fragen: [{ frage: "Wofür steht Nordlicht?", antwort: "Für Personaldienste im Norden", erklaerung: "Laut Website." }, { frage: "Wie viele Standorte gibt es?", antwort: "Drei" }] });
  await p.getByRole("textbox").last().fill(antwort);
  await p.getByRole("button", { name: /prüfen/i }).first().click();
  await p.getByText("Wofür steht Nordlicht?").waitFor();
  await p.screenshot({ path: join(SP, `m7-unternehmen-${channel}.png`), fullPage: true });
  await p.getByRole("button", { name: /übernehmen/i }).first().click();
  await p.getByRole("heading", { name: "Fragen zu Nordlicht GmbH" }).waitFor();
  ok("Unternehmensfragen landen bei der Bewerbung", await p.evaluate((i) => {
    const K = window.R42J_CORE;
    return K.fragen.unternehmensfragen(K.tresor.daten().bewerbungen.find((x) => x.id === i)).length === 2;
  }, bid));
  await p.getByRole("button", { name: /^Fragen lernen/ }).click();
  await knopf(p, "Antwort zeigen").click();
  await knopf(p, "Gewusst").click();
  await knopf(p, "Sitzung beenden").click();
  const ohne = await p.evaluate(async (i) => {
    const K = window.R42J_CORE;
    const ids = K.fragen.unternehmensfragen(K.tresor.daten().bewerbungen.find((x) => x.id === i)).map((f) => f.id);
    const vorher = ids.some((f) => K.lernen.stand(f));
    await K.bewerbungen.loeschen(i);
    return { vorher, danach: ids.some((f) => K.lernen.stand(f)) };
  }, bid);
  ok("Bewerbung löschen entfernt den Lernstand", ohne.vorher && !ohne.danach, ohne);

  // Schmal und dauerhaft
  await hin(p, "#/vorbereitung/lernen");
  await p.getByRole("button", { name: "Interviewfragen lernen" }).waitFor();
  await p.setViewportSize({ width: 390, height: 800 });
  await p.waitForTimeout(400);
  const breite = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("Schmales Fenster ohne seitliches Scrollen", breite <= 0, breite);
  await p.screenshot({ path: join(SP, `m7-schmal-${channel}.png`), fullPage: true });
  await p.setViewportSize({ width: 1280, height: 900 });

  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.goto("about:blank");
  await p.goto(URLAPP + "#/vorbereitung");
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.getByRole("button", { name: "Interviewfragen lernen" }).waitFor();
  const danach = await p.evaluate(() => {
    const d = window.R42J_CORE.tresor.daten();
    return { lernstand: d.lernstand.length, star: d.starTraining.length };
  });
  ok("Nach dem Neuladen ist der Lernstand da", danach.lernstand >= 1 && danach.star === 1, danach);

  ok("Keine Netzanfrage im ganzen Lauf", fremd.length === 0, fremd);
  const probleme = logs.filter((l) => /^(error|pageerror|warning)/.test(l) && !/ERR_FAILED/.test(l));
  ok("Keine Konsolenfehler", probleme.length === 0, probleme.slice(0, 5));
  const leck = logs.filter((l) => /Jörg|Müller|Testperson|Nordlicht/.test(l));
  ok("Keine persönlichen Daten in der Konsole", leck.length === 0, leck.slice(0, 3));
  await b.close();
}

console.log(fehlerZahl === 0 ? "Alles bestanden" : fehlerZahl + " Fehler");
process.exit(fehlerZahl ? 1 : 0);
