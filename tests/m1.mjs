import { chromium, URLAPP, SP, kanaele, pdfInfo } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const PW2 = "Ein ganz anderer langer Satz 42";
const NAME = "Testperson Muster";
const GEHEIM = "ZZ-GEHEIMER-INHALT-ZZ";

// Echte Datei-Handles aus dem privaten Browser-Speicher statt des Systemdialogs.
const stub = () => {
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const name = window.__wahl || "r42j";
    const d = await root.getDirectoryHandle(name, { create: true });
    if (name === "r42j") {
      const app = await d.getDirectoryHandle("app", { create: true });
      await app.getFileHandle("version.js", { create: true });
    }
    return d;
  };
  window.showOpenFilePicker = async () => [window.__datei];
  window.print = () => { window.__gedruckt = true; };
  // OPFS-Handles melden keine eigene Berechtigung außerhalb sicherer Pfade nicht immer: fest erlauben.
  for (const T of typeof FileSystemDirectoryHandle === "undefined" ? [] : [FileSystemDirectoryHandle]) {
    T.prototype.queryPermission = async () => "granted";
    T.prototype.requestPermission = async () => "granted";
  }
};

const lesenHex = (p, pfad) => p.evaluate(async (pfad) => {
  let d = await navigator.storage.getDirectory();
  const t = pfad.split("/");
  for (const s of t.slice(0, -1)) d = await d.getDirectoryHandle(s);
  const f = await (await d.getFileHandle(t[t.length - 1])).getFile();
  return new TextDecoder("latin1").decode(await f.arrayBuffer());
}, pfad);
const liste = (p, pfad) => p.evaluate(async (pfad) => {
  let d = await navigator.storage.getDirectory();
  for (const s of pfad.split("/")) d = await d.getDirectoryHandle(s);
  const n = []; for await (const e of d.values()) n.push(e.name); return n;
}, pfad);
const pwFelder = (p) => p.locator('input[autocomplete="new-password"]');

