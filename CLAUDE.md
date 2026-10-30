# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stand

R42J („Ready 4 2 Jobs“) ist ein lokales, verschlüsseltes Bewerbungs-Tool für nicht-technische Nutzer. Es läuft ohne Installation vom USB-Stick in Chromium-Browsern unter Windows und macOS. Lizenz: GPL-3.0.

M0 bis M8 stehen: Grundgerüst, Tresor, Profile, Onboarding, Stammdaten, Anlagen, Suche, Lebenslauf-PDF, Stelle, Anschreiben, Anlagen-PDF, Versand, Übersicht, Erinnerungen, Termine, Angebotsvergleich, Vorbereitung, Checklisten, Wissen und Statistik. Es folgt M9 mit Feinschliff und Release. Das öffentliche Repo ist `benni-russ/ready-4-2-jobs`.

- `SPEC.md`: fachliche und technische Spezifikation, maßgeblich für Datenmodell, Formate und Modulverhalten.
- `PLAN.md`: Meilensteine M0–M9 mit Akzeptanzkriterien. Der MVP (v0.1) umfasst M0–M5. Meilensteine der Reihe nach abarbeiten; jeder endet lauffähig und mit erfüllten Akzeptanzkriterien.

Der Stand der Checkboxen in `PLAN.md` zeigt, wo die Arbeit steht. Vor der Arbeit an einem Modul den zugehörigen SPEC-Abschnitt lesen. Offene Entscheidungen stehen in SPEC §8.

## Befehle

Es gibt bewusst keinen Build, kein npm und keine Paketverwaltung. Die App startet per Doppelklick auf `app/index.html` (später über `Start (Windows).cmd`, `Start (Mac).command` oder `Start.html`). `node tools/tokens-css.mjs` erzeugt `app/css/tokens.css` aus `tools/tokens.json` neu, `node tools/pdf-schrift.mjs` packt die Schriften aus `tools/schrift/` nach `app/fonts/pdf-schrift.js`; das ist nur für Entwickler nötig, die App selbst braucht kein Node. Die App selbst hat keine Abhängigkeiten. Automatische Tests liegen in `tests/` und laufen über `.github/workflows/test.yml` bei jedem PR: `node tests/statisch.mjs` braucht nur Node. Die Browsertests `node tests/m1.mjs` bis `m5.mjs [msedge|chrome]` brauchen `R42J_PLAYWRIGHT` (Ordner außerhalb des Repos, in dem `npm install --no-save --prefix <ordner> playwright-core` lief) und Python mit `pypdf`. Zusätzlich gelten die Akzeptanzkriterien aus `PLAN.md`, nach jedem Meilenstein manuell in Edge unter Windows und in Chrome unter macOS vom USB-Stick. Vor jedem Release ist zusätzlich ein Testlauf im Browser Pflicht: den fertigen Stand starten und die Kernabläufe durchspielen. Ohne bestandenen Testlauf gibt es kein Release.

## Git und GitHub

Das Repo ist öffentlich. Alles, was committet wird, gilt als veröffentlicht.

- Nie direkt auf `main` committen oder pushen. Jede Änderung kommt über einen Branch und einen PR, der gemergt wird.
- So wenige PRs wie möglich: Zusammengehörige Arbeit sammelt sich auf einem Branch, in der Regel ein PR pro Meilenstein. Kleine Änderungen gehen in den offenen PR, nicht in einen neuen.
- Commits tragen nur die GitHub-No-Reply-Adresse. Vor dem ersten Commit in einem neuen Klon prüfen: `git config user.email` muss auf `@users.noreply.github.com` enden. Die private E-Mail-Adresse darf weder in Commits noch in Dateien, PRs oder Issues auftauchen.
- Keine IDs, API-Keys, Passwörter, Tokens, privaten Links oder andere sicherheitsrelevanten Angaben in Code, Doku, Testdaten, Commits oder PRs. Beispiel- und Testdaten sind frei erfunden.

## Harte Randbedingungen

Die App muss über `file://` laufen. Daraus folgt:

- Keine ES-Module und kein `fetch()` auf lokale Dateien. Code wird über klassische `<script src>`-Tags geladen und teilt sich Globals, die Reihenfolge in `index.html` zählt also.
- Bibliotheken liegen als Dateien in `app/lib/`, mit Lizenzen in `app/lib/LICENSES/`. Nichts installieren, keine CDN.
- Kein `eval` oder `new Function`, auch nicht in Bibliotheken. Die CSP aus SPEC §2 steht als Meta-Tag in `index.html` und erlaubt kein `unsafe-eval`.
- Nutzerdateien nur über die File System Access API. Der Zugriff ist in `core/fs.js` gekapselt, damit ein Wechsel der Technik nur dieses Modul betrifft.
- Netzwerkzugriffe nur für die Opt-in-Update-Prüfung (GitHub API) und vom Nutzer geklickte HTTPS-Links. Keine Telemetrie.

## Architektur

**Trennung `app/` und `daten/`:** `app/` wird bei Updates komplett ersetzt, `daten/` nie. Code schreibt niemals nach `app/`. Die Ordnerstruktur steht in SPEC §3.

