// Erzeugt app/css/tokens.css aus tools/tokens.json (Design-System „R42J“).
// Nur für die Entwicklung; die App selbst hat keinen Build-Schritt.
// Aufruf: node tools/tokens-css.mjs
import { readFileSync, writeFileSync } from "node:fs";

const quelle = new URL("./tokens.json", import.meta.url);
const ziel = new URL("../app/css/tokens.css", import.meta.url);
const tokens = JSON.parse(readFileSync(quelle, "utf8"));

const wert = (v) => String(v).replace(/^\{(.+)\}$/, "var(--$1)");

const hell = [];
const dunkel = [];
const allgemein = [`  --font-sans: ${tokens.type.families.sans};`];

for (const t of tokens.color.tokens) {
  hell.push(`  --${t.name}: ${wert(t.value.light)};`);
  dunkel.push(`  --${t.name}: ${wert(t.value.dark)};`);
}
for (const familie of ["spacing", "radius", "size", "zIndex"]) {
  for (const t of tokens[familie].tokens) allgemein.push(`  --${t.name}: ${t.value};`);
}
for (const t of tokens.shadow.tokens) {
  hell.push(`  --${t.name}: ${t.value.light};`);
  dunkel.push(`  --${t.name}: ${t.value.dark};`);
}

const schriften = tokens.type.fonts.map(
  (f) => `@font-face {
  font-family: "${f.family}";
  src: url("../${f.file}") format("woff2");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`,
);

const css = `/* R42J — generated from tokens.json */
${schriften.join("\n")}

:root {
${allgemein.join("\n")}
}

:root, [data-theme="light"] {
${hell.join("\n")}
}

[data-theme="dark"] {
${dunkel.join("\n")}
}
`;

writeFileSync(ziel, css);
