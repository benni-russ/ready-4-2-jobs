(function () {
  "use strict";
  var K = window.R42J_CORE;

  // DIN-5008-naher Geschäftsbrief mit echtem Text. Das Papier ist immer hell.
  var TINTE = "#17202b";
  var GEDAEMPFT = "#4a5563";
  var UNTERSCHRIFT_BREITE = 150;
  var UNTERSCHRIFT_HOEHE = 50;

  K.anschreibenVorlage = function (d) {
    var inhalt = [
      { text: d.absender, style: "absender" },
      { text: d.empfaenger.join("\n"), margin: [0, 28, 0, 0] },
      { text: d.ortDatum, alignment: "right", style: "absender", margin: [0, 18, 0, 0] },
      { text: d.betreff, style: "betreff" },
    ];
    if (d.referenz) inhalt.push({ text: d.referenz, style: "absender" });
    inhalt.push({ text: d.anrede, margin: [0, 16, 0, 0] });
    d.absaetze.forEach(function (a) {
      inhalt.push({ text: a, margin: [0, 8, 0, 0] });
    });
    inhalt.push({ text: d.gruss, margin: [0, 12, 0, 0] });
    if (d.unterschrift) inhalt.push({ image: d.unterschrift, fit: [UNTERSCHRIFT_BREITE, UNTERSCHRIFT_HOEHE], margin: [0, 6, 0, 0] });
    inhalt.push({ text: d.name, margin: [0, d.unterschrift ? 2 : 24, 0, 0] });

    return {
      pageSize: "A4",
      pageMargins: [70, 50, 57, 45],
      language: d.sprache === "de" ? "de-DE" : "en-GB",
      info: { title: d.betreff, author: d.name, subject: d.betreff, creator: "R42J" },
      defaultStyle: { font: K.pdf.FAMILIE, fontSize: 10.5, lineHeight: 1.22, color: TINTE },
      styles: {
        absender: { color: GEDAEMPFT, fontSize: 9.5 },
        betreff: { bold: true, fontSize: 11.5, margin: [0, 16, 0, 0] },
      },
      content: inhalt,
    };
  };
})();
