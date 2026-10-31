// Automatisierbarer Teil des Barrierefreiheits-Audits mit dem erfundenen Demo-Profil:
// axe-core, Textkontrast, Klickflächen, Fokus per Tastatur und große Schrift.
// Screenreader lassen sich so nicht ersetzen, NVDA und VoiceOver bleiben Handarbeit.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium, URLAPP, SP, kanaele } from "./hilfen.mjs";
import { demoProfilAnlegen, ordnerStub } from "./demo-profil.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const pw = process.env.R42J_PLAYWRIGHT;
const AXE = readFileSync(createRequire(join(pw, "package.json")).resolve("axe-core/axe.min.js"), "utf8");
const MIN = 44;

const SEITEN = (id) => [
  "#/uebersicht",
  "#/bewerbungen",
  "#/bewerbungen/" + id + "/details",
  "#/bewerbungen/" + id + "/stelle",
  "#/bewerbungen/" + id + "/anschreiben",
  "#/bewerbungen/" + id + "/versand",
  "#/stammdaten/persoenlich",
  "#/stammdaten/stationen",
  "#/stammdaten/kompetenzen",
  "#/anlagen",
  "#/lebenslauf",
  "#/vergleich",
  "#/vorbereitung",
  "#/checklisten",
  "#/wissen",
  "#/wissen/erste-schritte",
  "#/statistik",
  "#/einstellungen",
];

