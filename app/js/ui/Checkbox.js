(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Checkbox = function (props) {
    return html`<label class="rj-check">
      <input
        type="checkbox"
        checked=${props.wert}
        disabled=${props.disabled}
        onChange=${function (e) {
          props.beiAenderung(e.target.checked);
        }}
      />
      <span>${props.label}${props.erklaerung && html`<small>${props.erklaerung}</small>`}</span>
    </label>`;
  };
})();
