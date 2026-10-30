(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // Grundgerüst jedes KI-Workflows (SPEC §6.3). beiPruefen wirft bei Fehlern oder liefert eine Liste von Meldungen.
  UI.PromptPanel = function (props) {
    var antwort = hooks.useState("");
    var fehler = hooks.useState([]);

    function pruefen() {
      try {
        var probleme = props.beiPruefen(antwort[0]) || [];
        fehler[1](probleme);
        document.getElementById("rj-live").textContent = probleme.join(" ");
      } catch (e) {
        var text = K.fehlerText(e);
        fehler[1]([text]);
        document.getElementById("rj-live").textContent = text;
      }
    }

    return html`<div class="rj-prompt">
      <div class="rj-prompt__step">
        <span class="rj-prompt__num">1</span>
        <div>
          <strong>${K.t("ki.schritt1")}</strong>
          <${UI.Switch} label=${K.t("ki.platzhalter")} wert=${props.platzhalter} beiAenderung=${props.beiPlatzhalter} />
          ${props.platzhalter && html`<span class="rj-hint">${K.t("ki.platzhalterHinweis")}</span>`}
          <textarea class="rj-textarea" rows="8" readonly aria-label=${K.t("ki.prompt")} value=${props.prompt}></textarea>
          <div class="rj-row"><${UI.CopyButton} text=${props.prompt} icon="clipboard-copy">${K.t("ki.kopieren")}<//></div>
        </div>
      </div>
      <div class="rj-prompt__step">
        <span class="rj-prompt__num">2</span>
        <div>
          <strong>${K.t("ki.schritt2")}</strong>
          <span class="rj-muted">${K.t("ki.schritt2Text")}</span>
        </div>
      </div>
      <div class="rj-prompt__step">
        <span class="rj-prompt__num">3</span>
        <div>
          <${UI.Textarea} label=${K.t("ki.schritt3")} wert=${antwort[0]} beiAenderung=${antwort[1]} rows="8" spellcheck="false" />
          ${fehler[0].length > 0 &&
          html`<${UI.Alert} art="danger">
            ${fehler[0].length === 1
              ? fehler[0][0]
              : html`<ul style="margin:0;padding-left:1.25em">
                  ${fehler[0].map(function (f, i) {
                    return html`<li key=${i}>${f}</li>`;
                  })}
                </ul>`}
          <//>`}
          <div class="rj-row">
            <${UI.Button} variante="primary" icon="check" onClick=${pruefen}>${K.t("ki.pruefen")}<//>
            ${props.beiSelbst && html`<${UI.Button} variante="ghost" onClick=${props.beiSelbst}>${K.t("ki.selbst")}<//>`}
          </div>
        </div>
      </div>
    </div>`;
  };
})();
