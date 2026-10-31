(function () {
  "use strict";
  var K = window.R42J_CORE;

  var PRUEFEN_MS = 1000;
  var WARNEN_MS = 60000;
  var EREIGNISSE = ["pointerdown", "pointermove", "keydown", "scroll", "wheel"];
  var zuletzt = Date.now();
  var pruefung = null;

  // rest: Sekunden bis zur Sperre, null solange keine Warnung ansteht.
  K.sperreCountdown = K.beobachtbar({ rest: null });

  function melden(rest) {
    if (K.sperreCountdown.get().rest !== rest) K.sperreCountdown.set({ rest: rest });
  }

  function aktiv() {
    zuletzt = Date.now();
    melden(null);
  }

  // Vergleich der Uhrzeit statt eines einzelnen Timers: So greift die Sperre auch nach dem Ruhezustand.
  function pruefen() {
    if (!K.tresor.offen()) return melden(null);
    var rest = K.tresor.daten().einstellungen.sperreMinuten * 60000 - (Date.now() - zuletzt);
    if (rest <= 0) {
      melden(null);
      K.jetztSperren("auto");
    } else {
      melden(rest <= WARNEN_MS ? Math.ceil(rest / 1000) : null);
    }
  }

  K.sperreVerlaengern = aktiv;

  K.sperreStarten = function () {
    if (pruefung) return;
    EREIGNISSE.forEach(function (n) {
      window.addEventListener(n, aktiv, { passive: true, capture: true });
    });
    document.addEventListener("visibilitychange", pruefen);
    pruefung = window.setInterval(pruefen, PRUEFEN_MS);
  };
})();
