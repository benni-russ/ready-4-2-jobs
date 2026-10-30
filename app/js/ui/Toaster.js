(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  var ICONS = { success: "circle-check", info: "info", danger: "circle-alert" };

  UI.Toaster = function () {
    var z = K.useBeobachtbar(K.meldungen);
    return html`<div class="rj-toaster rj-noprint" aria-live="polite">
      ${z.liste.map(function (m) {
        return html`<div class=${"rj-toast rj-toast--" + m.art} role="status" key=${m.id}>
          <${UI.Icon} name=${ICONS[m.art]} />
          <div class="rj-toast__body">${m.text}</div>
          <${UI.IconButton}
            icon="x"
            label=${K.t("aktion.schliessen")}
            onClick=${function () {
              K.meldungEntfernen(m.id);
            }}
          />
        </div>`;
      })}
    </div>`;
  };
})();
