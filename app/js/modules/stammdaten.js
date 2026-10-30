(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var STATION_TYPEN = ["beruf", "ausbildung", "studium", "schule", "praktikum", "ehrenamt"];
  var KATEGORIEN = ["fach", "methode", "sozial", "it", "sonstige"];
  var NIVEAUS = ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"];
  var BEREICHE = ["persoenlich", "ausrichtungen", "stationen", "erfolge", "kompetenzen", "weiteres"];

  function optionen(werte, prefix) {
    return werte.map(function (w) {
      return { wert: w, label: K.t(prefix + w) };
    });
  }

  function hatText(o) {
    return !!o && !!((o.de || "").trim() || (o.en || "").trim());
  }

  function pflichtFehler(probleme, feld, leer) {
    if (leer) probleme[feld] = K.t("feld.fehlt");
  }

  // Kurzformen für die Dialogfelder eines Eintrags.
  function Bauer(e, setze, fehler) {
    return {
      text: function (feld, label, extra) {
        return html`<${UI.TextField}
          label=${K.t(label)}
          placeholder=${K.t(label + "Platzhalter")}
          wert=${e[feld] || ""}
          fehler=${fehler[feld]}
          beiAenderung=${function (w) {
            setze(feld, w);
          }}
          ...${extra}
        />`;
      },
      i18n: function (feld, label, extra) {
        return html`<${UI.BilingualField}
          label=${K.t(label)}
          platzhalter=${label + "Platzhalter"}
          wert=${e[feld]}
          fehler=${fehler[feld]}
          beiAenderung=${function (w) {
            setze(feld, w);
          }}
          ...${extra}
        />`;
      },
      auswahl: function (feld, label, opt, extra) {
        return html`<${UI.Select}
          label=${K.t(label)}
          optionen=${opt}
          wert=${e[feld] || ""}
          beiAenderung=${function (w) {
            setze(feld, w);
          }}
          ...${extra}
        />`;
      },
      datum: function (feld, label, extra) {
        return html`<${UI.DatePicker}
          label=${K.t(label)}
          wert=${e[feld] || ""}
          fehler=${fehler[feld]}
          beiAenderung=${function (w) {
            setze(feld, w);
          }}
          ...${extra}
        />`;
      },
      ausrichtungen: function () {
        return html`<${UI.AusrichtungenWahl}
          wert=${e.ausrichtungen}
          beiAenderung=${function (w) {
            setze("ausrichtungen", w);
          }}
        />`;
      },
    };
  }

  // Zeigt Namen, speichert IDs. Unbekannte Namen werden als neue Kompetenz angelegt.
  function KompetenzWahl(props) {
    var alle = K.tresor.daten().kompetenzen;

    function name(id) {
      var k = alle.find(function (x) {
        return x.id === id;
      });
      return k ? K.i18nText(k.name) : "";
    }

    function zuId(text) {
      var k = K.tresor.daten().kompetenzen.find(function (x) {
        return K.i18nText(x.name).toLowerCase() === text.toLowerCase();
      });
      return k ? k.id : K.stammdaten.kompetenzAnlegen(text);
    }

    return html`<${UI.TagInput}
      label=${props.label}
      hinweis=${props.hinweis}
      platzhalter=${K.t("kompetenz.hinzufuegenKurz")}
      wert=${(props.wert || []).map(name)}
      vorschlaege=${alle.map(function (k) {
        return K.i18nText(k.name);
      })}
      beiAenderung=${function (namen) {
        props.beiAenderung(namen.map(zuId));
      }}
    />`;
  }

  function AnlagenWahl(props) {
    var alle = K.tresor.daten().anlagen;
    if (!alle.length) return html`<p class="rj-hint">${K.t("anlagen.nochKeine")}</p>`;
    var wert = props.wert || [];
    return html`<fieldset class="rj-fieldset">
      <legend>${K.t("station.anlagen")}</legend>
      ${alle.map(function (a) {
        return html`<${UI.Checkbox}
          key=${a.id}
          label=${a.titel}
          wert=${wert.indexOf(a.id) > -1}
          beiAenderung=${function (an) {
            var ohne = wert.filter(function (x) {
              return x !== a.id;
            });
            props.beiAenderung(an ? ohne.concat([a.id]) : ohne);
          }}
        />`;
      })}
    </fieldset>`;
  }

  var AUSRICHTUNG = {
    liste: "ausrichtungen",
    titel: "ausrichtung",
    erklaerung: "ausrichtung.erklaerung",
    icon: "layers",
    loeschText: "ausrichtung.loeschenText",
    leer: function () {
      return { id: K.uuid(), name: "", kurzprofil: {}, kernkompetenzen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "name", !(e.name || "").trim());
      return p;
    },
    anzeige: function (e) {
      return { titel: e.name, text: K.i18nText(e.kurzprofil), luecke: K.i18nLuecke(e.kurzprofil) };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      return html`
        ${b.text("name", "ausrichtung.name", { pflicht: true, hinweis: K.t("ausrichtung.nameHinweis") })}
        ${b.i18n("kurzprofil", "ausrichtung.kurzprofil", { mehrzeilig: true, hinweis: K.t("ausrichtung.kurzprofilHinweis") })}
        <${KompetenzWahl}
          label=${K.t("ausrichtung.kernkompetenzen")}
          hinweis=${K.t("ausrichtung.kernHinweis")}
          wert=${e.kernkompetenzen}
          beiAenderung=${function (w) {
            setze("kernkompetenzen", w);
          }}
        />
      `;
    },
  };

  var STATION = {
    liste: "stationen",
    titel: "station",
    erklaerung: "station.erklaerung",
    icon: "briefcase-business",
    loeschText: "station.loeschenText",
    sortieren: function (a, b) {
      var bisA = a.bis === "heute" ? "9999" : a.bis || a.von;
      var bisB = b.bis === "heute" ? "9999" : b.bis || b.von;
      return bisB.localeCompare(bisA) || b.von.localeCompare(a.von);
    },
    leer: function () {
      return { id: K.uuid(), typ: "beruf", titel: {}, organisation: "", ort: "", von: "", ausrichtungen: [], anlagen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "titel", !hatText(e.titel));
      pflichtFehler(p, "organisation", !(e.organisation || "").trim());
      pflichtFehler(p, "von", !e.von);
      return p;
    },
    anzeige: function (e) {
      var ort = [e.organisation, e.ort].filter(Boolean).join(", ");
      return {
        titel: K.i18nText(e.titel),
        unter: [K.zeitraum(e), ort, K.t("station.typ." + e.typ)].filter(Boolean).join(" · "),
        text: K.i18nText(e.beschreibung),
        luecke: K.i18nLuecke(e.titel) || K.i18nLuecke(e.beschreibung),
      };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      var heute = e.bis === "heute";
      return html`
        ${b.auswahl("typ", "station.typ", optionen(STATION_TYPEN, "station.typ."))}
        ${b.i18n("titel", "station.titel", { pflicht: true, hinweis: K.t("station.titelHinweis") })}
        <div class="rj-grid-2">
          ${b.text("organisation", "station.organisation", { pflicht: true })} ${b.text("ort", "station.ort")}
          <${UI.MonatsFeld}
            label=${K.t("station.von")}
            pflicht=${true}
            wert=${e.von}
            fehler=${fehler.von}
            beiAenderung=${function (w) {
              setze("von", w);
            }}
          />
          ${!heute &&
          html`<${UI.MonatsFeld}
            label=${K.t("station.bis")}
            wert=${e.bis}
            beiAenderung=${function (w) {
              setze("bis", w);
            }}
          />`}
        </div>
        <${UI.Checkbox}
          label=${K.t("station.heuteLabel")}
          wert=${heute}
          beiAenderung=${function (an) {
            setze("bis", an ? "heute" : "");
          }}
        />
        ${b.i18n("beschreibung", "station.beschreibung", { mehrzeilig: true })}
        <div class="rj-grid-2">${b.text("abschluss", "station.abschluss")} ${b.text("note", "station.note")}</div>
        <${AnlagenWahl}
          wert=${e.anlagen}
          beiAenderung=${function (w) {
            setze("anlagen", w);
          }}
        />
        ${b.ausrichtungen()}
      `;
    },
  };

  function stationOptionen() {
    return [{ wert: "", label: K.t("erfolg.keineStation") }].concat(
      K.tresor.daten().stationen.map(function (s) {
        return { wert: s.id, label: K.i18nText(s.titel) + " · " + s.organisation };
      }),
    );
  }

  // Vorschlag für den Stichpunkt: Aktion und Ergebnis in der jeweiligen Sprache.
  function stichpunktVorschlag(e) {
    var o = {};
    ["de", "en"].forEach(function (s) {
      var teile = [(e.aktion || {})[s], (e.ergebnis || {})[s]].filter(Boolean);
      if (teile.length) o[s] = teile.join(" – ");
    });
    return o;
  }

  var ERFOLG = {
    liste: "erfolge",
    titel: "erfolg",
    erklaerung: "erfolg.erklaerung",
    icon: "star",
    leer: function () {
      return { id: K.uuid(), stationId: "", situation: {}, aufgabe: {}, aktion: {}, ergebnis: {}, cvStichpunkt: {}, kompetenzen: [], ausrichtungen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "cvStichpunkt", !hatText(e.cvStichpunkt));
      return p;
    },
    anzeige: function (e) {
      var station = K.tresor.daten().stationen.find(function (s) {
        return s.id === e.stationId;
      });
      var o = [e.situation, e.aufgabe, e.aktion, e.ergebnis, e.cvStichpunkt];
      return {
        titel: K.i18nText(e.cvStichpunkt),
        unter: [station && K.i18nText(station.titel), e.kennzahl].filter(Boolean).join(" · "),
        luecke: o.some(K.i18nLuecke),
      };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      var vorschlag = stichpunktVorschlag(e);
      return html`
        ${b.auswahl("stationId", "erfolg.station", stationOptionen())}
        ${b.i18n("situation", "erfolg.situation", { mehrzeilig: true, hinweis: K.t("erfolg.situationHinweis") })}
        ${b.i18n("aufgabe", "erfolg.aufgabe", { mehrzeilig: true, hinweis: K.t("erfolg.aufgabeHinweis") })}
        ${b.i18n("aktion", "erfolg.aktion", { mehrzeilig: true, hinweis: K.t("erfolg.aktionHinweis") })}
        ${b.i18n("ergebnis", "erfolg.ergebnis", { mehrzeilig: true, hinweis: K.t("erfolg.ergebnisHinweis") })}
        ${b.text("kennzahl", "erfolg.kennzahl", { hinweis: K.t("erfolg.kennzahlHinweis") })}
        ${b.i18n("cvStichpunkt", "erfolg.stichpunkt", { pflicht: true, mehrzeilig: true, hinweis: K.t("erfolg.stichpunktHinweis") })}
        ${hatText(vorschlag) &&
        html`<div class="rj-row">
          <${UI.Button}
            icon="sparkles"
            onClick=${function () {
              setze("cvStichpunkt", vorschlag);
            }}
          >
            ${K.t("erfolg.stichpunktUebernehmen")}
          <//>
        </div>`}
        <${KompetenzWahl}
          label=${K.t("erfolg.kompetenzen")}
          wert=${e.kompetenzen}
          beiAenderung=${function (w) {
            setze("kompetenzen", w);
          }}
        />
        ${b.ausrichtungen()}
      `;
    },
  };

  var KOMPETENZ = {
    liste: "kompetenzen",
    titel: "kompetenz",
    erklaerung: "kompetenz.erklaerung",
    icon: "tag",
    startSortierung: { spalte: "name", richtung: "ascending" },
    spalten: null,
    leer: function () {
      return { id: K.uuid(), name: {}, synonyme: [], kategorie: "fach", ausrichtungen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "name", !hatText(e.name));
      return p;
    },
    anzeige: function (e) {
      return { titel: K.i18nText(e.name) };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      return html`
        ${b.i18n("name", "kompetenz.name", { pflicht: true })}
        <${UI.TagInput}
          label=${K.t("kompetenz.synonyme")}
          hinweis=${K.t("kompetenz.synonymeHinweis")}
          platzhalter=${K.t("kompetenz.synonymPlatzhalter")}
          wert=${e.synonyme}
          beiAenderung=${function (w) {
            setze("synonyme", w);
          }}
        />
        <div class="rj-grid-2">
          ${b.auswahl("kategorie", "kompetenz.kategorie", optionen(KATEGORIEN, "kompetenz.kategorie."))}
          <${UI.Select}
            label=${K.t("kompetenz.niveau")}
            hinweis=${K.t("kompetenz.niveauHinweis")}
            optionen=${[{ wert: "", label: K.t("kompetenz.ohneNiveau") }].concat(
              [1, 2, 3, 4, 5].map(function (n) {
                return { wert: String(n), label: K.t("kompetenz.niveau." + n) };
              }),
            )}
            wert=${e.niveau ? String(e.niveau) : ""}
            beiAenderung=${function (w) {
              setze("niveau", w ? +w : "");
            }}
          />
        </div>
        ${b.ausrichtungen()}
      `;
    },
  };

  function kompetenzSpalten() {
    return [
      {
        schluessel: "name",
        titel: K.t("kompetenz.name"),
        text: function (e) {
          return K.i18nText(e.name);
        },
        zelle: function (e) {
          return html`${K.i18nText(e.name)}
          ${K.i18nLuecke(e.name) &&
          html` <span class="rj-chip rj-chip--gap"><${UI.Icon} name="triangle-alert" />${K.t("stammdaten.uebersetzungFehlt")}</span>`}`;
        },
      },
      {
        schluessel: "synonyme",
        titel: K.t("kompetenz.synonyme"),
        text: function (e) {
          return e.synonyme.join(", ");
        },
      },
      {
        schluessel: "kategorie",
        titel: K.t("kompetenz.kategorie"),
        text: function (e) {
          return K.t("kompetenz.kategorie." + e.kategorie);
        },
      },
      {
        schluessel: "niveau",
        titel: K.t("kompetenz.niveau"),
        typ: "number",
        text: function (e) {
          return e.niveau ? K.t("kompetenz.niveau." + e.niveau) : "";
        },
        sortwert: function (e) {
          return e.niveau || 0;
        },
      },
    ];
  }

  var ZERTIFIKAT = {
    liste: "zertifikate",
    titel: "zertifikat",
    icon: "badge-check",
    leer: function () {
      return { id: K.uuid(), name: "", aussteller: "", datum: "", ausrichtungen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "name", !(e.name || "").trim());
      pflichtFehler(p, "aussteller", !(e.aussteller || "").trim());
      pflichtFehler(p, "datum", !e.datum);
      return p;
    },
    anzeige: function (e) {
      var datum = e.datum ? window.R42J.formatDate(new Date(e.datum + "T00:00")) : "";
      return { titel: e.name, unter: [e.aussteller, datum].filter(Boolean).join(" · ") };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      return html`
        ${b.text("name", "zertifikat.name", { pflicht: true })} ${b.text("aussteller", "zertifikat.aussteller", { pflicht: true })}
        <div class="rj-grid-2">
          ${b.datum("datum", "zertifikat.datum", { pflicht: true })} ${b.datum("gueltigBis", "zertifikat.gueltigBis")}
        </div>
        ${b.auswahl(
          "anlageId",
          "zertifikat.anlage",
          [{ wert: "", label: K.t("stammdaten.keineAnlage") }].concat(
            K.tresor.daten().anlagen.map(function (a) {
              return { wert: a.id, label: a.titel };
            }),
          ),
        )}
        ${b.ausrichtungen()}
      `;
    },
  };

  var SPRACHE = {
    liste: "sprachen",
    titel: "sprache",
    icon: "globe",
    leer: function () {
      return { id: K.uuid(), sprache: "", niveau: "B2" };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "sprache", !(e.sprache || "").trim());
      return p;
    },
    anzeige: function (e) {
      return { titel: e.sprache, unter: K.t("sprache.niveau." + e.niveau) };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      return html`
        ${b.text("sprache", "sprache.name", { pflicht: true })}
        ${b.auswahl("niveau", "sprache.niveau", optionen(NIVEAUS, "sprache.niveau."))}
      `;
    },
  };

  var INTERESSE = {
    liste: "interessen",
    titel: "interesse",
    icon: "party-popper",
    leer: function () {
      return { id: K.uuid(), text: {}, ausrichtungen: [] };
    },
    pruefen: function (e) {
      var p = {};
      pflichtFehler(p, "text", !hatText(e.text));
      return p;
    },
    anzeige: function (e) {
      return { titel: K.i18nText(e.text), luecke: K.i18nLuecke(e.text) };
    },
    felder: function (e, setze, fehler) {
      var b = Bauer(e, setze, fehler);
      return html`${b.i18n("text", "interesse.text", { pflicht: true })} ${b.ausrichtungen()}`;
    },
  };


  // Sechs Reiter sind die Obergrenze des Design-Systems, deshalb teilen sich drei kurze Listen einen.
  S.Stammdaten = function (props) {
    var bereich = props.teile[0] || "persoenlich";
    var id = props.teile[1];

    if (bereich === "import") {
      return html`
        <div class="rj-pagehead"><h1 class="h1">${K.t("import.titel")}</h1></div>
        <${S.LebenslaufImport}
          beiFertig=${function () {
            K.navigieren("stammdaten/stationen");
          }}
          beiSelbst=${function () {
            K.navigieren("stammdaten");
          }}
        />
      `;
    }
    if (BEREICHE.indexOf(bereich) === -1) bereich = "persoenlich";

    function liste(def, pfad) {
      return html`<${S.StammdatenListe} key=${def.liste} def=${def} oeffnen=${id} pfad=${pfad} />`;
    }

    var kompetenz = Object.assign({}, KOMPETENZ, { spalten: kompetenzSpalten() });

    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("nav.stammdaten")}</h1>
        <div class="rj-row">
          <${UI.Button} icon="sparkles" href="#/stammdaten/import">${K.t("import.knopf")}<//>
          <${UI.Button} icon="file-text" href="#/lebenslauf">${K.t("nav.lebenslauf")}<//>
        </div>
      </div>
      <${UI.Tabs}
        label=${K.t("nav.stammdaten")}
        tabs=${optionen(BEREICHE, "stammdaten.")}
        wert=${bereich}
        beiAenderung=${function (b) {
          K.navigieren("stammdaten/" + b);
        }}
      >
        ${bereich === "persoenlich" && html`<${S.StammdatenPersoenlich} />`}
        ${bereich === "ausrichtungen" && liste(AUSRICHTUNG, "stammdaten/ausrichtungen")}
        ${bereich === "stationen" && liste(STATION, "stammdaten/stationen")}
        ${bereich === "erfolge" && liste(ERFOLG, "stammdaten/erfolge")}
        ${bereich === "kompetenzen" && liste(kompetenz, "stammdaten/kompetenzen")}
        ${bereich === "weiteres" &&
        html`${liste(ZERTIFIKAT, "stammdaten/weiteres")} ${liste(SPRACHE, "stammdaten/weiteres")} ${liste(INTERESSE, "stammdaten/weiteres")}`}
      <//>
    `;
  };
})();
