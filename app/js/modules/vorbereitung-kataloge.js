(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function Fehlerliste(props) {
    return html`<${UI.Alert} art="danger">
      <strong>${K.t("kataloge.fehlerTitel")}</strong>
      <ul style="margin:0;padding-left:1.25em">
        ${props.fehler.map(function (f) {
          return html`<li key=${f.datei}>
            <strong>${f.datei}</strong>: ${f.meldungen.join(" ")}
          </li>`;
        })}
      </ul>
    <//>`;
  }

  S.Kataloge = function (props) {
    var importFehler = hooks.useState([]);
    var loeschen = hooks.useState(null);
    var eigene = K.fragen.eigene();

    async function importieren(dateien) {
      try {
        var r = await K.fragen.importieren(dateien);
        importFehler[1](r.fehler);
        if (r.fehler.length) document.getElementById("rj-live").textContent = K.t("kataloge.fehlerKurz", { anzahl: r.fehler.length });
        if (r.gespeichert.length) {
          K.meldung(K.t("kataloge.importiert", { anzahl: r.gespeichert.length }));
          await props.beiNeuLesen();
        }
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    async function entfernen() {
      try {
        await K.fragen.entfernen(loeschen[0].datei);
        loeschen[1](null);
        await props.beiNeuLesen();
        K.meldung(K.t("kataloge.entfernt"));
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    var mitgelieferte = K.fragen.kataloge().filter(function (k) {
      return !k.datei;
    });
    function zeile(k) {
      return {
        id: k.datei || k.kategorie + "-" + k.sprache,
        name: k.datei || K.fragen.kategorieName(k.kategorie),
        kategorie: K.fragen.kategorieName(k.kategorie),
        sprache: K.t("fragen.sprache." + k.sprache),
        anzahl: k.fragen.length,
        katalog: k,
      };
    }

    var spaltenEigene = [
      { schluessel: "name", titel: K.t("kataloge.datei") },
      { schluessel: "kategorie", titel: K.t("vorbereitung.kategorie") },
      { schluessel: "sprache", titel: K.t("vorbereitung.sprache") },
      { schluessel: "anzahl", titel: K.t("vorbereitung.fragen"), num: true },
      {
        schluessel: "aktion",
        titel: K.t("vorbereitung.aktion"),
        nurScreenreader: true,
        sortierbar: false,
        zelle: function (z) {
          return html`<${UI.IconButton}
            icon="trash-2"
            label=${K.t("kataloge.entfernen", { name: z.name })}
            onClick=${function () {
              loeschen[1](z.katalog);
            }}
          />`;
        },
      },
    ];

    var spaltenMit = [
      { schluessel: "name", titel: K.t("vorbereitung.kategorie") },
      { schluessel: "sprache", titel: K.t("vorbereitung.sprache") },
      { schluessel: "anzahl", titel: K.t("vorbereitung.fragen"), num: true },
    ];

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("kataloge.importTitel")}</h2>
        <p>${K.t("kataloge.importText")}</p>
        <${UI.Alert} art="warning">${K.t("kataloge.datenschutz")}<//>
        <${UI.FileDrop} accept=".json" hinweis=${K.t("kataloge.dateiHinweis")} beiDateien=${importieren} />
        ${importFehler[0].length > 0 && html`<${Fehlerliste} fehler=${importFehler[0]} />`}
        <div class="rj-accordion">
          <details>
            <summary>${K.t("kataloge.format")}<${UI.Icon} name="chevron-down" /></summary>
            <div class="rj-stack">
              <p>${K.t("kataloge.formatText")}</p>
              <pre style="margin:0;overflow-x:auto">${K.t("kataloge.beispiel")}</pre>
            </div>
          </details>
        </div>
      </section>
      <section class="rj-stack">
        <div class="rj-row" style="justify-content:space-between">
          <h2 class="h3">${K.t("kataloge.eigene")}</h2>
          <${UI.Button} icon="refresh-cw" onClick=${props.beiNeuLesen}>${K.t("kataloge.neuLesen")}<//>
        </div>
        ${props.fehler.length > 0 && html`<${Fehlerliste} fehler=${props.fehler} />`}
        ${eigene.length === 0
          ? html`<p class="rj-muted">${K.t("kataloge.keine")}</p>`
          : html`<${UI.DataTable} label=${K.t("kataloge.eigene")} spalten=${spaltenEigene} zeilen=${eigene.map(zeile)} />`}
      </section>
      <section class="rj-stack">
        <h2 class="h3">${K.t("kataloge.mitgeliefert")}</h2>
        <${UI.DataTable} label=${K.t("kataloge.mitgeliefert")} spalten=${spaltenMit} zeilen=${mitgelieferte.map(zeile)} />
      </section>
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("kataloge.entfernenTitel")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${entfernen}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
      >
        <p>${K.t("kataloge.entfernenText", { name: loeschen[0].datei })}</p>
      <//>`}
    `;
  };
})();
