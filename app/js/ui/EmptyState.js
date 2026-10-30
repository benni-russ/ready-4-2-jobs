(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.EmptyState = function (props) {
    return html`<div class="rj-empty">
      <div class="rj-empty__icon"><${UI.Icon} name=${props.icon} /></div>
      <h2 class="h3">${props.titel}</h2>
      <p>${props.text}</p>
      ${props.children}
    </div>`;
  };
})();
