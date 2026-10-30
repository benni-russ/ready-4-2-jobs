(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  var BREITE = 560;
  var LINKS = 40;
  var RECHTS = 550;
  var OBEN = 40;
  var BASIS = 180;
  var SAEULE_MAX = 48;
  var ZEICHEN_PX = 6.5;

  function gekuerzt(text, platz) {
    var max = Math.max(3, Math.floor(platz / ZEICHEN_PX));
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  // daten: { label, wert, text? }. aktuell: Index der hervorgehobenen Säule, die übrigen treten zurück.
  // max: feste Obergrenze, etwa 100 für Quoten.
  UI.BarChart = function (props) {
    var daten = props.daten;
    var hoechster = props.max || Math.max.apply(null, [1].concat(daten.map(function (d) { return d.wert; })));
    var platz = (RECHTS - LINKS) / daten.length;
    var breite = Math.min(SAEULE_MAX, platz * 0.7);
    var hoehe = BASIS - OBEN;
    var mitte = (OBEN + BASIS) / 2;

    return html`<div class="rj-chart-wrap" tabindex="0" role="img" aria-label=${props.label}><svg class="rj-chart" viewBox=${"0 0 " + BREITE + " 220"} aria-hidden="true">
      <line class="grid" x1=${LINKS} x2=${RECHTS} y1=${OBEN} y2=${OBEN} />
      <line class="grid" x1=${LINKS} x2=${RECHTS} y1=${mitte} y2=${mitte} />
      <line class="axis" x1=${LINKS} x2=${RECHTS} y1=${BASIS} y2=${BASIS} />
      ${daten.map(function (d, i) {
        var h = (d.wert / hoechster) * hoehe;
        var x = LINKS + platz * i + platz / 2;
        var gedaempft = props.aktuell !== undefined && props.aktuell !== i;
        var wert = d.text || String(d.wert);
        return html`<g key=${i}>
          <title>${d.label}: ${wert}</title>
          ${h > 0 && html`<rect class=${"bar" + (gedaempft ? " bar--muted" : "")} x=${x - breite / 2} y=${BASIS - h} width=${breite} height=${h} rx="4" />`}
          <text class="val" x=${x} y=${BASIS - h - 8} text-anchor="middle">${wert}</text>
          <text x=${x} y="200" text-anchor="middle">${gekuerzt(d.label, platz)}</text>
        </g>`;
      })}
    </svg></div>`;
  };
})();
