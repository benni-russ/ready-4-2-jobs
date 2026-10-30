(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  S.OrdnerWahl = function (props) {
    return html`<${UI.Bildschirm} titel=${K.t("ordner.titel")} text=${K.t("ordner.text")}>
      ${props.fehler && html`<${UI.Alert} art="danger">${props.fehler}<//>`}
      <${UI.Button} variante="primary" lg block icon="folder-open" onClick=${K.ordnerWaehlen}>${K.t("ordner.aktion")}<//>
    <//>`;
  };

  S.ZugriffErneuern = function () {
    return html`<${UI.Bildschirm} titel=${K.t("zugriff.titel")} text=${K.t("zugriff.text")}>
      <${UI.Button} variante="primary" lg block icon="hard-drive" onClick=${K.zugriffErneuern}>${K.t("zugriff.aktion")}<//>
      <${UI.Button} block onClick=${K.ordnerWaehlen}>${K.t("zugriff.anderer")}<//>
    <//>`;
  };
})();
