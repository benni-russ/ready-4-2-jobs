(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  // Kontextbezogener Sprung aus einem Modul in den passenden Artikel.
  S.WissenLink = function (props) {
    return html`<p class="rj-hint"><a class="rj-link" href=${"#/wissen/" + props.artikel}>${K.t("wissen.link." + props.artikel)}</a></p>`;
  };

  function Artikel(props) {
    var a = props.artikel;
    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${a.titel}</h1>
        <${UI.Button} icon="chevron-left" href="#/wissen">${K.t("nav.wissen")}<//>
      </div>
      <p class="rj-muted">${a.kategorie}</p>
      <article class="rj-prose" dangerouslySetInnerHTML=${{ __html: K.wissen.alsHtml(a.text) }}></article>
    `;
  }

  function Liste(props) {
    var suche = hooks.useState("");
    var kategorie = hooks.useState("");
    var kategorien = props.artikel
      .map(function (a) {
        return a.kategorie;
      })
      .filter(function (k, i, alle) {
        return alle.indexOf(k) === i;
      })
      .sort()
      .map(function (k) {
        return { wert: k, label: k };
      });
    var treffer = props.artikel.filter(function (a) {
      return (!kategorie[0] || a.kategorie === kategorie[0]) && UI.textTrifft(a.titel + " " + a.kategorie + " " + a.text, suche[0]);
    });
    var spalten = [
      {
        schluessel: "titel",
        titel: K.t("wissen.artikel"),
        zelle: function (a) {
          return html`<a class="rj-link" href=${"#/wissen/" + encodeURIComponent(a.kennung)}>${a.titel}</a>`;
        },
      },
      { schluessel: "kategorie", titel: K.t("wissen.kategorie") },
    ];

    return html`
      <div class="rj-filterbar">
        <${UI.SearchField} label=${K.t("wissen.suchen")} platzhalter=${K.t("wissen.suchen")} wert=${suche[0]} beiAenderung=${suche[1]} />
        <${UI.FilterSelect}
          label=${K.t("wissen.kategorie")}
          wert=${kategorie[0]}
          optionen=${[{ wert: "", label: K.t("wissen.alleKategorien") }].concat(kategorien)}
          beiAenderung=${kategorie[1]}
        />
      </div>
      ${treffer.length > 0
        ? html`<${UI.DataTable} ohneSuche=${true} spalten=${spalten} zeilen=${treffer} startSortierung=${{ spalte: "titel", richtung: "ascending" }} />`
        : html`<${UI.EmptyState} icon="search-x" titel=${K.t("wissen.keinTreffer")} text=${K.t("wissen.keinTrefferText")} />`}
      <p class="rj-hint">${K.t("wissen.eigeneHinweis")}</p>
    `;
  }

  S.Wissen = function (props) {
    var stand = hooks.useState(null);
    var fehler = hooks.useState(null);

    hooks.useEffect(function () {
      K.wissen.laden().then(stand[1], function (e) {
        fehler[1](K.fehlerText(e));
      });
    }, []);

    var kopf = html`<div class="rj-pagehead"><h1 class="h1">${K.t("nav.wissen")}</h1></div>`;
    if (fehler[0]) return html`${kopf}<${UI.Alert} art="danger">${fehler[0]}<//>`;
    if (!stand[0]) return kopf;

    var kennung = props.teile[0];
    if (kennung) {
      var artikel = stand[0].artikel.filter(function (a) {
        return a.kennung === kennung;
      })[0];
      if (artikel) return html`<${Artikel} key=${kennung} artikel=${artikel} />`;
      return html`${kopf}<${UI.EmptyState} icon="search-x" titel=${K.t("wissen.fehltTitel")} text=${K.t("wissen.fehltText")}>
        <${UI.Button} href="#/wissen">${K.t("wissen.alleArtikel")}<//>
      <//>`;
    }

    return html`
      ${kopf}
      ${stand[0].uebersprungen > 0 && html`<${UI.Alert} art="warning">${K.t("wissen.uebersprungen", { anzahl: stand[0].uebersprungen })}<//>`}
      <${Liste} artikel=${stand[0].artikel} />
    `;
  };
})();
