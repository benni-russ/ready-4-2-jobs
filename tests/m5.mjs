// M5: Übersicht, Status, Erinnerungen, Termine, Checkliste. Testdaten frei erfunden.
import { chromium, URLAPP, SP, kanaele, waehle } from "./hilfen.mjs";

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
  window.showSaveFilePicker = async (o) => {
    window.__gespeichert = { name: o.suggestedName, typen: o.types };
    return {
      createWritable: async () => ({
        write: async (b) => {
          window.__gespeichert.bytes = Array.from(b);
        },
        close: async () => {},
      }),
    };
  };
  window.print = () => {};
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};
const knopf = (p, name) => p.getByRole("button", { name, exact: true });

// Prüft die Datei von außen nach RFC 5545, statt dem Erzeuger zu glauben.
function icsParsen(bytes) {
  const puffer = Buffer.from(bytes);
  const text = puffer.toString("utf8");
  const roh = text.split("\r\n");
  const ohneEnde = roh[roh.length - 1] === "" ? roh.slice(0, -1) : null;
  const entfaltet = text.replace(/\r\n[ \t]/g, "").split("\r\n").filter(Boolean);
  const felder = {};
  for (const z of entfaltet) {
    const i = z.indexOf(":");
    (felder[z.slice(0, i)] = felder[z.slice(0, i)] || []).push(z.slice(i + 1));
  }
  return {
    text,
    felder,
    nurCrlf: !/[^\r]\n/.test(text) && !/\r[^\n]/.test(text),
    mitEnde: !!ohneEnde,
    maxOktette: Math.max(...roh.map((z) => Buffer.byteLength(z))),
    entfaltet,
    kaputt: text.includes("�"),
  };
}
function textEntmaskieren(s) {
  return s.replace(/\\(n|N|\\|;|,)/g, (_, z) => (z === "n" || z === "N" ? "\n" : z));
}
const TAG = 24 * 60 * 60 * 1000;

