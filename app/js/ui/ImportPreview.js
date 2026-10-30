(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  // gruppen: [{ titel, eintraege: [{ id, label, erklaerung? }] }], wert: Liste der gewählten IDs.
  UI.ImportPreview = function (props) {
    var kopf = hooks.useRef(null);
    var alle = [];
    props.gruppen.forEach(function (g) {
      g.eintraege.forEach(function (e) {
        alle.push(e.id);
      });
    });

    // Der Prüfen-Knopf verschwindet, der Fokus soll nicht auf der Seite verloren gehen.
    hooks.useEffect(function () {
      kopf.current.focus();
    }, []);

    return html`<div class="rj-stack">
      <div tabindex="-1" ref=${kopf}><${UI.Alert} art="success">${props.titel}<//></div>
      ${props.gruppen.map(function (g) {
        return (
          g.eintraege.length > 0 &&
          html`<fieldset class="rj-fieldset" key=${g.titel}>
            <legend>${g.titel} (${g.eintraege.length})</legend>
            ${g.eintraege.map(function (e) {
              var an = props.wert.indexOf(e.id) > -1;
              return html`<${UI.Checkbox}
                key=${e.id}
                label=${e.label}
                erklaerung=${e.erklaerung}
                wert=${an}
                beiAenderung=${function (w) {
                  var ohne = props.wert.filter(function (x) {
                    return x !== e.id;
                  });
                  props.beiAenderung(w ? ohne.concat([e.id]) : ohne);
                }}
              />`;
            })}
          </fieldset>`
        );
      })}
      <div class="rj-row">
        <${UI.Button}
          variante="ghost"
          onClick=${function () {
            props.beiAenderung(alle);
          }}
        >
          ${K.t("interview.alleWaehlen")}
        <//>
        <${UI.Button}
          variante="ghost"
          onClick=${function () {
            props.beiAenderung([]);
          }}
        >
          ${K.t("interview.keineWaehlen")}
        <//>
        <span class="rj-muted">${K.t("interview.gewaehlt", { anzahl: props.wert.length, gesamt: alle.length })}</span>
      </div>
      ${props.children}
    </div>`;
  };
})();
