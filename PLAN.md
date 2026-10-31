# R42J – Umsetzungsplan

> Grundlage: `SPEC.md` (fachlich/technisch) und das Design-System „R42J“ (UI).
> Arbeitsweise für Claude Code: Meilensteine der Reihe nach, jeder endet mit lauffähigem Stand und erfüllten Akzeptanzkriterien. Keine Abhängigkeiten installieren; Bibliotheken als Dateien in `app/lib/` ablegen.

## Leitplanken
- Kein Build, keine ES-Module, kein `fetch()` auf lokale Dateien – alles muss per Doppelklick über `file://` in Chrome/Edge laufen.
- UI mit Preact + Hooks + htm (UMD); Komponenten-Markup 1:1 aus den Design-System-Vorschauen, `class` statt `className` ist mit htm erlaubt. Kein direktes DOM-Verändern durch Fremdcode (also kein `R42J.hydrate()`).
- `app/` und `daten/` strikt trennen. Code schreibt **nie** nach `app/`.
- Alle UI-Texte über `i18n` (DE + EN pflegen).
- UI ausschließlich aus Design-System-Tokens und -Komponenten bauen; alles, was dort noch fehlt, zuerst im Design-System ergänzen.
- Jede Funktion mit Tastatur bedienbar, WCAG 2.2 AA.
- Nach jedem Meilenstein: manueller Test auf Windows (Edge) **und** macOS (Chrome) vom USB-Stick.
- Vor jedem Release: Testlauf im Browser mit dem fertigen Stand. Ohne bestandenen Testlauf kein Release.
- Änderungen nur per Branch und PR, nie direkt auf `main`; so wenige PRs wie möglich, in der Regel einer pro Meilenstein.
- Commits nur mit der GitHub-No-Reply-Adresse. Keine IDs, API-Keys, Passwörter oder andere sicherheitsrelevanten Angaben im Repo.

---

## MVP (v0.1) = M0 – M5

### M0 · Grundgerüst & Entscheidungen
- [x] Entscheidung Preact + htm in `docs/ADR-001-framework.md` festhalten (Gründe: Umfang/Zustand, CSP ohne `unsafe-eval`, Komponenten).
- [x] `main` mit leerem Start-Commit anlegen (einzige Ausnahme von der PR-Regel, ein PR braucht einen Zielbranch), danach Schutzregel für `main`: PR-Pflicht, kein Force-Push.
- [x] `LICENSE` (GPL-3.0), `README.md`, `.gitignore` (mindestens `daten/`, `*.r42j`, `*.r42jb`, `*.enc`), Ordnerstruktur laut SPEC §3.
- [x] Bibliotheken herunterladen und in `app/lib/` ablegen (Preact, Preact Hooks, htm jeweils als UMD; pdfmake, pdf-lib, MiniSearch, marked, DOMPurify) inkl. Lizenzdateien in `app/lib/LICENSES/`.
- [x] IBM Plex Sans (400/700, kursiv) in `app/fonts/`.
- [x] Design-System „R42J“ übernehmen: `tokens.css` (aus `tokens.json`), `components/bundle.css`, `components/bundle.js` (`window.R42J`: Icons, Status, Theme/Farbschema/Schriftgröße) nach `app/css/` bzw. `app/js/ui/`; Markup der Komponenten aus den Vorschauen.
- [x] `index.html` mit CSP, Browser-Check, Hinweisseite für Nicht-Chromium.
- [x] Startdateien `Start (Windows).cmd`, `Start (Mac).command`, `Start.html`.
- [x] i18n-Grundgerüst (`de.js`, `en.js`, Umschalter).
- [x] Grund-Komponenten als Preact-Komponenten aus dem Design-System: `Icon`, `StatusBadge`, `Logo`, `Button`, Formularfelder, `DatePicker`, `DataTable` (Suche + Sortierung), `AppShell` mit ein-/ausklappbarer Seitenleiste (Strg/Cmd + B).
- [x] Zentraler Store + einfacher Hash-Router (`#/bewerbungen/…`), damit Zurück-Taste und Lesezeichen innerhalb der App funktionieren.
- [x] App-Shell: Navigation, Theme-Umschalter (System/Hell/Dunkel), Farbschema, Schriftgröße.

**Akzeptanz:** Doppelklick auf Startdatei öffnet App in Edge/Chrome ohne Konsolenfehler und ohne CSP-Verstöße; DatePicker, Tabelle und Seitenleiste verhalten sich wie im Design-System; Firefox zeigt Hinweisseite; Theme/Sprache/Schriftgröße umschaltbar.

### M1 · Tresor, Profile, Onboarding
- [x] Ordnerwahl (`showDirectoryPicker`), Handle in IndexedDB, Berechtigungs-Erneuerung.
- [x] Krypto-Modul: DEK, PBKDF2-Verpackung, Wiederherstellungsschlüssel, AES-GCM, atomares Schreiben (SPEC §4.1).
- [x] Profilliste `profile.json`, Profil anlegen/öffnen/löschen.
- [x] Onboarding-Assistent Schritte 1–6 inkl. Druckblatt Wiederherstellungsschlüssel.
- [x] Auto-Sperre (Inaktivität, Tab schließen), Sperrbildschirm.
- [x] Backups: lokal mit Rotation (eine je Tag, höchstens 3), zweiter Ort, Wiederherstellen.
- [x] Export-Ordner leeren beim Start/Sperren.
- [x] Migrations-Grundgerüst (`schema`).

