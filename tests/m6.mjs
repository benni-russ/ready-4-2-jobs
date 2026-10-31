// M6: Angebote vergleichen. Beispiele aus docs/tests/vergleich.md, Testdaten frei erfunden.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, URLAPP, SP, kanaele, waehle, profilWaehlen } from "./hilfen.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const BEISPIEL = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(HIER, "..", "docs", "tests", "vergleich.md"), "utf8").replace(/\r\n/g, "\n"))[1]);

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const NAME = "Testperson Muster";
const komma = (w, stellen) => w.toFixed(stellen).replace(".", ",");

// Eigene Rechnung nach SPEC §6.10, bewusst unabhängig von der App.
const nachgerechnet = (a, pauschale) => {
  const wochen = 52 - a.urlaubstage / 5 - pauschale;
  const pendel = (2 * a.pendelMinutenEinfach * a.praesenzTage) / 60;
  const lohn = (a.bruttoJahr + (a.bonusJahr || 0) - (a.pendelKostenMonat || 0) * 12) / (wochen * (a.wochenstunden + pendel));
  return { wochen, pendel, lohn };
};
const GEWICHTE = { gehalt: 4, stundenlohn: 4, fahrtweg: 3, homeoffice: 2, urlaub: 2, boni: 1, sicherheit: 3, bauchgefuehl: 3 };
function punkteNachgerechnet(angebote) {
  const ids = Object.keys(angebote);
  const r = Object.fromEntries(ids.map((i) => [i, nachgerechnet(angebote[i], BEISPIEL.feiertagsWochen)]));
  const skala = (wert, kleiner) => {
    const w = ids.map(wert);
    const [min, max] = [Math.min(...w), Math.max(...w)];
    return Object.fromEntries(ids.map((i) => [i, (10 * (kleiner ? max - wert(i) : wert(i) - min)) / (max - min)]));
  };
  const teile = {
    gehalt: skala((i) => angebote[i].bruttoJahr),
    stundenlohn: skala((i) => r[i].lohn),
    fahrtweg: skala((i) => r[i].pendel, true),
    homeoffice: skala((i) => angebote[i].homeofficeTage),
    urlaub: skala((i) => angebote[i].urlaubstage),
    boni: skala((i) => angebote[i].bonusJahr || 0),
    sicherheit: Object.fromEntries(ids.map((i) => [i, angebote[i].bewertungen.sicherheit])),
    bauchgefuehl: Object.fromEntries(ids.map((i) => [i, angebote[i].bewertungen.bauchgefuehl])),
  };
  return Object.fromEntries(ids.map((i) => [i, Object.keys(GEWICHTE).reduce((s, k) => s + GEWICHTE[k] * teile[k][i], 0) / 22]));
}

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

  // Rechnen ohne Oberfläche: Beispiele und Grenzfälle.
  const rechnung = await p.evaluate(({ BEISPIEL }) => {
    const V = window.R42J_CORE.vergleich;
    const P = BEISPIEL.feiertagsWochen;
    const ids = Object.keys(BEISPIEL.angebote);
    const eintraege = ids.map((id) => ({ id, angebot: BEISPIEL.angebote[id] }));
    const k = V.kriterien();
    const wert = (a) => ({ wochen: V.arbeitswochen(a, P), pendel: V.pendelStunden(a), lohn: V.stundenlohn(a, P) });
    const mit = (gewichte) => k.map((x) => ({ ...x, gewicht: gewichte[x.id] || 0 }));
    const voll = { bruttoJahr: 50000, urlaubstage: 30, wochenstunden: 40, praesenzTage: 5, pendelMinutenEinfach: 30, homeofficeTage: 0, bewertungen: {} };
    return {
      werte: Object.fromEntries(ids.map((id) => [id, wert(BEISPIEL.angebote[id])])),
      wertung: V.wertung(eintraege, k, P),
      nurGehalt: V.wertung(eintraege, mit({ gehalt: 5 }), P),
      alleGleich: V.normieren([7, 7, 7]),
      einerDa: V.normieren([null, 7, null]),
      keinerDa: V.normieren([null, null]),
      kleinerBesser: V.normieren([0, 5, 10], true),
      besteGleich: V.beste([3, 3]),
      besteZwei: V.beste([5, 3, 5]),
      besteLuecke: V.beste([null, 4]),
      ohneZeit: V.stundenlohn({ ...voll, wochenstunden: 0, praesenzTage: 0 }, P),
      ohneWochen: V.stundenlohn({ ...voll, urlaubstage: 250 }, P),
      ohneFahrt: V.stundenlohn({ ...voll, pendelMinutenEinfach: null }, P),
      negativ: V.stundenlohn({ ...voll, pendelKostenMonat: 5000 }, P),
      teilweise: V.wertung(
        [
          { id: "x", angebot: voll },
          { id: "y", angebot: { ...voll, pendelMinutenEinfach: undefined, bruttoJahr: 60000 } },
        ],
        k,
        P,
      ).find((e) => e.id === "y"),
      keinGewicht: V.wertung(eintraege, mit({}), P),
      gleichstand: V.wertung(
        [
          { id: "a", angebot: { ...voll, bruttoJahr: 60000 } },
          { id: "b", angebot: { ...voll, bruttoJahr: 60000 } },
          { id: "c", angebot: voll },
        ],
        mit({ gehalt: 1 }),
        P,
      ).map((e) => e.platz),
      unbewertet: V.wertung([{ id: "a", angebot: voll }], mit({ bauchgefuehl: 1 }), P)[0].punkte,
      lesen: [["46.000", "de"], ["46.000,50", "de"], ["38,5", "de"], ["38.5", "de"], ["46000", "de"], ["46,000.50", "en"], ["38.5", "en"], ["", "de"], ["abc", "de"], ["-5", "de"]].map(([t, s]) => V.zahlLesen(t, s)),
    };
  }, { BEISPIEL });

  const eigene = punkteNachgerechnet(BEISPIEL.angebote);
  for (const id of Object.keys(BEISPIEL.angebote)) {
    const a = BEISPIEL.angebote[id];
    const soll = BEISPIEL.erwartet[id];
    const wir = nachgerechnet(a, BEISPIEL.feiertagsWochen);
    const app = rechnung.werte[id];
    ok(`${id}: Arbeitswochen`, Math.abs(app.wochen - soll.wochen) < 1e-9 && Math.abs(wir.wochen - soll.wochen) < 1e-9, app);
    ok(`${id}: Pendelstunden`, app.pendel === soll.pendel && wir.pendel === soll.pendel, app);
    ok(`${id}: Stundenlohn ${soll.lohn}`, komma(app.lohn, 2) === soll.lohn && komma(wir.lohn, 2) === soll.lohn, app);
    const e = rechnung.wertung.find((x) => x.id === id);
    ok(`${id}: Punkte ${soll.punkte}`, komma(e.punkte, 1) === soll.punkte && Math.abs(eigene[id] - e.punkte) < 1e-9, [e, eigene[id]]);
  }
  ok("Rangfolge wie im Beispiel", rechnung.wertung.map((e) => e.id).join() === BEISPIEL.rangfolge.join());
  ok("Nur Gehalt ändert die Rangfolge", rechnung.nurGehalt.map((e) => e.id).join() === BEISPIEL.rangfolgeNurGehalt.join());
  ok("Min-Max: alle gleich gibt 5", rechnung.alleGleich.every((w) => w === 5), rechnung.alleGleich);
  ok("Min-Max: einzelner Wert gibt 5, Lücken bleiben", rechnung.einerDa.join() === ",5,", rechnung.einerDa);
  ok("Min-Max: gar kein Wert", rechnung.keinerDa.every((w) => w === null));
  ok("Min-Max: kleiner ist besser", rechnung.kleinerBesser.join() === "10,5,0", rechnung.kleinerBesser);
  ok("Bester Wert: nicht bei Gleichstand aller", !rechnung.besteGleich.some(Boolean));
  ok("Bester Wert: gleichauf Beste", rechnung.besteZwei.join() === "true,false,true");
  ok("Bester Wert: einziger Wert ist kein Bestwert", !rechnung.besteLuecke.some(Boolean));
  ok("Division durch 0 (keine Stunden)", rechnung.ohneZeit === null);
  ok("Keine Arbeitswochen übrig", rechnung.ohneWochen === null);
  ok("Fehlende Fahrzeit", rechnung.ohneFahrt === null);
  ok("Negativer Stundenlohn bleibt sichtbar", rechnung.negativ < 0, rechnung.negativ);
  ok("Fehlende Werte werden genannt", rechnung.teilweise.fehlend.join() === "stundenlohn,fahrtweg" && rechnung.teilweise.punkte !== null, rechnung.teilweise);
  ok("Alle Gewichte 0", rechnung.keinGewicht.every((e) => e.punkte === null && e.platz === null));
  ok("Gleichstand teilt den Platz", rechnung.gleichstand.join() === "1,1,3", rechnung.gleichstand);
  ok("Unbewertet zählt als 5", rechnung.unbewertet === 5);
  ok("Zahlen lesen", JSON.stringify(rechnung.lesen) === JSON.stringify([46000, 46000.5, 38.5, 38.5, 46000, 46000.5, 38.5, null, null, null]), rechnung.lesen);

  // Oberfläche
  await p.getByRole("heading", { name: "Noch keine Bewerbung" }).waitFor();
  // Über die Seitenleiste: Der Hash-Listener hängt erst nach dem ersten Zeichnen.
  await p.getByRole("link", { name: "Vergleich" }).click();
  await p.getByText("Noch kein Angebot erfasst").waitFor();
  ok("Leerzustand ohne Angebot", true);

  await p.evaluate(() => {
    const K = window.R42J_CORE;
    const ausrichtungId = K.tresor.daten().ausrichtungen[0].id;
    for (const [firma, titel] of [["Nordlicht GmbH", "Personalreferent"], ["Sonnenhof AG", "HR Business Partner"], ["Waldblick KG", "Recruiter"], ["Bergsee GmbH", "Recruiter"], ["Talblick GmbH", "Recruiter"], ["Flussau GmbH", "Recruiter"], ["Ohne Angebot KG", "Recruiter"]]) {
      K.bewerbungen.neu({ ausrichtungId, sprache: "de", anrede: "sie", firma, titel });
    }
  });
  await knopf(p, "Angebot erfassen").click();
  const dlg = p.getByRole("dialog");
  await dlg.getByRole("combobox").click();
  await p.getByRole("option", { name: "Nordlicht GmbH · Personalreferent" }).click();
  await dlg.getByRole("button", { name: "Angebot eintragen" }).click();
  await p.getByRole("heading", { name: "Angebot erfassen" }).waitFor();

  await p.screenshot({ path: join(SP, `m6-formular-${channel}.png`), fullPage: true });
  await p.getByLabel("Brutto pro Jahr in Euro").fill("52.000");
  await p.getByLabel("Bonus pro Jahr in Euro").fill("3.000");
  await p.getByLabel("Wochenstunden").fill("vierzig");
  await p.getByLabel("Urlaubstage pro Jahr").fill("30");
  await p.getByLabel("Homeoffice-Tage pro Woche").fill("5");
  await p.getByLabel("Tage vor Ort pro Woche").fill("3");
  await p.getByLabel("Fahrzeit einfach in Minuten").fill("30");
  await p.getByLabel("Pendelkosten pro Monat in Euro").fill("50");
  await knopf(p, "Angebot speichern").click();
  await p.getByText("Bitte nur eine Zahl eingeben").waitFor();
  ok("Fehlerhafte Zahl wird erklärt", (await p.getByLabel("Wochenstunden").getAttribute("aria-invalid")) === "true");
  ok("Zu viele Wochentage werden erklärt", await p.getByText("mehr als 7").isVisible());
  await p.getByLabel("Wochenstunden").fill("40");
  await p.getByLabel("Homeoffice-Tage pro Woche").fill("2");
  await knopf(p, "Angebot speichern").click();
  await p.getByRole("heading", { name: "Vergleich", exact: true }).waitFor();
  const gespeichert = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen.find((b) => b.firma.name.startsWith("Nordlicht")).angebot);
  ok("Formular speichert das Angebot", gespeichert.bruttoJahr === 52000 && gespeichert.wochenstunden === 40 && gespeichert.pendelKostenMonat === 50 && gespeichert.nettoMonat === null, gespeichert);
  ok("Ein Angebot: Hinweis statt Vergleich", await p.getByText("Wähle mindestens zwei Angebote").isVisible());

  await p.evaluate((BEISPIEL) => {
    const K = window.R42J_CORE;
    const ids = Object.fromEntries(K.tresor.daten().bewerbungen.map((b) => [b.firma.name, b.id]));
    K.vergleich.angebotSpeichern(ids["Nordlicht GmbH"], { bewertungen: BEISPIEL.angebote.A.bewertungen });
    K.vergleich.angebotSpeichern(ids["Sonnenhof AG"], BEISPIEL.angebote.B);
    K.vergleich.angebotSpeichern(ids["Waldblick KG"], BEISPIEL.angebote.C);
  }, BEISPIEL);
  await p.getByRole("table").waitFor();
  const zelle = async (zeile, firma) => {
    const spalte = await p.locator("thead th").allInnerTexts();
    return p.getByRole("row", { name: new RegExp("^" + zeile) }).locator("td").nth(spalte.indexOf(firma) - 1).innerText();
  };
  ok("Stundenlohn A in der Tabelle", (await zelle("Effektiver Stundenlohn", "Nordlicht GmbH")).includes("28,75"));
  ok("Bester Wert als Text", (await zelle("Effektiver Stundenlohn", "Nordlicht GmbH")).includes("Bester Wert"));
  ok("Fehlender Bonus mit Text", (await zelle("Bonus pro Jahr", "Sonnenhof AG")).includes("Nicht angegeben"));
  ok("Einzahl bei einem Tag", (await zelle("Vor Ort pro Woche", "Waldblick KG")).trim() === "1 Tag");
  await p.getByRole("row", { name: /^Effektiver Stundenlohn/ }).getByRole("button").focus();
  const blase = await p.getByRole("tooltip").boundingBox();
  const rahmen = await p.locator(".rj-table-wrap").boundingBox();
  ok("Formel-Erklärung vollständig sichtbar", blase.x >= rahmen.x && blase.y >= rahmen.y && blase.x + blase.width <= rahmen.x + rahmen.width, [blase, rahmen]);
  await p.screenshot({ path: join(SP, `m6-tabelle-${channel}.png`), fullPage: true });
  await p.evaluate(() => document.activeElement.blur());

  await p.getByRole("tab", { name: "Punktwertung" }).click();
  await p.locator(".rj-scorelist").waitFor();
  const rang = () => p.locator(".rj-scorelist strong").allInnerTexts();
  ok("Rangfolge in der Oberfläche", (await rang()).join() === "Nordlicht GmbH,Waldblick KG,Sonnenhof AG", await rang());
  ok("Punkte in der Oberfläche", (await p.locator(".rj-scorelist__val").first().innerText()) === "7,4 von 10");
  await p.screenshot({ path: join(SP, `m6-punkte-${channel}.png`), fullPage: true });

  // Gewichtsänderung ändert die Rangfolge sofort, ohne Speichern.
  for (const n of ["Effektiver Stundenlohn", "Fahrtweg", "Homeoffice", "Urlaub", "Boni", "Sicherheit und Befristung", "Bauchgefühl"]) {
    await p.getByLabel(n, { exact: true }).fill("0");
  }
  await p.getByLabel("Gehalt", { exact: true }).fill("5");
  await p.waitForFunction(() => document.querySelector(".rj-scorelist strong").textContent === "Sonnenhof AG");
  ok("Gewichtsänderung ändert die Rangfolge sofort", (await rang()).join() === "Sonnenhof AG,Nordlicht GmbH,Waldblick KG", await rang());
  await p.getByLabel("Gehalt", { exact: true }).fill("0");
  await p.getByText("Alle Kriterien stehen auf 0").waitFor();
  ok("Alle Gewichte 0 erklärt", (await p.locator(".rj-scorelist__val").first().innerText()) === "Keine Wertung");

  // Eigenes Kriterium, manuelle Bewertung
  await p.getByLabel("Eigenes Kriterium").fill("Team");
  await knopf(p, "Kriterium hinzufügen").click();
  await p.getByRole("group", { name: "Team" }).waitFor();
  await p.getByRole("group", { name: "Team" }).getByLabel("Waldblick KG").fill("9");
  await p.waitForFunction(() => document.querySelector(".rj-scorelist strong").textContent === "Waldblick KG");
  ok("Eigenes Kriterium zählt", (await p.locator(".rj-scorelist__val").first().innerText()) === "9,0 von 10");
  await knopf(p, "Team entfernen").click();
  await p.getByText("Alle Kriterien stehen auf 0").waitFor();
  ok("Eigenes Kriterium entfernt, Bewertung weg", await p.evaluate(() => {
    const d = window.R42J_CORE.tresor.daten();
    return !d.gewichtung.kriterien.some((k) => k.name === "Team") && d.bewerbungen.every((b) => !b.angebot || Object.keys(b.angebot.bewertungen).every((k) => k === "sicherheit" || k === "bauchgefuehl"));
  }));

  // Worauf achten
  await p.getByRole("tab", { name: "Worauf achten" }).click();
  const karte = p.locator("section.rj-card", { has: p.getByRole("heading", { name: "Sonnenhof AG" }) });
  await karte.getByLabel("Worauf achten").fill("Bonus nur mündlich");
  await p.keyboard.press("Enter");
  await karte.getByLabel(/^Probezeit/).check();
  ok("Prüfliste zählt mit", await karte.getByText("1 von 7").isVisible());
  const links = await karte.getByRole("link", { name: /^Mehr zu/ }).evaluateAll((l) => l.map((a) => a.getAttribute("href")));
  ok("Prüfliste mit stabilen Wissens-Links", links.length === 7 && links.includes("#/wissen/arbeitsvertrag-pruefen") && links.includes("#/wissen/kuendigungsfristen"), links);
  await p.screenshot({ path: join(SP, `m6-achten-${channel}.png`), fullPage: true });
  const achten = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen.find((b) => b.firma.name === "Sonnenhof AG").angebot);
  ok("Stichpunkt und Haken gespeichert", achten.achtenAuf[0] === "Bonus nur mündlich" && achten.pruefliste.probezeit === true, achten);

  // Auswahl: höchstens fünf, weitere gesperrt
  await p.evaluate((BEISPIEL) => {
    const K = window.R42J_CORE;
    for (const b of K.tresor.daten().bewerbungen) {
      if (["Bergsee GmbH", "Talblick GmbH", "Flussau GmbH"].includes(b.firma.name)) K.vergleich.angebotSpeichern(b.id, BEISPIEL.angebote.C);
    }
  }, BEISPIEL);
  await p.evaluate(() => {
    window.location.hash = "#/uebersicht";
  });
  await p.getByRole("heading", { name: "Übersicht" }).first().waitFor();
  await p.evaluate(() => {
    window.location.hash = "#/vergleich";
  });
  await p.getByRole("group", { name: /^Angebote vergleichen/ }).waitFor();
  const gruppe = p.getByRole("group", { name: /^Angebote vergleichen/ }).getByRole("checkbox");
  ok("Sechs Angebote, fünf gewählt", (await gruppe.count()) === 6 && (await p.locator(".rj-fieldset input:checked").count()) === 5);
  ok("Sechstes ist gesperrt mit Grund", (await p.locator(".rj-fieldset input:disabled").count()) === 1 && (await p.getByText("Es sind schon fünf gewählt").isVisible()));
  await p.locator(".rj-fieldset input:checked").first().uncheck();
  ok("Abwählen gibt den Platz frei", (await p.locator(".rj-fieldset input:disabled").count()) === 0 && (await p.locator("thead th").count()) === 5, await p.locator("thead th").count());

  // Stundenlohn fehlt: Lücke wird benannt
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    const b = K.tresor.daten().bewerbungen.find((x) => x.firma.name === "Waldblick KG");
    K.vergleich.angebotSpeichern(b.id, { pendelMinutenEinfach: null });
  });
  // Waldblick muss sicher gewählt sein, die Standardauswahl hängt von den Zeitstempeln ab.
  const wald = p.locator(".rj-fieldset .rj-check", { hasText: "Waldblick KG" }).locator("input");
  if (await wald.isChecked()) await p.locator(".rj-fieldset input:not(:checked)").first().check();
  else await wald.check();
  await p.getByText(/Für Waldblick KG fehlt/).waitFor();
  ok("Fehlende Angabe wird benannt", await p.getByText("Fahrzeit einfach in Minuten", { exact: false }).first().isVisible());

  // Feiertagspauschale, Details, schmale Ansicht
  await p.evaluate(() => {
    window.location.hash = "#/einstellungen";
  });
  await waehle(p, p.getByRole("combobox", { name: "Feiertage pro Jahr" }), "3");
  const pause = await p.evaluate(() => window.R42J_CORE.vergleich.feiertagsWochen());
  ok("Feiertagspauschale einstellbar", pause === 3);
  await p.evaluate(() => {
    window.location.hash = "#/vergleich";
  });
  await p.getByRole("table").waitFor();
  ok("Pauschale wirkt in der Tabelle", (await p.getByRole("row", { name: /^Arbeitswochen/ }).locator("td").allInnerTexts()).some((t) => t.trim().startsWith("43")));
  await p.setViewportSize({ width: 390, height: 800 });
  // Im schmalen Fenster sagt die Tabelle, dass es mehr Angebote gibt, und die Kriterien bleiben stehen.
  const tabellenRahmen = p.getByRole("region", { name: "Angebote im Vergleich" });
  await tabellenRahmen.waitFor();
  ok("Hinweis auf weitere Angebote", await p.getByText(/Wische oder scrolle zur Seite/).isVisible());
  await p.waitForTimeout(500); // Die Seitenleiste klappt nach dem Verkleinern animiert ein.
  await tabellenRahmen.focus();
  await tabellenRahmen.evaluate((e) => { e.scrollLeft = e.scrollWidth; });
  const stehen = await tabellenRahmen.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return Math.abs(e.querySelector("tbody th").getBoundingClientRect().left - r.left) < 2;
  });
  ok("Kriterien bleiben beim Scrollen stehen", stehen);
  await p.screenshot({ path: join(SP, `m6-tabelle-schmal-${channel}.png`), fullPage: true });
  await p.getByRole("tab", { name: "Punktwertung" }).click();
  await p.locator(".rj-scorelist").waitFor();
  const breite = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("Schmales Fenster ohne seitliches Scrollen", breite <= 0, breite);
  await p.screenshot({ path: join(SP, `m6-schmal-${channel}.png`), fullPage: true });
  await p.setViewportSize({ width: 1280, height: 900 });

  const id = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen.find((b) => b.firma.name === "Ohne Angebot KG").id);
  await p.evaluate((i) => {
    window.location.hash = "#/bewerbungen/" + i + "/details";
  }, id);
  await p.getByRole("link", { name: "Angebot erfassen" }).waitFor();
  ok("Einstieg aus den Bewerbungsdetails", true);

  // Dauerhaft: Alles liegt nach dem Neuladen noch im Tresor.
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.goto("about:blank");
  await p.goto(URLAPP + "#/vergleich");
  await profilWaehlen(p, NAME);
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.getByRole("table").waitFor();
  const danach = await p.evaluate(() => {
    const d = window.R42J_CORE.tresor.daten();
    return { gewicht: d.gewichtung.kriterien.find((k) => k.id === "gehalt").gewicht, angebote: d.bewerbungen.filter((b) => b.angebot).length, pauschale: d.einstellungen.feiertagsWochen };
  });
  ok("Nach dem Neuladen ist alles da", danach.gewicht === 0 && danach.angebote === 6 && danach.pauschale === 3, danach);

  // Löschen entfernt nur das Angebot
  await p.getByRole("button", { name: "Sonnenhof AG bearbeiten" }).click();
  await knopf(p, "Angebot löschen").click();
  await p.getByRole("dialog").getByRole("button", { name: "Angebot löschen" }).click();
  await p.getByRole("heading", { name: "Vergleich", exact: true }).waitFor();
  const rest = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen.find((b) => b.firma.name === "Sonnenhof AG"));
  ok("Angebot gelöscht, Bewerbung bleibt", rest && !rest.angebot);

  ok("Keine Netzanfrage im ganzen Lauf", fremd.length === 0, fremd);
  const probleme = logs.filter((l) => /^(error|pageerror|warning)/.test(l) && !/ERR_FAILED/.test(l));
  ok("Keine Konsolenfehler", probleme.length === 0, probleme.slice(0, 5));
  const leck = logs.filter((l) => /Jörg|Müller|Testperson|52000|Nordlicht/.test(l));
  ok("Keine persönlichen Daten in der Konsole", leck.length === 0, leck.slice(0, 3));
  await b.close();
}

console.log(fehlerZahl === 0 ? "Alles bestanden" : fehlerZahl + " Fehler");
process.exit(fehlerZahl ? 1 : 0);
