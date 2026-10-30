(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var BOXEN = 5;

  // Kein Kürzel, solange ein Eingabefeld oder Dialog die Tasten braucht.
  UI.tasteFrei = function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    var z = e.target;
    return !(z && z.closest && z.closest("input, textarea, select, [role=dialog]"));
  };

  UI.Flashcard = function (props) {
    var antwort = hooks.useRef(null);
    var frage = hooks.useRef(null);
    var offen = props.offen;

    hooks.useEffect(
      function () {
        (offen ? antwort : frage).current.focus();
      },
      [offen],
    );

    hooks.useEffect(
      function () {
        function taste(e) {
          if (!UI.tasteFrei(e)) return;
          if (!offen && (e.key === " " || e.key === "Enter") && e.target.tagName !== "BUTTON") {
            e.preventDefault();
            props.beiZeigen();
          }
          if (offen && e.key === "1") props.beiBewerten(false);
          if (offen && e.key === "2") props.beiBewerten(true);
        }
        document.addEventListener("keydown", taste);
        return function () {
          document.removeEventListener("keydown", taste);
        };
      },
      [offen, props.beiBewerten, props.beiZeigen],
    );

    var boxen = [];
    for (var i = 1; i <= BOXEN; i++) boxen.push(html`<span class=${i <= props.box ? "is-on" : undefined} key=${i}></span>`);

    return html`<div class="rj-flash">
      <div class="rj-flash__meta">
        <span>${props.kopf}</span>
        <span class="rj-row" style="gap:8px">
          <span class="rj-boxes" aria-hidden="true">${boxen}</span>
          ${K.t("flash.box", { box: props.box, gesamt: BOXEN })}
        </span>
      </div>
      <div class="rj-flash__card">
        <p class="rj-flash__q" tabindex="-1" ref=${frage}>${props.frage}</p>
        ${offen &&
        html`<div class="rj-flash__a" tabindex="-1" ref=${antwort}>
          <strong>${props.antwort}</strong>
          ${props.erklaerung && html`<div class="rj-muted">${props.erklaerung}</div>`}
        </div>`}
      </div>
      ${offen
        ? html`<div class="rj-grid-2">
            <${UI.Button}
              variante="secondary"
              lg=${true}
              icon="rotate-ccw"
              onClick=${function () {
                props.beiBewerten(false);
              }}
              >${K.t("flash.nichtGewusst")}<//
            >
            <${UI.Button}
              variante="primary"
              lg=${true}
              icon="check"
              onClick=${function () {
                props.beiBewerten(true);
              }}
              >${K.t("flash.gewusst")}<//
            >
          </div>`
        : html`<${UI.Button} variante="primary" lg=${true} onClick=${props.beiZeigen}>${K.t("flash.zeigen")}<//>`}
    </div>`;
  };
})();
