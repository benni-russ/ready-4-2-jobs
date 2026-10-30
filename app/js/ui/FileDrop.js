(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  UI.FileDrop = function (props) {
    var ziehen = hooks.useState(false);

    function abwerfen(e) {
      e.preventDefault();
      ziehen[1](false);
      var dateien = Array.prototype.slice.call(e.dataTransfer.files);
      if (dateien.length) props.beiDateien(dateien);
    }

    return html`<label
      class=${"rj-drop" + (ziehen[0] ? " is-dragover" : "")}
      onDragOver=${function (e) {
        e.preventDefault();
        ziehen[1](true);
      }}
      onDragLeave=${function () {
        ziehen[1](false);
      }}
      onDrop=${abwerfen}
    >
      <${UI.Icon} name="upload" />
      ${ziehen[0]
        ? html`<strong>${K.t("drop.loslassen")}</strong>`
        : html`<strong>${K.t("drop.titel")} <span class="rj-link">${K.t("drop.waehlen")}</span></strong>`}
      <span class="rj-hint">${props.hinweis}</span>
      <input
        type="file"
        class="rj-sr-only"
        multiple
        accept=${props.accept}
        onChange=${function (e) {
          var dateien = Array.prototype.slice.call(e.target.files);
          e.target.value = "";
          if (dateien.length) props.beiDateien(dateien);
        }}
      />
    </label>`;
  };
})();
