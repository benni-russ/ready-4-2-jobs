# ADR-001: Preact und htm als UI-Grundlage

**Stand:** angenommen, 30.10.2026

## Kontext

R42J läuft ohne Build-Schritt über `file://` in Chrome und Edge. ES-Module und `fetch()` auf lokale Dateien stehen dort nicht zur Verfügung, die CSP erlaubt kein `unsafe-eval`. Die Oberfläche hat viele Formulare, Listen und einen gemeinsamen Zustand, also mehr, als sich mit direktem DOM-Code sauber pflegen lässt.

## Entscheidung

Preact, Preact Hooks und htm, alle als UMD-Dateien in `app/lib/`. Templates entstehen mit `htm` statt JSX.

## Gründe

- **Umfang und Zustand:** Komponenten und Hooks tragen die Oberfläche, ein zentraler Store reicht für den Zustand.
- **CSP:** htm parst Templates ohne `eval`.
- **Komponenten:** Das Markup der Design-System-Vorschauen lässt sich fast 1:1 übernehmen, `class` funktioniert mit htm.
- **Größe:** Preact, Hooks und htm zusammen sind unter 20 kB groß.

## Versionen

Preact bleibt vorerst bei 10.x (10.29.8). Version 11.0.1 erschien erst am 08.10.2026; ein Wechsel lohnt sich erst, wenn die App davon etwas braucht.

## Geprüft unter `file://` mit der CSP aus SPEC §2

Getestet am 30.10.2026 in Edge 156 und Chrome 156, jeweils ohne Konsolenfehler oder CSP-Verstöße:

- `script-src 'self'` greift für Dateien unter `file://`, die Seite gilt als sicherer Kontext.
- `showDirectoryPicker` und Web Crypto sind vorhanden.
- Alle Bibliotheken aus SPEC §2 laden und arbeiten.
- pdfmake erzeugt ein PDF und bettet IBM Plex Sans aus Base64-Daten ein, ganz ohne `fetch()`.

## Bekannte Einschränkung

`pdfmake.min.js` enthält Polyfill-Code mit `Function(...)`. Dieser Code läuft in Chrome und Edge nicht, weil sie `globalThis` und `Function.prototype.bind` nativ haben. Die CSP würde einen Aufruf ohnehin blockieren. Die SPEC-Regel „kein `eval`/`new Function`“ gilt damit zur Laufzeit, nicht für jede Zeile der Bibliothek.
