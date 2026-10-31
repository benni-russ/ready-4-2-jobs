(function () {
  "use strict";
  var K = window.R42J_CORE;

  var ADRESSE = "https://api.github.com/repos/benni-russ/ready-4-2-jobs/releases/latest";
  var DOWNLOAD = "https://github.com/benni-russ/ready-4-2-jobs/releases/download/v";
  var VERSION = /^v?(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;
  var ZEITLIMIT = 10000;

  function teile(v) {
    var m = VERSION.exec(String(v));
    return m && [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  function neuer(a, b) {
    var x = teile(a);
    var y = teile(b);
    if (!x || !y) return false;
    for (var i = 0; i < 3; i++) {
      if (x[i] !== y[i]) return x[i] > y[i];
    }
    return false;
  }

  function heute(jetzt) {
    var d = jetzt || new Date();
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");
  }

  // Liest nur die Versionsnummer. Der Link entsteht hier, nicht aus der Antwort.
  async function abrufen() {
    var abbruch = new AbortController();
    var timer = window.setTimeout(function () {
      abbruch.abort();
    }, ZEITLIMIT);
    try {
      var antwort = await window.fetch(ADRESSE, {
        headers: { Accept: "application/vnd.github+json" },
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        signal: abbruch.signal,
      });
      if (!antwort.ok) throw K.Fehler("update.fehler");
      var inhalt = await antwort.json();
      var m = teile(inhalt.tag_name);
      if (!m) throw K.Fehler("update.fehler");
      return m.join(".");
    } catch (e) {
      throw K.Fehler("update.fehler");
    } finally {
      window.clearTimeout(timer);
    }
  }

  function erlaubt() {
    return K.tresor.offen() && K.tresor.daten().einstellungen.updatePruefung === true;
  }

  K.update = {
    neuer: neuer,

    // Vorhandene neuere Version oder null. Eine ausgeblendete Version bleibt verborgen.
    hinweis: function () {
      var s = K.store.get().updateStand;
      if (!erlaubt() || !s || !neuer(s.version, window.R42J_VERSION) || s.ausgeblendet === s.version) return null;
      return { version: s.version, zip: DOWNLOAD + s.version + "/r42j-v" + s.version + ".zip" };
    },

    ausblenden: function () {
      var s = K.store.get().updateStand;
      K.store.set({ updateStand: Object.assign({}, s, { ausgeblendet: s.version }) });
    },

    // Klick in den Einstellungen. Wirft bei Fehlern, damit die Seite sie anzeigen kann.
    pruefen: async function (jetzt) {
      if (!erlaubt()) return null;
      var version = await abrufen();
      var alt = K.store.get().updateStand || {};
      K.store.set({ updateStand: { am: heute(jetzt), version: version, ausgeblendet: alt.ausgeblendet } });
      return version;
    },

    // Beim Start höchstens einmal am Tag. Ohne Netz bleibt die App still.
    beimStart: function (jetzt) {
      var s = K.store.get().updateStand;
      if (!erlaubt() || (s && s.am === heute(jetzt))) return Promise.resolve(null);
      return K.update.pruefen(jetzt).catch(function () {
        return null;
      });
    },
  };
})();
