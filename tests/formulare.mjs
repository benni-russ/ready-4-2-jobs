// Formular-Feinschliff: Datumsmaske, Dropdown, Platzhalter und Überlappungen.
import { chromium, URLAPP, SP, kanaele } from "./hilfen.mjs";

let fehlerZahl = 0;
function ok(name, wahr, info) {
  if (!wahr) fehlerZahl++;
  console.log((wahr ? "  ok   " : "  FAIL ") + name + (info !== undefined && !wahr ? " -> " + JSON.stringify(info) : ""));
}
const PW = "Mein Hund frisst gerne 7 Kekse";
const NAME = "Testperson Muster";

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
  window.print = () => {};
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};
const knopf = (p, name) => p.getByRole("button", { name, exact: true });
const dlg = (p) => p.locator(".rj-dialog");

async function einrichten(p) {
  await p.goto(URLAPP);
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  await p.keyboard.type(NAME);
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
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Wofür bewirbst du dich?" }).waitFor();
  await p.getByLabel(/^Name/).fill("Vertrieb Innendienst");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  await p.waitForTimeout(300);
}

// Tippt ins Feld und liefert Wert und Cursor.
async function zustand(feld) {
  return feld.evaluate((e) => ({ w: e.value, c: e.selectionStart }));
}

async function maskeTesten(p) {
  await p.evaluate(() => { location.hash = "#/komponenten"; });
  const feld = p.getByLabel("Eintrittstermin", { exact: true });
  await feld.waitFor({ timeout: 8000 });

  await feld.fill("");
  await feld.click();
  await p.keyboard.type("14102026");
  ok("Tippen setzt Punkte", (await zustand(feld)).w === "14.10.2026", await zustand(feld));
  await p.keyboard.press("Tab");
  ok("Nach dem Verlassen gültig", (await feld.getAttribute("aria-invalid")) === null);

  await feld.fill("");
  await feld.click();
  await p.keyboard.type("14");
  ok("Punkt erscheint nach dem Tag", (await zustand(feld)).w === "14.", await zustand(feld));
  await p.keyboard.press("Backspace");
  ok("Rücktaste löscht den Punkt", (await zustand(feld)).w === "14", await zustand(feld));
  await p.keyboard.press("Backspace");
  ok("Rücktaste löscht weiter", (await zustand(feld)).w === "1", await zustand(feld));

  await feld.fill("");
  await feld.click();
  await p.keyboard.type("1.1.2027");
  ok("Eigene Punkte bleiben möglich", (await zustand(feld)).w === "1.1.2027", await zustand(feld));
  await p.keyboard.press("Tab");
  ok("Kurzform wird vereinheitlicht", (await feld.inputValue()) === "01.01.2027");

  // Cursor mitten im Wert: Rücktaste am Punkt springt über ihn, statt festzuhängen.
  await feld.fill("14.10.2026");
  await feld.click();
  await feld.evaluate((e) => e.setSelectionRange(3, 3));
  await p.keyboard.press("Backspace");
  ok("Rücktaste am Punkt", JSON.stringify(await zustand(feld)) === '{"w":"14.10.2026","c":2}', await zustand(feld));
  await p.keyboard.press("Backspace");
  ok("Danach löscht sie die Ziffer", (await zustand(feld)).w === "1.10.2026", await zustand(feld));
  await p.keyboard.type("5");
  ok("Tippen in der Mitte", JSON.stringify(await zustand(feld)) === '{"w":"15.10.2026","c":3}', await zustand(feld));
  await feld.evaluate((e) => e.setSelectionRange(2, 2));
  await p.keyboard.press("Delete");
  ok("Entf am Punkt springt über ihn", JSON.stringify(await zustand(feld)) === '{"w":"15.10.2026","c":3}', await zustand(feld));

  // Mittlerer Teil gelöscht: Das Jahr rutscht nicht nach.
  await feld.evaluate((e) => e.setSelectionRange(3, 5));
  await p.keyboard.press("Backspace");
  await p.keyboard.type("11");
  ok("Markierung ersetzen", (await zustand(feld)).w === "15.11.2026", await zustand(feld));

  await feld.evaluate((e) => e.setSelectionRange(10, 10));
  await p.keyboard.type("9");
  ok("Volles Feld nimmt nichts mehr an", (await zustand(feld)).w === "15.11.2026", await zustand(feld));
  await feld.fill("");
  await feld.click();
  await p.keyboard.type("x");
  ok("Buchstaben fallen weg", (await zustand(feld)).w === "", await zustand(feld));

  const einfuegen = (text) => feld.evaluate((e, text) => {
    e.value = text;
    e.setSelectionRange(text.length, text.length);
    e.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
    return e.value;
  }, text);
  ok("Einfügen mit Punkten", (await einfuegen("14.10.2026")) === "14.10.2026");
  ok("Einfügen ohne Punkte", (await einfuegen("14102026")) === "14.10.2026");
  ok("Einfügen ISO", (await einfuegen("2026-10-14")) === "14.10.2026");
  ok("Einfügen mit Schrägstrich", (await einfuegen(" 14/10/2026 ")) === "14.10.2026");
  ok("Unlesbares bleibt stehen", (await einfuegen("14. Oktober 2026")) === "14. Oktober 2026");
  await feld.blur();
  ok("Und führt zur Fehlermeldung", (await feld.getAttribute("aria-invalid")) === "true");
  await feld.fill("");
  await feld.blur();

  // Englisch nutzt Schrägstriche.
  const trenner = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const alt = K.sprache;
    K.sprache = () => "en";
    const e = K.maskeDatum({ wert: "14102026", cursor: 8, vorher: "1410202", art: "insertText" }).wert;
    K.sprache = alt;
    return e;
  });
  ok("Englisches Format", trenner === "14/10/2026", trenner);

  const monat = await p.evaluate(() => {
    const m = window.R42J_CORE.maskeMonat;
    const t = (wert, art) => m({ wert, cursor: wert.length, vorher: wert.slice(0, -1), art: art || "insertText" }).wert;
    return [t("03"), t("032021"), t("3/2021"), t("2021"), t("20"), m({ wert: "03", cursor: 2, vorher: "03/", art: "deleteContentBackward" }).wert];
  });
  ok("Monatsmaske", JSON.stringify(monat) === '["03/","03/2021","3/2021","2021","20","03"]', monat);

  // Der Screenreader liest weiter Beschriftung und Format.
  ok("Feld bleibt beschriftet", (await feld.getAttribute("placeholder")) === "TT.MM.JJJJ");
}

