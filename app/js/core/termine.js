(function () {
  "use strict";
  var K = window.R42J_CORE;

  var CRLF = "\r\n";
  var ZEILE_OKTETTE = 75;
  var SPAETER_TAGE = 7;
  var VORLAUF_TAGE = 7;
  var KEINE_ANTWORT_TAGE = 42;
  var TAG_MS = 24 * 60 * 60 * 1000;
  var OFFEN = ["versendet", "rueckfrage_gesendet"];

  K.TERMIN_ARTEN = ["telefon", "digital", "vor_ort", "test", "sonstiges"];

  function kalenderTag(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  // Zählt Kalendertage, damit die Uhrzeit des Versands keine Rolle spielt. Round fängt die Zeitumstellung ab.
  K.tageSeit = function (iso, jetzt) {
    return Math.round((kalenderTag(jetzt || new Date()) - kalenderTag(new Date(iso))) / TAG_MS);
  };

  function textMaskieren(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n")
      .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  }

  // RFC 5545 3.1: höchstens 75 Oktette je Zeile, ohne ein UTF-8-Zeichen zu zerteilen.
  function falten(zeile) {
    var kodierer = new TextEncoder();
    var teile = [];
    var aktuell = "";
    var oktette = 0;
    Array.from(zeile).forEach(function (zeichen) {
      var n = kodierer.encode(zeichen).length;
      var grenze = teile.length ? ZEILE_OKTETTE - 1 : ZEILE_OKTETTE;
      if (oktette + n > grenze) {
        teile.push(aktuell);
        aktuell = "";
        oktette = 0;
      }
      aktuell += zeichen;
      oktette += n;
    });
    teile.push(aktuell);
    return teile.join(CRLF + " ");
  }

  function icsZeit(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function titel(t, b) {
    return K.t("termin.art." + t.art) + ": " + b.firma.name;
  }

  function beschreibung(t, b) {
    return [b.stelle.titel, t.link, t.notiz].filter(Boolean).join("\n");
  }

  function einzeilig(s) {
    return String(s || "")
      .split(/\r?\n/)
      .map(function (z) {
        return z.trim();
      })
      .filter(Boolean)
      .join(", ");
  }

  function abfrage(paare) {
    return paare
      .filter(function (p) {
        return p[1];
      })
      .map(function (p) {
        return p[0] + "=" + encodeURIComponent(p[1]);
      })
      .join("&");
  }

  function terminOrt(t, b) {
    return einzeilig(t.ort || (t.art === "vor_ort" ? b.firma.adresse : ""));
  }

  K.termine = {
    speichern: function (bewerbungId, termin) {
      K.bewerbungen.aendern(bewerbungId, function (b) {
        var i = b.termine.findIndex(function (t) {
          return t.id === termin.id;
        });
        if (i > -1) b.termine[i] = termin;
        else b.termine.push(Object.assign({}, termin, { id: K.uuid() }));
        b.termine.sort(function (x, y) {
          return x.start < y.start ? -1 : 1;
        });
      });
    },

    loeschen: function (bewerbungId, terminId) {
      K.bewerbungen.aendern(bewerbungId, function (b) {
        b.termine = b.termine.filter(function (t) {
          return t.id !== terminId;
        });
      });
    },

    naechster: function (b, jetzt) {
      var grenze = (jetzt || new Date()).toISOString();
      return b.termine.filter(function (t) {
        return t.start >= grenze;
      })[0];
    },

    ort: terminOrt,

    dateiname: function (t, b) {
      return K.dateiname(["termin", b.firma.name, t.start.slice(0, 10)], "ics");
    },

    ics: function (t, b, jetzt) {
      var zeilen = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//R42J//Ready 4 2 Jobs//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:" + t.id + "@r42j.invalid",
        "DTSTAMP:" + icsZeit((jetzt || new Date()).toISOString()),
        "DTSTART:" + icsZeit(t.start),
        "DTEND:" + icsZeit(t.ende),
        "SUMMARY:" + textMaskieren(titel(t, b)),
      ];
      var ort = terminOrt(t, b);
      if (ort) zeilen.push("LOCATION:" + textMaskieren(ort));
      var text = beschreibung(t, b);
      if (text) zeilen.push("DESCRIPTION:" + textMaskieren(text));
      zeilen.push("END:VEVENT", "END:VCALENDAR");
      return new TextEncoder().encode(zeilen.map(falten).join(CRLF) + CRLF);
    },

    googleLink: function (t, b) {
      return (
        "https://calendar.google.com/calendar/render?" +
        abfrage([
          ["action", "TEMPLATE"],
          ["text", titel(t, b)],
          ["dates", icsZeit(t.start) + "/" + icsZeit(t.ende)],
          ["details", beschreibung(t, b)],
          ["location", terminOrt(t, b)],
        ])
      );
    },

    outlookLink: function (t, b) {
      return (
        "https://outlook.live.com/calendar/0/deeplink/compose?" +
        abfrage([
          ["path", "/calendar/action/compose"],
          ["rru", "addevent"],
          ["startdt", new Date(t.start).toISOString()],
          ["enddt", new Date(t.ende).toISOString()],
          ["subject", titel(t, b)],
          ["body", beschreibung(t, b)],
          ["location", terminOrt(t, b)],
        ])
      );
    },

    // Ohne Ziel gibt es keinen Link. Ohne eigene Adresse startet Google am aktuellen Standort.
    mapsLink: function (ziel) {
      var nachOrt = einzeilig(ziel);
      if (!nachOrt) return null;
      var a = K.tresor.daten().profil.adresse || {};
      var start = [a.strasse, [a.plz, a.ort].filter(Boolean).join(" "), a.land].filter(Boolean).join(", ");
      return "https://www.google.com/maps/dir/?" + abfrage([["api", "1"], ["origin", start], ["destination", nachOrt]]);
    },
  };

  function verschoben(b, art, jetzt) {
    var bis = b.spaeter && b.spaeter[art];
    return !!bis && new Date(bis) > (jetzt || new Date());
  }

  K.erinnerungen = {
    // Termine zuerst: Sie haben ein festes Datum, Rückfragen können warten.
    liste: function (jetzt) {
      var nun = jetzt || new Date();
      var d = K.tresor.daten();
      var termine = [];
      var offene = [];
      var bisTermin = new Date(nun.getTime() + VORLAUF_TAGE * TAG_MS).toISOString();
      d.bewerbungen.forEach(function (b) {
        b.termine.forEach(function (t) {
          if (t.start >= nun.toISOString() && t.start <= bisTermin) termine.push({ art: "termin", bewerbung: b, termin: t });
        });
        var status = K.bewerbungen.aktuellerStatus(b);
        if (OFFEN.indexOf(status) === -1) return;
        var tage = K.tageSeit(b.status[b.status.length - 1].datum, nun);
        if (tage >= KEINE_ANTWORT_TAGE) {
          if (!verschoben(b, "keineAntwort", nun)) offene.push({ art: "keineAntwort", bewerbung: b, tage: tage });
          return;
        }
        if (K.bewerbungen.anzeigeStatus(b, nun) === "rueckfrage_faellig" && !verschoben(b, "rueckfrage", nun)) {
          offene.push({ art: "rueckfrage", bewerbung: b, tage: tage });
        }
      });
      termine.sort(function (x, y) {
        return x.termin.start < y.termin.start ? -1 : 1;
      });
      offene.sort(function (x, y) {
        return y.tage - x.tage;
      });
      return termine.concat(offene);
    },

    spaeter: function (art, bewerbungId) {
      K.bewerbungen.aendern(bewerbungId, function (b) {
        b.spaeter = Object.assign({}, b.spaeter);
        b.spaeter[art] = new Date(Date.now() + SPAETER_TAGE * TAG_MS).toISOString();
      });
    },
  };
})();
