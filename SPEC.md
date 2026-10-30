# R42J – Ready 4 2 Jobs · Spezifikation

> Lokales, verschlüsseltes Bewerbungs-Tool. Läuft ohne Installation vom USB-Stick in Chrome/Edge (Windows & macOS).
> Lizenz: **GPL-3.0** · Zielgruppe: **nicht-technische Nutzer** · UI: **Deutsch / Englisch** (umschaltbar)

---

## 1. Ziele & Abgrenzung

### Ziele
- Bewerbungen mit minimalem Aufwand erstellen: Stammdaten einmal pflegen, pro Stelle dynamisch zusammensetzen.
- ATS-optimierter Lebenslauf (einspaltig, F-Leseschema, STAR-basierte Stichpunkte).
- Anschreiben deterministisch aus Textbausteinen oder optional per KI-Prompt (externer Chat, Copy-Paste).
- Übersicht und Nachverfolgung aller Bewerbungen inkl. Erinnerungen.
- Vergleich von Angeboten mit gewichteter Punktwertung.
- Vorbereitung: Karteikarten, Multiple Choice, Einstellungstests, Unternehmenswissen, STAR-Interviewtraining.
- Checklisten, Wissensbereich (Markdown), Statistik.
- Alle persönlichen Daten lokal und verschlüsselt.

### Nicht-Ziele
- Kein Server, keine Cloud, kein Konto, keine Telemetrie.
- Kein direktes Ausfüllen fremder Bewerbungsportale (nur Kopier-Buttons).
- Kein automatischer E-Mail-Versand (nur `.eml`-Entwurf).
- Keine Unterstützung für Safari/Firefox (Hinweisseite statt App).
- Kein Netto-Rechner, keine Routing-API, keine Kalender-API.
- Keine Obsidian-Abhängigkeit (nur Markdown-Import/-Export).
- Keine Schlüsseldatei, kein TOTP/Passkey (technisch nicht sinnvoll bzw. auf `file://` nicht möglich).

---

## 2. Technische Plattform

| Thema | Entscheidung |
|---|---|
| Laufzeit | Chromium-Browser (Edge, Chrome, Brave, Vivaldi, Opera) über `file://` |
| Startdateien | `Start (Windows).cmd` → öffnet `app/index.html` in Edge · `Start (Mac).command` → öffnet in Chrome · Fallback: `Start.html` per Rechtsklick |
| Build | **Kein Build-Schritt.** Klassische `<script src>`-Einbindung, keine ES-Module (`import` scheitert auf `file://`), kein `fetch()` auf lokale Dateien |
| Framework | **Preact + Preact Hooks + htm** als UMD-Dateien (`window.preact`, `window.preactHooks`, `window.htm`), Templates per `htm` statt JSX – kein Build, CSP-konform ohne `unsafe-eval` |
| Dateizugriff | File System Access API: Nutzer wählt einmal pro Rechner den R42J-Ordner (`showDirectoryPicker`). Handle in IndexedDB, Berechtigung pro Sitzung per Klick erneuern. Laufwerksbuchstabe-Wechsel → Ordner neu wählen |
| Bibliotheken (lokal in `app/lib/`) | Preact · Preact Hooks · htm · pdfmake (Text-PDFs) · pdf-lib (Zusammenführen/Komprimieren) · MiniSearch (Volltextsuche) · marked + DOMPurify (Markdown) |
| Schrift | IBM Plex Sans (OFL), lokal mitgeliefert; im PDF zusätzlich eingebettet |
| Icons | Lucide (ISC), als Pfaddaten in `R42J.icons` (Design-System-Bundle) |
| UI-Design | Design-System „R42J“: Tokens, Farbschemata, Komponenten mit Präfix `rj-`; die Oberfläche duzt (Anrede in Bewerbungstexten separat pro Bewerbung: Sie/Du); Datumsfelder über eigenen DatePicker (TT.MM.JJJJ) |
| UI-Architektur | Komponenten unter `app/js/ui/` (je Komponente eine Datei, registriert an `window.R42J_UI`); Zustand über Hooks + ein zentraler Store (`app/js/core/store.js`). Aus dem Design-System-Bundle werden nur `R42J.icon()`, `R42J.status()`, `R42J.logo()`, `parseDate`/`formatDate` und `setTheme`/`setScheme`/`setFontSize` genutzt; DatePicker, Datentabelle und Seitenleiste sind Preact-Komponenten mit gleichem Markup, CSS und Verhalten. `R42J.hydrate()` wird in der App nicht verwendet, da es das DOM direkt verändert. |
| Browser-Erkennung | Kein Chromium oder keine File System Access API → Hinweisseite mit Download-Links (Edge/Chrome) |
| Netz | Nur opt-in Update-Prüfung (GitHub API) und vom Nutzer geklickte HTTPS-Links (Maps, Kalender) |