async function monatTesten(p) {
  await p.evaluate(() => { location.hash = "#/stammdaten/stationen"; });
  await knopf(p, "Station anlegen").click();
  const von = dlg(p).getByLabel(/^Von/);
  await von.click();
  await p.keyboard.type("032021");
  ok("Monat im Dialog", (await von.inputValue()) === "03/2021", await von.inputValue());
  await p.keyboard.press("Tab");
  ok("Monat bleibt nach dem Verlassen", (await von.inputValue()) === "03/2021");
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" });
}

async function dropdownTesten(p) {
  await p.evaluate(() => { location.hash = "#/stammdaten/kompetenzen"; });
  await knopf(p, "Kompetenz anlegen").click();
  const k = dlg(p).getByRole("combobox", { name: "Niveau" });
  await k.waitFor();

  ok("Rolle und Popup-Art", (await k.getAttribute("aria-haspopup")) === "listbox" && (await k.getAttribute("aria-expanded")) === "false");
  await p.waitForTimeout(100);
  await k.focus();
  await p.keyboard.press("ArrowDown");
  const liste = p.getByRole("listbox");
  await liste.waitFor();
  ok("Pfeil öffnet", (await k.getAttribute("aria-expanded")) === "true");
  ok("Listbox verknüpft", (await k.getAttribute("aria-controls")) === (await liste.getAttribute("id")));
  ok("Fokus bleibt ohne Suche am Knopf", await k.evaluate((e) => e === document.activeElement));
  const start = await k.getAttribute("aria-activedescendant");
  await p.keyboard.press("ArrowDown");
  ok("Aktive Option wandert", (await k.getAttribute("aria-activedescendant")) !== start);
  await p.keyboard.press("End");
  ok("Ende springt", (await p.locator(".rj-dropdown__option.is-aktiv").getAttribute("data-wert")) === "5");
  await p.keyboard.press("Escape");
  ok("Esc schließt nur die Liste", (await dlg(p).count()) === 1 && (await liste.count()) === 0, [await dlg(p).count(), await liste.count(), await p.evaluate(() => document.activeElement.outerHTML.slice(0, 200))]);
  ok("Fokus zurück am Knopf", await k.evaluate((e) => e === document.activeElement));

  await p.keyboard.press("Enter");
  await liste.waitFor();
  await p.keyboard.press("End");
  await p.keyboard.press("Enter");
  ok("Enter wählt", (await liste.count()) === 0 && (await k.innerText()).length > 0);
  const gewaehlt = await k.innerText();
  await p.keyboard.press(" ");
  await liste.waitFor();
  ok("Leertaste öffnet und bleibt offen", (await k.getAttribute("aria-expanded")) === "true");
  const haken = await p.locator('.rj-dropdown__option[aria-selected="true"]').count();
  ok("Genau eine gewählte Option", haken === 1, haken);
  await p.keyboard.press("Home");
  await p.keyboard.press("Tab");
  ok("Tab übernimmt die aktive Option", (await k.innerText()) !== gewaehlt);
  await dlg(p).getByRole("combobox", { name: "Kategorie" }).focus();

  // Klicks.
  await k.click();
  await liste.waitFor();
  const opt = p.getByRole("option").nth(1);
  const zeilen = await p.getByRole("option").evaluateAll((l) => l.map((e) => e.getBoundingClientRect().height));
  ok("Optionen mindestens 44 px", zeilen.every((h) => h >= 44), zeilen);
  await opt.click();
  ok("Klick wählt", (await liste.count()) === 0);
  await k.click();
  await liste.waitFor();
  await p.waitForTimeout(100);
  await p.mouse.click(5, 5);
  ok("Klick außerhalb schließt", (await liste.count()) === 0);
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" }).catch(() => {});

  // Die Liste steht im Dialog frei und ragt nicht aus dem Fenster.
  await p.setViewportSize({ width: 375, height: 500 });
  await p.evaluate(() => { location.hash = "#/stammdaten/weiteres"; });
  await knopf(p, "Zertifikat anlegen").click();
  const anlage = dlg(p).getByRole("combobox", { name: "Nachweis aus den Anlagen" });
  await anlage.scrollIntoViewIfNeeded();
  await anlage.click();
  await liste.waitFor();
  const lage = await p.evaluate(() => {
    const pop = document.querySelector(".rj-dropdown__pop").getBoundingClientRect();
    const mitte = [pop.left + pop.width / 2, pop.top + pop.height / 2];
    const oben = document.elementFromPoint(mitte[0], mitte[1]);
    return { l: pop.left, r: pop.right, t: pop.top, b: pop.bottom, w: innerWidth, h: innerHeight, sichtbar: !!oben.closest(".rj-dropdown__pop") };
  });
  ok("Liste im Fenster und nicht abgeschnitten", lage.l >= 0 && lage.r <= lage.w && lage.t >= 0 && lage.b <= lage.h && lage.sichtbar, lage);
  await p.screenshot({ path: `${SP}/formulare-dropdown-375.png` });
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await dlg(p).waitFor({ state: "detached" });
  await p.setViewportSize({ width: 1280, height: 900 });

  // Suche über die Komponentenseite, umlaut-tolerant und per Tastatur.
  await p.evaluate(() => { location.hash = "#/komponenten"; });
  const such = p.getByRole("combobox", { name: "Bundesland" });
  await such.waitFor();
  await such.click();
  const sf = p.getByRole("combobox", { name: "In der Liste suchen" });
  await sf.waitFor();
  ok("Fokus im Suchfeld", await sf.evaluate((e) => e === document.activeElement));
  await p.keyboard.type("thueringen");
  ok("ue findet ü", (await p.getByRole("option").allInnerTexts()).join() === "Thüringen", await p.getByRole("option").allInnerTexts());
  ok("Treffer werden angesagt", (await p.locator(".rj-dropdown__pop [role=status]").innerText()) === "1 Treffer");
  await sf.fill("baden");
  ok("Teilwort", (await p.getByRole("option").count()) === 1);
  await sf.fill("baumwolle");
  ok("Leerer Stand erklärt sich", (await p.locator(".rj-dropdown__leer").innerText()).startsWith("Nichts gefunden"));
  await p.keyboard.press("Enter");
  ok("Enter ohne Treffer tut nichts", (await sf.count()) === 1);
  await sf.fill("sachs");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  ok("Pfeil und Enter wählen im Suchtreffer", /Sachsen/.test(await such.innerText()), await such.innerText());
  ok("Fokus zurück am Knopf nach Suche", await such.evaluate((e) => e === document.activeElement));
  await p.keyboard.press("t");
  await sf.waitFor();
  ok("Buchstabe öffnet mit Suche", (await sf.inputValue()) === "t");
  await p.keyboard.press("Tab");
  ok("Tab im Suchfeld schließt ohne Übernahme", (await sf.count()) === 0 && /Sachsen/.test(await such.innerText()));
}

