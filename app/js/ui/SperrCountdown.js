(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  function zeit(sekunden) {
    var s = sekunden % 60;
    return Math.floor(sekunden / 60) + ":" + (s < 10 ? "0" : "") + s;
  }

  // Die Sekunden werden nicht vorgelesen, nur die eine Ansage zu Beginn.
  UI.SperrCountdown = function () {
    var rest = K.useBeobachtbar(K.sperreCountdown).rest;
    if (rest === null) return null;
    return html`<div class="rj-toast rj-toast--warning rj-sperrcountdown rj-noprint">
      <span class="rj-sr-only" role="alert">${K.t("sperre.countdownAnsage")}</span>
      <${UI.Icon} name="lock" />
      <div class="rj-toast__body">
        <strong>${K.t("sperre.countdownTitel")} <span class="rj-sperrcountdown__zeit" role="timer" aria-live="off">${zeit(rest)}</span></strong>
        <div>${K.t("sperre.countdownText")}</div>
      </div>
      <${UI.Button} onClick=${K.sperreVerlaengern}>${K.t("sperre.weiterarbeiten")}<//>
    </div>`;
  };
})();
