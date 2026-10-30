(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // wert ist eine Liste von Texten. Enter oder Komma fügt hinzu, Rücktaste entfernt den letzten.
  UI.TagInput = function (props) {
    var id = hooks.useId();
    var eingabe = hooks.useState("");
    var wert = props.wert || [];

    function hinzufuegen(text) {
      var t = text.trim();
      eingabe[1]("");
      if (t && wert.indexOf(t) === -1) props.beiAenderung(wert.concat([t]));
    }

    function taste(e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        hinzufuegen(eingabe[0]);
      }
      if (e.key === "Backspace" && !eingabe[0] && wert.length) props.beiAenderung(wert.slice(0, -1));
    }

    return html`<div class="rj-field">
      <label class="rj-label" for=${id}>${props.label}</label>
      <div class="rj-taginput">
        ${wert.map(function (t) {
          return html`<span class="rj-chip rj-chip--selected" key=${t}>
            ${t}
            <button
              type="button"
              aria-label=${K.t("feld.entfernen", { name: t })}
              onClick=${function () {
                props.beiAenderung(
                  wert.filter(function (x) {
                    return x !== t;
                  }),
                );
              }}
            >
              <${UI.Icon} name="x" />
            </button>
          </span>`;
        })}
        <input
          id=${id}
          list=${props.vorschlaege ? id + "-liste" : undefined}
          placeholder=${props.platzhalter}
          aria-describedby=${props.hinweis ? id + "-hinweis" : undefined}
          value=${eingabe[0]}
          onInput=${function (e) {
            eingabe[1](e.target.value);
            // Auswahl aus der Vorschlagsliste kommt ohne Tastendruck an.
            if (e.inputType === "insertReplacementText" || e.inputType === undefined) hinzufuegen(e.target.value);
          }}
          onKeyDown=${taste}
          onBlur=${function () {
            hinzufuegen(eingabe[0]);
          }}
        />
        ${props.vorschlaege &&
        html`<datalist id=${id + "-liste"}>
          ${props.vorschlaege.map(function (v) {
            return html`<option key=${v} value=${v}></option>`;
          })}
        </datalist>`}
      </div>
      ${props.hinweis && html`<span class="rj-hint" id=${id + "-hinweis"}>${props.hinweis}</span>`}
    </div>`;
  };
})();
