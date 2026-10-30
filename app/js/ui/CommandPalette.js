(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // Hebt den Suchbegriff hervor, soweit er wörtlich vorkommt.
  function markiert(text, anfrage) {
    var q = anfrage.trim().toLowerCase();
    var i = q ? String(text).toLowerCase().indexOf(q) : -1;
    if (i === -1) return text;
    return html`${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
  }

  UI.CommandPalette = function (props) {
    var anfrage = hooks.useState("");
    var aktiv = hooks.useState(0);
    var feld = hooks.useRef(null);
    var id = hooks.useId();
    var gruppen = props.beiSuche(anfrage[0]);
    var alle = [];
    gruppen.forEach(function (g) {
      g.treffer.forEach(function (t) {
        alle.push(t);
      });
    });
    var markierter = Math.min(aktiv[0], Math.max(alle.length - 1, 0));

    hooks.useEffect(function () {
      var vorher = document.activeElement;
      feld.current.focus();
      return function () {
        if (vorher && vorher.isConnected) vorher.focus();
      };
    }, []);

    function taste(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        props.beiSchliessen();
      } else if (e.key === "Tab") {
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!alle.length) return;
        var schritt = e.key === "ArrowDown" ? 1 : -1;
        aktiv[1]((markierter + schritt + alle.length) % alle.length);
      } else if (e.key === "Enter" && alle[markierter]) {
        e.preventDefault();
        props.beiWahl(alle[markierter]);
      }
    }

    var lauf = -1;
    return html`<div
      class="rj-overlay"
      onMouseDown=${function (e) {
        if (e.target === e.currentTarget) props.beiSchliessen();
      }}
    >
      <div class="rj-palette" role="dialog" aria-modal="true" aria-label=${K.t("suche.titel")} onKeyDown=${taste}>
        <div class="rj-palette__search">
          <${UI.Icon} name="search" />
          <input
            ref=${feld}
            role="combobox"
            aria-label=${K.t("suche.titel")}
            aria-expanded=${alle.length ? "true" : "false"}
            aria-controls=${id}
            aria-activedescendant=${alle.length ? id + "-" + markierter : undefined}
            aria-autocomplete="list"
            autocomplete="off"
            placeholder=${K.t("suche.platzhalter")}
            value=${anfrage[0]}
            onInput=${function (e) {
              anfrage[1](e.target.value);
              aktiv[1](0);
            }}
          />
        </div>
        <div id=${id} role="listbox" aria-label=${K.t("suche.treffer")} style="max-height:50vh;overflow:auto">
          ${gruppen.map(function (g) {
            return html`<div class="rj-palette__group" role="group" aria-label=${g.titel} key=${g.gruppe}>
              <h4 aria-hidden="true">${g.titel}</h4>
              ${g.treffer.map(function (t) {
                lauf += 1;
                var nr = lauf;
                return html`<div
                  class="rj-palette__item"
                  role="option"
                  id=${id + "-" + nr}
                  key=${t.id}
                  aria-selected=${nr === markierter ? "true" : "false"}
                  onMouseMove=${function () {
                    if (nr !== aktiv[0]) aktiv[1](nr);
                  }}
                  onClick=${function () {
                    props.beiWahl(t);
                  }}
                >
                  <${UI.Icon} name=${t.icon} />
                  <span>${markiert(t.titel, anfrage[0])}</span>
                  <small>${t.unter}</small>
                </div>`;
              })}
            </div>`;
          })}
        </div>
        ${anfrage[0].trim() && !alle.length && html`<p class="rj-muted" role="status" style="padding:var(--space-4)">${K.t("suche.nichts", { text: anfrage[0].trim() })}</p>`}
        <div class="rj-palette__foot">
          <span><kbd class="rj-kbd">↑</kbd> <kbd class="rj-kbd">↓</kbd> ${K.t("suche.bewegen")}</span>
          <span><kbd class="rj-kbd">Enter</kbd> ${K.t("suche.oeffnenKurz")}</span>
          <span><kbd class="rj-kbd">Esc</kbd> ${K.t("aktion.schliessen").toLowerCase()}</span>
        </div>
      </div>
    </div>`;
  };
})();
