(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_BYTES = 1024 * 1024;
  var DATEINAME = /^(.+?)(?:\.(de|en))?\.md$/i;
  var ERSTE_UEBERSCHRIFT = /^\s*#\s+(.+?)\s*(?:\r?\n|$)/;
  var BILDNAME = /^[a-z0-9-]+$/;
  var INTERN = /^#\/[\w\/-]*$/;
  // Prüfsummen der Texte, die seit dem Kopieren korrigiert wurden.
  var ALTE_FASSUNGEN = {
    "foto-ja-nein.de.md": "1tkmvka",
    "gehaltsverhandlung.de.md": "ttu4e",
    "kuendigungsfristen.de.md": "x2n2v4",
    "arbeitsvertrag-pruefen.de.md": "ad2a8",
    "foto-ja-nein.en.md": "qk6x9i",
    "gehaltsverhandlung.en.md": "vhrjur",
    "kuendigungsfristen.en.md": "17cempi",
    "arbeitsvertrag-pruefen.en.md": "vtm6n0"
  };
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

  function quellenLesen(wert) {
    return String(wert || "")
      .split(";;")
      .map(function (teil) {
        var stelle = teil.lastIndexOf("|");
        return { titel: teil.slice(0, stelle).trim(), url: teil.slice(stelle + 1).trim() };
      })
      .filter(function (q) {
        return q.titel && EXTERN.test(q.url);
      });
  }

  function artikelLesen(name, text, eigen) {
    var teile = DATEINAME.exec(name);
    var f = K.frontmatter(text);
    var kopf = ERSTE_UEBERSCHRIFT.exec(f.rest);
    return {
      kennung: teile[1],
      datei: name,
      eigen: eigen,
      titel: f.felder.title || (kopf && kopf[1]) || teile[1],
      kategorie: f.felder.category || K.t("wissen.ohneKategorie"),
      sprache: (f.felder.lang || teile[2] || "").toLowerCase(),
      quellen: quellenLesen(f.felder.sources),
      // Skizzen gibt es nur zu mitgelieferten Artikeln, eigene bleiben reiner Text.
      bild: !eigen && BILDNAME.test(f.felder.image || "") ? f.felder.image : "",
      bildText: f.felder["image-alt"] || "",
      // Der Titel steht schon im Seitenkopf.
      text: kopf ? f.rest.slice(kopf[0].length) : f.rest,
    };
  }

  function pruefsumme(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function mitgeliefert() {
    return (window.R42J_WISSEN || []).map(function (a) {
      return artikelLesen(a.datei, a.md, false);
    });
  }

  // Ältere Versionen kopierten die Artikel nach daten/wissen/. Unveränderte Kopien stehen hinter der aktuellen Fassung zurück.
  function istAltkopie(name, text) {
    var schluessel = name.toLowerCase();
    var koerper = K.frontmatter(text).rest.trim();
    if (ALTE_FASSUNGEN[schluessel] === pruefsumme(koerper)) return true;
    return (window.R42J_WISSEN || []).some(function (a) {
      return a.datei.toLowerCase() === schluessel && K.frontmatter(a.md).rest.trim() === koerper;
    });
  }

  function kennungAus(titel) {
    return (
      K.normalisieren(titel)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "artikel"
    );
  }

  function zeile(wert) {
    return String(wert).replace(/\s+/g, " ").trim();
  }

  // Je Kennung bleibt eine Fassung: die der Oberfläche, sonst eine ohne Sprache. Eigene stehen hinten und gewinnen bei Gleichstand.
  function auswaehlen(alle) {
    var sprache = K.sprache();
    var beste = {};
    function rang(a) {
      return a.sprache === sprache ? 2 : a.sprache ? 0 : 1;
    }
    alle.forEach(function (a) {
      if (!beste[a.kennung] || rang(a) >= rang(beste[a.kennung])) beste[a.kennung] = a;
    });
    return Object.keys(beste).map(function (k) {
      return beste[k];
    });
  }

  K.wissen = {
    // Unlesbare oder zu große Dateien zählen nur mit, sie halten die übrigen nicht auf.
    laden: async function () {
      var quelle = await ordner();
      var dateien = (await K.fs.dateien(quelle)).filter(function (d) {
        return DATEINAME.test(d.name);
      });
      var dekodierer = new TextDecoder("utf-8");
      var alle = mitgeliefert();
      var uebersprungen = 0;
      for (var i = 0; i < dateien.length; i++) {
        try {
          var bytes = await K.fs.lesen(quelle, dateien[i].name);
          if (bytes.length > MAX_BYTES) uebersprungen++;
          else {
            var text = dekodierer.decode(bytes);
            if (!istAltkopie(dateien[i].name, text)) alle.push(artikelLesen(dateien[i].name, text, true));
          }
        } catch (e) {
          uebersprungen++;
        }
      }
      return { artikel: auswaehlen(alle), uebersprungen: uebersprungen };
    },

    quellenLesen: quellenLesen,

    // Neue Artikel bekommen eine freie Kennung, vorhandene behalten ihre Datei.
    speichern: async function (artikel) {
      var griff = await ordner();
      var name = artikel.datei;
      if (!name) {
        var belegt = { neu: true };
        (await K.wissen.laden()).artikel.forEach(function (a) {
          belegt[a.kennung] = true;
        });
        var basis = kennungAus(artikel.titel);
        var kennung = basis;
        for (var nr = 2; belegt[kennung]; nr++) kennung = basis + "-" + nr;
        name = kennung + ".md";
      }
      var quellen = artikel.quellen
        .map(function (q) {
          return zeile(q.titel).replace(/;;|\|/g, " ") + " | " + q.url;
        })
        .join(" ;; ");
      var inhalt =
        "---\ntitle: " + zeile(artikel.titel) + "\ncategory: " + zeile(artikel.kategorie || K.t("wissen.ohneKategorie")) + "\nlang: " + K.sprache() + "\n" + (quellen ? "sources: " + quellen + "\n" : "") + "---\n\n" + artikel.text.trim() + "\n";
      var bytes = new TextEncoder().encode(inhalt);
      if (bytes.length > MAX_BYTES) throw K.Fehler("wissen.fehlerGross");
      await K.fs.schreibenAtomar(griff, name, bytes);
      return DATEINAME.exec(name)[1];
    },

    entfernen: async function (datei) {
      await K.fs.loeschen(await ordner(), datei);
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
