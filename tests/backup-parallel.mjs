// Sicherungen dürfen sich nicht gegenseitig stören: Entsperren, Sperren und „Jetzt sichern“ können zusammenfallen.
import { chromium, URLAPP, kanaele } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}

const stub = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle("r42j", { create: true });
    const app = await d.getDirectoryHandle("app", { create: true });
    await app.getFileHandle("version.js", { create: true });
    return d;
  };
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ locale: "de-DE" });
  await ctx.addInitScript(stub);
  const p = await ctx.newPage();
  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).waitFor();
  const ergebnis = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    await K.tresor.erstellen("Testperson Muster", "Mein Hund frisst gerne 7 Kekse", K.krypto.neuerCode());
    const e = K.tresor.eintrag();
    const runde = async (n) => {
      const r = await Promise.allSettled(Array.from({ length: n }, (_, i) => {
        K.tresor.aendern((d) => { d.profil.vorname = "Lauf" + i; });
        return Promise.all([K.backup.erstellen(e, false), K.tresor.speichernJetzt()]);
      }));
      return r.filter((x) => x.status === "rejected").map((x) => x.reason && (x.reason.schluessel || x.reason.message));
    };
    const fehler = [];
    for (let i = 0; i < 5; i++) fehler.push(...(await runde(8)));
    await K.backup.alteEntfernen(e).catch((x) => fehler.push("alte:" + x.schluessel));
    const ordner = await K.profile.ordner(e, ["backups"]);
    const namen = (await K.fs.dateien(ordner)).map((d) => d.name);
    const gueltig = [];
    for (const n of namen) if (n.endsWith(".r42jb")) { K.backup.pruefen(await K.fs.lesen(ordner, n)); gueltig.push(n); }
    return { fehler, namen, gueltig };
  });
  ok("Parallele Sicherungen ohne Fehler", ergebnis.fehler.length === 0, ergebnis.fehler.slice(0, 4));
  ok("Keine Reste", ergebnis.namen.every((n) => !n.endsWith(".tmp")), ergebnis.namen);
  ok("Genau eine gültige Sicherung", ergebnis.gueltig.length === 1, ergebnis.namen);
  await b.close();
}
console.log(fehlerZahl ? "FEHLER: " + fehlerZahl : "alles bestanden");
process.exit(fehlerZahl ? 1 : 0);
