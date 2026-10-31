(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // Zentrierte Karte für alles, was vor der App kommt: Ordnerwahl, Profile, Sperre.
  UI.Bildschirm = function (props) {
    var Rahmen = props.beiAbsenden ? "form" : "div";
    return html`<main class="rj-lock">
      <${Rahmen}
        class="rj-lock__card"
        onSubmit=${props.beiAbsenden &&
        function (e) {
          e.preventDefault();
          props.beiAbsenden();
        }}
      >
        <${UI.Logo} size=${40} />
        <h1 class="display">${props.titel}</h1>
        ${props.text && html`<p class="rj-muted">${props.text}</p>`}
        ${props.children}
      <//>
    </main>`;
  };
})();
