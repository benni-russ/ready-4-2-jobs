(function () {
  "use strict";
  var K = window.R42J_CORE;
  var subtle = window.crypto.subtle;

  var ITERATIONEN = 600000;
  var IV_BYTES = 12;
  var SALT_BYTES = 16;
  var CODE_BYTES = 30; // 240 bit ergeben genau 48 Zeichen Base32 (8 Blöcke à 6).
  var CODE_BLOCK = 6;
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I und O, Ziffern ohne 0 und 1

  function zufall(n) {
    return window.crypto.getRandomValues(new Uint8Array(n));
  }

  function zuB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return window.btoa(s);
  }

  function ausB64(text) {
    var s = window.atob(text);
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }

  function aes(iv) {
    return { name: "AES-GCM", iv: iv };
  }

  function verbinden(iv, inhalt) {
    var alles = new Uint8Array(iv.length + inhalt.length);
    alles.set(iv);
    alles.set(inhalt, iv.length);
    return alles;
  }

  function teilen(alles) {
    return { iv: alles.subarray(0, IV_BYTES), inhalt: alles.subarray(IV_BYTES) };
  }

  async function passwortSchluessel(passwort, salt, iterationen) {
    var basis = await subtle.importKey("raw", new TextEncoder().encode(passwort), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iterationen },
      basis,
      { name: "AES-GCM", length: 256 },
      false,
      ["wrapKey", "unwrapKey"],
    );
  }

  function codeZeichen(bytes) {
    var bits = 0;
    var wert = 0;
    var s = "";
    for (var i = 0; i < bytes.length; i++) {
      wert = (wert << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        s += ALPHABET[(wert >>> (bits - 5)) & 31];
        bits -= 5;
      }
      wert &= (1 << bits) - 1;
    }
    return s;
  }

  function codeBytes(zeichen) {
    var bits = 0;
    var wert = 0;
    var bytes = new Uint8Array(CODE_BYTES);
    var n = 0;
    for (var i = 0; i < zeichen.length; i++) {
      wert = (wert << 5) | ALPHABET.indexOf(zeichen[i]);
      bits += 5;
      if (bits >= 8) {
        bytes[n++] = (wert >>> (bits - 8)) & 255;
        bits -= 8;
        wert &= (1 << bits) - 1;
      }
    }
    return bytes;
  }

  function codeNormalisieren(text) {
    return String(text).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function codeGueltig(zeichen) {
    if (zeichen.length !== (CODE_BYTES * 8) / 5) return false;
    return zeichen.split("").every(function (c) {
      return ALPHABET.indexOf(c) > -1;
    });
  }

  async function codeSchluessel(text) {
    var zeichen = codeNormalisieren(text);
    if (!codeGueltig(zeichen)) throw K.Fehler("fehler.schluesselFormat");
    var roh = await subtle.digest("SHA-256", codeBytes(zeichen));
    return subtle.importKey("raw", roh, "AES-GCM", false, ["wrapKey", "unwrapKey"]);
  }

  K.krypto = {
    zuB64: zuB64,
    ausB64: ausB64,

    neuerCode: function () {
      return codeZeichen(zufall(CODE_BYTES)).match(new RegExp(".{" + CODE_BLOCK + "}", "g"));
    },

    // Bestätigt im Onboarding, dass der Schlüssel wirklich abgeschrieben wurde.
    codeBeginntMit: function (bloecke, eingabe) {
      return codeNormalisieren(eingabe) === bloecke[0] + bloecke[1];
    },

    neuesSalz: function () {
      return zuB64(zufall(SALT_BYTES));
    },

    kdfNeu: function () {
      return { alg: "PBKDF2-SHA256", iter: ITERATIONEN, salt: zuB64(zufall(SALT_BYTES)) };
    },

    ausPasswort: function (passwort, kdf) {
      return passwortSchluessel(passwort, ausB64(kdf.salt), kdf.iter);
    },

    ausCode: codeSchluessel,

    // Nur zum Verpacken extrahierbar. Im Betrieb liegt der Datenschlüssel nicht extrahierbar vor.
    neuerDatenschluessel: function () {
      return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    },

    verpacken: async function (dek, huelle) {
      var iv = zufall(IV_BYTES);
      var inhalt = await subtle.wrapKey("raw", dek, huelle, aes(iv));
      return zuB64(verbinden(iv, new Uint8Array(inhalt)));
    },

    // Wirft bei falschem Passwort oder Schlüssel.
    auspacken: function (verpackt, huelle, extrahierbar) {
      var t = teilen(ausB64(verpackt));
      return subtle.unwrapKey("raw", t.inhalt, huelle, aes(t.iv), "AES-GCM", !!extrahierbar, ["encrypt", "decrypt"]);
    },

    verschluesseln: async function (dek, bytes) {
      var iv = zufall(IV_BYTES);
      var inhalt = await subtle.encrypt(aes(iv), dek, bytes);
      return { iv: iv, inhalt: new Uint8Array(inhalt) };
    },

    entschluesseln: async function (dek, iv, inhalt) {
      return new Uint8Array(await subtle.decrypt(aes(iv), dek, inhalt));
    },

    // Anlagen liegen als IV + Ciphertext in einer Datei.
    dateiVerschluesseln: async function (dek, bytes) {
      var iv = zufall(IV_BYTES);
      var inhalt = await subtle.encrypt(aes(iv), dek, bytes);
      return verbinden(iv, new Uint8Array(inhalt));
    },

    dateiEntschluesseln: async function (dek, alles) {
      var t = teilen(alles);
      return new Uint8Array(await subtle.decrypt(aes(t.iv), dek, t.inhalt));
    },

    // Liefert den i18n-Schlüssel des Problems oder null.
    passwortFehler: function (neu, wiederholung) {
      if (neu.length < 12) return "passwort.zuKurz";
      if (K.krypto.passwortStaerke(neu) < 2) return "passwort.zuSchwach";
      if (neu !== wiederholung) return "passwort.ungleich";
      return null;
    },

    // Grobe lokale Einschätzung von 1 (schwach) bis 4 (stark), ohne Wörterliste.
    passwortStaerke: function (p) {
      if (p.length < 12) return 1;
      var klassen = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(function (r) {
        return r.test(p);
      }).length;
      var verschiedene = new Set(p.toLowerCase()).size;
      if (verschiedene < 6 || /^(.{1,4})\1+$/.test(p) || /(password|passwort|123456|qwertz|qwerty)/i.test(p)) return 1;
      if (p.length >= 20 || (p.length >= 16 && klassen >= 3)) return 4;
      if (p.length >= 16 || klassen >= 3) return 3;
      return 2;
    },
  };
})();
