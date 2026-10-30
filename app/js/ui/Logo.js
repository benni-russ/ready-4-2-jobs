(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.Logo = function (props) {
    var svg = window.R42J.logo(props.size || 32, props.mitText !== false);
    return html`<span style="display:contents" dangerouslySetInnerHTML=${{ __html: svg }}></span>`;
  };
})();
