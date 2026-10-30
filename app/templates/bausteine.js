(function () {
  "use strict";
  var K = window.R42J_CORE;

  // Mitgelieferte Textbausteine (SPEC §6.6). Jede Zeile ist ein Satz: Fehlt ein Wert wie {{erfolg_2}},
  // entfällt nur diese Zeile. {{kompetenzen_liste}} erscheint nur, wenn kein Erfolg vorliegt. Englische Bausteine gelten für beide Anreden.
  var TEXTE = {
    "de-sie": {
      einleitung: [
        "mit großem Interesse habe ich Ihre Anzeige für die Position {{stelle}} gelesen{{quelle_hinweis}}.\nDie Aufgabe passt sehr gut zu dem, was ich kann und künftig weiter ausbauen möchte.",
        "Ihre Stelle als {{stelle}} hat mich sofort angesprochen{{quelle_hinweis}}.\nDeshalb bewerbe ich mich bei {{firma}}.",
        "die Position {{stelle}} bei {{firma}} verbindet genau die Aufgaben, die mich in meinem Beruf antreiben.\nGerne möchte ich Sie davon überzeugen, dass ich die richtige Besetzung bin.",
      ],
      motivation: [
        "An {{firma}} reizt mich besonders die Möglichkeit, Verantwortung zu übernehmen und Abläufe spürbar mitzugestalten.",
        "{{firma}} ist für mich ein Arbeitgeber, bei dem ich mein Wissen sinnvoll einbringen und zugleich dazulernen kann.",
        "Mich überzeugt, wie {{firma}} an seine Aufgaben herangeht. Daran möchte ich mitwirken.",
      ],
      abgleich: [
        "Besonders stark bin ich in {{kompetenz_1}}: {{erfolg_1}}.\nAuch {{kompetenz_2}} gehört zu meinen Stärken: {{erfolg_2}}.\nDazu kommt {{kompetenz_3}}: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
        "Für Ihre Anforderungen bringe ich konkrete Erfahrung mit.\nIm Bereich {{kompetenz_1}} kann ich das belegen: {{erfolg_1}}.\nBei {{kompetenz_2}} sieht es ähnlich aus: {{erfolg_2}}.\nAuch {{kompetenz_3}} ist mir vertraut: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
        "Was ich für diese Aufgabe mitbringe, zeigt am besten meine bisherige Arbeit.\nZu {{kompetenz_1}}: {{erfolg_1}}.\nZu {{kompetenz_2}}: {{erfolg_2}}.\nZu {{kompetenz_3}}: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
      ],
      mehrwert: [
        "Ich arbeite sorgfältig und selbstständig, gehe offen auf Menschen zu und behalte auch bei hohem Arbeitsaufkommen den Überblick.",
        "Sie gewinnen mit mir jemanden, der sich schnell einarbeitet, Probleme früh anspricht und Aufgaben verlässlich zu Ende bringt.",
        "Mir ist wichtig, dass Ergebnisse stimmen und die Zusammenarbeit im Team funktioniert. Beides dürfen Sie von mir erwarten.",
      ],
      rahmen: [
        "Ich kann die Stelle ab {{eintritt}} antreten.\nMeine Kündigungsfrist beträgt {{kuendigungsfrist}}.\nMeine Gehaltsvorstellung liegt bei {{gehalt}}.",
        "Mein frühestmöglicher Eintrittstermin ist der {{eintritt}}.\nDie Kündigungsfrist beträgt {{kuendigungsfrist}}.\nIch stelle mir ein Gehalt von {{gehalt}} vor.",
        "Für Sie relevant: Verfügbar bin ich ab {{eintritt}}.\nEs gilt eine Kündigungsfrist von {{kuendigungsfrist}}.\nMeine Gehaltsvorstellung beträgt {{gehalt}}.",
      ],
      schluss: [
        "Über die Einladung zu einem persönlichen Gespräch freue ich mich sehr.",
        "Gerne überzeuge ich Sie in einem persönlichen Gespräch. Ich freue mich auf Ihre Rückmeldung.",
        "Wenn Sie mehr erfahren möchten, freue ich mich auf ein Gespräch mit Ihnen.",
      ],
    },
    "de-du": {
      einleitung: [
        "eure Anzeige für die Position {{stelle}} hat mich sofort angesprochen{{quelle_hinweis}}.\nDie Aufgabe passt sehr gut zu dem, was ich kann und weiter ausbauen möchte.",
        "als ich eure Stelle als {{stelle}} gesehen habe{{quelle_hinweis}}, war klar: Da möchte ich mich bewerben.",
        "die Position {{stelle}} bei {{firma}} verbindet genau die Aufgaben, die mich im Beruf antreiben.\nDeshalb möchte ich mich bei euch vorstellen.",
      ],
      motivation: [
        "An {{firma}} reizt mich besonders, dass ich Verantwortung übernehmen und Abläufe spürbar mitgestalten kann.",
        "{{firma}} ist für mich ein Arbeitgeber, bei dem ich mein Wissen sinnvoll einbringen und zugleich dazulernen kann.",
        "Mich überzeugt, wie ihr bei {{firma}} an eure Aufgaben herangeht. Dabei möchte ich mitmachen.",
      ],
      abgleich: [
        "Besonders stark bin ich in {{kompetenz_1}}: {{erfolg_1}}.\nAuch {{kompetenz_2}} gehört zu meinen Stärken: {{erfolg_2}}.\nDazu kommt {{kompetenz_3}}: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
        "Für eure Anforderungen bringe ich konkrete Erfahrung mit.\nIm Bereich {{kompetenz_1}} kann ich das belegen: {{erfolg_1}}.\nBei {{kompetenz_2}} sieht es ähnlich aus: {{erfolg_2}}.\nAuch {{kompetenz_3}} ist mir vertraut: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
        "Was ich für diese Aufgabe mitbringe, zeigt am besten meine bisherige Arbeit.\nZu {{kompetenz_1}}: {{erfolg_1}}.\nZu {{kompetenz_2}}: {{erfolg_2}}.\nZu {{kompetenz_3}}: {{erfolg_3}}.\nZu meinen Stärken zählen {{kompetenzen_liste}}.",
      ],
      mehrwert: [
        "Ich arbeite sorgfältig und selbstständig, gehe offen auf Menschen zu und behalte auch im größten Trubel den Überblick.",
        "Mit mir bekommt ihr jemanden, der sich schnell einarbeitet, Probleme früh anspricht und Aufgaben verlässlich zu Ende bringt.",
        "Mir ist wichtig, dass Ergebnisse stimmen und die Zusammenarbeit im Team funktioniert. Beides könnt ihr von mir erwarten.",
      ],
      rahmen: [
        "Ich kann ab {{eintritt}} bei euch starten.\nMeine Kündigungsfrist beträgt {{kuendigungsfrist}}.\nMeine Gehaltsvorstellung liegt bei {{gehalt}}.",
        "Frühestens starten kann ich am {{eintritt}}.\nDie Kündigungsfrist beträgt {{kuendigungsfrist}}.\nIch stelle mir ein Gehalt von {{gehalt}} vor.",
        "Kurz zum Rahmen: Verfügbar bin ich ab {{eintritt}}.\nEs gilt eine Kündigungsfrist von {{kuendigungsfrist}}.\nMeine Gehaltsvorstellung beträgt {{gehalt}}.",
      ],
      schluss: [
        "Ich freue mich darauf, euch persönlich kennenzulernen.",
        "Lasst uns gern persönlich sprechen. Ich freue mich auf eure Rückmeldung.",
        "Wenn ihr mehr erfahren möchtet, freue ich mich auf ein Gespräch mit euch.",
      ],
    },
    en: {
      einleitung: [
        "I read your advertisement for the position of {{stelle}}{{quelle_hinweis}} with great interest.\nThe role matches what I do well and want to develop further.",
        "Your opening for a {{stelle}}{{quelle_hinweis}} caught my attention right away, and I would like to apply.",
        "The {{stelle}} position at {{firma}} combines exactly the work that motivates me, so I am writing to introduce myself.",
      ],
      motivation: [
        "What attracts me to {{firma}} is the chance to take on responsibility and make a visible difference.",
        "I see {{firma}} as an employer where I can put my knowledge to good use and keep learning.",
        "I am impressed by the way {{firma}} approaches its work, and I would like to contribute to it.",
      ],
      abgleich: [
        "One of my main strengths is {{kompetenz_1}}: {{erfolg_1}}.\n{{kompetenz_2}} is another: {{erfolg_2}}.\nI also bring {{kompetenz_3}}: {{erfolg_3}}.\nMy strengths include {{kompetenzen_liste}}.",
        "I bring concrete experience for your requirements.\nIn {{kompetenz_1}}, my record shows it: {{erfolg_1}}.\nThe same goes for {{kompetenz_2}}: {{erfolg_2}}.\nI am also at home in {{kompetenz_3}}: {{erfolg_3}}.\nMy strengths include {{kompetenzen_liste}}.",
        "My work so far shows best what I can offer.\nOn {{kompetenz_1}}: {{erfolg_1}}.\nOn {{kompetenz_2}}: {{erfolg_2}}.\nOn {{kompetenz_3}}: {{erfolg_3}}.\nMy strengths include {{kompetenzen_liste}}.",
      ],
      mehrwert: [
        "I work carefully and independently, communicate openly and keep track of priorities even when things get busy.",
        "You would gain someone who learns quickly, raises problems early and reliably sees tasks through to the end.",
        "I care about accurate results and good teamwork, and you can count on both from me.",
      ],
      rahmen: [
        "I am available from {{eintritt}}.\nMy notice period is {{kuendigungsfrist}}.\nMy salary expectation is {{gehalt}}.",
        "The earliest I can start is {{eintritt}}.\nI have a notice period of {{kuendigungsfrist}}.\nI am looking for a salary of {{gehalt}}.",
        "For your planning: I can start from {{eintritt}}.\nA notice period of {{kuendigungsfrist}} applies.\nMy salary expectation is {{gehalt}}.",
      ],
      schluss: [
        "I would be delighted to discuss the role with you in an interview.",
        "I look forward to hearing from you and to talking in person.",
        "If you would like to know more, I would welcome the chance to speak with you.",
      ],
    },
  };

  var LISTE = [];
  Object.keys(TEXTE).forEach(function (satz) {
    Object.keys(TEXTE[satz]).forEach(function (abschnitt) {
      TEXTE[satz][abschnitt].forEach(function (text, i) {
        LISTE.push({ id: satz + "-" + abschnitt + "-" + (i + 1), satz: satz, abschnitt: abschnitt, text: text });
      });
    });
  });
  K.BAUSTEINE = LISTE;

  // Feste Teile rund um die Abschnitte, je Bausteinsatz.
  K.BRIEF_TEXTE = {
    "de-sie": {
      bewerbung: "Bewerbung als",
      anlagen: "Anlagen",
      seite: "Seite",
      referenz: "Referenz",
      und: "und",
      gruss: "Mit freundlichen Grüßen",
      allgemein: "Sehr geehrte Damen und Herren,",
      frau: "Sehr geehrte Frau {name},",
      herr: "Sehr geehrter Herr {name},",
      neutral: "Guten Tag {name},",
      quelle: " auf {quelle}",
      rueckfrageBetreff: "Rückfrage zu meiner Bewerbung als {stelle}{referenz}",
      rueckfrageText: "{anrede}\n\nam {datum} habe ich mich bei Ihnen als {stelle} beworben. Gerne möchte ich mich nach dem aktuellen Stand erkundigen.\n\nKönnen Sie mir sagen, wann ich mit einer Rückmeldung rechnen kann?\n\nMit freundlichen Grüßen\n{name}",
      emailBetreff: "Bewerbung als {stelle}{referenz}",
      emailText: "{anrede}\n\nanbei sende ich Ihnen meine Bewerbungsunterlagen für die Position {stelle}.\n\nÜber eine Rückmeldung freue ich mich.\n\nMit freundlichen Grüßen\n{name}",
    },
    "de-du": {
      bewerbung: "Bewerbung als",
      anlagen: "Anlagen",
      seite: "Seite",
      referenz: "Referenz",
      und: "und",
      gruss: "Viele Grüße",
      allgemein: "Hallo zusammen,",
      frau: "Hallo {vorname},",
      herr: "Hallo {vorname},",
      neutral: "Hallo {vorname},",
      quelle: " auf {quelle}",
      rueckfrageBetreff: "Rückfrage zu meiner Bewerbung als {stelle}{referenz}",
      rueckfrageText: "{anrede}\n\nam {datum} habe ich mich bei euch als {stelle} beworben. Ich möchte gerne nachfragen, wie der aktuelle Stand ist.\n\nKönnt ihr mir sagen, wann ich mit einer Rückmeldung rechnen kann?\n\nViele Grüße\n{name}",
      emailBetreff: "Bewerbung als {stelle}{referenz}",
      emailText: "{anrede}\n\nanbei findet ihr meine Bewerbungsunterlagen für die Position {stelle}.\n\nIch freue mich auf eure Rückmeldung.\n\nViele Grüße\n{name}",
    },
    en: {
      bewerbung: "Application for",
      anlagen: "Attachments",
      seite: "Page",
      referenz: "Reference",
      und: "and",
      gruss: "Kind regards",
      allgemein: "Dear Hiring Team,",
      frau: "Dear Ms {name},",
      herr: "Dear Mr {name},",
      neutral: "Dear {name},",
      quelle: " on {quelle}",
      rueckfrageBetreff: "Follow-up on my application for {stelle}{referenz}",
      rueckfrageText: "{anrede}\n\nI applied for the position of {stelle} on {datum} and would like to ask about the current status.\n\nCould you let me know when I can expect to hear from you?\n\nKind regards\n{name}",
      emailBetreff: "Application for {stelle}{referenz}",
      emailText: "{anrede}\n\nPlease find attached my application documents for the position of {stelle}.\n\nI look forward to hearing from you.\n\nKind regards\n{name}",
    },
  };
})();
