(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.StatTile = function (props) {
    return html`<div class="rj-stat">
      <span class="rj-stat__label">${props.titel}</span>
      <span class="rj-stat__value">${props.wert}</span>
      <span class="rj-stat__basis">${props.basis}</span>
    </div>`;
  };
})();
