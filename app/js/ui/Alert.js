(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  var ICONS = { info: "info", success: "circle-check", warning: "triangle-alert", danger: "circle-alert" };

  UI.Alert = function (props) {
    var art = props.art || "info";
    return html`<div class=${"rj-alert rj-alert--" + art + (props.klasse ? " " + props.klasse : "")} role=${art === "danger" ? "alert" : "status"}>
      <${UI.Icon} name=${ICONS[art]} />
      <div class="rj-alert__body">
        ${props.titel && html`<span class="rj-alert__title">${props.titel}</span>`}
        <span>${props.children}</span>
        ${props.aktionen && html`<div class="rj-alert__actions">${props.aktionen}</div>`}
      </div>
    </div>`;
  };
})();
