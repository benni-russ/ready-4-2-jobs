(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Icon = function (props) {
    var pfad = window.R42J.icons[props.name];
    if (!pfad) return null;
    return html`<svg
      class=${"rj-icon" + (props.class ? " " + props.class : "")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML=${{ __html: pfad }}
    ></svg>`;
  };
})();
