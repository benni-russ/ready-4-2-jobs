(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.SegmentedControl = function (props) {
    return html`<div class="rj-seg" role="group" aria-label=${props.label}>
      ${props.optionen.map(function (o) {
        return html`<button
          key=${o.wert}
          type="button"
          aria-pressed=${o.wert === props.wert ? "true" : "false"}
          onClick=${function () {
            props.beiAenderung(o.wert);
          }}
        >
          ${o.icon && html`<${UI.Icon} name=${o.icon} />`} ${o.label}
        </button>`;
      })}
    </div>`;
  };
})();
