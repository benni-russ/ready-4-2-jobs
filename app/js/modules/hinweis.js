(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  S.BrowserHinweis = function () {
    var extern = { target: "_blank", rel: "noopener noreferrer" };
    return html`<main class="rj-content" style="margin:0 auto;align-items:center;text-align:center">
      <${UI.Logo} size=${48} />
      <h1 class="h1">${K.t("hinweis.titel")}</h1>
      <${UI.EmptyState} icon="globe" titel=${K.t("hinweis.untertitel")} text=${K.t("hinweis.text")}>
        <div class="rj-row" style="justify-content:center">
          <${UI.Button} variante="primary" href="https://www.microsoft.com/edge" ...${extern}>
            ${K.t("hinweis.edge")}
          <//>
          <${UI.Button} href="https://www.google.com/chrome" ...${extern}>${K.t("hinweis.chrome")}<//>
        </div>
      <//>
    </main>`;
  };
})();
