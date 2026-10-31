(function () {
  "use strict";
  var K = window.R42J_CORE;

  var TYPEN = ["karte", "mc", "mc-multi", "zahlenreihe"];
  var KATEGORIEN = ["allgemeinwissen", "mathe", "logik", "deutsch", "englisch", "interview"];
  var INTERVALLE = [1, 2, 4, 8, 16];
  var MAX_BYTES = 2 * 1024 * 1024;
  var MAX_MELDUNGEN = 5;
  var MAX_TEXT = 2000;
  var SITZUNG = 20;
  var VORSCHLAEGE = 3;
  var ENDUNG = ".json";

  function ordner() {
    return K.fs.ordner(K.profile.datenOrdner(), ["fragen"]);
  }

  function istText(w) {
    return typeof w === "string" && w.trim() !== "" && w.length <= MAX_TEXT;
  }

  function ganzzahlen(liste) {
    return Array.isArray(liste) && liste.length > 0 && liste.every(Number.isInteger);
  }

  // Liefert höchstens fünf Meldungen, die erste Zeile nennt das Grundproblem.
  function fragePruefen(f, nr, ids) {
    var ort = K.t("fragen.ortFrage", { nr: nr });
    if (typeof f !== "object" || f === null) return [K.t("fragen.fehlerFrage", { ort: ort })];
    var probleme = [];
    if (!istText(f.id)) probleme.push(K.t("fragen.fehlerId", { ort: ort }));
    else if (ids[f.id]) probleme.push(K.t("fragen.fehlerDoppelt", { ort: ort, id: f.id }));
    else ids[f.id] = true;
    if (TYPEN.indexOf(f.typ) === -1) probleme.push(K.t("fragen.fehlerTyp", { ort: ort }));
    if (!istText(f.frage)) probleme.push(K.t("fragen.fehlerText", { ort: ort }));
    if (!Array.isArray(f.antworten) || f.antworten.length === 0 || !f.antworten.every(istText)) {
      probleme.push(K.t("fragen.fehlerAntworten", { ort: ort }));
      return probleme;
    }
    var mehrere = f.typ === "mc" || f.typ === "mc-multi" || f.typ === "zahlenreihe";
    if (mehrere && f.antworten.length < 2) probleme.push(K.t("fragen.fehlerZuWenige", { ort: ort }));
    var imBereich =
      ganzzahlen(f.richtig) &&
      f.richtig.every(function (i) {
        return i >= 0 && i < f.antworten.length;
      });
    if (!imBereich) probleme.push(K.t("fragen.fehlerRichtig", { ort: ort }));
    else if (f.typ !== "mc-multi" && f.richtig.length !== 1) probleme.push(K.t("fragen.fehlerEineRichtig", { ort: ort }));
    if (f.erklaerung !== undefined && typeof f.erklaerung !== "string") probleme.push(K.t("fragen.fehlerErklaerung", { ort: ort }));
    return probleme;
  }

  function pruefen(o) {
    if (typeof o !== "object" || o === null || Array.isArray(o)) return [K.t("fragen.fehlerForm")];
    var probleme = [];
    if (!istText(o.kategorie)) probleme.push(K.t("fragen.fehlerKategorie"));
    if (o.sprache !== "de" && o.sprache !== "en") probleme.push(K.t("fragen.fehlerSprache"));
    if (!Array.isArray(o.fragen) || o.fragen.length === 0) return probleme.concat([K.t("fragen.fehlerKeineFragen")]);
    var ids = {};
    o.fragen.forEach(function (f, i) {
      probleme = probleme.concat(fragePruefen(f, i + 1, ids));
    });
    return probleme.slice(0, MAX_MELDUNGEN);
  }

  function lesen(bytes) {
    if (bytes.length > MAX_BYTES) throw K.Fehler("fragen.fehlerGross");
    var text = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
    try {
      return JSON.parse(text);
    } catch (e) {
      throw K.Fehler("fragen.fehlerJson");
    }
  }

  function dateiname(name) {
    var kern = String(name)
      .replace(/\.json$/i, "")
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .replace(/^-+|-+$/g, "");
    return (kern || "katalog") + ENDUNG;
  }

  // Mitgelieferte IDs sind global eindeutig, eigene erst zusammen mit dem Dateinamen.
  function eigenerKatalog(o, datei) {
    return Object.assign({}, o, {
      datei: datei,
      fragen: o.fragen.map(function (f) {
        return Object.assign({}, f, { kartenId: "eigen:" + datei + ":" + f.id });
      }),
    });
  }

  function mitgeliefert() {
    return (window.R42J_FRAGEN || []).map(function (o) {
      return Object.assign({}, o, {
        fragen: o.fragen.map(function (f) {
          return Object.assign({}, f, { kartenId: f.id });
        }),
      });
    });
  }

  var eigene = [];

  K.fragen = {
    KATEGORIEN: KATEGORIEN,

    pruefen: pruefen,

    // Eine kaputte Datei landet in `fehler`, alle anderen werden trotzdem geladen.
    laden: async function () {
      var griff = await ordner();
      var liste = (await K.fs.dateien(griff)).filter(function (d) {
        return d.name.toLowerCase().slice(-ENDUNG.length) === ENDUNG;
      });
      var fehler = [];
      var kataloge = [];
      for (var i = 0; i < liste.length; i++) {
        var name = liste[i].name;
        try {
          var o = lesen(await K.fs.lesen(griff, name));
          var probleme = pruefen(o);
          if (probleme.length) fehler.push({ datei: name, meldungen: probleme });
          else kataloge.push(eigenerKatalog(o, name));
        } catch (e) {
          fehler.push({ datei: name, meldungen: [K.fehlerText(e)] });
        }
      }
      eigene = kataloge;
      return { kataloge: kataloge, fehler: fehler };
    },

    // Prüft jede Datei für sich und speichert nur gültige.
    importieren: async function (dateien) {
      var griff = await ordner();
      var ergebnis = { gespeichert: [], fehler: [] };
      for (var i = 0; i < dateien.length; i++) {
        var d = dateien[i];
        try {
          var bytes = new Uint8Array(await d.arrayBuffer());
          var probleme = pruefen(lesen(bytes));
          if (probleme.length) {
            ergebnis.fehler.push({ datei: d.name, meldungen: probleme });
            continue;
          }
          var name = dateiname(d.name);
          await K.fs.schreibenAtomar(griff, name, bytes);
          ergebnis.gespeichert.push(name);
        } catch (e) {
          ergebnis.fehler.push({ datei: d.name, meldungen: [K.fehlerText(e)] });
        }
      }
      return ergebnis;
    },

    // Vergibt einen freien Dateinamen, damit nichts Vorhandenes überschrieben wird.
    speichern: async function (katalog, wunschname) {
      var griff = await ordner();
      var belegt = {};
      (await K.fs.dateien(griff)).forEach(function (d) {
        belegt[d.name.toLowerCase()] = true;
      });
      var basis = dateiname(wunschname).slice(0, -ENDUNG.length);
      var name = basis + ENDUNG;
      for (var nr = 2; belegt[name.toLowerCase()]; nr++) name = basis + "-" + nr + ENDUNG;
      await K.fs.schreibenAtomar(griff, name, new TextEncoder().encode(JSON.stringify(katalog, null, 2)));
      return name;
    },

    entfernen: async function (datei) {
      await K.fs.loeschen(await ordner(), datei);
    },

    kataloge: function () {
      return mitgeliefert().concat(eigene);
    },

    eigene: function () {
      return eigene;
    },

    // Fragen aller Kataloge einer Sprache, nach Kategorie gruppiert.
    gruppen: function (sprache) {
      var gruppen = {};
      K.fragen.kataloge().forEach(function (k) {
        if (k.sprache !== sprache) return;
        var g = gruppen[k.kategorie] || (gruppen[k.kategorie] = { kategorie: k.kategorie, fragen: [] });
        g.fragen = g.fragen.concat(k.fragen);
      });
      return Object.keys(gruppen)
        .sort(function (a, b) {
          var x = KATEGORIEN.indexOf(a);
          var y = KATEGORIEN.indexOf(b);
          return (x === -1 ? KATEGORIEN.length : x) - (y === -1 ? KATEGORIEN.length : y) || a.localeCompare(b);
        })
        .map(function (k) {
          return gruppen[k];
        });
    },

    kategorieName: function (kategorie) {
      return KATEGORIEN.indexOf(kategorie) > -1 ? K.t("vorbereitung.kategorie." + kategorie) : kategorie;
    },

    starFragen: function (sprache) {
      var alle = [];
      K.fragen.gruppen(sprache).forEach(function (g) {
        alle = alle.concat(
          g.fragen.filter(function (f) {
            return f.star;
          }),
        );
      });
      return alle;
    },

    // Erfolge nach Treffern der Stichworte. Ohne Treffer bleiben die ersten als Anregung.
    erfolgeZu: function (frage) {
      var d = K.tresor.daten();
      var stichworte = (frage.stichworte || []).map(K.normalisieren);
      function text(e) {
        var namen = (e.kompetenzen || []).map(function (id) {
          var k = d.kompetenzen.filter(function (x) {
            return x.id === id;
          })[0];
          return k ? [K.i18nText(k.name)].concat(k.synonyme || []).join(" ") : "";
        });
        return K.normalisieren(
          ["situation", "aufgabe", "aktion", "ergebnis"]
            .map(function (f) {
              return K.i18nText(e[f]);
            })
            .concat(namen)
            .join(" "),
        );
      }
      var bewertet = d.erfolge.map(function (e, i) {
        var t = text(e);
        var treffer = stichworte.filter(function (w) {
          return t.indexOf(w) > -1;
        }).length;
        return { erfolg: e, treffer: treffer, nr: i };
      });
      bewertet.sort(function (a, b) {
        return b.treffer - a.treffer || a.nr - b.nr;
      });
      return bewertet.slice(0, VORSCHLAEGE);
    },

    starSpeichern: function (eintrag) {
      K.tresor.aendern(function (t) {
        t.starTraining = t.starTraining || [];
        t.starTraining.push(Object.assign({ id: K.uuid(), am: new Date().toISOString() }, eintrag));
      });
    },

    starVerlauf: function () {
      return K.tresor.daten().starTraining || [];
    },

    starLoeschen: function (id) {
      K.tresor.aendern(function (t) {
        t.starTraining = (t.starTraining || []).filter(function (e) {
          return e.id !== id;
        });
      });
    },

    unternehmensfragen: function (b) {
      return b.unternehmensfragen || [];
    },

    // Prüft eine KI-Antwort auf Dubletten gegen die vorhandenen Fragen der Bewerbung.
    unternehmenVorschau: function (b, eingang) {
      var gesehen = {};
      K.fragen.unternehmensfragen(b).forEach(function (f) {
        gesehen[K.normalisieren(f.frage)] = true;
      });
      var neu = [];
      eingang.forEach(function (f) {
        var schluessel = K.normalisieren(f.frage);
        if (gesehen[schluessel]) return;
        gesehen[schluessel] = true;
        neu.push({
          id: K.uuid(),
          typ: "karte",
          frage: f.frage.trim(),
          antworten: [f.antwort.trim()],
          richtig: [0],
          erklaerung: (f.erklaerung || "").trim(),
        });
      });
      return { neu: neu, doppelt: eingang.length - neu.length };
    },

    unternehmenHinzufuegen: function (id, fragen) {
      K.bewerbungen.aendern(id, function (b) {
        b.unternehmensfragen = (b.unternehmensfragen || []).concat(fragen);
      });
    },

    unternehmenEntfernen: function (id, frageId) {
      K.bewerbungen.aendern(id, function (b) {
        b.unternehmensfragen = (b.unternehmensfragen || []).filter(function (f) {
          return f.id !== frageId;
        });
      });
      K.lernen.vergessen([frageId]);
    },
  };

  function zweistellig(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // Kalendertage in Ortszeit, sonst springt „morgen“ nachts über die Datumsgrenze von UTC.
  function tagText(d) {
    return d.getFullYear() + "-" + zweistellig(d.getMonth() + 1) + "-" + zweistellig(d.getDate());
  }

  function tagPlus(jetzt, tage) {
    return tagText(new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + tage));
  }

  function mischen(liste) {
    var kopie = liste.slice();
    for (var i = kopie.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = kopie[i];
      kopie[i] = kopie[j];
      kopie[j] = t;
    }
    return kopie;
  }

  function staende() {
    var karte = {};
    (K.tresor.daten().lernstand || []).forEach(function (l) {
      karte[l.kartenId] = l;
    });
    return karte;
  }

  K.lernen = {
    INTERVALLE: INTERVALLE,
    SITZUNG: SITZUNG,
    mischen: mischen,

    stand: function (kartenId) {
      return staende()[kartenId] || null;
    },

    // Gewusst: eine Box weiter. Nicht gewusst: zurück in Box 1, also morgen wieder.
    bewerten: function (kartenId, gewusst, jetzt) {
      var heute = jetzt || new Date();
      K.tresor.aendern(function (t) {
        var liste = t.lernstand;
        var l = liste.filter(function (x) {
          return x.kartenId === kartenId;
        })[0];
        if (!l) {
          l = { kartenId: kartenId, box: 1, faellig: "", richtig: 0, falsch: 0 };
          liste.push(l);
        }
        l.box = gewusst ? Math.min(l.box + 1, INTERVALLE.length) : 1;
        l.faellig = tagPlus(heute, INTERVALLE[l.box - 1]);
        if (gewusst) l.richtig += 1;
        else l.falsch += 1;
      });
    },

    // Überfällige zuerst, danach gemischt die neuen Karten.
    einteilen: function (fragen, jetzt) {
      var heute = tagText(jetzt || new Date());
      var stand = staende();
      var faellig = [];
      var neu = [];
      var gelernt = 0;
      var meister = 0;
      fragen.forEach(function (f) {
        var l = stand[f.kartenId];
        if (!l) return neu.push(f);
        gelernt += 1;
        if (l.box === INTERVALLE.length) meister += 1;
        if (l.faellig <= heute) faellig.push(f);
      });
      faellig.sort(function (a, b) {
        return stand[a.kartenId].faellig < stand[b.kartenId].faellig ? -1 : 1;
      });
      return { faellig: faellig, neu: neu, gelernt: gelernt, meister: meister, gesamt: fragen.length };
    },

    sitzung: function (fragen, jetzt) {
      var e = K.lernen.einteilen(fragen, jetzt);
      return e.faellig.concat(mischen(e.neu)).slice(0, SITZUNG);
    },

    vergessen: function (kartenIds) {
      if (!kartenIds.length) return;
      K.tresor.aendern(function (t) {
        t.lernstand = t.lernstand.filter(function (l) {
          return kartenIds.indexOf(l.kartenId) === -1;
        });
      });
    },
  };
})();
