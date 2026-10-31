// Demo-Profil für Screenshots und Tests. Alle Personen, Firmen und Zahlen sind frei erfunden.
// demoProfilAnlegen legt das Profil über die Oberfläche an und füllt den Tresor.
// Aufruf von tools/anleitung-bilder.mjs und tests/barrierefreiheit.mjs.

export const DEMO_NAME = "Demo Mustermann";
export const DEMO_PASSWORT = "Mein Hund frisst gerne 7 Kekse";

// Lenkt die Ordnerwahl in den privaten Browser-Speicher um.
export const ordnerStub = () => {
  if (typeof FileSystemDirectoryHandle === "undefined") return;
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle("r42j", { create: true });
    const app = await d.getDirectoryHandle("app", { create: true });
    await app.getFileHandle("version.js", { create: true });
    return d;
  };
  window.print = () => {};
  FileSystemDirectoryHandle.prototype.queryPermission = async () => "granted";
  FileSystemDirectoryHandle.prototype.requestPermission = async () => "granted";
};

function fuellen() {
  const K = window.R42J_CORE;
  const jetzt = new Date();
  const vor = (n) => new Date(jetzt.getTime() - n * 864e5).toISOString();
  const i18n = (de, en) => ({ de, en });
  K.tresor.aendern((d) => {
    Object.assign(d.profil, {
      vorname: "Demo",
      nachname: "Mustermann",
      adresse: { strasse: "Beispielweg 1", plz: "12345", ort: "Musterstadt", land: "Deutschland" },
      email: "demo@example.org",
      telefon: "+49 30 0000000",
    });
    d.kompetenzen = [
      { id: "k1", name: i18n("Personalverwaltung", "HR administration"), synonyme: ["HR"], kategorie: "fach", niveau: 4, ausrichtungen: ["a1"] },
      { id: "k2", name: i18n("Lohnbuchhaltung", "Payroll"), synonyme: [], kategorie: "fach", niveau: 3, ausrichtungen: ["a1"] },
      { id: "k3", name: i18n("Tabellenkalkulation", "Spreadsheets"), synonyme: ["Excel"], kategorie: "it", niveau: 4, ausrichtungen: ["a1", "a2"] },
    ];
    d.ausrichtungen = [
      { id: "a1", name: "Personalsachbearbeitung", kurzprofil: i18n("Erfahrene Fachkraft im Personalwesen.", "Experienced HR professional."), kernkompetenzen: ["k1", "k2"] },
      { id: "a2", name: "Büroassistenz", kurzprofil: i18n("Organisiert und zuverlässig.", "Organised and reliable."), kernkompetenzen: ["k3"] },
    ];
    d.stationen = [
      { id: "s1", typ: "beruf", titel: i18n("Personalsachbearbeitung", "HR Clerk"), organisation: "Erfundene GmbH", ort: "Musterstadt", von: "2021-03", bis: "heute", beschreibung: i18n("Betreuung von 120 Beschäftigten.", "Support for 120 employees."), ausrichtungen: ["a1"], anlagen: [] },
      { id: "s2", typ: "ausbildung", titel: i18n("Kaufmännische Ausbildung", "Commercial training"), organisation: "Beispiel KG", ort: "Musterstadt", von: "2018-08", bis: "2021-02", ausrichtungen: ["a1", "a2"], anlagen: [] },
    ];
    d.erfolge = [
      { id: "e1", stationId: "s1", situation: i18n("Die Ablage war unübersichtlich.", "Filing was messy."), aufgabe: i18n("Ablage neu ordnen.", "Reorganise filing."), aktion: i18n("Digitale Personalakte eingeführt.", "Introduced digital files."), ergebnis: i18n("Suchzeit halbiert.", "Search time halved."), kennzahl: "50 %", cvStichpunkt: i18n("Digitale Personalakte eingeführt, Suchzeit halbiert", "Introduced digital files, halved search time"), kompetenzen: ["k1"], ausrichtungen: ["a1"] },
    ];
    d.sprachen = [
      { id: "l1", sprache: "Deutsch", niveau: "Muttersprache" },
      { id: "l2", sprache: "Englisch", niveau: "B2" },
    ];
    const bewerbung = (id, firma, titel, ausrichtungId, quelle, verlauf, extra) => ({
      id,
      ausrichtungId,
      sprache: "de",
      anrede: "sie",
      firma: { name: firma, adresse: "Beispielstraße 2, 12345 Musterstadt" },
      ansprechpartner: { name: "Erika Beispiel", email: "bewerbung@example.org" },
      stelle: { titel, quelle, anzeigeText: "Wir suchen Verstärkung im Team. Erfahrung in Personalverwaltung und Tabellenkalkulation." },
      status: verlauf.map(([status, t]) => ({ status, datum: vor(t) })),
      termine: [],
      emails: [],
      dokumente: {},
      anschreiben: { abschnitte: {}, varianten: {}, rahmen: {} },
      keywords: { extrahiert: [], treffer: [], fehlend: [], manuell: [], gewichte: {} },
      notizen: "",
      checkliste: {},
      erstellt: vor(verlauf[0][1]),
      ...extra,
    });
    const morgen = new Date(jetzt.getTime() + 864e5);
    const angebot = (bruttoJahr, wochenstunden, urlaubstage, homeofficeTage, pendelMinutenEinfach) => ({
      bruttoJahr,
      wochenstunden,
      urlaubstage,
      homeofficeTage,
      praesenzTage: 5 - homeofficeTage,
      pendelMinutenEinfach,
      zusatzleistungen: [],
      achtenAuf: [],
      bewertungen: {},
      pruefliste: {},
    });
    d.bewerbungen = [
      bewerbung("b1", "Erfundene GmbH", "Personalsachbearbeitung", "a1", "Jobportal", [["vorbereitung", 30], ["versendet", 25], ["gespraech_digital", 10], ["vertrag_erhalten", 3]], { versendetAm: vor(25), angebot: angebot(48000, 40, 30, 2, 25) }),
      bewerbung("b2", "Muster AG", "HR Generalist", "a1", "Firmenseite", [["vorbereitung", 28], ["versendet", 22], ["vertrag_erhalten", 2]], { versendetAm: vor(22), angebot: angebot(52000, 40, 28, 1, 45) }),
      bewerbung("b3", "Beispiel KG", "Büroassistenz", "a2", "Jobportal", [["vorbereitung", 20], ["versendet", 18], ["absage", 6]], { versendetAm: vor(18) }),
      bewerbung("b4", "Test OHG", "Teamassistenz", "a2", "Empfehlung", [["vorbereitung", 12], ["versendet", 10], ["telefoninterview", 1]], {
        versendetAm: vor(10),
        termine: [{ id: "t1", art: "telefon", start: morgen.toISOString(), ende: new Date(morgen.getTime() + 18e5).toISOString() }],
      }),
      bewerbung("b5", "Noch Offen GmbH", "Sachbearbeitung", "a1", "Jobportal", [["vorbereitung", 1]], {}),
    ];
  });
  return K.tresor.speichernJetzt();
}

