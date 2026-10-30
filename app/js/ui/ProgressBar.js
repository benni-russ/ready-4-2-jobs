(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.ProgressBar = function (props) {
    var fertig = props.wert >= props.max;
    var prozent = props.max ? (props.wert / props.max) * 100 : 0;
    return html`<div class=${"rj-progress" + (fertig ? " rj-progress--done" : "")}>
      <div class="rj-progress__head">
        <span>${props.label}</span>
        <strong>${props.text}</strong>
      </div>
      <div class="rj-progress__track" role="progressbar" aria-label=${props.label} aria-valuenow=${props.wert} aria-valuemin="0" aria-valuemax=${props.max}>
        <div class="rj-progress__fill" style=${"width:" + prozent + "%"}></div>
      </div>
    </div>`;
  };
})();
