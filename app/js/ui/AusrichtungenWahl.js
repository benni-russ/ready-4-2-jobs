(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // wert sind Ausrichtungs-IDs. „Alle“ ist nur eine Abkürzung: gespeichert wird die einzelne Auswahl.
  UI.AusrichtungenWahl = function (props) {
    var alle = K.tresor.daten().ausrichtungen;
    var wert = props.wert || [];
    if (!alle.length) return html`<p class="rj-hint">${K.t("ausrichtung.nochKeine")}</p>`;

    function umschalten(id, an) {
      var ohne = wert.filter(function (x) {
        return x !== id;
      });
      props.beiAenderung(an ? ohne.concat([id]) : ohne);
    }

    return html`<fieldset class="rj-fieldset">
      <legend>${K.t("ausrichtung.tags")}</legend>
      ${alle.length > 1 &&
      html`<${UI.Checkbox}
        label=${K.t("ausrichtung.alle")}
        wert=${wert.length === alle.length}
        beiAenderung=${function (an) {
          props.beiAenderung(
            an
              ? alle.map(function (a) {
                  return a.id;
                })
              : [],
          );
        }}
      />`}
      ${alle.map(function (a) {
        return html`<${UI.Checkbox}
          key=${a.id}
          label=${a.name}
          wert=${wert.indexOf(a.id) > -1}
          beiAenderung=${function (an) {
            umschalten(a.id, an);
          }}
        />`;
      })}
    </fieldset>`;
  };
})();
