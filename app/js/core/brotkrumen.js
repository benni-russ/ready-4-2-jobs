(function () {
  "use strict";
  var K = window.R42J_CORE;

  function krume(text, ziel) {
    return ziel ? { text: text, ziel: ziel } : { text: text };
  }

  function bewerbung(teile) {
    if (teile[0] === "neu") return [krume(K.t("bewerbung.neu"))];
    var b = K.bewerbungen.holen(teile[0]);
    if (!b) return [];
    var pfad = "bewerbungen/" + b.id;
    var reiter = teile[1] || "stelle";
    return [krume(b.firma.name, pfad), krume(K.t("bewerbung.reiter." + reiter))];
  }

  function stammdaten(teile) {
    var bereich = teile[0];
    if (!bereich) return [];
    if (bereich === "import" || bereich === "interview" || bereich === "uebersetzen") return [krume(K.t(bereich + ".titel"))];
    return [krume(K.t("stammdaten." + bereich))];
  }

  function vergleich(teile) {
    if (teile[0] !== "angebot" || !teile[1]) return [];
    var b = K.bewerbungen.holen(teile[1]);
    return b ? [krume(b.firma.name)] : [];
  }

  function vorbereitung(teile) {
    return teile[0] ? [krume(K.t("vorbereitung.reiter." + teile[0]))] : [];
  }

  // Der Artikeltitel ist erst nach dem Laden bekannt, das Modul meldet ihn über K.brotkrumenTitel.
  K.brotkrumenTitel = K.beobachtbar({ titel: "" });

  function wissen(teile) {
    return teile[0] ? [krume(K.brotkrumenTitel.get().titel || K.t("wissen.artikel"))] : [];
  }

  var UNTERSEITEN = {
    bewerbungen: bewerbung,
    stammdaten: stammdaten,
    vergleich: vergleich,
    vorbereitung: vorbereitung,
    wissen: wissen,
  };

  // Liefert den Weg von der Übersicht zur aktuellen Seite. Der letzte Eintrag hat kein Ziel.
  K.brotkrumen = function (route) {
    if (route.seite === "uebersicht" || route.seite === "komponenten") return [];
    var oben = route.seite === "lebenslauf" ? [krume(K.t("nav.stammdaten"), "stammdaten")] : [];
    var unter = UNTERSEITEN[route.seite] ? UNTERSEITEN[route.seite](route.teile) : [];
    var seite = krume(K.t("nav." + route.seite), unter.length ? route.seite : null);
    return [krume(K.t("nav.uebersicht"), "uebersicht")].concat(oben, [seite], unter);
  };
})();
