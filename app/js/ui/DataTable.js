(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // „muller“ und „mueller“ finden beide „Müller“.
  function norm(s) {
    return String(s === null || s === undefined ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss");
  }
  function normAlt(s) {
    return String(s === null || s === undefined ? "" : s)
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
  }

  UI.textTrifft = function (text, suche) {
    var q = suche.trim();
    return !q || norm(text).indexOf(norm(q)) > -1 || normAlt(text).indexOf(normAlt(q)) > -1;
  };

  function sortWert(spalte, zeile) {
    var roh = spalte.sortwert ? spalte.sortwert(zeile) : spaltenText(spalte, zeile);
    if (typeof roh === "number") return roh;
    var typ = spalte.typ || "text";
    if (typ === "number") {
      var n = parseFloat(
        String(roh)
          .replace(/[^\d,.\-]/g, "")
          .replace(/\.(?=\d{3}(\D|$))/g, "")
          .replace(",", "."),
      );
      return isNaN(n) ? -Infinity : n;
    }
    if (typ === "date") {
      var m = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(roh);
      return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : -Infinity;
    }
    return roh;
  }

  function spaltenText(spalte, zeile) {
    if (spalte.text) return spalte.text(zeile);
    var w = zeile[spalte.schluessel];
    return w === null || w === undefined ? "" : String(w);
  }

  // spalten: { schluessel, titel, typ?, num?, sortierbar?, nurScreenreader?, zelle?, text?, sortwert? }
  // ohneSuche: Eine FilterBar über der Tabelle sucht bereits.
  UI.DataTable = function (props) {
    var sprache = K.sprache();
    var spalten = props.spalten;
    var suchePaar = hooks.useState("");
    var suche = suchePaar[0];
    var setSuche = suchePaar[1];
    var sortPaar = hooks.useState(props.startSortierung || null);
    var sortierung = sortPaar[0];
    var setSortierung = sortPaar[1];
    var suchfeld = hooks.useRef(null);

    var q = suche.trim();
    var treffer = props.zeilen.filter(function (z) {
      var text = spalten
        .map(function (s) {
          return spaltenText(s, z);
        })
        .join(" ");
      return UI.textTrifft(text, q);
    });

    if (sortierung) {
      var spalte = spalten.filter(function (s) {
        return s.schluessel === sortierung.spalte;
      })[0];
      var vergleich = new Intl.Collator(sprache, { numeric: true, sensitivity: "base" });
      treffer = treffer.slice().sort(function (a, b) {
        var x = sortWert(spalte, a);
        var y = sortWert(spalte, b);
        var r = typeof x === "number" && typeof y === "number" ? x - y : vergleich.compare(String(x), String(y));
        return sortierung.richtung === "descending" ? -r : r;
      });
    }

    function sortieren(schluessel) {
      var aufsteigend = sortierung && sortierung.spalte === schluessel && sortierung.richtung === "ascending";
      setSortierung({ spalte: schluessel, richtung: aufsteigend ? "descending" : "ascending" });
    }

    function kopf(s) {
      var richtung = sortierung && sortierung.spalte === s.schluessel ? sortierung.richtung : undefined;
      var klasse = s.num ? "is-num" : undefined;
      var titel = s.nurScreenreader ? html`<span class="rj-sr-only">${s.titel}</span>` : s.titel;
      if (s.sortierbar === false) {
        return html`<th scope="col" class=${klasse} key=${s.schluessel}>${titel}</th>`;
      }
      var icon = richtung === "ascending" ? "arrow-up" : richtung === "descending" ? "arrow-down" : "chevrons-up-down";
      return html`<th scope="col" class=${klasse} aria-sort=${richtung} key=${s.schluessel}>
        <button
          type="button"
          class="rj-sortbtn"
          onClick=${function () {
            sortieren(s.schluessel);
          }}
        >
          <span>${titel}</span>
          <span class="rj-sortbtn__icon"><${UI.Icon} name=${icon} /></span>
        </button>
      </th>`;
    }

    function zelle(s, z) {
      return html`<td class=${s.num ? "is-num" : undefined} key=${s.schluessel}>
        ${s.zelle ? s.zelle(z) : spaltenText(s, z)}
      </td>`;
    }

    return html`<div class="rj-datatable">
      ${!props.ohneSuche && html`<div class="rj-datatable__bar">
        <div class="rj-input-wrap">
          <${UI.Icon} name="search" />
          <input
            class="rj-input"
            type="search"
            ref=${suchfeld}
            placeholder=${K.t("tabelle.suchen")}
            aria-label=${K.t("tabelle.suchen")}
            value=${suche}
            onInput=${function (e) {
              setSuche(e.target.value);
            }}
          />
        </div>
        <span class="rj-datatable__count" aria-live="polite">
          ${K.t("tabelle.zaehler", { anzahl: treffer.length, gesamt: props.zeilen.length })}
        </span>
      </div>`}
      <div class="rj-table-wrap">
        <table class="rj-table">
          <thead>
            <tr>
              ${spalten.map(kopf)}
            </tr>
          </thead>
          <tbody>
            ${treffer.map(function (z) {
              return html`<tr key=${z.id}>
                ${spalten.map(function (s) {
                  return zelle(s, z);
                })}
              </tr>`;
            })}
            ${treffer.length === 0 &&
            html`<tr class="rj-datatable__empty">
              <td colspan=${spalten.length}>
                <${UI.Icon} name="search-x" />
                <div>${K.t("tabelle.keineTreffer", { suche: q })}</div>
                <${UI.Button}
                  onClick=${function () {
                    setSuche("");
                    suchfeld.current.focus();
                  }}
                  >${K.t("tabelle.zuruecksetzen")}<//
                >
              </td>
            </tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  };
})();
