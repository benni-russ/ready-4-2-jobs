(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // eintraege: [{ schluessel, platz, name, punkte, text, hinweis? }], bereits sortiert. punkte 0–10 oder null.
  UI.ScoreList = function (props) {
    return html`<ol class="rj-scorelist">
      ${props.eintraege.map(function (e) {
        return html`<li key=${e.schluessel} class=${e.platz === 1 ? "is-top" : undefined}>
          <span class="rj-scorelist__rank">${e.platz === null ? "–" : e.platz}</span>
          <strong>${e.name}</strong>
          <span class="rj-scorelist__bar"><span style=${"width:" + (e.punkte || 0) * 10 + "%"}></span></span>
          <span class="rj-scorelist__val">${e.text}</span>
          ${e.hinweis && html`<span class="rj-scorelist__note">${e.hinweis}</span>`}
        </li>`;
      })}
    </ol>`;
  };
})();
