(function () {
  "use strict";
  var K = (window.R42J_CORE = window.R42J_CORE || {});
  var hooks = window.preactHooks;

  // Nur Darstellungs-Einstellungen, keine persönlichen Daten. Sie müssen schon
  // vor dem Entsperren gelten und liegen deshalb im localStorage.
  var SCHLUESSEL = "r42j.oberflaeche";

  function laden() {
    try {
      return JSON.parse(window.localStorage.getItem(SCHLUESSEL)) || {};
    } catch (e) {
      return {};
    }
  }

  function speichern(werte) {
    try {
      window.localStorage.setItem(SCHLUESSEL, JSON.stringify(werte));
    } catch (e) {
      /* Ohne Speicher gelten die Einstellungen nur für diese Sitzung. */
    }
  }

  var zustand = Object.assign(
    {
      sprache: (navigator.language || "de").slice(0, 2) === "en" ? "en" : "de",
      theme: "system",
      farbschema: "blau",
      schriftgroesse: "normal",
      seitenleisteEingeklappt: window.innerWidth < 900,
    },
    laden(),
  );
  var hoerer = [];

  K.store = {
    get: function () {
      return zustand;
    },
    set: function (teil) {
      zustand = Object.assign({}, zustand, teil);
      speichern(zustand);
      hoerer.slice().forEach(function (f) {
        f(zustand);
      });
    },
    subscribe: function (f) {
      hoerer.push(f);
      return function () {
        hoerer = hoerer.filter(function (x) {
          return x !== f;
        });
      };
    },
  };

  K.useStore = function () {
    var paar = hooks.useState(zustand);
    hooks.useEffect(function () {
      paar[1](zustand);
      return K.store.subscribe(paar[1]);
    }, []);
    return paar[0];
  };
})();
