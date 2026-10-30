(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // Zahl als Text, damit Eingaben wie „46.000“ erhalten bleiben. einheit ist nur Anzeige, sie gehört auch ins label.
  UI.ZahlFeld = function (props) {
    return html`<${UI.Feld}
      ...${props}
      kind=${function (f) {
        return html`<span class="rj-inputunit">
          <input
            class="rj-input"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder=${props.placeholder}
            value=${props.wert}
            onInput=${function (e) {
              props.beiAenderung(e.target.value);
            }}
            ...${f}
          />
          <span class="rj-inputunit__text" aria-hidden="true">${props.einheit}</span>
        </span>`;
      }}
    />`;
  };
})();
