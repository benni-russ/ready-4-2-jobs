(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var ANZEIGE_MS = 1600;

  async function kopieren(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  UI.CopyButton = function (props) {
    var kopiert = hooks.useState(false);
    var timer = hooks.useRef(null);

    hooks.useEffect(function () {
      return function () {
        window.clearTimeout(timer.current);
      };
    }, []);

    async function klick() {
      var geklappt = await kopieren(props.text);
      if (!geklappt) return K.meldung(K.t("kopieren.fehler"), "danger");
      kopiert[1](true);
      document.getElementById("rj-live").textContent = K.t("kopieren.fertig");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(function () {
        kopiert[1](false);
      }, ANZEIGE_MS);
    }

    return html`<button class="rj-btn rj-btn--secondary rj-copy" type="button" data-copied=${kopiert[0] ? "true" : undefined} onClick=${klick}>
      <${UI.Icon} name=${kopiert[0] ? "check" : props.icon || "copy"} />
      <span>${kopiert[0] ? K.t("kopieren.fertig") : props.children}</span>
    </button>`;
  };
})();
