(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.FileItem = function (props) {
    return html`<div class="rj-file">
      <span class="rj-file__icon"><${UI.Icon} name=${props.icon || "file-text"} /></span>
      <div class="rj-file__body">
        <span class="rj-file__name">${props.name}</span>
        <span class="rj-file__meta">${props.meta}</span>
      </div>
      <div class="rj-file__actions">${props.children}</div>
    </div>`;
  };
})();
