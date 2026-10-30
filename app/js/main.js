(function () {
  "use strict";
  var UI = window.R42J_UI;
  var S = window.R42J_SEITEN;
  var K = window.R42J_CORE;
  var html = UI.html;

  var PLATZHALTER = {
    uebersicht: "house",
    bewerbungen: "briefcase-business",
    stammdaten: "user",
    anlagen: "files",
    vergleich: "scale",
    vorbereitung: "graduation-cap",
    wissen: "book-open",
    statistik: "chart-column",
  };

  function seitenInhalt(seite) {
    if (seite === "einstellungen") return html`<${S.Einstellungen} />`;
    if (seite === "komponenten") return html`<${S.Komponenten} />`;
    if (PLATZHALTER[seite]) return html`<${S.Platzhalter} seite=${seite} icon=${PLATZHALTER[seite]} key=${seite} />`;
    return html`<${UI.EmptyState} icon="search-x" titel=${K.t("fehler.seiteTitel")} text=${K.t("fehler.seiteText")}>
      <${UI.Button} variante="primary" href="#/uebersicht">${K.t("fehler.seiteAktion")}<//>
    <//>`;
  }

  function App() {
    var z = K.useStore();
    var route = K.useRoute();
    var bekannt = route.seite === "komponenten" || !!PLATZHALTER[route.seite] || route.seite === "einstellungen";
    document.title = (bekannt && route.seite !== "komponenten" ? K.t("nav." + route.seite) + " · " : "") + "R42J";
    return html`<${UI.AppShell} seite=${route.seite} key=${z.sprache}>${seitenInhalt(route.seite)}<//>`;
  }

  function Ablauf() {
    var a = K.useBeobachtbar(K.ablauf);
    K.useStore();
    var schluessel = (a.eintrag && a.eintrag.id) || "";
    var seite = null;
    if (a.phase === "ordner") seite = html`<${S.OrdnerWahl} fehler=${a.fehler} />`;
    if (a.phase === "zugriff") seite = html`<${S.ZugriffErneuern} />`;
    if (a.phase === "profile") seite = html`<${S.Profile} />`;
    if (a.phase === "sperre") seite = html`<${S.Sperre} key=${schluessel} eintrag=${a.eintrag} grund=${a.grund} fehler=${a.fehler} />`;
    if (a.phase === "schluessel") seite = html`<${S.SchluesselEntsperren} key=${schluessel} eintrag=${a.eintrag} />`;
    if (a.phase === "onboarding") seite = html`<${S.Onboarding} key=${a.schritt} name=${a.name} schritt=${a.schritt} />`;
    if (a.phase === "schluesselNeu") seite = html`<${S.SchluesselNeu} />`;
    if (a.phase === "sperrt") seite = html`<${UI.Bildschirm} icon="lock" titel=${K.t("sperre.sperrt")} />`;
    if (a.phase === "app") seite = html`<${App} />`;
    return html`${seite}<${UI.Toaster} />`;
  }

  K.darstellungStarten();
  var ziel = document.getElementById("app");
  if (K.browserUnterstuetzt()) {
    window.preact.render(html`<${Ablauf} />`, ziel);
    K.sperreStarten();
    K.ablaufStarten();
  } else window.preact.render(html`<${S.BrowserHinweis} />`, ziel);
})();
