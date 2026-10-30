(function () {
  "use strict";
  var K = window.R42J_CORE;
  var kr = K.krypto;

  var SPEICHERN_NACH_MS = 2000;
  var DARSTELLUNG = ["sprache", "theme", "farbschema", "schriftgroesse", "seitenleisteEingeklappt"];

  // Nur im Speicher, nie im Store: Datenschlüssel, Kopf der Datei und entschlüsselter Inhalt.
  var dek = null;
  var kopf = null;
  var daten = null;
  var eintrag = null;
  var ungespeichert = false;
  var timer = null;
  var warteschlange = Promise.resolve();

  K.tresorStand = K.beobachtbar({ offen: false, version: 0 });

  function melden() {
    K.tresorStand.set({ offen: !!dek, version: K.tresorStand.get().version + 1 });
  }

  function dateiGueltig(bytes) {
    try {
      return JSON.parse(new TextDecoder().decode(bytes)).format === "r42j-vault";
    } catch (e) {
      return false;
    }
  }

  async function kopfLesen(e) {
    var ordner = await K.profile.ordner(e);
    var bytes = await K.fs.lesenMitRettung(ordner, K.DATEI_TRESOR, dateiGueltig);
    if (!bytes) throw K.Fehler("fehler.tresorDefekt");
    var inhalt = JSON.parse(new TextDecoder().decode(bytes));
    if (inhalt.v !== 1) throw K.Fehler("fehler.neueresSchema");
    return inhalt;
  }

  async function schreiben() {
    var klar = new TextEncoder().encode(JSON.stringify(daten));
    var verschluesselt = await kr.verschluesseln(dek, klar);
    var neu = Object.assign({}, kopf, { iv: kr.zuB64(verschluesselt.iv), data: kr.zuB64(verschluesselt.inhalt) });
    var ordner = await K.profile.ordner(eintrag);
    await K.fs.schreibenAtomar(ordner, K.DATEI_TRESOR, new TextEncoder().encode(JSON.stringify(neu)));
    kopf = neu;
  }

  function einreihen(aufgabe) {
    var lauf = warteschlange.then(aufgabe);
    warteschlange = lauf.catch(function () {});
    return lauf;
  }

  function speichern() {
    return einreihen(async function () {
      if (!dek || !ungespeichert) return;
      ungespeichert = false;
      try {
        await schreiben();
      } catch (e) {
        ungespeichert = true;
        throw e;
      }
    });
  }

  function vormerken() {
    ungespeichert = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      speichern().catch(function (e) {
        K.meldung(K.fehlerText(e), "danger");
      });
    }, SPEICHERN_NACH_MS);
  }

  async function laden(e, schluessel, inhalt) {
    var klar = await kr.entschluesseln(schluessel, kr.ausB64(inhalt.iv), kr.ausB64(inhalt.data));
    var tresor = JSON.parse(new TextDecoder().decode(klar));
    if (tresor.schema > K.SCHEMA) throw K.Fehler("fehler.neueresSchema");
    var migrieren = K.migrationNoetig(tresor);
    if (migrieren) {
      await K.backup.erstellen(e, false);
      tresor = K.migrieren(tresor);
    }
    dek = schluessel;
    kopf = inhalt;
    daten = tresor;
    eintrag = e;
    ungespeichert = migrieren;
    if (migrieren) await speichern();
    K.store.set(darstellungAus(tresor.einstellungen));
    if (tresor.einstellungen.anzeigename !== e.name) {
      eintrag = Object.assign({}, e, { name: tresor.einstellungen.anzeigename });
      await K.profile.umbenennen(e.id, eintrag.name);
    }
    melden();
  }

  function darstellungAus(einstellungen) {
    var teil = {};
    DARSTELLUNG.forEach(function (k) {
      teil[k] = einstellungen[k];
    });
    return teil;
  }

  // Darstellung liegt auch im localStorage, weil sie schon vor dem Entsperren gelten muss.
  K.store.subscribe(function (z) {
    if (!dek) return;
    var e = daten.einstellungen;
    var geaendert = DARSTELLUNG.some(function (k) {
      return e[k] !== z[k];
    });
    if (!geaendert) return;
    DARSTELLUNG.forEach(function (k) {
      e[k] = z[k];
    });
    vormerken();
  });

  K.tresor = {
    offen: function () {
      return !!dek;
    },
    eintrag: function () {
      return eintrag;
    },
    daten: function () {
      return daten;
    },

    aendern: function (aufgabe) {
      aufgabe(daten);
      vormerken();
      melden();
    },

    speichernJetzt: function () {
      window.clearTimeout(timer);
      return speichern();
    },

    hatUngespeichertes: function () {
      return ungespeichert;
    },

    // Der Datenschlüssel wird genau hier erzeugt und danach nicht extrahierbar geladen.
    erstellen: async function (name, passwort, bloecke) {
      var e = { id: window.crypto.randomUUID(), name: name, datei: K.DATEI_TRESOR };
      var kdf = kr.kdfNeu();
      var huellePw = await kr.ausPasswort(passwort, kdf);
      var huelleCode = await kr.ausCode(bloecke.join(""));
      var roh = await kr.neuerDatenschluessel();
      var wrapped = { pw: await kr.verpacken(roh, huellePw), recovery: await kr.verpacken(roh, huelleCode) };
      var schluessel = await kr.auspacken(wrapped.pw, huellePw, false);

      await K.profile.ordner(e, ["anlagen"]);
      await K.profile.ordner(e, ["backups"]);
      dek = schluessel;
      kopf = { format: "r42j-vault", v: 1, kdf: kdf, wrapped: wrapped };
      daten = K.neuerTresor(name);
      eintrag = e;
      ungespeichert = true;
      await speichern();
      await K.profile.hinzufuegen(e);
      melden();
      return e;
    },

    oeffnenMitPasswort: async function (e, passwort) {
      var inhalt = await kopfLesen(e);
      var schluessel;
      try {
        var huelle = await kr.ausPasswort(passwort, inhalt.kdf);
        schluessel = await kr.auspacken(inhalt.wrapped.pw, huelle, false);
      } catch (fehler) {
        throw K.Fehler("fehler.passwortFalsch");
      }
      await laden(e, schluessel, inhalt);
    },

    // Wer das Passwort vergessen hat, legt beim Entsperren gleich ein neues fest.
    oeffnenMitCode: async function (e, code, neuesPasswort) {
      var inhalt = await kopfLesen(e);
      var huelle = await kr.ausCode(code);
      var roh;
      try {
        roh = await kr.auspacken(inhalt.wrapped.recovery, huelle, true);
      } catch (fehler) {
        throw K.Fehler("fehler.schluesselFalsch");
      }
      var kdf = kr.kdfNeu();
      var huellePw = await kr.ausPasswort(neuesPasswort, kdf);
      var wrappedPw = await kr.verpacken(roh, huellePw);
      inhalt = Object.assign({}, inhalt, { kdf: kdf, wrapped: { pw: wrappedPw, recovery: inhalt.wrapped.recovery } });
      await K.fs.schreibenAtomar(await K.profile.ordner(e), K.DATEI_TRESOR, new TextEncoder().encode(JSON.stringify(inhalt)));
      await laden(e, await kr.auspacken(wrappedPw, huellePw, false), inhalt);
    },

    pruefenPasswort: async function (passwort) {
      try {
        var huelle = await kr.ausPasswort(passwort, kopf.kdf);
        return await kr.auspacken(kopf.wrapped.pw, huelle, true);
      } catch (e) {
        throw K.Fehler("fehler.passwortFalsch");
      }
    },

    // Nur der Datenschlüssel wird neu verpackt, die Daten selbst bleiben unverändert.
    passwortAendern: async function (alt, neu) {
      var roh = await K.tresor.pruefenPasswort(alt);
      var kdf = kr.kdfNeu();
      var wrappedPw = await kr.verpacken(roh, await kr.ausPasswort(neu, kdf));
      return einreihen(async function () {
        kopf = Object.assign({}, kopf, { kdf: kdf, wrapped: { pw: wrappedPw, recovery: kopf.wrapped.recovery } });
        await schreiben();
      });
    },

    codeErneuern: async function (passwort, bloecke) {
      var roh = await K.tresor.pruefenPasswort(passwort);
      var recovery = await kr.verpacken(roh, await kr.ausCode(bloecke.join("")));
      return einreihen(async function () {
        kopf = Object.assign({}, kopf, { wrapped: { pw: kopf.wrapped.pw, recovery: recovery } });
        await schreiben();
      });
    },

    // Der Datenschlüssel verschwindet auch dann, wenn das letzte Speichern scheitert.
    sperren: async function () {
      if (!dek) return null;
      window.clearTimeout(timer);
      var e = eintrag;
      var fehler = null;
      try {
        await speichern();
      } catch (x) {
        fehler = x;
      }
      dek = null;
      kopf = null;
      daten = null;
      eintrag = null;
      ungespeichert = false;
      melden();
      try {
        if (!fehler && (await K.backup.faellig(e))) await K.backup.erstellen(e, false);
        await K.profile.exportLeeren();
      } catch (x) {
        fehler = fehler || x;
      }
      return { eintrag: e, fehler: fehler };
    },
  };

  window.addEventListener("beforeunload", function (e) {
    if (ungespeichert) e.preventDefault();
  });
})();
