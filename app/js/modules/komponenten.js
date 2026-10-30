(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});
  var hooks = window.preactHooks;

  // Frei erfundene Beispieldaten. Die Seite zeigt die Grund-Komponenten im Zusammenspiel.
  var BEISPIELE = [
    { id: "1", versendet: "14.10.2026", firma: "Musterfirma GmbH", stelle: "Personalsachbearbeitung", status: "rueckfrage_faellig", rang: 2, match: "78 %" },
    { id: "2", versendet: "09.10.2026", firma: "Beispiel AG", stelle: "Sachbearbeitung Entgelt", status: "gespraech_vor_ort", rang: 6, match: "85 %" },
    { id: "3", versendet: "01.10.2026", firma: "Nordlicht KG", stelle: "Büroassistenz", status: "absage", rang: 12, match: "61 %" },
    { id: "4", versendet: "28.09.2026", firma: "Müller & Söhne", stelle: "Personalreferentin", status: "versendet", rang: 1, match: "72 %" },
  ];

  S.Komponenten = function () {
    var textPaar = hooks.useState("");
    var mehrPaar = hooks.useState("");
    var wahlPaar = hooks.useState("a");
    var hakenPaar = hooks.useState(true);
    var radioPaar = hooks.useState("sie");
    var schalterPaar = hooks.useState(false);
    var datumPaar = hooks.useState("2026-12-01");
    var terminPaar = hooks.useState("");
    var suchePaar = hooks.useState("");

    var spalten = [
      { schluessel: "versendet", titel: K.t("demo.spalteVersendet"), typ: "date" },
      {
        schluessel: "firma",
        titel: K.t("demo.spalteFirma"),
        zelle: function (z) {
          return html`<strong>${z.firma}</strong>`;
        },
      },
      { schluessel: "stelle", titel: K.t("demo.spalteStelle") },
      {
        schluessel: "status",
        titel: K.t("demo.spalteStatus"),
        text: function (z) {
          return UI.statusText(z.status);
        },
        sortwert: function (z) {
          return z.rang;
        },
        zelle: function (z) {
          return html`<${UI.StatusBadge} status=${z.status} />`;
        },
      },
      { schluessel: "match", titel: K.t("demo.spalteMatch"), typ: "number", num: true },
    ];

    return html`
      <div class="rj-pagehead">
        <div class="rj-stack">
          <h1 class="h1">${K.t("demo.titel")}</h1>
          <p class="rj-muted">${K.t("demo.text")}</p>
        </div>
      </div>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("demo.buttons")}</h2>
        <div class="rj-row">
          <${UI.Button} variante="primary" icon="file-text">${K.t("demo.primaer")}<//>
          <${UI.Button}>${K.t("demo.sekundaer")}<//>
          <${UI.Button} variante="ghost" icon="pencil">${K.t("demo.ghost")}<//>
          <${UI.Button} variante="danger-quiet" icon="trash-2">${K.t("demo.loeschen")}<//>
          <${UI.Button} variante="primary" laedt=${true}>${K.t("demo.laedt")}<//>
          <${UI.IconButton} icon="eye" label=${K.t("demo.vorschau")} />
        </div>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("demo.felder")}</h2>
        <div class="rj-grid-2">
          <${UI.TextField}
            label=${K.t("demo.email")}
            type="email"
            pflicht=${true}
            wert=${textPaar[0]}
            beiAenderung=${textPaar[1]}
            hinweis=${K.t("demo.emailHinweis")}
          />
          <${UI.DatePicker}
            label=${K.t("demo.eintritt")}
            wert=${datumPaar[0]}
            beiAenderung=${datumPaar[1]}
            hinweis=${K.t("demo.eintrittHinweis")}
          />
          <${UI.DatePicker} label=${K.t("demo.termin")} wert=${terminPaar[0]} beiAenderung=${terminPaar[1]} min="2026-10-30" />
          <${UI.Select}
            label=${K.t("demo.ausrichtung")}
            wert=${wahlPaar[0]}
            beiAenderung=${wahlPaar[1]}
            optionen=${[
              { wert: "a", label: K.t("demo.ausrichtungA") },
              { wert: "b", label: K.t("demo.ausrichtungB") },
            ]}
          />
        </div>
        <${UI.Textarea} label=${K.t("demo.motivation")} wert=${mehrPaar[0]} beiAenderung=${mehrPaar[1]} spellcheck="true" />
        <${UI.Checkbox}
          label=${K.t("demo.haken")}
          erklaerung=${K.t("demo.hakenText")}
          wert=${hakenPaar[0]}
          beiAenderung=${hakenPaar[1]}
        />
        <${UI.Radio}
          legende=${K.t("demo.anrede")}
          wert=${radioPaar[0]}
          beiAenderung=${radioPaar[1]}
          optionen=${[
            { wert: "sie", label: K.t("demo.sie") },
            { wert: "du", label: K.t("demo.du") },
          ]}
        />
        <${UI.Switch} label=${K.t("demo.schalter")} wert=${schalterPaar[0]} beiAenderung=${schalterPaar[1]} />
        <${UI.SearchField}
          label=${K.t("demo.suche")}
          platzhalter=${K.t("demo.suche")}
          wert=${suchePaar[0]}
          beiAenderung=${suchePaar[1]}
        />
      </section>
      <section class="rj-stack">
        <h2 class="h3">${K.t("demo.tabelle")}</h2>
        <${UI.DataTable}
          spalten=${spalten}
          zeilen=${BEISPIELE}
          startSortierung=${{ spalte: "versendet", richtung: "descending" }}
        />
      </section>
    `;
  };
})();
