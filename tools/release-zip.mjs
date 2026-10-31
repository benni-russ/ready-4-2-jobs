// Baut das Release-ZIP ohne Abhängigkeiten: nur die App, die Startdateien, LIESMICH und die Lizenz.
// daten/ ist von Git ausgeschlossen und kommt deshalb nie hinein. Eigener ZIP-Schreiber, weil die
// Startdatei für macOS ihr Ausführungsrecht behalten muss.
// Aufruf: node tools/release-zip.mjs [ziel.zip]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
export const STARTDATEIEN = ["Start (Windows).cmd", "Start (Mac).command", "Start.html"];
const EINZELN = [...STARTDATEIEN, "LIESMICH.html", "LICENSE"];
const AUSFUEHRBAR = "Start (Mac).command";
// 1.1.2026, feste Zeit: gleiche Eingabe ergibt die gleiche Datei.
const DOS_ZEIT = 0;
const DOS_DATUM = ((2026 - 1980) << 9) | (1 << 5) | 1;
const UTF8 = 0x0800;

export function dateien() {
  const liste = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "app", ...EINZELN], {
    cwd: WURZEL,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  return [...new Set(liste)].sort();
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

export function bauen(ziel) {
  const teile = [];
  const verzeichnis = [];
  let versatz = 0;
  for (const name of dateien()) {
    const roh = readFileSync(join(WURZEL, name));
    const gepackt = deflateRawSync(roh, { level: 9 });
    const pfad = Buffer.from(name);
    const pruefsumme = crc32(roh);
    const gemeinsam = [u16(20), u16(UTF8), u16(8), u16(DOS_ZEIT), u16(DOS_DATUM), u32(pruefsumme), u32(gepackt.length), u32(roh.length), u16(pfad.length), u16(0)];
    const kopf = Buffer.concat([u32(0x04034b50), ...gemeinsam, pfad]);
    teile.push(kopf, gepackt);
    const rechte = name === AUSFUEHRBAR ? 0o100755 : 0o100644;
    verzeichnis.push(Buffer.concat([u32(0x02014b50), u16((3 << 8) | 20), ...gemeinsam, u16(0), u16(0), u16(0), u32(rechte * 0x10000), u32(versatz), pfad]));
    versatz += kopf.length + gepackt.length;
  }
  const cd = Buffer.concat(verzeichnis);
  const ende = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(verzeichnis.length), u16(verzeichnis.length), u32(cd.length), u32(versatz), u16(0)]);
  writeFileSync(ziel, Buffer.concat([...teile, cd, ende]));
}

// Liest ein ZIP zurück: Name, Inhalt und Unix-Rechte je Eintrag.
export function lesen(pfad) {
  const b = readFileSync(pfad);
  const ende = b.lastIndexOf(Buffer.from([0x50, 0x4b, 5, 6]));
  const anzahl = b.readUInt16LE(ende + 10);
  let o = b.readUInt32LE(ende + 16);
  const eintraege = [];
  for (let i = 0; i < anzahl; i++) {
    const groesse = b.readUInt32LE(o + 20);
    const langName = b.readUInt16LE(o + 28);
    const langExtra = b.readUInt16LE(o + 30);
    const langNotiz = b.readUInt16LE(o + 32);
    const rechte = b.readUInt32LE(o + 38) >>> 16;
    const lokal = b.readUInt32LE(o + 42);
    const name = b.toString("utf8", o + 46, o + 46 + langName);
    const start = lokal + 30 + b.readUInt16LE(lokal + 26) + b.readUInt16LE(lokal + 28);
    const inhalt = inflateRawSync(b.subarray(start, start + groesse));
    if (crc32(inhalt) !== b.readUInt32LE(o + 16)) throw new Error("Prüfsumme falsch: " + name);
    eintraege.push({ name, inhalt, rechte });
    o += 46 + langName + langExtra + langNotiz;
  }
  return eintraege;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const version = /"([^"]+)"/.exec(readFileSync(join(WURZEL, "app", "version.js"), "utf8"))[1];
  const ziel = process.argv[2] || `r42j-v${version}.zip`;
  bauen(ziel);
  console.log(ziel);
}
