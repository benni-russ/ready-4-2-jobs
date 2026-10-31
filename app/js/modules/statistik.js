(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var SAEULEN_MAX = 6;

  function prozent(a) {
    return a.prozent === null ? "–" : K.t("statistik.prozent", { wert: a.prozent });
  }

  function basis(a) {
    return K.t("statistik.vonVersendet", { teil: a.teil, basis: a.basis });
  }

  function beschreibung(titel, daten) {
    return (
      titel +
      ": " +
      daten
        .map(function (d) {
          return d.label + " " + (d.text || d.wert);
        })
        .join(", ")
    );
  }

  function Verlauf(props) {
    var einheit = hooks.useState("woche");
    var daten = einheit[0] === "woche" ? props.werte.proWoche : props.werte.proMonat;
    var titel = K.t("statistik.verlauf." + einheit[0]);
    return html`<section class="rj-card rj-stack">
      <div class="rj-pagehead">
        <h2 class="h3">${titel}</h2>
        <${UI.SegmentedControl}
          label=${K.t("statistik.zeitraum")}
          wert=${einheit[0]}
          beiAenderung=${einheit[1]}
          optionen=${[
            { wert: "woche", label: K.t("statistik.wochen") },
            { wert: "monat", label: K.t("statistik.monate") },
          ]}
        />
      </div>
      <${UI.BarChart} label=${beschreibung(titel, daten)} daten=${daten} aktuell=${daten.length - 1} />
      <p class="rj-hint">${K.t("statistik.verlaufBasis", { anzahl: props.werte.versendet })}</p>
    </section>`;
  }

  function Trichter(props) {
    var w = props.werte;
    var daten = w.trichter.map(function (t) {
      return { label: K.t("statistik.stufe." + t.id), wert: t.wert };
    });
    var titel = K.t("statistik.trichter");
    var spalten = [
      { schluessel: "label", titel: K.t("statistik.stufe"), sortierbar: false },
      { schluessel: "wert", titel: K.t("statistik.anzahl"), num: true, sortierbar: false },
      {
        schluessel: "anteil",
        titel: K.t("statistik.anteil"),
        num: true,
        sortierbar: false,
        text: function (d) {
          return K.t("statistik.von", { teil: d.wert, basis: w.gesamt });
        },
      },
    ];
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${titel}</h2>
      <${UI.BarChart} label=${beschreibung(titel, daten)} daten=${daten} />
      <${UI.DataTable} ohneSuche=${true} spalten=${spalten} zeilen=${daten} />
      <p class="rj-hint">
        ${K.t("statistik.ausgang", { absage: w.ausgang.absage, keine: w.ausgang.keine_antwort, zurueck: w.ausgang.zurueckgezogen })}
      </p>
    </section>`;
  }

  function Quoten(props) {
    var daten = props.gruppen.slice(0, SAEULEN_MAX).map(function (g) {
      return { label: g.name, wert: g.quote.prozent, text: prozent(g.quote) };
    });
    var spalten = [
      { schluessel: "name", titel: props.spalte },
      {
        schluessel: "quote",
        titel: K.t("statistik.quote"),
        num: true,
        text: function (g) {
          return prozent(g.quote);
        },
        sortwert: function (g) {
          return g.quote.prozent;
        },
      },
      {
        schluessel: "basis",
        titel: K.t("statistik.basis"),
        num: true,
        text: function (g) {
          return K.t("statistik.von", { teil: g.eingeladen, basis: g.versendet });
        },
        sortwert: function (g) {
          return g.versendet;
        },
      },
    ];
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${props.titel}</h2>
      <${UI.BarChart} label=${beschreibung(props.titel, daten)} daten=${daten} max=${100} />
      <${UI.DataTable} spalten=${spalten} zeilen=${props.gruppen} />
    </section>`;
  }

  S.Statistik = function () {
    K.useBeobachtbar(K.tresorStand);
    var d = K.tresor.daten();
    var kopf = html`<div class="rj-pagehead"><h1 class="h1">${K.t("nav.statistik")}</h1></div>`;
    var w = K.statistik.auswerten(d.bewerbungen, d.ausrichtungen);

    if (w.versendet === 0) {
      return html`${kopf}<${UI.EmptyState} icon="chart-column" titel=${K.t("statistik.leerTitel")} text=${K.t("statistik.leerText")}>
        <${UI.Button} variante="primary" href="#/bewerbungen">${K.t("statistik.leerAktion")}<//>
      <//>`;
    }

    return html`
      ${kopf}
      <div class="rj-grid-2">
        <${UI.StatTile} titel=${K.t("statistik.versendet")} wert=${w.versendet} basis=${K.t("statistik.vonErfasst", { teil: w.versendet, basis: w.gesamt })} />
        <${UI.StatTile} titel=${K.t("statistik.einladungsquote")} wert=${prozent(w.einladung)} basis=${basis(w.einladung)} />
        <${UI.StatTile} titel=${K.t("statistik.zusagequote")} wert=${prozent(w.zusage)} basis=${basis(w.zusage)} />
        <${UI.StatTile}
          titel=${K.t("statistik.antwortzeit")}
          wert=${w.antwortTage === null ? "–" : K.t(w.antwortTage === 1 ? "statistik.tag" : "statistik.tage", { anzahl: w.antwortTage })}
          basis=${w.antworten ? K.t(w.antworten === 1 ? "statistik.ausAntwort" : "statistik.ausAntworten", { anzahl: w.antworten }) : K.t("statistik.keineAntworten")}
        />
      </div>
      <${Verlauf} werte=${w} />
      <${Trichter} werte=${w} />
      <${Quoten} titel=${K.t("statistik.proAusrichtung")} spalte=${K.t("statistik.ausrichtung")} gruppen=${w.proAusrichtung} />
      <${Quoten} titel=${K.t("statistik.proQuelle")} spalte=${K.t("statistik.quelle")} gruppen=${w.proQuelle} />
    `;
  };
})();