// Rechnet Kontraste selbst nach und misst Klickflächen. WCAG 2.5.8 nimmt Links im Fließtext aus.
const messen = (MIN) => {
  const farbe = (t) => {
    const m = t.match(/[\d.]+/g).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
  };
  const auf = (o, u) => ({ r: o.r * o.a + u.r * (1 - o.a), g: o.g * o.a + u.g * (1 - o.a), b: o.b * o.a + u.b * (1 - o.a), a: 1 });
  const hell = (c) => {
    const k = [c.r, c.g, c.b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  };
  const verhaeltnis = (a, b) => {
    const [x, y] = [hell(a), hell(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const hintergrund = (e) => {
    const stapel = [];
    for (let k = e; k; k = k.parentElement) {
      const s = getComputedStyle(k);
      if (s.backgroundImage !== "none") return null;
      const c = farbe(s.backgroundColor);
      if (c.a > 0) stapel.push(c);
      if (c.a === 1) break;
    }
    return stapel.reduceRight((u, o) => auf(o, u), { r: 255, g: 255, b: 255, a: 1 });
  };
  const sichtbar = (e) => {
    const r = e.getBoundingClientRect();
    return e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && r.width > 1 && r.height > 1;
  };
  const name = (e) => (e.tagName + "." + (e.className.baseVal ?? e.className)).slice(0, 50) + " „" + (e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 25) + "“";

  const kontrast = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const e = n.parentElement;
    if (!n.textContent.trim() || !sichtbar(e) || e.closest("[disabled], [aria-disabled=true], script, style")) continue;
    const u = hintergrund(e);
    if (!u) continue;
    const s = getComputedStyle(e);
    const c = auf(farbe(s.color), u);
    const groesse = parseFloat(s.fontSize);
    const gross = groesse >= 24 || (groesse >= 18.66 && Number(s.fontWeight) >= 700);
    const v = verhaeltnis(c, u);
    if (v < (gross ? 3 : 4.5)) kontrast.push(name(e) + " " + v.toFixed(2));
  }

  const klein = [];
  const ziele = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=option], [role=combobox], summary";
  for (const e of document.querySelectorAll(ziele)) {
    if (!sichtbar(e) && !["checkbox", "radio"].includes(e.type)) continue;
    if (e.disabled) continue;
    // Eingebettete Links im Fließtext sind ausgenommen, und ein Feld zählt mit seiner Beschriftung.
    if (e.tagName === "A" && getComputedStyle(e).display === "inline") continue;
    const flaeche = e.closest("label") || (["checkbox", "radio"].includes(e.type) ? e.parentElement : e);
    const r = flaeche.getBoundingClientRect();
    const nach = getComputedStyle(flaeche, "::after");
    const dazu = nach.content !== "none" && nach.position === "absolute";
    const breite = r.width - (dazu ? parseFloat(nach.left) + parseFloat(nach.right) : 0);
    const hoehe = r.height - (dazu ? parseFloat(nach.top) + parseFloat(nach.bottom) : 0);
    if (hoehe < MIN - 0.5 || breite < MIN - 0.5) klein.push(name(flaeche) + " " + Math.round(breite) + "×" + Math.round(hoehe));
  }
  return { kontrast: [...new Set(kontrast)].slice(0, 12), klein: [...new Set(klein)].slice(0, 12) };
};

for (const channel of kanaele()) {
  console.log("== Barrierefreiheit " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(ordnerStub);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  await p.goto(URLAPP);
  await p.evaluate(AXE);
  const axe = async () =>
    p.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
        // Der Kontrast wird unten selbst gerechnet, auch für Verläufe und Überlagerungen.
        rules: { "color-contrast": { enabled: false } },
      });
      return r.violations.map((v) => v.id + ": " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | "));
    });
  const ordnerFunde = await axe();
  ok("axe Ordnerwahl", ordnerFunde.length === 0, ordnerFunde);
  await demoProfilAnlegen(p);
  await p.evaluate(AXE);
  const id = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen[0].id);

  for (const [thema, schema, schrift] of [["hell", "blau", "normal"], ["dunkel", "blau", "normal"], ["hell", "blau", "sehr-gross"], ["dunkel", "blau", "sehr-gross"]]) {
    await p.evaluate(([t, s, g]) => {
      window.R42J.setTheme(t);
      window.R42J.setScheme(s);
      window.R42J.setFontSize(g);
    }, [thema, schema, schrift]);
    for (const hash of SEITEN(id)) {
      await p.evaluate((h) => {
        location.hash = h;
      }, hash);
      await p.waitForTimeout(120);
      await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect.getTiming().iterations === Infinity));
      const stand = `${thema} ${schrift} ${hash.replace(id, "ID")}`;
      const m = await p.evaluate(messen, MIN);
      ok("Kontrast " + stand, m.kontrast.length === 0, m.kontrast);
      ok("Klickflächen " + stand, m.klein.length === 0, m.klein);
      if (thema === "hell" && schrift === "normal") {
        const v = await axe();
        ok("axe " + stand, v.length === 0, v);
      }
      if (schrift === "sehr-gross") {
        const breit = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        ok("Kein Seitwärtsscrollen " + stand, breit <= 1, breit);
      }
    }
  }
  const skala = await p.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  ok("Sehr große Schrift entspricht 130 %", Math.abs(parseFloat(skala) / 16 - 1.3) < 0.05, skala);

  // Tastatur: Alles Erreichbare zeigt einen sichtbaren Fokus.
  await p.evaluate(() => {
    window.R42J.setTheme("hell");
    window.R42J.setFontSize("normal");
    location.hash = "#/einstellungen";
  });
  await p.waitForTimeout(200);
  await p.locator("body").click({ position: { x: 700, y: 5 } });
  const gesehen = new Set();
  let ohneFokus = [];
  for (let i = 0; i < 60; i++) {
    await p.keyboard.press("Tab");
    const f = await p.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const sichtbar = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      const huelle = getComputedStyle(e.parentElement);
      return { name: e.tagName + " " + (e.getAttribute("aria-label") || e.innerText || e.id || "").slice(0, 30), sichtbar: sichtbar || huelle.boxShadow !== "none" || huelle.outlineStyle !== "none" };
    });
    if (!f) continue;
    gesehen.add(f.name);
    if (!f.sichtbar) ohneFokus.push(f.name);
  }
  ohneFokus = [...new Set(ohneFokus)];
  ok("Tab erreicht viele Ziele", gesehen.size >= 15, [...gesehen]);
  ok("Fokus immer sichtbar", ohneFokus.length === 0, ohneFokus);

  // Nur Tastatur: Suchleiste fokussieren, Escape verlässt sie wieder.
  await p.keyboard.press("Control+k");
  await p.waitForFunction(() => document.activeElement?.closest(".rj-searchbar"));
  ok("Fokus in der Suchleiste", true);
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.activeElement?.closest(".rj-searchbar"));
  ok("Escape verlässt die Suche", true);

  // Bewegung: Mit reduzierter Bewegung läuft nichts Dauerhaftes.
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.evaluate(() => {
    location.hash = "#/uebersicht";
  });
  await p.waitForTimeout(200);
  const lang = await p.evaluate(() => document.getAnimations().filter((a) => a.effect.getTiming().duration > 50).length);
  ok("Reduzierte Bewegung", lang === 0, lang);
  await p.screenshot({ path: join(SP, `a11y-${channel}.png`) });

  ok("Keine Laufzeitfehler", fehler.length === 0, fehler);
  await b.close();
}
console.log(fehlerZahl ? `${fehlerZahl} Fehler` : "Barrierefreiheit bestanden");
process.exit(fehlerZahl ? 1 : 0);
