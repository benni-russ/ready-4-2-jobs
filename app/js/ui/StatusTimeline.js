(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // eintraege: StatusEintrag[] in zeitlicher Folge, der aktuelle steht oben.
  UI.StatusTimeline = function (props) {
    var liste = props.eintraege.slice().reverse();
    return html`<ol class="rj-timeline">
      ${liste.map(function (e, i) {
        return html`<li key=${i} aria-current=${i === 0 ? "step" : undefined}>
          <span class="rj-timeline__dot"></span>
          <strong>${UI.statusText(e.status)}</strong>
          <time datetime=${e.datum}>${window.R42J.formatDate(new Date(e.datum))}</time>
          ${e.notiz && html`<p>${e.notiz}</p>`}
        </li>`;
      })}
    </ol>`;
  };
})();
