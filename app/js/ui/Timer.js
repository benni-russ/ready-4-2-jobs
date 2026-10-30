(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var TAKT = 250;
  var RESTANSAGE = 30;

  function zeit(sekunden) {
    var m = Math.floor(sekunden / 60);
    var s = sekunden % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  UI.zeitText = zeit;

  // Zählt hoch. Die Live-Region sagt nur Meilensteine an, nicht jede Sekunde.
  UI.Timer = function (props) {
    var laeuft = hooks.useState(false);
    var sekunden = hooks.useState(0);
    var basis = hooks.useRef(0);
    var start = hooks.useRef(0);
    var ziel = props.zielSekunden;

    function ansage(text) {
      document.getElementById("rj-live").textContent = text;
    }

    hooks.useEffect(
      function () {
        if (!laeuft[0]) return undefined;
        start.current = Date.now();
        var takt = setInterval(function () {
          var s = basis.current + Math.floor((Date.now() - start.current) / 1000);
          sekunden[1](function (alt) {
            if (alt === s) return alt;
            if (alt < ziel - RESTANSAGE && s >= ziel - RESTANSAGE) ansage(K.t("timer.restzeit", { sekunden: RESTANSAGE }));
            if (alt < ziel && s >= ziel) ansage(K.t("timer.zielErreicht"));
            return s;
          });
        }, TAKT);
        return function () {
          clearInterval(takt);
          basis.current += Math.floor((Date.now() - start.current) / 1000);
        };
      },
      [laeuft[0]],
    );

    hooks.useEffect(
      function () {
        if (props.beiZeit) props.beiZeit(sekunden[0]);
      },
      [sekunden[0]],
    );

    function neu() {
      basis.current = 0;
      start.current = Date.now();
      sekunden[1](0);
    }

    return html`<div class="rj-stack">
      <div class="rj-timer">
        <span class="rj-timer__time" role="timer" aria-label=${K.t("timer.verstrichen")} aria-live="off">${zeit(sekunden[0])}</span>
        <${UI.Button}
          variante="primary"
          icon=${laeuft[0] ? "pause" : "play"}
          onClick=${function () {
            laeuft[1](!laeuft[0]);
          }}
          >${laeuft[0] ? K.t("timer.pause") : K.t("timer.start")}<//
        >
        <${UI.Button} variante="secondary" icon="rotate-ccw" disabled=${sekunden[0] === 0 && !laeuft[0]} onClick=${neu}>${K.t("timer.neu")}<//>
      </div>
      <span class="rj-hint">${K.t("timer.ziel", { zeit: zeit(ziel) })}</span>
    </div>`;
  };
})();
