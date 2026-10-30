(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // Ohne sichtbares Label für die FilterBar, die Option zeigt den aktiven Filter.
  UI.FilterSelect = function (props) {
    return html`<${UI.Dropdown}
      aria-label=${props.label}
      wert=${props.wert}
      optionen=${props.optionen}
      suche=${props.suche}
      beiAenderung=${props.beiAenderung}
    />`;
  };

  UI.Select = function (props) {
    return html`<${UI.Feld}
      ...${props}
      kind=${function (f) {
        return html`<${UI.Dropdown}
          label=${props.label}
          wert=${props.wert}
          optionen=${props.optionen}
          beiAenderung=${props.beiAenderung}
          ...${f}
          ...${UI.feldRest(props)}
        />`;
      }}
    />`;
  };
})();
