(function () {
  "use strict";
  var K = window.R42J_CORE;

  var DEEPL_MAX = 1500;
  var DATEI_MAX = 2 * 1024 * 1024;
  var LISTEN = ["ausrichtungen", "erfolge", "kompetenzen", "interessen"];
  var I18N_FELDER = [
    ["ausrichtungen", "kurzprofil"],
    ["stationen", "titel"],
    ["stationen", "beschreibung"],
    ["erfolge", "situation"],
    ["erfolge", "aufgabe"],
    ["erfolge", "aktion"],
    ["erfolge", "ergebnis"],
    ["erfolge", "cvStichpunkt"],
    ["kompetenzen", "name"],
    ["interessen", "text"],
  ];

  var SCHEMA = {
    sprache: { typ: "text", erlaubt: ["de", "en"] },
    ausrichtungen: {
      typ: "liste",
      eintrag: {
        name: { typ: "text", pflicht: true },
        kurzprofil: { typ: "text" },
        kernkompetenzen: { typ: "liste" },
      },
    },
    erfolge: {
      typ: "liste",
      eintrag: {
        station: { typ: "text" },
        situation: { typ: "text" },
        aufgabe: { typ: "text" },
        aktion: { typ: "text" },
        ergebnis: { typ: "text" },
        kennzahl: { typ: "text" },
        cvStichpunkt: { typ: "text", pflicht: true },
        kompetenzen: { typ: "liste" },
        ausrichtungen: { typ: "liste" },
      },
    },
    kompetenzen: {
      typ: "liste",
      eintrag: {
        name: { typ: "text", pflicht: true },
        synonyme: { typ: "liste" },
        kategorie: { typ: "text", erlaubt: ["fach", "methode", "sozial", "it", "sonstige"] },
        ausrichtungen: { typ: "liste" },
      },
    },
    interessen: {
      typ: "liste",
      eintrag: {
        text: { typ: "text", pflicht: true },
        ausrichtungen: { typ: "liste" },
      },
    },
  };

  var VORLAGE = {
    ausrichtungen: [{ name: "", kurzprofil: "", kernkompetenzen: [""] }],
    erfolge: [
      {
        station: "S1",
        situation: "",
        aufgabe: "",
        aktion: "",
        ergebnis: "",
        kennzahl: "",
        cvStichpunkt: "",
        kompetenzen: [""],
        ausrichtungen: [""],
      },
    ],
    kompetenzen: [{ name: "", synonyme: [""], kategorie: "fach|methode|sozial|it|sonstige", ausrichtungen: [""] }],
    interessen: [{ text: "", ausrichtungen: [""] }],
  };

  var SCHEMA_UEBERSETZUNG = {
    uebersetzungen: {
      typ: "liste",
      pflicht: true,
      eintrag: { id: { typ: "text", pflicht: true }, text: { typ: "text", pflicht: true } },
    },
  };

  var PLATZHALTER_RE = /\{\{[A-Z]+\}\}/;

  function schluessel(text) {
    return K.normalisieren(text).trim().replace(/\s+/g, " ");
  }

  function fassungen(o) {
    return [(o || {}).de, (o || {}).en].filter(Boolean);
  }

  function indexVon(liste, namen) {
    var index = {};
    liste.forEach(function (e) {
      namen(e).forEach(function (n) {
        index[schluessel(n)] = e.id;
      });
    });
    return index;
  }

  function ausrichtungsIndex(d) {
    return indexVon(d.ausrichtungen, function (a) {
      return [a.name];
    });
  }

  function kompetenzIndex(d) {
    return indexVon(d.kompetenzen, function (k) {
      return fassungen(k.name).concat(k.synonyme || []);
    });
  }

  function stationText(s) {
    return K.i18nText(s.titel) + " · " + s.organisation;
  }

  // Verweist die KI auf S1 oder nennt die Station beim Namen, bleibt es dieselbe Station.
  function stationFinden(d, text) {
    var wert = (text || "").trim();
    if (!wert) return null;
    var nr = /^S(\d+)\b/i.exec(wert);
    if (nr && d.stationen[nr[1] - 1]) return d.stationen[nr[1] - 1];
    var gesucht = schluessel(wert);
    var treffer = d.stationen.filter(function (s) {
      return (
        fassungen(s.titel).some(function (t) {
          return schluessel(t) === gesucht || schluessel(t + " · " + s.organisation) === gesucht;
        }) || schluessel(s.organisation) === gesucht
      );
    });
    return treffer.length === 1 ? treffer[0] : null;
  }

  function vorschlagBauen(e, liste, nr) {
    var id = liste + ":" + nr;
    if (liste === "ausrichtungen") return { id: id, label: e.name, erklaerung: e.kurzprofil, name: e.name, roh: e };
    if (liste === "kompetenzen") return { id: id, label: e.name, name: e.name, roh: e };
    if (liste === "interessen") return { id: id, label: e.text, name: e.text, roh: e };
    return { id: id, label: e.cvStichpunkt, erklaerung: e.kennzahl, name: e.cvStichpunkt, roh: e };
  }

  function bekannte(d, liste) {
    if (liste === "ausrichtungen") return ausrichtungsIndex(d);
    if (liste === "kompetenzen") return kompetenzIndex(d);
    return indexVon(d[liste], function (e) {
      return fassungen(liste === "erfolge" ? e.cvStichpunkt : e.text);
    });
  }

  K.kiInterview = {
    BEREICHE: ["gesamt", "ausrichtungen", "erfolge", "kompetenzen", "interessen"],
    DEEPL_MAX: DEEPL_MAX,

    vorlage: function (bereich) {
      var v = { sprache: "de|en" };
      LISTEN.forEach(function (l) {
        if (bereich === "gesamt" || bereich === l) v[l] = VORLAGE[l];
      });
      return JSON.stringify(v, null, 2);
    },

    // Nur Bezeichnungen, damit die KI Dubletten meidet und auf Vorhandenes verweisen kann.
    kontext: function () {
      var d = K.tresor.daten();
      function abschnitt(titel, werte) {
        if (!werte.length) return "";
        return titel + ":\n" + werte.map(function (w) { return "- " + w; }).join("\n");
      }
      return [
        abschnitt(K.t("station"), d.stationen.map(function (s, i) { return "S" + (i + 1) + ": " + stationText(s); })),
        abschnitt(K.t("ausrichtung"), d.ausrichtungen.map(function (a) { return a.name; })),
        abschnitt(K.t("kompetenz"), d.kompetenzen.map(function (k) { return K.i18nText(k.name); })),
        abschnitt(K.t("erfolg"), d.erfolge.map(function (e) { return K.i18nText(e.cvStichpunkt); })),
        abschnitt(K.t("interesse"), d.interessen.map(function (i) { return K.i18nText(i.text); })),
      ]
        .filter(Boolean)
        .join("\n\n");
    },

    pruefen: function (roh) {
      return K.ki.pruefen(roh, SCHEMA, K.t("import.bereich"));
    },

    // Gleicht die Antwort mit dem Bestand ab. Dubletten fallen heraus und werden nur gezählt.
    lesen: function (roh) {
      var d = K.tresor.daten();
      if (PLATZHALTER_RE.test(JSON.stringify(roh))) throw K.Fehler("interview.fehlerPlatzhalter");
      var v = { sprache: roh.sprache || K.sprache(), gruppen: {}, doppelt: 0, stationOffen: [] };
      LISTEN.forEach(function (l) {
        var da = bekannte(d, l);
        v.gruppen[l] = [];
        (roh[l] || []).forEach(function (e, i) {
          var vorschlag = vorschlagBauen(e, l, i);
          var key = schluessel(vorschlag.name);
          if (key in da) {
            v.doppelt++;
            return;
          }
          da[key] = true;
          if (l === "erfolge") {
            var station = stationFinden(d, e.station);
            vorschlag.stationId = station ? station.id : "";
            if (station) vorschlag.erklaerung = [stationText(station), e.kennzahl].filter(Boolean).join(" · ");
            else if (e.station && v.stationOffen.indexOf(e.station) === -1) v.stationOffen.push(e.station);
          }
          v.gruppen[l].push(vorschlag);
        });
      });
      return v;
    },

    anzahl: function (v) {
      return LISTEN.reduce(function (n, l) {
        return n + v.gruppen[l].length;
      }, 0);
    },

    // Löst die Beziehungen für die gewählten Einträge auf, ohne etwas zu speichern.
    plan: function (v, auswahl) {
      var d = K.tresor.daten();
      var a = ausrichtungsIndex(d);
      var k = kompetenzIndex(d);
      var abgewaehlt = {};
      var neu = { ausrichtungen: [], kompetenzen: [], erfolge: [], interessen: [], offen: v.stationOffen.slice(), mehrKompetenzen: [] };

      function i18n(text) {
        var o = {};
        if (text) o[v.sprache] = text;
        return o;
      }
      function gewaehlt(e) {
        return auswahl.indexOf(e.id) > -1;
      }
      function ausrichtungen(namen) {
        var ids = [];
        (namen || []).forEach(function (n) {
          var key = schluessel(n);
          if (a[key]) {
            if (ids.indexOf(a[key]) === -1) ids.push(a[key]);
          } else if (n && !abgewaehlt[key] && neu.offen.indexOf(n) === -1) neu.offen.push(n);
        });
        return ids;
      }
      // Noch unbekannte Kompetenzen entstehen mit, außer sie wurden abgewählt.
      function kompetenzen(namen) {
        var ids = [];
        (namen || []).forEach(function (n) {
          var key = schluessel(n);
          if (!n || abgewaehlt[key]) return;
          if (!k[key]) {
            var e = { id: K.uuid(), name: i18n(n), synonyme: [], kategorie: "sonstige", ausrichtungen: [] };
            k[key] = e.id;
            neu.mehrKompetenzen.push(e);
          }
          if (ids.indexOf(k[key]) === -1) ids.push(k[key]);
        });
        return ids;
      }
      function vormerken(eintraege, index) {
        eintraege.forEach(function (e) {
          var key = schluessel(e.name);
          if (gewaehlt(e)) index[key] = e.neuId = K.uuid();
          else abgewaehlt[key] = true;
        });
      }

      vormerken(v.gruppen.ausrichtungen, a);
      vormerken(v.gruppen.kompetenzen, k);
      v.gruppen.ausrichtungen.filter(gewaehlt).forEach(function (e) {
        neu.ausrichtungen.push({ id: e.neuId, name: e.roh.name, kurzprofil: i18n(e.roh.kurzprofil), kernkompetenzen: kompetenzen(e.roh.kernkompetenzen) });
      });
      v.gruppen.kompetenzen.filter(gewaehlt).forEach(function (e) {
        neu.kompetenzen.push({
          id: e.neuId,
          name: i18n(e.roh.name),
          synonyme: e.roh.synonyme || [],
          kategorie: e.roh.kategorie || "sonstige",
          ausrichtungen: ausrichtungen(e.roh.ausrichtungen),
        });
      });
      v.gruppen.erfolge.filter(gewaehlt).forEach(function (e) {
        var r = e.roh;
        var erfolg = {
          id: K.uuid(),
          stationId: e.stationId,
          situation: i18n(r.situation),
          aufgabe: i18n(r.aufgabe),
          aktion: i18n(r.aktion),
          ergebnis: i18n(r.ergebnis),
          cvStichpunkt: i18n(r.cvStichpunkt),
          kompetenzen: kompetenzen(r.kompetenzen),
          ausrichtungen: ausrichtungen(r.ausrichtungen),
        };
        if (r.kennzahl) erfolg.kennzahl = r.kennzahl;
        neu.erfolge.push(erfolg);
      });
      v.gruppen.interessen.filter(gewaehlt).forEach(function (e) {
        neu.interessen.push({ id: K.uuid(), text: i18n(e.roh.text), ausrichtungen: ausrichtungen(e.roh.ausrichtungen) });
      });
      return neu;
    },

    uebernehmen: function (v, auswahl) {
      var neu = K.kiInterview.plan(v, auswahl);
      K.tresor.aendern(function (d) {
        LISTEN.forEach(function (l) {
          d[l] = d[l].concat(neu[l]);
        });
        d.kompetenzen = d.kompetenzen.concat(neu.mehrKompetenzen);
      });
    },

    // Alle zweisprachigen Felder, in denen genau eine Fassung fehlt.
    offen: function () {
      var d = K.tresor.daten();
      var liste = [];
      I18N_FELDER.forEach(function (f) {
        d[f[0]].forEach(function (e) {
          var o = e[f[1]];
          if (!K.i18nLuecke(o)) return;
          var von = (o.de || "").trim() ? "de" : "en";
          liste.push({ id: "F" + (liste.length + 1), liste: f[0], eintragId: e.id, feld: f[1], von: von, nach: von === "de" ? "en" : "de", text: o[von] });
        });
      });
      return liste;
    },

    uebersetzungFelder: function (offen) {
      return JSON.stringify(
        {
          felder: offen.map(function (o) {
            return { id: o.id, von: o.von, nach: o.nach, text: o.text };
          }),
        },
        null,
        2,
      );
    },

    uebersetzungLesen: function (roh, offen) {
      var probleme = K.ki.pruefen(roh, SCHEMA_UEBERSETZUNG, K.t("import.bereich"));
      if (probleme.length) return { probleme: probleme };
      if (PLATZHALTER_RE.test(JSON.stringify(roh))) throw K.Fehler("interview.fehlerPlatzhalter");
      if (!roh.uebersetzungen.length) throw K.Fehler("interview.fehlerLeer");
      var felder = {};
      offen.forEach(function (o) {
        felder[o.id] = o;
      });
      var fertig = {};
      roh.uebersetzungen.forEach(function (u) {
        if (!felder[u.id]) throw K.Fehler("uebersetzen.fehlerId");
        fertig[u.id] = Object.assign({}, felder[u.id], { neu: u.text });
      });
      return {
        probleme: [],
        liste: Object.keys(fertig).map(function (id) {
          return fertig[id];
        }),
      };
    },

    // Überschreibt nie: Wurde die Fassung inzwischen selbst ergänzt, bleibt sie.
    uebersetzungUebernehmen: function (liste) {
      K.tresor.aendern(function (d) {
        liste.forEach(function (u) {
          var e = d[u.liste].find(function (x) {
            return x.id === u.eintragId;
          });
          if (!e) return;
          e[u.feld] = e[u.feld] || {};
          if (!(e[u.feld][u.nach] || "").trim()) e[u.feld][u.nach] = u.neu;
        });
      });
    },

    // Die Website liest den Text aus dem Fragment. Zu lange Texte liefern null.
    deepl: function (text, von, nach) {
      if (text.length > DEEPL_MAX) return null;
      var geschuetzt = text.replace(/\\/g, "\\\\").replace(/\//g, "\\/").replace(/\|/g, "\\|");
      return "https://www.deepl.com/translator#" + von + "/" + nach + "/" + encodeURIComponent(geschuetzt);
    },

    // PDF und Word bleiben außen vor: Die App liest nur Textdateien.
    dateiLesen: async function (datei) {
      if (!/\.(txt|md|json)$/i.test(datei.name)) throw K.Fehler("interview.fehlerDateityp");
      if (datei.size > DATEI_MAX) throw K.Fehler("interview.fehlerDateiGross");
      return (await datei.text()).replace(/^﻿/, "");
    },
  };
})();
