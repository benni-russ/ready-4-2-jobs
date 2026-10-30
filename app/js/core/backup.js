(function () {
  "use strict";
  var K = window.R42J_CORE;

  var ROTATION = 3;
  var ENDUNG = ".r42jb";
  var PRAEFIX = "r42j-backup-";
  var SCHUTZ = "-schutz" + ENDUNG;

  function zwei(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function dateiname(eintrag, schutz) {
    var d = new Date();
    var stempel =
      d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate()) +
      "-" + zwei(d.getHours()) + zwei(d.getMinutes()) + zwei(d.getSeconds());
    return PRAEFIX + eintrag.id.slice(0, 8) + "-" + stempel + (schutz ? SCHUTZ : ENDUNG);
  }

  function vomProfil(eintrag, name) {
    return name.indexOf(PRAEFIX + eintrag.id.slice(0, 8) + "-") === 0 && name.slice(-ENDUNG.length) === ENDUNG;
  }

  async function backupDateien(ordner, eintrag) {
    var liste = await K.fs.dateien(ordner);
    return liste
      .filter(function (d) {
        return vomProfil(eintrag, d.name);
      })
      .sort(function (a, b) {
        return a.name < b.name ? 1 : -1;
      });
  }

  // Behält je Tag die neueste Sicherung, damit eine Sitzungsfolge nicht die ganze
  // Historie verdrängt. Die neueste Schutzkopie zählt nicht mit, außer es bleibt nur eine.
  async function rotieren(ordner, eintrag, behalten) {
    var liste = await backupDateien(ordner, eintrag);
    var tage = {};
    var anzahl = 0;
    var schutzDa = behalten === 1;
    for (var i = 0; i < liste.length; i++) {
      var name = liste[i].name;
      var tag = name.match(/\d{4}-\d{2}-\d{2}(?=-\d{6})/)[0];
      var schutz = name.slice(-SCHUTZ.length) === SCHUTZ;
      if (schutz ? schutzDa : tage[tag] || anzahl >= behalten) {
        await K.fs.loeschen(ordner, name);
      } else if (schutz) {
        schutzDa = true;
      } else {
        tage[tag] = true;
        anzahl++;
      }
    }
  }

  // Aufbau: 4 Byte Index-Länge, JSON-Index, Dateien hintereinander (SPEC §4.4).
  function packen(profilId, dateien) {
    var index = new TextEncoder().encode(
      JSON.stringify({
        format: "r42j-backup",
        v: 1,
        profilId: profilId,
        dateien: dateien.map(function (d) {
          return { pfad: d.pfad, laenge: d.bytes.length };
        }),
      }),
    );
    var gesamt = dateien.reduce(function (s, d) {
      return s + d.bytes.length;
    }, 4 + index.length);
    var aus = new Uint8Array(gesamt);
    new DataView(aus.buffer).setUint32(0, index.length, true);
    aus.set(index, 4);
    var pos = 4 + index.length;
    dateien.forEach(function (d) {
      aus.set(d.bytes, pos);
      pos += d.bytes.length;
    });
    return aus;
  }

  function entpacken(bytes) {
    try {
      var laenge = new DataView(bytes.buffer, bytes.byteOffset, bytes.length).getUint32(0, true);
      var index = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + laenge)));
      if (index.format !== "r42j-backup") throw new Error();
      if (index.v !== 1) throw K.Fehler("fehler.backupNeuer");
      var pos = 4 + laenge;
      var dateien = index.dateien.map(function (d) {
        var teil = bytes.subarray(pos, pos + d.laenge);
        pos += d.laenge;
        return { pfad: d.pfad, bytes: teil };
      });
      if (pos !== bytes.length || !/^[0-9a-f-]{36}$/.test(index.profilId)) throw new Error();
      var erlaubt = dateien.every(function (d) {
        return d.pfad === K.DATEI_TRESOR || /^anlagen\/[0-9a-f-]{36}\.enc$/.test(d.pfad);
      });
      if (!erlaubt || !dateien.some(function (d) { return d.pfad === K.DATEI_TRESOR; })) throw new Error();
      return { profilId: index.profilId, dateien: dateien };
    } catch (e) {
      throw e.schluessel ? e : K.Fehler("fehler.backupDefekt");
    }
  }

  async function sammeln(eintrag) {
    var ordner = await K.profile.ordner(eintrag);
    var dateien = [{ pfad: K.DATEI_TRESOR, bytes: await K.fs.lesen(ordner, K.DATEI_TRESOR) }];
    var anlagen = await K.fs.dateien(await K.profile.ordner(eintrag, ["anlagen"]));
    for (var i = 0; i < anlagen.length; i++) {
      var d = await anlagen[i].getFile();
      dateien.push({ pfad: "anlagen/" + anlagen[i].name, bytes: new Uint8Array(await d.arrayBuffer()) });
    }
    return dateien;
  }

  function schluesselZiel2(eintrag) {
    return "ziel2:" + eintrag.id;
  }

  // Liefert, ob der zweite Ort erreicht wurde: "ok", "aus" oder "kein-zugriff".
  async function zweiterOrt(eintrag, name, bytes, anfragen, behalten) {
    var griff = await K.fs.griffLesen(schluesselZiel2(eintrag));
    if (!griff) return "aus";
    try {
      if ((await K.fs.berechtigung(griff, anfragen)) !== "granted") return "kein-zugriff";
      await K.fs.schreibenAtomar(griff, name, bytes);
      await rotieren(griff, eintrag, behalten);
      return "ok";
    } catch (e) {
      return "kein-zugriff";
    }
  }

  K.backup = {
    ENDUNG: ENDUNG,
    pruefen: entpacken,

    // Ohne Datenschlüssel möglich: Es werden nur verschlüsselte Dateien kopiert.
    erstellen: async function (eintrag, anfragen, behalten, schutz) {
      var grenze = behalten || ROTATION;
      var bytes = packen(eintrag.id, await sammeln(eintrag));
      var name = dateiname(eintrag, schutz);
      var ordner = await K.profile.ordner(eintrag, ["backups"]);
      await K.fs.schreibenAtomar(ordner, name, bytes);
      await rotieren(ordner, eintrag, grenze);
      return { name: name, ziel2: await zweiterOrt(eintrag, name, bytes, anfragen, grenze) };
    },

    // Stand vor einem Eingriff: Spätere Sicherungen desselben Tages ersetzen ihn nicht.
    schutzkopie: function (eintrag) {
      return K.backup.erstellen(eintrag, false, ROTATION, true);
    },

    // Alte Sicherungen öffnen sich weiter mit dem alten Passwort und Schlüssel.
    // Wer das nicht will, behält nur eine frische Sicherung des aktuellen Stands.
    alteEntfernen: function (eintrag) {
      return K.backup.erstellen(eintrag, true, 1);
    },

    // Seit dem letzten Backup hat sich der Tresor geändert.
    faellig: async function (eintrag) {
      var ordner = await K.profile.ordner(eintrag);
      var aenderung = await K.fs.aenderungszeit(ordner, K.DATEI_TRESOR);
      var liste = await backupDateien(await K.profile.ordner(eintrag, ["backups"]), eintrag);
      if (!liste.length) return true;
      return aenderung > (await liste[0].getFile()).lastModified;
    },

    liste: async function (eintrag) {
      var ordner = await K.profile.ordner(eintrag, ["backups"]);
      var liste = await backupDateien(ordner, eintrag);
      return Promise.all(
        liste.map(async function (griff) {
          var d = await griff.getFile();
          return { name: griff.name, zeit: d.lastModified };
        }),
      );
    },

    lesen: async function (eintrag, name) {
      return K.fs.lesen(await K.profile.ordner(eintrag, ["backups"]), name);
    },

    ziel2: function (eintrag) {
      return K.fs.griffLesen(schluesselZiel2(eintrag));
    },
    ziel2Setzen: function (eintrag, griff) {
      return griff ? K.fs.griffSchreiben(schluesselZiel2(eintrag), griff) : K.fs.griffLoeschen(schluesselZiel2(eintrag));
    },

    // Gehört das Backup zu einem vorhandenen Profil, ersetzt es dessen Stand.
    // Vorher wird dieser Stand selbst gesichert, damit nichts verloren geht.
    wiederherstellen: async function (bytes, nameFallback) {
      var inhalt = entpacken(bytes);
      var vorhanden = (await K.profile.liste()).filter(function (e) {
        return e.id === inhalt.profilId;
      })[0];
      var eintrag = vorhanden || { id: inhalt.profilId, name: nameFallback, datei: K.DATEI_TRESOR };
      if (vorhanden) await K.backup.schutzkopie(vorhanden);

      var ordner = await K.profile.ordner(eintrag);
      var anlagen = await K.profile.ordner(eintrag, ["anlagen"]);
      await K.fs.leeren(anlagen);
      await K.profile.ordner(eintrag, ["backups"]);
      for (var i = 0; i < inhalt.dateien.length; i++) {
        var d = inhalt.dateien[i];
        if (d.pfad === K.DATEI_TRESOR) await K.fs.schreibenAtomar(ordner, d.pfad, d.bytes);
        else await K.fs.schreibenAtomar(anlagen, d.pfad.slice("anlagen/".length), d.bytes);
      }
      await K.profile.hinzufuegen(eintrag);
      return eintrag;
    },
  };
})();
