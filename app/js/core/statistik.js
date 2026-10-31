(function () {
  "use strict";
  var K = window.R42J_CORE;

  var WOCHEN = 8;
  var MONATE = 12;
  var ZUSAGE = ["angenommen", "probezeit_bestanden"];
  var VERTRAG = ["vertrag_erhalten", "vertrag_unterzeichnet"].concat(ZUSAGE);
  var GESPRAECH = ["telefoninterview", "gespraech_digital", "gespraech_vor_ort", "einstellungstest"].concat(VERTRAG);
  var ANTWORT = GESPRAECH.concat(["absage"]);
  var NICHT_VERSENDET = ["vorbereitung", "zurueckgezogen"];
  var AUSGANG = ["absage", "keine_antwort", "zurueckgezogen"];

  function hatStatus(b, liste) {
    return b.status.some(function (e) {
      return liste.indexOf(e.status) > -1;
    });
  }

  // Wer einen Schritt nach dem Versand einträgt, hat auch versendet, selbst ohne eigenen Eintrag dafür.
  function versandDatum(b) {
    if (b.versendetAm) return b.versendetAm;
    var erster = b.status.filter(function (e) {
      return NICHT_VERSENDET.indexOf(e.status) === -1;
    })[0];
    return erster ? erster.datum : null;
  }

  function antwortTage(b) {
    var ab = versandDatum(b);
    var antwort = b.status.filter(function (e) {
      return ANTWORT.indexOf(e.status) > -1 && new Date(e.datum) >= new Date(ab);
    })[0];
    return antwort ? K.tageSeit(ab, new Date(antwort.datum)) : null;
  }

  function anteil(teil, basis) {
    return { teil: teil, basis: basis, prozent: basis ? Math.round((teil / basis) * 100) : null };
  }

  function gruppieren(versendete, schluessel) {
    var gruppen = {};
    versendete.forEach(function (b) {
      var g = schluessel(b);
      gruppen[g.id] = gruppen[g.id] || { id: g.id, name: g.name, versendet: 0, eingeladen: 0 };
      gruppen[g.id].versendet++;
      if (hatStatus(b, GESPRAECH)) gruppen[g.id].eingeladen++;
    });
    return Object.keys(gruppen)
      .map(function (id) {
        var g = gruppen[id];
        g.quote = anteil(g.eingeladen, g.versendet);
        return g;
      })
      .sort(function (a, b) {
        return b.versendet - a.versendet || a.name.localeCompare(b.name);
      });
  }

  function montag(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  }

  function kalenderwoche(d) {
    // In UTC gerechnet, sonst verschiebt die Sommerzeit das Ergebnis um eine Stunde.
    var donnerstag = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 3));
    var erster = Date.UTC(donnerstag.getUTCFullYear(), 0, 1);
    return Math.floor((donnerstag - erster) / 864e5 / 7) + 1;
  }

  function wochen(jetzt) {
    var heute = montag(jetzt);
    var liste = [];
    for (var i = WOCHEN - 1; i >= 0; i--) {
      var von = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - i * 7);
      liste.push({
        von: von,
        bis: new Date(von.getFullYear(), von.getMonth(), von.getDate() + 7),
        label: K.t("statistik.kw", { nr: kalenderwoche(von) }),
      });
    }
    return liste;
  }

  function monate(jetzt) {
    var format = new Intl.DateTimeFormat(K.sprache(), { month: "short" });
    var liste = [];
    for (var i = MONATE - 1; i >= 0; i--) {
      var von = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
      liste.push({ von: von, bis: new Date(von.getFullYear(), von.getMonth() + 1, 1), label: format.format(von) });
    }
    return liste;
  }

  function zaehlen(zeiten, versendete) {
    return zeiten.map(function (z) {
      var wert = versendete.filter(function (b) {
        var d = new Date(versandDatum(b));
        return d >= z.von && d < z.bis;
      }).length;
      return { label: z.label, wert: wert };
    });
  }

  K.statistik = {
    AUSGANG: AUSGANG,

    auswerten: function (bewerbungen, ausrichtungen, jetzt) {
      var zeit = jetzt || new Date();
      var versendete = bewerbungen.filter(versandDatum);
      var eingeladen = versendete.filter(function (b) {
        return hatStatus(b, GESPRAECH);
      });
      var tage = versendete.map(antwortTage).filter(function (t) {
        return t !== null;
      });
      var summe = tage.reduce(function (s, t) {
        return s + t;
      }, 0);
      var namen = {};
      ausrichtungen.forEach(function (a) {
        namen[a.id] = a.name;
      });
      var ausgang = {};
      AUSGANG.forEach(function (s) {
        ausgang[s] = bewerbungen.filter(function (b) {
          return K.bewerbungen.aktuellerStatus(b) === s;
        }).length;
      });

      return {
        gesamt: bewerbungen.length,
        versendet: versendete.length,
        einladung: anteil(eingeladen.length, versendete.length),
        zusage: anteil(
          versendete.filter(function (b) {
            return hatStatus(b, ZUSAGE);
          }).length,
          versendete.length,
        ),
        antwortTage: tage.length ? Math.round(summe / tage.length) : null,
        antworten: tage.length,
        proWoche: zaehlen(wochen(zeit), versendete),
        proMonat: zaehlen(monate(zeit), versendete),
        proAusrichtung: gruppieren(versendete, function (b) {
          var name = namen[b.ausrichtungId];
          return name ? { id: b.ausrichtungId, name: name } : { id: "", name: K.t("statistik.ohneAusrichtung") };
        }),
        proQuelle: gruppieren(versendete, function (b) {
          var name = ((b.stelle && b.stelle.quelle) || "").trim();
          return name ? { id: name.toLowerCase(), name: name } : { id: "", name: K.t("statistik.ohneQuelle") };
        }),
        trichter: [
          { id: "erfasst", wert: bewerbungen.length },
          { id: "versendet", wert: versendete.length },
          { id: "gespraech", wert: eingeladen.length },
          { id: "vertrag", wert: versendete.filter(function (b) { return hatStatus(b, VERTRAG); }).length },
          { id: "zusage", wert: versendete.filter(function (b) { return hatStatus(b, ZUSAGE); }).length },
        ],
        ausgang: ausgang,
      };
    },
  };
})();
