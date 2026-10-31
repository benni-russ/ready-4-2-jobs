(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  var K = window.R42J_CORE;

  // meta: { icon, text }[], schritte: { label, erledigt }[]. Der Link spannt über die ganze Karte, sonst täuscht der Handzeiger eine Klickfläche vor.
  UI.ApplicationCard = function (props) {
    return html`<article class="rj-card rj-card--interactive rj-appcard">
      <div>
        <a class="rj-appcard__title" href=${props.href}>${props.titel}</a>
        <div class="rj-appcard__role">${props.rolle}</div>
      </div>
      <${UI.StatusBadge} status=${props.status} />
      <div class="rj-appcard__meta">
        ${props.meta.map(function (m) {
          return html`<span key=${m.icon}><${UI.Icon} name=${m.icon} />${m.text}</span>`;
        })}
      </div>
      ${props.schritte &&
      html`<ul class="rj-appcard__schritte" aria-label=${K.t("uebersicht.schritte")}>
        ${props.schritte.map(function (s) {
          return html`<li key=${s.label} data-erledigt=${s.erledigt ? "true" : undefined}>
            <${UI.Icon} name=${s.erledigt ? "circle-check" : "circle"} />
            <span>${s.label}<span class="rj-sr-only"> ${K.t(s.erledigt ? "uebersicht.schrittErledigt" : "uebersicht.schrittOffen")}</span></span>
          </li>`;
        })}
      </ul>`}
      ${props.naechster && html`<div class="rj-appcard__naechster">${props.naechster}</div>`}
    </article>`;
  };
})();
