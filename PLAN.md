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
- [ ] Formulare für alle Stammdaten-Bereiche (SPEC §6.2), zweisprachige Felder.
- [ ] Ausrichtungen inkl. Tagging aller Einträge.
- [ ] STAR-Erfolge mit verdichtetem CV-Stichpunkt.
- [ ] Anlagen: Upload, Einzelverschlüsselung, Vorschau, Kategorien, Tags.
- [ ] Globale Suche (`Strg/Cmd + K`).
- [ ] KI-Workflow-Grundgerüst (Prompt kopieren → Antwort einfügen → validieren), Platzhalter-Ersetzung.
- [ ] Lebenslauf-Import per KI (Onboarding-Schritt 7).
- [ ] Onboarding-Schritte 7–8.

**Akzeptanz:** Vollständiges Profil anlegbar; Suche findet Kompetenz über Synonym; Anlage nach Neustart wieder anzeigbar; KI-Import mit fehlerhaftem JSON zeigt verständliche Meldung.

### M3 · Lebenslauf-PDF
- [ ] CV-Layout laut SPEC §6.5 mit pdfmake, Schrift eingebettet.
- [ ] Auswahl nach Ausrichtung, Priorisierung nach Keywords (Stub bis M4).
- [ ] Foto-Regel (DE an, EN aus), Akzentfarbe aus Einstellungen.
- [ ] Seitenumbruch-Regeln, Überlängen-Warnung.
- [ ] Dateinamen-Normalisierung.

**Akzeptanz (ATS-Test):** Text aus PDF kopieren ergibt korrekte Lesereihenfolge; Prüfung mit mind. 2 kostenlosen ATS-Checkern ohne Strukturfehler; DE- und EN-Variante; Datei heißt `vorname-nachname-lebenslauf.pdf`.

### M4 · Stelle, Anschreiben, Anlagen-PDF, Versand
- [ ] Stelle erfassen (Text einfügen, Markdown-Import mit Frontmatter).
- [ ] Keyword-Extraktion + Match-Score + Lücken (SPEC §6.4), mitgelieferte Skill-Liste.
- [ ] KI-Stellenanalyse (optional).
- [ ] Anschreiben-Bausteine DE-Sie/DE-Du/EN, Editor mit Vorschau, Varianten-Rotation.
- [ ] KI-Anschreiben + KI-Korrektur.
- [ ] Unterschrift optional (Standard aus, Warnhinweis).
- [ ] Anlagen-PDF: Auswahl, Reihenfolge, Deckblatt, Komprimierung, Größenanzeige, Gesamt-PDF.
- [ ] `.eml`-Erzeugung, Speicherung im Tresor, Löschen, Öffnen über `export/`.
- [ ] Portal-Ansicht mit Kopier-Buttons.

**Akzeptanz:** `.eml` öffnet sich in Outlook (Windows) und Apple Mail als Entwurf mit Anhängen; Anlagen-PDF „Klein“ bei 10 Scans < 5 MB und lesbar; Anschreiben passt auf 1 Seite.

### M5 · Übersicht, Status, Termine
- [ ] Übersicht mit Filter/Sortierung/Suche, Status-Badges.
- [ ] Status-Historie, Statuswechsel-Dialog.
- [ ] Erinnerungen beim Start (Rückfrage fällig, Termine, Keine Antwort).
- [ ] Rückfrage-E-Mail-Vorlage.
- [ ] Detailansicht inkl. Anzeigen-Kopie, Notizen, Maps-Link.
- [ ] Termine: `.ics`, Google-Link, Outlook-Link.
- [ ] Checkliste pro Bewerbung, Warnung vor Versand.

**Akzeptanz:** Bewerbung mit `versendetAm` vor 15 Tagen erscheint als „Rückfrage fällig“; `.ics` lässt sich in Outlook/Apple Kalender importieren; Google-/Outlook-Link öffnet vorausgefüllten Termin.

**→ Release v0.1 (MVP)** über GitHub Releases, Test mit 2–3 nicht-technischen Testpersonen.

---

## Ausbau

### M6 · Vergleich (v0.2)
- [ ] Angebotsfelder, Berechnungen (SPEC §6.10).
- [ ] Gewichtete Punktwertung mit einstellbaren Kriterien.
- [ ] „Worauf achten“-Liste + Prüfliste mit Wissens-Links.

**Akzeptanz:** Rechenbeispiele in `docs/tests/vergleich.md` stimmen; Gewichtsänderung ändert Rangfolge sofort.

### M7 · Vorbereitung (v0.3)
- [ ] Fragenformat + Loader (mitgeliefert + `daten/fragen/*.json` per Ordner-Handle + JSON-Import).
- [ ] Karteikarten mit Leitner-System.
- [ ] Multiple Choice inkl. Erklärung.
- [ ] STAR-Training mit Timer.
- [ ] Unternehmensfragen per KI-Prompt.
- [ ] Fragenkataloge erstellen: Allgemeinwissen, Mathe & Dreisatz, Logik & Zahlenreihen, Deutsch, Englisch, Interviewfragen (Ziel SPEC §8).

**Akzeptanz:** Falsch beantwortete Karte erscheint am Folgetag erneut; Katalog-Import mit fehlerhafter Datei bricht nicht ab.

### M8 · Checklisten, Wissen, Statistik (v0.4)
- [ ] Checklisten-Übersicht (einmalig + pro Bewerbung).
- [ ] Wissensbereich: Markdown-Rendering, Suche, Kategorien, kontextbezogene Links.
- [ ] Mitgelieferte Wissensartikel DE/EN (SPEC §6.13).
- [ ] Statistik-Dashboard mit SVG-Diagrammen.

**Akzeptanz:** Eigener Artikel in `daten/wissen/` erscheint nach Neustart; Statistik zeigt korrekte Quoten für Testdaten.

### M9 · Feinschliff & Release 1.0
- [ ] Update-Prüfung (opt-in), Update-Anleitung.
- [ ] GitHub Actions: Release-ZIP bauen (ohne `daten/`).
- [ ] Barrierefreiheits-Audit (Tastatur, Screenreader NVDA/VoiceOver, Kontrast, Schriftgröße 130 %).
- [ ] Endnutzer-Anleitung (`LIESMICH`, Wissensartikel „Erste Schritte“, Bildanleitungen für Ordnerwahl und Mac-Sicherheitswarnung).
- [ ] Testdaten-Generator (Demo-Profil) für Screenshots und Tests.
- [ ] Sicherheitsreview: CSP, keine Klartextreste in `export/`, keine Daten in Logs/Konsole.

**Akzeptanz:** Nicht-technische Testperson schafft Onboarding + erste Bewerbung ohne Hilfe in < 30 min.

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