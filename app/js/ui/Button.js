(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Button = function (props) {
    var variante = props.variante || "secondary";
    var klasse =
      "rj-btn rj-btn--" + variante + (props.lg ? " rj-btn--lg" : "") + (props.block ? " rj-btn--block" : "");
    var rest = Object.assign({}, props);
    ["variante", "lg", "block", "icon", "iconHinten", "laedt", "children"].forEach(function (k) {
      delete rest[k];
    });
    var inhalt = html`
      ${props.laedt ? html`<span class="rj-spinner" aria-hidden="true"></span>` : props.icon && html`<${UI.Icon} name=${props.icon} />`}
      ${props.children}
      ${props.iconHinten && html`<${UI.Icon} name=${props.iconHinten} />`}
    `;
    if (props.href) return html`<a class=${klasse} ...${rest}>${inhalt}</a>`;
    return html`<button class=${klasse} type="button" aria-busy=${props.laedt ? "true" : undefined} ...${rest}>${inhalt}</button>`;
  };
})();
