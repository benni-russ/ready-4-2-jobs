// Mitgelieferte Wissensartikel. Sie liegen als .js vor, weil file:// kein fetch() erlaubt,
// und werden direkt von hier gelesen. Eigene Artikel liegen in daten/wissen/.
(function () {
  "use strict";
  var liste = (window.R42J_WISSEN = window.R42J_WISSEN || []);

  // Quellen und Skizze je Artikel. Die Quellen wurden abgerufen und geprüft.
  var ZUSATZ = {
    "foto-ja-nein": {
      "sources": "Bundesagentur für Arbeit: Bewerbungskompass für Arbeitsstellen (Foto freiwillig, aber üblich) | https://www.arbeitsagentur.de/vor-ort/datei/353-bewerbungskompass-arbeitsstellen-_ba095207.pdf ;; Bundesagentur für Arbeit: Bewerbung schreiben | https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bewerbungstraining/bewerbung-schreiben ;; Antidiskriminierungsstelle des Bundes: FAQ zu anonymisierten Bewerbungsverfahren | https://www.antidiskriminierungsstelle.gov.de/SharedDocs/downloads/DE/projekte/faqs_anonymisierte_bewerbungsverfahren.pdf?__blob=publicationFile&v=1",
      "image": "foto-ja-nein",
      "imageAlt": "Gegenüberstellung, wann ein Foto hilft und wann du es besser weglässt"
    },
    "ats-erklaert": {
      "sources": "Bundesagentur für Arbeit: Bewerbungskompass für Arbeitsstellen (Abschnitt ATS-Scanner) | https://www.arbeitsagentur.de/vor-ort/datei/353-bewerbungskompass-arbeitsstellen-_ba095207.pdf ;; Roche Karriere: FAQ zum Auslesen von Lebensläufen | https://careers.roche.com/de/de/resume-parsing-faq",
      "image": "ats-erklaert",
      "imageAlt": "Ablauf: Bewerbung hochladen, Software liest den Text, Kompetenzen werden gefunden, Menschen entscheiden"
    },
    "star-methode": {
      "sources": "MIT Career Advising: Leitfaden zum Vorstellungsgespräch mit STAR (englisch) | https://capd.mit.edu/resources/career-toolkit-interviewing/ ;; University of Washington Career Center: Die STAR-Methode (englisch) | https://careers.uw.edu/resources/star-method-of-interviewing/",
      "image": "star-methode",
      "imageAlt": "Vier Schritte: Situation, Aufgabe, Aktion und Ergebnis"
    },
    "anschreiben-aufbau": {
      "sources": "Bundesagentur für Arbeit: Das perfekte Anschreiben erstellen | https://www.arbeitsagentur.de/bildung/bewerbung/anschreiben ;; Bundesagentur für Arbeit: Bewerbung schreiben | https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bewerbungstraining/bewerbung-schreiben ;; DIN Media: Themenseite DIN 5008 | https://www.dinmedia.de/de/themenseiten/din-5008",
      "image": "anschreiben-aufbau",
      "imageAlt": "Seite mit Absender, Betreff, Einstieg, Hauptteil, Schluss und Unterschrift"
    },
    "gehaltsverhandlung": {
      "sources": "Bundesagentur für Arbeit: Entgeltatlas | https://web.arbeitsagentur.de/entgeltatlas/ ;; FH Münster Career & Talent Service: Manual Gehaltsverhandlung | https://www-backend.fh-muenster.de/career-service/downloads-Career-Service/25-11-Manual_Gehalt-verhandeln.pdf ;; IHK Hannover: Entgeltatlas zeigt regionale Gehaltsstruktur | https://www.ihk.de/hannover/hauptnavigation/standort/konjunktur-statistik/aktuell/entgeltatlas-zeigt-regionale-gehaltsstruktur-6642998",
      "image": "gehaltsverhandlung",
      "imageAlt": "Spanne aus Untergrenze, Ziel und Wunsch"
    },
    "kuendigungsfristen": {
      "sources": "Gesetze im Internet: § 622 BGB, Kündigungsfristen | https://www.gesetze-im-internet.de/bgb/__622.html ;; Gesetze im Internet: § 623 BGB, Schriftform der Kündigung | https://www.gesetze-im-internet.de/bgb/__623.html ;; BMAS: Broschüre Kündigungsschutz | https://www.bmas.de/DE/Service/Publikationen/Broschueren/A163-kuendigungsschutz.html",
      "image": "kuendigungsfristen",
      "imageAlt": "Treppe: Nach 2, 5, 8, 10, 12, 15 und 20 Jahren steigt die Frist auf 1 bis 7 Monate"
    },
    "arbeitsvertrag-pruefen": {
      "sources": "BMAS: Broschüre Arbeitsrecht | https://www.bmas.de/DE/Service/Publikationen/Broschueren/a711-arbeitsrecht.html ;; IHK Karlsruhe: Einstellung von Arbeitnehmern | https://www.ihk.de/karlsruhe/fachthemen/recht/arbeitsrecht/mitarbeiter-einstellen-und-kuendigen/einstellung-von-arbeitnehmern-2459246 ;; Gesetze im Internet: § 74 HGB, Wettbewerbsverbot | https://www.gesetze-im-internet.de/hgb/__74.html",
      "image": "arbeitsvertrag-pruefen",
      "imageAlt": "Vertragsseite mit Tätigkeit, Gehalt, Arbeitszeit, Urlaub, Probezeit und Kündigungsfristen"
    },
    "vorstellungsgespraech": {
      "sources": "Bundesagentur für Arbeit: Das Vorstellungsgespräch | https://www.arbeitsagentur.de/bildung/bewerbung/bewerbungsgespraech ;; Bundesagentur für Arbeit: Bewerbungskompass für Arbeitsstellen | https://www.arbeitsagentur.de/vor-ort/datei/353-bewerbungskompass-arbeitsstellen-_ba095207.pdf ;; Antidiskriminierungsstelle des Bundes: Zugang zum Arbeitsleben, unzulässige Fragen | https://www.antidiskriminierungsstelle.gov.de/DE/ueber-diskriminierung/lebensbereiche/arbeitsleben/zugang-zum-arbeitsleben/zugang-zum-arbeitsleben-node.html",
      "image": "vorstellungsgespraech",
      "imageAlt": "Fünf Phasen: Ankommen, Vorstellen, Fragen, Rückfragen und Abschluss"
    },
    "linkedin-xing-profil": {
      "sources": "LinkedIn Hilfe: Ein gutes LinkedIn Profil erstellen | https://www.linkedin.com/help/linkedin/answer/a554351?lang=de ;; LinkedIn Hilfe: Offen für Jobangebote und Sichtbarkeit | https://www.linkedin.com/help/linkedin/answer/a507508?lang=de ;; Universität Hohenheim: Fünf Tipps für deine Karriere auf Xing und LinkedIn | https://mub.uni-hohenheim.de/fileadmin/einrichtungen/marketing1/Lehre/Xing_und_LinkedIn_Final_2021.pdf",
      "image": "linkedin-xing-profil",
      "imageAlt": "Profil mit Foto, Überschrift, Kurzprofil, Berufserfahrung und Kompetenzen"
    },
    "serioese-email": {
      "sources": "Universität Duisburg-Essen Career Service: Bewerbung per E-Mail | https://www.uni-due.de/imperia/md/content/abz/career/bewerbung_permail_barrierefrei.pdf ;; TU Darmstadt: Bewerbungen per Mail | https://www.owl.tu-darmstadt.de/media/owl/schreibtechniken_und__uebungen/Bewerbungen_per_Mail.pdf ;; BSI: Zwei-Faktor-Authentisierung | https://www.bsi.bund.de/DE/Themen/Verbraucherinnen-und-Verbraucher/Informationen-und-Empfehlungen/Cyber-Sicherheitsempfehlungen/Accountschutz/Zwei-Faktor-Authentisierung/zwei-faktor-authentisierung_node.html",
      "image": "serioese-email",
      "imageAlt": "Beispiele für seriöse und unpassende E-Mail-Adressen"
    },
    "probezeit": {
      "sources": "Gesetze im Internet: § 622 BGB, Kündigungsfristen | https://www.gesetze-im-internet.de/bgb/__622.html ;; Gesetze im Internet: § 1 KSchG, sozial ungerechtfertigte Kündigungen | https://www.gesetze-im-internet.de/kschg/__1.html ;; Gesetze im Internet: § 3 EntgFG, Entgeltfortzahlung im Krankheitsfall | https://www.gesetze-im-internet.de/entgfg/__3.html",
      "image": "probezeit",
      "imageAlt": "Zeitstrahl: Bis sechs Monate meist zwei Wochen Frist, danach längere Fristen"
    }
  };

  function zusatzZeilen(kennung) {
    var z = ZUSATZ[kennung];
    return z ? "sources: " + z.sources + "\nimage: " + z.image + "\nimage-alt: " + z.imageAlt + "\n" : "";
  }

  function artikel(kennung, titel, kategorie, text) {
    liste.push({
      datei: kennung + ".de.md",
      md: "---\ntitle: " + titel + "\ncategory: " + kategorie + "\nlang: de\n" + zusatzZeilen(kennung) + "---\n\n" + text.trim() + "\n",
    });
  }

  var BEWERBUNG = "Bewerbung";
  var RECHT = "Vertrag und Recht";
  var GESPRAECH = "Gespräch";
  var AUFTRITT = "Online-Auftritt";

  artikel("foto-ja-nein", "Foto ja oder nein?", BEWERBUNG, `
In Deutschland ist ein Bewerbungsfoto üblich, aber kein Gesetz schreibt es vor. Es ist freiwillig, und du darfst es weglassen.

## Wann ein Foto hilft

- bei kleinen und mittleren Unternehmen in Deutschland
- in Berufen mit viel Kundenkontakt
- wenn dein Foto professionell wirkt und aktuell ist

## Wann du es besser weglässt

- bei Bewerbungen im englischsprachigen Raum, vor allem in den USA und Großbritannien
- bei internationalen Konzernen, die um anonyme Unterlagen bitten
- wenn du nur ein Urlaubs- oder Automatenfoto hast

## Worauf du achtest

Nimm ein ruhiges Bild mit neutralem Hintergrund und passender Kleidung. Du schaust freundlich in die Kamera, Selfies und Ausschnitte aus Gruppenfotos wirken unpassend.

> R42J setzt das Foto bei deutschen Bewerbungen automatisch ein. Du kannst es pro Bewerbung abschalten.
`);

  artikel("ats-erklaert", "Was ist ein ATS?", BEWERBUNG, `
ATS steht für Applicant Tracking System, auf Deutsch Bewerbermanagement-System. Viele Unternehmen speichern Bewerbungen darin. Die Software liest deinen Lebenslauf aus und macht ihn durchsuchbar. Personalverantwortliche suchen dann zum Beispiel nach einer bestimmten Kompetenz.

## Was das für deinen Lebenslauf heißt

- **Einspaltig:** Spalten bringen die Lesereihenfolge durcheinander.
- **Echter Text:** Text in Bildern kann die Software nicht lesen.
- **Klare Überschriften:** „Berufserfahrung“ wird erkannt, ein Wortspiel nicht.
- **Begriffe aus der Anzeige:** Nenne Kompetenzen so, wie sie in der Stelle stehen, wenn sie auf dich zutreffen.
- **Keine Tabellen oder Textfelder** für wichtige Angaben.

## So prüfst du es selbst

Öffne die PDF, markiere alles und füge den Text in einen Editor ein. Steht er dort in der richtigen Reihenfolge, kann ihn auch die Software lesen.

> Die Lebenslauf-Vorlage von R42J folgt diesen Regeln.
`);

  artikel("star-methode", "Die STAR-Methode", GESPRAECH, `
Mit der STAR-Methode antwortest du im Gespräch auf Fragen wie „Erzählen Sie von einer schwierigen Situation“. Du erzählst ein echtes Beispiel in vier Schritten und bleibst dabei kurz und konkret.

## Die vier Schritte

| Schritt | Frage | Anteil |
| --- | --- | --- |
| Situation | Wo und wann war das? | kurz |
| Task (Aufgabe) | Was war dein Auftrag? | kurz |
| Action (Handlung) | Was hast du selbst getan? | der größte Teil |
| Result (Ergebnis) | Was kam dabei heraus? | kurz, möglichst mit Zahl |

## Ein Beispiel

- **Situation:** Im Kundenservice stapelten sich vor Weihnachten die Anfragen.
- **Aufgabe:** Ich sollte die Wartezeit senken.
- **Handlung:** Ich habe die häufigsten Fragen ausgewertet und Antwortvorlagen geschrieben.
- **Ergebnis:** Die Wartezeit sank in zwei Wochen von drei Tagen auf einen.

## Tipps

Sag „ich“ statt „wir“, denn es geht um deinen Beitrag. Bereite vier bis sechs Beispiele vor, die du für verschiedene Fragen nutzen kannst. Sprich sie laut, das Training unter „Vorbereitung“ hilft dir dabei.
`);

  artikel("anschreiben-aufbau", "So baust du ein Anschreiben auf", BEWERBUNG, `
Ein Anschreiben passt auf eine Seite. Es wiederholt nicht den Lebenslauf, sondern erklärt, warum du und diese Stelle zusammenpassen.

## Der Aufbau

1. **Einleitung:** Warum diese Stelle, warum dieses Unternehmen? Verzichte auf „hiermit bewerbe ich mich“.
2. **Motivation:** Was reizt dich an der Aufgabe?
3. **Abgleich:** Nimm zwei oder drei Anforderungen aus der Anzeige und belege sie mit Beispielen.
4. **Mehrwert:** Was bringst du mit, das andere vielleicht nicht haben?
5. **Rahmen:** Eintrittstermin und, wenn verlangt, Gehaltsvorstellung.
6. **Schluss:** Du freust dich auf ein Gespräch.

## Worauf du achtest

- Sprich eine Person mit Namen an, wenn du sie herausfinden kannst.
- Schreib in kurzen Sätzen und vermeide Floskeln wie „teamfähig und belastbar“ ohne Beleg.
- Prüfe den Firmennamen und die Stellenbezeichnung zweimal.
- Lass jemanden gegenlesen.
`);

  artikel("gehaltsverhandlung", "Gehalt verhandeln", GESPRAECH, `
Gehaltsverhandlungen sind normal. Wer freundlich und gut vorbereitet fragt, verliert dadurch in aller Regel kein Angebot.

## Vorbereitung

- **Markt prüfen:** Vergleiche Gehälter für Beruf und Region, etwa im Entgeltatlas der Bundesagentur für Arbeit.
- **Eigenen Wert belegen:** Sammle Erfolge mit Zahlen.
- **Spanne festlegen:** Lege Wunsch, Ziel und Untergrenze fest, bevor du ins Gespräch gehst.
- **Brutto im Jahr rechnen:** Unternehmen sprechen meist über das Jahresbrutto.

## Im Gespräch

Nenne eine konkrete Zahl oder eine enge Spanne und begründe sie mit deiner Erfahrung, nicht mit deinen Ausgaben. Halte eine kurze Pause aus, wenn du die Zahl genannt hast. Warte auf die Reaktion, bevor du sie relativierst.

## Mehr als das Grundgehalt

Vergleiche das ganze Paket: Bonus, Urlaubstage, Homeoffice, Fahrtkosten, betriebliche Altersvorsorge und Weiterbildung. Unter „Vergleich“ stellst du Angebote gegenüber.

Vereinbare das Ergebnis schriftlich im Vertrag. Mündliche Zusagen lassen sich später schwer belegen.
`);

  artikel("kuendigungsfristen", "Kündigungsfristen", RECHT, `
Dieser Artikel gibt einen Überblick für Arbeitsverhältnisse in Deutschland. Er ersetzt keine Rechtsberatung. Bei konkreten Fragen helfen Gewerkschaften, Fachanwältinnen und Fachanwälte für Arbeitsrecht.

## Die gesetzliche Grundregel

Nach § 622 BGB gilt: vier Wochen zum 15. oder zum Ende eines Kalendermonats. Das gilt für Beschäftigte unabhängig von der Dauer der Beschäftigung.

## Kündigung durch das Unternehmen

Die Frist wird mit der Dauer der Beschäftigung länger, jeweils zum Monatsende:

| Beschäftigt seit | Frist |
| --- | --- |
| 2 Jahren | 1 Monat |
| 5 Jahren | 2 Monate |
| 8 Jahren | 3 Monate |
| 10 Jahren | 4 Monate |
| 12 Jahren | 5 Monate |
| 15 Jahren | 6 Monate |
| 20 Jahren | 7 Monate |

## Worauf du achtest

- **Vertrag:** Längere Fristen sind möglich, für dich aber nie länger als für das Unternehmen. Kürzere Fristen gehen nur in engen Ausnahmen (§ 622 Abs. 5 und 6 BGB).
- **Tarifvertrag:** Er kann andere Fristen vorsehen.
- **Probezeit:** Hier gelten meist zwei Wochen, siehe [Probezeit](#/wissen/probezeit).
- **Schriftform:** Eine Kündigung muss auf Papier mit Unterschrift erfolgen. E-Mail oder Messenger reichen nicht.
- **Rückwärts rechnen:** Prüfe vor einer Zusage, wann du frühestens wechseln kannst.
`);

  artikel("arbeitsvertrag-pruefen", "Arbeitsvertrag prüfen", RECHT, `
Lies den Vertrag vollständig, bevor du unterschreibst. Du darfst dir dafür Zeit nehmen und nachfragen. Dieser Überblick gilt für Deutschland und ersetzt keine Rechtsberatung.

## Die wichtigsten Punkte

- **Stimmt alles mit dem Angebot überein?** Gehalt, Stunden, Urlaub, Einsatzort, Beginn.
- **Probezeit:** Üblich sind bis zu sechs Monate. Mehr dazu unter [Probezeit](#/wissen/probezeit).
- **Kündigungsfrist:** Sie steht im Vertrag oder folgt dem Gesetz, siehe [Kündigungsfristen](#/wissen/kuendigungsfristen).
- **Überstunden:** Klauseln wie „mit dem Gehalt abgegolten“ sind heikel, wenn nicht klar ist, wie viele Stunden gemeint sind.
- **Befristung:** Sie muss mit Enddatum oder Zweck schriftlich vereinbart sein, bevor du anfängst.
- **Wettbewerbsverbot nach dem Ausscheiden:** Es gilt höchstens zwei Jahre und setzt eine Entschädigung von mindestens der Hälfte der letzten Bezüge voraus.
- **Rückzahlung von Fortbildungskosten:** Achte auf Höhe und Bindungsdauer.
- **Versetzung:** Prüfe, ob das Unternehmen dich an andere Orte oder in andere Aufgaben schicken darf.

## Wenn etwas unklar ist

Frag schriftlich nach und bitte um eine Änderung im Vertrag. Bei Zweifeln prüfen Gewerkschaften, Fachanwältinnen und Fachanwälte für Arbeitsrecht den Vertrag. Unter „Vergleich“ findest du zu jedem Angebot eine Prüfliste.
`);

  artikel("vorstellungsgespraech", "Das Vorstellungsgespräch", GESPRAECH, `
Ein Gespräch ist keine Prüfung, sondern ein Kennenlernen in beide Richtungen. Auch du findest heraus, ob die Stelle zu dir passt.

## Vorbereitung

- Lies die Stellenanzeige und deine eigene Bewerbung noch einmal.
- Informiere dich über das Unternehmen, seine Produkte und aktuelle Nachrichten.
- Bereite eine kurze Vorstellung von etwa zwei Minuten vor.
- Übe Beispiele mit der [STAR-Methode](#/wissen/star-methode).
- Schreib dir eigene Fragen auf, etwa zur Einarbeitung oder zum Team.

## Typischer Ablauf

1. Begrüßung und Vorstellung der Beteiligten
2. Vorstellung des Unternehmens und der Stelle
3. Dein Werdegang und deine Beispiele
4. Deine Fragen
5. Gehalt, Eintritt und nächste Schritte

## Am Tag selbst

Plane Zeit für die Anfahrt ein und sei etwa zehn Minuten vorher da. Beim digitalen Gespräch testest du Kamera, Ton und Verbindung vorab und wählst einen ruhigen Ort.

## Unzulässige Fragen

Fragen nach Schwangerschaft, Familienplanung oder Religion sind in der Regel nicht erlaubt. Du musst sie nicht wahrheitsgemäß beantworten.

## Danach

Notiere dir direkt, was gut lief und was du nachfragen möchtest. Ein kurzes Dankeschön per E-Mail am selben oder nächsten Tag ist ein guter Abschluss.
`);

  artikel("linkedin-xing-profil", "LinkedIn- und XING-Profil", AUFTRITT, `
Viele Personalverantwortliche schauen sich Online-Profile an. Ein gepflegtes Profil unterstützt deine Bewerbung, ein veraltetes schadet ihr.

## Die Grundlagen

- **Foto:** freundlich, aktuell und passend zum Berufsumfeld
- **Überschrift:** Was du tust und suchst, nicht nur die aktuelle Stelle
- **Zusammenfassung:** drei bis fünf Sätze zu Stärken und Zielen
- **Berufserfahrung:** dieselben Daten und Bezeichnungen wie im Lebenslauf
- **Kompetenzen:** Begriffe, nach denen in deinem Beruf gesucht wird

## Was du prüfst

1. Stimmen Daten und Titel mit deinem Lebenslauf überein?
2. Gibt es Rechtschreibfehler?
3. Wirken frühere Beiträge und Kommentare noch passend?
4. Ist die Einstellung „offen für Angebote“ so gewählt, wie du es möchtest? Prüfe, ob dein aktuelles Unternehmen sie sehen kann.

## Ein Profil genügt

Pflege lieber ein Profil gut als zwei schlecht. Nutzt du eins nicht mehr, lösche es oder weise dort auf das aktive Profil hin.
`);

  artikel("serioese-email", "Eine seriöse E-Mail-Adresse", AUFTRITT, `
Deine E-Mail-Adresse ist oft das Erste, was ein Unternehmen von dir sieht. Sie sollte sachlich sein und deinen Namen enthalten.

## So sieht sie aus

- gut: vorname.nachname@beispiel.de
- auch gut: v.nachname@beispiel.de
- ungeeignet: Spitznamen, Geburtsjahre oder Fantasienamen

## Ein eigenes Postfach für Bewerbungen

Richte ein eigenes Postfach ein. So gehen Antworten nicht zwischen Newslettern unter, und du behältst den Überblick.

## Darauf achtest du

- Nutze nie die Adresse deines aktuellen Arbeitgebers.
- Prüfe auch den Spam-Ordner regelmäßig.
- Schalte, wenn du sie nutzt, die Zwei-Faktor-Anmeldung ein.
- Der angezeigte Absendername ist dein vollständiger Name.
`);

  artikel("probezeit", "Probezeit", RECHT, `
In der Probezeit lernen du und das Unternehmen sich kennen. Dieser Überblick gilt für Deutschland und ersetzt keine Rechtsberatung.

## Das Wichtigste

- **Dauer:** Eine verkürzte Kündigungsfrist darf für höchstens sechs Monate vereinbart werden (§ 622 Abs. 3 BGB).
- **Kündigung:** In dieser Zeit genügen meist zwei Wochen, und zwar zu jedem beliebigen Tag und für beide Seiten.
- **Kein Automatismus:** Eine Probezeit gilt nur, wenn sie im Vertrag steht. Sie kann auch kürzer sein.
- **Befristete Verträge:** Die Probezeit muss im Verhältnis zur Laufzeit und zur Tätigkeit stehen.

## Probezeit und Kündigungsschutz

Das sind zwei getrennte Dinge. Der allgemeine Kündigungsschutz greift in Betrieben mit mehr als zehn Beschäftigten nach sechs Monaten im Unternehmen, unabhängig von der vereinbarten Probezeit.

## Deine Rechte

Auch in der Probezeit hast du Anspruch auf Lohn, Entgeltfortzahlung bei Krankheit (nach vier Wochen im Arbeitsverhältnis) und anteiligen Urlaub.

## So nutzt du die Zeit

Bitte früh um Rückmeldung und klär Erwartungen im Gespräch. Vereinbare nach etwa drei Monaten ein Zwischengespräch.

R42J hält in der Statistik fest, wenn du die Probezeit bestanden hast: Setze dafür den Status der Bewerbung.
`);

  artikel("erste-schritte", "Erste Schritte", "Erste Schritte", `
So kommst du von der ersten Öffnung bis zur ersten Bewerbung.

## 1. Starten

- **Windows:** Doppelklick auf \`Start (Windows).cmd\`.
- **Mac:** Rechtsklick auf \`Start (Mac).command\`, dann „Öffnen“ und die Sicherheitsfrage bestätigen. Das ist nur beim ersten Mal nötig. Bietet der Mac das nicht an, findest du unter Systemeinstellungen → Datenschutz & Sicherheit den Knopf „Dennoch öffnen“.
- **Klappt beides nicht:** \`Start.html\` per Rechtsklick in Chrome oder Edge öffnen.

R42J läuft nur in Chrome und Edge.

## 2. Ordner wählen

Wähle den Ordner, in dem R42J liegt, und erlaube die Änderungen. Daneben entsteht der Ordner \`daten\` mit deinen verschlüsselten Daten.

## 3. Profil anlegen

Der Assistent führt dich durch Passwort und Wiederherstellungsschlüssel. **Drucke den Schlüssel aus und bewahre ihn getrennt vom Stick auf.** Ohne Passwort und Schlüssel kommt niemand mehr an deine Daten.

## 4. Stammdaten füllen

Trage deine Daten einmal ein oder lass sie per KI-Prompt aus einem vorhandenen Lebenslauf übernehmen. Lege mindestens eine Ausrichtung an.

## 5. Erste Bewerbung

Lege unter **Bewerbungen** eine neue an, füge den Text der Stelle ein und erzeuge Lebenslauf und Anschreiben. Beim Versand hilft dir die Bewerbung Schritt für Schritt.

## Sicherungen

R42J sichert automatisch auf dem Stick. Wähle in den Einstellungen zusätzlich einen zweiten Ort, damit ein defekter Stick nichts kostet.

## Weiterlesen

- [So installierst du ein Update](#/wissen/update-installieren)
- [Was ist ein ATS?](#/wissen/ats-erklaert)
`);

  artikel("update-installieren", "Update installieren", "Erste Schritte", `
Ein Update ersetzt nur das Programm. Deine Daten im Ordner \`daten\` bleiben unberührt.

## So gehst du vor

1. Sperre R42J und schließe den Browser-Tab.
2. Sichere zur Vorsicht den Ordner \`daten\`, zum Beispiel per Kopie auf den Rechner.
3. Lade die ZIP-Datei \`r42j-vX.Y.Z.zip\` aus dem Release herunter und entpacke sie.
4. Lösche auf dem Stick den alten Ordner \`app\`.
5. Kopiere den neuen Ordner \`app\` aus dem ZIP an dieselbe Stelle.
6. Starte R42J wie gewohnt und entsperre dein Profil.

Die Startdateien musst du nur ersetzen, wenn die Release-Notiz das sagt. \`daten\` liegt nicht im ZIP und wird nie überschrieben. Lösche diesen Ordner nie.

## Automatisch nach Updates suchen

In den Einstellungen unter „Weiteres“ schaltest du die Suche ein. R42J fragt dann beim Start höchstens einmal am Tag bei GitHub nach der neuesten Version. Dabei werden keine Daten von dir übertragen. Die Suche ist standardmäßig aus.

## Wenn etwas schiefgeht

Lege den alten Ordner \`app\` zurück. Neue Versionen wandeln deinen Tresor beim ersten Öffnen um und legen vorher eine Sicherung an. Hat eine neue Version den Tresor schon umgewandelt, nimm diese Sicherung.
`);
})();
