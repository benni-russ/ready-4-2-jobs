(function () {
  "use strict";
  var K = window.R42J_CORE;

  var KOPF_ZEICHEN = 400;
  var MAX_SEITEN = 2;
  var FRIST_MS = 8000;
  var MAX_STICHWOERTER = 5;
  var AELTESTES_JAHR = 1950;

  var REGELN = [
    { kategorie: "zeugnis-arbeit", worte: ["arbeitszeugnis", "zwischenzeugnis", "dienstzeugnis", "praktikumszeugnis", "reference letter", "letter of reference"] },
    { kategorie: "zeugnis-schule", worte: ["schulzeugnis", "abschlusszeugnis", "abiturzeugnis", "abitur", "realschul", "hauptschul", "mittlere reife", "bachelorzeugnis", "masterzeugnis", "transcript of records"] },
    { kategorie: "zertifikat", worte: ["zertifikat", "certificate", "teilnahmebescheinigung", "weiterbildung", "fortbildung", "lehrgang"] },
    { kategorie: "foto", worte: ["bewerbungsfoto", "foto", "portrait", "portraet", "photo"] },
    { kategorie: "unterschrift", worte: ["unterschrift", "signatur", "signature"] },
  ];
  var FUELLWOERTER = ["pdf", "scan", "final", "neu", "kopie", "copy", "dokument", "document", "datei", "file", "und", "and", "von", "the"];
  var MONATE = {
    januar: 1, january: 1, februar: 2, february: 2, maerz: 3, märz: 3, march: 3, april: 4, mai: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
    august: 8, september: 9, oktober: 10, october: 10, november: 11, dezember: 12, december: 12,
  };

  function zweistellig(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function isoDatum(jahr, monat, tag) {
    var d = new Date(jahr, monat - 1, tag);
    if (d.getFullYear() !== jahr || d.getMonth() !== monat - 1 || d.getDate() !== tag) return null;
    if (jahr < AELTESTES_JAHR || d > new Date()) return null;
    return jahr + "-" + zweistellig(monat) + "-" + zweistellig(tag);
  }

  // Ein Zeugnis nennt oft auch das Geburtsdatum, das Ausstellungsdatum ist das späteste.
  function datumFinden(text) {
    var treffer = [];
    function merken(jahr, monat, tag) {
      var iso = isoDatum(Number(jahr), Number(monat), Number(tag));
      if (iso) treffer.push(iso);
    }
    var m;
    var deutsch = /(?:^|\D)(\d{1,2})[._-](\d{1,2})[._-](\d{4})(?!\d)/g;
    while ((m = deutsch.exec(text))) merken(m[3], m[2], m[1]);
    var iso = /(?:^|\D)(\d{4})[._-](\d{1,2})[._-](\d{1,2})(?!\d)/g;
    while ((m = iso.exec(text))) merken(m[1], m[2], m[3]);
    var worte = /(\d{1,2})\.?\s+([A-Za-zäÄ]+)\s+(\d{4})/g;
    while ((m = worte.exec(text))) {
      var monat = MONATE[m[2].toLowerCase()];
      if (monat) merken(m[3], monat, m[1]);
    }
    return treffer.sort().pop();
  }

  function kategorieFinden(text) {
    var flach = K.normalisieren(text.replace(/[_\-.]+/g, " "));
    var regel = REGELN.filter(function (r) {
      return r.worte.some(function (w) {
        return flach.indexOf(K.normalisieren(w)) > -1;
      });
    })[0];
    return regel ? regel.kategorie : null;
  }

  function stichwoerter(kern) {
    var gesehen = {};
    return kern
      .replace(/\d{1,4}[._-]\d{1,2}[._-]\d{1,4}/g, " ")
      .split(/[\s_.,()\[\]-]+/)
      .filter(function (w) {
        var klein = w.toLowerCase();
        var brauchbar = /^\d{4}$/.test(w) || (w.length > 2 && !/^\d+$/.test(w));
        if (!brauchbar || FUELLWOERTER.indexOf(klein) > -1 || gesehen[klein]) return false;
        gesehen[klein] = true;
        return true;
      })
      .slice(0, MAX_STICHWOERTER);
  }

  // Der Dateiname zählt mehr als der Inhalt: Ihn hat der Mensch selbst vergeben.
  K.anlagen.vorschlag = function (dateiname, text) {
    var kern = String(dateiname).replace(/\.[^.]+$/, "");
    var inhalt = text || "";
    var vorschlag = {
      kategorie: kategorieFinden(kern) || kategorieFinden(inhalt.slice(0, KOPF_ZEICHEN)) || "sonstiges",
      stichwoerter: stichwoerter(kern),
    };
    var datum = datumFinden(kern) || datumFinden(inhalt);
    if (datum) vorschlag.datum = datum;
    return vorschlag;
  };

  function skriptLaden(pfad) {
    return new Promise(function (fertig, fehlschlag) {
      var s = document.createElement("script");
      s.src = pfad;
      s.onload = fertig;
      s.onerror = fehlschlag;
      document.head.appendChild(s);
    });
  }

  // pdf.js ist groß und wird nur beim Hochladen gebraucht, deshalb lädt es erst dann.
  var bibliothek = null;
  function pdfjsLaden() {
    bibliothek =
      bibliothek ||
      skriptLaden("lib/pdf.min.js")
        .then(function () {
          return skriptLaden("lib/pdf.worker.min.js");
        })
        .then(function () {
          return window.pdfjsLib;
        });
    return bibliothek;
  }

  async function textLesen(bytes) {
    var lib = await pdfjsLaden();
    var aufgabe = lib.getDocument({ data: bytes.slice(), isEvalSupported: false, disableFontFace: true, verbosity: 0 });
    try {
      var pdf = await aufgabe.promise;
      var teile = [];
      for (var nr = 1; nr <= Math.min(pdf.numPages, MAX_SEITEN); nr++) {
        var inhalt = await (await pdf.getPage(nr)).getTextContent();
        teile.push(
          inhalt.items
            .map(function (i) {
              return i.str;
            })
            .join(" "),
        );
      }
      return teile.join("\n");
    } finally {
      aufgabe.destroy();
    }
  }

  // Der Text bleibt im Speicher und dient nur dem Vorschlag. Ohne Text bleibt der Dateiname.
  K.anlagen.pdfText = async function (bytes) {
    var uhr;
    try {
      return await Promise.race([
        textLesen(bytes),
        new Promise(function (fertig) {
          uhr = setTimeout(fertig, FRIST_MS, "");
        }),
      ]);
    } catch (e) {
      return "";
    } finally {
      clearTimeout(uhr);
    }
  };
})();
