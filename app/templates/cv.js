(function () {
  "use strict";
  var K = window.R42J_CORE;

  // Die einzige Lebenslauf-Vorlage (SPEC §6.5). Einspaltiger Fließtext: Das Foto ist die einzige
  // Nebenspalte, Lesereihenfolge und Textstrom bleiben dadurch gleich.
  var TINTE = "#17202b";
  var GEDAEMPFT = "#4a5563";
  var LINIE = "#d5dbe3";

  // Helle Akzente aus tokens.css: Das Papier ist immer hell, auch wenn die App dunkel läuft.
  K.CV_AKZENTE = { blau: "#1f5fae", petrol: "#0e6870", gruen: "#2a6a3b", violett: "#5847a6", graphit: "#3b4552" };

  var TEXTE = {
    de: {
      kurzprofil: "Kurzprofil",
      kompetenzen: "Kernkompetenzen",
      beruf: "Berufserfahrung",
      ausbildung: "Ausbildung",
      zertifikate: "Zertifikate",
      sprachenIt: "Sprachen & IT",
      interessen: "Interessen",
      sprachen: "Sprachen",
      it: "IT",
      telefon: "Telefon",
      email: "E-Mail",
      abschluss: "Abschluss",
      note: "Note",
      heute: "heute",
      muttersprache: "Muttersprache",
      titel: "Lebenslauf",
    },
    en: {
      kurzprofil: "Summary",
      kompetenzen: "Core Skills",
      beruf: "Work Experience",
      ausbildung: "Education",
      zertifikate: "Certifications",
      sprachenIt: "Languages & IT",
      interessen: "Interests",
      sprachen: "Languages",
      it: "IT",
      telefon: "Phone",
      email: "Email",
      abschluss: "Degree",
      note: "Grade",
      heute: "present",
      muttersprache: "Native",
      titel: "Resume",
    },
  };

  function monat(wert, t) {
    if (!wert) return "";
    if (wert === "heute") return t.heute;
    var m = K.monatLesen(wert);
    return m ? m.slice(5, 7) + "/" + m.slice(0, 4) : "";
  }

  function zeitraum(s, t) {
    var von = monat(s.von, t);
    var bis = monat(s.bis, t);
    return von && bis ? von + " – " + bis : von || bis;
  }

  function adresseZeile(a) {
    if (!a) return "";
    var ort = [a.plz, a.ort].filter(Boolean).join(" ");
    return [a.strasse, ort, a.land].filter(Boolean).join(", ");
  }

  function linkZiel(wert) {
    return /^https:\/\//i.test(wert) ? wert : "https://" + wert.replace(/^(http:\/\/)/i, "");
  }

  function kontakt(p, t) {
    var zeilen = [];
    var adresse = adresseZeile(p.adresse);
    if (adresse) zeilen.push(adresse);
    var erreichbar = [];
    if (p.telefon) erreichbar.push({ text: t.telefon + ": " + p.telefon });
    if (p.email) erreichbar.push({ text: t.email + ": " + p.email, link: "mailto:" + p.email });
    var links = [p.linkedin, p.xing, p.website].filter(Boolean).map(function (w) {
      return { text: w, link: linkZiel(w) };
    });
    [erreichbar, links].forEach(function (teile) {
      if (!teile.length) return;
      var zeile = [];
      teile.forEach(function (x, i) {
        if (i) zeile.push(" | ");
        zeile.push(x);
      });
      zeilen.push({ text: zeile });
    });
    return zeilen.map(function (z) {
      return { text: typeof z === "string" ? z : z.text, style: "kontakt" };
    });
  }

  function kopf(d, t) {
    var p = d.profil;
    var name = [p.titel, p.vorname, p.nachname].filter(Boolean).join(" ");
    var text = { stack: [{ text: name, style: "name" }].concat(kontakt(p, t)), width: "*" };
    if (!d.foto) return text;
    return {
      columns: [text, { image: d.foto, fit: [90, 120], width: 90, alignment: "right" }],
      columnGap: 16,
    };
  }

  // Die Linie ist Vektorgrafik und kommt im Textstrom nicht vor.
  function ueberschrift(text, akzent) {
    return [
      { text: text, style: "abschnitt", color: akzent },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 481, y2: 0, lineWidth: 0.75, lineColor: LINIE }], margin: [0, 2, 0, 5] },
    ];
  }

  function abschnitt(titel, bloecke, akzent) {
    if (!bloecke.length) return [];
    // Die Überschrift bleibt beim ersten Eintrag und damit nie allein am Seitenende.
    var erster = { stack: ueberschrift(titel, akzent).concat([bloecke[0]]), unbreakable: true, margin: [0, 10, 0, 0] };
    return [erster].concat(bloecke.slice(1));
  }

  function station(s, t) {
    var teile = [{ text: s.titel, style: "eintrag" }];
    var ort = [s.organisation, s.ort].filter(Boolean).join(", ");
    if (ort) teile.push({ text: ort });
    var zeit = zeitraum(s, t);
    if (zeit) teile.push({ text: zeit, style: "zeit" });
    if (s.beschreibung) teile.push({ text: s.beschreibung, margin: [0, 2, 0, 0] });
    var abschluss = [s.abschluss && t.abschluss + ": " + s.abschluss, s.note && t.note + ": " + s.note].filter(Boolean).join(" | ");
    if (abschluss) teile.push({ text: abschluss });
    if (s.stichpunkte.length) teile.push({ ul: s.stichpunkte, margin: [0, 2, 0, 0] });
    return { stack: teile, unbreakable: true, margin: [0, 0, 0, 7] };
  }

  function zeile(text) {
    return { stack: [{ text: text }], unbreakable: true, margin: [0, 0, 0, 3] };
  }

  K.cvVorlage = function (d) {
    var t = TEXTE[d.sprache];
    var akzent = K.CV_AKZENTE[d.akzent] || K.CV_AKZENTE.blau;
    var name = [d.profil.vorname, d.profil.nachname].filter(Boolean).join(" ");

    var sprachen = d.sprachen.map(function (s) {
      return s.sprache + " (" + (s.niveau === "Muttersprache" ? t.muttersprache : s.niveau) + ")";
    });
    var sprachenIt = [];
    if (sprachen.length) sprachenIt.push(zeile(t.sprachen + ": " + sprachen.join(", ")));
    if (d.it.length) sprachenIt.push(zeile(t.it + ": " + d.it.join(", ")));

    var inhalt = [kopf(d, t)];
    inhalt = inhalt.concat(
      abschnitt(t.kurzprofil, d.kurzprofil ? [zeile(d.kurzprofil)] : [], akzent),
      abschnitt(t.kompetenzen, d.kompetenzen.length ? [zeile(d.kompetenzen.join(" | "))] : [], akzent),
      abschnitt(t.beruf, d.beruf.map(function (s) { return station(s, t); }), akzent),
      abschnitt(t.ausbildung, d.ausbildung.map(function (s) { return station(s, t); }), akzent),
      abschnitt(
        t.zertifikate,
        d.zertifikate.map(function (z) {
          return zeile([z.name, z.aussteller, monat(z.datum, t)].filter(Boolean).join(", "));
        }),
        akzent,
      ),
      abschnitt(t.sprachenIt, sprachenIt, akzent),
      abschnitt(t.interessen, d.interessen.length ? [zeile(d.interessen.join(", "))] : [], akzent),
    );

    return {
      pageSize: "A4",
      pageMargins: [57, 50, 57, 50],
      language: d.sprache === "de" ? "de-DE" : "en-GB",
      info: { title: t.titel + " " + name, author: name, subject: t.titel, creator: "R42J", keywords: d.kompetenzen.join(", ") },
      defaultStyle: { font: K.pdf.FAMILIE, fontSize: 10.5, lineHeight: 1.2, color: TINTE },
      styles: {
        name: { fontSize: 22, bold: true, margin: [0, 0, 0, 4] },
        kontakt: { color: GEDAEMPFT },
        abschnitt: { fontSize: 12, bold: true },
        eintrag: { bold: true },
        zeit: { color: GEDAEMPFT },
      },
      content: inhalt,
    };
  };
})();
