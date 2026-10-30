// Packt IBM Plex Sans für pdfmake in eine klassische Script-Datei, weil file:// kein fetch() erlaubt.
// Quelle sind die TTF-Fassungen in tools/schrift/: dieselben Schnitte wie app/fonts/*.woff2, aber
// pdfmake kann WOFF2 nicht als Teilmenge einbetten.
// Nur für die Entwicklung; die App selbst hat keinen Build-Schritt.
// Aufruf: node tools/pdf-schrift.mjs
import { readFileSync, writeFileSync } from "node:fs";

const quelle = new URL("schrift/", import.meta.url);
const dateien = ["Regular", "Bold", "Italic", "BoldItalic"].map((s) => `IBMPlexSans-${s}.ttf`);

const inhalt = dateien.map((d) => `  ${JSON.stringify(d)}: ${JSON.stringify(readFileSync(new URL(d, quelle)).toString("base64"))},`);
writeFileSync(
  new URL("../app/fonts/pdf-schrift.js", import.meta.url),
  `// Erzeugt von tools/pdf-schrift.mjs, nicht von Hand ändern.\nwindow.R42J_PDF_SCHRIFT = {\n${inhalt.join("\n")}\n};\n`,
);
