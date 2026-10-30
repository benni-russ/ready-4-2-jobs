(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var hooks = window.preactHooks;

  UI.Slider = function (props) {
    var id = hooks.useId();
    return html`<div class="rj-slider">
      <label class="rj-label" for=${id}>${props.label}</label>
      <output for=${id}>${props.wert}</output>
      <input
        type="range"
        id=${id}
        min=${props.min}
        max=${props.max}
        step="1"
        value=${props.wert}
        onInput=${function (e) {
          props.beiAenderung(Number(e.target.value));
        }}
      />
      <div class="rj-slider__scale"><span>${props.skalaMin}</span><span>${props.skalaMax}</span></div>
    </div>`;
  };
})();
