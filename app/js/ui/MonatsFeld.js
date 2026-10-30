(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // Lebensläufe nennen Monat und Jahr. Wert ist JJJJ-MM oder "".
  UI.MonatsFeld = function (props) {
    var text = hooks.useState(K.monatAnzeige(props.wert));
    var ungueltig = hooks.useState(false);

    function verlassen() {
      var neu = text[0].trim() ? K.monatLesen(text[0]) : "";
      ungueltig[1](neu === null);
      if (neu === null) return props.beiAenderung("");
      text[1](K.monatAnzeige(neu));
      props.beiAenderung(neu);
    }

    return html`<${UI.TextField}
      label=${props.label}
      pflicht=${props.pflicht}
      hinweis=${props.hinweis || K.t("monat.hinweis")}
      fehler=${ungueltig[0] ? K.t("monat.ungueltig") : props.fehler}
      wert=${text[0]}
      beiAenderung=${props.beiAenderung}
      onInput=${function (e) {
        var w = K.maskeAnwenden(e.target, e.inputType, text[0], K.maskeMonat);
        text[1](w);
        var neu = K.monatLesen(w);
        if (neu) props.beiAenderung(neu);
      }}
      onBlur=${verlassen}
      placeholder=${K.t("monat.platzhalter")}
      inputmode="numeric"
      autocomplete="off"
      disabled=${props.disabled}
    />`;
  };
})();
