(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var BUCHSTABEN = "ABCDEFGH";

  function ergebnis(o, gewaehlt, aufgeloest) {
    if (!aufgeloest) return undefined;
    if (o.richtig) return "correct";
    return gewaehlt ? "wrong" : undefined;
  }

  // QuizOption-Gruppe. optionen: [{ text, richtig }], auswahl: Indizes. Bei `mehrere` als Checkboxen.
  UI.Quiz = function (props) {
    var gruppe = hooks.useRef(null);
    var mehrere = props.mehrere;
    var aufgeloest = props.aufgeloest;

    hooks.useEffect(
      function () {
        function taste(e) {
          if (!UI.tasteFrei(e) || aufgeloest || e.key.length !== 1) return;
          var i = BUCHSTABEN.indexOf(e.key.toUpperCase());
          if (i > -1 && i < props.optionen.length) props.beiWahl(i);
        }
        document.addEventListener("keydown", taste);
        return function () {
          document.removeEventListener("keydown", taste);
        };
      },
      [aufgeloest, props.beiWahl, props.optionen.length],
    );

    function pfeil(e) {
      var richtung = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (!richtung) return;
      e.preventDefault();
      var knoepfe = Array.prototype.slice.call(gruppe.current.querySelectorAll("button"));
      var neu = (knoepfe.indexOf(document.activeElement) + richtung + knoepfe.length) % knoepfe.length;
      knoepfe[neu].focus();
    }

    return html`<div class="rj-quiz" role=${mehrere ? "group" : "radiogroup"} aria-label=${K.t("quiz.antworten")} ref=${gruppe} onKeyDown=${pfeil}>
      ${props.optionen.map(function (o, i) {
        var gewaehlt = props.auswahl.indexOf(i) > -1;
        var e = ergebnis(o, gewaehlt, aufgeloest);
        return html`<button
          key=${i}
          class="rj-option"
          type="button"
          role=${mehrere ? "checkbox" : "radio"}
          aria-checked=${gewaehlt ? "true" : "false"}
          aria-disabled=${aufgeloest ? "true" : undefined}
          data-result=${e}
          onClick=${function () {
            if (!aufgeloest) props.beiWahl(i);
          }}
        >
          <span class="rj-option__key">${BUCHSTABEN[i]}</span>
          ${o.text}
          ${e &&
          html`<span class="rj-option__verdict">
            <${UI.Icon} name=${e === "correct" ? "circle-check" : "circle-x"} />
            ${e === "correct" ? K.t("quiz.richtig") : K.t("quiz.deineAntwort")}
          </span>`}
        </button>`;
      })}
    </div>`;
  };
})();
