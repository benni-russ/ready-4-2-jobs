# Rechenbeispiele Vergleich

Grundlage für die Akzeptanz von M6 (SPEC §6.10). `tests/m6.mjs` liest den JSON-Block unten, rechnet jedes Beispiel mit eigenen Formeln nach und vergleicht beides mit `K.vergleich`. Alle Firmen und Zahlen sind erfunden.

Formeln:

- Arbeitswochen/Jahr = 52 − Urlaubstage/5 − Feiertagspauschale (Standard 2)
- Pendelstunden/Woche = 2 × Pendelminuten × Präsenztage / 60
- Effektiver Stundenlohn = (Brutto + Bonus − Pendelkosten/Jahr) ÷ (Arbeitswochen × (Wochenstunden + Pendelstunden))

## Drei Angebote

| | A: Nordlicht | B: Sonnenhof | C: Waldblick |
|---|---:|---:|---:|
| Brutto | 52.000 € | 58.000 € | 48.000 € |
| Bonus | 3.000 € | – | 1.000 € |
| Urlaubstage | 30 | 25 | 28 |
| Wochenstunden | 40 | 40 | 38 |
| Homeoffice-Tage | 2 | 0 | 4 |
| Präsenztage | 3 | 5 | 1 |
| Fahrzeit einfach | 30 Min. | 60 Min. | 15 Min. |
| Pendelkosten/Monat | 50 € | 200 € | – |
| Sicherheit (manuell) | 8 | 10 | 6 |
| Bauchgefühl (manuell) | 7 | 4 | 9 |

Rechnung:

| | A | B | C |
|---|---:|---:|---:|
| Arbeitswochen | 52 − 6 − 2 = 44 | 52 − 5 − 2 = 45 | 52 − 5,6 − 2 = 44,4 |
| Pendelstunden | 2 × 30 × 3 / 60 = 3 | 2 × 60 × 5 / 60 = 10 | 2 × 15 × 1 / 60 = 0,5 |
| Stundenlohn | 54.400 ÷ 1.892 = 28,75 € | 55.600 ÷ 2.250 = 24,71 € | 49.000 ÷ 1.709,4 = 28,67 € |

## Punktwertung

Standardgewichte: Gehalt 4, Stundenlohn 4, Fahrtweg 3, Homeoffice 2, Urlaub 2, Boni 1, Sicherheit 3, Bauchgefühl 3, zusammen 22.

| Kriterium | A | B | C |
|---|---:|---:|---:|
| Gehalt | 4,0 | 10,0 | 0,0 |
| Stundenlohn | 10,0 | 0,0 | 9,8 |
| Fahrtweg (Pendelstunden, weniger ist besser) | 7,4 | 0,0 | 10,0 |
| Homeoffice | 5,0 | 0,0 | 10,0 |
| Urlaub | 10,0 | 0,0 | 6,0 |
| Boni | 10,0 | 0,0 | 3,3 |
| Sicherheit | 8 | 10 | 6 |
| Bauchgefühl | 7 | 4 | 9 |
| **Punkte** | **7,4** | **3,7** | **6,8** |

Rangfolge: A, C, B. Steht nur noch Gehalt mit Gewicht 5 und alles andere auf 0, lautet sie B (10,0), A (4,0), C (0,0).

## Grenzfälle

| Fall | Erwartung |
|---|---|
| Alle Werte gleich (Min = Max) | Keine Division durch 0, alle bekommen 5 |
| Nur ein Angebot hat einen Wert | Dieses bekommt 5, die übrigen entfallen |
| Fahrzeit fehlt | Stundenlohn „Nicht berechenbar“; Stundenlohn und Fahrtweg entfallen für dieses Angebot und werden in der Rangliste genannt |
| Bonus oder Pendelkosten fehlen | Zählen als 0 |
| 0 Wochenstunden und 0 Präsenztage | Teiler 0, kein Stundenlohn |
| Urlaub ab 250 Tagen | Keine Arbeitswochen übrig, kein Stundenlohn |
| Pendelkosten höher als das Einkommen | Negativer Stundenlohn wird korrekt ausgewiesen |
| Alle Gewichte 0 | Keine Wertung und kein Platz, Hinweis in der Oberfläche |
| Zwei Angebote mit gleichen Punkten | Gleicher Platz, der nächste Platz wird übersprungen |
| Manuelles Kriterium unbewertet | Zählt als 5, wie der Schieberegler zeigt |

## Daten für den Test

```json
{
  "feiertagsWochen": 2,
  "angebote": {
    "A": { "bruttoJahr": 52000, "bonusJahr": 3000, "urlaubstage": 30, "wochenstunden": 40, "homeofficeTage": 2, "praesenzTage": 3, "pendelMinutenEinfach": 30, "pendelKostenMonat": 50, "bewertungen": { "sicherheit": 8, "bauchgefuehl": 7 } },
    "B": { "bruttoJahr": 58000, "urlaubstage": 25, "wochenstunden": 40, "homeofficeTage": 0, "praesenzTage": 5, "pendelMinutenEinfach": 60, "pendelKostenMonat": 200, "bewertungen": { "sicherheit": 10, "bauchgefuehl": 4 } },
    "C": { "bruttoJahr": 48000, "bonusJahr": 1000, "urlaubstage": 28, "wochenstunden": 38, "homeofficeTage": 4, "praesenzTage": 1, "pendelMinutenEinfach": 15, "bewertungen": { "sicherheit": 6, "bauchgefuehl": 9 } }
  },
  "erwartet": {
    "A": { "wochen": 44, "pendel": 3, "lohn": "28,75", "punkte": "7,4" },
    "B": { "wochen": 45, "pendel": 10, "lohn": "24,71", "punkte": "3,7" },
    "C": { "wochen": 44.4, "pendel": 0.5, "lohn": "28,67", "punkte": "6,8" }
  },
  "rangfolge": ["A", "C", "B"],
  "rangfolgeNurGehalt": ["B", "A", "C"]
}
```
