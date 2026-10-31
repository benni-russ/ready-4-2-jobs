(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  var ICON = { speichert: "refresh-cw", gespeichert: "circle-check", fehler: "triangle-alert" };

  UI.SaveState = function () {
    var stand = K.useBeobachtbar(K.speicherStand).stand;
    var entwurf = K.useBeobachtbar(K.entwurfOffen).offen;
    if (entwurf && stand !== "fehler") {
      return html`<span class="rj-savestate" role="status" data-stand="entwurf" title=${K.t("speichern.entwurf")}>
        <${UI.Icon} name="pencil" />
        <span class="rj-savestate__text">${K.t("speichern.entwurf")}</span>
      </span>`;
    }
    if (!ICON[stand]) return html`<span class="rj-savestate" role="status"></span>`;
    var text = K.t("speichern." + stand);
    return html`<span class="rj-savestate" role="status" data-stand=${stand} title=${text}>
      <${UI.Icon} name=${ICON[stand]} />
      <span class="rj-savestate__text">${text}</span>
    </span>`;
  };
})();