**Akzeptanz:** Tresor ist ohne Passwort nicht lesbar (Hex-Ansicht zeigt nur Ciphertext); Entsperren mit Wiederherstellungsschlüssel funktioniert; Passwortwechsel ohne Datenverlust; Backup auf zweitem Ort wiederherstellbar; Sperre nach eingestellter Zeit.

### M2 · Stammdaten, Anlagen, Suche
- [x] Formulare für alle Stammdaten-Bereiche (SPEC §6.2), zweisprachige Felder.
- [x] Ausrichtungen inkl. Tagging aller Einträge.
- [x] STAR-Erfolge mit verdichtetem CV-Stichpunkt.
- [x] Anlagen: Upload, Einzelverschlüsselung, Vorschau, Kategorien, Tags.
- [x] Globale Suche (`Strg/Cmd + K`).
- [x] KI-Workflow-Grundgerüst (Prompt kopieren → Antwort einfügen → validieren), Platzhalter-Ersetzung.
- [x] Lebenslauf-Import per KI (Onboarding-Schritt 7).
- [x] KI-Interview, „Eigenen Text strukturieren“, Prompt „Fehlende Übersetzungen ergänzen“ und DeepL-Link an zweisprachigen Feldern.
- [x] Onboarding-Schritte 7–8.

**Akzeptanz:** Vollständiges Profil anlegbar; Suche findet Kompetenz über Synonym; Anlage nach Neustart wieder anzeigbar; KI-Import mit fehlerhaftem JSON zeigt verständliche Meldung.

### M3 · Lebenslauf-PDF
- [x] CV-Layout laut SPEC §6.5 mit pdfmake, Schrift eingebettet.
- [x] Auswahl nach Ausrichtung, Priorisierung nach Keywords (Stub bis M4).
- [x] Foto-Regel (DE an, EN aus), Akzentfarbe aus Einstellungen.
- [x] Seitenumbruch-Regeln, Überlängen-Warnung.
- [x] Dateinamen-Normalisierung.

Stand: Lesereihenfolge, DE/EN und Dateiname sind per Textextraktion geprüft. Offen ist die manuelle Prüfung mit 2 ATS-Checkern.

**Akzeptanz (ATS-Test):** Text aus PDF kopieren ergibt korrekte Lesereihenfolge; Prüfung mit mind. 2 kostenlosen ATS-Checkern ohne Strukturfehler; DE- und EN-Variante; Datei heißt `vorname-nachname-lebenslauf.pdf`.

### M4 · Stelle, Anschreiben, Anlagen-PDF, Versand
- [x] Stelle erfassen (Text einfügen, Markdown-Import mit Frontmatter).
- [x] Keyword-Extraktion + Match-Score + Lücken (SPEC §6.4), mitgelieferte Skill-Liste.
- [x] KI-Stellenanalyse (optional).
- [x] Anschreiben-Bausteine DE-Sie/DE-Du/EN, Editor mit Vorschau, Varianten-Rotation.
- [x] KI-Anschreiben + KI-Korrektur.
- [x] Unterschrift optional (Standard aus, Warnhinweis).
- [x] Anlagen-PDF: Auswahl, Reihenfolge, Deckblatt, Komprimierung, Größenanzeige, Gesamt-PDF.
- [x] `.eml`-Erzeugung, Speicherung im Tresor, Löschen, Öffnen über `export/`.
- [x] Portal-Ansicht mit Kopier-Buttons.

**Akzeptanz:** `.eml` öffnet sich in Outlook (Windows) und Apple Mail als Entwurf mit Anhängen; Anlagen-PDF „Klein“ bei 10 Scans < 5 MB und lesbar; Anschreiben passt auf 1 Seite.

### M5 · Übersicht, Status, Termine
- [x] Übersicht mit Filter/Sortierung/Suche, Status-Badges.
- [x] Status-Historie, Statuswechsel-Dialog.
- [x] Erinnerungen beim Start (Rückfrage fällig, Termine, Keine Antwort).
- [x] Rückfrage-E-Mail-Vorlage.
- [x] Detailansicht inkl. Anzeigen-Kopie, Notizen, Maps-Link.
- [x] Termine: `.ics`, Google-Link, Outlook-Link.
- [x] Checkliste pro Bewerbung, Warnung vor Versand.

Stand: Rückfrage-Regel, `.ics`-Aufbau nach RFC 5545 und die Links sind automatisch geprüft. Offen ist der manuelle Import in Outlook und Apple Kalender sowie das Öffnen der Links beim Anbieter.

**Akzeptanz:** Bewerbung mit `versendetAm` vor 15 Tagen erscheint als „Rückfrage fällig“; `.ics` lässt sich in Outlook/Apple Kalender importieren; Google-/Outlook-Link öffnet vorausgefüllten Termin.

