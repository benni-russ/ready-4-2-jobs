(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var hooks = window.preactHooks;

  // tabs: [{ wert, label }], höchstens sechs (Design-System). Pfeiltasten wechseln den Reiter.
  UI.Tabs = function (props) {
    var id = hooks.useId();
    var leiste = hooks.useRef(null);

    function taste(e) {
      var richtung = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!richtung) return;
      e.preventDefault();
      var werte = props.tabs.map(function (t) {
        return t.wert;
      });
      var neu = (werte.indexOf(props.wert) + richtung + werte.length) % werte.length;
      props.beiAenderung(werte[neu]);
      leiste.current.querySelectorAll("button")[neu].focus();
    }

    return html`<div class="rj-stack">
      <div class="rj-tabs rj-noprint" role="tablist" aria-label=${props.label} ref=${leiste} onKeyDown=${taste}>
        ${props.tabs.map(function (t) {
          var aktiv = t.wert === props.wert;
          return html`<button
            key=${t.wert}
            type="button"
            role="tab"
            id=${id + "-" + t.wert}
            aria-selected=${aktiv ? "true" : "false"}
            aria-controls=${id + "-panel"}
            tabindex=${aktiv ? undefined : "-1"}
            onClick=${function () {
              props.beiAenderung(t.wert);
            }}
          >
            ${t.label}
          </button>`;
        })}
      </div>
      <div class="rj-stack" role="tabpanel" id=${id + "-panel"} aria-labelledby=${id + "-" + props.wert}>${props.children}</div>
    </div>`;
  };
})();
