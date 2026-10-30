(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.IconButton = function (props) {
    var rest = Object.assign({}, props);
    ["icon", "label", "gefahr"].forEach(function (k) {
      delete rest[k];
    });
    var klasse = "rj-iconbtn" + (props.gefahr ? " rj-iconbtn--danger" : "");
    return html`<button class=${klasse} type="button" aria-label=${props.label} title=${props.label} ...${rest}>
      <${UI.Icon} name=${props.icon} />
    </button>`;
  };
})();
