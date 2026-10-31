(function () {
  "use strict";
  var K = window.R42J_CORE;

  // Geschäftsbrief nach DIN 5008 Form B mit echtem Text. Das Papier ist immer hell.
  // Für den Postversand rückt die Anschrift in die Anschriftzone eines DL-Fensterumschlags, dazu kommen Rücksendeangabe, Falz- und Lochmarke.
  var TINTE = "#17202b";
  var GEDAEMPFT = "#4a5563";
  var UNTERSCHRIFT_BREITE = 150;
  var UNTERSCHRIFT_HOEHE = 50;
  var MM = 72 / 25.4;
  var RAND_LINKS = 25 * MM;
  var RAND_RECHTS = 20 * MM;
  var RAND_OBEN = 12 * MM;
  var RAND_UNTEN = 15 * MM;
  var ANSCHRIFT_OBEN = 45 * MM;
  var ANSCHRIFTZONE_OBEN = 62.7 * MM;
  var RUECKSENDE_OBEN = 58.5 * MM;
  var FALZ_MM = [105, 210];
  var LOCH_MM = 148.5;
  var MARKE_LINKS = 5 * MM;
  var FALZ_LAENGE = 5 * MM;
  var LOCH_LAENGE = 3 * MM;
  var DATUM_OBEN = 85 * MM;
  var BETREFF_OBEN = 98.46 * MM;
  var ZEILE = 10.5 * 1.22;

  function marke(yMm, laenge) {
    var y = yMm * MM;
    return { type: "line", x1: MARKE_LINKS, y1: y, x2: MARKE_LINKS + laenge, y2: y, lineWidth: 0.4, lineColor: GEDAEMPFT };
  }

  K.anschreibenVorlage = function (d) {
    var inhalt = [
      { text: d.absender, alignment: "center", style: "kopf", absolutePosition: { x: RAND_LINKS, y: 18 * MM } },
      { text: d.empfaenger.join("\n"), absolutePosition: { x: RAND_LINKS, y: d.postversand ? ANSCHRIFTZONE_OBEN : ANSCHRIFT_OBEN } },
      { text: d.ortDatum, alignment: "right", style: "absender", absolutePosition: { x: RAND_LINKS, y: DATUM_OBEN } },
      { text: d.betreff, style: "betreff", margin: [0, BETREFF_OBEN - RAND_OBEN, 0, 0] },
    ];
    if (d.postversand) {
      inhalt.unshift({ text: d.ruecksende, style: "ruecksende", absolutePosition: { x: RAND_LINKS, y: RUECKSENDE_OBEN } });
      inhalt.unshift({
        canvas: FALZ_MM.map(function (y) {
          return marke(y, FALZ_LAENGE);
        }).concat(marke(LOCH_MM, LOCH_LAENGE)),
        absolutePosition: { x: 0, y: 0 },
      });
    }
    if (d.referenz) inhalt.push({ text: d.referenz, style: "absender" });
    inhalt.push({ text: d.anrede, margin: [0, 2 * ZEILE, 0, 0] });
    d.absaetze.forEach(function (a) {
      inhalt.push({ text: a, margin: [0, ZEILE, 0, 0] });
    });
    inhalt.push({ text: d.gruss, margin: [0, ZEILE, 0, 0] });
    if (d.unterschrift) inhalt.push({ image: d.unterschrift, fit: [UNTERSCHRIFT_BREITE, UNTERSCHRIFT_HOEHE], margin: [0, 6, 0, 0] });
    inhalt.push({ text: d.name, margin: [0, d.unterschrift ? 2 : 3 * ZEILE, 0, 0] });

    return {
      pageSize: "A4",
      pageMargins: [RAND_LINKS, RAND_OBEN, RAND_RECHTS, RAND_UNTEN],
      language: d.sprache === "de" ? "de-DE" : "en-GB",
      info: { title: d.betreff, author: d.name, subject: d.betreff, creator: "R42J" },
      defaultStyle: { font: K.pdf.FAMILIE, fontSize: 10.5, lineHeight: 1.22, color: TINTE },
      styles: {
        kopf: { color: GEDAEMPFT, fontSize: 9 },
        absender: { color: GEDAEMPFT, fontSize: 9.5 },
        betreff: { bold: true, fontSize: 11.5 },
        ruecksende: { color: GEDAEMPFT, fontSize: 7.5 },
      },
      content: inhalt,
    };
  };
})();
