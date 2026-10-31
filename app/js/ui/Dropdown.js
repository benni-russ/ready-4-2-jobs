(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var SUCHE_AB = 8;
  var MIN_BREITE = 240;
  var MAX_HOEHE = 320;
  var ABSTAND = 6;
  var RAND = 8;
  var SEITE = 10;
  var TIPP_PAUSE = 500;

  // WAI-ARIA-Combobox mit Listbox. Ohne Suche bleibt der Fokus auf dem Knopf, mit Suche wandert
  // er ins Suchfeld. Die Liste liegt fest im Fenster, damit Dialoge sie nicht abschneiden.
  // `suche` schaltet die Suche je Feld, ohne Angabe erscheint sie ab acht Einträgen.
  UI.Dropdown = function (props) {
    var optionen = props.optionen || [];
    var wert = props.wert === undefined || props.wert === null ? "" : props.wert;
    var eigeneId = hooks.useId();
    var listeId = eigeneId + "-liste";
    var mitSuche = props.suche !== undefined ? props.suche : optionen.length >= SUCHE_AB;

    var offenPaar = hooks.useState(false);
    var offen = offenPaar[0];
    var setOffen = offenPaar[1];
    var suchePaar = hooks.useState("");
    var suche = suchePaar[0];
    var setSuche = suchePaar[1];
    var aktivPaar = hooks.useState(0);
    var aktiv = aktivPaar[0];
    var setAktiv = aktivPaar[1];

    var wurzel = hooks.useRef(null);
    var knopf = hooks.useRef(null);
    var pop = hooks.useRef(null);
    var liste = hooks.useRef(null);
    var suchfeld = hooks.useRef(null);
    var tippen = hooks.useRef({ text: "", zeit: 0 });

    var gefiltert = optionen.filter(function (o) {
      return UI.textTrifft(o.label + " " + (o.hinweis || ""), suche);
    });
    var gewaehlt = optionen.find(function (o) {
      return o.wert === wert;
    });
    var aktivId = offen && gefiltert[aktiv] ? listeId + "-" + aktiv : undefined;

    function indexVonWert() {
      var i = optionen.indexOf(gewaehlt);
      return i < 0 ? 0 : i;
    }

    function oeffnen(start, text) {
      setSuche(text || "");
      setAktiv(text ? 0 : start === undefined ? indexVonWert() : start);
      setOffen(true);
    }

    function schliessen(zurueck) {
      setOffen(false);
      if (zurueck && knopf.current) knopf.current.focus();
    }

    function waehlen(o, zurueck) {
      if (o.wert !== wert) props.beiAenderung(o.wert);
      schliessen(zurueck);
    }

    function platzieren() {
      if (!pop.current || !knopf.current) return;
      var r = knopf.current.getBoundingClientRect();
      var s = pop.current.style;
      var breite = Math.min(Math.max(r.width, MIN_BREITE), window.innerWidth - 2 * RAND);
      var unten = window.innerHeight - r.bottom - ABSTAND - RAND;
      var oben = r.top - ABSTAND - RAND;
      s.width = breite + "px";
      s.left = Math.max(RAND, Math.min(r.left, window.innerWidth - breite - RAND)) + "px";
      s.maxHeight = MAX_HOEHE + "px";
      var hoehe = pop.current.offsetHeight;
      var nachOben = hoehe > unten && oben > unten;
      var platz = Math.min(MAX_HOEHE, Math.max(nachOben ? oben : unten, 0));
      s.maxHeight = platz + "px";
      s.top = (nachOben ? r.top - ABSTAND - Math.min(hoehe, platz) : r.bottom + ABSTAND) + "px";
    }

    hooks.useLayoutEffect(function () {
      if (offen) platzieren();
    });

    hooks.useLayoutEffect(
      function () {
        if (offen && mitSuche && suchfeld.current) suchfeld.current.focus();
      },
      [offen],
    );

    // Hält die aktive Option sichtbar, ohne die Seite dahinter zu bewegen.
    hooks.useLayoutEffect(
      function () {
        var l = liste.current;
        var o = l && l.children[aktiv];
        if (!o) return;
        if (o.offsetTop < l.scrollTop) l.scrollTop = o.offsetTop;
        else if (o.offsetTop + o.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = o.offsetTop + o.offsetHeight - l.clientHeight;
      },
      [offen, aktiv],
    );

    hooks.useEffect(
      function () {
        if (!offen) return;
        function aussen(e) {
          if (wurzel.current && !wurzel.current.contains(e.target)) setOffen(false);
        }
        function rollen(e) {
          if (pop.current && !pop.current.contains(e.target)) platzieren();
        }
        document.addEventListener("mousedown", aussen);
        window.addEventListener("resize", platzieren);
        window.addEventListener("scroll", rollen, true);
        return function () {
          document.removeEventListener("mousedown", aussen);
          window.removeEventListener("resize", platzieren);
          window.removeEventListener("scroll", rollen, true);
        };
      },
      [offen],
    );

    function zeichen(e) {
      return e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey;
    }

    // Tippen springt zum ersten passenden Eintrag, wiederholte Buchstaben blättern weiter.
    function tippsprung(buchstabe) {
      var t = tippen.current;
      var jetzt = Date.now();
      t.text = jetzt - t.zeit > TIPP_PAUSE ? buchstabe : t.text + buchstabe;
      t.zeit = jetzt;
      var gleich = t.text.split("").every(function (z) {
        return z === t.text[0];
      });
      var gesucht = K.normalisieren(gleich ? t.text[0] : t.text);
      var start = offen ? aktiv + (gleich ? 1 : 0) : indexVonWert() + (gleich ? 1 : 0);
      for (var i = 0; i < optionen.length; i++) {
        var n = (start + i) % optionen.length;
        if (K.normalisieren(optionen[n].label).indexOf(gesucht) === 0) return n;
      }
      return -1;
    }

    function tasteZu(e) {
      var k = e.key;
      var springen = !mitSuche && zeichen(e) ? tippsprung(e.key) : -1;
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") oeffnen();
      else if (k === "Home") oeffnen(0);
      else if (k === "End") oeffnen(optionen.length - 1);
      else if (mitSuche && zeichen(e)) oeffnen(0, e.key);
      else if (springen > -1) oeffnen(springen);
      else if (!zeichen(e)) return;
      e.preventDefault();
    }

    function bewegen(n) {
      setAktiv(Math.max(0, Math.min(gefiltert.length - 1, n)));
    }

    function tasteOffen(e) {
      var k = e.key;
      var imSuchfeld = e.target === suchfeld.current;
      var treffer = gefiltert[aktiv];
      if (k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        schliessen(true);
      } else if (k === "Tab") {
        // Im Suchfeld steht nur Suchtext, deshalb übernimmt Tab dort nichts.
        if (imSuchfeld) {
          e.preventDefault();
          schliessen(true);
        } else if (treffer) waehlen(treffer, false);
        else schliessen(false);
      } else if (k === "Enter" || (k === " " && !imSuchfeld)) {
        e.preventDefault();
        if (treffer) waehlen(treffer, true);
      } else if (k === "ArrowUp" && e.altKey) {
        e.preventDefault();
        if (treffer) waehlen(treffer, true);
        else schliessen(true);
      } else if (k === "ArrowDown" || k === "ArrowUp") {
        e.preventDefault();
        bewegen(aktiv + (k === "ArrowDown" ? 1 : -1));
      } else if (k === "PageDown" || k === "PageUp") {
        e.preventDefault();
        bewegen(aktiv + (k === "PageDown" ? SEITE : -SEITE));
      } else if ((k === "Home" || k === "End") && !imSuchfeld) {
        e.preventDefault();
        bewegen(k === "Home" ? 0 : gefiltert.length - 1);
      } else if (!imSuchfeld && zeichen(e)) {
        var n = tippsprung(e.key);
        if (n > -1) bewegen(n);
      }
    }

    function liste_() {
      return html`<div class="rj-dropdown__pop" ref=${pop}>
        ${mitSuche &&
        html`<div class="rj-dropdown__suche">
          <div class="rj-input-wrap">
            <${UI.Icon} name="search" />
            <input
              class="rj-input"
              type="text"
              ref=${suchfeld}
              role="combobox"
              aria-expanded="true"
              aria-controls=${listeId}
              aria-autocomplete="list"
              aria-activedescendant=${aktivId}
              aria-label=${K.t("dropdown.suche")}
              placeholder=${K.t("dropdown.suche")}
              autocomplete="off"
              spellcheck="false"
              value=${suche}
              onInput=${function (e) {
                setSuche(e.target.value);
                setAktiv(0);
              }}
              onKeyDown=${tasteOffen}
            />
          </div>
          ${suche && html`<span class="rj-sr-only" role="status">${K.t("dropdown.treffer", { anzahl: gefiltert.length })}</span>`}
        </div>`}
        ${gefiltert.length
          ? html`<ul class="rj-dropdown__liste" id=${listeId} role="listbox" aria-label=${props.label || props["aria-label"]} ref=${liste}>
              ${gefiltert.map(function (o, i) {
                var an = o.wert === wert;
                return html`<li
                  key=${o.wert}
                  id=${listeId + "-" + i}
                  class=${"rj-dropdown__option" + (i === aktiv ? " is-aktiv" : "")}
                  role="option"
                  aria-selected=${an ? "true" : "false"}
                  data-wert=${o.wert}
                  onMouseMove=${function (e) {
                    if (i !== aktiv && (e.movementX || e.movementY)) setAktiv(i);
                  }}
                  onMouseDown=${function (e) {
                    e.preventDefault();
                  }}
                  onClick=${function () {
                    waehlen(o, true);
                  }}
                >
                  <span class="rj-option-icon">${o.icon && html`<${UI.Icon} name=${o.icon} />`}<span>${o.label} ${o.hinweis && html`<small>${o.hinweis}</small>`}</span></span>
                  ${an && html`<${UI.Icon} name="check" />`}
                </li>`;
              })}
            </ul>`
          : html`<p class="rj-dropdown__leer" id=${listeId}>${K.t("dropdown.leer")}</p>`}
      </div>`;
    }

    return html`<div class="rj-dropdown" ref=${wurzel}>
      <button
        class="rj-dropdown__btn"
        type="button"
        id=${props.id}
        ref=${knopf}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded=${offen ? "true" : "false"}
        aria-controls=${offen ? listeId : undefined}
        aria-activedescendant=${offen && !mitSuche ? aktivId : undefined}
        aria-label=${props["aria-label"]}
        aria-describedby=${props["aria-describedby"]}
        aria-invalid=${props["aria-invalid"]}
        aria-required=${props.required ? "true" : undefined}
        disabled=${props.disabled}
        onClick=${function () {
          if (offen) schliessen(true);
          else oeffnen();
        }}
        onKeyDown=${function (e) {
          if (offen) tasteOffen(e);
          else tasteZu(e);
        }}
      >
        <span class=${"rj-dropdown__wert" + (gewaehlt ? "" : " is-leer")}>
          <span class="rj-option-icon">${gewaehlt && gewaehlt.icon && html`<${UI.Icon} name=${gewaehlt.icon} />`}${gewaehlt ? gewaehlt.label : props.platzhalter || K.t("dropdown.platzhalter")}</span>
        </span>
        <${UI.Icon} name="chevron-down" />
      </button>
      ${offen && liste_()}
    </div>`;
  };
})();
