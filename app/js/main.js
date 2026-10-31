(function () {
  "use strict";
  var UI = window.R42J_UI;
  var S = window.R42J_SEITEN;
  var K = window.R42J_CORE;
  var html = UI.html;

  var EIGENE = ["einstellungen", "stammdaten", "anlagen", "lebenslauf", "bewerbungen", "uebersicht", "vergleich", "vorbereitung", "checklisten", "wissen", "statistik"];

  function seitenInhalt(seite, teile) {
    if (seite === "einstellungen") return html`<${S.Einstellungen} />`;
    if (seite === "komponenten") return html`<${S.Komponenten} />`;
    if (seite === "stammdaten") return html`<${S.Stammdaten} teile=${teile} />`;
    if (seite === "anlagen") return html`<${S.Anlagen} teile=${teile} />`;
    if (seite === "lebenslauf") return html`<${S.Lebenslauf} />`;
    if (seite === "bewerbungen") return html`<${S.Bewerbungen} teile=${teile} />`;
    if (seite === "uebersicht") return html`<${S.Uebersicht} />`;
    if (seite === "vergleich") return html`<${S.Vergleich} teile=${teile} />`;
    if (seite === "vorbereitung") return html`<${S.Vorbereitung} teile=${teile} />`;
    if (seite === "checklisten") return html`<${S.Checklisten} />`;
    if (seite === "wissen") return html`<${S.Wissen} teile=${teile} />`;
    if (seite === "statistik") return html`<${S.Statistik} />`;
    return html`<${UI.EmptyState} icon="search-x" seitentitel=${true} titel=${K.t("fehler.seiteTitel")} text=${K.t("fehler.seiteText")}>
      <${UI.Button} variante="primary" href="#/uebersicht">${K.t("fehler.seiteAktion")}<//>
    <//>`;
  }

  function App() {
    var z = K.useStore();
    var route = K.useRoute();
    window.preactHooks.useEffect(function () {
      K.update.beimStart();
    }, []);
    var bekannt = route.seite === "komponenten" || EIGENE.indexOf(route.seite) > -1;
    document.title = (bekannt && route.seite !== "komponenten" ? K.t("nav." + route.seite) + " · " : "") + "R42J – Ready 4 2 Jobs";
    return html`<${UI.AppShell} seite=${route.seite} route=${route} key=${z.sprache}>${seitenInhalt(route.seite, route.teile)}<//>`;
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
    if (a.phase === "sperrt") seite = html`<${UI.Bildschirm} titel=${K.t("sperre.sperrt")} />`;
    if (a.phase === "app") seite = html`<${App} />`;
    return html`${seite}${a.phase === "app" && html`<${UI.SperrCountdown} />`}<${UI.Toaster} />`;
  }

  K.darstellungStarten();
  var ziel = document.getElementById("app");
  if (K.browserUnterstuetzt()) {
    window.preact.render(html`<${Ablauf} />`, ziel);
    K.sperreStarten();
    K.ablaufStarten();
  } else window.preact.render(html`<${S.BrowserHinweis} />`, ziel);
})();
