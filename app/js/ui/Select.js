(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // Ohne sichtbares Label für die FilterBar, die Option zeigt den aktiven Filter.
  // Mit icon steht die Beschriftung sichtbar über der Auswahl.
  UI.FilterSelect = function (props) {
    var auswahl = html`<${UI.Dropdown}
      aria-label=${props.label}
      wert=${props.wert}
      optionen=${props.optionen}
      suche=${props.suche}
      beiAenderung=${props.beiAenderung}
    />`;
    if (!props.icon) return auswahl;
    return html`<div class="rj-filter">
      <span class="rj-filter__titel" aria-hidden="true"><${UI.Icon} name=${props.icon} />${props.label}</span>
      ${auswahl}
    </div>`;
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
