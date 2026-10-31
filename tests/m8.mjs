// M8: Checklisten, Wissen, Statistik. Testdaten frei erfunden.
import { join } from "node:path";
import { chromium, URLAPP, SP, kanaele, profilWaehlen } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const NAME = "Testperson Muster";

const EIGENER = `---
title: Mein Testartikel
category: Eigene Notizen
lang: de
---

Ein **eigener** Text mit Gürkchen.

<script>window.__boese = 1</script>
<img src="https://example.com/x.png" onerror="window.__boese = 1">

[Extern](https://example.com/a) [Unsicher](http://example.com/b) [Skript](javascript:window.__boese=1) [Intern](#/wissen/probezeit)
`;

const stub = () => {
  if (typeof FileSystemDirectoryHandle === "undefined") return;
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
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const hin = (p, ziel) =>
  p.evaluate((z) => {
    window.location.hash = z;
  }, ziel);
const wissenDateien = (p) =>
  p.evaluate(async () => {
    const r = await navigator.storage.getDirectory();
    const d = await (await (await r.getDirectoryHandle("r42j")).getDirectoryHandle("daten")).getDirectoryHandle("wissen");
    const n = [];
    for await (const e of d.values()) n.push(e.name);
    return n;
  });
const inWissen = (p, name, text) =>
  p.evaluate(
    async ([name, text]) => {
      const r = await navigator.storage.getDirectory();
      const d = await (await (await r.getDirectoryHandle("r42j")).getDirectoryHandle("daten")).getDirectoryHandle("wissen");
      const w = await (await d.getFileHandle(name, { create: true })).createWritable();
      await w.write(text);
      await w.close();
    },
    [name, text],
  );

async function einloggen(p) {
  await profilWaehlen(p, NAME);
  await p.locator('input[type="password"]').first().fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
}

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(stub);
  const fehler = [];
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => m.type() === "error" && fehler.push(m.text()));

  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.waitForFunction(() => window.R42J_CORE.ablauf.get().phase === "profile");
  ok("Mitgelieferte Artikel werden nicht kopiert", (await wissenDateien(p)).length === 0, await wissenDateien(p));

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
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  ok("Einmal-Checkliste im Onboarding", await p.getByLabel("XING-Profil prüfen").count() === 1);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Jörg");
  await p.getByLabel("Nachname").fill("Weiß Müller");
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");

  await p.evaluate(
    async () => {
      const K = window.R42J_CORE;
      K.tresor.aendern((d) => {
        d.ausrichtungen = [
          { id: "a1", name: "Personalsachbearbeitung" },
          { id: "a2", name: "Büroassistenz" },
        ];
        const jetzt = new Date();
        const tage = (n) => new Date(jetzt.getTime() - n * 864e5).toISOString();
        const neu = (id, firma, ausrichtungId, quelle, verlauf, versendetAm) => ({
          id,
          ausrichtungId,
          firma: { name: firma },
          stelle: { titel: "Sachbearbeitung", quelle },
          status: verlauf.map(([status, t]) => ({ status, datum: tage(t) })),
          versendetAm: versendetAm === undefined ? undefined : tage(versendetAm),
          checkliste: id === "b1" ? { recherche: true, keywords: true } : {},
          termine: [],
          emails: [],
          dokumente: {},
          anschreiben: { abschnitte: {}, varianten: {}, rahmen: {} },
          keywords: { extrahiert: [], treffer: [], fehlend: [], manuell: [], gewichte: {} },
          notizen: "",
          erstellt: tage(60),
        });
        d.bewerbungen = [
          neu("b1", "Erfundene GmbH", "a1", "Indeed", [["vorbereitung", 30], ["versendet", 20], ["gespraech_digital", 10], ["vertrag_erhalten", 5], ["angenommen", 4]], 20),
          neu("b2", "Muster AG", "a1", "indeed ", [["vorbereitung", 30], ["versendet", 20], ["absage", 16]], 20),
          neu("b3", "Beispiel KG", "a2", "StepStone", [["vorbereitung", 30], ["versendet", 3]], 3),
          neu("b4", "Test OHG", "a2", "", [["vorbereitung", 30], ["versendet", 12], ["telefoninterview", 2]], 12),
          neu("b5", "Noch Offen GmbH", "a2", "Indeed", [["vorbereitung", 2]]),
          // Direkt zum Gespräch gesprungen, ohne Versandeintrag: zählt trotzdem als versendet.
          neu("b6", "Sprung SE", "gelöscht", "Indeed", [["vorbereitung", 30], ["gespraech_vor_ort", 8]]),
          neu("b7", "Zurück GmbH", "a1", "Indeed", [["vorbereitung", 30], ["zurueckgezogen", 8]]),
        ];
      });
      await K.tresor.speichernJetzt();
    },
  );

  // Rechnung gegen die Testdaten: versendet b1,b2,b3,b4,b6 = 5, eingeladen b1,b4,b6 = 3.
  const w = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const d = K.tresor.daten();
    const r = K.statistik.auswerten(d.bewerbungen, d.ausrichtungen);
    const f = (l) => l.map((g) => [g.name, g.eingeladen, g.versendet, g.quote.prozent]);
    return { ...r, aus: f(r.proAusrichtung), qu: f(r.proQuelle) };
  });
  ok("Basis", w.gesamt === 7 && w.versendet === 5, w);
  ok("Einladungsquote 3 von 5", w.einladung.teil === 3 && w.einladung.basis === 5 && w.einladung.prozent === 60, w.einladung);
  ok("Zusage 1 von 5", w.zusage.teil === 1 && w.zusage.prozent === 20, w.zusage);
  // Antworten: b1 10 Tage, b2 4, b4 10, b6 0 → 24 / 4.
  ok("Antwortzeit", w.antworten === 4 && w.antwortTage === 6, [w.antworten, w.antwortTage]);
  ok(
    "Quote pro Ausrichtung",
    JSON.stringify(w.aus) === JSON.stringify([["Büroassistenz", 1, 2, 50], ["Personalsachbearbeitung", 1, 2, 50], ["Ohne Ausrichtung", 1, 1, 100]]),
    w.aus,
  );
  ok(
    "Quote pro Quelle, Groß- und Kleinschreibung egal",
    JSON.stringify(w.qu) === JSON.stringify([["Indeed", 2, 3, 67], ["Ohne Angabe", 1, 1, 100], ["StepStone", 0, 1, 0]]),
    w.qu,
  );
  ok("Trichter", w.trichter.map((t) => t.wert).join() === "7,5,3,1,1", w.trichter);
  ok("Ausgang", w.ausgang.absage === 1 && w.ausgang.zurueckgezogen === 1, w.ausgang);
  ok("8 Wochen, 12 Monate", w.proWoche.length === 8 && w.proMonat.length === 12);
  ok("Wochen summieren sich", w.proWoche.reduce((s, x) => s + x.wert, 0) === 5, w.proWoche);
  ok("Monate summieren sich", w.proMonat.reduce((s, x) => s + x.wert, 0) === 5, w.proMonat);

  // Kalenderwoche am Jahreswechsel.
  const kw = await p.evaluate(() => {
    const K = window.R42J_CORE;
    return [new Date(2026, 11, 30, 12), new Date(2027, 0, 5, 12)].map((t) => K.statistik.auswerten([], [], t).proWoche.at(-1).label);
  });
  ok("Kalenderwoche", kw[0] === "KW 53" && kw[1] === "KW 1", kw);

  // Beginnt das Jahr an einem Donnerstag, darf die Sommerzeit keine Woche verschieben.
  const sommer = await p.evaluate(() => window.R42J_CORE.statistik.auswerten([], [], new Date(2026, 9, 31, 12)).proWoche.map((w) => w.label));
  ok("Acht Wochen lückenlos", sommer.join() === [37, 38, 39, 40, 41, 42, 43, 44].map((n) => "KW " + n).join(), sommer);

  // Eigener Artikel: erscheint nach Neustart, eine geänderte mitgelieferte Datei bleibt.
  await inWissen(p, "mein-test.md", EIGENER);
  await inWissen(p, "probezeit.de.md", "---\ntitle: Geänderte Probezeit\ncategory: Vertrag und Recht\nlang: de\n---\n\nMein Stand.\n");
  await inWissen(p, "kaputt.md", new Uint8Array(1024 * 1024 + 10).fill(65));
  const altkopie = await p.evaluate(() => window.R42J_WISSEN.find((a) => a.datei === "star-methode.de.md").md.replace(/sources:.*\n|image.*\n/g, ""));
  await inWissen(p, "star-methode.de.md", altkopie);
  await p.reload();
  await p.waitForFunction(() => window.R42J_CORE.ablauf.get().phase === "profile");
  await einloggen(p);
  await hin(p, "#/wissen");
  await p.getByRole("heading", { name: "Wissen", exact: true }).waitFor();
  await p.getByRole("link", { name: "Mein Testartikel" }).waitFor();
  ok("Eigener Artikel in der Liste", true);
  ok("Je Kennung eine Zeile", (await p.locator(".rj-datatable tbody tr").count()) === 14, await p.locator(".rj-datatable tbody tr").count());
  ok("Geänderte Datei bleibt", await p.getByRole("link", { name: "Geänderte Probezeit" }).isVisible());
  ok("Zu große Datei gemeldet", await p.getByText("Übersprungene Dateien: 1").isVisible());
  const stand = await p.evaluate(async () => (await window.R42J_CORE.wissen.laden()).artikel.find((a) => a.kennung === "star-methode"));
  ok("Unveränderte Altkopie steht zurück", !stand.eigen && stand.quellen.length > 0, stand);

  await p.getByRole("searchbox", { name: "Artikel durchsuchen" }).fill("gurkchen");
  ok("Suche umlaut-tolerant im Text", (await p.locator(".rj-datatable tbody tr").count()) === 1);
  await p.getByRole("searchbox", { name: "Artikel durchsuchen" }).fill("");

  await p.locator("main").getByRole("combobox").first().click();
  await p.getByRole("option", { name: "Eigene Notizen" }).click();
  ok("Kategoriefilter", (await p.locator(".rj-datatable tbody tr").count()) === 1);

  await p.getByRole("link", { name: "Mein Testartikel" }).click();
  await p.locator(".rj-prose").waitFor();
  const a = await p.evaluate(() => {
    const d = document.querySelector(".rj-prose");
    const l = {};
    d.querySelectorAll("a").forEach((x) => (l[x.textContent] = [x.getAttribute("href"), x.getAttribute("target"), x.getAttribute("rel")]));
    return { fett: d.querySelector("strong")?.textContent, skript: d.querySelectorAll("script,img").length, l, boese: window.__boese };
  });
  ok("Markdown gerendert", a.fett === "eigener", a);
  ok("Skript und Bild entfernt", a.skript === 0 && a.boese === undefined, a);
  ok("HTTPS öffnet extern", a.l.Extern[0] === "https://example.com/a" && a.l.Extern[1] === "_blank" && /noopener/.test(a.l.Extern[2]), a.l);
  ok("HTTP und javascript ohne Ziel", a.l.Unsicher[0] === null && a.l.Skript[0] === null, a.l);
  ok("App-Link bleibt", a.l.Intern[0] === "#/wissen/probezeit", a.l);

  // Quellen und Skizze
  await hin(p, "#/wissen/star-methode");
  await p.locator(".rj-wissen-quellen a").first().waitFor();
  const bild = await p.evaluate(async () => {
    const i = document.querySelector(".rj-wissen-bild img");
    await i.decode();
    const q = document.querySelector(".rj-wissen-quellen a");
    return { breite: i.naturalWidth, alt: i.alt, ziel: q.href, fenster: q.target };
  });
  ok("Skizze lädt mit Alternativtext", bild.breite > 0 && bild.alt.length > 0, bild);
  ok("Quelle öffnet extern", bild.ziel.startsWith("https://") && bild.fenster === "_blank", bild);

  // Eigener Artikel im Editor
  await hin(p, "#/wissen/neu");
  await p.getByLabel("Titel").fill("Mein Merkzettel");
  await p.getByLabel("Text", { exact: false }).first().fill("## Wichtig\n\n**Fett** gedruckt");
  await p.locator(".rj-wissen-editor .rj-prose strong").waitFor();
  ok("Vorschau zeigt Markdown", true);
  await p.getByLabel("Quellen").fill("kaputte Zeile");
  await p.getByRole("button", { name: "Speichern" }).click();
  await p.getByText("Eine Quelle ist nicht lesbar").waitFor();
  ok("Unlesbare Quelle erklärt", true);
  await p.getByLabel("Quellen").fill("Beispielquelle | https://example.com/merkzettel");
  await p.getByRole("button", { name: "Speichern" }).click();
  await p.getByRole("heading", { name: "Mein Merkzettel", level: 1 }).waitFor();
  ok("Eigener Artikel gespeichert", (await wissenDateien(p)).includes("mein-merkzettel.md"));
  ok("Eigene Quelle sichtbar", await p.getByRole("link", { name: "Beispielquelle" }).isVisible());
  await p.getByRole("link", { name: "Bearbeiten", exact: true }).click();
  await p.getByLabel("Titel").fill("Mein neuer Merkzettel");
  await p.getByRole("button", { name: "Speichern" }).click();
  await p.getByRole("heading", { name: "Mein neuer Merkzettel", level: 1 }).waitFor();
  ok("Bearbeiten behält die Datei", (await wissenDateien(p)).filter((n) => n.includes("merkzettel")).length === 1);
  await p.getByRole("button", { name: /löschen/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Löschen" }).click();
  await p.getByRole("searchbox", { name: "Artikel durchsuchen" }).waitFor();
  ok("Eigener Artikel gelöscht", !(await wissenDateien(p)).includes("mein-merkzettel.md"));

  // Links aus der App, auch die Prüfliste im Vergleich.
  for (const [k, titel] of [["arbeitsvertrag-pruefen", "Arbeitsvertrag prüfen"], ["kuendigungsfristen", "Kündigungsfristen"], ["foto-ja-nein", "Foto ja oder nein?"]]) {
    await hin(p, "#/wissen/" + k);
    await p.getByRole("heading", { name: titel, level: 1 }).waitFor();
  }
  ok("Artikelkennungen führen zum Artikel", true);
  await p.screenshot({ path: join(SP, `m8-artikel-${channel}.png`), fullPage: true });
  await hin(p, "#/wissen/gibt-es-nicht");
  await p.getByText("Diesen Artikel gibt es nicht").waitFor();
  ok("Fehlender Artikel erklärt", true);

  // Sprachwechsel: Dieselbe Kennung zeigt die andere Fassung, der Artikel ohne en-Fassung bleibt.
  await p.evaluate(() => window.R42J_CORE.store.set({ sprache: "en" }));
  await hin(p, "#/wissen/kuendigungsfristen");
  await p.getByRole("heading", { name: "Notice periods", level: 1 }).waitFor();
  ok("Englische Fassung", true);
  await hin(p, "#/wissen/mein-test");
  await p.getByRole("heading", { name: "Mein Testartikel", level: 1 }).waitFor();
  ok("Eigener deutscher Artikel bleibt sichtbar", true);
  await p.evaluate(() => window.R42J_CORE.store.set({ sprache: "de" }));

  // Checklisten
  await hin(p, "#/checklisten");
  await p.getByRole("heading", { name: "Checklisten", exact: true }).waitFor();
  ok("Nav-Eintrag", await p.locator('.rj-nav a[href="#/checklisten"]').isVisible());
  await p.getByLabel("LinkedIn-Profil prüfen").check({ force: true });
  ok("Einmal-Punkt gespeichert", await p.evaluate(() => window.R42J_CORE.tresor.daten().checklisten.einmal.linkedin === true));
  await p.getByText("1 von 5 erledigt").waitFor();
  ok("Stand einmalig", true);
  ok("Stand pro Bewerbung", await p.getByText("2 von 8 erledigt").isVisible());
  ok("Fortschrittsbalken je Bewerbung", (await p.locator(".rj-datatable [role=progressbar]").count()) === 7);
  await p.getByRole("link", { name: "Erfundene GmbH" }).click();
  await p.waitForFunction(() => window.location.hash === "#/bewerbungen/b1/details");
  ok("Sprung in die Bewerbung", true);

  // Statistik-Seite
  await hin(p, "#/statistik");
  await p.getByRole("heading", { name: "Statistik", exact: true }).waitFor();
  ok("Quote mit Basis", await p.getByText("3 von 5 versendeten Bewerbungen").isVisible());
  ok("Vier Kacheln", (await p.locator(".rj-stat").count()) === 4);
  ok("Vier Diagramme", (await p.locator("svg.rj-chart").count()) === 4);
  const titel = await p.locator(".rj-chart-wrap").first().getAttribute("aria-label");
  ok("Diagramm beschrieben", titel.startsWith("Bewerbungen pro Woche: KW"), titel);
  await knopf(p, "Monate").click();
  ok("Monate umschaltbar", (await p.locator("svg.rj-chart").first().locator("rect").count()) >= 1 && (await p.getByRole("heading", { name: "Bewerbungen pro Monat" }).isVisible()));
  const ueberlauf = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok("Kein Überlauf", !ueberlauf);
  await p.screenshot({ path: join(SP, `m8-statistik-${channel}.png`), fullPage: true });

  // Eine unbekannte Adresse hat wie jede Seite eine Hauptüberschrift.
  await p.evaluate(() => { location.hash = "#/gibtsnicht"; });
  await p.getByRole("heading", { level: 1, name: "Diese Seite gibt es nicht" }).waitFor();
  ok("Leere Seite mit h1", true);
  await p.evaluate(() => { location.hash = "#/statistik"; });
  await p.getByRole("heading", { level: 1, name: "Statistik" }).waitFor();
  await p.setViewportSize({ width: 390, height: 800 });
  await p.waitForTimeout(600);
  ok("Kein Überlauf schmal", !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  await p.setViewportSize({ width: 1280, height: 900 });

  // Leerer Zustand
  await p.evaluate(() => window.R42J_CORE.tresor.aendern((d) => (d.bewerbungen = [])));
  await p.getByText("Noch nichts auszuwerten").waitFor();
  ok("Leerer Zustand", true);

  ok("Keine Konsolenfehler", fehler.length === 0, fehler);
  await b.close();
}
console.log(fehlerZahl ? `${fehlerZahl} Fehler` : "Alles grün");
process.exit(fehlerZahl ? 1 : 0);
