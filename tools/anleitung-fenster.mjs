// Nimmt die Fenster von Windows für LIESMICH.html auf: den Ordnerdialog und die Frage nach dem Bearbeiten.
// Playwright sieht diese Fenster nicht, deshalb fotografiert tools/fenster.ps1 den Bildschirm.
// Die linke Leiste des Dialogs wird verpixelt, die Adresszeile zeigt nur den Pfad ohne Namen des Sticks.
// Nur Windows und Edge. Während des Laufs nicht in andere Fenster klicken, die Tasten gehen sonst dorthin.
// Vor dem Commit jedes Bild ansehen: Das Repo ist öffentlich.
// Aufruf: node tools/anleitung-fenster.mjs E   (Laufwerksbuchstabe des USB-Sticks)
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "../tests/hilfen.mjs";

const lw = (process.argv[2] || "").replace(/[:\\/]/g, "").toUpperCase();
if (process.platform !== "win32" || !/^[A-Z]$/.test(lw)) {
  console.error("Aufruf unter Windows: node tools/anleitung-fenster.mjs <Laufwerksbuchstabe des Sticks>");
  process.exit(1);
}
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const ziel = join(WURZEL, "app", "img", "anleitung");
const stick = lw + ":\\R42J";
if (existsSync(stick)) {
  console.error(stick + " gibt es schon. Verschieb den Ordner oder nimm einen anderen Stick.");
  process.exit(1);
}

const ps = (...a) => execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(WURZEL, "tools", "fenster.ps1"), ...a], { encoding: "utf8" });

// Wie nach dem Entpacken: Startdateien und app, noch ohne daten.
cpSync(join(WURZEL, "app"), join(stick, "app"), { recursive: true });
for (const n of ["Start (Windows).cmd", "Start.html", "LIESMICH.html"]) writeFileSync(join(stick, n), "");

const b = await chromium.launch({ channel: "msedge", headless: false, args: ["--window-position=80,60", "--window-size=1000,720", "--lang=de-DE"] });
try {
  const p = await b.newPage({ viewport: null, locale: "de-DE" });
  await p.goto(pathToFileURL(join(stick, "app", "index.html")).href);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  ps("dialog", join(ziel, "windows-ordner.png"), stick);
  ps("waehlen");
  await p.waitForTimeout(1500);
  ps("browser", join(ziel, "windows-erlauben.png"), "", "0.4");
} finally {
  await b.close();
  rmSync(stick, { recursive: true, force: true });
}
console.log("Bilder liegen in app/img/anleitung/. Vor dem Commit ansehen.");
