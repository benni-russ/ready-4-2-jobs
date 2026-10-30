(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  // meta: { icon, text }[]
  UI.ApplicationCard = function (props) {
    return html`<article class="rj-card rj-card--interactive rj-appcard">
      <div>
        <a class="rj-appcard__title" style="color:var(--ink);text-decoration:none" href=${props.href}>${props.titel}</a>
        <div class="rj-appcard__role">${props.rolle}</div>
      </div>
      <${UI.StatusBadge} status=${props.status} />
      <div class="rj-appcard__meta">
        ${props.meta.map(function (m) {
          return html`<span key=${m.icon}><${UI.Icon} name=${m.icon} />${m.text}</span>`;
        })}
      </div>
    </article>`;
  };
})();
