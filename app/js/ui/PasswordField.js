(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var FARBE = { 1: "var(--danger)", 2: "var(--warning)", 3: "var(--success)", 4: "var(--success)" };

  // `neu` zeigt die Stärke an und schaltet den Browser auf „neues Passwort“.
  UI.PasswordField = function (props) {
    var sichtbar = hooks.useState(false);
    var stufe = props.neu && props.wert ? K.krypto.passwortStaerke(props.wert) : 0;
    var label = K.t(sichtbar[0] ? "passwort.verbergen" : "passwort.zeigen");
    return html`<${UI.Feld}
      label=${props.label}
      fehler=${props.fehler}
      hinweis=${props.hinweis}
      pflicht=${props.pflicht}
      kind=${function (f) {
        return html`<div class="rj-input-wrap">
          <input
            class="rj-input"
            type=${sichtbar[0] ? "text" : "password"}
            autocomplete=${props.neu ? "new-password" : "current-password"}
            spellcheck="false"
            value=${props.wert}
            ref=${props.eingabeRef}
            onInput=${function (e) {
              props.beiAenderung(e.target.value);
            }}
            ...${f}
          />
          <${UI.IconButton}
            icon=${sichtbar[0] ? "eye-off" : "eye"}
            label=${label}
            aria-pressed=${sichtbar[0] ? "true" : "false"}
            onClick=${function () {
              sichtbar[1](!sichtbar[0]);
            }}
          />
        </div>`;
      }}
    />
    ${stufe > 0 &&
    html`<div class="rj-strength" data-level=${stufe} aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <span class="rj-strength-text" style=${"color:" + FARBE[stufe]}>
        <${UI.Icon} name="shield-check" />${K.t("passwort.stufe" + stufe)}
      </span>`}`;
  };
})();