### Content Security Policy (Meta-Tag)
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self';
connect-src https://api.github.com; frame-src 'none'; object-src 'none';
form-action 'none'; base-uri 'none'
```
Externe Links nur `https://`, mit `rel="noopener noreferrer"`. Kein `eval`/`new Function` im eigenen Code oder in Bibliotheken.

---

## 3. Ordnerstruktur (auf dem Stick)

```
R42J/
├─ Start (Windows).cmd
├─ Start (Mac).command
├─ Start.html                  # Weiterleitung + Browser-Check
├─ LIESMICH.txt / README.txt
├─ app/                        # wird bei Updates komplett ersetzt
│  ├─ index.html
│  ├─ css/                     # tokens.css, base.css, components.css
│  ├─ js/                      # core/, modules/, ui/
│  ├─ lib/                     # vendored Bibliotheken
│  ├─ fonts/
│  ├─ i18n/                    # de.js, en.js (window.R42J_I18N = {...})
│  ├─ templates/               # Textbausteine-Defaults, CV-Layout
│  ├─ fragen/                  # mitgelieferte Fragenkataloge (*.js)
│  ├─ wissen-default/          # mitgelieferte Wissensartikel (*.md)
│  └─ version.js
└─ daten/                      # wird von Updates NIE angefasst
   ├─ profile.json             # unverschlüsselte Liste: id, Anzeigename, Datei
   ├─ <profil-id>/
   │  ├─ tresor.r42j           # verschlüsselter Haupttresor
   │  ├─ anlagen/<uuid>.enc    # einzeln verschlüsselte Dateien
   │  └─ backups/              # rotierende verschlüsselte Backups
   ├─ wissen/                  # eigene Wissensartikel (*.md, unverschlüsselt)
   ├─ fragen/                  # eigene Fragenkataloge (*.json, unverschlüsselt, ohne personenbezogene Daten)
   └─ export/                  # temporär (.eml, PDFs) – wird beim Start geleert
```
Beim ersten Start werden fehlende Ordner angelegt und `wissen-default/` nach `daten/wissen/` kopiert (nur wenn noch nicht vorhanden).

---

## 4. Sicherheit

### 4.1 Verschlüsselung
- **Algorithmus:** AES-256-GCM (Web Crypto), zufälliger 96-bit IV pro Schreibvorgang.
- **Schlüsselhierarchie (Envelope):**
  - Zufälliger **Datenschlüssel (DEK)**, 256 bit, pro Profil.
  - DEK wird zweimal verpackt (AES-KW oder AES-GCM):
    1. mit **Passwort-Schlüssel** – PBKDF2-SHA-256, 600.000 Iterationen, 16-byte Salt
    2. mit **Wiederherstellungs-Schlüssel** – 256 bit Zufall, angezeigt als 8 × 6 Zeichen (Base32, ohne verwechselbare Zeichen)
  - Passwortwechsel = nur DEK neu verpacken, keine Neuverschlüsselung der Daten.
- **Tresorformat** `tresor.r42j`:
  ```json
  { "format": "r42j-vault", "v": 1,
    "kdf": { "alg": "PBKDF2-SHA256", "iter": 600000, "salt": "<b64>" },
    "wrapped": { "pw": "<b64>", "recovery": "<b64>" },
    "iv": "<b64>", "data": "<b64 ciphertext>" }
  ```
- **Anlagen:** je Datei eigener IV, mit demselben DEK verschlüsselt; Metadaten (Name, Typ, Größe, Tags) liegen im Tresor.
- **Schreiben atomar:** erst `*.tmp` schreiben, dann umbenennen bzw. überschreiben; bei Fehler alte Datei behalten.

