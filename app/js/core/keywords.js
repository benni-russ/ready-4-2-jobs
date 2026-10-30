(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_NGRAMM = 3;
  var MAX_KEYWORDS = 30;
  var GEWICHT_ANFORDERUNG = 2;
  var GEWICHT_MANUELL = 2;
  var UEBERSCHRIFT_LAENGE = 60;
  var SCORE_GUT = 70;
  var SCORE_TEILS = 40;

  // Nur gängige Füllwörter: Fachwörter wie „it“ dürfen nicht verloren gehen.
  var STOPPWOERTER = (
    "der die das den dem des ein eine einer eines einem einen und oder aber sowie auch als an am auf aus bei bis durch fur im in ins mit nach " +
    "ohne uber um unter von vom vor zu zum zur wir ihr ihre ihren ihrem ihrer sie du dein deine deinen deinem deiner unser unsere unseren uns " +
    "ist sind sein hast hat haben wird werden kann konnen mochten suchen bieten bringst bringen mitbringen gerne gern sehr gute guten gutes gut " +
    "erste erfahrung erfahrungen kenntnisse kenntnis idealerweise wunschenswert von " +
    "the a an and or but of for to in on at by with from as is are be you your we our us their this that will have has can may must " +
    "experience knowledge strong good skills ability"
  ).split(" ");
  var STOPP = {};
  STOPPWOERTER.forEach(function (w) {
    STOPP[w] = true;
  });

  var ANFORDERUNG_RE =
    /anforderung|profil\b|das bringst|was du mitbringst|was sie mitbringen|mitbringen|qualifikation|wir erwarten|voraussetzung|requirements?|your profile|qualifications|what you bring|must have|who you are/i;
  var ANDERES_RE =
    /aufgaben|tatigkeit|wir bieten|bieten wir|benefits|what we offer|we offer|uber uns|about us|responsibilit|your role|ihre vorteile|deine vorteile|kontakt/i;

  // Bindestriche zählen als Leerzeichen, „Power-BI“ ist also „power bi“.
  function form(text) {
    return tokens(text).join(" ");
  }

  function tokens(text) {
    var treffer = K.normalisieren(text).match(/\.?[\p{L}\p{N}][\p{L}\p{N}+#./]*/gu) || [];
    return treffer.map(function (t) {
      return t.replace(/[./]+$/, "");
    });
  }

  function zeilen(text) {
    return String(text || "").split(/\r?\n/);
  }

  // Teilt an Satzenden, Punkte in „Node.js“ bleiben heil.
  function saetze(zeile) {
    return zeile.split(/[.;:!?•·|()]\s+|[;•·|()]/);
  }

  function ohneStoppwoerter(worte) {
    return worte.filter(function (w) {
      return !STOPP[w];
    });
  }

  // Bildet jede Schreibweise auf den Anzeigenamen ab. Das Profil gewinnt gegen die Skill-Liste.
  function verzeichnis(kompetenzen) {
    var v = {};
    function eintragen(name, schreibweisen, kompetenzId) {
      schreibweisen.forEach(function (s) {
        var f = form(s);
        if (f && (!v[f] || kompetenzId)) v[f] = { name: name, kompetenzId: kompetenzId };
      });
    }
    K.SKILLS.forEach(function (s) {
      eintragen(s[0], s);
    });
    kompetenzen.forEach(function (k) {
      var name = K.i18nText(k.name);
      eintragen(name, [k.name.de, k.name.en].filter(Boolean).concat(k.synonyme || []), k.id);
    });
    return v;
  }

  function alleFormen(name) {
    var skill = K.SKILLS.filter(function (s) {
      return s.some(function (x) {
        return form(x) === form(name);
      });
    })[0];
    return (skill || [name]).map(form);
  }

  // Längster Treffer zuerst: „Microsoft Excel“ zählt nicht zusätzlich als „Excel“.
  function ausSatz(satz, v, gewicht, stand) {
    var worte = ohneStoppwoerter(tokens(satz));
    var i = 0;
    while (i < worte.length) {
      var n = Math.min(MAX_NGRAMM, worte.length - i);
      for (; n > 0; n--) {
        var eintrag = v[worte.slice(i, i + n).join(" ")];
        if (eintrag) {
          stand[eintrag.name] = (stand[eintrag.name] || 0) + gewicht;
          break;
        }
      }
      i += n || 1;
    }
  }

  function istUeberschrift(zeile) {
    return zeile.trim().length > 0 && zeile.length <= UEBERSCHRIFT_LAENGE;
  }

  K.keywords = {
    leer: function () {
      return { extrahiert: [], treffer: [], fehlend: [], manuell: [], gewichte: {} };
    },

    // Stufe 1–3 aus SPEC §6.4: normalisieren, N-Gramme abgleichen, nach Häufigkeit und Position gewichten.
    extrahieren: function (anzeige) {
      var v = verzeichnis(K.tresor.daten().kompetenzen);
      var stand = {};
      var gewicht = 1;
      zeilen(anzeige).forEach(function (zeile) {
        var klar = K.normalisieren(zeile).replace(/[#*_]/g, "");
        if (istUeberschrift(klar)) {
          if (ANFORDERUNG_RE.test(klar)) gewicht = GEWICHT_ANFORDERUNG;
          else if (ANDERES_RE.test(klar)) gewicht = 1;
        }
        saetze(zeile).forEach(function (s) {
          ausSatz(s, v, gewicht, stand);
        });
      });
      var namen = Object.keys(stand).sort(function (a, b) {
        return stand[b] - stand[a] || a.localeCompare(b);
      });
      var gewichte = {};
      namen = namen.slice(0, MAX_KEYWORDS);
      namen.forEach(function (n) {
        gewichte[n] = stand[n];
      });
      return { extrahiert: namen, gewichte: gewichte };
    },

    // Stufe 4: teilt in Treffer und Lücken. Läuft erneut, sobald sich Kompetenzen ändern.
    abgleichen: function (kw) {
      var kompetenzen = K.tresor.daten().kompetenzen;
      var v = {};
      kompetenzen.forEach(function (k) {
        [k.name.de, k.name.en]
          .filter(Boolean)
          .concat(k.synonyme || [])
          .forEach(function (s) {
            v[form(s)] = k.id;
          });
      });
      var treffer = [];
      var fehlend = [];
      kw.extrahiert.concat(kw.manuell).forEach(function (name) {
        var id = alleFormen(name)
          .map(function (f) {
            return v[f];
          })
          .filter(Boolean)[0];
        if (!id) {
          if (fehlend.indexOf(name) === -1) fehlend.push(name);
        } else if (treffer.indexOf(id) === -1) treffer.push(id);
      });
      return Object.assign({}, kw, { treffer: treffer, fehlend: fehlend });
    },

    analysieren: function (anzeige, manuell) {
      var e = K.keywords.extrahieren(anzeige);
      return K.keywords.abgleichen({ extrahiert: e.extrahiert, gewichte: e.gewichte, manuell: manuell || [], treffer: [], fehlend: [] });
    },

    trefferNamen: function (kw) {
      var d = K.tresor.daten();
      return kw.treffer
        .map(function (id) {
          return d.kompetenzen.filter(function (k) {
            return k.id === id;
          })[0];
        })
        .filter(Boolean)
        .map(function (k) {
          return K.i18nText(k.name);
        });
    },

    // Gewichteter Anteil der Treffer, null ohne Keywords.
    score: function (kw) {
      var gewichte = kw.gewichte || {};
      function g(name) {
        return gewichte[name] || GEWICHT_MANUELL;
      }
      var alle = kw.extrahiert.concat(kw.manuell);
      if (!alle.length) return null;
      var luecken = kw.fehlend.reduce(function (s, n) {
        return s + g(n);
      }, 0);
      var gesamt = alle.reduce(function (s, n) {
        return s + g(n);
      }, 0);
      return Math.round((100 * Math.max(gesamt - luecken, 0)) / gesamt);
    },

    // Bewusst ermutigend: Es gibt „einige Lücken“, aber nie „ungeeignet“.
    einstufung: function (score) {
      return score >= SCORE_GUT ? "gut" : score >= SCORE_TEILS ? "teils" : "luecken";
    },

    // Das Wichtigste zuerst, für den Lebenslauf und das Anschreiben.
    alle: function (kw) {
      return kw.extrahiert.concat(kw.manuell);
    },
  };
})();