export async function demoProfilAnlegen(p) {
  const knopf = (name) => p.getByRole("button", { name, exact: true });
  await p.getByRole("button", { name: "Ordner auswählen" }).click();
  await p.getByRole("button", { name: "Neues Profil anlegen" }).click();
  await p.waitForFunction(() => document.activeElement.tagName === "INPUT");
  await p.keyboard.type(DEMO_NAME);
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { name: "Wie soll R42J aussehen?" }).waitFor();
  await knopf("Weiter").click();
  const felder = p.locator('input[autocomplete="new-password"]');
  await felder.nth(0).fill(DEMO_PASSWORT);
  await felder.nth(1).fill(DEMO_PASSWORT);
  await knopf("Weiter").click();
  await p.getByRole("heading", { name: "Sichere deinen" }).waitFor();
  const code = await p.locator(".rj-recovery code").allInnerTexts();
  await p.getByLabel("Die ersten zwei Blöcke").fill(code[0] + " " + code[1]);
  await knopf("Weiter").click();
  await p.getByRole("heading", { name: "zweiten Ort" }).waitFor({ timeout: 8000 });
  await knopf("Weiter").click();
  await p.getByRole("heading", { name: "Nach Updates" }).waitFor();
  await knopf("Weiter").click();
  await p.getByRole("heading", { name: "Bereite dich vor" }).waitFor();
  await knopf("Weiter").click();
  await p.getByRole("heading", { name: "Erzähl R42J von dir" }).waitFor();
  await p.getByLabel("Vorname").fill("Demo");
  await p.getByLabel("Nachname").fill("Mustermann");
  await p.getByLabel("E-Mail-Adresse").fill("demo@example.org");
  await knopf("Weiter").click();
  await p.getByLabel(/^Name/).fill("Personalsachbearbeitung");
  await knopf("Zu R42J").click();
  await p.waitForSelector(".rj-shell");
  await p.evaluate(fuellen);
}
