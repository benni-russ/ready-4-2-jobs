(function () {
  "use strict";
  var K = window.R42J_CORE;

  var FAMILIE = "IBMPlexSans";
  var bereit = null;
  // Die eingebettete Schrift ist eine Lateinisch-Teilmenge, alles andere käme als leeres Kästchen heraus.
  var FREMD = /[^s -~ -ÿıŒœ–—‘-‚“-„•…€™]/g;

  function skriptLaden(pfad) {
    return new Promise(function (fertig, fehler) {
      var s = document.createElement("script");
      s.src = pfad;
      s.onload = fertig;
      s.onerror = function () {
        fehler(K.Fehler("fehler.pdfLaden"));
      };
      document.head.appendChild(s);
    });
  }

  // pdfmake ist groß und wird nur gebraucht, wenn wirklich ein PDF entsteht.
  function laden() {
    if (!bereit) {
      bereit = Promise.all([skriptLaden("lib/pdfmake.min.js"), skriptLaden("fonts/pdf-schrift.js")])
        .then(function () {
          window.pdfMake.addVirtualFileSystem(window.R42J_PDF_SCHRIFT);
          var schnitte = {};
          schnitte[FAMILIE] = {
            normal: "IBMPlexSans-Regular.ttf",
            bold: "IBMPlexSans-Bold.ttf",
            italics: "IBMPlexSans-Italic.ttf",
            bolditalics: "IBMPlexSans-BoldItalic.ttf",
          };
          window.pdfMake.addFonts(schnitte);
        })
        .catch(function (e) {
          bereit = null;
          throw e;
        });
    }
    return bereit;
  }

  K.pdf = {
    FAMILIE: FAMILIE,

    erzeugen: async function (definition) {
      await laden();
      var puffer = await window.pdfMake.createPdf(definition).getBuffer();
      return new Uint8Array(puffer);
    },

    fremdeZeichen: function (definition) {
      var treffer = JSON.stringify(definition.content).normalize("NFC").match(FREMD) || [];
      return treffer.filter(function (z, i) {
        return treffer.indexOf(z) === i;
      });
    },

    seiten: async function (bytes) {
      return (await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
    },
  };
})();
