(function () {
  "use strict";
  var K = window.R42J_CORE;

  // „muller“, „mueller“ und „Müller“ werden gleich.
  K.normalisieren = function (s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ae/g, "a")
      .replace(/oe/g, "o")
      .replace(/ue/g, "u")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  K.uuid = function () {
    return window.crypto.randomUUID();
  };

  // Zeigt die aktuelle Sprache, sonst die vorhandene Fassung.
  K.i18nText = function (o) {
    if (!o) return "";
    return o[K.sprache()] || o.de || o.en || "";
  };

  K.i18nLuecke = function (o) {
    return !!o && !!(o.de || "").trim() !== !!(o.en || "").trim();
  };

  // Aus Monatsfeld und KI-Antwort: "3.2021", "03/2021", "2021-03" oder "2021" werden zu JJJJ-MM.
  K.monatLesen = function (text) {
    var s = String(text || "").trim();
    var m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(s);
    if (m) return K.monatBauen(m[1], m[2]);
    m = /^(\d{1,2})[./-](\d{4})$/.exec(s);
    if (m) return K.monatBauen(m[2], m[1]);
    m = /^\d{1,2}\.(\d{1,2})\.(\d{4})$/.exec(s);
    if (m) return K.monatBauen(m[2], m[1]);
    if (/^\d{4}$/.test(s)) return s + "-01";
    return null;
  };

  K.monatBauen = function (jahr, monat) {
    var n = +monat;
    if (n < 1 || n > 12) return null;
    return jahr + "-" + (n < 10 ? "0" : "") + n;
  };

  K.monatAnzeige = function (wert) {
    if (!wert) return "";
    if (wert === "heute") return K.t("station.heute");
    var t = wert.split("-");
    return t[1] + "/" + t[0];
  };

  K.zeitraum = function (station) {
    var von = K.monatAnzeige(station.von);
    var bis = K.monatAnzeige(station.bis);
    return bis ? von + " – " + bis : von;
  };

  K.groesseText = function (bytes) {
    var mb = bytes / (1024 * 1024);
    var zahl = mb >= 1 ? mb : bytes / 1024;
    var text = zahl.toLocaleString(K.sprache() === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: mb >= 1 ? 1 : 0 });
    return text + (mb >= 1 ? " MB" : " KB");
  };

  // Alle Listen mit Ausrichtungs-Tags (SPEC §6.2).
  var MIT_AUSRICHTUNG = ["stationen", "erfolge", "kompetenzen", "zertifikate", "interessen"];

  function ohne(liste, id) {
    return (liste || []).filter(function (x) {
      return x !== id;
    });
  }

  K.stammdaten = {
    speichern: function (name, eintrag) {
      K.tresor.aendern(function (d) {
        var i = d[name].findIndex(function (e) {
          return e.id === eintrag.id;
        });
        if (i > -1) d[name][i] = eintrag;
        else d[name].push(eintrag);
      });
    },

    // Entfernt den Eintrag und alle Verweise darauf, damit nichts ins Leere zeigt.
    loeschen: function (name, id) {
      K.tresor.aendern(function (d) {
        d[name] = d[name].filter(function (e) {
          return e.id !== id;
        });
        if (name === "ausrichtungen") {
          MIT_AUSRICHTUNG.forEach(function (l) {
            d[l].forEach(function (e) {
              e.ausrichtungen = ohne(e.ausrichtungen, id);
            });
          });
        }
        if (name === "kompetenzen") {
          d.ausrichtungen.forEach(function (a) {
            a.kernkompetenzen = ohne(a.kernkompetenzen, id);
          });
          d.erfolge.forEach(function (e) {
            e.kompetenzen = ohne(e.kompetenzen, id);
          });
        }
        if (name === "stationen") {
          d.erfolge.forEach(function (e) {
            if (e.stationId === id) e.stationId = "";
          });
        }
        if (name === "anlagen") {
          d.stationen.forEach(function (s) {
            s.anlagen = ohne(s.anlagen, id);
          });
          d.zertifikate.forEach(function (z) {
            if (z.anlageId === id) delete z.anlageId;
          });
          if (d.profil.foto === id) delete d.profil.foto;
          if (d.profil.unterschrift === id) delete d.profil.unterschrift;
        }
      });
    },

    allenZuordnen: function (ausrichtungId) {
      K.tresor.aendern(function (d) {
        MIT_AUSRICHTUNG.forEach(function (l) {
          d[l].forEach(function (e) {
            if (e.ausrichtungen.indexOf(ausrichtungId) === -1) e.ausrichtungen.push(ausrichtungId);
          });
        });
      });
    },

    hatEintraege: function () {
      var d = K.tresor.daten();
      return MIT_AUSRICHTUNG.some(function (l) {
        return d[l].length > 0;
      });
    },

    kompetenzAnlegen: function (name) {
      var eintrag = { id: K.uuid(), name: K.i18nNeu(name), synonyme: [], kategorie: "sonstige", ausrichtungen: [] };
      K.stammdaten.speichern("kompetenzen", eintrag);
      return eintrag.id;
    },
  };

  K.i18nNeu = function (text) {
    var o = {};
    o[K.sprache()] = text;
    return o;
  };
})();
