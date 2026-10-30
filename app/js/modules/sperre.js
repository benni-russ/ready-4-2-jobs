(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function klick(aufgabe) {
    return function (e) {
      e.preventDefault();
      aufgabe();
    };
  }

  S.Sperre = function (props) {
    var e = props.eintrag;
    var passwort = hooks.useState("");
    var fehler = hooks.useState(props.fehler || null);
    var laedt = hooks.useState(false);
    var feld = hooks.useRef(null);

    hooks.useEffect(function () {
      feld.current.focus();
    }, []);

    async function entsperren() {
      if (!passwort[0] || laedt[0]) return;
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.oeffnenMitPasswort(e, passwort[0]);
        K.nachEntsperren();
      } catch (x) {
        laedt[1](false);
        fehler[1](K.fehlerText(x));
        feld.current.select();
      }
    }

    return html`<${UI.Bildschirm} icon="lock" titel=${K.t("sperre.titel", { name: e.name })} text=${K.t("sperre.text")} beiAbsenden=${entsperren}>
      ${props.grund === "auto" && html`<${UI.Alert}>${K.t("sperre.auto")}<//>`}
      ${props.grund === "wiederhergestellt" && html`<${UI.Alert} art="success">${K.t("sperre.wiederhergestellt")}<//>`}
      <${UI.PasswordField} label=${K.t("passwort.label")} wert=${passwort[0]} beiAenderung=${passwort[1]} fehler=${fehler[0]} eingabeRef=${feld} />
      <${UI.Button} type="submit" variante="primary" lg block icon="lock-open" laedt=${laedt[0]} disabled=${laedt[0]}>
        ${K.t(laedt[0] ? "sperre.laedt" : "sperre.aktion")}
      <//>
      <div class="rj-row" style="justify-content:space-between">
        <a
          class="rj-link"
          href="#"
          onClick=${klick(function () {
            K.zumSchluessel(e);
          })}
          >${K.t("sperre.mitSchluessel")}</a
        >
        <a class="rj-link" href="#" onClick=${klick(K.zuProfilen)}>${K.t("sperre.anderesProfil")}</a>
      </div>
    <//>`;
  };

  S.SchluesselEntsperren = function (props) {
    var e = props.eintrag;
    var code = hooks.useState("");
    var neu = hooks.useState("");
    var wieder = hooks.useState("");
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);

    async function entsperren() {
      var problem = K.krypto.passwortFehler(neu[0], wieder[0]);
      if (problem) return fehler[1](K.t(problem));
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.oeffnenMitCode(e, code[0], neu[0]);
        K.nachEntsperren();
      } catch (x) {
        laedt[1](false);
        fehler[1](K.fehlerText(x));
      }
    }

    return html`<${UI.Bildschirm} icon="key-round" titel=${K.t("sperre.schluesselTitel")} text=${K.t("sperre.schluesselText")} beiAbsenden=${entsperren}>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <${UI.TextField} label=${K.t("schluessel.titel")} wert=${code[0]} beiAenderung=${code[1]} pflicht=${true} autocomplete="off" spellcheck="false" />
      <${UI.PasswordField} neu=${true} label=${K.t("passwort.neu")} hinweis=${K.t("passwort.hinweis")} wert=${neu[0]} beiAenderung=${neu[1]} />
      <${UI.PasswordField} neu=${true} label=${K.t("passwort.wiederholen")} wert=${wieder[0]} beiAenderung=${wieder[1]} />
      <${UI.Button} type="submit" variante="primary" lg block icon="lock-open" laedt=${laedt[0]} disabled=${laedt[0]}>
        ${K.t(laedt[0] ? "sperre.laedt" : "sperre.aktion")}
      <//>
      <a
        class="rj-link"
        href="#"
        onClick=${klick(function () {
          K.zurSperre(e);
        })}
        >${K.t("sperre.mitPasswort")}</a
      >
    <//>`;
  };
})();