// Prüft alle sichtbaren Bausteine auf Überschneidung und Überlauf.
const pruefeLage = () => {
  const K = "svg.rj-icon, button, input, textarea, .rj-kbd, [role=combobox]";
  const sichtbar = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return e.checkVisibility() && r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && e.type !== "checkbox" && e.type !== "radio" && e.type !== "file";
  };
  const name = (e) => (e.tagName + "." + (e.className.baseVal ?? e.className) + " " + (e.getAttribute("aria-label") || e.id || "")).slice(0, 70);
  const wurzel = document.querySelector(".rj-dialog") || document.querySelector("main") || document.body;
  const alle = [...wurzel.querySelectorAll(K)].filter(sichtbar);
  const fehler = [];
  // Ein Knopf im Feld muss im Innenraum liegen, nicht auf dem Rahmen.
  for (const b of wurzel.querySelectorAll(".rj-date__btn, .rj-input-wrap > .rj-iconbtn")) {
    const f = b.parentElement.querySelector("input").getBoundingClientRect();
    const r = b.getBoundingClientRect();
    if (r.top < f.top + 2 || r.bottom > f.bottom - 2 || r.right > f.right - 2) fehler.push("auf dem Rahmen: " + name(b));
    const inhalt = f.right - parseFloat(getComputedStyle(b.parentElement.querySelector("input")).paddingRight);
    if (inhalt > r.left) fehler.push("Text läuft unter den Knopf: " + name(b));
  }
  for (let i = 0; i < alle.length; i++) {
    for (let j = i + 1; j < alle.length; j++) {
      const a = alle[i], b = alle[j];
      if (a.contains(b) || b.contains(a)) continue;
      // Erlaubt: Der Knopf und das Icon im Eingabefeld, dafür sorgt die Innenabstandsprüfung.
      const feld = a.closest(".rj-date, .rj-input-wrap, .rj-select-wrap");
      if (feld && feld === b.closest(".rj-date, .rj-input-wrap, .rj-select-wrap")) continue;
      const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
      const ueber = Math.min(x.right, y.right) - Math.max(x.left, y.left);
      const hoch = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      if (ueber > 1 && hoch > 1) fehler.push(name(a) + " ∩ " + name(b));
    }
  }
  // Auch Texte: Beschriftungen, Hinweise und Überschriften dürfen nicht aus ihrem Feld ragen.
  for (const e of wurzel.querySelectorAll(".rj-label, .rj-hint, .rj-error, .rj-btn, .rj-card > h2, .rj-card > h3, .rj-dropdown__btn")) {
    if (!sichtbar(e)) continue;
    if (e.scrollWidth > e.clientWidth + 1) fehler.push("Überlauf: " + name(e));
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) {
    const breit = [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".rj-tabs")).map(name);
    fehler.push("Seite scrollt seitwärts: " + breit.slice(0, 6).join(" / "));
  }
  return [...new Set(fehler)];
};