### 4.2 Passwort & Sperre
- Mindestens 12 Zeichen, Stärke-Anzeige (zxcvbn-ähnliche Heuristik, lokal, ohne große Wörterliste).
- **Auto-Sperre** nach Inaktivität (Standard 10 min, einstellbar 5–60), außerdem beim Schließen des Tabs. Sperre löscht DEK aus dem Speicher.
- Kein „Passwort merken“.

### 4.3 Wiederherstellungsschlüssel
- Wird im Onboarding erzeugt und auf einem **Druckblatt** angezeigt (Button „Drucken“ → `window.print()` mit Druck-CSS). Inhalt: Profilname, Datum, Schlüssel, Kurzanleitung.
- Weiter geht es erst nach Bestätigung durch erneute Eingabe der ersten zwei Blöcke.
- Neuer Schlüssel kann in den Einstellungen erzeugt werden (alter wird ungültig).

### 4.4 Backups
- Automatisch nach jeder Sitzung mit Änderungen + manuell per Button.
- Ziel 1: `daten/<profil>/backups/`, Rotation: letzte **5** Stände.
- Ziel 2 (empfohlen, im Onboarding abgefragt): frei wählbarer Ordner (Festplatte, Cloud-Sync-Ordner). Handle in IndexedDB.
- Backup = verschlüsselte Kopie von Tresor + Anlagen als eine Datei `r42j-backup-<profil>-<datum>.r42jb` (Container: JSON-Index + verschlüsselte Blobs).
- Wiederherstellen aus Backup über Startbildschirm.

### 4.5 Export-Ordner
- `.eml` und erzeugte PDFs landen beim Öffnen/Herunterladen unverschlüsselt in `daten/export/`.
- Wird beim App-Start und beim Sperren geleert. Hinweis im UI.

### 4.6 KI-Datenschutz
- Prompts ersetzen standardmäßig persönliche Daten durch Platzhalter: `{{VORNAME}}`, `{{NACHNAME}}`, `{{EMAIL}}`, `{{TELEFON}}`, `{{ADRESSE}}`, `{{LINKEDIN}}`, `{{XING}}`, `{{GEBURTSDATUM}}`.
- Beim Zurück-Einfügen werden Platzhalter wieder ersetzt. Schalter „Platzhalter verwenden“ (Standard: an).

---

## 5. Datenmodell (Inhalt des Tresors)

Alle IDs sind UUIDs; Zeitstempel ISO 8601. `i18n`-Felder als `{ de?: string, en?: string }`.

