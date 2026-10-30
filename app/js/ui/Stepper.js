(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Stepper = function (props) {
    return html`<ol class="rj-stepper rj-noprint">
      ${props.schritte.map(function (text, i) {
        var nr = i + 1;
        return html`<li
          key=${nr}
          data-state=${nr < props.aktuell ? "done" : undefined}
          aria-current=${nr === props.aktuell ? "step" : undefined}
        >
          ${text}
        </li>`;
      })}
    </ol>`;
  };
})();
