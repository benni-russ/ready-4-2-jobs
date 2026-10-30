(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_STICHPUNKTE = 5;
  var MAX_KOMPETENZEN = 12;
  var MAX_SEITEN = 2;
  var FOTO_HOEHE = 480;
  var BERUF = ["beruf", "praktikum", "ehrenamt"];
  var AUSBILDUNG = ["ausbildung", "studium", "schule"];

  // ä → ae, ß → ss, alles andere Trennende → „-“ (SPEC §6.5).
  K.dateiname = function (teile, endung) {
    var ersatz = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
    var name = teile
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[äöüß]/g, function (z) {
        return ersatz[z];
      })
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return name + "." + endung;
  };

  // Keywords kommen aus der Stellenanzeige (K.keywords).
  function treffer(text, keywords) {
    var t = K.normalisieren(text);
    return keywords.filter(function (k) {
      return t.indexOf(K.normalisieren(k)) > -1;
    }).length;
  }

  function priorisieren(liste, textVon, keywords) {
    if (!keywords.length) return liste;
    return liste
      .map(function (e, i) {
        return { e: e, i: i, n: treffer(textVon(e), keywords) };
      })
      .sort(function (a, b) {
        return b.n - a.n || a.i - b.i;
      })
      .map(function (x) {
        return x.e;
      });
  }

  function neuesteZuerst(a, b) {
    function rang(s) {
      return s.bis === "heute" ? "9999" : s.bis || s.von || "";
    }
    return rang(b) < rang(a) ? -1 : rang(b) > rang(a) ? 1 : (b.von || "") < (a.von || "") ? -1 : 1;
  }

  // Liest ein Textfeld in der Dokumentsprache und merkt sich, wo die Übersetzung fehlt.
  function leser(sprache, stand) {
    return function (o) {
      if (!o) return "";
      if ((o[sprache] || "").trim()) return o[sprache];
      var andere = o[sprache === "de" ? "en" : "de"] || "";
      if (andere.trim()) stand.fehlend++;
      return andere;
    };
  }

  function zuAusrichtung(id) {
    return function (e) {
      return !id || (e.ausrichtungen || []).indexOf(id) > -1;
    };
  }

  async function foto(t, hinweise) {
    var a = t.anlagen.filter(function (x) {
      return x.id === t.profil.foto;
    })[0];
    if (!a) {
      hinweise.push({ text: "cv.hinweisFotoFehlt" });
      return null;
    }
    if (a.mime.indexOf("image/") !== 0) {
      hinweise.push({ text: "cv.hinweisFotoTyp" });
      return null;
    }
    return K.pdf.bildDatenUrl(await K.tresor.anlageLesen(a.id), a.mime, FOTO_HOEHE);
  }

  // Trennt die Auswahl vom Layout: templates/cv.js bekommt nur fertige Texte.
  function auswaehlen(o) {
    var t = K.tresor.daten();
    var stand = { fehlend: 0 };
    var lies = leser(o.sprache, stand);
    var dabei = zuAusrichtung(o.ausrichtungId);
    var keywords = o.keywords || [];
    var ausrichtung = t.ausrichtungen.filter(function (a) {
      return a.id === o.ausrichtungId;
    })[0];

    var kompetenzen = t.kompetenzen.filter(dabei);
    var kern = ((ausrichtung && ausrichtung.kernkompetenzen) || [])
      .map(function (id) {
        return t.kompetenzen.filter(function (k) {
          return k.id === id;
        })[0];
      })
      .filter(Boolean);
    var uebrige = kompetenzen.filter(function (k) {
      return k.kategorie !== "it" && kern.indexOf(k) === -1;
    });
    var liste = kern.concat(uebrige);
    function kompetenzText(k) {
      return [lies(k.name)].concat(k.synonyme || []).join(" ");
    }

    function stationen(typen) {
      return t.stationen
        .filter(function (s) {
          return typen.indexOf(s.typ) > -1 && dabei(s);
        })
        .sort(neuesteZuerst)
        .map(function (s) {
          var erfolge = t.erfolge.filter(function (e) {
            return e.stationId === s.id && dabei(e) && lies(e.cvStichpunkt);
          });
          return {
            titel: lies(s.titel),
            organisation: s.organisation,
            ort: s.ort,
            von: s.von,
            bis: s.bis,
            beschreibung: lies(s.beschreibung),
            abschluss: s.abschluss,
            note: s.note,
            stichpunkte: priorisieren(erfolge, function (e) { return lies(e.cvStichpunkt); }, keywords)
              .slice(0, MAX_STICHPUNKTE)
              .map(function (e) { return lies(e.cvStichpunkt); }),
          };
        });
    }

    var daten = {
      sprache: o.sprache,
      akzent: o.akzent,
      profil: t.profil,
      kurzprofil: ausrichtung ? lies(ausrichtung.kurzprofil) : "",
      kompetenzen: priorisieren(liste, kompetenzText, keywords).slice(0, MAX_KOMPETENZEN).map(function (k) { return lies(k.name); }),
      it: kompetenzen.filter(function (k) { return k.kategorie === "it" && kern.indexOf(k) === -1; }).map(function (k) { return lies(k.name); }),
      beruf: stationen(BERUF),
      ausbildung: stationen(AUSBILDUNG),
      zertifikate: t.zertifikate.filter(dabei),
      sprachen: t.sprachen,
      interessen: o.mitInteressen ? t.interessen.filter(dabei).map(function (i) { return lies(i.text); }) : [],
    };
    return { daten: daten, fehlend: stand.fehlend };
  }

  K.lebenslauf = {
    MAX_SEITEN: MAX_SEITEN,

    erstellen: async function (o) {
      var t = K.tresor.daten();
      if (!(t.profil.vorname || "").trim() || !(t.profil.nachname || "").trim()) throw K.Fehler("fehler.cvName");

      var hinweise = [];
      var auswahl = auswaehlen(o);
      var d = auswahl.daten;
      if (!d.beruf.length && !d.ausbildung.length) throw K.Fehler("fehler.cvLeer");
      if (auswahl.fehlend) hinweise.push({ text: "cv.hinweisUebersetzung", werte: { anzahl: auswahl.fehlend } });
      if (o.mitFoto) d.foto = await foto(t, hinweise);

      var vorlage = K.cvVorlage(d);
      var fremd = K.pdf.fremdeZeichen(vorlage);
      if (fremd.length) hinweise.push({ text: "cv.hinweisZeichen", werte: { zeichen: fremd.join(" ") } });
      var bytes = await K.pdf.erzeugen(vorlage);
      var seiten = await K.pdf.seiten(bytes);
      if (seiten > MAX_SEITEN) {
        var aeltere = d.beruf.concat(d.ausbildung).slice(-2).map(function (s) { return s.titel; }).join(", ");
        hinweise.push({ text: "cv.hinweisLang", werte: { seiten: seiten, eintraege: aeltere } });
      }
      return {
        bytes: bytes,
        seiten: seiten,
        hinweise: hinweise,
        dateiname: K.dateiname([t.profil.vorname, t.profil.nachname, "lebenslauf"], "pdf"),
      };
    },
  };
})();
