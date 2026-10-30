(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // Die Grenze steht bei 80 % der Spur, damit auch Überschreitungen sichtbar bleiben.
  var GRENZE_POSITION = 80;

  UI.SizeMeter = function (props) {
    var zuGross = props.bytes > props.grenze;
    var breite = Math.min(100, (props.bytes / props.grenze) * GRENZE_POSITION);
    return html`<div class="rj-size" data-state=${zuGross ? "warn" : "ok"}>
      <div class="rj-size__legend">
        <span class="rj-size__status">
          <${UI.Icon} name=${zuGross ? "triangle-alert" : "circle-check"} />
          ${K.t(zuGross ? "groesse.zuGross" : "groesse.passt", { groesse: K.groesseText(props.bytes) })}
        </span>
        <span class="rj-muted">${K.t("groesse.grenze", { groesse: K.groesseText(props.grenze) })}</span>
      </div>
      <div class="rj-size__track">
        <div class="rj-size__fill" style=${"width:" + breite + "%"}></div>
        <div class="rj-size__limit" style=${"left:" + GRENZE_POSITION + "%"}></div>
      </div>
    </div>`;
  };
})();
