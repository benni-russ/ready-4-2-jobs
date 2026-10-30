(function () {
  "use strict";
  var K = window.R42J_CORE;

  var DATEI = "profile.json";
  var datenOrdner = null;

  K.DATEI_TRESOR = "tresor.r42j";

  function zuBytes(liste) {
    return new TextEncoder().encode(JSON.stringify({ v: 1, profile: liste }, null, 2));
  }

  function auslesen(bytes) {
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function gueltig(bytes) {
    try {
      return Array.isArray(auslesen(bytes).profile);
    } catch (e) {
      return false;
    }
  }

  async function schreiben(liste) {
    await K.fs.schreibenAtomar(datenOrdner, DATEI, zuBytes(liste));
  }

  K.initialen = function (name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (t) {
      return t[0].toUpperCase();
    }).join("");
  };

  K.profile = {
    setzenOrdner: function (ordner) {
      datenOrdner = ordner;
    },
    datenOrdner: function () {
      return datenOrdner;
    },

    // Unverschlüsselt: nur id, Anzeigename und Dateiname (SPEC §3).
    liste: async function () {
      var bytes = await K.fs.lesenMitRettung(datenOrdner, DATEI, gueltig);
      return bytes ? auslesen(bytes).profile : [];
    },

    // Keine zusätzliche Klartext-Angabe: „zuletzt“ kommt aus der Dateizeit.
    listeMitZeit: async function () {
      var liste = await K.profile.liste();
      return Promise.all(
        liste.map(async function (e) {
          var zuletzt = null;
          try {
            zuletzt = await K.fs.aenderungszeit(await K.profile.ordner(e), K.DATEI_TRESOR);
          } catch (fehler) {
            zuletzt = null;
          }
          return Object.assign({}, e, { zuletzt: zuletzt });
        }),
      );
    },

    ordner: function (eintrag, teile) {
      return K.fs.ordner(datenOrdner, [eintrag.id].concat(teile || []));
    },

    hinzufuegen: async function (eintrag) {
      var liste = (await K.profile.liste()).filter(function (e) {
        return e.id !== eintrag.id;
      });
      liste.push(eintrag);
      await schreiben(liste);
    },

    umbenennen: async function (id, name) {
      var liste = await K.profile.liste();
      await schreiben(
        liste.map(function (e) {
          return e.id === id ? Object.assign({}, e, { name: name }) : e;
        }),
      );
    },

    entfernen: async function (eintrag) {
      await K.fs.loeschen(datenOrdner, eintrag.id, true);
      var liste = await K.profile.liste();
      await schreiben(
        liste.filter(function (e) {
          return e.id !== eintrag.id;
        }),
      );
      await K.fs.griffLoeschen("ziel2:" + eintrag.id);
    },

    // Klartext für den Moment: Beim Start und beim Sperren wird der Ordner geleert (SPEC §4.5).
    exportSchreiben: async function (name, bytes) {
      await K.fs.schreibenAtomar(await K.fs.ordner(datenOrdner, ["export"]), name, bytes);
    },

    exportLeeren: async function () {
      await K.fs.leeren(await K.fs.ordner(datenOrdner, ["export"]));
    },
  };
})();
