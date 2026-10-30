(function () {
  "use strict";
  var UI = window.R42J_UI;
  var S = window.R42J_SEITEN;
  var K = window.R42J_CORE;
  var html = UI.html;

  var PLATZHALTER = {
    vorbereitung: "graduation-cap",
    wissen: "book-open",
    statistik: "chart-column",
  };

  var EIGENE = ["einstellungen", "stammdaten", "anlagen", "lebenslauf", "bewerbungen", "uebersicht", "vergleich"];

  function seitenInhalt(seite, teile) {
    if (seite === "einstellungen") return html`<${S.Einstellungen} />`;
    if (seite === "komponenten") return html`<${S.Komponenten} />`;
    if (seite === "stammdaten") return html`<${S.Stammdaten} teile=${teile} />`;
    if (seite === "anlagen") return html`<${S.Anlagen} teile=${teile} />`;
    if (seite === "lebenslauf") return html`<${S.Lebenslauf} />`;
    if (seite === "bewerbungen") return html`<${S.Bewerbungen} teile=${teile} />`;
    if (seite === "uebersicht") return html`<${S.Uebersicht} />`;
    if (seite === "vergleich") return html`<${S.Vergleich} teile=${teile} />`;
    if (PLATZHALTER[seite]) return html`<${S.Platzhalter} seite=${seite} icon=${PLATZHALTER[seite]} key=${seite} />`;
    return html`<${UI.EmptyState} icon="search-x" titel=${K.t("fehler.seiteTitel")} text=${K.t("fehler.seiteText")}>
      <${UI.Button} variante="primary" href="#/uebersicht">${K.t("fehler.seiteAktion")}<//>
    <//>`;
  }

  function App() {
    var z = K.useStore();
    var route = K.useRoute();
    var bekannt = route.seite === "komponenten" || !!PLATZHALTER[route.seite] || EIGENE.indexOf(route.seite) > -1;
    document.title = (bekannt && route.seite !== "komponenten" ? K.t("nav." + route.seite) + " · " : "") + "R42J";
    return html`<${UI.AppShell} seite=${route.seite} key=${z.sprache}>${seitenInhalt(route.seite, route.teile)}<//>`;
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
