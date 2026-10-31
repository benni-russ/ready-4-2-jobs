# Feedback-Feinschliff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Rückmeldungen aus dem Testlauf umsetzen: Rahmen, Speichern, Bewerbungen, Module, Wissen.

**Architecture:** Bausteine entstehen zuerst im Design-System und werden als Preact-Komponenten übernommen. Gemeinsame Grundlagen (Breadcrumb, Formular-Rahmen, Speicheranzeige) liegen zentral, die Module bauen darauf auf.

**Tech Stack:** Preact + htm über klassische Script-Tags, keine Abhängigkeiten, Tests mit Node und playwright-core.

**Spec:** `docs/superpowers/specs/2026-10-31-feedback-feinschliff-design.md`

## Global Constraints

- Lauffähig über `file://`: keine ES-Module, kein `fetch()` auf lokale Dateien, kein `eval`, neue Skripte als `<script src>` in `index.html` in richtiger Reihenfolge.
- Alle Texte in `app/i18n/de.js` und `en.js`. Die Oberfläche duzt.
- WCAG 2.2 AA: Klickflächen ≥ 44 × 44 px, sichtbarer Fokus, Status nie nur über Farbe.
- Tokens nur in `tools/tokens.json` ändern, danach `node tools/tokens-css.mjs`.
- Bisherige Breakpoints (600 px) bleiben. Neu: `@media (min-width: 1800px)`, Grenze knapp unter 1920, damit Browserränder nicht stören.
- Keine Schema-Änderung ohne Migration. Commits nur auf `feedback-feinschliff`.

## Review Focus

1. Rückfrage beim Verlassen: Browser-Zurück mit ungespeichertem Entwurf darf weder Daten verlieren noch in einer Hash-Schleife hängen.
2. `/` in Eingabefeldern, Textareas und im Dropdown bleibt ein normales Zeichen.
3. Automatische Sperre bei offenem Entwurf: Der Entwurf verschwindet, der Tresor bleibt konsistent.
4. Wissen: Ein alter Kopie-Artikel in `daten/wissen/` darf nach dem Update nicht doppelt erscheinen.
5. Anschreiben-PDF nach DIN 5008: Lange Texte bleiben auf einer Seite oder melden den Überlauf wie bisher.

---

### Task 1: Design-System ergänzen

**Files:** Artifact (Tokens, `bundle.css`, `bundle.js`, Komponenten mit README und Vorschau); `tools/tokens.json`, `app/css/tokens.css`, `app/js/ui/r42j-bundle.js`, `app/css/components.css`

**Produces:** `rj-breadcrumb`, `rj-searchbar`, `rj-savestate`, `rj-editbar`, `rj-accordion__chevron`, Dropdown-Option mit Icon, neue Checkbox, Icons `arrow-left`, `filter`, `save`, `image`, Token `size-content-wide` (1560px), Logo mit Unterzeile.

- [ ] Artifact-Bundle mit `app/` abgleichen und Bausteine ergänzen, dann veröffentlichen
- [ ] CSS, Icons und Logo nach `app/` übernehmen, Breakpoint 1800 px ergänzen
- [ ] `node tests/statisch.mjs` grün, Commit

### Task 2: Rahmen

**Files:** Create `app/js/ui/Breadcrumb.js`, `app/js/ui/SaveState.js`, `app/js/ui/SearchBar.js`, `app/js/core/brotkrumen.js`. Modify `AppShell.js`, `main.js`, `core/tresor.js`, `index.html`, Module mit Zurück-Knopf.

**Produces:** `K.brotkrumen(route) -> [{ text, ziel? }]`; `K.speicherStand` (beobachtbar: `leerlauf|speichert|gespeichert|fehler`); `K.verlassenSchutz.setzen(fn|null)`, Navigation fragt vorher nach.

- [ ] Test `tests/feinschliff.mjs`: Breadcrumb je Route, Strg+K und `/`, `/` im Feld schreibt, Topbar-Symbole rechts
- [ ] Umsetzung, alle Zurück-Knöpfe aus dem Pagehead entfernen
- [ ] Tests grün, Commit

### Task 3: Formular-Rahmen

