// KI-Interview, Import und Übersetzen. Es gibt keine echte KI und keine Netzanfrage: Antworten sind fest.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, URLAPP, SP, kanaele, waehle } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const stub = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle("r42j", { create: true });
    const app = await d.getDirectoryHandle("app", { create: true });
    await app.getFileHandle("version.js", { create: true });
    return d;
  };
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};

const ANTWORT = {
  sprache: "de",
  ausrichtungen: [{ name: "Projektleitung", kurzprofil: "Leitet Projekte im Testbereich.", kernkompetenzen: ["Planung", "Moderation"] }],
  erfolge: [
    {
      station: "S1",
      situation: "Die Ablage war „unübersichtlich“.",
      aufgabe: "Ordnung schaffen",
      aktion: "Neue Struktur eingeführt",
      ergebnis: "Suchzeit halbiert",
      kennzahl: "50 %",
      cvStichpunkt: "Ablage neu strukturiert und Suchzeit halbiert",
      kompetenzen: ["Planung", "Dokumentation"],
      ausrichtungen: ["Projektleitung", "Gibt es nicht"],
    },
    { station: "Unbekannte Station", cvStichpunkt: "Zweiter Erfolg", kompetenzen: ["Abgewaehlt"] },
  ],
  kompetenzen: [
    { name: "Planung", synonyme: ["Projektplanung"], kategorie: "methode", ausrichtungen: ["Projektleitung"] },
    { name: "Abgewaehlt", kategorie: "fach" },
    { name: "excel", kategorie: "it" },
  ],
  interessen: [{ text: "Wandern", ausrichtungen: ["Projektleitung"] }, { text: "wandern" }],
};
const block = (o) => "Hier ist das Ergebnis:\n```json\n" + JSON.stringify(o, null, 2) + "\n```\nViel Erfolg.";
const ganz = block(ANTWORT);

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ locale: "de-DE", viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(stub);
  const anfragen = [];
  ctx.on("request", (r) => {
    if (!r.url().startsWith("file:") && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) anfragen.push(r.url());
  });
  const p = await ctx.newPage();
  const sieht = (t) => p.locator("#app").getByText(t).first().waitFor({ timeout: 3000 }).then(() => true, () => false);
  const leck = [];
  p.on("console", (m) => { if (/Wandern|Suchzeit|Testperson/.test(m.text())) leck.push(m.text()); });
  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).waitFor();
  await p.evaluate(async () => {
    const K = window.R42J_CORE;
    await K.tresor.erstellen("Testperson Muster", "Mein Hund frisst gerne 7 Kekse", K.krypto.neuerCode());
    K.tresor.aendern((d) => {
      d.einstellungen.onboardingSchritt = null;
      d.profil.vorname = "Testperson";
      d.profil.nachname = "Muster";
      d.profil.email = "test@example.org";
      d.stationen.push({ id: "st1", typ: "beruf", titel: { de: "Sachbearbeitung" }, organisation: "Beispielwerk", ort: "", von: "2020-01", ausrichtungen: [], anlagen: [] });
      d.kompetenzen.push({ id: "ko1", name: { de: "Excel" }, synonyme: [], kategorie: "it", ausrichtungen: [] });
    });
    K.nachEntsperren();
  });
  await p.waitForSelector(".rj-shell");
  await p.evaluate(() => window.R42J_CORE.navigieren("stammdaten/interview"));

  await p.getByRole("heading", { name: "KI-Interview" }).waitFor();
  const prompt = () => p.getByLabel("Prompt", { exact: true }).inputValue();
  await p.screenshot({ path: join(SP, channel + "-interview.png"), fullPage: true });
  let t = await prompt();
  ok("Prompt fragt einzeln nach", t.includes("nur eine Frage"));
  ok("Prompt nennt das Format", t.includes('"cvStichpunkt"') && t.includes("```json"));
  ok("Ohne Mitgeben kein Bestand im Prompt", !t.includes("Beispielwerk"));
  ok("Hinweis auf Namen Dritter", await sieht("keine Namen von Kolleginnen"));

  await p.getByLabel("Vorhandene Einträge mitgeben").check();
  t = await prompt();
  ok("Bestand steht im Prompt", t.includes("S1: Sachbearbeitung · Beispielwerk"));

  await p.getByRole("button", { name: "Eigenen Text strukturieren" }).click();
  await p.getByLabel("Dein Text").fill("Testperson Muster erreichst du unter test@example.org und hat Excel genutzt.");
  t = await prompt();
  ok("Eigener Text steht maskiert im Prompt", t.includes("{{VORNAME}}") && t.includes("{{EMAIL}}") && t.includes("Excel genutzt"));
  ok("Keine persönlichen Daten im Prompt", !t.includes("test@example") && !t.includes("Testperson"));
  await p.getByRole("button", { name: "Interview führen" }).click();

  const antwort = p.getByLabel("Antwort hier einfügen");
  const pruefen = p.getByRole("button", { name: "Prüfen und übernehmen" });
  const stand = () => p.evaluate(() => JSON.parse(JSON.stringify(window.R42J_CORE.tresor.daten())));
  const vorher = await stand();

  await pruefen.click();
  ok("Leere Antwort wird erklärt", await sieht("Hier steht noch keine Antwort"));
  await antwort.fill(ganz.slice(0, Math.floor(ganz.length * 0.6)));
  await pruefen.click();
  ok("Abgeschnittene Antwort wird erklärt", await sieht("unvollständig oder fehlerhaft"));
  await antwort.fill(block({ kompetenzen: [{ name: "X", kategorie: "fach|methode" }], erfolge: [{ situation: "ohne Stichpunkt" }] }));
  await pruefen.click();
  ok("Fehlerhafte Antwort nennt Feld", await sieht("„cvStichpunkt“ fehlt"));
  ok("Falscher Wert wird gemeldet", await sieht("Der Wert von „kategorie“"));
  await antwort.fill(block({ interessen: [{ text: "Hallo {{UNBEKANNT}}" }] }));
  await pruefen.click();
  ok("Unbekannter Platzhalter wird erklärt", await sieht("Platzhalter, den R42J nicht kennt"));
  await antwort.fill(block({ interessen: [] }));
  await pruefen.click();
  ok("Leeres Ergebnis wird erklärt", await sieht("enthält keine Einträge"));
  ok("Fehler ändern nichts", JSON.stringify(await stand()) === JSON.stringify(vorher));

  const datei = p.locator('input[type="file"]');
  await datei.setInputFiles({ name: "lebenslauf.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  ok("PDF wird abgelehnt", await sieht("Diese Datei kann R42J nicht lesen"));
  const pfad = join(SP, "antwort.md");
  writeFileSync(pfad, "﻿" + ganz);
  await datei.setInputFiles(pfad);
  await p.waitForFunction(() => document.querySelectorAll("textarea")[1]?.value.includes("Projektleitung") || [...document.querySelectorAll("textarea")].some((x) => !x.readOnly && x.value.includes("Projektleitung")));
  await pruefen.click();

  await p.getByText("Die Antwort passt").waitFor();
  await p.screenshot({ path: join(SP, channel + "-vorschau.png"), fullPage: true });
  ok("Vorschau zählt Dubletten", await sieht("2 schon vorhandene Einträge"));
  ok("Vorschau nennt offene Verweise", await sieht("Gibt es nicht"));
  await p.getByLabel("Abgewaehlt").uncheck();
  await p.getByLabel("Zweiter Erfolg").uncheck();
  await p.getByRole("button", { name: "Keine wählen" }).click();
  ok("Ohne Auswahl keine Übernahme", await p.getByRole("button", { name: "Übernehmen", exact: true }).isDisabled());
  await p.getByRole("button", { name: "Alle wählen" }).click();
  await p.getByLabel("Abgewaehlt").uncheck();
  await p.getByLabel("Zweiter Erfolg").uncheck();
  await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await p.getByRole("tablist", { name: "Stammdaten" }).or(p.getByRole("heading", { name: "Stammdaten" })).first().waitFor();

  const d = await stand();
  const a = d.ausrichtungen.find((x) => x.name === "Projektleitung");
  const planung = d.kompetenzen.find((k) => k.name.de === "Planung");
  const erfolg = d.erfolge[0];
  const nameVon = (id) => d.kompetenzen.find((k) => k.id === id).name.de;
  ok("Gewählte Einträge sind da", a && planung && d.erfolge.length === 1 && d.interessen.length === 1, d.erfolge);
  ok("Abgewählte Einträge fehlen", !d.kompetenzen.some((k) => k.name.de === "Abgewaehlt"));
  ok("Keine Dublette bei Kompetenz", d.kompetenzen.filter((k) => /excel/i.test(k.name.de)).length === 1);
  ok("Station aufgelöst", erfolg.stationId === "st1", erfolg.stationId);
  ok("Kompetenzen aufgelöst", erfolg.kompetenzen.map(nameVon).join() === "Planung,Dokumentation", erfolg.kompetenzen);
  ok("Fehlende Kompetenz angelegt", d.kompetenzen.some((k) => k.name.de === "Dokumentation" && k.kategorie === "sonstige"));
  ok("Ausrichtung aufgelöst", erfolg.ausrichtungen.length === 1 && erfolg.ausrichtungen[0] === a.id && planung.ausrichtungen[0] === a.id);
  ok("Kernkompetenzen aufgelöst", a.kernkompetenzen[0] === planung.id && a.kernkompetenzen.length === 2 && nameVon(a.kernkompetenzen[1]) === "Moderation", a.kernkompetenzen);
  ok("Anführungszeichen im Text erhalten", erfolg.situation.de === "Die Ablage war „unübersichtlich“.", erfolg.situation);
  ok("Datenmodell passt", erfolg.aktion.de === "Neue Struktur eingeführt" && erfolg.kennzahl === "50 %" && erfolg.cvStichpunkt.de.startsWith("Ablage"));

  // Zweiter Durchlauf derselben Antwort legt nichts doppelt an.
  await p.evaluate(() => window.R42J_CORE.navigieren("stammdaten/erfolge"));
  await p.evaluate(() => window.R42J_CORE.navigieren("stammdaten/interview"));
  await p.getByRole("heading", { name: "KI-Interview" }).waitFor();
  await antwort.fill(block({ interessen: [{ text: "WANDERN" }] }));
  await pruefen.click();
  ok("Nur Dubletten werden erklärt", await sieht("schon vorhanden. Es gibt nichts"));

  // DeepL: Link kodiert, ohne dass die App etwas sendet.
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((x) => {
      x.interessen.push({ id: "i2", text: { de: "Lesen & Rätsel/Quiz | 100 % #1" }, ausrichtungen: [] });
      x.interessen.push({ id: "i3", text: { de: "x".repeat(1501) }, ausrichtungen: [] });
      x.interessen.push({ id: "i4", text: { en: "Chess {{VORNAME}} Testperson" }, ausrichtungen: [] });
    });
    K.navigieren("stammdaten/weiteres");
  });
  await p.getByRole("button", { name: /Übersetzungen ergänzen/ }).or(p.getByRole("link", { name: /Übersetzungen ergänzen/ })).first().waitFor();
  const url = await p.evaluate(() => window.R42J_CORE.kiInterview.deepl("Lesen & Rätsel/Quiz | 100 % #1", "de", "en"));
  ok("DeepL-Link kodiert Sonderzeichen", url.startsWith("https://www.deepl.com/translator#de/en/") && !/[ &|#]/.test(url.split("#")[1].slice(6)) && decodeURIComponent(url.split("/en/")[1]) === "Lesen & Rätsel\\/Quiz \\| 100 % #1", url);
  ok("Zu langer Text liefert keinen Link", (await p.evaluate(() => window.R42J_CORE.kiInterview.deepl("x".repeat(1501), "de", "en"))) === null);
  const reihe = p.locator(".rj-card, li, article").filter({ hasText: "Lesen & Rätsel" }).first();
  await reihe.getByRole("button").first().click().catch(() => {});
  const link = p.getByRole("link", { name: /In DeepL öffnen/ });
  await link.first().waitFor();
  ok("Link hat rel", (await link.first().getAttribute("rel")) === "noopener noreferrer");
  ok("Link öffnet neuen Tab", (await link.first().getAttribute("target")) === "_blank");
  ok("Hinweis auf Weitergabe sichtbar", await sieht("geht beim Öffnen an DeepL"));
  await p.screenshot({ path: join(SP, channel + "-deepl.png") });
  await p.keyboard.press("Escape");

  // Fehlende Übersetzungen.
  await p.evaluate(() => {
    window.R42J_CORE.tresor.aendern((x) => {
      x.interessen = x.interessen.filter((i) => i.id !== "i3");
    });
    window.R42J_CORE.navigieren("stammdaten/uebersetzen");
  });
  await p.getByRole("heading", { name: "Fehlende Übersetzungen ergänzen" }).waitFor();
  t = await prompt();
  const felder = await p.evaluate(() => window.R42J_CORE.kiInterview.offen());
  const f = (text) => felder.find((x) => x.text.includes(text));
  ok("Offene Felder gesammelt", felder.length >= 5 && f("Lesen") && f("Chess"), felder.length);
  ok("Übersetzungs-Prompt maskiert", t.includes("{{VORNAME}}") && !t.includes("Testperson"));
  ok("Richtung stimmt", f("Chess").von === "en" && f("Chess").nach === "de");
  await antwort.fill(block({ uebersetzungen: [{ id: "F999", text: "Falsch" }] }));
  await pruefen.click();
  ok("Unbekanntes Feld wird erklärt", await sieht("das im Prompt nicht vorkam"));
  await antwort.fill(block({ uebersetzungen: [{ id: f("Lesen").id }] }));
  await pruefen.click();
  ok("Fehlender Text wird erklärt", await sieht("„text“ fehlt"));
  await antwort.fill(block({ uebersetzungen: [{ id: f("Lesen").id, text: "Reading and puzzles" }, { id: f("Chess").id, text: "Schach {{VORNAME}}" }, { id: f("Wandern").id, text: "Hiking" }] }));
  await pruefen.click();
  await p.getByText("Die Antwort passt").waitFor();
  await p.screenshot({ path: join(SP, channel + "-uebersetzen.png"), fullPage: true });
  ok("Teilantwort wird genannt", await sieht(/Die Antwort enthält 3 von/));
  await p.getByLabel("Hiking").uncheck();
  await p.evaluate(() => window.R42J_CORE.tresor.aendern((x) => { x.interessen.find((i) => i.id === "i2").text.en = "Eigene Fassung"; }));
  await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await p.waitForTimeout(150);
  const e = await stand();
  ok("Vorhandene Fassung bleibt", e.interessen.find((i) => i.id === "i2").text.en === "Eigene Fassung");
  ok("Übersetzung übernommen, Platzhalter zurück", e.interessen.find((i) => i.id === "i4").text.de === "Schach Testperson", e.interessen.find((i) => i.id === "i4").text);
  ok("Abgewählte Übersetzung fehlt", !e.interessen.find((i) => i.text.de === "Wandern").text.en);

  ok("Keine Netzanfrage", anfragen.length === 0, anfragen);
  ok("Keine persönlichen Daten in der Konsole", leck.length === 0, leck.slice(0, 3));
  await b.close();
}
console.log(fehlerZahl ? "FEHLER: " + fehlerZahl : "alles bestanden");
process.exit(fehlerZahl ? 1 : 0);
