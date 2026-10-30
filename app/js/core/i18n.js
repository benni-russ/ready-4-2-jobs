(function () {
  "use strict";
  var K = window.R42J_CORE;

  K.sprache = function () {
    return K.store.get().sprache;
  };

  // Fehlt ein Schlüssel, erscheint er sichtbar in der Oberfläche statt eines leeren Texts.
  K.t = function (schluessel, werte) {
    var text = window.R42J_I18N[K.sprache()][schluessel];
    if (text === undefined) text = schluessel;
    if (!werte || typeof text !== "string") return text;
    return text.replace(/\{(\w+)\}/g, function (ganz, name) {
      return name in werte ? werte[name] : ganz;
    });
  };
})();