```ts
Tresor {
  schema: number                  // für Migrationen
  profil: Profil
  ausrichtungen: Ausrichtung[]
  stationen: Station[]            // Beruf, Ausbildung, Schule, Praktikum, Ehrenamt
  erfolge: Erfolg[]               // STAR
  kompetenzen: Kompetenz[]
  zertifikate: Zertifikat[]
  sprachen: Sprache[]
  interessen: Interesse[]
  anlagen: Anlage[]               // Metadaten zu verschlüsselten Dateien
  bausteine: Textbaustein[]       // eigene/angepasste Anschreiben-Bausteine
  bewerbungen: Bewerbung[]
  gewichtung: Gewichtung
  lernstand: Lernstand[]
  checklisten: ChecklistenStand
  einstellungen: Einstellungen
}

Profil { vorname, nachname, titel?, geburtsdatum?, adresse{strasse, plz, ort, land},
  email, telefon, linkedin?, xing?, website?, foto?: AnlageId, unterschrift?: AnlageId,
  fuehrerschein?, verfuegbarAb?, kuendigungsfrist?, gehaltsvorstellung? }

Ausrichtung { id, name (z.B. "Personalsachbearbeitung"), kurzprofil: i18n,
  kernkompetenzen: KompetenzId[] (Reihenfolge = Priorität), farbe? }

Station { id, typ: "beruf"|"ausbildung"|"schule"|"studium"|"praktikum"|"ehrenamt",
  titel: i18n, organisation, ort, von, bis?|"heute", beschreibung?: i18n,
  ausrichtungen: AusrichtungId[], anlagen: AnlageId[], abschluss?, note? }

Erfolg { id, stationId, situation: i18n, aufgabe: i18n, aktion: i18n, ergebnis: i18n,
  kennzahl?: string, cvStichpunkt: i18n (verdichtet: Aktion + Ergebnis),
  kompetenzen: KompetenzId[], ausrichtungen: AusrichtungId[] }

Kompetenz { id, name: i18n, synonyme: string[], kategorie: "fach"|"methode"|"sozial"|"it"|"sonstige",
  niveau?: 1-5, ausrichtungen: AusrichtungId[] }

Zertifikat { id, name, aussteller, datum, gueltigBis?, anlageId?, ausrichtungen }
Sprache { id, sprache, niveau: "A1".."C2"|"Muttersprache" }
Interesse { id, text: i18n, ausrichtungen }

Anlage { id, dateiname, mime, groesse, kategorie: "zeugnis-schule"|"zeugnis-arbeit"|
  "zertifikat"|"foto"|"unterschrift"|"sonstiges", titel, datum?, tags: string[], seiten? }

Textbaustein { id, abschnitt: "einleitung"|"motivation"|"abgleich"|"mehrwert"|"rahmen"|"schluss",
  sprache: "de"|"en", anrede: "sie"|"du", text (mit {{platzhaltern}}), standard: boolean }

Bewerbung {
  id, ausrichtungId, sprache: "de"|"en", anrede: "sie"|"du",
  firma { name, adresse, website?, branche?, groesse? },
  ansprechpartner { anrede?, name?, position?, email?, telefon? },
  stelle { titel, referenz?, quelle (Portal), link?, anzeigeText (Kopie), anzeigeMd? },
  keywords { extrahiert: string[], treffer: KompetenzId[], fehlend: string[], manuell: string[] },
  dokumente { lebenslauf: Snapshot, anschreiben: Snapshot, anlagenPdf?: Snapshot,
              mitFoto: boolean, mitUnterschrift: boolean, komprimierung: "original"|"mittel"|"klein" },
  emails: EmailEntwurf[],
  status: StatusEintrag[]         // Historie, letzter = aktuell
  termine: Termin[],
  angebot?: Angebot,
  notizen: string,                // "Wichtige Angaben"
  checkliste: Record<string, boolean>,
  erstellt, versendetAm?
}

Snapshot { erzeugtAm, dateiname, anlageId }   // PDF als verschlüsselte Anlage
EmailEntwurf { id, an, betreff, text, anhaenge: AnlageId[], erstellt }
StatusEintrag { status: Status, datum, notiz? }
Status = "vorbereitung"|"versendet"|"rueckfrage_faellig"|"rueckfrage_gesendet"|
  "telefoninterview"|"gespraech_digital"|"gespraech_vor_ort"|"einstellungstest"|
  "vertrag_erhalten"|"vertrag_unterzeichnet"|"angenommen"|"probezeit_bestanden"|
  "absage"|"zurueckgezogen"|"keine_antwort"
Termin { id, art, start, ende, ort?, link?, notiz? }

Angebot { bruttoJahr, bonusJahr?, nettoMonat? (manuell), wochenstunden, urlaubstage,
  homeofficeTage (pro Woche), praesenzTage (pro Woche), pendelMinutenEinfach,
  pendelKostenMonat?, befristet?, probezeitMonate?, zusatzleistungen: string[],
  achtenAuf: string[], bewertungen: Record<KriteriumId, 0-10> }

Gewichtung { kriterien: { id, name, gewicht: 0-5, typ: "auto"|"manuell" }[] }
Lernstand { kartenId, box: 1-5, faellig, richtig, falsch }
Einstellungen { sprache, theme: "system"|"hell"|"dunkel", farbschema: string,
  schriftgroesse: "normal"|"gross"|"sehr-gross", sperreMinuten, rueckfrageTage (Std. 14),
  updatePruefung: boolean, backupZiel2?: boolean, kiPlatzhalter: boolean,
  seitenleisteEingeklappt: boolean }
```

Migrationen: `schema` hochzählen, Migrationsfunktionen in `app/js/core/migrations.js`, vor dem Laden ausführen, vorher Backup.

---

## 6. Module

