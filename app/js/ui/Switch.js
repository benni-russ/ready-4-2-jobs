(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  UI.Switch = function (props) {
    return html`<button
      class="rj-switch"
      type="button"
      role="switch"
      aria-checked=${props.wert ? "true" : "false"}
      onClick=${function () {
        props.beiAenderung(!props.wert);
      }}
    >
      <span class="rj-switch__track"></span>
      <span>${props.label}</span>
      <span class="rj-switch__state">${K.t(props.wert ? "schalter.an" : "schalter.aus")}</span>
    </button>`;
  };
})();