async function entsperren(p, pw = PW) {
  await p.getByLabel("Passwort", { exact: true }).fill(pw);
  await p.getByRole("button", { name: "Entsperren" }).click();
}

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
  await ctx.addInitScript(stub);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", (m) => { logs.push(m.type() + ": " + m.text()); });
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await p.goto(URLAPP);

  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  ok("Dialog: Fokus im Namensfeld", await p.evaluate(() => document.activeElement.tagName === "INPUT"));
  await p.keyboard.type(NAME);
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Wie soll R42J aussehen?" }).waitFor();
  ok("kein Tresor vor Schritt 3", !(await liste(p, "r42j/daten")).includes("profile.json"));
  await p.getByRole("button", { name: "Weiter" }).click();
  await pwFelder(p).nth(0).fill("kurz");
  await pwFelder(p).nth(1).fill("kurz");
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByText("mindestens 12 Zeichen.").first().waitFor();
  await pwFelder(p).nth(0).fill(PW);
  await pwFelder(p).nth(1).fill(PW + "x");
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByText("stimmen nicht überein").waitFor();
  await pwFelder(p).nth(1).fill(PW);
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByRole("heading", { name: "Sichere deinen" }).waitFor();
  const code = await p.locator(".rj-recovery code").allInnerTexts();
  ok("Schlüssel 8×6", code.length === 8 && code.every((c) => /^[A-HJ-NP-Z2-9]{6}$/.test(c)), code.length);
  await p.getByRole("button", { name: "Schlüssel drucken" }).click();
  ok("Drucken", await p.evaluate(() => window.__gedruckt === true));
  await p.emulateMedia({ media: "print" });
  ok("Druck: Knöpfe verborgen", !(await p.getByRole("button", { name: "Schlüssel drucken" }).isVisible()));
  ok("Druck: Name sichtbar", await p.getByText("Profil: " + NAME).isVisible());
  await p.emulateMedia({ media: "screen" });
  await p.screenshot({ path: `${SP}/m1-${channel}-schluessel.png`, fullPage: true });
  await p.getByLabel("Die ersten zwei Blöcke").fill("AAAAAA");
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByText("nicht die ersten zwei Blöcke").waitFor();
  await p.getByLabel("Die ersten zwei Blöcke").fill(code[0].toLowerCase() + " " + code[1]);
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByRole("heading", { name: "zweiten Ort" }).waitFor({ timeout: 8000 });

  await p.evaluate(() => { window.__wahl = "zweiter-ort"; });
  await p.getByRole("button", { name: "Zweiten Ort wählen" }).click();
  await p.getByText("Zweiter Ort: zweiter-ort").waitFor();
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  ok("Update-Prüfung Standard aus", (await p.getByRole("switch").getAttribute("aria-checked")) === "false");

  // Abbruch mitten im Onboarding: Fortsetzen nach Neuladen.
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await p.waitForTimeout(2400);
  await p.reload();
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await entsperren(p);
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor({ timeout: 8000 });
  ok("Onboarding wird fortgesetzt", true);
  await p.getByLabel(/Eigenes Bewerbungs-Postfach/).check();
  await p.getByRole("button", { name: "Weiter" }).click();
  await p.getByRole("button", { name: "Überspringen" }).click();
  await p.getByRole("heading", { name: "Wofür bewirbst du dich" }).waitFor();
  await p.getByRole("button", { name: "Überspringen" }).click();
  await p.waitForSelector(".rj-shell");
  await p.waitForTimeout(200);
  ok("Fokus nach Entsperren im Inhalt", await p.evaluate(() => document.activeElement.tagName === "MAIN"));
  ok("Regression: 9 Navigationslinks", (await p.locator(".rj-nav a").count()) === 9);

  // Inhalt über die Kern-API einspielen, dann Klartext-Prüfung auf der Datei.
  await p.evaluate((g) => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => { d.profil = { vorname: g }; });
    return K.tresor.speichernJetzt();
  }, GEHEIM);
  const id = (JSON.parse(await lesenHex(p, "r42j/daten/profile.json"))).profile[0].id;
  const roh = await lesenHex(p, `r42j/daten/${id}/tresor.r42j`);
  const kopf = JSON.parse(roh);
  ok("Format", kopf.format === "r42j-vault" && kopf.v === 1 && kopf.kdf.iter === 600000 && !!kopf.wrapped.pw && !!kopf.wrapped.recovery);
  ok("Kein Klartext in Tresor", !roh.includes(GEHEIM) && !roh.includes(NAME) && !atob(kopf.data).includes(GEHEIM));
  ok("Keine Passwörter/Klartext in Konsole", !logs.some((l) => l.includes(PW) || l.includes(GEHEIM) || code.some((c) => l.includes(c))));

  // Passwortwechsel
  await p.goto("about:blank"); await p.goto(URLAPP + "#/einstellungen");
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  const t0 = Date.now();
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  const dauer = Date.now() - t0;
  ok("Entsperren < 2 s", dauer < 2000, dauer);
  await p.getByRole("button", { name: "Passwort ändern" }).click();
  await p.getByLabel("Aktuelles Passwort").fill("falsch falsch falsch");
  await pwFelder(p).nth(0).fill(PW2);
  await pwFelder(p).nth(1).fill(PW2);
  await p.getByRole("dialog").getByRole("button", { name: "Passwort ändern" }).click();
  await p.getByText("Das Passwort stimmt nicht").waitFor();
  await p.getByLabel("Aktuelles Passwort").fill(PW);
  await p.getByRole("dialog").getByRole("button", { name: "Passwort ändern" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached", timeout: 8000 });
  ok("Passwort geändert", true);

  // Sperren per Knopf, altes Passwort geht nicht mehr, neues schon; Daten sind noch da.
  await p.getByRole("button", { name: "Jetzt sperren" }).click();
  await p.getByRole("heading", { name: "Hallo " + NAME }).waitFor();
  await p.screenshot({ path: SP + "/m1-" + channel + "-sperre.png" });
  ok("Sperre: Passwortfeld fokussiert", await p.evaluate(() => document.activeElement.type === "password"));
  ok("Sperre: Daten aus Speicher", await p.evaluate(() => window.R42J_CORE.tresor.daten() === null));
  await entsperren(p, PW);
  await p.getByText("Das Passwort stimmt nicht").waitFor({ timeout: 8000 });
  await entsperren(p, PW2);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  ok("Passwortwechsel ohne Datenverlust", (await p.evaluate(() => window.R42J_CORE.tresor.daten().profil.vorname)) === GEHEIM);

  // Wiederherstellungsschlüssel
  await p.getByRole("button", { name: "Jetzt sperren" }).click();
  await p.getByRole("link", { name: "Wiederherstellungsschlüssel verwenden" }).click();
  await p.getByLabel(/^Wiederherstellungsschlüssel/).fill("AAAAAA".repeat(8));
  await pwFelder(p).nth(0).fill(PW);
  await pwFelder(p).nth(1).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.getByText("passt nicht zu diesem Profil").waitFor({ timeout: 8000 });
  await p.getByLabel(/^Wiederherstellungsschlüssel/).fill(code.join("-"));
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  ok("Entsperren mit Schlüssel", (await p.evaluate(() => window.R42J_CORE.tresor.daten().profil.vorname)) === GEHEIM);

  // Backups: zweiter Ort, Rotation, Wiederherstellung
  await p.goto("about:blank"); await p.goto(URLAPP);
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  await p.evaluate(async () => {
    const K = window.R42J_CORE, e = K.tresor.eintrag();
    for (let i = 0; i < 3; i++) { await K.backup.erstellen(e, false); await new Promise((r) => setTimeout(r, 1050)); }
  });
  const bk = async (ort) => (await liste(p, ort)).filter((n) => n.endsWith(".r42jb")).sort();
  const ortLokal = `r42j/daten/${id}/backups`;
  ok("Ein Tag: lokal 1", (await bk(ortLokal)).length === 1, await bk(ortLokal));
  ok("Ein Tag: zweiter Ort 1", (await bk("zweiter-ort")).length === 1);
  // Ältere Tage untergeschoben: je Tag die neueste, insgesamt 3.
  await p.evaluate(async ([ortLokal, id]) => {
    const K = window.R42J_CORE, e = K.tresor.eintrag();
    const w = await navigator.storage.getDirectory();
    for (const ort of [ortLokal, "zweiter-ort"]) {
      let d = w;
      for (const s of ort.split("/")) d = await d.getDirectoryHandle(s);
      const quelle = (await K.fs.dateien(d)).filter((x) => x.name.endsWith(".r42jb"))[0];
      const echt = await (await quelle.getFile()).arrayBuffer();
      for (const st of ["2020-01-01-100000", "2020-01-02-100000", "2020-01-03-090000", "2020-01-03-180000"]) {
        const f = await d.getFileHandle("r42j-backup-" + e.id.slice(0, 8) + "-" + st + ".r42jb", { create: true });
        const s2 = await f.createWritable(); await s2.write(echt); await s2.close();
      }
    }
    await K.backup.erstellen(e, false);
  }, [ortLokal, id]);
  for (const ort of [ortLokal, "zweiter-ort"]) {
    const n = await bk(ort);
    ok("Rotation 3 je Tag: " + ort.slice(0, 6), n.length === 3 && n[0].includes("2020-01-02-100000") && n[1].includes("2020-01-03-180000"), n);
  }
  const z2 = (await bk("zweiter-ort")).filter((n) => !n.includes("2020-"));
  ok("Dateiname ohne Klarnamen", z2.every((n) => !/testperson|muster/i.test(n)));
  ok("Backup ohne Klartext", !(await lesenHex(p, "zweiter-ort/" + z2[0])).includes(GEHEIM));

  // Stand ändern, dann Sicherung vom zweiten Ort einspielen: alter Wert muss zurück sein.
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => { d.profil = { vorname: "GEAENDERT" }; });
    return K.tresor.speichernJetzt();
  });
  await p.goto("about:blank"); await p.goto(URLAPP + "#/einstellungen");
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  await p.evaluate(async (n) => {
    const r = await navigator.storage.getDirectory();
    const d = await r.getDirectoryHandle("zweiter-ort");
    window.__datei = await d.getFileHandle(n);
  }, (await bk("zweiter-ort")).find((n) => n.includes("2020-01-03-180000")));
  await p.getByRole("button", { name: "Aus Datei wiederherstellen" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Wiederherstellen" }).click();
  await p.getByText("Sicherung eingespielt").waitFor({ timeout: 8000 });
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  ok("Backup vom zweiten Ort wiederhergestellt", (await p.evaluate(() => window.R42J_CORE.tresor.daten().profil.vorname)) === GEHEIM);
  // Eine spätere Sicherung am selben Tag darf die Schutzkopie nicht verdrängen.
  await p.waitForTimeout(1100);
  await p.evaluate(() => { const K = window.R42J_CORE; return K.backup.erstellen(K.tresor.eintrag(), false); });
  ok("Schutzkopie bleibt erhalten", (await bk(ortLokal)).some((n) => n.endsWith("-schutz.r42jb")), await bk(ortLokal));
  ok("Höchstens 3 plus Schutzkopie", (await bk(ortLokal)).length <= 4, await bk(ortLokal));

  // Export wird beim Sperren geleert
  await p.evaluate(async () => {
    const r = await navigator.storage.getDirectory();
    const d = await (await (await r.getDirectoryHandle("r42j")).getDirectoryHandle("daten")).getDirectoryHandle("export");
    await d.getFileHandle("rest.pdf", { create: true });
  });
  await p.getByRole("button", { name: "Jetzt sperren" }).click();
  await p.getByRole("heading", { name: "Hallo " + NAME }).waitFor();
  await p.waitForTimeout(300);
  ok("Export beim Sperren geleert", (await liste(p, "r42j/daten/export")).length === 0);

  // Auto-Sperre mit Testuhr
  await p.clock.install();
  await p.reload();
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => { d.einstellungen.sperreMinuten = 5; });
    return K.tresor.speichernJetzt();
  });
  await p.clock.fastForward("04:30");
  ok("vor Ablauf nicht gesperrt", await p.locator(".rj-shell").isVisible());
  await p.clock.fastForward("00:45");
  await p.getByText("wegen Inaktivität").waitFor({ timeout: 5000 });
  ok("Auto-Sperre nach eingestellter Zeit", await p.evaluate(() => !window.R42J_CORE.tresor.offen()));

  // Profil löschen
  await p.goto("about:blank"); await p.goto(URLAPP + "#/einstellungen");
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await entsperren(p);
  await p.waitForSelector(".rj-shell", { timeout: 8000 });
  await p.screenshot({ path: SP + "/m1-" + channel + "-einstellungen.png", fullPage: true });
  await p.setViewportSize({ width: 375, height: 800 });
  await p.waitForTimeout(300);
  ok("375 px: kein Querscroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await p.screenshot({ path: SP + "/m1-" + channel + "-375.png", fullPage: true });
  await p.setViewportSize({ width: 1280, height: 900 });
  // Alte Sicherungen entfernen beim Passwortwechsel
  await p.getByRole("button", { name: "Passwort ändern" }).click();
  await p.getByLabel("Aktuelles Passwort").fill(PW);
  await pwFelder(p).nth(0).fill(PW);
  await pwFelder(p).nth(1).fill(PW);
  await p.getByLabel(/Alte Sicherungen entfernen/).check();
  await p.getByRole("dialog").getByRole("button", { name: "Passwort ändern" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached", timeout: 8000 });
  ok("Alte Sicherungen entfernt: lokal 1", (await liste(p, `r42j/daten/${id}/backups`)).filter((n) => n.endsWith(".r42jb")).length === 1);
  ok("Alte Sicherungen entfernt: zweiter Ort 1", (await liste(p, "zweiter-ort")).filter((n) => n.endsWith(".r42jb")).length === 1);
  await p.evaluate(() => { location.hash = "#/komponenten"; });
  await p.getByRole("heading", { name: "Komponenten" }).first().waitFor();
  ok("Komponenten-Seite", true);
  await p.evaluate(() => { location.hash = "#/einstellungen"; });
  await p.getByRole("button", { name: "Profil löschen" }).click();
  await p.getByRole("dialog").getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Endgültig löschen" }).click();
  await p.getByRole("heading", { name: "Wer arbeitet heute?" }).waitFor({ timeout: 8000 });
  ok("Profil gelöscht", !(await liste(p, "r42j/daten")).includes(id) && (await p.locator(".rj-profile").count()) === 1);

  const stoerung = logs.filter((l) => /^(error|warning|pageerror)/.test(l));
  ok("Konsole sauber", stoerung.length === 0, stoerung);
  await b.close();
}
console.log(fehlerZahl ? "FEHLER: " + fehlerZahl : "alles bestanden");
process.exit(fehlerZahl ? 1 : 0);