const seiten = (id) => [
  ["#/stammdaten/persoenlich", null],
  ["#/stammdaten/ausrichtungen", "Ausrichtung anlegen"],
  ["#/stammdaten/stationen", "Station anlegen"],
  ["#/stammdaten/erfolge", "Erfolg anlegen"],
  ["#/stammdaten/kompetenzen", "Kompetenz anlegen"],
  ["#/stammdaten/weiteres", "Zertifikat anlegen"],
  ["#/stammdaten/weiteres", "Sprache anlegen"],
  ["#/stammdaten/weiteres", "Interesse anlegen"],
  ["#/bewerbungen/neu", null],
  ["#/einstellungen", null],
  ["#/anlagen", /zeugnis bearbeiten/],
  ["#/uebersicht", null],
  ["#/stammdaten/import", null],
  ["#/bewerbungen/" + id + "/stelle", null],
  ["#/bewerbungen/" + id + "/lebenslauf", null],
  ["#/bewerbungen/" + id + "/anschreiben", null],
  ["#/bewerbungen/" + id + "/anlagen", null],
  ["#/bewerbungen/" + id + "/versand", "E-Mail-Entwurf erstellen"],
  ["#/bewerbungen/" + id + "/versand", "Als versendet markieren"],
  ["#/bewerbungen/" + id + "/details", "Status ändern"],
  ["#/bewerbungen/" + id + "/details", "Termin hinzufügen"],
  ["#/komponenten", null],
];

