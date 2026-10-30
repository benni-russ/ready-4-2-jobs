(function () {
  "use strict";
  var K = window.R42J_CORE;

  // Einziger Zugriff auf Nutzerdateien. Ein Wechsel der Technik betrifft nur dieses Modul.
  var DB_NAME = "r42j";
  var DB_STORE = "griffe";
  var SCHLUESSEL_ORDNER = "ordner";

  K.Fehler = function (schluessel) {
    var e = new Error(schluessel);
    e.schluessel = schluessel;
    return e;
  };

  // Klartext für die Oberfläche. Technische Details bleiben absichtlich draußen.
  K.fehlerText = function (e) {
    return K.t((e && e.schluessel) || "fehler.unbekannt");
  };

  function uebersetzen(e) {
    if (e && e.schluessel) return e;
    var name = e && e.name;
    if (name === "NotFoundError") return K.Fehler("fehler.nichtGefunden");
    if (name === "NotAllowedError" || name === "SecurityError") return K.Fehler("fehler.keinZugriff");
    if (name === "QuotaExceededError" || name === "NoModificationAllowedError") return K.Fehler("fehler.schreiben");
    return K.Fehler("fehler.unbekannt");
  }

  async function sicher(aufgabe) {
    try {
      return await aufgabe();
    } catch (e) {
      throw uebersetzen(e);
    }
  }

  function dbOeffnen() {
    return new Promise(function (ok, nein) {
      var r = window.indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () {
        r.result.createObjectStore(DB_STORE);
      };
      r.onsuccess = function () {
        ok(r.result);
      };
      r.onerror = function () {
        nein(r.error);
      };
    });
  }

  async function dbAufgabe(modus, aufgabe) {
    var db = await dbOeffnen();
    return new Promise(function (ok, nein) {
      var tx = db.transaction(DB_STORE, modus);
      var r = aufgabe(tx.objectStore(DB_STORE));
      tx.oncomplete = function () {
        db.close();
        ok(r.result);
      };
      tx.onerror = function () {
        db.close();
        nein(tx.error);
      };
    });
  }

  function griffLesen(schluessel) {
    return dbAufgabe("readonly", function (s) {
      return s.get(schluessel);
    });
  }
  function griffSchreiben(schluessel, griff) {
    return dbAufgabe("readwrite", function (s) {
      return s.put(griff, schluessel);
    });
  }
  function griffLoeschen(schluessel) {
    return dbAufgabe("readwrite", function (s) {
      return s.delete(schluessel);
    });
  }

  async function istOrdnerMitDatei(griff, ordner, datei) {
    try {
      var sub = await griff.getDirectoryHandle(ordner);
      await sub.getFileHandle(datei);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Gewählt wird der R42J-Ordner mit `app/` oder direkt `daten/`. Nach `app/` schreibt der Code nie.
  async function datenOrdnerAus(griff) {
    if (griff.name === "daten") return griff;
    if (await istOrdnerMitDatei(griff, "app", "version.js")) {
      return griff.getDirectoryHandle("daten", { create: true });
    }
    throw K.Fehler("fehler.falscherOrdner");
  }

  async function berechtigung(griff, anfragen) {
    var opt = { mode: "readwrite" };
    var s = await griff.queryPermission(opt);
    if (s === "granted" || !anfragen) return s;
    return griff.requestPermission(opt);
  }

  async function ordnerWaehlen(start) {
    try {
      return await window.showDirectoryPicker({ mode: "readwrite", startIn: start });
    } catch (e) {
      if (e && e.name === "AbortError") return null;
      throw uebersetzen(e);
    }
  }

  async function unterordner(basis, teile, anlegen) {
    var d = basis;
    for (var i = 0; i < teile.length; i++) {
      d = await d.getDirectoryHandle(teile[i], { create: !!anlegen });
    }
    return d;
  }

  async function schreiben(ordner, name, bytes) {
    var griff = await ordner.getFileHandle(name, { create: true });
    var w = await griff.createWritable();
    await w.write(bytes);
    await w.close();
    return griff;
  }

  async function bytesLesen(ordner, name) {
    var griff = await ordner.getFileHandle(name);
    var datei = await griff.getFile();
    return new Uint8Array(await datei.arrayBuffer());
  }

  async function dateien(ordner) {
    var liste = [];
    for await (var eintrag of ordner.values()) {
      if (eintrag.kind === "file") liste.push(eintrag);
    }
    return liste;
  }

  K.fs = {
    griffLesen: griffLesen,
    griffSchreiben: griffSchreiben,
    griffLoeschen: griffLoeschen,
    berechtigung: function (griff, anfragen) {
      return sicher(function () {
        return berechtigung(griff, anfragen);
      });
    },

    gespeicherterOrdner: function () {
      return griffLesen(SCHLUESSEL_ORDNER);
    },

    datenOrdnerWaehlen: async function () {
      var griff = await ordnerWaehlen("documents");
      if (!griff) return null;
      var daten = await sicher(function () {
        return datenOrdnerAus(griff);
      });
      await griffSchreiben(SCHLUESSEL_ORDNER, daten);
      return daten;
    },

    freienOrdnerWaehlen: function () {
      return ordnerWaehlen("documents");
    },

    dateiWaehlen: async function (beschreibung, endung) {
      try {
        var griffe = await window.showOpenFilePicker({
          types: [{ description: beschreibung, accept: { "application/octet-stream": [endung] } }],
        });
        var datei = await griffe[0].getFile();
        return new Uint8Array(await datei.arrayBuffer());
      } catch (e) {
        if (e && e.name === "AbortError") return null;
        throw uebersetzen(e);
      }
    },

    // Der Nutzer wählt das Ziel selbst, die Datei liegt dort unverschlüsselt.
    speichernUnter: async function (name, bytes, beschreibung) {
      try {
        var griff = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: beschreibung, accept: { "application/pdf": [".pdf"] } }],
        });
        var strom = await griff.createWritable();
        await strom.write(bytes);
        await strom.close();
        return true;
      } catch (e) {
        if (e && e.name === "AbortError") return false;
        throw uebersetzen(e);
      }
    },

    ordner: function (basis, teile) {
      return sicher(function () {
        return unterordner(basis, teile, true);
      });
    },

    vorhanden: function (basis, teile) {
      return unterordner(basis, teile, false).then(
        function () {
          return true;
        },
        function () {
          return false;
        },
      );
    },

    lesen: function (ordner, name) {
      return sicher(function () {
        return bytesLesen(ordner, name);
      });
    },

    aenderungszeit: function (ordner, name) {
      return sicher(async function () {
        var griff = await ordner.getFileHandle(name);
        return (await griff.getFile()).lastModified;
      });
    },

    // Erst *.tmp vollständig schreiben und prüfen, dann ersetzen. Bleibt die Zieldatei
    // beim Ersetzen unbrauchbar zurück, liest lesenMitRettung die *.tmp.
    schreibenAtomar: function (ordner, name, bytes) {
      return sicher(async function () {
        var tmp = name + ".tmp";
        var griff = await schreiben(ordner, tmp, bytes);
        var geschrieben = await griff.getFile();
        if (geschrieben.size !== bytes.length) throw K.Fehler("fehler.schreiben");
        await schreiben(ordner, name, bytes);
        await ordner.removeEntry(tmp);
      });
    },

    lesenMitRettung: function (ordner, name, gueltig) {
      return sicher(async function () {
        var kandidaten = [name, name + ".tmp"];
        for (var i = 0; i < kandidaten.length; i++) {
          try {
            var bytes = await bytesLesen(ordner, kandidaten[i]);
            if (gueltig(bytes)) return bytes;
          } catch (e) {
            if (e && e.name !== "NotFoundError") throw e;
          }
        }
        return null;
      });
    },

    dateien: function (ordner) {
      return sicher(function () {
        return dateien(ordner);
      });
    },

    loeschen: function (ordner, name, rekursiv) {
      return sicher(function () {
        return ordner.removeEntry(name, { recursive: !!rekursiv });
      });
    },

    leeren: function (ordner) {
      return sicher(async function () {
        var namen = [];
        for await (var eintrag of ordner.values()) namen.push(eintrag.name);
        for (var i = 0; i < namen.length; i++) await ordner.removeEntry(namen[i], { recursive: true });
      });
    },
  };
})();
