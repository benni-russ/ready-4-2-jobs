(function () {
  "use strict";
  var K = window.R42J_CORE;

  // Welcher Bildschirm gerade gilt. Enthält nie Passwörter oder Tresorinhalte.
  K.ablauf = K.beobachtbar({ phase: "laden" });
  K.meldungen = K.beobachtbar({ liste: [] });

  var naechsteMeldung = 1;
  var MELDUNG_MS = 5000;

  K.meldung = function (text, art) {
    var id = naechsteMeldung++;
    K.meldungen.set({ liste: K.meldungen.get().liste.concat([{ id: id, text: text, art: art || "success" }]) });
    window.setTimeout(function () {
      K.meldungEntfernen(id);
    }, MELDUNG_MS);
  };

  K.meldungEntfernen = function (id) {
    K.meldungen.set({
      liste: K.meldungen.get().liste.filter(function (m) {
        return m.id !== id;
      }),
    });
  };

  function gehe(phase, zusatz) {
    K.ablauf.set(Object.assign({ phase: phase, fehler: null, eintrag: null, grund: null, name: null, schritt: null }, zusatz));
  }

  async function ordnerBereit(ordner) {
    K.profile.setzenOrdner(ordner);
    await K.wissen.kopieren(ordner);
    await K.fs.ordner(ordner, ["fragen"]);
    await K.profile.exportLeeren();
    gehe("profile");
  }

  K.ablaufStarten = async function () {
    var griff = await K.fs.gespeicherterOrdner();
    if (!griff) return gehe("ordner");
    try {
      var stand = await K.fs.berechtigung(griff, false);
      if (stand !== "granted") return gehe("zugriff");
      await ordnerBereit(griff);
    } catch (e) {
      gehe("ordner", { fehler: K.fehlerText(e) });
    }
  };

  K.ordnerWaehlen = async function () {
    try {
      var ordner = await K.fs.datenOrdnerWaehlen();
      if (ordner) await ordnerBereit(ordner);
    } catch (e) {
      gehe("ordner", { fehler: K.fehlerText(e) });
    }
  };

  K.zugriffErneuern = async function () {
    try {
      var griff = await K.fs.gespeicherterOrdner();
      if ((await K.fs.berechtigung(griff, true)) === "granted") await ordnerBereit(griff);
    } catch (e) {
      gehe("ordner", { fehler: K.fehlerText(e) });
    }
  };

  K.zuProfilen = function () {
    gehe("profile");
  };
  K.zurSperre = function (eintrag, grund, fehler) {
    gehe("sperre", { eintrag: eintrag, grund: grund, fehler: fehler || null });
  };
  K.zumSchluessel = function (eintrag) {
    gehe("schluessel", { eintrag: eintrag });
  };
  K.neuesProfil = function (name) {
    gehe("onboarding", { name: name, schritt: 1 });
  };
  K.zurApp = function () {
    gehe("app");
  };
  K.zumNeuenSchluessel = function () {
    gehe("schluesselNeu");
  };

  K.speichernVersuchen = function () {
    K.tresor.speichernJetzt().catch(function (e) {
      K.meldung(K.fehlerText(e), "danger");
    });
  };

  K.alteSicherungenEntfernen = async function (gewuenscht) {
    if (!gewuenscht) return;
    var r = await K.backup.alteEntfernen(K.tresor.eintrag());
    if (r.ziel2 === "kein-zugriff") K.meldung(K.t("backup.alteZiel2"), "danger");
  };

  // Die App verschwindet vor dem Sperren, damit nichts mehr auf gelöschte Daten zugreift.
  function sperrenMitWechsel() {
    gehe("sperrt");
    return K.tresor.sperren();
  }

  // Sperrt zuerst, damit der aktuelle Stand vor dem Ersetzen gesichert ist.
  K.wiederherstellen = async function (bytes) {
    K.backup.pruefen(bytes);
    if (!K.tresor.offen()) {
      return K.zurSperre(await K.backup.wiederherstellen(bytes, K.t("profile.wiederhergestellt")), "wiederhergestellt");
    }
    var ergebnis = await sperrenMitWechsel();
    try {
      K.zurSperre(await K.backup.wiederherstellen(bytes, K.t("profile.wiederhergestellt")), "wiederhergestellt");
    } catch (e) {
      K.zurSperre(ergebnis.eintrag, null, K.fehlerText(e));
    }
  };

  K.profilLoeschen = async function () {
    var ergebnis = await sperrenMitWechsel();
    try {
      await K.profile.entfernen(ergebnis.eintrag);
      K.zuProfilen();
    } catch (e) {
      K.zurSperre(ergebnis.eintrag, null, K.fehlerText(e));
    }
  };

  // Nach dem Entsperren: entweder das Onboarding fortsetzen oder die App zeigen.
  K.nachEntsperren = function () {
    var s = K.tresor.daten().einstellungen.onboardingSchritt;
    if (s) gehe("onboarding", { schritt: s });
    else gehe("app");
    var eintrag = K.tresor.eintrag();
    K.backup.faellig(eintrag).then(async function (faellig) {
      if (!faellig) return;
      var r = await K.backup.erstellen(eintrag, false);
      if (r.ziel2 === "kein-zugriff") K.meldung(K.t("backup.ziel2Fehlt"), "info");
    }).catch(function () {
      /* Das nächste Sperren versucht es erneut. */
    });
  };

  K.jetztSperren = async function (grund) {
    if (!K.tresor.offen()) return;
    var ergebnis = await sperrenMitWechsel();
    if (ergebnis) K.zurSperre(ergebnis.eintrag, grund, ergebnis.fehler ? K.fehlerText(ergebnis.fehler) : null);
  };
})();
