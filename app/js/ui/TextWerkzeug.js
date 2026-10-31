(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var BILD_MAX_PX = 1200;
  var BILD_QUALITAET = 0.82;
  var HTTPS = /^https:\/\/\S+$/i;

  // Verkleinert aufs Nötige, liefert JPEG und lässt damit auch Metadaten wie den Aufnahmeort weg.
  async function bildVerkleinern(datei) {
    var bild = await window.createImageBitmap(datei);
    var faktor = Math.min(1, BILD_MAX_PX / bild.width);
    var flaeche = document.createElement("canvas");
    flaeche.width = Math.round(bild.width * faktor);
    flaeche.height = Math.round(bild.height * faktor);
    var c = flaeche.getContext("2d");
    c.fillStyle = "#fff";
    c.fillRect(0, 0, flaeche.width, flaeche.height);
    c.drawImage(bild, 0, 0, flaeche.width, flaeche.height);
    bild.close();
    return flaeche.toDataURL("image/jpeg", BILD_QUALITAET);
  }

  // Schreibt Markdown ins Textfeld der children. So bleibt der Text normal bearbeitbar und Strg+Z funktioniert.
  // props: label, bilder (bild-Nr. zu Daten), beiBild(id, daten)
  UI.TextWerkzeug = function (props) {
    var huelle = hooks.useRef(null);
    var auswahl = hooks.useRef([0, 0]);
    var fokus = hooks.useState(0);
    var dialog = hooks.useState(null);
    var link = hooks.useState({ text: "", ziel: "", fehler: "" });
    var bild = hooks.useState({ datei: null, text: "", fehler: "" });

    function feld() {
      return huelle.current.querySelector("textarea");
    }

    function einsetzen(text, von, bis, markierung) {
      var f = feld();
      f.focus();
      f.setSelectionRange(von, bis);
      if (!document.execCommand("insertText", false, text)) {
        f.setRangeText(text, von, bis, "end");
        f.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (markierung) f.setSelectionRange(von + markierung[0], von + markierung[1]);
    }

    function umschliessen(zeichen) {
      var f = feld();
      var von = f.selectionStart;
      var bis = f.selectionEnd;
      var wort = f.value.slice(von, bis) || K.t("wissen.werkzeugWort");
      einsetzen(zeichen + wort + zeichen, von, bis, [zeichen.length, zeichen.length + wort.length]);
    }

    // Wirkt auf ganze Zeilen. Ein zweiter Klick mit gleichem Vorsatz nimmt ihn wieder weg.
    function zeilen(vorsatz) {
      var f = feld();
      var von = f.value.lastIndexOf("\n", f.selectionStart - 1) + 1;
      var ende = f.value.indexOf("\n", f.selectionEnd);
      var bis = ende === -1 ? f.value.length : ende;
      var neu = f.value
        .slice(von, bis)
        .split("\n")
        .map(function (z, i) {
          var v = vorsatz(i);
          return z.indexOf(v) === 0 ? z.slice(v.length) : z.replace(/^(#{1,6} |- |\d+\. )/, "").replace(/^/, v);
        })
        .join("\n");
      einsetzen(neu, von, bis);
    }

    function merken() {
      var f = feld();
      auswahl.current = [f.selectionStart, f.selectionEnd];
      return f.value.slice(f.selectionStart, f.selectionEnd);
    }

    function linkOeffnen() {
      link[1]({ text: merken(), ziel: "", fehler: "" });
      dialog[1]("link");
    }

    function bildOeffnen() {
      merken();
      bild[1]({ datei: null, text: "", fehler: "" });
      dialog[1]("bild");
    }

    function schliessen() {
      dialog[1](null);
    }

    function linkEinfuegen() {
      var l = link[0];
      var ziel = l.ziel.trim();
      if (!HTTPS.test(ziel)) return link[1](Object.assign({}, l, { fehler: K.t("wissen.linkFehler") }));
      schliessen();
      einsetzen("[" + (l.text.trim() || ziel) + "](" + ziel + ")", auswahl.current[0], auswahl.current[1]);
    }

    async function bildEinfuegen() {
      var b = bild[0];
      if (!b.datei) return bild[1](Object.assign({}, b, { fehler: K.t("wissen.bildFehlerTyp") }));
      if (!b.text.trim()) return bild[1](Object.assign({}, b, { fehler: K.t("wissen.bildFehlerText") }));
      try {
        var daten = await bildVerkleinern(b.datei);
        var nr = Object.keys(props.bilder).length + 1;
        while (props.bilder["bild-" + nr]) nr += 1;
        var id = "bild-" + nr;
        props.beiBild(id, daten);
        schliessen();
        einsetzen("![" + b.text.trim().replace(/[\[\]]/g, "") + "][" + id + "]", auswahl.current[0], auswahl.current[1]);
      } catch (x) {
        bild[1](Object.assign({}, b, { fehler: K.t("wissen.bildFehlerTyp") }));
      }
    }

    var KNOEPFE = [
      { icon: "heading-2", label: "wissen.werkzeugUeberschrift", tun: function () { zeilen(function () { return "## "; }); } },
      { icon: "heading-3", label: "wissen.werkzeugZwischen", tun: function () { zeilen(function () { return "### "; }); } },
      null,
      { icon: "bold", label: "wissen.werkzeugFett", taste: "Strg+B", tun: function () { umschliessen("**"); } },
      { icon: "italic", label: "wissen.werkzeugKursiv", taste: "Strg+I", tun: function () { umschliessen("*"); } },
      null,
      { icon: "list", label: "wissen.werkzeugListe", tun: function () { zeilen(function () { return "- "; }); } },
      { icon: "list-ordered", label: "wissen.werkzeugNummern", tun: function () { zeilen(function (i) { return i + 1 + ". "; }); } },
      null,
      { icon: "link", label: "wissen.werkzeugLink", tun: linkOeffnen },
      { icon: "image", label: "wissen.werkzeugBild", tun: bildOeffnen },
    ];
    var aktive = KNOEPFE.filter(Boolean);

    // Die Leiste ist ein Tab-Stopp, Pfeiltasten wandern darin.
    function pfeil(e) {
      var schritt = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!schritt) return;
      e.preventDefault();
      var neu = (fokus[0] + schritt + aktive.length) % aktive.length;
      fokus[1](neu);
      e.currentTarget.querySelectorAll("button")[neu].focus();
    }

    function kuerzel(e) {
      if (e.target.tagName !== "TEXTAREA" || !(e.ctrlKey || e.metaKey) || e.altKey) return;
      var taste = e.key.toLowerCase();
      if (taste !== "b" && taste !== "i") return;
      e.preventDefault();
      e.stopPropagation();
      umschliessen(taste === "b" ? "**" : "*");
    }

    var lauf = -1;
    return html`<div class="rj-texteditor" ref=${huelle} onKeyDown=${kuerzel}>
      <div class="rj-texttools" role="toolbar" aria-label=${props.label} onKeyDown=${pfeil}>
        ${KNOEPFE.map(function (k, i) {
          if (!k) return html`<span class="rj-texttools__trenner" key=${"t" + i}></span>`;
          lauf += 1;
          var nr = lauf;
          var name = K.t(k.label);
          return html`<button
            key=${k.icon}
            type="button"
            class="rj-iconbtn"
            tabindex=${nr === fokus[0] ? "0" : "-1"}
            aria-label=${name}
            aria-keyshortcuts=${k.taste ? k.taste.replace("Strg", "Control") : undefined}
            title=${k.taste ? name + " (" + k.taste + ")" : name}
            onMouseDown=${function (e) {
              e.preventDefault();
            }}
            onClick=${function () {
              fokus[1](nr);
              k.tun();
            }}
          >
            <${UI.Icon} name=${k.icon} />
          </button>`;
        })}
      </div>
      ${props.children}
      ${dialog[0] === "link" &&
      html`<${UI.Dialog} titel=${K.t("wissen.werkzeugLink")} bestaetigen=${K.t("wissen.einfuegen")} eigenePruefung=${true} beiBestaetigen=${linkEinfuegen} beiSchliessen=${schliessen}>
        <${UI.TextField} label=${K.t("wissen.linkText")} wert=${link[0].text} beiAenderung=${function (v) { link[1](Object.assign({}, link[0], { text: v })); }} />
        <${UI.TextField} label=${K.t("wissen.linkZiel")} inputmode="url" placeholder="https://" fehler=${link[0].fehler} wert=${link[0].ziel} beiAenderung=${function (v) { link[1](Object.assign({}, link[0], { ziel: v, fehler: "" })); }} />
      <//>`}
      ${dialog[0] === "bild" &&
      html`<${UI.Dialog} titel=${K.t("wissen.werkzeugBild")} bestaetigen=${K.t("wissen.einfuegen")} eigenePruefung=${true} beiBestaetigen=${bildEinfuegen} beiSchliessen=${schliessen}>
        <${UI.Alert} art="warning">${K.t("wissen.bildHinweis")}<//>
        <${UI.FileDrop} accept="image/png,image/jpeg" hinweis=${bild[0].datei ? K.t("wissen.bildGewaehlt", { name: bild[0].datei.name }) : K.t("wissen.bildDatei")} beiDateien=${function (d) { bild[1](Object.assign({}, bild[0], { datei: d[0], fehler: "" })); }} />
        <${UI.TextField} label=${K.t("wissen.bildText")} hinweis=${K.t("wissen.bildTextHinweis")} fehler=${bild[0].fehler} wert=${bild[0].text} beiAenderung=${function (v) { bild[1](Object.assign({}, bild[0], { text: v, fehler: "" })); }} />
      <//>`}
    </div>`;
  };
})();
