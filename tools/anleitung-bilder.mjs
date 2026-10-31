// Nimmt die Bilder für LIESMICH.html aus der laufenden App auf, mit dem erfundenen Demo-Profil.
// Fenster des Betriebssystems sind nicht darunter, die lassen sich nicht ehrlich nachstellen.
// Nur für die Entwicklung. Aufruf: node tools/anleitung-bilder.mjs [msedge|chrome]
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, URLAPP } from "../tests/hilfen.mjs";
import { demoProfilAnlegen, ordnerStub } from "../tests/demo-profil.mjs";

const ziel = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "img", "anleitung");
mkdirSync(ziel, { recursive: true });

const b = await chromium.launch({ channel: process.argv[2] || "msedge", headless: true, args: ["--allow-file-access-from-files"] });
const ctx = await b.newContext({ viewport: { width: 900, height: 640 }, locale: "de-DE", timezoneId: "Europe/Berlin", colorScheme: "light" });
await ctx.addInitScript(ordnerStub);
const p = await ctx.newPage();
await p.goto(URLAPP);
await p.getByRole("button", { name: "Ordner auswählen" }).waitFor();
await p.screenshot({ path: join(ziel, "ordner.png") });
await p.getByRole("button", { name: "Ordner auswählen" }).click();
await p.getByRole("button", { name: "Neues Profil anlegen" }).waitFor();
await p.screenshot({ path: join(ziel, "profile.png") });
await p.evaluate(async () => {
  await new Promise((fertig) => {
    const r = indexedDB.deleteDatabase("r42j");
    r.onsuccess = r.onerror = r.onblocked = fertig;
  });
});
await p.reload();
await demoProfilAnlegen(p);
await p.evaluate(() => {
  location.hash = "#/uebersicht";
});
await p.getByRole("heading", { name: "Übersicht" }).waitFor();
await p.waitForTimeout(400);
await p.screenshot({ path: join(ziel, "uebersicht.png") });
await b.close();