**Files:** Create `app/js/ui/BearbeitenForm.js`. Modify `stammdaten-persoenlich.js`, `bewerbung-stelle.js`, `bewerbung-details.js`, Tests `m2`, `m4`.

**Produces:** `UI.useEntwurf(lesen, schreiben) -> { entwurf, setze, bearbeiten, starten, speichern, abbrechen, geaendert }`, `UI.BearbeitenLeiste`.

- [ ] Test: ausgefülltes Formular ist gesperrt, Bearbeiten → Speichern schreibt mit Toast, Abbrechen verwirft, Verlassen fragt nach, Sperre verwirft
- [ ] Umsetzung, Tests grün, Commit

### Task 4: Stelle und Anschreiben

**Files:** `bewerbung-stelle.js`, `bewerbung-anschreiben.js`, `tests/m4.mjs`.

- [ ] Stelle: KI-Button oben, Dialog `breit`
- [ ] Anschreiben: Schritte Rahmen, Inhalt, Unterschrift, Prüfen mit `UI.Stepper`, KI-Buttons oben
- [ ] Tests grün, Commit

### Task 5: DIN 5008

**Files:** `app/templates/anschreiben.js`, `app/templates/cv.js`, `core/anschreiben.js`, `tests/m3.mjs`, `tests/m4.mjs`, `tests/pdf-pruefen.py`.

- [ ] Test: Anschreiben links 25 mm (71 pt), rechts 20 mm (57 pt), Anschrift ab 45 mm, eine Seite
- [ ] Umsetzung, Lebenslauf-Ränder und Formate, Tests grün, Commit

### Task 6: Kleine Modulpunkte

**Files:** `ui/Dropdown.js`, `ui/Select.js`, `bewerbung-details.js`, `uebersicht.js`, `stammdaten.js`, `stammdaten-liste.js`, `vergleich.js`, `vergleich-angebot.js`, `core/vergleich.js`, `ui/ComparisonTable.js`.

**Produces:** Option `{ wert, label, icon? }`; `K.vergleich.teilpunkte(eintraege, kriterien, feiertagsWochen) -> { [kriterium]: [zahl|null] }`.

- [ ] Test: Filter mit Icon, Kompetenzfilter, Punkte beim Ausfüllen
- [ ] Umsetzung, Tests grün, Commit

### Task 7: Anlagen-Vorschläge

**Files:** Create `app/js/core/anlagen-vorschlag.js`. Modify `modules/anlagen.js`, ggf. `app/lib/`, `tests/lib-ausnahmen.json`.

**Produces:** `K.anlagen.vorschlag(dateiname, text?) -> { kategorie, datum?, stichwoerter }`.

- [ ] Vorabtest: pdf.js unter `file://`, CSP und Eval-Scan. Scheitert er, entfällt `text`
- [ ] Test mit Dateinamen wie `Arbeitszeugnis_Muster_2024.pdf`
- [ ] Umsetzung, Tests grün, Commit

### Task 8: KI-Kataloge

**Files:** `vorbereitung-kataloge.js`, `core/fragen.js`, `core/ki.js`-Prompts, i18n.

**Produces:** `K.fragen.speichern(katalogObjekt)`.

- [ ] Test: ungültiges JSON meldet Klartext, gültiges landet in `daten/fragen/`, Prompt ohne Profildaten
- [ ] Umsetzung, Tests grün, Commit

### Task 9: Wissen

**Files:** `core/wissen.js`, `modules/wissen.js`, `app/wissen-default/*`, `app/img/wissen/*.svg`, `tests/m8.mjs`.

**Produces:** `K.wissen.speichern(artikel)`, Frontmatter `sources`.

- [ ] Recherche: echte Quellen je Artikel prüfen
- [ ] Mitgelieferte Artikel aus `app/` lesen, Altkopien ausblenden, Editor, Quellen, SVGs
- [ ] Tests grün, Commit

### Task 10: Abschluss

- [ ] SPEC, PLAN, LIESMICH, CLAUDE.md anpassen
- [ ] Alle Tests, Browser-Testlauf in Edge bei 1920 × 1080 und schmal
- [ ] Impeccable-Prüfung, Funde beheben
- [ ] PR öffnen
