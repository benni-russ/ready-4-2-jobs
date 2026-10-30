(function () {
  "use strict";
  var K = window.R42J_CORE;

  var PRUEFEN_MS = 5000;
  var EREIGNISSE = ["pointerdown", "pointermove", "keydown", "scroll", "wheel"];
  var zuletzt = Date.now();
  var pruefung = null;

  function aktiv() {
    zuletzt = Date.now();
  }

  // Vergleich der Uhrzeit statt eines einzelnen Timers: So greift die Sperre auch nach dem Ruhezustand.
  function pruefen() {
    if (!K.tresor.offen()) return;
    var minuten = K.tresor.daten().einstellungen.sperreMinuten;
    if (Date.now() - zuletzt >= minuten * 60000) K.jetztSperren("auto");
  }

  K.sperreStarten = function () {
    if (pruefung) return;
    EREIGNISSE.forEach(function (n) {
      window.addEventListener(n, aktiv, { passive: true, capture: true });
    });
    document.addEventListener("visibilitychange", pruefen);
    pruefung = window.setInterval(pruefen, PRUEFEN_MS);
  };
})();