async function lageTesten(p) {
  // Eine Anlage und eine Bewerbung, damit deren Seiten und Dialoge Inhalt haben.
  await p.evaluate(() => { location.hash = "#/anlagen"; });
  await p.locator('input[type="file"]').first().setInputFiles({ name: "zeugnis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await p.getByRole("button", { name: /zeugnis bearbeiten/ }).waitFor();
  await p.evaluate(() => { location.hash = "#/bewerbungen/neu"; });
  await p.getByLabel(/^Firma/).fill("Beispiel GmbH");
  await p.getByRole("textbox", { name: /^Stelle Pflichtfeld/ }).fill("Sachbearbeitung");
  await p.getByRole("button", { name: "Bewerbung anlegen" }).click();
  await p.getByRole("tab", { name: "Stelle" }).waitFor();
  const id = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen[0].id);
  // Ohne Dokument bleibt der Knopf für den E-Mail-Entwurf gesperrt.
  await p.evaluate((id) => window.R42J_CORE.bewerbungen.snapshotSpeichern(id, "lebenslauf", new TextEncoder().encode("%PDF-1.4"), "lebenslauf.pdf"), id);
  const SEITEN = seiten(id);
  for (const [breite, schrift, thema] of [[1280, "normal", "hell"], [1280, "sehr-gross", "dunkel"], [375, "normal", "dunkel"], [375, "sehr-gross", "hell"]]) {
    await p.setViewportSize({ width: breite, height: 800 });
    await p.evaluate(([schrift, thema]) => { window.R42J.setFontSize(schrift); window.R42J.setTheme(thema); }, [schrift, thema]);
    const stand = `${breite} px ${schrift} ${thema}`;
    for (const [hash, dialog] of SEITEN) {
      await p.evaluate((h) => { location.hash = h; }, hash);
      await p.waitForTimeout(80);
      if (dialog) {
        await (dialog instanceof RegExp ? p.getByRole("button", { name: dialog }) : knopf(p, dialog)).click();
        await dlg(p).waitFor();
        await p.waitForTimeout(100);
      }
      // Die Seitenleiste animiert nach dem Größenwechsel, gemessen wird erst danach.
      await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect.getTiming().iterations === Infinity));
      const f = await p.evaluate(pruefeLage);
      ok(`Lage ${stand} ${hash}`, f.length === 0, f);
      const felder = await p.evaluate(() =>
        [...(document.querySelector(".rj-dialog") || document).querySelectorAll("input.rj-input, textarea.rj-textarea")]
          .filter((e) => !e.readOnly && !e.closest(".rj-dropdown__suche") && !["password", "time", "search"].includes(e.type))
          .map((e) => {
            const farbe = getComputedStyle(e, "::placeholder").color;
            let h = getComputedStyle(e).backgroundColor;
            return { p: e.placeholder, farbe, h, name: e.labels?.[0]?.innerText || e.id };
          }));
      ok(`Platzhalter ${stand} ${hash}`, felder.every((x) => x.p && !/Platzhalter/.test(x.p)), felder.filter((x) => !x.p || /Platzhalter/.test(x.p)));
      const k = kontrast(felder);
      ok(`Kontrast ${stand} ${hash}`, k.every((w) => w >= 4.5), k);
      if (hash.includes("stationen") || hash.includes("persoenlich")) await p.screenshot({ path: `${SP}/formulare-${breite}-${schrift}-${thema}-${hash.split("/").pop()}.png` });
      if (dialog) {
        await p.keyboard.press("Escape");
        await dlg(p).waitFor({ state: "detached" });
      }
    }
  }
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.evaluate(() => { window.R42J.setFontSize("normal"); window.R42J.setTheme("hell"); });
}

