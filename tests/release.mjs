// Release-ZIP: Inhalt, Ausschlüsse, Rechte und Prüfsummen. Braucht nur Node.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bauen, lesen, STARTDATEIEN } from "../tools/release-zip.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const pfad = join(mkdtempSync(join(tmpdir(), "r42j-zip-")), "r42j.zip");
bauen(pfad);
const eintraege = lesen(pfad);
const namen = eintraege.map((e) => e.name);

for (const n of [...STARTDATEIEN, "LIESMICH.html", "LICENSE", "app/index.html", "app/version.js", "app/lib/LICENSES/ibm-plex-sans-OFL.txt", "app/fonts/pdf-schrift.js"]) {
  ok("enthält " + n, namen.includes(n));
}
const VERBOTEN = /^(daten|tests|tools|docs|\.github|\.git|\.claude)\/|^(CLAUDE|SPEC|PLAN|README)\.md$|\.(r42j|r42jb|enc|ttf)$|^\.|(^|\/)\.env/;
const falsch = namen.filter((n) => VERBOTEN.test(n));
ok("keine Daten und Entwicklungsdateien", falsch.length === 0, falsch);
const oben = [...new Set(namen.map((n) => n.split("/")[0]))].sort();
ok("oberste Ebene wie erwartet", JSON.stringify(oben) === JSON.stringify(["LICENSE", "LIESMICH.html", "Start (Mac).command", "Start (Windows).cmd", "Start.html", "app"]), oben);

const mac = eintraege.find((e) => e.name === "Start (Mac).command");
ok("Mac-Startdatei ausführbar", (mac.rechte & 0o111) === 0o111, mac.rechte.toString(8));
ok("Andere Dateien nicht ausführbar", eintraege.filter((e) => e !== mac && e.rechte & 0o111).length === 0);
ok("Mac-Startdatei mit LF", !mac.inhalt.includes("\r"));
ok("Windows-Startdatei mit CRLF", eintraege.find((e) => e.name === "Start (Windows).cmd").inhalt.includes("\r\n"));
ok(
  "Inhalte gleich dem Arbeitsstand",
  eintraege.every((e) => readFileSync(join(WURZEL, e.name)).equals(e.inhalt)),
);

const zweite = pfad + ".2";
bauen(zweite);
ok("Gleiche Eingabe, gleiche Datei", readFileSync(pfad).equals(readFileSync(zweite)));

console.log(fehlerZahl ? `${fehlerZahl} Fehler` : "Release-ZIP bestanden");
process.exit(fehlerZahl ? 1 : 0);
