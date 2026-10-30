(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // Der Klartext lebt nur als Blob im Speicher und wird beim Schließen freigegeben.
  UI.FilePreview = function (props) {
    var a = props.anlage;
    var url = hooks.useState(null);
    var fehler = hooks.useState(null);

    hooks.useEffect(
      function () {
        var aktiv = true;
        var adresse = null;
        K.tresor.anlageLesen(a.id).then(
          function (bytes) {
            if (!aktiv) return;
            adresse = URL.createObjectURL(new Blob([bytes], { type: a.mime }));
            url[1](adresse);
          },
          function (e) {
            if (aktiv) fehler[1](K.fehlerText(e));
          },
        );
        return function () {
          aktiv = false;
          if (adresse) URL.revokeObjectURL(adresse);
        };
      },
      [a.id],
    );

    var inhalt = null;
    if (fehler[0]) inhalt = html`<${UI.Alert} art="danger">${fehler[0]}<//>`;
    else if (!url[0]) inhalt = html`<div class="rj-filepreview"><span class="rj-spinner" role="status" aria-label=${K.t("anlagen.laedt")}></span></div>`;
    else if (a.mime === "application/pdf") {
      inhalt = html`<div class="rj-filepreview"><iframe src=${url[0]} title=${a.titel}></iframe></div>`;
    } else inhalt = html`<div class="rj-filepreview"><img src=${url[0]} alt=${a.titel} /></div>`;

    return html`<${UI.Dialog} breit=${true} titel=${a.titel} beiSchliessen=${props.beiSchliessen}>${inhalt}<//>`;
  };
})();
