(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Stepper = function (props) {
    var kompakt = props.kompakt || props.schritte.length > 6;
    return html`<ol class=${"rj-stepper rj-noprint" + (kompakt ? " rj-stepper--kompakt" : "")}>
      ${props.schritte.map(function (text, i) {
        var nr = i + 1;
        return html`<li
          key=${nr}
          data-state=${nr < props.aktuell ? "done" : undefined}
          aria-current=${nr === props.aktuell ? "step" : undefined}
        >
          ${props.beiWahl
            ? html`<button
                type="button"
                class="rj-stepper__knopf"
                onClick=${function () {
                  props.beiWahl(nr);
                }}
              >
                ${kompakt ? html`<span>${text}</span>` : text}
              </button>`
            : kompakt
            ? html`<span>${text}</span>`
            : text}
        </li>`;
      })}
    </ol>`;
  };
})();
