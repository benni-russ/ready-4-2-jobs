(function () {
  "use strict";
  var K = window.R42J_CORE;

  var JE_GRUPPE = 5;
  var GRUPPEN = ["kompetenzen", "stationen", "erfolge", "zertifikate", "anlagen", "bewerbungen"];
  var ICONS = {
    kompetenzen: "tag",
    stationen: "briefcase-business",
    erfolge: "star",
    zertifikate: "badge-check",
    anlagen: "file-text",
    bewerbungen: "send",
  };

  // Der Index liegt nur im Speicher und verschwindet beim Sperren.
  var index = null;
  var stand = -1;

  K.tresorStand.subscribe(function (z) {
    if (!z.offen) {
      index = null;
      stand = -1;
    }
  });

  function beide(o) {
    return o ? [o.de, o.en].filter(Boolean).join(" ") : "";
  }

  function dokument(gruppe, id, titel, unter, text, ziel) {
    return { schluessel: gruppe + ":" + id, gruppe: gruppe, titel: titel, unter: unter, text: text, ziel: ziel };
  }

  function dokumente(d) {
    var alle = [];
    d.kompetenzen.forEach(function (k) {
      alle.push(
        dokument("kompetenzen", k.id, K.i18nText(k.name), K.t("kompetenz.kategorie." + k.kategorie), [beide(k.name)].concat(k.synonyme).join(" "), "stammdaten/kompetenzen/" + k.id),
      );
    });
    d.stationen.forEach(function (s) {
      alle.push(
        dokument("stationen", s.id, K.i18nText(s.titel), s.organisation, [beide(s.titel), s.organisation, s.ort, beide(s.beschreibung), s.abschluss].join(" "), "stammdaten/stationen/" + s.id),
      );
    });
    d.erfolge.forEach(function (e) {
      alle.push(
        dokument("erfolge", e.id, K.i18nText(e.cvStichpunkt), e.kennzahl || "", [beide(e.cvStichpunkt), beide(e.situation), beide(e.aufgabe), beide(e.aktion), beide(e.ergebnis), e.kennzahl].join(" "), "stammdaten/erfolge/" + e.id),
      );
    });
    d.zertifikate.forEach(function (z) {
      alle.push(dokument("zertifikate", z.id, z.name, z.aussteller, z.name + " " + z.aussteller, "stammdaten/weiteres/" + z.id));
    });
    d.anlagen.forEach(function (a) {
      alle.push(dokument("anlagen", a.id, a.titel, K.t("anlagen.kategorie." + a.kategorie), [a.titel].concat(a.tags).join(" "), "anlagen/" + a.id));
    });
    d.bewerbungen.forEach(function (b) {
      var firma = (b.firma && b.firma.name) || "";
      var stelle = (b.stelle && b.stelle.titel) || "";
      alle.push(dokument("bewerbungen", b.id, firma, stelle, firma + " " + stelle, "bewerbungen/" + b.id));
    });
    return alle;
  }

  function aufbauen() {
    var version = K.tresorStand.get().version;
    if (index && stand === version) return;
    index = new window.MiniSearch({
      idField: "schluessel",
      fields: ["titel", "text"],
      storeFields: ["gruppe", "titel", "unter", "ziel"],
      processTerm: K.normalisieren,
    });
    index.addAll(dokumente(K.tresor.daten()));
    stand = version;
  }

  K.suche = {
    // Liefert Gruppen in fester Reihenfolge, jede mit den besten Treffern.
    suchen: function (anfrage) {
      var q = anfrage.trim();
      if (!q) return [];
      aufbauen();
      var treffer = index.search(q, { prefix: true, fuzzy: 0.2, combineWith: "AND", boost: { titel: 2 } });
      return GRUPPEN.map(function (g) {
        return {
          gruppe: g,
          titel: K.t("suche.gruppe." + g),
          treffer: treffer
            .filter(function (t) {
              return t.gruppe === g;
            })
            .slice(0, JE_GRUPPE)
            .map(function (t) {
              return { id: t.id, icon: ICONS[g], titel: t.titel, unter: t.unter, ziel: t.ziel };
            }),
        };
      }).filter(function (g) {
        return g.treffer.length > 0;
      });
    },
  };
})();
