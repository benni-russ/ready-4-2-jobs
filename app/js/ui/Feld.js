(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // Gemeinsamer Aufbau aller Formularfelder: Beschriftung, Eingabe, Hinweis, Fehler.
  // `kind` bekommt die ids und aria-Attribute, die das Feld verknüpfen.
  UI.Feld = function (props) {
    var id = window.preactHooks.useId();
    var hinweisId = id + "-hinweis";
    var fehlerId = id + "-fehler";
    var beschrieben = props.fehler ? fehlerId : props.hinweis ? hinweisId : undefined;
    return html`<div class="rj-field">
      <label class="rj-label" for=${id}>
        ${props.label} ${props.pflicht && html`<span class="rj-req">${K.t("feld.pflicht")}</span>`}
      </label>
      ${props.kind({
        id: id,
        "aria-describedby": beschrieben,
        "aria-invalid": props.fehler ? "true" : undefined,
        required: props.pflicht || undefined,
      })}
      ${props.hinweis && !props.fehler && html`<span class="rj-hint" id=${hinweisId}>${props.hinweis}</span>`}
      ${props.fehler &&
      html`<span class="rj-error" id=${fehlerId}><${UI.Icon} name="circle-alert" />${props.fehler}</span>`}
    </div>`;
  };

  // Entfernt die Feld-Props, der Rest geht an das eigentliche Eingabeelement.
  UI.feldRest = function (props) {
    var rest = Object.assign({}, props);
    ["label", "hinweis", "fehler", "pflicht", "wert", "beiAenderung", "optionen"].forEach(function (k) {
      delete rest[k];
    });
    return rest;
  };
})();
