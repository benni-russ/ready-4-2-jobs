(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // Druckblatt für den Wiederherstellungsschlüssel. Nichts davon wird gespeichert.
  UI.SchluesselBlatt = function (props) {
    async function kopieren() {
      try {
        await window.navigator.clipboard.writeText(props.bloecke.join("-"));
        K.meldung(K.t("schluessel.kopiert"));
      } catch (e) {
        K.meldung(K.t("schluessel.kopierenFehler"), "danger");
      }
    }
    return html`<div class="rj-stack">
      <${UI.Alert} art="warning" klasse="rj-noprint" titel=${K.t("schluessel.warnTitel")}>${K.t("schluessel.warnText")}<//>
      <p><strong>${K.t("schluessel.fuer", { name: props.name })}</strong> · ${new Date().toLocaleDateString(K.sprache())}</p>
      <div class="rj-recovery" aria-label=${K.t("schluessel.titel")}>
        ${props.bloecke.map(function (b, i) {
          return html`<code key=${i}>${b}</code>`;
        })}
      </div>
      <p class="rj-muted">${K.t("schluessel.anleitung")}</p>
      <div class="rj-row rj-noprint">
        <${UI.Button}
          variante="primary"
          icon="printer"
          onClick=${function () {
            window.print();
          }}
          >${K.t("schluessel.drucken")}<//
        >
        <${UI.Button} icon="copy" onClick=${kopieren}>${K.t("schluessel.kopieren")}<//>
      </div>
    </div>`;
  };
})();
