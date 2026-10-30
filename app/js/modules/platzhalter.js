(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  // Bereiche, die in späteren Meilensteinen entstehen.
  S.Platzhalter = function (props) {
    return html`
      <div class="rj-pagehead"><h1 class="h1">${K.t("nav." + props.seite)}</h1></div>
      <${UI.EmptyState} icon=${props.icon} titel=${K.t("platzhalter.titel")} text=${K.t("platzhalter.text")}>
        <${UI.Button} variante="primary" icon="settings" href="#/einstellungen">${K.t("platzhalter.aktion")}<//>
      <//>
    `;
  };
})();
