(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // punkte: { schluessel, label, erklaerung?, wert, aktion? }
  UI.Checklist = function (props) {
    return html`<ul class="rj-checklist">
      ${props.punkte.map(function (p) {
        return html`<li key=${p.schluessel}>
          <${UI.Checkbox}
            label=${p.label}
            erklaerung=${p.erklaerung}
            wert=${p.wert}
            beiAenderung=${function (w) {
              props.beiAenderung(p.schluessel, w);
            }}
          />
          ${p.aktion}
        </li>`;
      })}
    </ul>`;
  };
})();
