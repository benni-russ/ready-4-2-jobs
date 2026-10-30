// Prüft die mitgelieferten Fragenkataloge ohne Browser: node tests/kataloge.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HIER = dirname(fileURLToPath(import.meta.url));
const ORDNER = join(HIER, "..", "app", "fragen");
const KATEGORIEN = ["allgemeinwissen", "mathe", "logik", "deutsch", "englisch", "interview"];
const MINDEST = { de: 50, en: 30 };
const TYPEN = ["karte", "mc", "mc-multi", "zahlenreihe"];
const EPS = 1e-9;

const fehler = [];
const fenster = {};
for (const n of readdirSync(ORDNER)) vm.runInNewContext(readFileSync(join(ORDNER, n), "utf8"), { window: fenster });

// Erste Zahl einer Antwort. Tausenderpunkte und Kommas kommen in beiden Sprachen vor.
function zahl(text) {
  const m = /-?\d[\d.,]*/.exec(text.replace(/−/g, "-"));
  if (!m) return NaN;
  const t = m[0].replace(/[.,]$/, "");
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
  return Number(t.replace(",", "."));
}

const gleich = (a) => a.every((x) => Math.abs(x - a[0]) < EPS);
const abstaende = (a) => a.slice(1).map((x, i) => x - a[i]);
const faktoren = (a) => (a.some((x) => x === 0) ? [NaN, 1] : a.slice(1).map((x, i) => x / a[i]));

// Eine Regel zählt erst ab drei Belegen, sonst passt fast jede kurze Reihe.
function differenzen(a) {
  let d = a;
  for (let k = 1; k <= 3 && d.length > 3; k++) {
    d = abstaende(d);
    if (d.length >= 3 && gleich(d)) return true;
  }
  return false;
}
const potenz = (a) => [2, 3].some((k) => a.every((x, i) => x === (i + 1) ** k));
const geometrisch = (a) => a.length > 2 && gleich(faktoren(a));
const einfach = (a) => (a.length >= 3 && gleich(abstaende(a))) || geometrisch(a);
const summe = (a) => a.length > 3 && a.slice(2).every((x, i) => Math.abs(x - a[i] - a[i + 1]) < EPS);
const zweiReihen = (a) => {
  const g = a.filter((_, i) => i % 2 === 0);
  const u = a.filter((_, i) => i % 2 === 1);
  return einfach(g) && (einfach(u) || (u.length === 2 && u[1] !== u[0]));
};
// Abstände oder Faktoren, die selbst einer Regel folgen, oder zwei abwechselnde Rechenschritte.
const zweiteStufe = (a) => geometrisch(abstaende(a)) || differenzen(faktoren(a)) || gleich(faktoren(abstaende(a)));
const periode = (a) => {
  if (a.length < 7) return false;
  const schritt = (x, y) => [`+${y - x}`, `*${y / x}`];
  const s = a.slice(1).map((y, i) => schritt(a[i], y));
  return [0, 1].some((p) => [0, 1].some((q) => s.every((w, i) => w[i % 2 ? q : p] === s[i % 2][i % 2 ? q : p])));
};
const passt = (a) => [differenzen, potenz, geometrisch, summe, zweiReihen, zweiteStufe, periode].some((r) => r(a));

function reihePruefen(ort, f) {
  const teile = f.frage.split(/[?:]\s/).at(-1);
  const zahlen = teile.split(",").map((s) => s.trim()).filter((s) => /^-?\d+$/.test(s)).map(Number);
  if (zahlen.length < 4) return fehler.push(`${ort}: Reihe nicht lesbar`);
  const richtig = Number(f.antworten[f.richtig[0]]);
  if (!passt([...zahlen, richtig])) fehler.push(`${ort}: ${richtig} folgt keiner erkannten Regel`);
  f.antworten.forEach((a, i) => {
    if (i !== f.richtig[0] && passt([...zahlen, Number(a)])) fehler.push(`${ort}: Falsche Antwort ${a} passt ebenfalls`);
  });
}

