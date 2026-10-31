(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  function Erklaerung(props) {
    var id = hooks.useId();
    var offen = hooks.useState(false);
    function zeigen() {
      offen[1](true);
    }
    function verbergen() {
      offen[1](false);
    }
    return html`<span class="rj-tooltip" onMouseEnter=${zeigen} onMouseLeave=${verbergen}>
      <${UI.IconButton}
        icon="info"
        label=${props.label}
        aria-describedby=${offen[0] ? id : undefined}
        onFocus=${zeigen}
        onBlur=${verbergen}
      />
      ${offen[0] && html`<span class="rj-tooltip__bubble" role="tooltip" id=${id}>${props.text}</span>`}
    </span>`;
  }

  // spalten: [{ schluessel, titel }]
  // zeilen: [{ schluessel, titel, erklaerung?, zellen: [{ text, beste?, fehlt? }] }]
  UI.ComparisonTable = function (props) {
    var rahmen = hooks.useRef(null);
    var zuBreit = hooks.useState(false);
    hooks.useLayoutEffect(function () {
      function messen() {
        var e = rahmen.current;
        zuBreit[1](e.scrollWidth > e.clientWidth);
      }
      messen();
      window.addEventListener("resize", messen);
      return function () {
        window.removeEventListener("resize", messen);
      };
    }, [props.spalten.length]);
    return html`<div
      class="rj-table-wrap"
      ref=${rahmen}
      tabindex=${zuBreit[0] ? 0 : undefined}
      role=${zuBreit[0] ? "region" : undefined}
      aria-label=${zuBreit[0] ? props.label : undefined}
    >
      <table class="rj-table rj-table--kopfspalte">
        <caption class="rj-sr-only">${props.label}</caption>
        <thead>
          <tr>
            <th scope="col">${props.kopf}</th>
            ${props.spalten.map(function (s) {
              return html`<th scope="col" class="is-num" key=${s.schluessel}>${s.titel}</th>`;
            })}
          </tr>
        </thead>
        <tbody>
          ${props.zeilen.map(function (z) {
            return html`<tr key=${z.schluessel}>
              <th scope="row">${z.titel} ${z.erklaerung && html`<${Erklaerung} label=${z.titel} text=${z.erklaerung} />`}</th>
              ${z.zellen.map(function (c, i) {
                return html`<td class="is-num" key=${props.spalten[i].schluessel}>
                  ${c.fehlt ? html`<span class="rj-nodata">${c.text}</span>` : c.text}
                  ${c.beste &&
                  html`<span class="rj-best"><${UI.Icon} name="star" />${K.t("vergleich.besterWert")}</span>`}
                </td>`;
              })}
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
    ${zuBreit[0] && html`<p class="rj-hint">${K.t("vergleich.seitlichScrollen", { anzahl: props.spalten.length })}</p>`}`;
  };
})();
