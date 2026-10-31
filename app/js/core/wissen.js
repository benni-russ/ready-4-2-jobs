(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_BYTES = 1024 * 1024;
  var DATEINAME = /^(.+?)(?:\.(de|en))?\.md$/i;
  var ERSTE_UEBERSCHRIFT = /^\s*#\s+(.+?)\s*(?:\r?\n|$)/;
  var INTERN = /^#\/[\w\/-]*$/;
  var EXTERN = /^https:\/\//i;
  // Bilder und Einbettungen würden Anfragen auslösen, Artikel bleiben reiner Text.
  var VERBOTEN = ["img", "picture", "video", "audio", "source", "iframe", "svg", "math", "style", "form", "input", "button"];

  // Roher HTML-Code im Markdown entfällt: Artikel brauchen ihn nicht, und DOMPurify muss ihn so gar nicht erst sehen.
  var markdown = new window.marked.Marked({
    gfm: true,
    renderer: {
      html: function () {
        return "";
      },
    },
  });

  function ordner() {
    return K.fs.ordner(K.profile.datenOrdner(), ["wissen"]);
  }

  function artikelLesen(name, text) {
    var teile = DATEINAME.exec(name);
    var f = K.frontmatter(text);
    var kopf = ERSTE_UEBERSCHRIFT.exec(f.rest);
    return {
      kennung: teile[1],
      titel: f.felder.title || (kopf && kopf[1]) || teile[1],
      kategorie: f.felder.category || K.t("wissen.ohneKategorie"),
      sprache: (f.felder.lang || teile[2] || "").toLowerCase(),
      // Der Titel steht schon im Seitenkopf.
      text: kopf ? f.rest.slice(kopf[0].length) : f.rest,
    };
  }

  // Je Kennung bleibt eine Fassung: die der Oberfläche, sonst eine ohne Sprache, sonst die erste.
  function auswaehlen(alle) {
    var sprache = K.sprache();
    var beste = {};
    function rang(a) {
      return a.sprache === sprache ? 2 : a.sprache ? 0 : 1;
    }
    alle.forEach(function (a) {
      if (!beste[a.kennung] || rang(a) > rang(beste[a.kennung])) beste[a.kennung] = a;
    });
    return Object.keys(beste).map(function (k) {
      return beste[k];
    });
  }

  K.wissen = {
    // Vorhandene Dateien bleiben unberührt: Der Nutzer darf sie ändern.
    kopieren: async function (daten) {
      var ziel = await K.fs.ordner(daten, ["wissen"]);
      var da = {};
      (await K.fs.dateien(ziel)).forEach(function (d) {
        da[d.name.toLowerCase()] = true;
      });
      var kodierer = new TextEncoder();
      var mitgeliefert = window.R42J_WISSEN || [];
      for (var i = 0; i < mitgeliefert.length; i++) {
        var a = mitgeliefert[i];
        if (!da[a.datei.toLowerCase()]) await K.fs.schreibenAtomar(ziel, a.datei, kodierer.encode(a.md));
      }
    },

    // Unlesbare oder zu große Dateien zählen nur mit, sie halten die übrigen nicht auf.
    laden: async function () {
      var quelle = await ordner();
      var dateien = (await K.fs.dateien(quelle)).filter(function (d) {
        return DATEINAME.test(d.name);
      });
      var dekodierer = new TextDecoder("utf-8");
      var alle = [];
      var uebersprungen = 0;
      for (var i = 0; i < dateien.length; i++) {
        try {
          var bytes = await K.fs.lesen(quelle, dateien[i].name);
          if (bytes.length > MAX_BYTES) uebersprungen++;
          else alle.push(artikelLesen(dateien[i].name, dekodierer.decode(bytes)));
        } catch (e) {
          uebersprungen++;
        }
      }
      return { artikel: auswaehlen(alle), uebersprungen: uebersprungen };
    },

    // Artikel sind fremder Text: Erst bereinigen, dann gelten nur App-Links und HTTPS.
    alsHtml: function (md) {
      var inhalt = window.DOMPurify.sanitize(markdown.parse(md, { async: false }), {
        FORBID_TAGS: VERBOTEN,
        FORBID_ATTR: ["style", "class", "id"],
        RETURN_DOM_FRAGMENT: true,
      });
      inhalt.querySelectorAll("a").forEach(function (a) {
        var ziel = a.getAttribute("href") || "";
        a.removeAttribute("target");
        if (EXTERN.test(ziel)) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        } else if (!INTERN.test(ziel)) a.removeAttribute("href");
      });
      var huelle = document.createElement("div");
      huelle.appendChild(inhalt);
      return huelle.innerHTML;
    },
  };
})();
