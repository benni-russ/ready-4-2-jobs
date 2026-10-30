(function () {
  "use strict";
  var K = window.R42J_CORE;

  var A4 = [595.28, 841.89];
  var RAND = 28;
  var STUFEN = {
    original: null,
    mittel: { dpi: 200, qualitaet: 0.72 },
    klein: { dpi: 150, qualitaet: 0.55 },
  };
  var A4_ZOLL = 11.69;
  var MAX_MB = 5;

  // Aufbereitete Klartext-Dateien liegen nur im Speicher und verschwinden beim Sperren.
  var cache = {};
  K.tresorStand.subscribe(function (z) {
    if (!z.offen) cache = {};
  });

  function lib() {
    return window.PDFLib;
  }

  function leinwand(bild, breite, hoehe) {
    var c = document.createElement("canvas");
    c.width = breite;
    c.height = hoehe;
    var g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, breite, hoehe);
    g.drawImage(bild, 0, 0, breite, hoehe);
    return c;
  }

  async function nachJpeg(c, qualitaet) {
    var blob = await new Promise(function (fertig) {
      c.toBlob(fertig, "image/jpeg", qualitaet);
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Längste Seite passt auf A4 in der gewählten Auflösung.
  function zielMasse(b, h, stufe) {
    var faktor = Math.min(1, (A4_ZOLL * stufe.dpi) / Math.max(b, h));
    return { b: Math.max(1, Math.round(b * faktor)), h: Math.max(1, Math.round(h * faktor)) };
  }

  async function bildVerkleinern(bytes, mime, stufe) {
    var bild = await window.createImageBitmap(new Blob([bytes], { type: mime }));
    var m = zielMasse(bild.width, bild.height, stufe);
    var c = leinwand(bild, m.b, m.h);
    bild.close();
    return nachJpeg(c, stufe.qualitaet);
  }

  function nameVon(o) {
    return o && o.constructor === lib().PDFName ? o.decodeText() : "";
  }

  function zahl(dict, schluessel) {
    var o = dict.lookup(lib().PDFName.of(schluessel));
    return o && o.asNumber ? o.asNumber() : 0;
  }

  // Nur einfache Farbräume. Alles Übrige bleibt unangetastet, lieber groß als falsch.
  function kanaele(dict) {
    var cs = dict.lookup(lib().PDFName.of("ColorSpace"));
    var name = nameVon(cs);
    if (name === "DeviceRGB") return 3;
    if (name === "DeviceGray") return 1;
    if (cs && cs.lookup && nameVon(cs.lookup(0)) === "ICCBased") {
      var n = zahl(cs.lookup(1).dict, "N");
      return n === 1 || n === 3 ? n : 0;
    }
    return 0;
  }

  function nachCanvas(roh, breite, hoehe, n) {
    var c = document.createElement("canvas");
    c.width = breite;
    c.height = hoehe;
    var g = c.getContext("2d");
    var bild = g.createImageData(breite, hoehe);
    var ziel = bild.data;
    for (var i = 0, p = 0; i < breite * hoehe; i++, p += n) {
      ziel[i * 4] = roh[p];
      ziel[i * 4 + 1] = roh[n === 3 ? p + 1 : p];
      ziel[i * 4 + 2] = roh[n === 3 ? p + 2 : p];
      ziel[i * 4 + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
    return c;
  }

  // Liefert ein zeichenbares Bild aus einem PDF-Bildobjekt oder null, wenn es nicht sicher lesbar ist.
  async function bildLesen(strom) {
    var d = strom.dict;
    var P = lib().PDFName;
    if (d.lookup(P.of("SMask")) || d.lookup(P.of("Mask")) || d.lookup(P.of("ImageMask")) || d.lookup(P.of("Decode"))) return null;
    var filter = nameVon(d.lookup(P.of("Filter")));
    var breite = zahl(d, "Width");
    var hoehe = zahl(d, "Height");
    if (filter === "DCTDecode") {
      if (!kanaele(d)) return null;
      return window.createImageBitmap(new Blob([strom.contents], { type: "image/jpeg" }));
    }
    var n = kanaele(d);
    if (filter !== "FlateDecode" || d.lookup(P.of("DecodeParms")) || zahl(d, "BitsPerComponent") !== 8 || !n) return null;
    var roh = lib().decodePDFRawStream(strom).decode();
    if (roh.length < breite * hoehe * n) return null;
    return nachCanvas(roh, breite, hoehe, n);
  }

  // Scans sind Bilder im PDF: Nur diese werden neu kodiert, Text und Vektoren bleiben unberührt.
  async function bilderImPdf(doc, stufe) {
    var P = lib().PDFName;
    var objekte = doc.context.enumerateIndirectObjects();
    for (var i = 0; i < objekte.length; i++) {
      var ref = objekte[i][0];
      var o = objekte[i][1];
      if (!(o instanceof lib().PDFRawStream) || nameVon(o.dict.lookup(P.of("Subtype"))) !== "Image") continue;
      var bild = await bildLesen(o);
      if (!bild) continue;
      var m = zielMasse(bild.width, bild.height, stufe);
      var jpeg = await nachJpeg(leinwand(bild, m.b, m.h), stufe.qualitaet);
      if (bild.close) bild.close();
      if (jpeg.length >= o.contents.length) continue;
      var neu = doc.context.stream(jpeg, {
        Type: "XObject",
        Subtype: "Image",
        Width: m.b,
        Height: m.h,
        ColorSpace: "DeviceRGB",
        BitsPerComponent: 8,
        Filter: "DCTDecode",
      });
      doc.context.assign(ref, neu);
    }
  }

  async function bildSeite(ziel, bytes, istPng) {
    var bild = istPng ? await ziel.embedPng(bytes) : await ziel.embedJpg(bytes);
    var seite = ziel.addPage(A4);
    var faktor = Math.min((A4[0] - 2 * RAND) / bild.width, (A4[1] - 2 * RAND) / bild.height, 1);
    var b = bild.width * faktor;
    var h = bild.height * faktor;
    seite.drawImage(bild, { x: (A4[0] - b) / 2, y: (A4[1] - h) / 2, width: b, height: h });
  }

  // Bereitet eine Anlage je Stufe einmal auf: Die Größenanzeige bleibt so auch bei vielen Scans flüssig.
  async function aufbereiten(a, stufeName) {
    var schluessel = a.id + "|" + stufeName;
    if (cache[schluessel]) return cache[schluessel];
    var stufe = STUFEN[stufeName];
    var bytes = await K.tresor.anlageLesen(a.id);
    var ziel;
    if (a.mime === "application/pdf") {
      ziel = await lib().PDFDocument.load(bytes, { updateMetadata: false });
      if (stufe) await bilderImPdf(ziel, stufe);
    } else {
      ziel = await lib().PDFDocument.create();
      var png = a.mime === "image/png";
      await bildSeite(ziel, stufe ? await bildVerkleinern(bytes, a.mime, stufe) : bytes, png && !stufe);
    }
    cache[schluessel] = await ziel.save({ useObjectStreams: true });
    return cache[schluessel];
  }

  function deckblatt(eintraege, o, versatz) {
    return {
      pageSize: "A4",
      pageMargins: [70, 80, 57, 50],
      defaultStyle: { font: K.pdf.FAMILIE, fontSize: 11, lineHeight: 1.3, color: "#17202b" },
      content: [
        { text: o.titel, bold: true, fontSize: 22 },
        { text: o.name, color: "#4a5563", margin: [0, 4, 0, 18] },
        {
          layout: "noBorders",
          table: {
            widths: ["*", "auto"],
            body: eintraege.map(function (e) {
              return [e.titel, { text: o.seite + " " + (e.seite + versatz), alignment: "right" }];
            }),
          },
        },
      ],
    };
  }

  async function seitenAnhaengen(ziel, bytes) {
    var quelle = await lib().PDFDocument.load(bytes, { updateMetadata: false });
    var seiten = await ziel.copyPages(quelle, quelle.getPageIndices());
    seiten.forEach(function (s) {
      ziel.addPage(s);
    });
    return seiten.length;
  }

  function metadaten(doc, titel, autor) {
    doc.setTitle(titel);
    doc.setAuthor(autor);
    doc.setCreator("R42J");
    doc.setProducer("R42J");
  }

  K.anlagenPdf = {
    STUFEN: Object.keys(STUFEN),
    MAX_BYTES: MAX_MB * 1024 * 1024,

    // o: { ids (in Reihenfolge), stufe, deckblatt, titel, name, seite }
    erstellen: async function (o) {
      var t = K.tresor.daten();
      var hinweise = [];
      var teile = [];
      for (var i = 0; i < o.ids.length; i++) {
        var a = t.anlagen.filter(function (x) {
          return x.id === o.ids[i];
        })[0];
        if (!a) continue;
        try {
          var bytes = await aufbereiten(a, o.stufe);
          teile.push({ titel: a.titel, bytes: bytes, seiten: await K.pdf.seiten(bytes) });
        } catch (e) {
          if (e && e.schluessel && e.schluessel !== "fehler.unbekannt") throw e;
          hinweise.push({ text: "anlagenPdf.hinweisDefekt", werte: { titel: a.titel } });
        }
      }
      var ziel = await lib().PDFDocument.create();
      metadaten(ziel, o.titel + " " + o.name, o.name);
      var seite = 1;
      var eintraege = teile.map(function (x) {
        var e = { titel: x.titel, seite: seite };
        seite += x.seiten;
        return e;
      });
      if (o.deckblatt && teile.length) {
        var vorschau = await K.pdf.erzeugen(deckblatt(eintraege, o, 1));
        var deckseiten = await K.pdf.seiten(vorschau);
        // Ein Deckblatt über mehrere Seiten verschiebt das Inhaltsverzeichnis.
        if (deckseiten > 1) vorschau = await K.pdf.erzeugen(deckblatt(eintraege, o, deckseiten));
        await seitenAnhaengen(ziel, vorschau);
      }
      for (var j = 0; j < teile.length; j++) await seitenAnhaengen(ziel, teile[j].bytes);
      if (!ziel.getPageCount()) return { bytes: new Uint8Array(0), seiten: 0, hinweise: hinweise };
      var fertig = await ziel.save({ useObjectStreams: true });
      return { bytes: fertig, seiten: ziel.getPageCount(), hinweise: hinweise };
    },

    // Alles in einer PDF (SPEC §6.7): teile sind fertige PDFs in Reihenfolge.
    zusammenfuegen: async function (teile, titel, autor) {
      var ziel = await lib().PDFDocument.create();
      metadaten(ziel, titel, autor);
      for (var i = 0; i < teile.length; i++) await seitenAnhaengen(ziel, teile[i]);
      return ziel.save({ useObjectStreams: true });
    },
  };
})();
