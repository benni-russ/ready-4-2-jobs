(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.TextField = function (props) {
    return html`<${UI.Feld}
      ...${props}
      kind=${function (f) {
        return html`<input
          class="rj-input"
          type="text"
          value=${props.wert}
          onInput=${function (e) {
            props.beiAenderung(e.target.value);
          }}
          ...${f}
          ...${UI.feldRest(props)}
        />`;
      }}
    />`;
  };
})();
