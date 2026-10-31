(function () {
  "use strict";
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var START = "uebersicht";

  function lesen() {
    var teile = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    return { seite: teile[0] || START, teile: teile.slice(1) };
  }

  K.navigieren = function (pfad) {
    window.location.hash = "#/" + pfad;
  };

  // Ein offenes Formular meldet hier seinen Entwurf. Solange die Prüfung wahr liefert, fragt jeder Seitenwechsel nach.
  var pruefung = null;
  var sichern = null;
  var bestaetigt = window.location.hash;

  K.verlassenFrage = K.beobachtbar({ ziel: null });

  K.verlassenSchutz = {
    setzen: function (f, entwurfSichern) {
      pruefung = f;
      sichern = entwurfSichern;
    },
    loesen: function (f) {
      if (pruefung === f) {
        pruefung = null;
        sichern = null;
      }
    },
    // Vor dem Sperren: Der Entwurf wandert in den Tresor, statt beim Sperren still verloren zu gehen.
    entwurfSichern: function () {
      if (pruefung && pruefung() && sichern) sichern();
    },
    aktiv: function () {
      return !!pruefung && pruefung();
    },
    verwerfen: function () {
      var ziel = K.verlassenFrage.get().ziel;
      pruefung = null;
      K.verlassenFrage.set({ ziel: null });
      if (ziel !== null) window.location.hash = ziel;
    },
    bleiben: function () {
      K.verlassenFrage.set({ ziel: null });
    },
  };

  K.useRoute = function () {
    var paar = hooks.useState(lesen);
    hooks.useEffect(function () {
      bestaetigt = window.location.hash;
      function wechsel() {
        var neu = window.location.hash;
        if (neu === bestaetigt) return;
        if (K.verlassenSchutz.aktiv()) {
          K.verlassenFrage.set({ ziel: neu });
          // Auch Browser-Zurück landet hier. replace erzeugt keinen neuen Verlaufseintrag und löst keine Rückfrage aus.
          window.location.replace(bestaetigt || "#/");
          bestaetigt = window.location.hash;
          return;
        }
        bestaetigt = neu;
        paar[1](lesen());
      }
      window.addEventListener("hashchange", wechsel);
      // Der Hash kann sich zwischen erstem Zeichnen und diesem Effekt geändert haben.
      if (JSON.stringify(lesen()) !== JSON.stringify(paar[0])) paar[1](lesen());
      return function () {
        window.removeEventListener("hashchange", wechsel);
      };
    }, []);
    return paar[0];
  };
})();
