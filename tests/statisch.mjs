// Statische Prüfung ohne Abhängigkeiten: node tests/statisch.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(WURZEL, "app");
const fehler = [];

function dateien(ordner, endung) {
  return readdirSync(ordner).flatMap((n) => {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) return dateien(p, endung);
    return p.endsWith(endung) ? [p] : [];
  });
}
const rel = (p) => relative(WURZEL, p).replaceAll("\\", "/");

// 1. i18n: beide Sprachen haben dieselben Schlüssel, jeder benutzte Schlüssel existiert.
const fenster = { R42J_I18N: {} };
for (const s of ["de", "en"]) vm.runInNewContext(readFileSync(join(APP, "i18n", s + ".js"), "utf8"), { window: fenster });
const { de, en } = fenster.R42J_I18N;
for (const k of Object.keys(de)) if (!(k in en)) fehler.push(`i18n: ${k} fehlt in en.js`);
for (const k of Object.keys(en)) if (!(k in de)) fehler.push(`i18n: ${k} fehlt in de.js`);

const eigenerCode = dateien(APP, ".js").filter((p) => !rel(p).startsWith("app/lib/") && !rel(p).startsWith("app/i18n/"));
for (const p of eigenerCode) {
  const text = readFileSync(p, "utf8");
  // Zusammengesetzte Schlüssel ("nav." + name) fallen durch das Muster.
  for (const m of text.matchAll(/K\.t\("([^"]+)"\s*[,)]/g)) {
    if (!(m[1] in de)) fehler.push(`i18n: ${rel(p)} nutzt unbekannten Schlüssel ${m[1]}`);
  }
  for (const m of text.matchAll(/K\.Fehler\("([^"]+)"/g)) {
    if (!(m[1] in de)) fehler.push(`i18n: ${rel(p)} nutzt unbekannten Fehler ${m[1]}`);
  }
}

// Zusammengesetzte Schlüssel, deren Teile als Liste im Code stehen.
const abschnitte = /ABSCHNITTE = \[([^\]]+)\]/.exec(readFileSync(join(APP, "js/core/anschreiben.js"), "utf8"));
for (const m of abschnitte[1].matchAll(/"([^"]+)"/g)) {
  if (!("anschreiben.abschnitt." + m[1] in de)) fehler.push(`i18n: anschreiben.abschnitt.${m[1]} fehlt`);
}

// 2. Verbotenes im eigenen Code. Kommentare zählen nicht.
const VERBOTEN = [
  [/\beval\s*\(/, "eval"],
  [/\bnew\s+Function\b/, "new Function"],
  [/^\s*import\s[\s\S]*?from\s+["']/m, "ES-Modul"],
  [/\bimport\s*\(/, "dynamischer Import"],
  [/\bfetch\s*\(/, "fetch"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
];
const CDN = /(cdn\.|cdnjs|jsdelivr|unpkg|googleapis\.com|gstatic\.com)/;
const ERLAUBT_FETCH = new Set(["app/js/core/update.js"]); // Opt-in-Update-Prüfung, falls vorhanden

function ohneKommentare(text) {
  return text.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
for (const p of eigenerCode) {
  const text = ohneKommentare(readFileSync(p, "utf8"));
  for (const [muster, name] of VERBOTEN) {
    if (name === "fetch" && ERLAUBT_FETCH.has(rel(p))) continue;
    if (muster.test(text)) fehler.push(`verboten: ${name} in ${rel(p)}`);
  }
  if (CDN.test(text)) fehler.push(`verboten: CDN-Adresse in ${rel(p)}`);
}

// 3. Bibliotheken: eval und new Function nur mit begründeter Ausnahme.
// fontkit/pdfmake enthalten Code-Generatoren, die im benutzten Pfad nie laufen. Die CSP blockiert sie zusätzlich.
const LIB_AUSNAHMEN = JSON.parse(readFileSync(join(WURZEL, "tests", "lib-ausnahmen.json"), "utf8"));
for (const p of dateien(join(APP, "lib"), ".js")) {
  const text = readFileSync(p, "utf8");
  const anzahl = (text.match(/\bnew Function\b|\beval\(/g) || []).length;
  const erlaubt = LIB_AUSNAHMEN[rel(p).replace("app/lib/", "")]?.anzahl ?? 0;
  if (anzahl > erlaubt) fehler.push(`Bibliothek: ${rel(p)} enthält ${anzahl}-mal eval/new Function, begründet sind ${erlaubt}`);
}

// 4. CSP
const index = readFileSync(join(APP, "index.html"), "utf8");
const csp = /<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i.exec(index);
if (!csp) fehler.push("CSP: Meta-Tag fehlt in index.html");
else if (/unsafe-eval/.test(csp[1])) fehler.push("CSP: unsafe-eval ist nicht erlaubt");
if (/<script[^>]+type="module"/.test(index)) fehler.push("index.html: ES-Module sind nicht erlaubt");
for (const m of index.matchAll(/<script src="([^"]+)"/g)) {
  try {
    statSync(join(APP, m[1]));
  } catch {
    fehler.push(`index.html: ${m[1]} gibt es nicht`);
  }
}

// 5. Leckprüfung über alle eingecheckten Dateien. Beispieldaten nutzen example-Domains.
const ERLAUBTE_DOMAINS = /(@example\.(com|org|net|de)|@users\.noreply\.github\.com|@noreply\.|@anthropic\.com|@beispiel\.de|@example$)/i;
const TOKEN = /(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const dateiliste = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: WURZEL, encoding: "utf8" })
  .split("\0")
  .filter((n) => n && !n.startsWith("app/lib/") && !/\.(png|jpg|jpeg|ttf|woff2?|ico)$/.test(n));
for (const n of dateiliste) {
  let text;
  try {
    text = readFileSync(join(WURZEL, n), "utf8");
  } catch {
    continue;
  }
  if (TOKEN.test(text)) fehler.push(`Leck: Token-Muster in ${n}`);
  for (const m of text.matchAll(EMAIL)) {
    if (!ERLAUBTE_DOMAINS.test(m[0])) fehler.push(`Leck: E-Mail-Adresse in ${n}`);
  }
}

if (fehler.length) {
  console.error(fehler.join("\n"));
  console.error(`\n${fehler.length} Problem(e)`);
  process.exit(1);
}
console.log("Statische Prüfung bestanden");
