(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var MAC = /Mac/.test(navigator.platform);

  // Hebt den Suchbegriff hervor, soweit er wörtlich vorkommt.
  function markiert(text, anfrage) {
    var q = anfrage.trim().toLowerCase();
    var i = q ? String(text).toLowerCase().indexOf(q) : -1;
    if (i === -1) return text;
    return html`${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
  }

  UI.SearchBar = function (props) {
    var anfrage = hooks.useState("");
    var offen = hooks.useState(false);
    var aktiv = hooks.useState(0);
    var id = hooks.useId();
    var hatText = anfrage[0].trim() !== "";
    var gruppen = offen[0] && hatText ? props.beiSuche(anfrage[0]) : [];
    var alle = [];
    gruppen.forEach(function (g) {
      g.treffer.forEach(function (t) {
        alle.push(t);
      });
    });
    var markierter = Math.min(aktiv[0], Math.max(alle.length - 1, 0));

    function schliessen() {
      offen[1](false);
      anfrage[1]("");
      aktiv[1](0);
    }

    function waehlen(t) {
      schliessen();
      props.feld.current.blur();
      props.beiWahl(t);
    }

    function taste(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        schliessen();
        props.feld.current.blur();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!alle.length) return;
        var schritt = e.key === "ArrowDown" ? 1 : -1;
        aktiv[1]((markierter + schritt + alle.length) % alle.length);
      } else if (e.key === "Enter" && alle[markierter]) {
        e.preventDefault();
        waehlen(alle[markierter]);
      }
    }

    var lauf = -1;
    return html`<div class="rj-searchbar" role="search">
      <div class="rj-searchbar__feld">
        <${UI.Icon} name="search" />
        <input
          ref=${props.feld}
          role="combobox"
          aria-label=${K.t("suche.titel")}
          aria-expanded=${alle.length ? "true" : "false"}
          aria-controls=${id}
          aria-activedescendant=${alle.length ? id + "-" + markierter : undefined}
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck="false"
          placeholder=${K.t("suche.platzhalter")}
          value=${anfrage[0]}
          onFocus=${function () {
            offen[1](true);
          }}
          onBlur=${schliessen}
          onKeyDown=${taste}
          onInput=${function (e) {
            anfrage[1](e.target.value);
            aktiv[1](0);
          }}
        />
        <span class="rj-searchbar__tasten" aria-hidden="true">
          <kbd class="rj-kbd">${K.t(MAC ? "suche.tasteMac" : "suche.tasteKurz")}</kbd>
          <kbd class="rj-kbd">/</kbd>
        </span>
      </div>
      ${offen[0] &&
      hatText &&
      html`<div class="rj-palette">
        <div id=${id} class="rj-searchbar__liste" role="listbox" aria-label=${K.t("suche.treffer")}>
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
                  onMouseDown=${function (e) {
                    e.preventDefault();
                  }}
                  onClick=${function () {
                    waehlen(t);
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
        ${!alle.length && html`<p class="rj-muted" role="status" style="padding:var(--space-4)">${K.t("suche.nichts", { text: anfrage[0].trim() })}</p>`}
      </div>`}
    </div>`;
  };
})();