**→ Release v0.1 (MVP)** über GitHub Releases, Test mit 2–3 nicht-technischen Testpersonen.

---

## Ausbau

### M6 · Vergleich (v0.2)
- [x] Angebotsfelder, Berechnungen (SPEC §6.10).
- [x] Gewichtete Punktwertung mit einstellbaren Kriterien.
- [x] „Worauf achten“-Liste + Prüfliste mit Wissens-Links.

**Akzeptanz:** Rechenbeispiele in `docs/tests/vergleich.md` stimmen; Gewichtsänderung ändert Rangfolge sofort.

### M7 · Vorbereitung (v0.3)
- [x] Fragenformat + Loader (mitgeliefert + `daten/fragen/*.json` per Ordner-Handle + JSON-Import).
- [x] Karteikarten mit Leitner-System.
- [x] Multiple Choice inkl. Erklärung.
- [x] STAR-Training mit Timer.
- [x] Unternehmensfragen per KI-Prompt.
- [x] Fragenkataloge erstellen: Allgemeinwissen, Mathe & Dreisatz, Logik & Zahlenreihen, Deutsch, Englisch, Interviewfragen (Ziel SPEC §8).

**Akzeptanz:** Falsch beantwortete Karte erscheint am Folgetag erneut; Katalog-Import mit fehlerhafter Datei bricht nicht ab.

### M8 · Checklisten, Wissen, Statistik (v0.4)
- [x] Checklisten-Übersicht (einmalig + pro Bewerbung).
- [x] Wissensbereich: Markdown-Rendering, Suche, Kategorien, kontextbezogene Links. Die Prüfliste im Vergleich verlinkt bereits auf `#/wissen/arbeitsvertrag-pruefen` und `#/wissen/kuendigungsfristen`; diese Kennungen müssen die Artikel tragen.
- [x] Mitgelieferte Wissensartikel DE/EN (SPEC §6.13).
- [x] Statistik-Dashboard mit SVG-Diagrammen.

**Akzeptanz:** Eigener Artikel in `daten/wissen/` erscheint nach Neustart; Statistik zeigt korrekte Quoten für Testdaten.

### M9 · Feinschliff & Release 1.0
- [x] Update-Prüfung (opt-in), Update-Anleitung.
- [x] GitHub Actions: Release-ZIP bauen (ohne `daten/`). Workflow steht, ausgelöst wurde er noch nicht.
- [x] Barrierefreiheits-Audit, automatisierbarer Teil: Tastatur, Kontrast, Schriftgröße 130 %, Klickflächen, axe-core.
- [ ] Barrierefreiheits-Audit, Handarbeit: Screenreader NVDA und VoiceOver.
- [x] Endnutzer-Anleitung: `LIESMICH.html`, Wissensartikel „Erste Schritte“ und „Update installieren“, Bilder der App-Schritte.
- [ ] Bilder der Fenster von Windows und macOS (Ordnerdialog, Mac-Sicherheitswarnung). Bis dahin stehen diese Schritte als Text in `LIESMICH.html`, die Mac-Schritte sind auf keinem echten Gerät nachgestellt.
- [x] Testdaten-Generator (Demo-Profil) für Screenshots und Tests.
- [x] Sicherheitsreview: CSP, keine Klartextreste in `export/`, keine Daten in Logs/Konsole (`docs/SICHERHEIT.md`).
- [x] PDF-Schrift auf Latin Extended und Vietnamesisch erweitert.
- [x] Feedback-Feinschliff: Name mit Unterzeile, 1920 × 1080, Brotkrumen, Suchleiste, Speicheranzeige, Formulare mit Bearbeiten, Anschreiben in Schritten, DIN 5008, Status-Icons, Kompetenzfilter, Anlagen-Vorschläge, Vergleichspunkte, Kataloge per KI, Wissen mit eigenen Artikeln, Quellen und Skizzen.

**Akzeptanz (offen):**
- [ ] Nicht-technische Testperson schafft Onboarding + erste Bewerbung ohne Hilfe in < 30 min.
- [ ] ATS-Test des Lebenslaufs mit einem echten ATS-Checker.
- [ ] Testlauf im Browser mit dem fertigen Stand vor dem Release.

---

## Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| macOS blockiert `Start (Mac).command` | Bildanleitung (Rechtsklick → Öffnen), Fallback `Start.html` |
| Chrome ändert `file://`-Verhalten / File System Access | Früh in M0/M1 testen; Kapselung in `core/fs.js`, damit ein Wechsel (z. B. zu lokalem Mini-Server) nur ein Modul betrifft |
| Passwort + Wiederherstellungsschlüssel verloren | Klare Warnungen, Druck-Pflicht im Onboarding |
| USB-Stick defekt/verloren | Zweiter Backup-Ort im Onboarding stark empfohlen |
| PDF zu groß für E-Mail | Komprimierungsstufen, Größenanzeige, Warnung > 5 MB |
| ATS-Kompatibilität ändert sich | Eine Vorlage, zentral in `templates/cv.js` anpassbar |
| Keyword-Extraktion ungenau | Manuelle Korrektur + optionale KI-Analyse |