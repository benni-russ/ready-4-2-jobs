(function () {
  "use strict";
  var K = window.R42J_CORE;

  var FEIERTAGSWOCHEN = 2;
  var MIN_ANGEBOTE = 2;
  var MAX_ANGEBOTE = 5;
  var NEUTRAL = 5;

  var STANDARD = [
    { id: "gehalt", gewicht: 4, typ: "auto" },
    { id: "stundenlohn", gewicht: 4, typ: "auto" },
    { id: "fahrtweg", gewicht: 3, typ: "auto" },
    { id: "homeoffice", gewicht: 2, typ: "auto" },
    { id: "urlaub", gewicht: 2, typ: "auto" },
    { id: "boni", gewicht: 1, typ: "auto" },
    { id: "sicherheit", gewicht: 3, typ: "manuell" },
    { id: "bauchgefuehl", gewicht: 3, typ: "manuell" },
  ];

  // artikel sind die Kennungen der Wissensartikel aus SPEC §6.13, M8 liefert sie aus.
  var PRUEFLISTE = [
    { id: "probezeit", artikel: "arbeitsvertrag-pruefen" },
    { id: "kuendigungsfrist", artikel: "kuendigungsfristen" },
    { id: "ueberstunden", artikel: "arbeitsvertrag-pruefen" },
    { id: "befristung", artikel: "arbeitsvertrag-pruefen" },
    { id: "wettbewerbsverbot", artikel: "arbeitsvertrag-pruefen" },
    { id: "rueckzahlung", artikel: "arbeitsvertrag-pruefen" },
    { id: "versetzung", artikel: "arbeitsvertrag-pruefen" },
  ];

  var RECHENFELDER = ["bruttoJahr", "wochenstunden", "urlaubstage", "praesenzTage", "pendelMinutenEinfach"];

  function zahl(w) {
    return typeof w === "number" && isFinite(w) ? w : null;
  }

  function arbeitswochen(a, feiertagsWochen) {
    var urlaub = zahl(a.urlaubstage);
    if (urlaub === null) return null;
    var wochen = 52 - urlaub / 5 - feiertagsWochen;
    return wochen > 0 ? wochen : null;
  }

  function pendelStunden(a) {
    var minuten = zahl(a.pendelMinutenEinfach);
    var tage = zahl(a.praesenzTage);
    return minuten === null || tage === null ? null : (2 * minuten * tage) / 60;
  }

  // Ohne alle Rechenfelder gibt es kein Ergebnis statt eines falschen. Bonus und Pendelkosten sind freiwillig.
  function stundenlohn(a, feiertagsWochen) {
    var brutto = zahl(a.bruttoJahr);
    var stunden = zahl(a.wochenstunden);
    var wochen = arbeitswochen(a, feiertagsWochen);
    var pendel = pendelStunden(a);
    if (brutto === null || stunden === null || wochen === null || pendel === null) return null;
    var teiler = wochen * (stunden + pendel);
    if (!(teiler > 0)) return null;
    return (brutto + (zahl(a.bonusJahr) || 0) - (zahl(a.pendelKostenMonat) || 0) * 12) / teiler;
  }

  function autoWert(id, a, feiertagsWochen) {
    if (id === "gehalt") return zahl(a.bruttoJahr);
    if (id === "stundenlohn") return stundenlohn(a, feiertagsWochen);
    if (id === "fahrtweg") return pendelStunden(a);
    if (id === "homeoffice") return zahl(a.homeofficeTage);
    if (id === "urlaub") return zahl(a.urlaubstage);
    return zahl(a.bonusJahr) || 0;
  }

  // Sind alle Werte gleich, unterscheidet das Kriterium die Angebote nicht: alle bekommen die Mitte.
  function normieren(werte, kleinerBesser) {
    var da = werte.filter(function (w) {
      return w !== null;
    });
    var min = Math.min.apply(null, da);
    var max = Math.max.apply(null, da);
    return werte.map(function (w) {
      if (w === null) return null;
      if (max === min) return NEUTRAL;
      return (10 * (kleinerBesser ? max - w : w - min)) / (max - min);
    });
  }

  function beste(werte, kleinerBesser) {
    var da = werte.filter(function (w) {
      return w !== null;
    });
    var ziel = kleinerBesser ? Math.min.apply(null, da) : Math.max.apply(null, da);
    var unterschied = da.some(function (w) {
      return w !== ziel;
    });
    return werte.map(function (w) {
      return unterschied && w === ziel;
    });
  }

  // eintraege: [{ id, angebot }]. Liefert die Rangfolge, ohne Wertung am Ende.
  function wertung(eintraege, kriterien, feiertagsWochen) {
    var aktiv = kriterien.filter(function (k) {
      return k.gewicht > 0;
    });
    var teilwerte = {};
    aktiv.forEach(function (k) {
      teilwerte[k.id] =
        k.typ === "auto"
          ? normieren(
              eintraege.map(function (e) {
                return autoWert(k.id, e.angebot, feiertagsWochen);
              }),
              k.id === "fahrtweg",
            )
          : eintraege.map(function (e) {
              var w = zahl((e.angebot.bewertungen || {})[k.id]);
              return w === null ? NEUTRAL : w;
            });
    });
    var liste = eintraege.map(function (e, i) {
      var summe = 0;
      var gewichte = 0;
      var fehlend = [];
      aktiv.forEach(function (k) {
        var w = teilwerte[k.id][i];
        if (w === null) return fehlend.push(k.id);
        summe += k.gewicht * w;
        gewichte += k.gewicht;
      });
      return { id: e.id, punkte: gewichte ? summe / gewichte : null, fehlend: fehlend, platz: null };
    });
    liste.sort(function (x, y) {
      if (x.punkte === null) return y.punkte === null ? 0 : 1;
      if (y.punkte === null) return -1;
      return y.punkte - x.punkte;
    });
    liste.forEach(function (e, i) {
      if (e.punkte === null) return;
      var gleich = i > 0 && Math.abs(liste[i - 1].punkte - e.punkte) < 1e-9;
      e.platz = gleich ? liste[i - 1].platz : i + 1;
    });
    return liste;
  }

  // „46.000“ ist auf Deutsch sechsundvierzigtausend, „38.5“ bleibt ein Dezimalwert. Englisch umgekehrt.
  function zahlLesen(text, sprache) {
    var t = String(text).replace(/\s/g, "");
    if (!t) return null;
    var tausender = sprache === "en" ? "," : ".";
    var dezimal = sprache === "en" ? "." : ",";
    var gruppiert = new RegExp("^\\d{1,3}(\\" + tausender + "\\d{3})+(\\" + dezimal + "\\d+)?$");
    if (gruppiert.test(t)) t = t.split(tausender).join("");
    t = t.replace(",", ".");
    return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  }

  function neuesAngebot() {
    return { zusatzleistungen: [], achtenAuf: [], bewertungen: {}, pruefliste: {} };
  }

  function angebotAendern(id, aufgabe) {
    K.bewerbungen.aendern(id, function (b) {
      if (!b.angebot) b.angebot = neuesAngebot();
      aufgabe(b.angebot);
    });
  }

  function gespeicherteKriterien(d) {
    if (!d.gewichtung.kriterien.length) d.gewichtung.kriterien = K.vergleich.kriterien();
    return d.gewichtung.kriterien;
  }

  K.vergleich = {
    MIN_ANGEBOTE: MIN_ANGEBOTE,
    MAX_ANGEBOTE: MAX_ANGEBOTE,
    RECHENFELDER: RECHENFELDER,
    PRUEFLISTE: PRUEFLISTE,

    arbeitswochen: arbeitswochen,
    pendelStunden: pendelStunden,
    stundenlohn: stundenlohn,
    normieren: normieren,
    beste: beste,
    wertung: wertung,
    zahlLesen: zahlLesen,

    feiertagsWochen: function () {
      var w = K.tresor.daten().einstellungen.feiertagsWochen;
      return zahl(w) === null ? FEIERTAGSWOCHEN : w;
    },

    fehlendeFelder: function (a) {
      return RECHENFELDER.filter(function (f) {
        return zahl(a[f]) === null;
      });
    },

    mitAngebot: function () {
      return K.tresor
        .daten()
        .bewerbungen.filter(function (b) {
          return b.angebot;
        })
        .sort(function (x, y) {
          return y.erstellt.localeCompare(x.erstellt);
        });
    },

    kriterien: function () {
      var gespeichert = K.tresor.daten().gewichtung.kriterien;
      if (gespeichert.length) return gespeichert;
      return STANDARD.map(function (k) {
        return { id: k.id, name: K.t("vergleich.kriterium." + k.id), gewicht: k.gewicht, typ: k.typ };
      });
    },

    istStandard: function (id) {
      return STANDARD.some(function (k) {
        return k.id === id;
      });
    },

    kriteriumName: function (k) {
      return K.vergleich.istStandard(k.id) ? K.t("vergleich.kriterium." + k.id) : k.name;
    },

    gewichtSetzen: function (id, gewicht) {
      K.tresor.aendern(function (d) {
        gespeicherteKriterien(d).forEach(function (k) {
          if (k.id === id) k.gewicht = gewicht;
        });
      });
    },

    kriteriumNeu: function (name) {
      K.tresor.aendern(function (d) {
        gespeicherteKriterien(d).push({ id: K.uuid(), name: name, gewicht: 3, typ: "manuell" });
      });
    },

    kriteriumLoeschen: function (id) {
      K.tresor.aendern(function (d) {
        d.gewichtung.kriterien = gespeicherteKriterien(d).filter(function (k) {
          return k.id !== id;
        });
        d.bewerbungen.forEach(function (b) {
          if (b.angebot) delete b.angebot.bewertungen[id];
        });
      });
    },

    angebotSpeichern: function (id, felder) {
      angebotAendern(id, function (a) {
        Object.assign(a, felder);
      });
    },

    angebotLoeschen: function (id) {
      K.bewerbungen.aendern(id, function (b) {
        delete b.angebot;
      });
    },

    bewertungSetzen: function (id, kriteriumId, wert) {
      angebotAendern(id, function (a) {
        a.bewertungen[kriteriumId] = wert;
      });
    },

    achtenAufSetzen: function (id, liste) {
      angebotAendern(id, function (a) {
        a.achtenAuf = liste;
      });
    },

    prueflisteSetzen: function (id, punkt, wert) {
      angebotAendern(id, function (a) {
        a.pruefliste[punkt] = wert;
      });
    },
  };
})();
