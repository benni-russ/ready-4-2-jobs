(function () {
  "use strict";
  var K = window.R42J_CORE;

  K.SCHEMA = 2;

  // Index = Schema, von dem aus migriert wird: SCHRITTE[1] macht aus Schema 1 Schema 2.
  var SCHRITTE = {
    1: function (t) {
      t.bewerbungen.forEach(function (b) {
        b.dokumente.postversand = false;
      });
      t.einstellungen.suchTaste = true;
      return t;
    },
  };

  K.neuerTresor = function (anzeigename) {
    var z = K.store.get();
    return {
      schema: K.SCHEMA,
      profil: {},
      ausrichtungen: [],
      stationen: [],
      erfolge: [],
      kompetenzen: [],
      zertifikate: [],
      sprachen: [],
      interessen: [],
      anlagen: [],
      bausteine: [],
      bewerbungen: [],
      gewichtung: { kriterien: [] },
      lernstand: [],
      starTraining: [],
      checklisten: {},
      einstellungen: {
        sprache: z.sprache,
        theme: z.theme,
        farbschema: z.farbschema,
        schriftgroesse: z.schriftgroesse,
        sperreMinuten: 10,
        feiertagsWochen: 2,
        rueckfrageTage: 14,
        updatePruefung: false,
        backupZiel2: false,
        kiPlatzhalter: true,
        suchTaste: true,
        seitenleisteEingeklappt: z.seitenleisteEingeklappt,
        anzeigename: anzeigename,
        onboardingSchritt: 4,
      },
    };
  };

  K.migrationNoetig = function (tresor) {
    return tresor.schema < K.SCHEMA;
  };

  // Läuft vor dem Laden. Das Backup erstellt der Aufrufer vorher.
  K.migrieren = function (tresor) {
    if (tresor.schema > K.SCHEMA) throw K.Fehler("fehler.neueresSchema");
    while (tresor.schema < K.SCHEMA) {
      tresor = SCHRITTE[tresor.schema](tresor);
      tresor.schema += 1;
    }
    return tresor;
  };
})();
