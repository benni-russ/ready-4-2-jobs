(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  S.Profile = function () {
    var liste = hooks.useState(null);
    var neu = hooks.useState(null);
    var fehler = hooks.useState(null);
    var ersetzen = hooks.useState(null);
    var laedt = hooks.useState(false);

    hooks.useEffect(function () {
      K.profile.listeMitZeit().then(liste[1], function (e) {
        fehler[1](K.fehlerText(e));
      });
    }, []);

    async function herstellen(bytes) {
      laedt[1](true);
      try {
        await K.wiederherstellen(bytes);
      } catch (e) {
        ersetzen[1](null);
        laedt[1](false);
        fehler[1](K.fehlerText(e));
      }
    }

    async function backupWaehlen() {
      fehler[1](null);
      try {
        var bytes = await K.fs.dateiWaehlen(K.t("backup.dateityp"), K.backup.ENDUNG);
        if (!bytes) return;
        var id = K.backup.pruefen(bytes).profilId;
        var vorhanden = (liste[0] || []).some(function (e) {
          return e.id === id;
        });
        if (vorhanden) ersetzen[1](bytes);
        else herstellen(bytes);
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
    }

    function anlegen() {
      var name = (neu[0] || "").trim();
      if (name) K.neuesProfil(name);
    }

    return html`<${UI.Bildschirm} titel=${K.t("profile.titel")} text=${K.t("profile.text")}>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <div class="rj-profiles">
        ${(liste[0] || []).map(function (e) {
          return html`<button
            class="rj-profile"
            type="button"
            key=${e.id}
            onClick=${function () {
              K.zurSperre(e);
            }}
          >
            <span class="rj-avatar">${K.initialen(e.name)}</span>
            <span>
              <strong>${e.name}</strong>
              ${e.zuletzt && html`<small>${K.t("profile.zuletzt", { datum: new Date(e.zuletzt).toLocaleDateString(K.sprache()) })}</small>`}
            </span>
          </button>`;
        })}
        <button
          class="rj-profile rj-profile--new"
          type="button"
          onClick=${function () {
            neu[1]("");
          }}
        >
          <span class="rj-avatar"><${UI.Icon} name="plus" /></span>
          <span><strong>${K.t("profile.neu")}</strong></span>
        </button>
      </div>
      <${UI.Button} icon="upload" block onClick=${backupWaehlen}>${K.t("backup.wiederherstellen")}<//>
      ${neu[0] !== null &&
      html`<${UI.Dialog}
        titel=${K.t("profile.neu")}
        bestaetigen=${K.t("profile.neuAktion")}
        beiBestaetigen=${anlegen}
        beiSchliessen=${function () {
          neu[1](null);
        }}
      >
        <${UI.TextField} label=${K.t("profile.name")} hinweis=${K.t("profile.nameHinweis")} wert=${neu[0]} pflicht=${true} beiAenderung=${neu[1]} />
      <//>`}
      ${ersetzen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("backup.ersetzenTitel")}
        bestaetigen=${K.t("backup.ersetzenAktion")}
        gefahr=${true}
        laedt=${laedt[0]}
        beiBestaetigen=${function () {
          herstellen(ersetzen[0]);
        }}
        beiSchliessen=${function () {
          ersetzen[1](null);
        }}
      >
        <p>${K.t("backup.ersetzenText")}</p>
      <//>`}
    <//>`;
  };
})();