// Funde aus dem abschließenden Browserlauf: Fokus beim Verschwinden, früher Klick, lange Firmennamen.
// Breite Fenster: Inhalt und Lernkarte stehen mittig, Tab-Leisten scrollen nicht senkrecht.
async function mitteTesten(p) {
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.vergleich.angebotSpeichern(K.tresor.daten().bewerbungen[0].id, {});
  });
  const id = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen[0].id);
  const hin = async (hash) => {
    await p.evaluate((h) => { location.hash = h; }, hash);
    await p.waitForTimeout(80);
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect.getTiming().iterations === Infinity));
  };
  const TABS = ["#/vorbereitung", "#/stammdaten/persoenlich", "#/bewerbungen/" + id + "/stelle", "#/vergleich"];
  for (const [breite, spalte] of [[1280, "ausgeklappt"], [1920, "ausgeklappt"], [2560, "ausgeklappt"], [375, "schmal"]]) {
    await p.setViewportSize({ width: breite, height: 800 });
    for (const hash of TABS) {
      await hin(hash);
      await p.locator(".rj-tabs").waitFor();
      const t = await p.locator(".rj-tabs").evaluate((e) => ({ s: e.scrollHeight, c: e.clientHeight, y: getComputedStyle(e).overflowY }));
      ok(`Tabs ohne senkrechten Überlauf ${breite} px ${hash}`, t.s <= t.c, t);
      await p.locator('.rj-tabs [aria-selected="true"]').evaluate((e) => e.scrollIntoView({ inline: "nearest", block: "nearest" }));
      const u = await p.locator('.rj-tabs [aria-selected="true"]').evaluate((e) => {
        const l = e.parentElement.getBoundingClientRect(), k = e.getBoundingClientRect();
        return { knopf: k.bottom, leiste: l.bottom, breit: getComputedStyle(e).borderBottomWidth };
      });
      ok(`Aktive Unterstreichung ganz sichtbar ${breite} px ${hash}`, u.knopf <= u.leiste + 0.5 && u.breit === "3px", u);
    }
    if (spalte === "schmal") {
      await hin("#/bewerbungen/" + id + "/stelle");
      const w = await p.locator(".rj-tabs").evaluate((e) => { e.scrollLeft = 80; return { x: e.scrollLeft, s: e.scrollWidth, c: e.clientWidth }; });
      ok("Tabs scrollen im schmalen Fenster waagerecht", w.s > w.c && w.x > 0, w);
      continue;
    }
    await hin("#/stammdaten/persoenlich");
    const m = await p.evaluate(() => {
      const f = document.querySelector(".rj-main").getBoundingClientRect(), c = document.querySelector(".rj-content").getBoundingClientRect();
      const kopf = document.querySelector(".rj-topbar").firstElementChild.getBoundingClientRect();
      const stil = getComputedStyle(document.querySelector(".rj-content"));
      return { links: c.left - f.left, rechts: f.right - c.right, breite: c.width, kopfLinks: kopf.left, textLinks: c.left + parseFloat(stil.paddingLeft) };
    });
    ok(`Inhalt mittig ${breite} px`, Math.abs(m.links - m.rechts) <= 1, m);
    ok(`Inhalt behält die Breite ${breite} px`, m.breite <= 1120 + 0.5, m);
    ok(`Kopfzeile fluchtet mit dem Inhalt ${breite} px`, Math.abs(m.kopfLinks - m.textLinks) <= 1, m);
    await hin("#/vorbereitung/lernen");
    await p.getByRole("button", { name: "Interviewfragen lernen" }).click();
    await p.locator(".rj-flash").waitFor();
    const k = await p.evaluate(() => {
      const c = document.querySelector(".rj-content"), f = document.querySelector(".rj-flash").getBoundingClientRect();
      const r = c.getBoundingClientRect(), pad = parseFloat(getComputedStyle(c).paddingLeft);
      return { links: f.left - (r.left + pad), rechts: r.right - pad - f.right, breite: f.width };
    });
    ok(`Lernkarte mittig ${breite} px`, Math.abs(k.links - k.rechts) <= 1 && k.breite <= 560.5, k);
    await p.screenshot({ path: `${SP}/mitte-${breite}-lernkarte.png` });
    await knopf(p, "Sitzung beenden").click();
    await p.getByRole("button", { name: "Interviewfragen lernen" }).waitFor({ state: "attached" }).catch(() => {});
    await hin("#/uebersicht");
    await p.screenshot({ path: `${SP}/mitte-${breite}-uebersicht.png` });
    await hin("#/vergleich");
    await p.screenshot({ path: `${SP}/mitte-${breite}-vergleich.png` });
  }
  // Der Fokusring der Tab-Knöpfe liegt innen, damit die scrollende Leiste ihn nicht abschneidet.
  await p.setViewportSize({ width: 1280, height: 900 });
  await hin("#/vorbereitung");
  await p.locator('.rj-tabs [aria-selected="true"]').focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowLeft");
  const ring = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { rolle: document.activeElement.getAttribute("role"), breite: s.outlineWidth, abstand: s.outlineOffset }; });
  ok("Fokusring der Tabs liegt innen", ring.rolle === "tab" && ring.breite === "3px" && ring.abstand === "-3px", ring);
  await p.screenshot({ path: `${SP}/mitte-tabs-fokus.png`, clip: { x: 248, y: 0, width: 800, height: 260 } });
  // Auf A4 ist der Inhalt schmaler als seine Höchstbreite, die Mitte verschiebt dort nichts.
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.emulateMedia({ media: "print" });
  const druck = await p.evaluate(() => {
    const f = document.querySelector(".rj-main").getBoundingClientRect(), c = document.querySelector(".rj-content").getBoundingClientRect();
    return { links: c.left - f.left, rechts: f.right - c.right };
  });
  ok("Druck: Inhalt bleibt bündig", druck.links === 0 && druck.rechts === 0, druck);
  await p.emulateMedia({ media: "screen" });
  await p.setViewportSize({ width: 1280, height: 900 });
}

