(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var VORLAGE = { fragen: [{ frage: "...", antwort: "...", erklaerung: "..." }] };
  var SCHEMA = {
    fragen: {
      typ: "liste",
      pflicht: true,
      eintrag: {
        frage: { typ: "text", pflicht: true },
        antwort: { typ: "text", pflicht: true },
        erklaerung: { typ: "text" },
      },
    },
  };

  function firmaText(b) {
    return [
      K.t("bewerbung.firma") + ": " + b.firma.name,
      K.t("bewerbung.stelle") + ": " + b.stelle.titel,
      b.firma.branche && K.t("vorbereitung.branche") + ": " + b.firma.branche,
      b.firma.website && K.t("vorbereitung.website") + ": " + b.firma.website,
      b.stelle.anzeigeText,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function KiFragen(props) {
    var b = props.bewerbung;
    var vorschau = hooks.useState(null);
    var auswahl = hooks.useState([]);
    var aktiv = K.ki.platzhalterAktiv();
    var d = K.tresor.daten();
    var quelle = firmaText(b);
    var maske = aktiv ? K.ki.maskieren(quelle, d.profil, K.tresor.eintrag().name) : { text: quelle, karte: {} };
    var prompt = K.t("ki.promptUnternehmen", {
      sprache: K.t("fragen.sprache." + b.sprache),
      vorlage: JSON.stringify(VORLAGE, null, 2),
      firma: maske.text,
    });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var probleme = K.ki.pruefen(roh, SCHEMA, K.t("vorbereitung.kiBereich"));
      if (probleme.length) return probleme;
      if (!roh.fragen.length) throw K.Fehler("vorbereitung.fehlerKeineFragen");
      var v = K.fragen.unternehmenVorschau(b, roh.fragen);
      vorschau[1](v);
      auswahl[1](
        v.neu.map(function (f) {
          return f.id;
        }),
      );
      return [];
    }

    if (vorschau[0]) {
      var v = vorschau[0];
      return html`<${UI.ImportPreview}
        titel=${K.t("import.gueltig")}
        wert=${auswahl[0]}
        beiAenderung=${auswahl[1]}
        gruppen=${[
          {
            titel: K.t("vorbereitung.neueFragen"),
            eintraege: v.neu.map(function (f) {
              return { id: f.id, label: f.frage, erklaerung: f.antworten[0] };
            }),
          },
        ]}
      >
        ${v.doppelt > 0 && html`<p class="rj-muted">${K.t("vorbereitung.doppelt", { anzahl: v.doppelt })}</p>`}
        <div class="rj-row">
          <${UI.Button}
            variante="primary"
            icon="check"
            disabled=${auswahl[0].length === 0}
            onClick=${function () {
              K.fragen.unternehmenHinzufuegen(
                b.id,
                v.neu.filter(function (f) {
                  return auswahl[0].indexOf(f.id) > -1;
                }),
              );
              vorschau[1](null);
              K.meldung(K.t("vorbereitung.fragenUebernommen", { anzahl: auswahl[0].length }));
            }}
            >${K.t("import.uebernehmen")}<//
          >
          <${UI.Button}
            variante="ghost"
            onClick=${function () {
              vorschau[1](null);
            }}
            >${K.t("aktion.zurueck")}<//
          >
        </div>
      <//>`;
    }

    return html`<${UI.PromptPanel}
      prompt=${prompt}
      platzhalter=${aktiv}
      beiPlatzhalter=${function (w) {
        K.tresor.aendern(function (t) {
          t.einstellungen.kiPlatzhalter = w;
        });
      }}
      beiPruefen=${pruefen}
    />`;
  }

  S.Unternehmensfragen = function (props) {
    var bewerbungen = K.tresor.daten().bewerbungen;
    var id = hooks.useState(props.bewerbungId || "");
    var sitzung = hooks.useState(null);
    var loeschen = hooks.useState(null);
    var b = bewerbungen.filter(function (x) {
      return x.id === id[0];
    })[0];

    if (bewerbungen.length === 0) {
      return html`<${UI.EmptyState} icon="briefcase-business" titel=${K.t("vorbereitung.keineBewerbung")} text=${K.t("vorbereitung.keineBewerbungText")}>
        <${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("vorbereitung.bewerbungAnlegen")}<//>
      <//>`;
    }

    if (sitzung[0]) {
      return html`<${S.LernSitzung}
        titel=${b.firma.name}
        karten=${sitzung[0]}
        sprache=${b.sprache}
        beiEnde=${function () {
          sitzung[1](null);
        }}
      />`;
    }

    var fragen = b
      ? K.fragen.unternehmensfragen(b).map(function (f) {
          return Object.assign({ kartenId: f.id, antwort: f.antworten[0] }, f);
        })
      : [];
    var e = K.lernen.einteilen(fragen);
    var spalten = [
      { schluessel: "frage", titel: K.t("star.frage") },
      { schluessel: "antwort", titel: K.t("vorbereitung.antwort") },
      {
        schluessel: "aktion",
        titel: K.t("vorbereitung.aktion"),
        nurScreenreader: true,
        sortierbar: false,
        zelle: function (z) {
          return html`<${UI.IconButton}
            icon="trash-2"
            label=${K.t("vorbereitung.frageLoeschen")}
            onClick=${function () {
              loeschen[1](z);
            }}
          />`;
        },
      },
    ];

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("vorbereitung.unternehmenTitel")}</h2>
        <p>${K.t("vorbereitung.unternehmenText")}</p>
        <${UI.Select}
          label=${K.t("vorbereitung.bewerbung")}
          platzhalter=${K.t("vorbereitung.bewerbungPlatzhalter")}
          wert=${id[0]}
          beiAenderung=${id[1]}
          optionen=${bewerbungen.map(function (x) {
            return { wert: x.id, label: x.firma.name + " · " + x.stelle.titel };
          })}
        />
      </section>
      ${b &&
      fragen.length > 0 &&
      html`<section class="rj-stack">
        <div class="rj-row" style="justify-content:space-between">
          <h2 class="h3">${K.t("vorbereitung.fragenZu", { firma: b.firma.name })}</h2>
          <${UI.Button}
            variante="primary"
            icon="play"
            disabled=${e.faellig.length + e.neu.length === 0}
            onClick=${function () {
              sitzung[1](K.lernen.sitzung(fragen));
            }}
            >${K.t("vorbereitung.fragenLernen", { anzahl: e.faellig.length + e.neu.length })}<//
          >
        </div>
        <${UI.DataTable} label=${K.t("vorbereitung.fragenZu", { firma: b.firma.name })} spalten=${spalten} zeilen=${fragen} />
      </section>`}
      ${b &&
      html`<section class="rj-card rj-stack">
        <h2 class="h3">${K.t("vorbereitung.kiTitel")}</h2>
        <${UI.Alert} art="warning">${K.t("vorbereitung.kiHinweis")}<//>
        <${KiFragen} bewerbung=${b} key=${b.id} />
      </section>`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("vorbereitung.frageLoeschen")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${function () {
          K.fragen.unternehmenEntfernen(b.id, loeschen[0].id);
          loeschen[1](null);
        }}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
      >
        <p>${loeschen[0].frage}</p>
      <//>`}
    `;
  };
})();
