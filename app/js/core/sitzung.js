(function () {
  "use strict";
  var K = window.R42J_CORE;
  var kr = K.krypto;

  // Neuladen soll nicht abmelden, ein geschlossener Tab oder eine Sperre aber schon (SPEC §4.2).
  // Browser stellen geschlossene Tabs samt sessionStorage wieder her. Deshalb zählt nur ein echtes Neuladen, und auch das nur kurz.
  // Der Datenschlüssel liegt nur verpackt im sessionStorage dieses Tabs. Die Hülle ist nicht extrahierbar und liegt in IndexedDB.
  // Erst beide zusammen öffnen den Tresor; das Passwort wird nie gemerkt.
  var NAME = "r42j.sitzung";
  var SCHLUESSEL_HUELLE = "sitzungHuelle";
  var MAX_PAUSE_MS = 30 * 1000;

  function lesen() {
    try {
      return JSON.parse(window.sessionStorage.getItem(NAME));
    } catch (e) {
      return null;
    }
  }

  function neuGeladen() {
    var n = window.performance.getEntriesByType("navigation")[0];
    return !!n && n.type === "reload";
  }

  function vergessen() {
    try {
      window.sessionStorage.removeItem(NAME);
    } catch (e) {
      /* Ohne sessionStorage gibt es nichts zu löschen. */
    }
    return K.fs.griffLoeschen(SCHLUESSEL_HUELLE).catch(function () {});
  }

  K.sitzung = {
    vergessen: vergessen,

    // Scheitert das Merken, bleibt nur der bisherige Ablauf: Nach dem Neuladen fragt R42J wieder nach dem Passwort.
    merken: async function (profilId, schluesselExtrahierbar) {
      try {
        var huelle = await kr.neueSitzungsHuelle();
        var verpackt = await kr.verpacken(schluesselExtrahierbar, huelle);
        await K.fs.griffSchreiben(SCHLUESSEL_HUELLE, huelle);
        window.sessionStorage.setItem(NAME, JSON.stringify({ id: profilId, verpackt: verpackt, zuletzt: Date.now() }));
      } catch (e) {
        await vergessen();
      }
    },

    // Liefert { id, schluessel } oder null. Alles außer einem frischen Neuladen zählt wie eine Sperre.
    fortsetzen: async function () {
      var s = lesen();
      if (!s) return null;
      if (!neuGeladen() || Date.now() - s.zuletzt > MAX_PAUSE_MS) {
        await vergessen();
        return null;
      }
      try {
        var huelle = await K.fs.griffLesen(SCHLUESSEL_HUELLE);
        return { id: s.id, schluessel: await kr.auspacken(s.verpackt, huelle, false) };
      } catch (e) {
        await vergessen();
        return null;
      }
    },
  };

  window.addEventListener("pagehide", function () {
    var s = lesen();
    if (!s) return;
    s.zuletzt = Date.now();
    window.sessionStorage.setItem(NAME, JSON.stringify(s));
  });
})();
