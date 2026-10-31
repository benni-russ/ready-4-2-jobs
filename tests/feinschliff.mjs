// Feedback-Feinschliff: Rahmen, Bearbeiten-Schutz und neue Abläufe. Testdaten frei erfunden.
import { chromium, URLAPP, SP, kanaele } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";

const stub = () => {
  if (typeof FileSystemDirectoryHandle === "undefined") return;
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle(window.__wahl || "r42j", { create: true });
    if (!window.__wahl) {
      const app = await d.getDirectoryHandle("app", { create: true });
      await app.getFileHandle("version.js", { create: true });
    }
    return d;
  };
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const hin = (p, hash) => p.evaluate((h) => { location.hash = h; }, hash);
const profil = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.R42J_CORE.tresor.daten().profil)));
const krumen = (p) => p.locator(".rj-breadcrumb li").allInnerTexts();

export async function einrichten(ctx) {
  const p = await ctx.newPage();
  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  await p.keyboard.type("Testperson Muster");
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Wie soll R42J aussehen?" }).waitFor();
  await knopf(p, "Weiter").click();
  const pwf = p.locator('input[autocomplete="new-password"]');
  await pwf.nth(0).fill(PW);
  await pwf.nth(1).fill(PW);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Sichere deinen" }).waitFor();
  const code = await p.locator(".rj-recovery code").allInnerTexts();
  await p.getByLabel("Die ersten zwei Blöcke").fill(code[0] + " " + code[1]);
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "zweiten Ort" }).waitFor({ timeout: 8000 });
  await p.evaluate(() => { window.__wahl = "zweiter-ort"; });
  await p.getByRole("button", { name: "Zweiten Ort wählen" }).click();
  await p.getByText("Zweiter Ort: zweiter-ort").waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Testperson");
  await p.getByLabel("Nachname").fill("Muster");
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Wofür bewirbst du dich?" }).waitFor();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  return p;
}

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
  await ctx.addInitScript(stub);
  const logs = [];
  ctx.on("page", (s) => {
    s.on("pageerror", (e) => logs.push("pageerror: " + e.message));
    s.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
  });
  const p = await einrichten(ctx);

  // Rahmen
  ok("Logo nennt den langen Namen", (await p.locator(".rj-logo__sub").first().innerText()) === "Ready 4 2 Jobs");
  ok("Fenstertitel nennt den langen Namen", (await p.title()).includes("Ready 4 2 Jobs"), await p.title());
  ok("Übersicht ohne Breadcrumb", (await p.locator(".rj-breadcrumb").count()) === 0);
  await hin(p, "#/stammdaten/interview");
  await p.locator(".rj-breadcrumb").waitFor();
  const k = await krumen(p);
  ok("Breadcrumb KI-Interview", k.length === 3 && k[1].includes("Stammdaten"), k);
  await p.locator(".rj-breadcrumb a", { hasText: "Stammdaten" }).click();
  await p.waitForFunction(() => location.hash === "#/stammdaten");
  ok("Breadcrumb führt zurück", true);

  await hin(p, "#/uebersicht");
  await p.keyboard.press("Control+k");
  ok("Strg+K fokussiert die Suche", await p.evaluate(() => !!document.activeElement.closest(".rj-searchbar")));
  await p.keyboard.press("Escape");
  await p.locator("main").click({ position: { x: 5, y: 5 } });
  await p.keyboard.press("/");
  ok("/ fokussiert die Suche", await p.evaluate(() => !!document.activeElement.closest(".rj-searchbar")));
  ok("/ landet nicht im Feld", (await p.locator(".rj-searchbar input").inputValue()) === "");
  await p.keyboard.press("Escape");
  const kbd = await p.locator(".rj-searchbar kbd").allInnerTexts();
  ok("Tastenkürzel sichtbar", kbd.includes("Strg+K") && kbd.includes("/"), kbd);

  // Bearbeiten-Schutz
  await hin(p, "#/stammdaten/persoenlich");
  await knopf(p, "Bearbeiten").waitFor();
  ok("Ausgefülltes Formular ist geschützt", (await p.getByLabel("Vorname").count()) === 0);
  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("a/b");
  ok("/ im Feld bleibt ein Zeichen", (await p.getByLabel("Ort").first().inputValue()) === "a/b");
  await p.getByLabel("Ort").first().fill("Musterstadt");
  ok("Entwurf bleibt außerhalb des Tresors", !(await profil(p)).adresse?.ort);

  await p.locator(".rj-sidebar a, .rj-nav a", { hasText: "Wissen" }).first().click();
  await p.getByRole("dialog").waitFor();
  ok("Verlassen fragt nach", await p.getByRole("heading", { name: "Änderungen verwerfen?" }).isVisible());
  ok("Adresse bleibt stehen", (await p.evaluate(() => location.hash)).includes("persoenlich"));
  await knopf(p, "Weiter bearbeiten").click();
  ok("Entwurf übersteht die Rückfrage", (await p.getByLabel("Ort").first().inputValue()) === "Musterstadt");

  // Der abgewiesene Link hinterlässt einen gleichen Verlaufseintrag, darum zweimal zurück.
  await p.goBack();
  await p.goBack();
  await p.getByRole("dialog").waitFor();
  ok("Browser-Zurück fragt nach", true);
  await knopf(p, "Weiter bearbeiten").click();
  await p.waitForTimeout(150);
  ok("Keine Rückfrage-Schleife", (await p.getByRole("dialog").count()) === 0);

  await knopf(p, "Abbrechen").click();
  await knopf(p, "Bearbeiten").waitFor();
  ok("Abbrechen verwirft", !(await profil(p)).adresse?.ort);

  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("Musterstadt");
  await knopf(p, "Speichern").click();
  await p.locator(".rj-savestate[data-stand=gespeichert]").waitFor();
  ok("Speichern schreibt und meldet", (await profil(p)).adresse?.ort === "Musterstadt");

  // Sperren sichert den Entwurf verschlüsselt.
  await knopf(p, "Bearbeiten").click();
  await p.getByLabel("Ort").first().fill("Beispielstadt");
  await p.getByRole("button", { name: "Sperren" }).first().click();
  await p.getByLabel("Passwort", { exact: true }).waitFor();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  ok("Sperre speichert den Entwurf", (await profil(p)).adresse?.ort === "Beispielstadt", await profil(p));

  // Breite Bildschirme
  await p.setViewportSize({ width: 1920, height: 1080 });
  await hin(p, "#/stammdaten/persoenlich");
  await knopf(p, "Bearbeiten").waitFor();
  const breit = await p.evaluate(() => document.querySelector(".rj-content").getBoundingClientRect().width);
  ok("1920 px nutzt die Breite", breit > 1200 && breit <= 1560, breit);
  await p.screenshot({ path: `${SP}/feinschliff-${channel}-1920.png` });

  ok("Keine Fehler in der Konsole", logs.length === 0, logs);
  await b.close();
}
console.log(fehlerZahl ? fehlerZahl + " FEHLER" : "ALLES OK");
process.exit(fehlerZahl ? 1 : 0);
