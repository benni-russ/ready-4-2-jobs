(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // eintraege: [{ id, titel, meta }]. Ziehen mit der Maus, die Pfeil-Buttons sind die Alternative für die Tastatur.
  UI.SortableFileList = function (props) {
    var gezogen = hooks.useState(null);
    var ziel = hooks.useState(null);
    var liste = props.eintraege;

    function verschieben(von, nach) {
      if (von === nach || nach < 0 || nach >= liste.length) return;
      var ids = liste.map(function (e) {
        return e.id;
      });
      ids.splice(nach, 0, ids.splice(von, 1)[0]);
      props.beiAenderung(ids);
      document.getElementById("rj-live").textContent = K.t("sortieren.position", { titel: liste[von].titel, position: nach + 1, gesamt: liste.length });
    }

    return html`<ul class="rj-filelist">
      ${liste.map(function (e, i) {
        return html`<li
          key=${e.id}
          draggable="true"
          data-dragging=${gezogen[0] === i ? "true" : undefined}
          data-drop=${ziel[0] === i && gezogen[0] !== i ? "true" : undefined}
          onDragStart=${function (ev) {
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", e.id);
            gezogen[1](i);
          }}
          onDragOver=${function (ev) {
            ev.preventDefault();
            ziel[1](i);
          }}
          onDragEnd=${function () {
            gezogen[1](null);
            ziel[1](null);
          }}
          onDrop=${function (ev) {
            ev.preventDefault();
            if (gezogen[0] !== null) verschieben(gezogen[0], i);
            gezogen[1](null);
            ziel[1](null);
          }}
        >
          <div class="rj-file">
            <span class="rj-file__grip"><${UI.Icon} name="grip-vertical" /></span>
            <span class="rj-file__icon"><${UI.Icon} name="file-text" /></span>
            <div class="rj-file__body">
              <span class="rj-file__name">${e.titel}</span>
              <span class="rj-file__meta">${e.meta}</span>
            </div>
            <div class="rj-file__actions">
              <${UI.IconButton}
                icon="arrow-up"
                label=${K.t("sortieren.hoch", { titel: e.titel })}
                disabled=${i === 0}
                onClick=${function () {
                  verschieben(i, i - 1);
                }}
              />
              <${UI.IconButton}
                icon="arrow-down"
                label=${K.t("sortieren.runter", { titel: e.titel })}
                disabled=${i === liste.length - 1}
                onClick=${function () {
                  verschieben(i, i + 1);
                }}
              />
            </div>
          </div>
        </li>`;
      })}
    </ul>`;
  };
})();
