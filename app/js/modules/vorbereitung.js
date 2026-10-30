(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var REITER = ["lernen", "star", "unternehmen", "kataloge"];

  S.SpracheWahl = function (props) {
    return html`<${UI.SegmentedControl}
      label=${K.t("vorbereitung.sprache")}
      wert=${props.wert}
      beiAenderung=${props.beiAenderung}
      optionen=${[
        { wert: "de", label: K.t("fragen.sprache.de") },
        { wert: "en", label: K.t("fragen.sprache.en") },
      ]}
    />`;
  };

  function Kachel(props) {
    return html`<div class="rj-stat">
      <span class="rj-stat__label">${props.titel}</span>
      <span class="rj-stat__value">${props.wert}</span>
      <span class="rj-stat__basis">${props.basis}</span>
    </div>`;
  }

  function Lernen() {
    var sprache = hooks.useState(K.store.get().sprache);
    var sitzung = hooks.useState(null);

    if (sitzung[0]) {
      return html`<${S.LernSitzung}
        titel=${sitzung[0].titel}
        karten=${sitzung[0].karten}
        sprache=${sprache[0]}
        beiEnde=${function () {
          sitzung[1](null);
        }}
      />`;
    }

    var zeilen = K.fragen.gruppen(sprache[0]).map(function (g) {
      var e = K.lernen.einteilen(g.fragen);
      return Object.assign({ id: g.kategorie, name: K.fragen.kategorieName(g.kategorie), fragen: g.fragen }, e);
    });
    var summe = { faellig: [], neu: 0, gelernt: 0, meister: 0, gesamt: 0 };
    zeilen.forEach(function (z) {
      summe.faellig = summe.faellig.concat(z.faellig);
      summe.neu += z.neu.length;
      summe.gelernt += z.gelernt;
      summe.meister += z.meister;
      summe.gesamt += z.gesamt;
    });

    var spalten = [
      { schluessel: "name", titel: K.t("vorbereitung.kategorie") },
      { schluessel: "gesamt", titel: K.t("vorbereitung.fragen"), num: true },
      {
        schluessel: "anzahlFaellig",
        titel: K.t("vorbereitung.faellig"),
        num: true,
        sortwert: function (z) {
          return z.faellig.length;
        },
        text: function (z) {
          return String(z.faellig.length);
        },
      },
      {
        schluessel: "anzahlNeu",
        titel: K.t("vorbereitung.neu"),
        num: true,
        sortwert: function (z) {
          return z.neu.length;
        },
        text: function (z) {
          return String(z.neu.length);
        },
      },
      {
        schluessel: "aktion",
        titel: K.t("vorbereitung.aktion"),
        nurScreenreader: true,
        sortierbar: false,
        zelle: function (z) {
          return html`<${UI.Button}
            variante="secondary"
            disabled=${z.faellig.length + z.neu.length === 0}
            aria-label=${K.t("vorbereitung.lernenIn", { name: z.name })}
            onClick=${function () {
              sitzung[1]({ titel: z.name, karten: K.lernen.sitzung(z.fragen) });
            }}
            >${K.t("vorbereitung.lernen")}<//
          >`;
        },
      },
    ];

    return html`
      <div class="rj-row" style="justify-content:space-between">
        <${S.SpracheWahl} wert=${sprache[0]} beiAenderung=${sprache[1]} />
        <${UI.Button}
          variante="primary"
          icon="play"
          disabled=${summe.faellig.length === 0}
          onClick=${function () {
            sitzung[1]({ titel: K.t("vorbereitung.alleFaelligen"), karten: summe.faellig.slice(0, K.lernen.SITZUNG) });
          }}
          >${K.t("vorbereitung.alleLernen", { anzahl: summe.faellig.length })}<//
        >
      </div>
      <div class="rj-grid-2">
        <${Kachel} titel=${K.t("vorbereitung.heuteFaellig")} wert=${summe.faellig.length} basis=${K.t("vorbereitung.neuBasis", { anzahl: summe.neu })} />
        <${Kachel} titel=${K.t("vorbereitung.gelernt")} wert=${summe.gelernt} basis=${K.t("vorbereitung.vonFragen", { gesamt: summe.gesamt })} />
        <${Kachel} titel=${K.t("vorbereitung.sicher")} wert=${summe.meister} basis=${K.t("vorbereitung.sicherBasis")} />
      </div>
      <${UI.DataTable} label=${K.t("vorbereitung.tabelle")} spalten=${spalten} zeilen=${zeilen} ohneSuche=${zeilen.length < 8} />
      <p class="rj-hint">${K.t("vorbereitung.leitner")}</p>
    `;
  }

  S.Vorbereitung = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var reiter = REITER.indexOf(props.teile[0]) > -1 ? props.teile[0] : "lernen";
    var geladen = hooks.useState(null);

    async function neuLesen() {
      try {
        geladen[1](await K.fragen.laden());
      } catch (e) {
        geladen[1]({ kataloge: [], fehler: [] });
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    hooks.useEffect(function () {
      neuLesen();
    }, []);

    return html`
      <div class="rj-pagehead"><h1 class="h1">${K.t("nav.vorbereitung")}</h1></div>
      ${geladen[0] && geladen[0].fehler.length > 0 && reiter !== "kataloge" &&
      html`<${UI.Alert} art="warning">
        ${K.t("kataloge.fehlerKurz", { anzahl: geladen[0].fehler.length })}
        ${" "}<a href="#/vorbereitung/kataloge">${K.t("kataloge.fehlerZeigen")}</a>
      <//>`}
      <${UI.Tabs}
        label=${K.t("vorbereitung.reiter")}
        wert=${reiter}
        tabs=${REITER.map(function (r) {
          return { wert: r, label: K.t("vorbereitung.reiter." + r) };
        })}
        beiAenderung=${function (r) {
          K.navigieren("vorbereitung/" + r);
        }}
      >
        ${reiter === "lernen" && geladen[0] && html`<${Lernen} />`}
        ${reiter === "star" && geladen[0] && html`<${S.StarTraining} />`}
        ${reiter === "unternehmen" && html`<${S.Unternehmensfragen} bewerbungId=${props.teile[1]} key=${props.teile[1] || "-"} />`}
        ${reiter === "kataloge" && geladen[0] && html`<${S.Kataloge} fehler=${geladen[0].fehler} beiNeuLesen=${neuLesen} />`}
      <//>
    `;
  };
})();
