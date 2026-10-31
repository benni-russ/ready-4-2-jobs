(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.EmptyState = function (props) {
    var Titel = props.seitentitel ? "h1" : "h2";
    return html`<div class="rj-empty">
      <div class="rj-empty__icon"><${UI.Icon} name=${props.icon} /></div>
      <${Titel} class="h3">${props.titel}<//>
      <p>${props.text}</p>
      ${props.children}
    </div>`;
  };
})();
