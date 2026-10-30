(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.SearchField = function (props) {
    return html`<div class="rj-input-wrap">
      <${UI.Icon} name="search" />
      <input
        class=${"rj-input" + (props.kbd ? " rj-input--kbd" : "")}
        type="search"
        placeholder=${props.platzhalter}
        aria-label=${props.label}
        value=${props.wert}
        onInput=${function (e) {
          props.beiAenderung(e.target.value);
        }}
      />
      ${props.kbd && html`<span class="rj-kbd">${props.kbd}</span>`}
    </div>`;
  };
})();
