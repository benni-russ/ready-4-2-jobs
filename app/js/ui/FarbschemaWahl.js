(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var hooks = window.preactHooks;

  // Jedes Feld setzt data-scheme nur auf seinem Farbfleck und zeigt so den Akzent des aktuellen Hell- oder Dunkelmodus.
  // optionen: [{ wert, label }]
  UI.FarbschemaWahl = function (props) {
    var name = hooks.useId();
    return html`<fieldset class="rj-schemes">
      <legend class="rj-label">${props.label}</legend>
      <div class="rj-schemes__liste">
        ${props.optionen.map(function (o) {
          return html`<label class="rj-scheme" key=${o.wert}>
            <input
              type="radio"
              name=${name}
              checked=${o.wert === props.wert}
              onChange=${function () {
                props.beiAenderung(o.wert);
              }}
            />
            <span class="rj-scheme__farbe" data-scheme=${o.wert}></span>
            <span>${o.label}</span>
          </label>`;
        })}
      </div>
    </fieldset>`;
  };
})();
