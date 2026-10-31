// Gemeinsame Grundlagen der Browsertests.
// Playwright gehört nicht zum Repo: R42J_PLAYWRIGHT zeigt auf einen Ordner mit playwright-core.
import { mkdirSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const pw = process.env.R42J_PLAYWRIGHT;
if (!pw) {
  console.error("R42J_PLAYWRIGHT fehlt. Beispiel: npm install --no-save --prefix <ordner> playwright-core");
  process.exit(2);
}

export const { chromium } = createRequire(join(pw, "package.json"))("playwright-core");
export const URLAPP = pathToFileURL(join(HIER, "..", "app", "index.html")).href;

// Ausgaben landen nie im Repo.
export const SP = process.env.R42J_AUSGABE || mkdtempSync(join(tmpdir(), "r42j-test-"));
mkdirSync(SP, { recursive: true });

// Wählt in einem Dropdown per Klick, wert ist der gespeicherte Wert oder { label }.
export async function waehle(p, feld, wert) {
  await feld.click();
  const o = wert.label ? p.getByRole("option", { name: wert.label, exact: true }) : p.locator(`[role=option][data-wert="${wert}"]`);
  await o.click();
}

export function kanaele() {
  return process.argv[2] ? [process.argv[2]] : (process.env.R42J_KANAELE || "msedge,chrome").split(",");
}

// Liest ein PDF mit pypdf, also unabhängig von dem, was es erzeugt hat.
export function pdfInfo(pfad) {
  return JSON.parse(
    execFileSync(process.env.R42J_PYTHON || "python", [join(HIER, "pdf-pruefen.py"), pfad], {
      env: { ...process.env, PYTHONIOENCODING: "utf8" },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
}

// Bleibt die Profilauswahl aus, zeigt die Ausgabe, was stattdessen auf dem Bildschirm stand.
export async function profilWaehlen(p, name) {
  await p.getByRole("button", { name: new RegExp(name) }).click().catch(async (e) => {
    const stand = await p.evaluate(async () => {
      const K = window.R42J_CORE;
      const zeitlimit = new Promise((fertig) => setTimeout(() => fertig("haengt"), 3000));
      const liste = await Promise.race([K.profile.listeMitZeit().catch((e) => String(e)), zeitlimit]);
      return { url: location.href, ablauf: K.ablauf.get().phase, liste, text: document.body.innerText.slice(0, 500) };
    });
    console.log("Profilauswahl fehlt: " + JSON.stringify(stand));
    throw e;
  });
}
