(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Radio = function (props) {
    var name = window.preactHooks.useId();
    return html`<fieldset class="rj-fieldset">
      <legend>${props.legende}</legend>
      ${props.optionen.map(function (o) {
        return html`<label class="rj-check" key=${o.wert}>
          <input
            type="radio"
            name=${name}
            checked=${o.wert === props.wert}
            onChange=${function () {
              props.beiAenderung(o.wert);
            }}
          />
          <span>${o.label}${o.erklaerung && html`<small>${o.erklaerung}</small>`}</span>
        </label>`;
      })}
    </fieldset>`;
  };
})();