### 6.1 Start & Onboarding
1. Browser-Check → Ordnerwahl (einmal pro Rechner, mit Bildanleitung).
2. Profil wählen oder anlegen. Profilname = Anzeigename der Person.
3. **Onboarding-Assistent** (Schrittanzeige, jederzeit fortsetzbar):
   1. Sprache & Darstellung (Theme, Farbschema, Schriftgröße)
   2. Passwort festlegen (Stärke-Anzeige)
   3. Wiederherstellungsschlüssel anzeigen → **drucken** → bestätigen
   4. Zweiten Backup-Ort wählen (empfohlen, überspringbar)
   5. Update-Prüfung erlauben? (Standard: aus, Erklärung)
   6. Einmal-Checkliste: eigenes Bewerbungs-Postfach, seriöse E-Mail-Adresse, Telefonnummer + Mailbox-Ansage, LinkedIn-Profilcheck, XING-Profilcheck (je mit Mini-Anleitung aus dem Wissensbereich)
   7. Stammdaten: manuell **oder** Lebenslauf-Import per KI-Prompt (6.3)
   8. Erste Ausrichtung anlegen

### 6.2 Stammdaten
- Bereiche: Persönliches, Ausrichtungen, Stationen, Erfolge (STAR), Kompetenzen, Zertifikate, Sprachen, Interessen, Anlagen.
- Jeder Eintrag mit Ausrichtungs-Tags (Mehrfachauswahl, „alle“ als Abkürzung).
- Zweisprachige Felder: DE/EN-Umschalter am Feld; fehlende Übersetzung wird markiert.
- Anlagen: Drag & Drop (PDF, JPG, PNG), Vorschau, Kategorie, Tags. Bilder werden beim Einfügen in PDF gewandelt.
- **Suche** (global, `Strg/Cmd + K`): MiniSearch über Kompetenzen (inkl. Synonyme), Stationen, Erfolge, Zertifikate, Anlagen-Titel/Tags, Bewerbungen (Firma, Stelle). Index nur im Speicher.

