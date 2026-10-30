(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // felder: [{ label, wert, anzeige? }]. Lange Texte werden gekürzt gezeigt, kopiert wird immer der volle Wert.
  UI.CopyFieldList = function (props) {
    return html`<dl style="margin:0">
      ${props.felder.map(function (f) {
        return html`<div class="rj-copyrow" key=${f.label}>
          <dt>${f.label}</dt>
          <dd title=${f.wert}>${f.anzeige || f.wert}</dd>
          <${UI.CopyButton} text=${f.wert}>${K.t("kopieren.feld")}<//>
        </div>`;
      })}
    </dl>`;
  };
})();
