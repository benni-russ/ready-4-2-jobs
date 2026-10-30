(function () {
  "use strict";
  var K = window.R42J_CORE;

  var ZEILE = 76;
  var BASE64_BLOCK = 57; // ergibt genau 76 Zeichen pro Zeile
  var ENCODED_WORD = 45; // Bytes je Encoded-Word, damit die Zeile unter 76 Zeichen bleibt
  var CRLF = "\r\n";

  function bytesText(bytes, von, bis) {
    var s = "";
    for (var i = von; i < bis; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function base64(bytes) {
    var zeilen = [];
    for (var i = 0; i < bytes.length; i += BASE64_BLOCK) {
      zeilen.push(btoa(bytesText(bytes, i, Math.min(i + BASE64_BLOCK, bytes.length))));
    }
    return zeilen.join(CRLF);
  }

  function nurAscii(s) {
    return /^[\x20-\x7e]*$/.test(s);
  }

  // Zeilenumbrüche in Kopfzeilen wären Header-Injection.
  function kopfWert(s) {
    return String(s || "")
      .replace(/[\r\n]+/g, " ")
      .trim();
  }

  // RFC 2047, an Zeichengrenzen getrennt, damit kein UTF-8-Zeichen zerreißt.
  function encodedWords(text) {
    var enc = new TextEncoder();
    var teile = [];
    var aktuell = "";
    Array.from(text).forEach(function (z) {
      if (enc.encode(aktuell + z).length > ENCODED_WORD) {
        teile.push(aktuell);
        aktuell = "";
      }
      aktuell += z;
    });
    if (aktuell) teile.push(aktuell);
    return teile
      .map(function (t) {
        return "=?UTF-8?B?" + base64(enc.encode(t)) + "?=";
      })
      .join(CRLF + " ");
  }

  function kopf(s) {
    return nurAscii(s) ? s : encodedWords(s);
  }

  function dateiParameter(name, feld) {
    if (nurAscii(name)) return feld + '="' + name.replace(/["\\]/g, "") + '"';
    return feld + "*=UTF-8''" + encodeURIComponent(name);
  }

  function grenze() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return (
      "----=_R42J_" +
      Array.from(b)
        .map(function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  function adresse(name, email) {
    var e = kopfWert(email);
    var n = kopfWert(name);
    if (!n) return e;
    return (nurAscii(n) ? '"' + n.replace(/["\\]/g, "") + '"' : kopf(n)) + " <" + e + ">";
  }

  K.eml = {
    ZEILE: ZEILE,

    // Ein Entwurf nach RFC 5322: Mit X-Unsent öffnet Outlook ihn zum Bearbeiten und Senden.
    erzeugen: function (o) {
      var b = grenze();
      var teile = [];
      var kopfzeilen = ["X-Unsent: 1", "MIME-Version: 1.0"];
      if (o.vonEmail) kopfzeilen.push("From: " + adresse(o.vonName, o.vonEmail));
      if (kopfWert(o.an)) kopfzeilen.push("To: " + kopfWert(o.an));
      kopfzeilen.push("Subject: " + kopf(kopfWert(o.betreff)));
      kopfzeilen.push('Content-Type: multipart/mixed; boundary="' + b + '"');
      teile.push(kopfzeilen.join(CRLF) + CRLF + CRLF);
      teile.push("--" + b + CRLF);
      teile.push('Content-Type: text/plain; charset="UTF-8"' + CRLF + "Content-Transfer-Encoding: base64" + CRLF + CRLF);
      teile.push(base64(new TextEncoder().encode(String(o.text || "").replace(/\r?\n/g, CRLF))) + CRLF);
      o.anhaenge.forEach(function (a) {
        teile.push("--" + b + CRLF);
        teile.push("Content-Type: " + a.mime + "; " + dateiParameter(a.name, "name") + CRLF);
        teile.push("Content-Disposition: attachment; " + dateiParameter(a.name, "filename") + CRLF);
        teile.push("Content-Transfer-Encoding: base64" + CRLF + CRLF);
        teile.push(base64(a.bytes) + CRLF);
      });
      teile.push("--" + b + "--" + CRLF);
      return new TextEncoder().encode(teile.join(""));
    },
  };
})();
