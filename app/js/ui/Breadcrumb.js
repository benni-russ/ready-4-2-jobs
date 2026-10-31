(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  UI.Breadcrumb = function (props) {
    K.useBeobachtbar(K.brotkrumenTitel);
    K.useBeobachtbar(K.tresorStand);
    var krumen = K.brotkrumen(props.route);
    if (krumen.length < 2) return null;
    return html`<nav class="rj-breadcrumb" aria-label=${K.t("shell.brotkrumen")}>
      <ol>
        ${krumen.map(function (k, i) {
          return html`<li key=${i}>${k.ziel ? html`<a href=${"#/" + k.ziel}>${k.text}</a>` : html`<span aria-current="page">${k.text}</span>`}</li>`;
        })}
      </ol>
    </nav>`;
  };
})();