### 6.3 KI-Prompts (generisch)
- Jeder KI-Workflow = **Prompt kopieren** → externer Chat → **Antwort einfügen** → Validierung → Vorschau → Übernehmen.
- Antworten in festem JSON-Format (im Prompt definiert, in ```json-Block). Parser toleriert Text drumherum, validiert Schema, zeigt Fehler verständlich.
- Workflows:
  - Lebenslauf-Import (Text → Stammdaten-JSON)
  - Stellenanalyse (Anzeige → Keywords, Anforderungen, Unternehmensinfos)
  - Anschreiben (Profil-Auszug + Anzeige → Abschnitte)
  - Rechtschreib-/Stilkorrektur (Text → korrigierter Text + Änderungsliste)
  - Unternehmensfragen (Firma + Anzeige → Fragen im Lernformat)
- Platzhalter-Ersetzung gemäß 4.6.

### 6.4 Stelle erfassen
- Eingabe: Anzeigentext einfügen **oder** Markdown-Datei importieren (z. B. Obsidian Web Clipper; Frontmatter `title`, `source`, `company` auslesen).
- Pflicht: Firma, Stellentitel, Ausrichtung, Sprache, Anrede.
- **Keyword-Extraktion (deterministisch):**
  1. Normalisieren (Kleinschreibung, Umlaute, Bindestriche), Tokenisieren, Stoppwörter DE/EN entfernen.
  2. N-Gramme (1–3) gegen Kompetenz-Namen + Synonyme des Profils und gegen mitgelieferte Skill-Liste (`app/templates/skills.js`) abgleichen.
  3. Gewichtung: Häufigkeit + Position (Abschnitte „Anforderungen/Ihr Profil/Requirements“ höher).
  4. Ergebnis: **Treffer** (vorhanden), **Lücken** (gefordert, nicht im Profil), Match-Score in %.
- Nutzer kann Keywords ergänzen/entfernen; Lücken mit einem Klick als Kompetenz anlegen.

### 6.5 Lebenslauf (PDF)
- **Eine** geprüfte Vorlage, einspaltig, A4, 1–2 Seiten, Akzentfarbe & Schrift aus Einstellungen (nur WCAG-taugliche Voreinstellungen).
- Reihenfolge: Kopf (Name, Kontakt, Links, opt. Foto rechts oben) → Kurzprofil → Kernkompetenzen (Keyword-Zeile) → Berufserfahrung → Ausbildung → Zertifikate → Sprachen & IT → Interessen (optional).
- Auswahl: nur Einträge der Ausrichtung; Erfolge und Kompetenzen nach Keyword-Treffern der Stelle priorisiert (max. 3–5 Stichpunkte pro Station).
- Stichpunkte = `cvStichpunkt` (Aktion + Ergebnis, möglichst mit Zahl).
- **ATS-Regeln:** echter Text (keine Bilder für Text), Standard-Überschriften (DE: Berufserfahrung, Ausbildung …; EN: Work Experience, Education …), keine Tabellen/Textboxen/Spalten für Inhalt, Datumsformat einheitlich (`MM/JJJJ`), Kontaktdaten im Body (nicht in Kopf-/Fußzeile), Schrift eingebettet, PDF-Metadaten (Titel, Autor) gesetzt, Lesereihenfolge = visuelle Reihenfolge.
- Foto: Standard an bei DE, aus bei EN; pro Bewerbung umschaltbar.
- Dateiname: `vorname-nachname-lebenslauf.pdf` (Kleinbuchstaben, Umlaute → ae/oe/ue/ss, Leerzeichen → `-`).
- Seitenumbruch: keine Station über Seitengrenze trennen; bei > 2 Seiten Warnung + Vorschlag (ältere Stationen kürzen).

### 6.6 Anschreiben
- Abschnitte: Einleitung → Motivation (Unternehmen, manuell/KI) → Abgleich (2–3 stärkste Treffer, je mit passendem Erfolg) → Mehrwert → Rahmendaten (Eintrittstermin, Gehaltsvorstellung, Kündigungsfrist – jeweils ein/aus) → Schluss.
- Mitgelieferte Bausteine: DE-Sie, DE-Du, EN – je mehrere Varianten pro Abschnitt, zufällig rotierend wählbar („Andere Formulierung“).
- Platzhalter z. B. `{{firma}}`, `{{stelle}}`, `{{quelle}}`, `{{ansprechpartner_anrede}}`, `{{kompetenz_1}}`, `{{erfolg_1}}`, `{{eintritt}}`.
- Editor mit Live-Vorschau, Rechtschreibprüfung des Browsers (`spellcheck`, `lang` passend).
- Optional: Unterschrift (Standard aus; beim Aktivieren Hinweis auf Missbrauchsrisiko).
- Max. 1 Seite, Warnung bei Überlänge.
- Dateiname: `vorname-nachname-anschreiben-firma.pdf`.

### 6.7 Anlagen-PDF
- Auswahl der Anlagen per Checkbox (Vorauswahl nach Ausrichtung/Kategorie), Reihenfolge per Drag & Drop.
- Optional Deckblatt „Anlagen“ mit Inhaltsverzeichnis.
- Komprimierung: **Original / Mittel / Klein** (Bilder neu rendern in 200/150 dpi, JPEG-Qualität), Größenanzeige live, Warnung über 5 MB.
- Option „Alles in einer PDF“ (Anschreiben + Lebenslauf + Anlagen) zusätzlich zu Einzeldateien.
- Dateiname: `vorname-nachname-anlagen.pdf`.

### 6.8 Versand
- **E-Mail:** `.eml`-Entwurf (MIME multipart/mixed, UTF-8, Anhänge Base64, Header `X-Unsent: 1` für Outlook). Gespeichert im Tresor, löschbar. „Öffnen“ schreibt Datei nach `daten/export/` und bietet Download/Öffnen an.
- **Portal:** Ansicht mit allen Feldern einzeln + Kopier-Button (Vorname, Nachname, E-Mail, Telefon, Adresse, LinkedIn, XING, Anschreiben-Text, Gehaltsvorstellung, Eintritt …) und Download-Buttons für die PDFs.
- Nach Versand: Status „Versendet“ setzen (Dialog), `versendetAm` speichern.

### 6.9 Übersicht & Status
- Liste/Karten aller Bewerbungen, Filter (Status, Ausrichtung, Zeitraum), Sortierung, Suche.
- Status-Badges mit Farbe + Icon + Text (nicht nur Farbe).
- **Erinnerungen** beim Öffnen: „Rückfrage fällig“ nach X Tagen (Std. 14) ohne Antwort; anstehende Termine (nächste 7 Tage); optional „Keine Antwort“ vorschlagen nach 6 Wochen.
- Rückfrage-Vorlage (E-Mail-Baustein) direkt erzeugbar.
- Detailansicht: Stammdaten der Stelle, Anzeigentext-Kopie, Dokumente, E-Mails, Status-Historie, Termine, Notizen („Wichtige Angaben“), Checkliste.
- **Maps:** Button „Route anzeigen“ → `https://www.google.com/maps/dir/?api=1&origin=<Profiladresse>&destination=<Firmenadresse>` (Hinweis: Adressen gehen an Google).
- **Termine:** drei Buttons: `.ics` herunterladen · Google Kalender (`calendar.google.com/calendar/render?action=TEMPLATE&…`) · Outlook (`outlook.live.com/calendar/0/deeplink/compose?…`). Hinweis, dass Daten an den Anbieter gehen.

### 6.10 Vergleich
- Auswahl von 2–5 Bewerbungen mit Angebot.
- Felder siehe `Angebot`. Automatisch berechnet:
  - Arbeitswochen/Jahr = 52 − Urlaubstage/5 − 2 (Feiertagspauschale, einstellbar)
  - Pendelstunden/Woche = 2 × Pendelminuten × Präsenztage / 60
  - **Effektiver Stundenlohn (brutto)** = (Brutto + Bonus − Pendelkosten/Jahr) ÷ (Arbeitswochen × (Wochenstunden + Pendelstunden))
- **Gewichtete Punktwertung:** Kriterien mit Gewicht 0–5 (Standard: Gehalt, effektiver Stundenlohn, Fahrtweg, Homeoffice, Urlaub, Boni, Sicherheit/Befristung, Bauchgefühl). Auto-Kriterien werden min-max auf 0–10 normiert, manuelle per Schieberegler. Ergebnis: Rangfolge + Balken.
- „Worauf achten“: Stichpunktliste pro Angebot + mitgelieferte Prüfliste (Probezeit, Kündigungsfrist, Überstundenregelung, Befristung, Wettbewerbsverbot, Rückzahlungsklauseln …) mit Link in den Wissensbereich.

### 6.11 Vorbereitung
- **Karteikarten** mit Leitner-System (5 Boxen, Intervalle 1/2/4/8/16 Tage).
- **Multiple Choice** (1 richtige oder Mehrfachauswahl), sofortige Auflösung mit Erklärung.
- **Kategorien (mitgeliefert):** Allgemeinwissen · Mathe & Dreisatz · Logik & Zahlenreihen · Deutsch (Rechtschreibung, Grammatik) · Englisch · Typische Interviewfragen.
- **STAR-Training:** Interviewfragen („Erzählen Sie von einer Situation, in der …“) → passende Erfolge aus dem Profil vorschlagen → Nutzer übt Antwort (Timer, Selbstbewertung).
- **Unternehmenswissen:** per KI-Prompt (6.3) erzeugt, pro Bewerbung gespeichert.
- Fragenformat (mitgeliefert als `app/fragen/*.js`, eigene Kataloge als reines JSON in `daten/fragen/*.json` oder per Import):
  ```json
  { "kategorie": "logik", "sprache": "de", "fragen": [
    { "id": "...", "typ": "karte|mc|mc-multi|zahlenreihe",
      "frage": "...", "antworten": ["..."], "richtig": [0], "erklaerung": "..." } ] }
  ```
- Hinweis: Eigene Fragenkataloge in `daten/fragen/` werden mangels `fetch` über einen Import-Dialog (Ordner-Handle) gelesen, als JSON geparst und validiert, nie ausgeführt.
- Kataloge sind unverschlüsselt und enthalten keine personenbezogenen Daten. Alles mit Personenbezug (Unternehmensfragen pro Bewerbung, Lernstand, STAR-Training) liegt im Tresor.

### 6.12 Checklisten
- **Einmalig (Onboarding):** siehe 6.1, jederzeit unter „Checklisten“ erneut prüfbar.
- **Pro Bewerbung:** Unternehmen recherchiert · Ansprechpartner geprüft · Stellen-Keywords abgeglichen · Rechtschreibung geprüft (Browser + optional KI) · Anlagen vollständig · Dateinamen korrekt · Dateigröße OK · Betreff/Referenznummer korrekt.
- Fortschritt als Balken; offene Punkte vor „Versenden“ als Warnung (nicht blockierend).

### 6.13 Wissen
- Markdown-Artikel aus `daten/wissen/` (Ordner-Handle), gerendert mit marked + DOMPurify.
- Mitgeliefert (DE/EN): Foto ja/nein · ATS erklärt · STAR-Methode · Anschreiben-Aufbau · Gehaltsverhandlung · Kündigungsfristen · Arbeitsvertrag prüfen · Vorstellungsgespräch · LinkedIn-/XING-Profil · Seriöse E-Mail-Adresse · Probezeit.
- Suche + Kategorien über Frontmatter (`title`, `category`, `lang`).
- Links aus der App kontextbezogen in passende Artikel (z. B. Foto-Schalter → „Foto ja/nein“).

### 6.14 Statistik
- Bewerbungen pro Woche/Monat · Einladungsquote (Gespräch ÷ versendet) · Quote pro Ausrichtung · Quote pro Portal/Quelle · Ø Antwortzeit · Status-Verteilung (Trichter).
- Einfache SVG-Diagramme ohne externe Bibliothek; jede Zahl mit Basis („12 von 80“).

### 6.15 Einstellungen
- Sprache, Theme, Farbschema (Voreinstellungen), Schriftgröße, Seitenleiste eingeklappt (auch per Strg/Cmd + B), Sperrzeit, Rückfrage-Frist, Feiertagspauschale, Backup (Ziel 2, jetzt sichern, wiederherstellen), Passwort ändern, Wiederherstellungsschlüssel neu, Update-Prüfung, Profil exportieren/löschen, Export-Ordner leeren.

### 6.16 Updates
- Opt-in: beim Start max. 1×/Tag `GET https://api.github.com/repos/benni-russ/ready-4-2-jobs/releases/latest` → Vergleich mit `app/version.js` → Hinweis mit Link zum Release.
- Anleitung „Update installieren“: ZIP entpacken, **nur** Ordner `app/` ersetzen. Startdateien liegen im ZIP mit, `daten/` ist nicht enthalten.
- Release-ZIP per GitHub Actions (`r42j-vX.Y.Z.zip`).

---

## 7. Nicht-funktionale Anforderungen

| Bereich | Anforderung |
|---|---|
| Barrierefreiheit | WCAG 2.2 AA: Kontrast ≥ 4,5:1 (Text), ≥ 3:1 (UI); Tastaturbedienung komplett; sichtbarer Fokus; Klickflächen ≥ 44 × 44 px; Status nie nur über Farbe; `prefers-reduced-motion` |
| Schriftgröße | 3 Stufen (100 / 115 / 130 %), Layout bricht nicht |
| Theme | Hell/Dunkel, Standard = System, umschaltbar; Farbschemata als Voreinstellungen (Blau, Petrol, Grün, Violett, Graphit), alle AA-geprüft in beiden Modi |
| Performance | Entsperren < 2 s, Lebenslauf-PDF < 3 s, Anlagen-PDF (20 Seiten) < 10 s |
| Robustheit | Atomares Speichern, Autosave (debounced 2 s), Warnung bei ungespeicherten Änderungen |
| Sprache | Alle UI-Texte über `i18n`, keine harten Strings im Markup |
| Tabellen | Alle Listen-Tabellen durchsuchbar (umlaut-tolerant) und nach jeder Spalte sortierbar (Text, Zahl, Datum) |
| Verständlichkeit | Keine Fachbegriffe ohne Erklärung; Leere Zustände mit Handlungsaufforderung; Fehler in Klartext mit Lösung |
| Datenschutz | Keine Netzwerkanfragen außer den in Abschnitt 2 („Netz“) genannten; keine Analytics; keine CDN |

---

## 8. Offene Entscheidungen (in M0 zu klären)
- Umfang der mitgelieferten Fragenkataloge (Vorschlag: je Kategorie ≥ 50 Fragen DE, ≥ 30 EN für v1.0).