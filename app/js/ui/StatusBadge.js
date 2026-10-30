(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  UI.StatusBadge = function (props) {
    var s = window.R42J.statuses[props.status];
    if (!s) return null;
    return html`<span class="rj-status" data-tone=${s.tone}><${UI.Icon} name=${s.icon} /><span>${s[K.sprache()]}</span></span>`;
  };

  UI.statusText = function (status) {
    return window.R42J.statuses[status][K.sprache()];
  };
})();
