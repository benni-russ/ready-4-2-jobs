(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ZIEL_SEKUNDEN = 120;
  var TEILE = ["situation", "aufgabe", "aktion", "ergebnis"];
  var BEWERTUNG_START = 3;

  function Erfolg(props) {
    var e = props.erfolg;
    return html`<details>
      <summary>
        ${K.i18nText(e.cvStichpunkt) || K.i18nText(e.aktion) || K.t("star.ohneTitel")}
        <${UI.Icon} name="chevron-down" />
      </summary>
      <dl class="rj-stack" style="margin:0">
        ${TEILE.map(function (t) {
          var text = K.i18nText(e[t]);
          return text && html`<div key=${t}><dt><strong>${K.t("star.teil." + t)}</strong></dt><dd style="margin:0">${text}</dd></div>`;
        })}
      </dl>
    </details>`;
  }

  function Uebung(props) {
    var f = props.frage;
    var sekunden = hooks.useState(0);
    var bewertung = hooks.useState(BEWERTUNG_START);
    var notiz = hooks.useState("");
    var vorschlaege = K.fragen.erfolgeZu(f);
    var hatTreffer = vorschlaege.some(function (v) {
      return v.treffer > 0;
    });

    function speichern() {
      K.fragen.starSpeichern({ frageId: f.kartenId, frage: f.frage, sekunden: sekunden[0], bewertung: bewertung[0], notiz: notiz[0].trim() });
      K.meldung(K.t("star.gespeichert"));
      props.beiFertig();
    }

    return html`<section class="rj-card rj-stack">
      <h2 class="h3" lang=${props.sprache}>${f.frage}</h2>
      <p class="rj-hint">${K.t("star.anleitung")}</p>
      <${S.WissenLink} artikel="star-methode" />
      <div class="rj-stack">
        <h3 class="body-strong">${K.t(hatTreffer ? "star.passend" : "star.anregung")}</h3>
        ${vorschlaege.length === 0
          ? html`<p class="rj-muted">${K.t("star.keineErfolge")} <a href="#/stammdaten">${K.t("star.zuStammdaten")}</a></p>`
          : html`<div class="rj-accordion">
              ${vorschlaege.map(function (v) {
                return html`<${Erfolg} erfolg=${v.erfolg} key=${v.erfolg.id} />`;
              })}
            </div>`}
      </div>
      <${UI.Timer} zielSekunden=${ZIEL_SEKUNDEN} beiZeit=${sekunden[1]} />
      <${UI.Slider}
        label=${K.t("star.bewertung")}
        min="1"
        max="5"
        wert=${bewertung[0]}
        beiAenderung=${bewertung[1]}
        skalaMin=${K.t("star.skalaMin")}
        skalaMax=${K.t("star.skalaMax")}
      />
      <${UI.Textarea} label=${K.t("star.notiz")} placeholder=${K.t("star.notizPlatzhalter")} wert=${notiz[0]} beiAenderung=${notiz[1]} rows="3" />
      <div class="rj-row">
        <${UI.Button} variante="primary" icon="check" onClick=${speichern}>${K.t("star.speichern")}<//>
        <${UI.Button} variante="ghost" onClick=${props.beiFertig}>${K.t("aktion.abbrechen")}<//>
      </div>
    </section>`;
  }

  S.StarTraining = function () {
    var sprache = hooks.useState(K.store.get().sprache);
    var gewaehlt = hooks.useState("");
    var uebt = hooks.useState(false);
    var loeschen = hooks.useState(null);
    var fragen = K.fragen.starFragen(sprache[0]);
    var frage = fragen.filter(function (f) {
      return f.kartenId === gewaehlt[0];
    })[0];

    if (uebt[0] && frage) {
      return html`<${Uebung}
        frage=${frage}
        sprache=${sprache[0]}
        key=${frage.kartenId}
        beiFertig=${function () {
          uebt[1](false);
        }}
      />`;
    }

    function zufall() {
      var andere = fragen.filter(function (f) {
        return f.kartenId !== gewaehlt[0];
      });
      gewaehlt[1](K.lernen.mischen(andere)[0].kartenId);
    }

    var verlauf = K.fragen.starVerlauf().map(function (e) {
      return Object.assign({}, e, {
        datum: new Date(e.am).toLocaleDateString(K.store.get().sprache === "de" ? "de-DE" : "en-GB"),
        dauer: UI.zeitText(e.sekunden),
      });
    });
    var spalten = [
      { schluessel: "frage", titel: K.t("star.frage") },
      { schluessel: "datum", titel: K.t("star.datum"), sortwert: function (z) { return z.am; } },
      { schluessel: "dauer", titel: K.t("star.dauer"), num: true, sortwert: function (z) { return z.sekunden; } },
      { schluessel: "bewertung", titel: K.t("star.selbst"), num: true },
      {
        schluessel: "aktion",
        titel: K.t("vorbereitung.aktion"),
        nurScreenreader: true,
        sortierbar: false,
        zelle: function (z) {
          return html`<${UI.IconButton}
            icon="trash-2"
            label=${K.t("star.eintragLoeschen", { datum: z.datum })}
            onClick=${function () {
              loeschen[1](z);
            }}
          />`;
        },
      },
    ];

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("star.titel")}</h2>
        <p>${K.t("star.text")}</p>
        <${S.SpracheWahl}
          wert=${sprache[0]}
          beiAenderung=${function (w) {
            sprache[1](w);
            gewaehlt[1]("");
          }}
        />
        <${UI.Select}
          label=${K.t("star.frage")}
          platzhalter=${K.t("star.fragePlatzhalter")}
          suche=${true}
          wert=${gewaehlt[0]}
          beiAenderung=${gewaehlt[1]}
          optionen=${fragen.map(function (f) {
            return { wert: f.kartenId, label: f.frage };
          })}
        />
        <div class="rj-row">
          <${UI.Button}
            variante="primary"
            icon="play"
            disabled=${!frage}
            onClick=${function () {
              uebt[1](true);
            }}
            >${K.t("star.ueben")}<//
          >
          <${UI.Button} icon="refresh-cw" disabled=${fragen.length < 2} onClick=${zufall}>${K.t("star.zufall")}<//>
        </div>
      </section>
      ${verlauf.length > 0 &&
      html`<section class="rj-stack">
        <h2 class="h3">${K.t("star.verlauf")}</h2>
        <${UI.DataTable} label=${K.t("star.verlauf")} spalten=${spalten} zeilen=${verlauf} />
      </section>`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("star.eintragLoeschenTitel")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${function () {
          K.fragen.starLoeschen(loeschen[0].id);
          loeschen[1](null);
        }}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
      >
        <p>${K.t("star.eintragLoeschenText")}</p>
      <//>`}
    `;
  };
})();