async function abschlussTesten(p, logs) {
  const vorher = logs.length;
  await p.evaluate(() => { location.hash = "#/komponenten"; });
  await p.locator(".rj-date input").first().focus();
  await p.evaluate(() => { location.hash = "#/uebersicht"; });
  await p.locator(".rj-date input").first().waitFor({ state: "detached" });
  const id = await p.evaluate(() => window.R42J_CORE.tresor.daten().bewerbungen[0].id);
  await p.evaluate((id) => { location.hash = "#/bewerbungen/" + id + "/details"; }, id);
  await knopf(p, "Status ändern").click();
  await dlg(p).locator(".rj-date input").focus();
  await p.evaluate(() => { location.hash = "#/uebersicht"; });
  await dlg(p).waitFor({ state: "detached" });
  ok("Datumsfeld verschwindet mit Fokus ohne Fehler", logs.length === vorher, logs.slice(vorher));
  logs.length = vorher;

  // Diese Anlage gehört nicht zur Vorauswahl, die Vorauswahl darf den Klick nicht überschreiben.
  const anlage = await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => { d.anlagen[0].kategorie = "sonstiges"; });
    return K.tresor.daten().anlagen[0].id;
  });
  for (let i = 0; i < 5; i++) {
    await p.evaluate(() => { location.hash = "#/bewerbungen/neu"; });
    await p.getByLabel(/^Firma/).fill("Donaudampfschifffahrtsgesellschaft Beispielhausen");
    await p.getByRole("textbox", { name: /^Stelle Pflichtfeld/ }).fill("Sachbearbeitung");
    await p.getByRole("button", { name: "Bewerbung anlegen" }).click();
    await p.getByRole("tab", { name: "Stelle" }).waitFor();
    const neu = await p.evaluate(() => /bewerbungen\/([^/]+)/.exec(location.hash)[1]);
    // Klickt synchron, sobald das Feld im DOM steht: früher, als ein Mensch es könnte.
    await p.evaluate((id) => new Promise((fertig) => {
      const beob = new MutationObserver(() => {
        const f = document.querySelector("main input[type=checkbox]");
        if (!f) return;
        beob.disconnect();
        f.click();
        fertig();
      });
      beob.observe(document.body, { childList: true, subtree: true });
      location.hash = "#/bewerbungen/" + id + "/anlagen";
    }), neu);
    await p.waitForTimeout(200);
    const auswahl = await p.evaluate((id) => window.R42J_CORE.tresor.daten().bewerbungen.filter((b) => b.id === id)[0].dokumente.anlagenAuswahl, neu);
    ok(`Früher Klick bleibt erhalten (${i + 1})`, auswahl.includes(anlage), auswahl);
  }

  for (const [schrift, thema] of [["normal", "dunkel"], ["sehr-gross", "hell"]]) {
    await p.setViewportSize({ width: 375, height: 800 });
    await p.evaluate(([schrift, thema]) => { window.R42J.setFontSize(schrift); window.R42J.setTheme(thema); location.hash = "#/uebersicht"; }, [schrift, thema]);
    await p.locator(".rj-appcard").first().waitFor();
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect.getTiming().iterations === Infinity));
    const f = await p.evaluate(() => [...document.querySelectorAll(".rj-appcard")].flatMap((c) => {
      const status = c.children[1].getBoundingClientRect();
      const karte = c.getBoundingClientRect();
      const fehler = [];
      for (const e of c.querySelectorAll(".rj-appcard__title, .rj-appcard__role")) {
        const bereich = document.createRange();
        bereich.selectNodeContents(e);
        for (const r of bereich.getClientRects()) {
          if (r.right > karte.right + 1) fehler.push("ragt aus der Karte: " + e.textContent);
          if (Math.min(r.right, status.right) - Math.max(r.left, status.left) > 1 && Math.min(r.bottom, status.bottom) - Math.max(r.top, status.top) > 1) fehler.push("unter dem Status: " + e.textContent);
        }
      }
      return fehler;
    }));
    ok(`Bewerbungskarte 375 px ${schrift} ${thema}`, f.length === 0, f);
    await p.screenshot({ path: `${SP}/formulare-karte-375-${thema}.png` });
  }
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.evaluate(() => { window.R42J.setFontSize("normal"); window.R42J.setTheme("hell"); });
}

function kontrast(felder) {
  const kanal = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const lum = (t) => { const [r, g, b] = t.match(/[\d.]+/g).map(Number); return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b); };
  return felder.map((f) => {
    const a = lum(f.farbe), b = lum(f.h);
    return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
  });
}

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
  await ctx.addInitScript(stub);
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  try {
    await einrichten(p);
    await maskeTesten(p);
    await monatTesten(p);
    await dropdownTesten(p);
    await lageTesten(p);
    await mitteTesten(p);
    await abschlussTesten(p, logs);
  } catch (e) {
    await p.screenshot({ path: `${SP}/formulare-abbruch.png` }).catch(() => {});
    console.log(logs.join(" | "));
    throw e;
  }
  ok("Keine Fehler in der Konsole", logs.length === 0, logs);
  await p.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    for await (const e of root.values()) await root.removeEntry(e.name, { recursive: true });
  }).catch(() => {});
  await b.close();
}
console.log(fehlerZahl ? `\n${fehlerZahl} FEHLER` : "\nAlle Prüfungen bestanden");
process.exit(fehlerZahl ? 1 : 0);
