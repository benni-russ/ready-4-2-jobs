(function () {
  "use strict";
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var START = "uebersicht";

  function lesen() {
    var teile = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    return { seite: teile[0] || START, teile: teile.slice(1) };
  }

  K.navigieren = function (pfad) {
    window.location.hash = "#/" + pfad;
  };

  K.useRoute = function () {
    var paar = hooks.useState(lesen);
    hooks.useEffect(function () {
      function wechsel() {
        paar[1](lesen());
      }
      window.addEventListener("hashchange", wechsel);
      // Der Hash kann sich zwischen erstem Zeichnen und diesem Effekt geändert haben.
      if (JSON.stringify(lesen()) !== JSON.stringify(paar[0])) wechsel();
      return function () {
        window.removeEventListener("hashchange", wechsel);
      };
    }, []);
    return paar[0];
  };
})();
