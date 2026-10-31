(function () {
  "use strict";
  var K = window.R42J_CORE;

  var PRUEFEN_MS = 1000;
  var WARNEN_MS = 60000;
  // Hintergrund-Tabs prüfen oft nur einmal pro Minute. Mit drei Minuten kommt die Warnung trotzdem rechtzeitig.
  var TAB_WARNEN_MS = 180000;
  var EREIGNISSE = ["pointerdown", "pointermove", "keydown", "scroll", "wheel"];
  var zuletzt = Date.now();
  var pruefung = null;
  var titelVorher = null;

  // rest: Sekunden bis zur Sperre, null solange keine Warnung ansteht.
  K.sperreCountdown = K.beobachtbar({ rest: null });

  function melden(rest) {
    if (K.sperreCountdown.get().rest !== rest) K.sperreCountdown.set({ rest: rest });
  }

  // Direkt gesetzt, nicht über einen Effect: Preact verschiebt Effects, und im Hintergrund-Tab käme das zu spät.
  function tabWarnung(an) {
    if (an && titelVorher === null) {
      titelVorher = document.title;
      document.title = K.t("sperre.tabTitel");
    } else if (!an && titelVorher !== null) {
      document.title = titelVorher;
      titelVorher = null;
    }
  }

  function aktiv() {
    zuletzt = Date.now();
    melden(null);
    tabWarnung(false);
  }

  // Vergleich der Uhrzeit statt eines einzelnen Timers: So greift die Sperre auch nach dem Ruhezustand.
  function pruefen() {
    if (!K.tresor.offen()) {
      tabWarnung(false);
      return melden(null);
    }
    var rest = K.tresor.daten().einstellungen.sperreMinuten * 60000 - (Date.now() - zuletzt);
    if (rest <= 0) {
      tabWarnung(false);
      melden(null);
      K.jetztSperren("auto");
    } else {
      melden(rest <= WARNEN_MS ? Math.ceil(rest / 1000) : null);
      tabWarnung(rest <= (document.hidden ? TAB_WARNEN_MS : WARNEN_MS));
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