function rechnungPruefen(ort, f) {
  if (!f.rechnung) return;
  // Bruch-Antworten wie 7/8 werden als Ausdruck gelesen, alles andere als Zahl.
  const antwort = f.antworten[f.richtig[0]];
  const soll = /^\d+\/\d+$/.test(antwort) ? vm.runInNewContext(antwort) : zahl(antwort);
  const ist = vm.runInNewContext(f.rechnung, { Math });
  if (Number.isNaN(soll) || Math.abs(soll - ist) > 0.005) fehler.push(`${ort}: ${f.rechnung} ergibt ${ist}, Antwort ist ${antwort}`);
  f.antworten.forEach((a, i) => {
    if (i === f.richtig[0]) return;
    const w = /^\d+\/\d+$/.test(a) ? vm.runInNewContext(a) : zahl(a);
    if (Math.abs(w - ist) < 0.005) fehler.push(`${ort}: Falsche Antwort ${a} stimmt rechnerisch`);
  });
}

const zaehler = {};
const ids = new Set();
for (const k of fenster.R42J_FRAGEN) {
  const schluessel = `${k.kategorie}-${k.sprache}`;
  zaehler[schluessel] = k.fragen.length;
  if (!KATEGORIEN.includes(k.kategorie)) fehler.push(`${schluessel}: unbekannte Kategorie`);
  const fragen = new Set();
  for (const f of k.fragen) {
    const ort = f.id;
    if (!f.id || ids.has(f.id)) fehler.push(`${ort}: ID fehlt oder doppelt`);
    ids.add(f.id);
    if (!TYPEN.includes(f.typ)) fehler.push(`${ort}: Typ ${f.typ}`);
    if (!f.frage?.trim()) fehler.push(`${ort}: Frage fehlt`);
    const kennung = f.frage + "|" + [...f.antworten].sort().join("|");
    if (fragen.has(kennung)) fehler.push(`${ort}: Frage doppelt`);
    fragen.add(kennung);
    if (!f.erklaerung?.trim()) fehler.push(`${ort}: Erklärung fehlt`);
    if (!Array.isArray(f.antworten) || !f.antworten.length || f.antworten.some((a) => !a?.trim())) fehler.push(`${ort}: Antworten`);
    if (new Set(f.antworten).size !== f.antworten.length) fehler.push(`${ort}: Antwort doppelt`);
    if (!f.richtig.length || f.richtig.some((i) => !Number.isInteger(i) || i < 0 || i >= f.antworten.length)) fehler.push(`${ort}: richtig`);
    if (f.typ !== "mc-multi" && f.richtig.length !== 1) fehler.push(`${ort}: genau eine richtige Antwort`);
    if (f.typ === "mc-multi" && f.richtig.length < 2) fehler.push(`${ort}: Mehrfachauswahl mit nur einer richtigen Antwort`);
    if (f.typ !== "karte" && f.antworten.length < 3) fehler.push(`${ort}: zu wenige Antworten`);
    if (f.star && !f.stichworte?.length) fehler.push(`${ort}: Stichworte fehlen`);
    if (f.typ === "zahlenreihe") reihePruefen(ort, f);
    if (k.kategorie === "mathe" && f.typ !== "karte" && !f.rechnung) fehler.push(`${ort}: Rechnung fehlt`);
    rechnungPruefen(ort, f);
  }
}
for (const k of KATEGORIEN) {
  for (const s of ["de", "en"]) {
    const n = zaehler[`${k}-${s}`] || 0;
    if (n < MINDEST[s]) fehler.push(`${k}-${s}: nur ${n} Fragen, mindestens ${MINDEST[s]}`);
  }
}

if (fehler.length) {
  console.error(fehler.join("\n"));
  console.error(`\n${fehler.length} Problem(e)`);
  process.exit(1);
}
console.log(Object.entries(zaehler).map(([k, n]) => `${k}: ${n}`).join(", "));
console.log(`Kataloge in Ordnung: ${ids.size} Fragen`);
