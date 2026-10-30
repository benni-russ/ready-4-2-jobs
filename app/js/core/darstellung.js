(function () {
  "use strict";
  var K = window.R42J_CORE;
  var R = window.R42J;

  function anwenden(z) {
    R.setTheme(z.theme);
    R.setScheme(z.farbschema);
    R.setFontSize(z.schriftgroesse);
    document.documentElement.lang = z.sprache;
  }

  K.darstellungStarten = function () {
    anwenden(K.store.get());
    K.store.subscribe(anwenden);
    // Steht das Theme auf „System“, folgt die App einem Wechsel im Betriebssystem.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      anwenden(K.store.get());
    });
  };
})();
