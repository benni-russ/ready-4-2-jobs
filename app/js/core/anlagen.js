(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_BYTES = 20 * 1024 * 1024;

  K.ANLAGE_KATEGORIEN = ["zeugnis-schule", "zeugnis-arbeit", "zertifikat", "foto", "unterschrift", "sonstiges"];

  // Der Inhalt entscheidet über den Typ, nicht Endung oder Browser-Angabe.
  function typErkennen(b) {
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    return null;
  }

  async function seitenZaehlen(bytes) {
    try {
      var pdf = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      return pdf.getPageCount();
    } catch (e) {
      return undefined;
    }
  }

  K.anlagen = {
    // Erst die Datei, dann die Metadaten: Bricht es dazwischen ab, zeigt kein Eintrag ins Leere.
    hinzufuegen: async function (datei) {
      if (datei.size > MAX_BYTES) throw K.Fehler("fehler.anlageGross");
      var bytes = new Uint8Array(await datei.arrayBuffer());
      var mime = typErkennen(bytes);
      if (!mime) throw K.Fehler("fehler.anlageTyp");
      var eintrag = {
        id: K.uuid(),
        dateiname: datei.name,
        mime: mime,
        groesse: datei.size,
        kategorie: "sonstiges",
        titel: datei.name.replace(/\.[^.]+$/, ""),
        tags: [],
      };
      if (mime === "application/pdf") {
        var seiten = await seitenZaehlen(bytes);
        if (seiten) eintrag.seiten = seiten;
      }
      await K.tresor.anlageSchreiben(eintrag.id, bytes);
      K.stammdaten.speichern("anlagen", eintrag);
      await K.tresor.speichernJetzt();
      return eintrag;
    },

    // Umgekehrte Reihenfolge wie beim Anlegen: Eine verwaiste Datei stört nicht, ein toter Verweis schon.
    loeschen: async function (id) {
      K.stammdaten.loeschen("anlagen", id);
      await K.tresor.speichernJetzt();
      await K.tresor.anlageLoeschen(id);
    },

    meta: function (a) {
      var teile = [a.mime === "application/pdf" ? "PDF" : a.mime === "image/png" ? "PNG" : "JPG", K.groesseText(a.groesse)];
      if (a.seiten) teile.push(K.t(a.seiten === 1 ? "anlagen.eineSeite" : "anlagen.seiten", { n: a.seiten }));
      teile.push(K.t("anlagen.kategorie." + a.kategorie));
      return teile.join(" · ");
    },

    auswahl: function (kategorien) {
      return K.tresor.daten().anlagen.filter(function (a) {
        return !kategorien || kategorien.indexOf(a.kategorie) > -1;
      });
    },
  };
})();
