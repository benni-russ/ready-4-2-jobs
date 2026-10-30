(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var R = window.R42J;
  var hooks = window.preactHooks;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function iso(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function ausIso(s) {
    return s ? new Date(s + "T00:00") : null;
  }
  function gleicherTag(a, b) {
    return !!a && !!b && iso(a) === iso(b);
  }
  function plusTage(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function monatsAnfang(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // Wert ist ein ISO-Datum oder "". Verhalten wie R42J.datepicker im Design-System.
  UI.DatePicker = function (props) {
    var sprache = K.sprache();
    var wert = props.wert || "";
    var min = ausIso(props.min);
    var max = ausIso(props.max);

    var textPaar = hooks.useState(wert ? R.formatDate(ausIso(wert), sprache) : "");
    var text = textPaar[0];
    var setText = textPaar[1];
    var ungueltigPaar = hooks.useState(false);
    var ungueltig = ungueltigPaar[0];
    var setUngueltig = ungueltigPaar[1];
    var offenPaar = hooks.useState(false);
    var offen = offenPaar[0];
    var setOffen = offenPaar[1];
    var fokusPaar = hooks.useState(null);
    var fokus = fokusPaar[0];
    var setFokus = fokusPaar[1];
    var ansichtPaar = hooks.useState(null);
    var ansicht = ansichtPaar[0];
    var setAnsicht = ansichtPaar[1];

    var wurzel = hooks.useRef(null);
    var pop = hooks.useRef(null);
    var knopf = hooks.useRef(null);
    var feld = hooks.useRef(null);
    var tagFokussieren = hooks.useRef(false);

    hooks.useLayoutEffect(
      function () {
        setText(wert ? R.formatDate(ausIso(wert), sprache) : "");
        setUngueltig(false);
      },
      [wert, sprache],
    );

    function gesperrt(d) {
      return (min && d < min) || (max && d > max);
    }

    function oeffnen() {
      var d = R.parseDate(feld.current.value, sprache) || new Date();
      tagFokussieren.current = true;
      setFokus(d);
      setAnsicht(monatsAnfang(d));
      setOffen(true);
    }

    function schliessen(zurueck) {
      setOffen(false);
      if (zurueck && knopf.current) knopf.current.focus();
    }

    function melden(neu) {
      if (props.beiAenderung) props.beiAenderung(neu);
    }

    function waehlen(d) {
      setText(R.formatDate(d, sprache));
      setUngueltig(false);
      melden(iso(d));
      schliessen(true);
    }

    function leeren() {
      setText("");
      setUngueltig(false);
      melden("");
      schliessen(true);
    }

    function platzieren() {
      if (!pop.current || !feld.current) return;
      var r = feld.current.getBoundingClientRect();
      var h = pop.current.offsetHeight;
      var w = pop.current.offsetWidth;
      var s = pop.current.style;
      s.position = "fixed";
      s.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
      s.top = (r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : r.bottom + 6) + "px";
    }

    hooks.useLayoutEffect(function () {
      if (!offen) return;
      platzieren();
      if (tagFokussieren.current && pop.current) {
        tagFokussieren.current = false;
        var b = pop.current.querySelector('[data-d="' + iso(fokus) + '"]');
        if (b) b.focus();
      }
    });

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

    function bewegen(d) {
      tagFokussieren.current = true;
      setFokus(d);
      setAnsicht(monatsAnfang(d));
    }

    function tastePopup(e) {
      var k = e.key;
      if (k === "Escape") {
        e.preventDefault();
        schliessen(true);
        return;
      }
      if (!e.target.hasAttribute("data-d")) return;
      var n = null;
      if (k === "ArrowLeft") n = plusTage(fokus, -1);
      else if (k === "ArrowRight") n = plusTage(fokus, 1);
      else if (k === "ArrowUp") n = plusTage(fokus, -7);
      else if (k === "ArrowDown") n = plusTage(fokus, 7);
      else if (k === "Home") n = plusTage(fokus, -((fokus.getDay() + 6) % 7));
      else if (k === "End") n = plusTage(fokus, 6 - ((fokus.getDay() + 6) % 7));
      else if (k === "PageUp" || k === "PageDown") {
        n = new Date(fokus);
        n.setMonth(n.getMonth() + (k === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1));
      }
      if (n) {
        e.preventDefault();
        bewegen(n);
      }
    }

    function monatBlaettern(richtung) {
      var v = new Date(ansicht.getFullYear(), ansicht.getMonth() + richtung, 1);
      setAnsicht(v);
      setFokus(v);
    }

    function pruefen() {
      var v = feld.current.value.trim();
      if (!v) {
        setUngueltig(false);
        if (wert) melden("");
        return;
      }
      var d = R.parseDate(v, sprache);
      if (d && !gesperrt(d)) {
        setText(R.formatDate(d, sprache));
        setUngueltig(false);
        if (iso(d) !== wert) melden(iso(d));
      } else {
        setUngueltig(true);
      }
    }

    function kalender() {
      var monate = K.t("kalender.monate");
      var tage = K.t("kalender.tage");
      var tageLang = K.t("kalender.tageLang");
      var gewaehlt = R.parseDate(text, sprache);
      var heute = new Date();
      var start = plusTage(ansicht, -((ansicht.getDay() + 6) % 7));
      var wochen = [];
      for (var r = 0; r < 6; r++) {
        var zellen = [];
        for (var c = 0; c < 7; c++) {
          (function (d, spalte) {
            zellen.push(html`<td role="gridcell" key=${iso(d)}>
              <button
                type="button"
                class=${d.getMonth() !== ansicht.getMonth() ? "is-outside" : undefined}
                data-d=${iso(d)}
                tabindex=${gleicherTag(d, fokus) ? 0 : -1}
                aria-label=${tageLang[spalte] + ", " + d.getDate() + ". " + monate[d.getMonth()] + " " + d.getFullYear()}
                aria-selected=${gleicherTag(d, gewaehlt) ? "true" : undefined}
                aria-current=${gleicherTag(d, heute) ? "date" : undefined}
                disabled=${gesperrt(d) || undefined}
                onClick=${function () {
                  waehlen(d);
                }}
              >
                ${d.getDate()}
              </button>
            </td>`);
          })(plusTage(start, r * 7 + c), c);
        }
        wochen.push(html`<tr key=${r}>${zellen}</tr>`);
      }
      return html`<div class="rj-cal" role="dialog" aria-label=${K.t("kalender.dialog")} ref=${pop} onKeyDown=${tastePopup}>
        <div class="rj-cal__head">
          <${UI.IconButton}
            icon="chevron-left"
            label=${K.t("kalender.zurueck")}
            onClick=${function () {
              monatBlaettern(-1);
            }}
          />
          <span class="rj-cal__title" aria-live="polite">${monate[ansicht.getMonth()] + " " + ansicht.getFullYear()}</span>
          <${UI.IconButton}
            icon="chevron-right"
            label=${K.t("kalender.weiter")}
            onClick=${function () {
              monatBlaettern(1);
            }}
          />
        </div>
        <table role="grid">
          <thead>
            <tr>
              ${tage.map(function (w, i) {
                return html`<th scope="col" abbr=${tageLang[i]} key=${w}>${w}</th>`;
              })}
            </tr>
          </thead>
          <tbody>
            ${wochen}
          </tbody>
        </table>
        <div class="rj-cal__foot">
          <${UI.Button}
            variante="ghost"
            onClick=${function () {
              waehlen(new Date());
            }}
            >${K.t("kalender.heute")}<//
          >
          <${UI.Button} variante="ghost" onClick=${leeren}>${K.t("kalender.leeren")}<//>
        </div>
      </div>`;
    }

    return html`<${UI.Feld}
      label=${props.label}
      hinweis=${props.hinweis}
      pflicht=${props.pflicht}
      fehler=${ungueltig ? K.t("kalender.ungueltig") : props.fehler}
      kind=${function (f) {
        return html`<div class="rj-date" data-value=${wert || undefined} ref=${wurzel}>
          <input
            class="rj-input"
            ref=${feld}
            value=${text}
            placeholder=${K.t("kalender.platzhalter")}
            inputmode="numeric"
            autocomplete="off"
            onInput=${function (e) {
              setText(K.maskeAnwenden(e.target, e.inputType, text, K.maskeDatum));
            }}
            onBlur=${pruefen}
            onKeyDown=${function (e) {
              if (e.key === "ArrowDown" && e.altKey) {
                e.preventDefault();
                oeffnen();
              }
            }}
            ...${f}
          />
          <button
            class="rj-iconbtn rj-date__btn"
            type="button"
            ref=${knopf}
            aria-label=${K.t("kalender.oeffnen")}
            aria-haspopup="dialog"
            aria-expanded=${offen ? "true" : "false"}
            onClick=${function () {
              if (offen) schliessen(true);
              else oeffnen();
            }}
          >
            <${UI.Icon} name="calendar" />
          </button>
          ${offen && kalender()}
        </div>`;
      }}
    />`;
  };
})();
