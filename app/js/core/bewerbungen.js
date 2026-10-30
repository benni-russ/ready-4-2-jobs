(function () {
  "use strict";
  var K = window.R42J_CORE;

  var MAX_MARKDOWN_BYTES = 1024 * 1024;
  var SNAPSHOTS = ["lebenslauf", "anschreiben", "anlagenPdf", "gesamtPdf"];

  function jetzt() {
    return new Date().toISOString();
  }

  function holen(id) {
    return K.tresor.daten().bewerbungen.filter(function (b) {
      return b.id === id;
    })[0];
  }

  // Einfaches Frontmatter, wie es etwa der Obsidian Web Clipper schreibt: nur „schlüssel: wert“.
  function frontmatter(text) {
    var m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
    if (!m) return { felder: {}, rest: text };
    var felder = {};
    m[1].split(/\r?\n/).forEach(function (zeile) {
      var t = /^([\w-]+):\s*(.*)$/.exec(zeile);
      if (t) felder[t[1].toLowerCase()] = wertLesen(t[2]);
    });
    return { felder: felder, rest: text.slice(m[0].length) };
  }

  function wertLesen(w) {
    return w
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^\[\[|\]\]$/g, "")
      .trim();
  }

  function portal(link) {
    var m = /^https?:\/\/(?:www\.)?([^/:]+)/i.exec(link || "");
    return m ? m[1] : "";
  }

  // Die Rohform bleibt erhalten, angezeigt und ausgewertet wird der Text ohne Markdown-Zeichen.
  function markdownText(md) {
    return md
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .trim();
  }

  K.bewerbungen = {
    SNAPSHOTS: SNAPSHOTS,

    holen: holen,

    markdownLesen: function (md) {
      var f = frontmatter(md);
      return {
        titel: f.felder.title || "",
        firma: f.felder.company || "",
        link: f.felder.source || "",
        quelle: portal(f.felder.source),
        anzeigeText: markdownText(f.rest),
        anzeigeMd: md,
      };
    },

    markdownDatei: async function (datei) {
      if (datei.size > MAX_MARKDOWN_BYTES) throw K.Fehler("fehler.markdownGross");
      return K.bewerbungen.markdownLesen(await datei.text());
    },

    neu: function (w) {
      var b = {
        id: K.uuid(),
        ausrichtungId: w.ausrichtungId,
        sprache: w.sprache,
        anrede: w.anrede,
        firma: { name: w.firma, adresse: w.adresse || "" },
        ansprechpartner: {},
        stelle: { titel: w.titel, quelle: w.quelle || "", link: w.link || "", anzeigeText: w.anzeigeText || "" },
        keywords: K.keywords.analysieren(w.anzeigeText || ""),
        dokumente: { mitFoto: w.sprache === "de", mitUnterschrift: false, komprimierung: "mittel", anlagenAuswahl: [], deckblatt: true, allesInEinem: false },
        anschreiben: K.anschreiben.neu(w.sprache, w.anrede),
        emails: [],
        status: [{ status: "vorbereitung", datum: jetzt() }],
        termine: [],
        notizen: "",
        checkliste: {},
        erstellt: jetzt(),
      };
      if (w.anzeigeMd) b.stelle.anzeigeMd = w.anzeigeMd;
      K.tresor.aendern(function (d) {
        d.bewerbungen.push(b);
      });
      return b;
    },

    aendern: function (id, aufgabe) {
      K.tresor.aendern(function () {
        aufgabe(holen(id));
      });
    },

    // Rechnet Treffer und Lücken neu, etwa nachdem eine Lücke als Kompetenz angelegt wurde.
    keywordsAbgleichen: function (id) {
      K.bewerbungen.aendern(id, function (b) {
        b.keywords = K.keywords.abgleichen(b.keywords);
      });
    },

    anzeigeAnalysieren: function (id) {
      K.bewerbungen.aendern(id, function (b) {
        b.keywords = K.keywords.analysieren(b.stelle.anzeigeText, b.keywords.manuell);
      });
    },

    keywordHinzufuegen: function (id, name) {
      K.bewerbungen.aendern(id, function (b) {
        var n = name.trim();
        if (!n || K.keywords.alle(b.keywords).indexOf(n) > -1) return;
        b.keywords.manuell.push(n);
        b.keywords = K.keywords.abgleichen(b.keywords);
      });
    },

    keywordEntfernen: function (id, name) {
      K.bewerbungen.aendern(id, function (b) {
        function ohne(x) {
          return x !== name;
        }
        b.keywords.extrahiert = b.keywords.extrahiert.filter(ohne);
        b.keywords.manuell = b.keywords.manuell.filter(ohne);
        b.keywords = K.keywords.abgleichen(b.keywords);
      });
    },

    // Löst die Kompetenz und alle Schreibweisen des Keywords zusammen auf.
    trefferEntfernen: function (id, kompetenzId) {
      var kompetenz = K.tresor.daten().kompetenzen.filter(function (k) {
        return k.id === kompetenzId;
      })[0];
      var schreibweisen = [kompetenz.name.de, kompetenz.name.en].filter(Boolean).concat(kompetenz.synonyme || []).map(K.normalisieren);
      var alle = K.keywords.alle(holen(id).keywords);
      alle
        .filter(function (name) {
          return schreibweisen.indexOf(K.normalisieren(name)) > -1;
        })
        .forEach(function (name) {
          K.bewerbungen.keywordEntfernen(id, name);
        });
    },

    // Der alte Snapshot verschwindet erst, wenn der neue sicher liegt.
    snapshotSpeichern: async function (id, art, bytes, dateiname) {
      var anlageId = K.uuid();
      await K.tresor.anlageSchreiben(anlageId, bytes);
      var alt = holen(id).dokumente[art];
      var snapshot = { erzeugtAm: jetzt(), dateiname: dateiname, anlageId: anlageId, groesse: bytes.length };
      K.bewerbungen.aendern(id, function (b) {
        b.dokumente[art] = snapshot;
      });
      await K.tresor.speichernJetzt();
      if (alt) await K.tresor.anlageLoeschen(alt.anlageId);
      return snapshot;
    },

    snapshotLoeschen: async function (id, art) {
      var alt = holen(id).dokumente[art];
      if (!alt) return;
      K.bewerbungen.aendern(id, function (b) {
        delete b.dokumente[art];
      });
      await K.tresor.speichernJetzt();
      await K.tresor.anlageLoeschen(alt.anlageId);
    },

    emailSpeichern: async function (id, entwurf, bytes) {
      var eintrag = Object.assign({ id: K.uuid(), anlageId: K.uuid(), erstellt: jetzt(), groesse: bytes.length }, entwurf);
      await K.tresor.anlageSchreiben(eintrag.anlageId, bytes);
      K.bewerbungen.aendern(id, function (b) {
        b.emails.push(eintrag);
      });
      await K.tresor.speichernJetzt();
      return eintrag;
    },

    emailLoeschen: async function (id, emailId) {
      var eintrag = holen(id).emails.filter(function (e) {
        return e.id === emailId;
      })[0];
      K.bewerbungen.aendern(id, function (b) {
        b.emails = b.emails.filter(function (e) {
          return e.id !== emailId;
        });
      });
      await K.tresor.speichernJetzt();
      await K.tresor.anlageLoeschen(eintrag.anlageId);
    },

    // Der Verlauf bleibt erhalten, der letzte Eintrag gilt.
    versendet: function (id, datum) {
      K.bewerbungen.aendern(id, function (b) {
        b.versendetAm = datum;
        b.status.push({ status: "versendet", datum: datum });
      });
    },

    aktuellerStatus: function (b) {
      return b.status[b.status.length - 1].status;
    },

    loeschen: async function (id) {
      var b = holen(id);
      var dateien = SNAPSHOTS.filter(function (art) {
        return b.dokumente[art];
      })
        .map(function (art) {
          return b.dokumente[art].anlageId;
        })
        .concat(
          b.emails.map(function (e) {
            return e.anlageId;
          }),
        );
      K.tresor.aendern(function (d) {
        d.bewerbungen = d.bewerbungen.filter(function (x) {
          return x.id !== id;
        });
      });
      await K.tresor.speichernJetzt();
      for (var i = 0; i < dateien.length; i++) await K.tresor.anlageLoeschen(dateien[i]);
    },
  };
})();
