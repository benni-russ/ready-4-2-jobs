# Feedback-Feinschliff: Design

Stand: 31.10.2026. Umsetzung der Rückmeldungen aus dem Testlauf in einem Branch und einem PR. `SPEC.md` bleibt maßgeblich und wird im selben PR angepasst.

## Ziel

Das Tool soll für nicht-technische Nutzer klarer werden: verständlicher Name, gute Nutzung breiter Bildschirme, Navigation mit Orientierung, sichtbares Speichern. Dazu kommen fachliche Ergänzungen in Bewerbungen, Stammdaten, Anlagen, Vergleich, Vorbereitung und Wissen.

## Reihenfolge

Von unten nach oben: Bausteine im Design-System, gemeinsame Grundlagen, Module, Abschluss. Neue UI-Elemente entstehen zuerst im Design-System-Artifact.

## 1. Design-System und Rahmen

- Neue Bausteine: Breadcrumb, Suchleiste mit Tastenhinweis, Speicheranzeige, Bearbeiten-Leiste, Aufklappmenü mit Pfeil, Dropdown mit Icons, modernere Checkbox.
- Neue Icons aus Lucide: `arrow-left`, `filter`, `save`, `image`.
- Logo: R42J mit der Unterzeile „Ready 4 2 Jobs“. Der lange Name steht auch im Fenstertitel und in der Anleitung. Technische Namen (`tresor.r42j`, Format, Repo, `window.R42J*`) bleiben.
- Breite: Alle bisherigen Breakpoints bleiben unverändert. Neu ist nur ein Breakpoint für 1920 × 1080: Inhalt breiter, Lesetexte bleiben bei `size-prose`, große Dialoge und die PDF-Vorschau nutzen das Fenster aus.
- Topbar: Darstellung und Einstellungen stehen ganz rechts.
- Suche: Feste Suchleiste statt Overlay, erreichbar über Strg/Cmd+K und `/`. `/` greift nicht, solange der Fokus in einem Eingabefeld liegt. Beide Kürzel sind in der Leiste zu sehen.
- Breadcrumbs: Zentral aus der Route erzeugt, ersetzen alle Zurück-Knöpfe im Pagehead. Zurück-Schritte innerhalb eines KI-Ablaufs bleiben.

## 2. Speichern

- Formular-Rahmen für Stammdaten > Persönlich, Stelle und Details. Leere Formulare sind direkt bearbeitbar, ausgefüllte starten als Leseansicht mit „Bearbeiten“, danach „Speichern“ und „Abbrechen“.
- Der Rahmen arbeitet auf einem Entwurf und schreibt erst beim Speichern in den Tresor, mit Toast.
- Ungespeicherte Änderungen lösen beim Verlassen eine Rückfrage aus, bei Breadcrumbs, Seitenleiste und Browser-Zurück.
- Sperrt sich die App (automatisch oder von Hand), während ein Entwurf offen ist, wird er vorher verschlüsselt im Tresor gespeichert. So geht nichts verloren und nichts landet im Klartext.
- Arbeitsflächen (Anschreiben-Text, Notizen, Checklisten, Gewichte) speichern weiter automatisch nach 2 Sekunden. Die Topbar zeigt zentral „Wird gespeichert …“ und „Gespeichert“.
- Listen mit Dialog behalten ihren Ablauf.

## 3. Bewerbungen

- Stelle: „Mit KI auswerten“ ist ein Button oben und öffnet den Ablauf im großen Dialog. Die Reiter-Routen bleiben.
- Anschreiben: Schritte Rahmen → Inhalt → Unterschrift → Prüfen, rechts die PDF-Vorschau, oben die KI-Buttons.
- DIN 5008: Das Anschreiben folgt Form B (Ränder links 25 mm, rechts 20 mm, Anschriftfeld ab 45 mm, Datum und Betreff wie in der Norm). Die Norm regelt Geschäftsbriefe, nicht Lebensläufe. Der Lebenslauf übernimmt Ränder sowie Datums- und Telefonformate, die ATS-Regeln aus SPEC §6.5 bleiben unverändert.

## 4. Module

- Übersicht: Status-Filter mit Icons.
- Kompetenzen: Filter nach Kategorie.
- Anlagen: Nach dem Hochladen schlägt die App Kategorie, Datum und Stichwörter vor, die Nutzer bestätigen oder ändern. Quelle ist der Dateiname. PDF-Text kommt nur dazu, wenn pdf.js ohne Eval und unter `file://` läuft; das klärt ein Vorabtest.
- Vergleich: Punkte je Kriterium erscheinen beim Ausfüllen des Angebots. Sicherheit und Bauchgefühl bleiben Handarbeit und starten bei 5. Tabellenzeilen wechseln leicht in der Helligkeit.
- Kataloge: KI-Ablauf wie bei den Unternehmensfragen, geprüft mit `K.fragen.pruefen`. Der Prompt enthält keine Profildaten, weil Kataloge unverschlüsselt liegen.

## 5. Wissen

- Eigene Artikel: Markdown-Editor mit Vorschau, Ablage in `daten/wissen/`. Der Editor weist darauf hin, dass die Artikel unverschlüsselt liegen.
- Quellen: Frontmatter-Feld `sources`, angezeigt als Liste am Artikelende. Nur echte, geprüfte Quellen; Links öffnen als vom Nutzer geklickte HTTPS-Links.
- Skizzen: Mitgelieferte Artikel binden lokale SVGs aus `app/` ein. Bilder in eigenen Artikeln bleiben gesperrt.
- Mitgelieferte Artikel werden künftig direkt aus `app/` gelesen, damit Updates bei Bestandsnutzern ankommen. `daten/wissen/` enthält nur eigene Artikel.

## Fehlerfälle

- Speichern schlägt fehl: Formular bleibt im Bearbeiten-Modus, Entwurf bleibt erhalten, Meldung in Klartext.
- PDF lässt sich nicht lesen: Vorschläge kommen nur aus dem Dateiname, kein Fehler.
- KI-Katalog ungültig: Klartext-Meldung aus `K.fragen.pruefen`, nichts wird geschrieben.

## Tests

Bestehende Tests werden mitgezogen. Neue Prüfungen: Bearbeiten-Schutz und Rückfrage beim Verlassen, Breadcrumbs, Tastenkürzel, Filter, Vorschläge, KI-Katalog, eigene Wissensartikel, DIN-Maße im Anschreiben-PDF, 1920 × 1080. Danach Browser-Testlauf in Edge und Impeccable-Prüfung. macOS bleibt ungeprüft.
