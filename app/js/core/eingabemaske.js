(function () {
  "use strict";
  var K = window.R42J_CORE;

  var TRENNER = /[.\/\-, ]/;
  var FREMD = /[^\d.\/\-, ]/;

  // Teilt in Abschnitte fester Länge. Ein getippter Trenner beendet den Abschnitt früher,
  // „1.1.2027“ bleibt also möglich und spätere Abschnitte rutschen beim Löschen nicht nach.
  function zerlegen(text, laengen) {
    var teile = [""];
    var i = 0;
    for (var n = 0; n < text.length; n++) {
      var z = text.charAt(n);
      if (/\d/.test(z)) {
        if (teile[i].length === laengen[i]) {
          if (i === laengen.length - 1) return { teile: teile, zuViel: true };
          teile[++i] = "";
        }
        teile[i] += z;
      } else if (TRENNER.test(z) && i < laengen.length - 1) {
        teile[++i] = "";
      }
    }
    return { teile: teile, zuViel: false };
  }

  function ziffernVor(text, pos) {
    return text.slice(0, pos).replace(/\D/g, "").length;
  }

  // Der Cursor folgt den Ziffern. Über einen Trenner springt er nur nach einem vollen Abschnitt.
  function position(text, ziffern, ueberTrenner, laengen) {
    var p = 0;
    for (var n = 0; p < text.length && n < ziffern; p++) {
      if (/\d/.test(text.charAt(p))) n++;
    }
    var teile = text.slice(0, p).split(TRENNER);
    var voll = teile[teile.length - 1].length === laengen[teile.length - 1];
    return ueberTrenner && voll && TRENNER.test(text.charAt(p)) ? p + 1 : p;
  }

  function maskieren(e, laengen, trenner) {
    var geloescht = e.art.indexOf("delete") === 0;
    // Einfügen, Ziehen und Autovervollständigen bringen mehrere Zeichen auf einmal.
    var eingefuegt = !geloescht && (e.wert.length - e.vorher.length > 1 || e.art === "insertFromPaste" || e.art === "insertFromDrop");
    var roh = eingefuegt ? e.wert.trim() : e.wert;
    var cursor = eingefuegt ? roh.length : e.cursor;
    if (!geloescht && !eingefuegt && TRENNER.test(roh.charAt(cursor - 1))) {
      var doppelt = cursor === 1 || TRENNER.test(roh.charAt(cursor - 2)) || TRENNER.test(roh.charAt(cursor));
      if (doppelt) return { wert: e.vorher, cursor: TRENNER.test(e.vorher.charAt(cursor - 1)) ? cursor : cursor - 1 };
    }
    var z = zerlegen(roh, laengen);
    // Nicht deutbar: unverändert lassen, beim Verlassen meldet das Feld den Fehler.
    if (eingefuegt && (z.zuViel || FREMD.test(roh))) return { wert: roh, cursor: cursor };
    if (z.zuViel && !geloescht) return { wert: e.vorher, cursor: Math.max(0, cursor - 1) };
    var teile = z.teile;
    var i = teile.length - 1;
    if (!geloescht && cursor >= roh.length && i < laengen.length - 1 && teile[i].length === laengen[i]) teile = teile.concat([""]);
    var wert = teile.join(trenner);
    if (eingefuegt) return { wert: wert, cursor: wert.length };
    if (wert === roh && (geloescht || TRENNER.test(roh.charAt(cursor - 1)))) return { wert: wert, cursor: cursor };
    return { wert: wert, cursor: position(wert, ziffernVor(roh, cursor), e.art !== "deleteContentBackward", laengen) };
  }

  // e: { wert, cursor, vorher, art }. Antwort: { wert, cursor }.
  K.maskeDatum = function (e) {
    var iso = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(e.wert);
    var trenner = K.sprache() === "de" ? "." : "/";
    if (iso) {
      var neu = [iso[3], iso[2], iso[1]].join(trenner);
      return { wert: neu, cursor: neu.length };
    }
    return maskieren(e, [2, 2, 4], trenner);
  };

  // Eine reine Jahreszahl bleibt erlaubt: Beginnt die Eingabe über 12, ist sie kein Monat.
  K.maskeMonat = function (e) {
    var nurZiffern = !TRENNER.test(e.wert);
    return maskieren(e, nurZiffern && +e.wert.replace(/\D/g, "").slice(0, 2) > 12 ? [4] : [2, 4], "/");
  };

  // Schreibt nur bei einer Änderung ins Feld, sonst bliebe vom Rückgängig-Verlauf nichts.
  K.maskeAnwenden = function (feld, art, vorher, maske) {
    var erg = maske({ wert: feld.value, cursor: feld.selectionStart, vorher: vorher, art: art || "" });
    if (erg.wert !== feld.value) feld.value = erg.wert;
    feld.setSelectionRange(erg.cursor, erg.cursor);
    return erg.wert;
  };
})();
