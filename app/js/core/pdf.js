(function () {
  "use strict";
  var K = window.R42J_CORE;

  var FAMILIE = "IBMPlexSans";
  var bereit = null;
  // Die eingebettete Schrift deckt Lateinisch samt Latin Extended ab, alles andere käme als leeres
  // Kästchen heraus. tests/statisch.mjs gleicht diese Liste mit den Schriftdateien ab.
  var ZEICHEN =
    "\s\u0020-\u007E\u00A0-\u017F\u018F\u0192\u01A0\u01A1\u01AF\u01B0\u01CD-\u01DC\u01FA-\u01FF\u0218-\u021B\u0237\u0259" +
    "\u02BB\u02BC\u02C6\u02C7\u02DA\u02DC\u02DD\u1E80-\u1E85\u1E9E\u1EA0-\u1EF9\u2013\u2014\u2018-\u201A\u201C-\u201E\u2020\u2022" +
    "\u2026\u2032\u2033\u2039\u203A\u2044\u20A1\u20A4\u20A6\u20A8-\u20AE\u20B1\u20B2\u20B4\u20B5\u20B8-\u20BA\u20BD\u20BF\u2113\u2122\u2191\u2193\u2212\u2215";
  var FREMD = new RegExp("[^" + ZEICHEN + "]", "g");

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

  // Zerlegte Zeichen (s + Cedille) hätten keine eigene Form in der Schrift, zusammengesetzte schon.
  function vereinheitlichen(wert) {
    if (typeof wert === "string") return wert.normalize("NFC");
    if (Array.isArray(wert)) return wert.map(vereinheitlichen);
    if (!wert || typeof wert !== "object") return wert;
    var kopie = {};
    Object.keys(wert).forEach(function (k) {
      kopie[k] = vereinheitlichen(wert[k]);
    });
    return kopie;
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

  var bibliothekBereit = null;

  function bibliothek() {
    if (!bibliothekBereit) {
      bibliothekBereit = skriptLaden("lib/pdf-lib.min.js").catch(function (e) {
        bibliothekBereit = null;
        throw e;
      });
    }
    return bibliothekBereit;
  }

  K.pdf = {
    FAMILIE: FAMILIE,
    bibliothek: bibliothek,

    erzeugen: async function (definition) {
      await laden();
      var puffer = await window.pdfMake.createPdf(vereinheitlichen(definition)).getBuffer();
      return new Uint8Array(puffer);
    },

    fremdeZeichen: function (definition) {
      var treffer = JSON.stringify(definition.content).normalize("NFC").match(FREMD) || [];
      return treffer.filter(function (z, i) {
        return treffer.indexOf(z) === i;
      });
    },

    // Macht aus einer Bild-Anlage ein JPEG für pdfmake, auf Weiß gelegt und auf hoehe begrenzt.
    bildDatenUrl: async function (bytes, mime, hoehe) {
      var bild = await window.createImageBitmap(new Blob([bytes], { type: mime }));
      var faktor = Math.min(1, hoehe / bild.height);
      var c = document.createElement("canvas");
      c.width = Math.round(bild.width * faktor);
      c.height = Math.round(bild.height * faktor);
      var g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(bild, 0, 0, c.width, c.height);
      bild.close();
      return c.toDataURL("image/jpeg", 0.9);
    },

    seiten: async function (bytes) {
      await bibliothek();
      return (await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
    },
  };
})();
