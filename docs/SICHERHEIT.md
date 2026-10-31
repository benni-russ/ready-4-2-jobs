# Sicherheitsreview

Stand: M9. Alle Punkte prüft `tests/sicherheit.mjs` im Browser, soweit nicht anders vermerkt.

## Geprüft

- **CSP:** Standard und Skripte nur aus eigenen Dateien, Netz nur zur GitHub-API, Formulare, Plugins und `base` gesperrt. `eval`, `new Function` und fremde Skripte werden im Browser tatsächlich blockiert.
- **Klartext:** Ein Marker in den Profildaten taucht weder in Tresor und Anlagen noch im `localStorage`, in Cookies oder in der Adresse auf.
- **`daten/export/`:** ist nach dem Sperren und nach einem Neustart leer. Reste aus einem Absturz räumt der nächste Start weg.
- **Sperre:** Der Schlüssel liegt danach nicht mehr im Speicher, die Seite zeigt keine Daten mehr.
- **Konsole und Netz:** Keine persönlichen Daten und kein Passwort in der Konsole, ohne Einwilligung keine Netzanfrage (`tests/m9.mjs` belegt das auch für die Update-Prüfung).
- **Update-Antwort:** Nur `tag_name` wird gelesen und streng geprüft. Links aus der Antwort werden nicht übernommen.

## Grenzen

- `style-src` erlaubt `unsafe-inline`, weil Preact Stile am Element setzt. Skripte sind davon nicht betroffen.
- Die CSP steht als Meta-Tag. `frame-ancestors` wirkt dort nicht, über `file://` bettet aber niemand die App ein.
- Der Schutz endet am entsperrten Tresor: Wer den entsperrten Rechner bedient, sieht die Daten. Dafür gibt es die automatische Sperre.
- Dateien, die Nutzer aus der App speichern, liegen danach unverschlüsselt am gewählten Ort.
- Das Betriebssystem kann Inhalte aus dem Arbeitsspeicher auslagern. JavaScript kann das nicht verhindern.

Das ist eine Selbstprüfung, keine externe Prüfung.