for (const channel of kanaele()) {
  console.log("== " + channel);
  const b = await chromium.launch({ channel, headless: true, args: ["--allow-file-access-from-files"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(stub);
  const p = await ctx.newPage();
  const logs = [];
  const fremd = [];
  p.on("console", (m) => logs.push(m.type() + ": " + m.text()));
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  // Keine Netzanfrage im Test: Alles außer file:// fällt auf und wird abgebrochen.
  await ctx.route(/^https?:/, (r) => {
    fremd.push(r.request().url());
    return r.abort();
  });
  await p.goto(URLAPP);

  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForTimeout(100);
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
  await p.evaluate(() => {
    window.__wahl = "zweiter-ort";
  });
  await p.getByRole("button", { name: "Zweiten Ort wählen" }).click();
  await p.getByText("Zweiter Ort: zweiter-ort").waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await knopf(p, "Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Jörg-Ümit");
  await p.getByLabel("Nachname").fill("Weiß Müller");
  await p.getByLabel("E-Mail-Adresse").fill("test@example.org");
  await knopf(p, "Weiter").click();
  await p.getByLabel(/^Name/).fill("Personal");
  await knopf(p, "Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  await p.waitForTimeout(200);

  ok("Übersicht ohne Bewerbung zeigt Leerzustand", await p.getByRole("heading", { name: "Noch keine Bewerbung" }).isVisible());

  // Sechs Bewerbungen mit unterschiedlichem Alter, relativ zu heute.
  await p.evaluate((TAG) => {
    const K = window.R42J_CORE;
    const vor = (t) => new Date(Date.now() - t * TAG).toISOString();
    const ausrichtung = K.tresor.daten().ausrichtungen[0].id;
    K.tresor.aendern((d) => {
      d.profil.adresse = { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt", land: "Deutschland" };
      d.ausrichtungen.push({ ...d.ausrichtungen[0], id: "ausrichtung-b", name: "Vertrieb" });
    });
    const neu = (firma, titel, a, tage, status) => {
      const b = K.bewerbungen.neu({ firma, titel, ausrichtungId: a, sprache: "de", anrede: "sie", anzeigeText: "Du kennst Excel und SAP." });
      if (tage !== null) K.bewerbungen.versendet(b.id, vor(tage));
      if (status) K.bewerbungen.statusSetzen(b.id, status, vor(tage === null ? 0 : tage));
      return b.id;
    };
    window.__ids = {
      faellig: neu("Müller & Söhne", "Personalreferent", ausrichtung, 15),
      frisch: neu("Beispiel AG", "Sachbearbeitung", ausrichtung, 13),
      grenze: neu("Grenzfall GmbH", "Assistenz", "ausrichtung-b", 14),
      alt: neu("Altbau KG", "Teamleitung", ausrichtung, 43),
      gesendet: neu("Nordlicht KG", "Büroassistenz", ausrichtung, 20, "rueckfrage_gesendet"),
      absage: neu("Zuletzt SE", "Vertrieb", "ausrichtung-b", 15, "absage"),
    };
    K.bewerbungen.aendern(window.__ids.faellig, (b) => {
      b.firma.adresse = "Hauptstraße 1\n53111 Bonn";
      b.ansprechpartner = { anrede: "frau", name: "Erika Beispiel", email: "bewerbung@example.org" };
      b.stelle.referenz = "R-17";
    });
  }, TAG);

  // Kernlogik: Akzeptanz „Rückfrage fällig“ und Grenzen
  const stati = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const r = {};
    for (const [k, id] of Object.entries(window.__ids)) {
      const b = K.bewerbungen.holen(id);
      r[k] = { anzeige: K.bewerbungen.anzeigeStatus(b), echt: K.bewerbungen.aktuellerStatus(b) };
    }
    return r;
  });
  ok("versendetAm vor 15 Tagen: Rückfrage fällig", stati.faellig.anzeige === "rueckfrage_faellig", stati.faellig);
  ok("Abgeleitet, Historie bleibt echt", stati.faellig.echt === "versendet", stati.faellig);
  ok("Genau 14 Tage: fällig", stati.grenze.anzeige === "rueckfrage_faellig", stati.grenze);
  ok("13 Tage: noch nicht fällig", stati.frisch.anzeige === "versendet", stati.frisch);
  ok("Absage wird nicht fällig", stati.absage.anzeige === "absage", stati.absage);
  ok("Rückfrage gesendet wird nicht erneut fällig", stati.gesendet.anzeige === "rueckfrage_gesendet", stati.gesendet);
  const eigeneFrist = await p.evaluate(() => {
    const K = window.R42J_CORE;
    K.tresor.aendern((d) => (d.einstellungen.rueckfrageTage = 30));
    const s = K.bewerbungen.anzeigeStatus(K.bewerbungen.holen(window.__ids.faellig));
    K.tresor.aendern((d) => (d.einstellungen.rueckfrageTage = 14));
    return s;
  });
  ok("Frist aus den Einstellungen gilt", eigeneFrist === "versendet", eigeneFrist);

  const zusammen = await p.evaluate((TAG) => {
    const K = window.R42J_CORE;
    const id = window.__ids.frisch;
    const b = K.bewerbungen.holen(id);
    const start = (t) => new Date(Date.now() + t * TAG).toISOString();
    K.termine.speichern(id, { art: "digital", start: start(10), ende: start(10.04) });
    K.termine.speichern(id, { art: "telefon", start: start(3), ende: start(3.02) });
    K.termine.speichern(id, { art: "test", start: start(-1), ende: start(-0.9) });
    const l = K.erinnerungen.liste();
    const zwanzig = K.erinnerungen.liste(new Date(Date.now() + 2 * TAG));
    return {
      arten: l.map((e) => e.art + ":" + e.bewerbung.firma.name),
      termine: l.filter((e) => e.art === "termin").map((e) => e.termin.art),
      sortiert: b.termine.length,
      spaetereZeit: zwanzig.filter((e) => e.art === "termin").length,
    };
  }, TAG);
  ok("Nur Termine der nächsten 7 Tage", zusammen.termine.join() === "telefon", zusammen.termine);
  ok("Keine Antwort nach 6 Wochen ersetzt Rückfrage", zusammen.arten.includes("keineAntwort:Altbau KG") && !zusammen.arten.includes("rueckfrage:Altbau KG"), zusammen.arten);
  ok("Rückfrage-Erinnerungen da", zusammen.arten.includes("rueckfrage:Müller & Söhne") && zusammen.arten.includes("rueckfrage:Grenzfall GmbH"), zusammen.arten);
  ok("Abgelehnte Bewerbung erinnert nicht", !zusammen.arten.some((a) => a.includes("Zuletzt")), zusammen.arten);

  // Übersicht: Erinnerungen, Filter, Sortierung, Suche
  await p.evaluate(() => {
    location.hash = "#/bewerbungen";
    location.hash = "#/uebersicht";
  });
  await p.waitForSelector(".rj-reminder");
  const titel = await p.locator(".rj-reminder strong").allInnerTexts();
  ok("Erinnerung auf der Übersicht", titel.includes("Rückfrage fällig: Müller & Söhne"), titel);
  ok("Termin steht zuerst", titel[0].startsWith("Telefoninterview: Beispiel AG"), titel);
  await p.screenshot({ path: `${SP}/m5-${channel}-uebersicht.png`, fullPage: true });

  const karten = () => p.locator(".rj-appcard__title").allInnerTexts();
  ok("Karte zeigt Badge Rückfrage fällig", await p.locator(".rj-appcard", { hasText: "Müller & Söhne" }).getByText("Rückfrage fällig").isVisible());
  await p.getByLabel("Firma oder Stelle suchen").fill("muller");
  await p.waitForTimeout(50);
  ok("Suche ist umlaut-tolerant (muller)", (await karten()).join() === "Müller & Söhne", await karten());
  await p.getByLabel("Firma oder Stelle suchen").fill("mueller");
  await p.waitForTimeout(50);
  ok("Suche ist umlaut-tolerant (mueller)", (await karten()).join() === "Müller & Söhne", await karten());
  await knopf(p, "Filter zurücksetzen").click();
  await waehle(p, p.getByLabel("Status", { exact: true }), "rueckfrage_faellig");
  await p.waitForTimeout(50);
  ok("Filter Status", (await karten()).sort().join() === "Altbau KG,Grenzfall GmbH,Müller & Söhne", await karten());
  await knopf(p, "Filter zurücksetzen").click();
  await waehle(p, p.getByLabel("Ausrichtung", { exact: true }), { label: "Vertrieb" });
  await p.waitForTimeout(50);
  ok("Filter Ausrichtung", (await karten()).sort().join() === "Grenzfall GmbH,Zuletzt SE", await karten());
  await knopf(p, "Filter zurücksetzen").click();
  await waehle(p, p.getByLabel("Zeitraum", { exact: true }), "30");
  await p.waitForTimeout(50);
  ok("Filter Zeitraum", !(await karten()).includes("Altbau KG") && (await karten()).length === 5, await karten());
  await knopf(p, "Filter zurücksetzen").click();
  await waehle(p, p.getByLabel("Sortierung", { exact: true }), "firma");
  await p.waitForTimeout(50);
  ok("Sortierung Firma", (await karten())[0] === "Altbau KG", await karten());
  await waehle(p, p.getByLabel("Sortierung", { exact: true }), "alt");
  await p.waitForTimeout(50);
  ok("Sortierung Älteste", (await karten())[0] === "Altbau KG", await karten());
  await waehle(p, p.getByLabel("Sortierung", { exact: true }), "neu");
  await p.waitForTimeout(50);
  ok("Sortierung Neueste", (await karten())[0] === "Beispiel AG", await karten());
  await p.getByRole("button", { name: "Liste", exact: true }).click();
  await p.waitForSelector(".rj-table");
  ok("Listenansicht zeigt alle", (await p.locator(".rj-table tbody tr").count()) === 6);
  ok("Listenansicht ohne zweites Suchfeld", (await p.locator(".rj-datatable__bar").count()) === 0);
  await p.getByRole("button", { name: "Firma", exact: true }).click();
  await p.waitForTimeout(50);
  ok("Spalte sortierbar", (await p.locator(".rj-table tbody tr td:first-child").first().innerText()) === "Altbau KG");
  await p.screenshot({ path: `${SP}/m5-${channel}-liste.png`, fullPage: true });
  await p.getByRole("button", { name: "Karten", exact: true }).click();

  // Später erinnern
  await p.locator(".rj-reminder", { hasText: "Grenzfall GmbH" }).getByRole("button", { name: "Später erinnern" }).click();
  await p.waitForTimeout(50);
  ok("Später blendet die Erinnerung aus", (await p.locator(".rj-reminder", { hasText: "Grenzfall GmbH" }).count()) === 0);
  const spaeter = await p.evaluate((TAG) => {
    const K = window.R42J_CORE;
    return K.erinnerungen.liste(new Date(Date.now() + 8 * TAG)).some((e) => e.bewerbung.id === window.__ids.grenze && e.art === "rueckfrage");
  }, TAG);
  ok("Nach einer Woche erinnert es wieder", spaeter);

  // Keine Antwort
  await p.locator(".rj-reminder", { hasText: "Altbau KG" }).getByRole("button", { name: "Keine Antwort setzen" }).click();
  await p.waitForTimeout(50);
  const altStand = await p.evaluate(() => {
    const K = window.R42J_CORE;
    return K.bewerbungen.aktuellerStatus(K.bewerbungen.holen(window.__ids.alt));
  });
  ok("Keine Antwort gesetzt", altStand === "keine_antwort", altStand);

  // Rückfrage-Vorlage
  await p.locator(".rj-reminder", { hasText: "Müller & Söhne" }).getByRole("button", { name: "Rückfrage erstellen" }).click();
  await p.getByRole("dialog").waitFor();
  const betreff = await p.getByRole("dialog").getByLabel("Betreff").inputValue();
  const text = await p.getByRole("dialog").getByLabel("Nachricht").inputValue();
  ok("Rückfrage: Betreff mit Referenz", betreff === "Rückfrage zu meiner Bewerbung als Personalreferent (Referenz R-17)", betreff);
  ok("Rückfrage: Anrede und Datum", text.startsWith("Sehr geehrte Frau Beispiel,") && /am \d{2}\.\d{2}\.\d{4} habe ich mich/.test(text) && text.endsWith("Jörg-Ümit Weiß Müller"), text);
  ok("Rückfrage: Empfänger aus der Ansprechperson", (await p.getByRole("dialog").getByLabel(/^An/).first().inputValue()) === "bewerbung@example.org");
  await p.getByRole("dialog").getByRole("button", { name: "E-Mail-Entwurf erstellen" }).click();
  await p.waitForFunction(() => /\/details$/.test(location.hash));
  await p.getByRole("heading", { name: "Verlauf" }).waitFor();
  const nachRueckfrage = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const b = K.bewerbungen.holen(window.__ids.faellig);
    return { status: K.bewerbungen.aktuellerStatus(b), emails: b.emails.map((e) => e.dateiname), anhaenge: b.emails[0].anhaenge.length };
  });
  ok("Rückfrage: Status gesetzt", nachRueckfrage.status === "rueckfrage_gesendet", nachRueckfrage);
  ok("Rückfrage: Entwurf ohne Anhang im Tresor", nachRueckfrage.emails[0] === "joerg-uemit-weiss-mueller-rueckfrage-mueller-soehne.eml" && nachRueckfrage.anhaenge === 0, nachRueckfrage);

  // Detailansicht
  ok("Details: Anzeigentext-Kopie", (await p.getByText("Anzeigentext (Kopie)").count()) === 1);
  ok("Details: Entwurf gelistet", (await p.locator(".rj-file", { hasText: "Rückfrage zu meiner Bewerbung" }).count()) === 1);
  const route = await p.getByRole("link", { name: "Route anzeigen" }).first();
  const maps = new URL(await route.getAttribute("href"));
  ok("Maps: nur https zu Google", maps.origin === "https://www.google.com" && maps.pathname === "/maps/dir/", maps.href);
  ok("Maps: Start und Ziel korrekt kodiert", maps.searchParams.get("origin") === "Musterweg 1, 12345 Musterstadt, Deutschland" && maps.searchParams.get("destination") === "Hauptstraße 1, 53111 Bonn" && maps.searchParams.get("api") === "1", maps.search);
  ok("Maps: öffnet ohne Weitergabe des Referrers", (await route.getAttribute("rel")) === "noopener noreferrer" && (await route.getAttribute("target")) === "_blank");
  ok("Maps: Hinweis auf Google sichtbar", await p.getByText("gehen deine Adresse und die Firmenadresse an Google").isVisible());

  // Statuswechsel
  await p.getByRole("button", { name: "Status ändern" }).click();
  await p.getByRole("dialog").waitFor();
  await p.getByRole("dialog").getByLabel("Neuer Status").click();
  const optionen = (await p.locator("[role=option]").allInnerTexts()).map((x) => x.trim());
  await p.keyboard.press("Escape");
  ok("Dialog bietet „Rückfrage fällig“ nicht an", !optionen.includes("Rückfrage fällig") && optionen.length === 14, optionen);
  await p.getByRole("dialog").getByRole("button", { name: "Status speichern" }).click();
  await p.getByText("hat diesen Status schon").waitFor();
  ok("Gleicher Status wird abgelehnt", true);
  await waehle(p, p.getByRole("dialog").getByLabel("Neuer Status"), "telefoninterview");
  await p.getByRole("dialog").getByLabel("Notiz", { exact: true }).fill("Mit Frau Beispiel gesprochen");
  await p.getByRole("dialog").getByRole("button", { name: "Status speichern" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  const verlauf = await p.locator(".rj-timeline li").allInnerTexts();
  ok("Historie: neuester Eintrag oben, mit Notiz", verlauf[0].includes("Telefoninterview") && verlauf[0].includes("Mit Frau Beispiel gesprochen") && verlauf.length === 4, verlauf);
  ok("Historie: aktueller Eintrag markiert", (await p.locator('.rj-timeline li[aria-current="step"]').count()) === 1);

  // Notizen
  await p.getByLabel("Wichtige Angaben").fill("Rückruf bis Freitag");
  // Termin über den Dialog: Maskierung, Faltung, Umlaute
  await p.getByRole("button", { name: "Termin hinzufügen" }).click();
  await p.getByRole("dialog").waitFor();
  await p.waitForTimeout(150);
  await p.getByRole("dialog").getByRole("button", { name: "Termin speichern" }).click();
  await p.getByText("Wähl ein Datum für den Termin.").waitFor();
  ok("Termin ohne Datum wird abgelehnt", true);
  const morgen = new Date(Date.now() + 4 * TAG);
  const morgenIso = new Date(morgen.getTime() - morgen.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const datumDe = morgenIso.split("-").reverse().join(".");
  await p.getByRole("dialog").locator(".rj-date input").fill(datumDe);
  await p.getByRole("dialog").locator(".rj-date input").blur();
  await p.getByRole("dialog").getByLabel("Beginn", { exact: true }).fill("14:30");
  await p.getByRole("dialog").getByLabel("Ende", { exact: true }).and(p.locator("input")).fill("14:00");
  await p.getByRole("dialog").getByRole("button", { name: "Termin speichern" }).click();
  await p.getByText("Das Ende muss nach dem Beginn liegen.").waitFor();
  ok("Ende vor Beginn wird abgelehnt", true);
  await p.getByRole("dialog").getByLabel("Ende", { exact: true }).and(p.locator("input")).fill("15:15");
  await p.getByRole("dialog").getByLabel("Link zum Termin").fill("javascript:alert(1)");
  await p.getByRole("dialog").getByRole("button", { name: "Termin speichern" }).click();
  await p.getByText("mit https:// ein").waitFor();
  ok("Link ohne https wird abgelehnt", true);
  await p.getByRole("dialog").getByLabel("Link zum Termin").fill("https://example.org/raum?a=1&b=2");
  await p.getByRole("dialog").getByLabel("Ort", { exact: true }).fill("Saal 3; Haus A, Eingang \\ Süd");
  await p.getByRole("dialog").getByLabel("Notiz", { exact: true }).fill("Unterlagen mitbringen, Ärztliche Bescheinigung; Grüße an Frau Ö.\nZweite Zeile mit langem Text, damit die Faltung nach 75 Oktetten sicher greift: äöüß äöüß äöüß äöüß äöüß äöüß äöüß äöüß äöüß äöüß €€€€€ 😀😀😀");
  await p.screenshot({ path: `${SP}/m5-${channel}-termin.png` });
  await p.getByRole("dialog").getByRole("button", { name: "Termin speichern" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });

  const karte = p.locator("article", { hasText: "Saal 3" });
  await karte.getByRole("button", { name: "Als .ics speichern" }).click();
  await p.waitForFunction(() => window.__gespeichert && window.__gespeichert.bytes);
  const gesp = await p.evaluate(() => window.__gespeichert);
  ok("ICS: Dateiname und Typ", gesp.name === `termin-mueller-soehne-${morgen.toISOString().slice(0, 10)}.ics` && !!gesp.typen[0].accept["text/calendar"], gesp.name);
  const ics = icsParsen(gesp.bytes);
  ok("ICS: nur CRLF, CRLF am Ende", ics.nurCrlf && ics.mitEnde);
  ok("ICS: Zeilen höchstens 75 Oktette", ics.maxOktette <= 75, ics.maxOktette);
  ok("ICS: Faltung zerteilt kein UTF-8", !ics.kaputt);
  ok("ICS: Faltung greift", /\r\n /.test(ics.text));
  ok("ICS: Rahmen", ics.entfaltet[0] === "BEGIN:VCALENDAR" && ics.entfaltet.at(-1) === "END:VCALENDAR" && ics.felder.VERSION[0] === "2.0" && !!ics.felder.PRODID && ics.felder.BEGIN.join() === "VCALENDAR,VEVENT", ics.felder.BEGIN);
  ok("ICS: UID einmalig und nicht leer", ics.felder.UID.length === 1 && /^[0-9a-f-]{36}@r42j\.invalid$/.test(ics.felder.UID[0]), ics.felder.UID);
  ok("ICS: DTSTAMP in UTC", /^\d{8}T\d{6}Z$/.test(ics.felder.DTSTAMP[0]), ics.felder.DTSTAMP);
  // Die Seite läuft in Europe/Berlin, der Testrunner in einer beliebigen Zone.
  const utcZeit = (uhr) => p.evaluate((wert) => new Date(wert).toISOString(), `${morgenIso}T${uhr}`);
  const startUtc = await utcZeit("14:30");
  const endeUtc = await utcZeit("15:15");
  const kompakt = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  ok("ICS: Beginn und Ende in UTC", ics.felder.DTSTART[0] === kompakt(startUtc) && ics.felder.DTEND[0] === kompakt(endeUtc), [ics.felder.DTSTART, ics.felder.DTEND]);
  ok("ICS: Maskierung Ort", ics.felder.LOCATION[0] === "Saal 3\\; Haus A\\, Eingang \\\\ Süd", ics.felder.LOCATION);
  ok("ICS: keine unmaskierten Trenner", !/(^|[^\\])[;,]/.test(ics.felder.SUMMARY[0].replace(/\\\\/g, "")) && !/(^|[^\\])[;,]/.test(ics.felder.DESCRIPTION[0].replace(/\\\\/g, "")), ics.felder.DESCRIPTION);
  const beschreibung = textEntmaskieren(ics.felder.DESCRIPTION[0]);
  ok("ICS: Beschreibung kommt unversehrt zurück", beschreibung.includes("\nZweite Zeile") && beschreibung.endsWith("€€€€€ 😀😀😀") && beschreibung.includes("https://example.org/raum?a=1&b=2"), beschreibung);
  ok("ICS: Titel mit Firma", textEntmaskieren(ics.felder.SUMMARY[0]) === "Gespräch vor Ort: Müller & Söhne", ics.felder.SUMMARY);

  const hrefs = await karte.getByRole("link").evaluateAll((l) => l.map((a) => ({ name: a.innerText, href: a.href, rel: a.rel, target: a.target })));
  const g = new URL(hrefs.find((a) => a.name.includes("Google")).href);
  const o = new URL(hrefs.find((a) => a.name.includes("Outlook")).href);
  ok("Google: Adresse", g.origin + g.pathname === "https://calendar.google.com/calendar/render" && g.searchParams.get("action") === "TEMPLATE", g.href);
  ok("Google: Zeitraum", g.searchParams.get("dates") === kompakt(startUtc) + "/" + kompakt(endeUtc), g.searchParams.get("dates"));
  ok("Google: Text kodiert", g.searchParams.get("text") === "Gespräch vor Ort: Müller & Söhne" && g.searchParams.get("location") === "Saal 3; Haus A, Eingang \\ Süd" && g.searchParams.get("details").includes("a=1&b=2") && g.searchParams.get("details").includes("😀"), g.search);
  ok("Google: & und # bleiben maskiert", !g.search.includes("Müller & Söhne") && !g.search.includes(" ") && g.search.split("&").length === 5, g.search);
  ok("Outlook: Adresse", o.origin + o.pathname === "https://outlook.live.com/calendar/0/deeplink/compose" && o.searchParams.get("rru") === "addevent" && o.searchParams.get("path") === "/calendar/action/compose", o.href);
  ok("Outlook: Zeiten", o.searchParams.get("startdt") === startUtc && o.searchParams.get("enddt") === endeUtc, o.search);
  ok("Outlook: Felder kodiert", o.searchParams.get("subject") === "Gespräch vor Ort: Müller & Söhne" && o.searchParams.get("location").startsWith("Saal 3;") && !o.search.includes("+"), o.search);
  ok("Kalender-Links: öffnen ohne Referrer", hrefs.every((a) => a.rel === "noopener noreferrer" && a.target === "_blank" && a.href.startsWith("https://")), hrefs);
  ok("Hinweis: Daten gehen an den Anbieter", await p.getByText("gehen Firma, Stelle, Ort und Notiz an den Anbieter").isVisible());

  // Termin bearbeiten und löschen
  await karte.getByRole("button", { name: "Termin bearbeiten" }).click();
  await p.getByRole("dialog").waitFor();
  ok("Bearbeiten übernimmt lokale Uhrzeit", (await p.getByRole("dialog").getByLabel("Beginn", { exact: true }).inputValue()) === "14:30");
  await p.getByRole("dialog").getByLabel("Beginn", { exact: true }).fill("14:45");
  await p.getByRole("dialog").getByRole("button", { name: "Termin speichern" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  const nachBearbeiten = await p.evaluate(() => window.R42J_CORE.bewerbungen.holen(window.__ids.faellig).termine.length);
  ok("Bearbeiten legt keinen zweiten Termin an", nachBearbeiten === 1, nachBearbeiten);
  await p.screenshot({ path: `${SP}/m5-${channel}-details.png`, fullPage: true });

  // Checkliste
  await p.getByLabel("Unternehmen recherchiert").check();
  await p.getByLabel("Anlagen vollständig").check();
  await p.waitForTimeout(50);
  ok("Checkliste: Fortschritt", (await p.locator(".rj-progress__head strong").first().innerText()) === "2 von 8");
  ok("Checkliste: Fortschrittsbalken", (await p.locator('[role="progressbar"]').first().getAttribute("aria-valuenow")) === "2");
  await p.evaluate(() => {
    const K = window.R42J_CORE;
    window.__neu = K.bewerbungen.neu({ firma: "Vorbereitung GmbH", titel: "Einkauf", ausrichtungId: K.tresor.daten().ausrichtungen[0].id, sprache: "de", anrede: "sie" }).id;
    location.hash = "#/bewerbungen/" + window.__neu + "/versand";
  });
  await p.getByText("8 von 8 Punkten auf der Checkliste sind offen").waitFor();
  ok("Warnung vor dem Versand", true);
  await p.getByRole("button", { name: "Als versendet markieren" }).click();
  await p.getByRole("dialog").waitFor();
  ok("Warnung auch im Dialog", await p.getByRole("dialog").getByText("8 von 8 Punkten").isVisible());
  await p.screenshot({ path: `${SP}/m5-${channel}-warnung.png` });
  await p.getByRole("dialog").getByRole("button", { name: "Als versendet markieren" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  const versendetTrotz = await p.evaluate(() => {
    const K = window.R42J_CORE;
    return K.bewerbungen.aktuellerStatus(K.bewerbungen.holen(window.__neu));
  });
  ok("Warnung blockiert nicht", versendetTrotz === "versendet", versendetTrotz);
  ok("Nach dem Versand keine Warnung mehr", (await p.getByText("Punkten auf der Checkliste").count()) === 0);

  // Offener Punkt aus M2: Löschen einer Anlage, die eine Bewerbung nutzt
  const anlage = await p.evaluate(async () => {
    const K = window.R42J_CORE;
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    const e = await K.anlagen.hinzufuegen(new File([png], "zeugnis.png", { type: "image/png" }));
    K.bewerbungen.aendern(window.__ids.absage, (b) => {
      b.dokumente.anlagenAuswahl = [e.id];
      b.dokumente.anlagenPdf = { erzeugtAm: new Date().toISOString(), dateiname: "alt.pdf", anlageId: "kopie", groesse: 1 };
    });
    location.hash = "#/anlagen";
    return { id: e.id, titel: e.titel };
  });
  await p.getByRole("button", { name: new RegExp(anlage.titel + " löschen|löschen.*" + anlage.titel) }).first().click();
  await p.getByRole("dialog").waitFor();
  ok("Löschen warnt vor genutzter Anlage", await p.getByRole("dialog").getByText(/ausgewählt bei: Zuletzt SE/).isVisible());
  await p.screenshot({ path: `${SP}/m5-${channel}-anlage.png` });
  await p.getByRole("dialog").getByRole("button", { name: "Löschen" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  await p.waitForTimeout(200);
  const nachLoeschen = await p.evaluate(() => {
    const b = window.R42J_CORE.bewerbungen.holen(window.__ids.absage);
    return { auswahl: b.dokumente.anlagenAuswahl, pdf: b.dokumente.anlagenPdf && b.dokumente.anlagenPdf.dateiname };
  });
  ok("Anlage fällt aus der Auswahl, fertiges PDF bleibt", nachLoeschen.auswahl.length === 0 && nachLoeschen.pdf === "alt.pdf", nachLoeschen);

  // Englische Vorlage und Oberfläche
  const en = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const id = K.bewerbungen.neu({ firma: "Sample Ltd", titel: "HR Manager", ausrichtungId: K.tresor.daten().ausrichtungen[0].id, sprache: "en", anrede: "sie" }).id;
    K.bewerbungen.versendet(id, new Date(2026, 9, 1, 12).toISOString());
    return K.anschreiben.rueckfrageVorschlag(K.bewerbungen.holen(id));
  });
  ok("Rückfrage auf Englisch", en.betreff === "Follow-up on my application for HR Manager" && en.text.includes("on 01 October 2026"), en);

  // Dauerhaft: Alles liegt nach dem Neuladen noch im Tresor.
  await p.evaluate(() => window.R42J_CORE.tresor.speichernJetzt());
  await p.goto("about:blank");
  await p.goto(URLAPP + "#/uebersicht");
  await p.getByRole("button", { name: new RegExp(NAME) }).click();
  await p.getByLabel("Passwort", { exact: true }).fill(PW);
  await p.getByRole("button", { name: "Entsperren" }).click();
  await p.waitForSelector(".rj-shell");
  await p.waitForSelector(".rj-reminder");
  await p.waitForFunction(() => document.body.innerText.includes("Telefoninterview: Beispiel AG"));
  ok("Erinnerungen beim Start", true);
  const gespeichert = await p.evaluate(() => {
    const K = window.R42J_CORE;
    const b = K.tresor.daten().bewerbungen.find((x) => x.firma.name.startsWith("Müller"));
    return { notizen: b.notizen, termine: b.termine.length, haken: K.bewerbungen.checkliste(b).erledigt, verlauf: b.status.length };
  });
  ok("Nach dem Neuladen ist alles da", gespeichert.notizen === "Rückruf bis Freitag" && gespeichert.termine === 1 && gespeichert.haken === 2 && gespeichert.verlauf === 4, gespeichert);
  ok("Keine Netzanfrage im ganzen Lauf", fremd.length === 0, fremd);
  const probleme = logs.filter((l) => /^(error|pageerror|warning)/.test(l) && !/ERR_FAILED/.test(l));
  ok("Keine Konsolenfehler", probleme.length === 0, probleme.slice(0, 5));
  const leck = logs.filter((l) => /Jörg|Müller|Testperson|Rückruf/.test(l));
  ok("Keine persönlichen Daten in der Konsole", leck.length === 0, leck.slice(0, 3));
  await b.close();
}

console.log(fehlerZahl === 0 ? "Alles bestanden" : fehlerZahl + " Fehler");
process.exit(fehlerZahl ? 1 : 0);
