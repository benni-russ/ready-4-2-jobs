(function () {
  "use strict";
  var K = window.R42J_CORE;

  var PLATZHALTER_RE = /\{\{([A-Z]+)\}\}/g;
  var MAX_FEHLER = 5;

  function escapen(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function adresseText(a) {
    if (!a) return "";
    var ort = [a.plz, a.ort].filter(Boolean).join(" ");
    return [a.strasse, ort].filter(Boolean).join(", ");
  }

  function ersetzen(zustand, wert, name) {
    if (!wert) return;
    zustand.text = zustand.text.replace(new RegExp(escapen(wert), "gi"), "{{" + name + "}}");
    if (!zustand.karte[name]) zustand.karte[name] = wert;
  }

  // Greift dort, wo noch kein Profil existiert, zum Beispiel beim ersten Lebenslauf-Import.
  var MUSTER = [
    { name: "EMAIL", re: /[\w.+-]+@[\w-]+\.[\w.-]*\w/g },
    { name: "LINKEDIN", re: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;)]+/gi },
    { name: "XING", re: /(?:https?:\/\/)?(?:www\.)?xing\.com\/[^\s,;)]+/gi },
    {
      name: "TELEFON",
      re: /(?:\+\d{1,3}|\b0)[\d\s()/-]{6,}\d/g,
      passt: function (t) {
        return !/\b\d{1,2}\/\d{4}\b/.test(t) && t.replace(/\D/g, "").length >= 7;
      },
    },
  ];
  var GEBURT_RE = /(geb(?:\.|oren)?(?:\s+am)?|geburtsdatum|date of birth|born(?:\s+on)?)\s*:?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/gi;
  var STRASSE_RE = /[A-ZÄÖÜ][\wäöüß.-]*(?:\s[\wäöüß.-]+){0,3}?(?:straße|strasse|str\.|weg|gasse|allee|platz|ring|damm)\s+\d+\s?[a-zA-Z]?\b/g;
  var ORT_RE = /\b\d{5}\s+[A-ZÄÖÜ][\wäöüß-]+(?:\s[A-ZÄÖÜ][\wäöüß-]+)?/g;

  function muster(zustand) {
    MUSTER.forEach(function (m) {
      zustand.text = zustand.text.replace(m.re, function (t) {
        if (m.passt && !m.passt(t)) return t;
        if (!zustand.karte[m.name]) zustand.karte[m.name] = t.trim();
        return "{{" + m.name + "}}";
      });
    });
    zustand.text = zustand.text.replace(GEBURT_RE, function (ganz, wort, datum) {
      if (!zustand.karte.GEBURTSDATUM) zustand.karte.GEBURTSDATUM = datum.replace(/\s/g, "");
      return wort + " {{GEBURTSDATUM}}";
    });
    var teile = [];
    zustand.text = zustand.text.replace(STRASSE_RE, function (t) {
      teile[0] = teile[0] || t;
      return "{{ADRESSE}}";
    });
    zustand.text = zustand.text.replace(ORT_RE, function (t) {
      teile[1] = teile[1] || t;
      return "{{ADRESSE}}";
    });
    if (teile.length && !zustand.karte.ADRESSE) zustand.karte.ADRESSE = teile.filter(Boolean).join(", ");
  }

  K.ki = {
    // Liefert den Text ohne persönliche Angaben und die Karte für den Rückweg.
    maskieren: function (text, profil, anzeigename) {
      var p = profil || {};
      var z = { text: text, karte: {} };
      ersetzen(z, adresseText(p.adresse), "ADRESSE");
      ersetzen(z, p.email, "EMAIL");
      ersetzen(z, p.telefon, "TELEFON");
      ersetzen(z, p.linkedin, "LINKEDIN");
      ersetzen(z, p.xing, "XING");
      ersetzen(z, p.geburtsdatum, "GEBURTSDATUM");
      var worte = (anzeigename || "").trim().split(/\s+/);
      var vorname = p.vorname || (worte.length > 1 ? worte[0] : "");
      var nachname = p.nachname || worte[worte.length - 1];
      ersetzen(z, nachname, "NACHNAME");
      ersetzen(z, vorname, "VORNAME");
      muster(z);
      return z;
    },

    // Setzt die echten Werte überall ein, auch tief in der Antwort.
    zurueck: function zurueck(wert, karte) {
      if (typeof wert === "string") {
        return wert.replace(PLATZHALTER_RE, function (ganz, name) {
          return name in karte ? karte[name] : ganz;
        });
      }
      if (Array.isArray(wert)) {
        return wert.map(function (w) {
          return zurueck(w, karte);
        });
      }
      if (wert && typeof wert === "object") {
        var neu = {};
        Object.keys(wert).forEach(function (k) {
          neu[k] = zurueck(wert[k], karte);
        });
        return neu;
      }
      return wert;
    },

    // Findet das JSON auch dann, wenn die KI Text drumherum schreibt.
    jsonLesen: function (antwort) {
      var text = String(antwort || "").trim();
      if (!text) throw K.Fehler("ki.fehlerLeer");
      var block = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
      var kandidat = block ? block[1] : text;
      var start = kandidat.indexOf("{");
      var ende = kandidat.lastIndexOf("}");
      if (start === -1) throw K.Fehler("ki.fehlerKeinJson");
      if (ende <= start) throw K.Fehler("ki.fehlerJsonKaputt");
      kandidat = kandidat.slice(start, ende + 1);
      // Erst unverändert lesen: Deutsche Anführungszeichen sind im Text gültig und dürfen bleiben.
      var fassungen = [kandidat, kandidat.replace(/,(\s*[}\]])/g, "$1"), kandidat.replace(/[“”„]/g, '"').replace(/,(\s*[}\]])/g, "$1")];
      for (var i = 0; i < fassungen.length; i++) {
        try {
          return JSON.parse(fassungen[i]);
        } catch (e) {
          // Die nächste Fassung ist nachsichtiger.
        }
      }
      throw K.Fehler("ki.fehlerJsonKaputt");
    },

    // schema: { feld: { pflicht?, typ: "text"|"liste"|"objekt", erlaubt?, muster?, felder?, eintrag? } }.
    // Liefert verständliche Meldungen, höchstens MAX_FEHLER.
    pruefen: function (objekt, schema, bereich) {
      var fehler = [];

      function melden(schluessel, ort, feld) {
        fehler.push(K.t(schluessel, { ort: ort, feld: feld }));
      }

      function pruefeFelder(o, felder, ort) {
        Object.keys(felder).forEach(function (name) {
          var f = felder[name];
          var w = o[name];
          if (w === undefined || w === null || w === "") {
            if (f.pflicht) melden("ki.fehlerFehlt", ort, name);
            return;
          }
          if (f.typ === "liste") {
            if (!Array.isArray(w)) return melden("ki.fehlerTyp", ort, name);
            w.forEach(function (e, i) {
              if (f.eintrag) {
                if (typeof e !== "object" || e === null) return melden("ki.fehlerTyp", ort, name);
                pruefeFelder(e, f.eintrag, K.t("ki.ortEintrag", { bereich: name, nr: i + 1 }));
              } else if (typeof e !== "string") melden("ki.fehlerTyp", ort, name);
            });
          } else if (f.typ === "objekt") {
            if (typeof w !== "object" || Array.isArray(w)) return melden("ki.fehlerTyp", ort, name);
            pruefeFelder(w, f.felder, ort);
          } else if (typeof w !== "string") {
            melden("ki.fehlerTyp", ort, name);
          } else if ((f.erlaubt && f.erlaubt.indexOf(w) === -1) || (f.muster && !f.muster.test(w))) {
            melden("ki.fehlerWert", ort, name);
          }
        });
      }

      pruefeFelder(objekt, schema, bereich);
      return fehler.slice(0, MAX_FEHLER);
    },

    platzhalterAktiv: function () {
      return K.tresor.daten().einstellungen.kiPlatzhalter !== false;
    },
  };
})();
