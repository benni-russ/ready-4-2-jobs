// Erzeugt die Skizzen für die mitgelieferten Wissensartikel nach app/img/wissen/.
// Nur für Entwickler: Die App liest die fertigen SVG-Dateien.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ZIEL = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "img", "wissen");
const FARBE = { grund: "#ffffff", flaeche: "#eaeef3", linie: "#d5dbe3", text: "#17202b", leise: "#4a5563", akzent: "#1f5fae", weich: "#e3edf9" };
const BREITE = 720;

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.groesse || 15}" font-weight="${o.fett ? 600 : 400}" fill="${o.farbe || FARBE.text}" text-anchor="${o.anker || "start"}">${esc(t)}</text>`;
const kasten = (x, y, b, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="${o.rund ?? 8}" fill="${o.farbe || FARBE.flaeche}" stroke="${o.rand || "none"}"/>`;
const huelle = (hoehe, inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREITE} ${hoehe}" font-family="Segoe UI, Helvetica, Arial, sans-serif">${kasten(0, 0, BREITE, hoehe, { farbe: FARBE.grund, rund: 0 })}${inhalt}</svg>\n`;

// Folge von Schritten: [Überschrift, Unterzeile].
function schritte(liste) {
  const abstand = 22;
  const b = (BREITE - 40 - abstand * (liste.length - 1)) / liste.length;
  const inhalt = liste.map(([kopf, unter], i) => {
    const x = 20 + i * (b + abstand);
    const pfeil = i < liste.length - 1 ? `<path d="M${x + b + 5} 80 l12 0 m-5 -5 l5 5 l-5 5" fill="none" stroke="${FARBE.akzent}" stroke-width="2"/>` : "";
    const zeilen = unter.map((z, n) => text(x + b / 2, 92 + n * 19, z, { anker: "middle", groesse: 13, farbe: FARBE.leise })).join("");
    return kasten(x, 24, b, 112, { farbe: FARBE.weich }) + text(x + b / 2, 62, kopf, { anker: "middle", fett: true, farbe: FARBE.akzent, groesse: 16 }) + zeilen + pfeil;
  });
  return huelle(160, inhalt.join(""));
}

// Stilisierte Seite mit beschrifteten Blöcken: [Beschriftung, Höhe].
function blatt(bloecke) {
  let y = 42;
  const teile = [kasten(40, 20, 300, 20, { farbe: FARBE.grund })];
  bloecke.forEach(([name, h]) => {
    teile.push(kasten(70, y, 240, h, { rund: 4 }));
    teile.push(`<path d="M312 ${y + h / 2} L392 ${y + h / 2}" stroke="${FARBE.akzent}" stroke-width="1.5"/>`);
    teile.push(text(400, y + h / 2 + 5, name, { fett: true }));
    y += h + 12;
  });
  const hoehe = y + 18;
  return huelle(hoehe, kasten(50, 20, 280, hoehe - 38, { farbe: FARBE.grund, rand: FARBE.linie, rund: 4 }) + teile.slice(1).join(""));
}

// Zwei Spalten mit Listen.
function zwei(links, rechts) {
  const spalte = (x, [kopf, zeilen]) =>
    kasten(x, 20, 330, 170, { farbe: x < 100 ? FARBE.weich : FARBE.flaeche }) +
    text(x + 18, 54, kopf, { fett: true, groesse: 16, farbe: x < 100 ? FARBE.akzent : FARBE.text }) +
    zeilen.map((z, i) => text(x + 18, 88 + i * 28, z)).join("");
  return huelle(210, spalte(20, links) + spalte(370, rechts));
}

// Stufen mit steigender Höhe: [Beschriftung unten, Wert oben].
function treppe(stufen, achse) {
  const b = (BREITE - 60) / stufen.length;
  const inhalt = stufen.map(([unten, oben], i) => {
    const h = 34 + i * 26;
    const x = 30 + i * b;
    return kasten(x + 4, 230 - h, b - 8, h, { farbe: FARBE.weich, rund: 4 }) + text(x + b / 2, 222 - h, oben, { anker: "middle", fett: true, farbe: FARBE.akzent, groesse: 14 }) + text(x + b / 2, 250, unten, { anker: "middle", groesse: 13, farbe: FARBE.leise });
  });
  return huelle(292, inhalt.join("") + text(BREITE / 2, 278, achse, { anker: "middle", groesse: 13, farbe: FARBE.leise }));
}

// Zeitstrahl mit zwei Abschnitten.
function zeitleiste(erster, zweiter, marke) {
  const y = 90;
  return huelle(
    190,
    kasten(30, y, 330, 22, { farbe: FARBE.weich, rund: 4 }) +
      kasten(360, y, 330, 22, { rund: 4 }) +
      `<path d="M360 ${y - 16} L360 ${y + 38}" stroke="${FARBE.akzent}" stroke-width="2"/>` +
      text(360, y - 26, marke, { anker: "middle", fett: true, farbe: FARBE.akzent }) +
      erster.map((z, i) => text(195, y + 54 + i * 21, z, { anker: "middle", groesse: 14 })).join("") +
      zweiter.map((z, i) => text(525, y + 54 + i * 21, z, { anker: "middle", groesse: 14 })).join(""),
  );
}

// Spanne auf einer Linie: [Beschriftung, Lage 0–1].
function spanne(punkte, hinweis) {
  const x = (l) => 70 + l * 580;
  return huelle(
    170,
    `<path d="M70 80 L650 80" stroke="${FARBE.linie}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M${x(punkte[0][1])} 80 L${x(punkte.at(-1)[1])} 80" stroke="${FARBE.akzent}" stroke-width="10" stroke-linecap="round"/>` +
      punkte.map(([name, l]) => `<circle cx="${x(l)}" cy="80" r="9" fill="${FARBE.grund}" stroke="${FARBE.akzent}" stroke-width="3"/>` + text(x(l), 56, name, { anker: "middle", fett: true })).join("") +
      text(BREITE / 2, 130, hinweis, { anker: "middle", groesse: 14, farbe: FARBE.leise }),
  );
}

const SKIZZEN = {
  einstellungstest: {
    de: schritte([["Schulwissen", ["Rechnen,", "Rechtschreibung"]], ["Fähigkeiten", ["Logik,", "Konzentration"]], ["Arbeitsprobe", ["Aufgabe aus", "dem Alltag"]], ["Persönlichkeit", ["Ehrliche", "Selbsteinschätzung"]]]),
    en: schritte([["School", ["Maths,", "spelling"]], ["Abilities", ["Logic,", "concentration"]], ["Work sample", ["Task from", "everyday work"]], ["Personality", ["Honest", "self-assessment"]]]),
  },
  "star-methode": {
    de: schritte([["Situation", ["Wo warst du,", "was war los?"]], ["Aufgabe", ["Was war dein", "Auftrag?"]], ["Aktion", ["Was hast du", "selbst getan?"]], ["Ergebnis", ["Was kam dabei", "heraus?"]]]),
    en: schritte([["Situation", ["Where were you,", "what happened?"]], ["Task", ["What was", "your job?"]], ["Action", ["What did you", "do yourself?"]], ["Result", ["What came", "of it?"]]]),
  },
  "ats-erklaert": {
    de: schritte([["Bewerbung", ["Du lädst deine", "PDF hoch"]], ["Auslesen", ["Die Software", "liest den Text"]], ["Suchen", ["Kompetenzen", "werden gefunden"]], ["Mensch", ["Personaler", "entscheiden"]]]),
    en: schritte([["Apply", ["You upload", "your PDF"]], ["Parse", ["The software", "reads the text"]], ["Search", ["Skills can", "be found"]], ["People", ["Recruiters", "decide"]]]),
  },
  vorstellungsgespraech: {
    de: schritte([["Ankommen", ["Begrüßung,", "Smalltalk"]], ["Vorstellen", ["Du und", "die Firma"]], ["Fragen", ["Beispiele aus", "deiner Arbeit"]], ["Rückfragen", ["Was du", "wissen willst"]], ["Abschluss", ["Wie geht", "es weiter?"]]]),
    en: schritte([["Arrive", ["Greeting,", "small talk"]], ["Introduce", ["You and", "the company"]], ["Questions", ["Examples from", "your work"]], ["Your turn", ["What you", "want to know"]], ["Close", ["What happens", "next?"]]]),
  },
  "anschreiben-aufbau": {
    de: blatt([["Absender und Empfänger", 44], ["Betreff", 18], ["Einstieg: Warum diese Stelle?", 40], ["Hauptteil: Was du mitbringst", 72], ["Schluss: Gespräch anregen", 34], ["Gruß und Unterschrift", 30]]),
    en: blatt([["Sender and recipient", 44], ["Subject", 18], ["Opening: why this job?", 40], ["Main part: what you offer", 72], ["Closing: ask for a talk", 34], ["Sign-off and signature", 30]]),
  },
  "arbeitsvertrag-pruefen": {
    de: blatt([["Tätigkeit und Arbeitsort", 32], ["Gehalt und Zuschläge", 32], ["Arbeitszeit und Überstunden", 32], ["Urlaub", 24], ["Probezeit und Befristung", 32], ["Kündigungsfristen", 32]]),
    en: blatt([["Role and workplace", 32], ["Pay and extras", 32], ["Working hours, overtime", 32], ["Holiday", 24], ["Probation and fixed term", 32], ["Notice periods", 32]]),
  },
  "linkedin-xing-profil": {
    de: blatt([["Foto und Name", 44], ["Überschrift: dein Beruf", 22], ["Kurzprofil", 54], ["Berufserfahrung", 72], ["Kompetenzen", 30]]),
    en: blatt([["Photo and name", 44], ["Headline: your job", 22], ["Summary", 54], ["Experience", 72], ["Skills", 30]]),
  },
  "foto-ja-nein": {
    de: zwei(["Eher mit Foto", ["Kleine und mittlere Firmen", "Viel Kundenkontakt", "Aktuelles, gutes Bild"]], ["Eher ohne Foto", ["USA und Großbritannien", "Anonyme Bewerbungen", "Nur ein Urlaubsfoto"]]),
    en: zwei(["Rather with a photo", ["Small and mid-sized firms", "Lots of customer contact", "Recent, good picture"]], ["Rather without", ["USA and UK", "Anonymous applications", "Only a holiday snapshot"]]),
  },
  "serioese-email": {
    de: zwei(["So wirkt es seriös", ["vorname.nachname@example.org", "v.nachname@example.org", "eigenes Bewerbungspostfach"]], ["Besser nicht", ["schatzi99@example.org", "partyking@example.org", "die Adresse deines Arbeitgebers"]]),
    en: zwei(["Looks professional", ["first.last@example.org", "f.last@example.org", "a separate job inbox"]], ["Better avoid", ["sweetie99@example.org", "partyking@example.org", "your employer's address"]]),
  },
  kuendigungsfristen: {
    de: treppe([["2 Jahre", "1 Mon."], ["5", "2"], ["8", "3"], ["10", "4"], ["12", "5"], ["15", "6"], ["20", "7"]], "Frist für Kündigungen durch das Unternehmen nach Betriebszugehörigkeit, jeweils zum Monatsende"),
    en: treppe([["2 years", "1 mo."], ["5", "2"], ["8", "3"], ["10", "4"], ["12", "5"], ["15", "6"], ["20", "7"]], "Notice from the employer by length of service, always to the end of a month"),
  },
  probezeit: {
    de: zeitleiste(["Bis zu sechs Monate:", "meist zwei Wochen Frist"], ["Danach: längere Frist, in Betrieben mit", "mehr als zehn Beschäftigten Kündigungsschutz"], "6 Monate"),
    en: zeitleiste(["Up to six months:", "usually two weeks' notice"], ["After that: longer notice, and dismissal", "protection in firms with over ten staff"], "6 months"),
  },
  gehaltsverhandlung: {
    de: spanne([["Untergrenze", 0.12], ["Ziel", 0.5], ["Wunsch", 0.88]], "Leg alle drei Werte fest, bevor du ins Gespräch gehst"),
    en: spanne([["Minimum", 0.12], ["Target", 0.5], ["Wish", 0.88]], "Set all three figures before the conversation"),
  },
};

mkdirSync(ZIEL, { recursive: true });
for (const [name, sprachen] of Object.entries(SKIZZEN)) {
  for (const [sprache, svg] of Object.entries(sprachen)) writeFileSync(join(ZIEL, `${name}.${sprache}.svg`), svg);
}
console.log(Object.keys(SKIZZEN).length + " Skizzen geschrieben");