**UI:** Preact, Preact Hooks und htm als UMD-Dateien (`window.preact`, `window.preactHooks`, `window.htm`), Templates mit `htm` statt JSX. Je Komponente eine Datei unter `app/js/ui/`, registriert an `window.R42J_UI`. Der Zustand läuft über Hooks und den zentralen Store `app/js/core/store.js`; der Hash-Router (`#/bewerbungen/…`) erhält Zurück-Taste und Lesezeichen.

**Design-System „R42J“:** Oberflächen entstehen nur aus seinen Tokens und `rj-`-Komponenten. Die Quelle ist das Design-System-Artifact auf claude.ai, sein Link steht bewusst nicht im Repo. Was dort noch fehlt, wird zuerst im Artifact ergänzt (Tokens, Komponente mit README und Vorschau) und dann nach `app/` übernommen; UI-Elemente entstehen nie nur in der App. Aus dem Bundle `window.R42J` werden nur `icon()`, `status()`, `logo()`, `parseDate`/`formatDate` und `setTheme`/`setScheme`/`setFontSize` genutzt. `R42J.hydrate()` ist tabu, weil es das DOM an Preact vorbei verändert; DatePicker, Dropdown, Datentabelle und Seitenleiste sind deshalb Preact-Komponenten mit gleichem Markup, CSS und Verhalten.

**Tresor (SPEC §4):** Envelope-Verschlüsselung mit Web Crypto. Ein zufälliger Datenschlüssel (DEK) pro Profil wird doppelt verpackt: mit dem Passwort-Schlüssel (PBKDF2) und mit dem Wiederherstellungsschlüssel. Ein Passwortwechsel verpackt nur den DEK neu. Der gesamte Inhalt liegt in `tresor.r42j`, Anlagen sind einzeln als `anlagen/<uuid>.enc` verschlüsselt, ihre Metadaten stehen im Tresor. Schreiben ist immer atomar (erst `*.tmp`, dann ersetzen). Die Sperre entfernt den DEK aus dem Speicher.

**Klartext auf dem Stick:** Nur `daten/profile.json`, `daten/wissen/`, `daten/fragen/` und vorübergehend `daten/export/`. Der Export-Ordner wird beim Start und beim Sperren geleert. Persönliche Daten dürfen nirgends sonst unverschlüsselt landen, auch nicht in Logs oder der Konsole.

**Fragenkataloge:** Eigene Kataloge in `daten/fragen/` sind reines JSON, werden über das Ordner-Handle gelesen und nie ausgeführt. Sie bleiben unverschlüsselt und enthalten deshalb keine personenbezogenen Daten. Alles mit Personenbezug (Unternehmensfragen zu einer Bewerbung, Lernstand, STAR-Training) liegt im Tresor. Mitgelieferte Kataloge sind `.js`-Dateien mit denselben JSON-Daten, weil `file://` kein `fetch()` erlaubt.

**Schema-Änderungen:** `schema` im Tresor hochzählen und eine Migration in `app/js/core/migrations.js` ergänzen. Migrationen laufen vor dem Laden, vorher wird ein Backup erstellt.

**Dokumente:** pdfmake erzeugt Text-PDFs, pdf-lib fügt zusammen und komprimiert. Für den Lebenslauf gibt es genau eine Vorlage (`templates/cv.js`), die den ATS-Regeln aus SPEC §6.5 folgt: einspaltig, echter Text, Lesereihenfolge gleich visueller Reihenfolge. Die Prüfung erfolgt über den ATS-Test aus M3. Erzeugte PDFs werden als verschlüsselte Anlagen im Tresor abgelegt und in `Bewerbung.dokumente` referenziert (`Snapshot`).

**KI ohne API:** Jeder KI-Workflow läuft als Prompt kopieren → externer Chat → Antwort einfügen → validieren → Vorschau → übernehmen. Persönliche Daten werden standardmäßig durch Platzhalter wie `{{VORNAME}}` ersetzt (SPEC §4.6, §6.3). Die App ruft selbst keine KI auf.

## Konventionen

- Alle UI-Texte stehen in `app/i18n/de.js` und `en.js` (`window.R42J_I18N`), immer beide pflegen. Keine harten Strings im Markup.
- Die Oberfläche duzt. Die Anrede in Bewerbungstexten (Sie/Du) wird pro Bewerbung gewählt.
- Bezeichner im Datenmodell sind deutsch (`bewerbungen`, `ausrichtungId`, `versendetAm`), Felder wie in SPEC §5.
- WCAG 2.2 AA: alles per Tastatur bedienbar, sichtbarer Fokus, Klickflächen ≥ 44 × 44 px, Status nie nur über Farbe, `prefers-reduced-motion` beachten. Weitere Anforderungen in SPEC §7.
- Listen-Tabellen sind durchsuchbar (umlaut-tolerant) und nach jeder Spalte sortierbar.
- Fehlermeldungen in Klartext mit Lösung, keine unerklärten Fachbegriffe. Die Zielgruppe ist nicht technisch.
