(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function Bearbeiten(props) {
    var def = props.def;
    var neu = props.neu;
    var entwurf = hooks.useState(props.eintrag);
    var fehler = hooks.useState({});

    function setze(feld, wert) {
      var n = Object.assign({}, entwurf[0]);
      if (wert === "" || wert === undefined) delete n[feld];
      else n[feld] = wert;
      entwurf[1](n);
      if (fehler[0][feld]) {
        var rest = Object.assign({}, fehler[0]);
        delete rest[feld];
        fehler[1](rest);
      }
    }

    function speichern() {
      var probleme = def.pruefen ? def.pruefen(entwurf[0]) : {};
      fehler[1](probleme);
      if (Object.keys(probleme).length) return;
      K.stammdaten.speichern(def.liste, entwurf[0]);
      K.meldung(K.t("stammdaten.gespeichert"));
      props.beiSchliessen();
    }

    return html`<${UI.Dialog}
      titel=${K.t(def.titel + (neu ? ".neu" : ".bearbeiten"))}
      bestaetigen=${K.t("aktion.speichern")}
      eigenePruefung=${true}
      beiBestaetigen=${speichern}
      beiSchliessen=${props.beiSchliessen}
    >
      ${def.felder(entwurf[0], setze, fehler[0])}
    <//>`;
  }

  function LoeschFrage(props) {
    return html`<${UI.Dialog}
      titel=${K.t("stammdaten.loeschenTitel")}
      bestaetigen=${K.t("aktion.loeschen")}
      gefahr=${true}
      beiBestaetigen=${props.beiLoeschen}
      beiSchliessen=${props.beiSchliessen}
    >
      <p>${props.text}</p>
    <//>`;
  }

  // Liste, Anlegen, Bearbeiten und Löschen eines Stammdaten-Bereichs. def beschreibt nur das Fachliche.
  S.StammdatenListe = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var def = props.def;
    var eintraege = K.tresor.daten()[def.liste];
    var offen = hooks.useState(null);
    var loeschen = hooks.useState(null);

    // Treffer aus der Suche öffnen direkt ihren Eintrag.
    hooks.useEffect(
      function () {
        var treffer = eintraege.find(function (e) {
          return e.id === props.oeffnen;
        });
        if (treffer) offen[1]({ eintrag: treffer });
      },
      [props.oeffnen],
    );

    function schliessen() {
      offen[1](null);
      if (props.oeffnen) K.navigieren(props.pfad);
    }

    function bearbeiten(e) {
      offen[1]({ eintrag: e });
    }

    function knoepfe(e) {
      var name = def.anzeige(e).titel;
      return html`<${UI.IconButton}
          icon="pencil"
          label=${K.t("stammdaten.bearbeitenVon", { name: name })}
          onClick=${function () {
            bearbeiten(e);
          }}
        />
        <${UI.IconButton}
          icon="trash-2"
          gefahr=${true}
          label=${K.t("stammdaten.loeschenVon", { name: name })}
          onClick=${function () {
            loeschen[1](e);
          }}
        />`;
    }

    function karte(e) {
      var a = def.anzeige(e);
      var chips = K.tresor.daten().ausrichtungen.filter(function (x) {
        return (e.ausrichtungen || []).indexOf(x.id) > -1;
      });
      return html`<section class="rj-card rj-stack" key=${e.id}>
        <div class="rj-card__head">
          <div style="min-width:0">
            <h3 class="h3">${a.titel}</h3>
            ${a.unter && html`<p class="rj-muted">${a.unter}</p>`}
          </div>
          <div class="rj-row rj-noprint" style="flex:none;gap:0">${knoepfe(e)}</div>
        </div>
        ${a.text && html`<p>${a.text}</p>`}
        ${(chips.length > 0 || a.luecke) &&
        html`<div class="rj-chips">
          ${chips.map(function (c) {
            return html`<span class="rj-chip" key=${c.id}>${c.name}</span>`;
          })}
          ${a.luecke && html`<span class="rj-chip rj-chip--gap"><${UI.Icon} name="triangle-alert" />${K.t("stammdaten.uebersetzungFehlt")}</span>`}
        </div>`}
      </section>`;
    }

    var spalten = def.spalten
      ? def.spalten.concat([
          {
            schluessel: "aktionen",
            titel: K.t("stammdaten.aktionen"),
            nurScreenreader: true,
            sortierbar: false,
            zelle: function (e) {
              return html`<div class="rj-row" style="gap:0;justify-content:flex-end">${knoepfe(e)}</div>`;
            },
            text: function () {
              return "";
            },
          },
        ])
      : null;
    var sortiert = def.sortieren ? eintraege.slice().sort(def.sortieren) : eintraege;

    return html`<section class="rj-stack">
      <div class="rj-pagehead">
        <div>
          <h2 class="h2">${K.t(def.titel)}</h2>
          ${def.erklaerung && html`<p class="rj-muted">${K.t(def.erklaerung)}</p>`}
        </div>
        <${UI.Button}
          variante="primary"
          icon="plus"
          onClick=${function () {
            offen[1]({ eintrag: def.leer(), neu: true });
          }}
        >
          ${K.t(def.titel + ".hinzufuegen")}
        <//>
      </div>
      ${!eintraege.length &&
      html`<${UI.EmptyState} icon=${def.icon} titel=${K.t(def.titel + ".leerTitel")} text=${K.t(def.titel + ".leerText")} />`}
      ${eintraege.length > 0 && spalten && html`<${UI.DataTable} spalten=${spalten} zeilen=${sortiert} startSortierung=${def.startSortierung} />`}
      ${eintraege.length > 0 && !spalten && sortiert.map(karte)}
      ${offen[0] &&
      html`<${Bearbeiten} key=${offen[0].eintrag.id} def=${def} eintrag=${offen[0].eintrag} neu=${offen[0].neu} beiSchliessen=${schliessen} />`}
      ${loeschen[0] &&
      html`<${LoeschFrage}
        text=${K.t(def.loeschText || "stammdaten.loeschenText", { name: def.anzeige(loeschen[0]).titel })}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
        beiLoeschen=${function () {
          K.stammdaten.loeschen(def.liste, loeschen[0].id);
          loeschen[1](null);
          K.meldung(K.t("stammdaten.geloescht"));
        }}
      />`}
    </section>`;
  };
})();
