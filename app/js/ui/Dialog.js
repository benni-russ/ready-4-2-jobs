(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var FOKUSSIERBAR = "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])";

  UI.Dialog = function (props) {
    var kasten = hooks.useRef(null);
    var titelId = hooks.useId();

    // Fokus wandert hinein und beim Schließen zurück. Tab bleibt im Dialog.
    hooks.useEffect(function () {
      var vorher = document.activeElement;
      var imInhalt = kasten.current.querySelector(".rj-dialog__body input, .rj-dialog__body textarea, .rj-dialog__body [role=combobox]");
      (imInhalt || kasten.current.querySelector(".rj-dialog__foot button")).focus();
      return function () {
        // Nach einem Suchtreffer gibt es kein Ausgangselement mehr, dann in den Inhalt.
        var ziel = vorher && vorher.isConnected && vorher !== document.body ? vorher : document.querySelector("main");
        if (ziel) ziel.focus();
      };
    }, []);

    function taste(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        props.beiSchliessen();
      }
      if (e.key !== "Tab") return;
      var alle = kasten.current.querySelectorAll(FOKUSSIERBAR);
      var erstes = alle[0];
      var letztes = alle[alle.length - 1];
      if (e.shiftKey && document.activeElement === erstes) {
        e.preventDefault();
        letztes.focus();
      } else if (!e.shiftKey && document.activeElement === letztes) {
        e.preventDefault();
        erstes.focus();
      }
    }

    return html`<div class="rj-overlay">
      <form
        class=${"rj-dialog" + (props.breit ? " rj-dialog--wide" : "")}
        role="dialog"
        noValidate=${props.eigenePruefung}
        aria-modal="true"
        aria-labelledby=${titelId}
        ref=${kasten}
        onKeyDown=${taste}
        onSubmit=${function (e) {
          e.preventDefault();
          if (props.beiBestaetigen) props.beiBestaetigen();
        }}
      >
        <div class="rj-dialog__head">
          <h3 class="h3" id=${titelId}>${props.titel}</h3>
          <${UI.IconButton} icon="x" label=${K.t("aktion.schliessen")} onClick=${props.beiSchliessen} />
        </div>
        <div class="rj-dialog__body rj-stack">${props.children}</div>
        <div class="rj-dialog__foot">
          ${props.bestaetigen
            ? html`<${UI.Button} onClick=${props.beiSchliessen}>${K.t("aktion.abbrechen")}<//>
                <${UI.Button} type="submit" variante=${props.gefahr ? "danger" : "primary"} laedt=${props.laedt} disabled=${props.laedt}>
                  ${props.bestaetigen}
                <//>`
            : html`<${UI.Button} onClick=${props.beiSchliessen}>${K.t("aktion.schliessen")}<//>`}
        </div>
      </form>
    </div>`;
  };
})();
