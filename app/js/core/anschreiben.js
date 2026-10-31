(function () {
  "use strict";
  var K = window.R42J_CORE;

  var ABSCHNITTE = ["einleitung", "motivation", "abgleich", "mehrwert", "rahmen", "schluss"];
  var MAX_TREFFER = 3;
  var MAX_SEITEN = 1;
  var MAX_ANSCHRIFT_ZEILEN = 6;
  var UNTERSCHRIFT_HOEHE = 240;
  var PLATZHALTER_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

  // Satz = Bausteinsatz aus templates/bausteine.js. Englisch gilt für beide Anreden.
  function satzVon(sprache, anrede) {
    return sprache === "en" ? "en" : "de-" + anrede;
  }

  // Eigene Bausteine stehen im Tresor und wechseln sich mit den mitgelieferten ab.
  function pool(b, abschnitt) {
    var satz = satzVon(b.sprache, b.anrede);
    var eigene = K.tresor.daten().bausteine.filter(function (x) {
      return x.abschnitt === abschnitt && satzVon(x.sprache, x.anrede) === satz;
    });
    return K.BAUSTEINE.filter(function (x) {
      return x.satz === satz && x.abschnitt === abschnitt;
    }).concat(eigene);
  }

  function nachnameVon(name) {
    var teile = name.trim().split(/\s+/);
    return teile[teile.length - 1];
  }

  function anredeText(b) {
    var t = K.BRIEF_TEXTE[satzVon(b.sprache, b.anrede)];
    var a = b.ansprechpartner || {};
    var name = (a.name || "").trim();
    if (!name) return t.allgemein;
    var vorlage = t[a.anrede] || t.neutral;
    return vorlage.replace("{name}", a.anrede ? nachnameVon(name) : name).replace("{vorname}", name.split(/\s+/)[0]);
  }

  function datumText(sprache) {
    return new Date().toLocaleDateString(sprache === "de" ? "de-DE" : "en-GB", { day: "2-digit", month: sprache === "de" ? "2-digit" : "long", year: "numeric" });
  }

  function textIn(o, sprache) {
    if (!o) return "";
    return (o[sprache] || "").trim() || o[sprache === "de" ? "en" : "de"] || "";
  }

  // Die stärksten Treffer, jeweils mit dem Erfolg, der am meisten Keywords nennt.
  function staerken(b) {
    var d = K.tresor.daten();
    var genutzt = [];
    return b.keywords.treffer
      .slice(0, MAX_TREFFER)
      .map(function (id) {
        var k = d.kompetenzen.filter(function (x) {
          return x.id === id;
        })[0];
        if (!k) return null;
        var name = textIn(k.name, b.sprache);
        var erfolg = d.erfolge
          .filter(function (e) {
            var passend = (e.kompetenzen || []).indexOf(id) > -1;
            var benannt = K.normalisieren(textIn(e.cvStichpunkt, b.sprache)).indexOf(K.normalisieren(name)) > -1;
            return (passend || benannt) && textIn(e.cvStichpunkt, b.sprache) && genutzt.indexOf(e.id) === -1;
          })
          .sort(function (x, y) {
            return (y.ausrichtungen.indexOf(b.ausrichtungId) > -1 ? 1 : 0) - (x.ausrichtungen.indexOf(b.ausrichtungId) > -1 ? 1 : 0);
          })[0];
        if (erfolg) genutzt.push(erfolg.id);
        return { kompetenz: name, erfolg: erfolg ? textIn(erfolg.cvStichpunkt, b.sprache).replace(/[.\s]+$/, "") : "" };
      })
      .filter(Boolean);
  }

  function listeText(s, und) {
    var namen = s.map(function (x) {
      return x.kompetenz;
    });
    if (namen.length < 2) return namen.join("");
    return namen.slice(0, -1).join(", ") + " " + und + " " + namen[namen.length - 1];
  }

  function datumOderText(wert, sprache) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert || "");
    if (!m) return wert || "";
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(sprache === "de" ? "de-DE" : "en-GB", { day: "2-digit", month: sprache === "de" ? "2-digit" : "long", year: "numeric" });
  }

  function werte(b) {
    var p = K.tresor.daten().profil;
    var t = K.BRIEF_TEXTE[satzVon(b.sprache, b.anrede)];
    var r = b.anschreiben.rahmen;
    var quelle = (b.stelle.quelle || "").trim();
    var w = {
      firma: b.firma.name,
      stelle: b.stelle.titel,
      quelle: quelle,
      quelle_hinweis: quelle ? t.quelle.replace("{quelle}", quelle) : "",
      ansprechpartner_anrede: anredeText(b),
      eintritt: r.eintritt ? datumOderText(p.verfuegbarAb, b.sprache) : "",
      gehalt: r.gehalt ? p.gehaltsvorstellung || "" : "",
      kuendigungsfrist: r.kuendigungsfrist ? p.kuendigungsfrist || "" : "",
    };
    var s = staerken(b);
    for (var i = 0; i < MAX_TREFFER; i++) {
      w["kompetenz_" + (i + 1)] = s[i] ? s[i].kompetenz : "";
      w["erfolg_" + (i + 1)] = s[i] ? s[i].erfolg : "";
    }
    // Die Sammelzeile greift nur, wenn kein Erfolg belegt ist.
    var mitErfolg = s.some(function (x) {
      return x.erfolg;
    });
    w.kompetenzen_liste = mitErfolg ? "" : listeText(s, t.und);
    return w;
  }

  // Fehlt ein Wert, entfällt der Satz. Unbekannte Platzhalter bleiben stehen und werden gemeldet.
  function einsetzen(text, w, offen) {
    var zeilen = text.split("\n").filter(function (zeile) {
      var leer = false;
      zeile.replace(PLATZHALTER_RE, function (ganz, name) {
        if (name in w && !w[name] && name !== "quelle_hinweis") leer = true;
        return ganz;
      });
      return !leer;
    });
    return zeilen
      .map(function (zeile) {
        return zeile.replace(PLATZHALTER_RE, function (ganz, name) {
          if (name in w) return w[name];
          if (offen.indexOf(ganz) === -1) offen.push(ganz);
          return ganz;
        });
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function absender(p) {
    var a = p.adresse || {};
    var ort = [a.plz, a.ort].filter(Boolean).join(" ");
    return [
      [[p.vorname, p.nachname].filter(Boolean).join(" "), a.strasse, ort],
      [p.telefon, p.email],
    ]
      .map(function (zeile) {
        return zeile.filter(Boolean).join(" · ");
      })
      .filter(Boolean)
      .join("\n");
  }

  // Eine Zeile im Sichtfenster, ohne Telefon und E-Mail.
  function ruecksendeAngabe(p) {
    var a = p.adresse || {};
    return [[p.vorname, p.nachname].filter(Boolean).join(" "), a.strasse, [a.plz, a.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  }

  function fertigBauen(b) {
    var p = K.tresor.daten().profil;
    var w = werte(b);
    var offen = [];
    var t = K.BRIEF_TEXTE[satzVon(b.sprache, b.anrede)];
    var absaetze = ABSCHNITTE.map(function (a) {
      var text = b.anschreiben.abschnitte[a] || "";
      return einsetzen(text, w, offen);
    }).filter(Boolean);
    var ort = (p.adresse && p.adresse.ort) || "";
    return {
      sprache: b.sprache,
      absender: absender(p),
      ruecksende: b.dokumente.postversand ? ruecksendeAngabe(p) : "",
      postversand: !!b.dokumente.postversand,
      empfaenger: [b.firma.name].concat(
        (b.ansprechpartner && b.ansprechpartner.name) || "",
        (b.firma.adresse || "").split(/\r?\n/).filter(function (z) {
          return K.normalisieren(z) !== K.normalisieren(b.firma.name);
        }),
      ).filter(Boolean),
      ortDatum: [ort, datumText(b.sprache)].filter(Boolean).join(", "),
      betreff: t.bewerbung + " " + b.stelle.titel,
      referenz: b.stelle.referenz ? t.referenz + ": " + b.stelle.referenz : "",
      anrede: w.ansprechpartner_anrede,
      absaetze: absaetze,
      gruss: t.gruss,
      name: (b.anschreiben.signatur || "").trim() || nameStandard(),
      offen: offen,
    };
  }

  function nameStandard() {
    var p = K.tresor.daten().profil;
    return [p.titel, p.vorname, p.nachname].filter(Boolean).join(" ");
  }

  function emailAus(b, betreff, text) {
    var t = K.BRIEF_TEXTE[satzVon(b.sprache, b.anrede)];
    var p = K.tresor.daten().profil;
    var referenz = b.stelle.referenz ? " (" + t.referenz + " " + b.stelle.referenz + ")" : "";
    function fuellen(s) {
      return s
        .replace("{datum}", datumOderText(b.versendetAm ? b.versendetAm.slice(0, 10) : "", b.sprache))
        .replace("{stelle}", b.stelle.titel)
        .replace("{referenz}", referenz)
        .replace("{anrede}", anredeText(b))
        .replace("{name}", [p.vorname, p.nachname].filter(Boolean).join(" "));
    }
    return { an: (b.ansprechpartner && b.ansprechpartner.email) || "", betreff: fuellen(t[betreff]), text: fuellen(t[text]) };
  }

  K.anschreiben = {
    ABSCHNITTE: ABSCHNITTE,
    MAX_SEITEN: MAX_SEITEN,

    neu: function (sprache, anrede) {
      var b = { sprache: sprache, anrede: anrede };
      var abschnitte = {};
      var varianten = {};
      ABSCHNITTE.forEach(function (a) {
        var erster = pool(b, a)[0];
        abschnitte[a] = erster.text;
        varianten[a] = erster.id;
      });
      return { abschnitte: abschnitte, varianten: varianten, rahmen: { eintritt: false, gehalt: false, kuendigungsfrist: false } };
    },

    // Stellt Sprache oder Anrede um. Selbst bearbeitete Abschnitte bleiben stehen.
    satzWechseln: function (b, sprache, anrede) {
      var alt = {};
      ABSCHNITTE.forEach(function (a) {
        alt[a] = pool(b, a).filter(function (x) {
          return x.text === b.anschreiben.abschnitte[a];
        })[0];
      });
      b.sprache = sprache;
      b.anrede = anrede;
      ABSCHNITTE.forEach(function (a) {
        if (!alt[a]) return;
        var erster = pool(b, a)[0];
        b.anschreiben.abschnitte[a] = erster.text;
        b.anschreiben.varianten[a] = erster.id;
      });
    },

    // Wählt zufällig eine andere Fassung als die aktuelle (SPEC §6.6).
    andereFormulierung: function (b, abschnitt) {
      var alle = pool(b, abschnitt);
      var andere = alle.filter(function (x) {
        return x.id !== b.anschreiben.varianten[abschnitt] && x.text !== b.anschreiben.abschnitte[abschnitt];
      });
      var liste = andere.length ? andere : alle;
      return liste[Math.floor(Math.random() * liste.length)];
    },

    bausteinMerken: function (b, abschnitt, text) {
      K.tresor.aendern(function (d) {
        d.bausteine.push({ id: K.uuid(), abschnitt: abschnitt, sprache: b.sprache, anrede: b.anrede, text: text, standard: false });
      });
    },

    bausteinLoeschen: function (id) {
      K.tresor.aendern(function (d) {
        d.bausteine = d.bausteine.filter(function (x) {
          return x.id !== id;
        });
      });
    },

    fertig: fertigBauen,
    nameStandard: nameStandard,
    datum: datumOderText,

    // Die Fassung für das Portal, ohne Briefkopf.
    klartext: function (b) {
      var f = fertigBauen(b);
      return [f.anrede].concat(f.absaetze, [f.gruss, f.name]).join("\n\n");
    },

    emailVorschlag: function (b) {
      return emailAus(b, "emailBetreff", "emailText");
    },

    rueckfrageVorschlag: function (b) {
      return emailAus(b, "rueckfrageBetreff", "rueckfrageText");
    },

    erstellen: async function (b) {
      var t = K.tresor.daten();
      if (!(t.profil.vorname || "").trim() || !(t.profil.nachname || "").trim()) throw K.Fehler("fehler.cvName");
      var d = fertigBauen(b);
      var hinweise = [];
      if (d.offen.length) hinweise.push({ text: "anschreiben.hinweisPlatzhalter", werte: { liste: d.offen.join(", ") } });
      if (b.dokumente.mitUnterschrift) {
        var a = t.anlagen.filter(function (x) {
          return x.id === t.profil.unterschrift;
        })[0];
        if (!a || a.mime.indexOf("image/") !== 0) hinweise.push({ text: "anschreiben.hinweisUnterschrift" });
        else d.unterschrift = await K.pdf.bildDatenUrl(await K.tresor.anlageLesen(a.id), a.mime, UNTERSCHRIFT_HOEHE);
      }
      if (d.postversand && d.empfaenger.length < 3) hinweise.push({ text: "anschreiben.hinweisAnschrift" });
      if (d.postversand && d.empfaenger.length > MAX_ANSCHRIFT_ZEILEN) hinweise.push({ text: "anschreiben.hinweisAnschriftLang", werte: { n: MAX_ANSCHRIFT_ZEILEN } });
      var vorlage = K.anschreibenVorlage(d);
      var fremd = K.pdf.fremdeZeichen(vorlage);
      if (fremd.length) hinweise.push({ text: "cv.hinweisZeichen", werte: { zeichen: fremd.join(" ") } });
      var bytes = await K.pdf.erzeugen(vorlage);
      var seiten = await K.pdf.seiten(bytes);
      if (seiten > MAX_SEITEN) hinweise.push({ text: "anschreiben.hinweisLang", werte: { seiten: seiten } });
      return {
        bytes: bytes,
        seiten: seiten,
        hinweise: hinweise,
        dateiname: K.dateiname([t.profil.vorname, t.profil.nachname, "anschreiben", b.firma.name], "pdf"),
      };
    },
  };
})();
