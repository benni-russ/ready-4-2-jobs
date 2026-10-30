(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // Ohne sichtbares Label für die FilterBar, die Option zeigt den aktiven Filter.
  UI.FilterSelect = function (props) {
    return html`<div class="rj-select-wrap">
      <select
        class="rj-select"
        aria-label=${props.label}
        value=${props.wert}
        onChange=${function (e) {
          props.beiAenderung(e.target.value);
        }}
      >
        ${props.optionen.map(function (o) {
          return html`<option key=${o.wert} value=${o.wert} selected=${o.wert === props.wert}>${o.label}</option>`;
        })}
      </select>
      <${UI.Icon} name="chevron-down" />
    </div>`;
  };

  UI.Select = function (props) {
    return html`<${UI.Feld}
      ...${props}
      kind=${function (f) {
        return html`<div class="rj-select-wrap">
          <select
            class="rj-select"
            value=${props.wert}
            onChange=${function (e) {
              props.beiAenderung(e.target.value);
            }}
            ...${f}
            ...${UI.feldRest(props)}
          >
            ${props.optionen.map(function (o) {
              return html`<option key=${o.wert} value=${o.wert} selected=${o.wert === props.wert}>${o.label}</option>`;
            })}
          </select>
          <${UI.Icon} name="chevron-down" />
        </div>`;
      }}
    />`;
  };
})();
