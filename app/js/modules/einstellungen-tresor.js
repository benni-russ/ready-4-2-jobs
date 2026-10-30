(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var SPERRZEITEN = [5, 10, 15, 30, 60];

  function PasswortDialog(props) {
    var alt = hooks.useState("");
    var neu = hooks.useState("");
    var wieder = hooks.useState("");
    var alteWeg = hooks.useState(false);
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);

    async function aendern() {
      var problem = K.krypto.passwortFehler(neu[0], wieder[0]);
      if (problem) return fehler[1](K.t(problem));
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.passwortAendern(alt[0], neu[0]);
        await K.alteSicherungenEntfernen(alteWeg[0]);
        K.meldung(K.t("passwort.geaendert"));
        props.beiSchliessen();
      } catch (e) {
        laedt[1](false);
        fehler[1](K.fehlerText(e));
      }
    }

    return html`<${UI.Dialog} titel=${K.t("passwort.aendern")} bestaetigen=${K.t("passwort.aendern")} laedt=${laedt[0]} beiBestaetigen=${aendern} beiSchliessen=${props.beiSchliessen}>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <${UI.PasswordField} label=${K.t("passwort.aktuell")} wert=${alt[0]} beiAenderung=${alt[1]} />
      <${UI.PasswordField} neu=${true} label=${K.t("passwort.neu")} hinweis=${K.t("passwort.hinweis")} wert=${neu[0]} beiAenderung=${neu[1]} />
      <${UI.PasswordField} neu=${true} label=${K.t("passwort.wiederholen")} wert=${wieder[0]} beiAenderung=${wieder[1]} />
      <${UI.Checkbox} label=${K.t("backup.alteEntfernen")} erklaerung=${K.t("backup.alteEntfernenText")} wert=${alteWeg[0]} beiAenderung=${alteWeg[1]} />
    <//>`;
  }

  function LoeschenDialog(props) {
    var passwort = hooks.useState("");
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);

    async function loeschen() {
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.pruefenPasswort(passwort[0]);
        await K.profilLoeschen();
      } catch (e) {
        laedt[1](false);
        fehler[1](K.fehlerText(e));
      }
    }

    return html`<${UI.Dialog} titel=${K.t("profil.loeschen")} bestaetigen=${K.t("profil.loeschenAktion")} gefahr=${true} laedt=${laedt[0]} beiBestaetigen=${loeschen} beiSchliessen=${props.beiSchliessen}>
      <p>${K.t("profil.loeschenText")}</p>
      <${UI.PasswordField} label=${K.t("passwort.label")} wert=${passwort[0]} beiAenderung=${passwort[1]} fehler=${fehler[0]} />
    <//>`;
  }

  function BackupBereich() {
    var e = K.tresor.eintrag();
    var liste = hooks.useState([]);
    var ziel2 = hooks.useState(null);
    var erlaubt = hooks.useState(true);
    var auswahl = hooks.useState(null);
    var laedt = hooks.useState(false);
    var fehler = hooks.useState(null);

    async function aktualisieren() {
      var griff = await K.backup.ziel2(e);
      ziel2[1](griff || null);
      if (griff) erlaubt[1]((await K.fs.berechtigung(griff, false)) === "granted");
      liste[1](await K.backup.liste(e));
    }

    hooks.useEffect(function () {
      aktualisieren().catch(function (x) {
        fehler[1](K.fehlerText(x));
      });
    }, []);

    async function sichern() {
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.speichernJetzt();
        var r = await K.backup.erstellen(e, true);
        if (r.ziel2 === "kein-zugriff") K.meldung(K.t("backup.ziel2Fehlt"), "danger");
        else K.meldung(K.t("backup.erstellt"));
        await aktualisieren();
      } catch (x) {
        fehler[1](K.fehlerText(x));
      }
      laedt[1](false);
    }

    async function ortSetzen(griff, aktiv) {
      fehler[1](null);
      try {
        await K.backup.ziel2Setzen(e, griff);
        K.tresor.aendern(function (d) {
          d.einstellungen.backupZiel2 = aktiv;
        });
        await aktualisieren();
      } catch (x) {
        fehler[1](K.fehlerText(x));
      }
    }

    async function ortWaehlen() {
      fehler[1](null);
      try {
        var griff = await K.fs.freienOrdnerWaehlen();
        if (griff) await ortSetzen(griff, true);
      } catch (x) {
        fehler[1](K.fehlerText(x));
      }
    }

    async function herstellen() {
      laedt[1](true);
      try {
        await K.wiederherstellen(await auswahl[0].lesen());
      } catch (x) {
        auswahl[1](null);
        laedt[1](false);
        fehler[1](K.fehlerText(x));
      }
    }

    async function dateiWaehlen() {
      fehler[1](null);
      try {
        var bytes = await K.fs.dateiWaehlen(K.t("backup.dateityp"), K.backup.ENDUNG);
        if (!bytes) return;
        K.backup.pruefen(bytes);
        auswahl[1]({
          lesen: function () {
            return bytes;
          },
        });
      } catch (x) {
        fehler[1](K.fehlerText(x));
      }
    }

    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("backup.titel")}</h2>
      <p class="rj-muted">${K.t("backup.text")}</p>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      ${ziel2[0] && !erlaubt[0] && html`<${UI.Alert} art="warning">${K.t("backup.ziel2Erlaubnis", { name: ziel2[0].name })}<//>`}
      <div class="rj-row">
        <${UI.Button} variante="primary" icon="hard-drive" laedt=${laedt[0]} disabled=${laedt[0]} onClick=${sichern}>${K.t("backup.jetzt")}<//>
      </div>
      <p>${ziel2[0] ? K.t("backup.ziel2Gesetzt", { name: ziel2[0].name }) : K.t("backup.ziel2Keiner")}</p>
      <div class="rj-row">
        <${UI.Button} icon="folder-open" onClick=${ortWaehlen}>${K.t("backup.ziel2Waehlen")}<//>
        ${ziel2[0] &&
        html`<${UI.Button}
          variante="ghost"
          onClick=${function () {
            ortSetzen(null, false);
          }}
          >${K.t("backup.ziel2Entfernen")}<//
        >`}
      </div>
      <h3 class="h3">${K.t("backup.liste")}</h3>
      ${liste[0].length === 0 && html`<p class="rj-muted">${K.t("backup.keine")}</p>`}
      <ul class="rj-checklist">
        ${liste[0].map(function (b) {
          return html`<li key=${b.name} style="justify-content:space-between;flex-wrap:wrap;min-height:44px">
            <span>${new Date(b.zeit).toLocaleString(K.sprache())}</span>
            <${UI.Button}
              variante="ghost"
              icon="rotate-ccw"
              onClick=${function () {
                auswahl[1]({
                  lesen: function () {
                    return K.backup.lesen(e, b.name);
                  },
                });
              }}
              >${K.t("backup.diesesHerstellen")}<//
            >
          </li>`;
        })}
      </ul>
      <div class="rj-row"><${UI.Button} icon="upload" onClick=${dateiWaehlen}>${K.t("backup.ausDatei")}<//></div>
      ${auswahl[0] &&
      html`<${UI.Dialog}
        titel=${K.t("backup.ersetzenTitel")}
        bestaetigen=${K.t("backup.ersetzenAktion")}
        gefahr=${true}
        laedt=${laedt[0]}
        beiBestaetigen=${herstellen}
        beiSchliessen=${function () {
          auswahl[1](null);
        }}
      >
        <p>${K.t("backup.ersetzenText")}</p>
      <//>`}
    </section>`;
  }

  S.TresorEinstellungen = function () {
    K.useBeobachtbar(K.tresorStand);
    var dialog = hooks.useState(null);
    var e = K.tresor.daten().einstellungen;

    function schliessen() {
      dialog[1](null);
    }

    function setzen(aufgabe) {
      return function (w) {
        K.tresor.aendern(function (d) {
          aufgabe(d.einstellungen, w);
        });
      };
    }

    async function exportLeeren() {
      try {
        await K.profile.exportLeeren();
        K.meldung(K.t("einstellungen.exportGeleert"));
      } catch (x) {
        K.meldung(K.fehlerText(x), "danger");
      }
    }

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("einstellungen.sicherheit")}</h2>
        <${UI.Select}
          label=${K.t("einstellungen.sperre")}
          wert=${String(e.sperreMinuten)}
          optionen=${SPERRZEITEN.map(function (m) {
            return { wert: String(m), label: K.t("einstellungen.minuten", { anzahl: m }) };
          })}
          beiAenderung=${setzen(function (x, w) {
            x.sperreMinuten = Number(w);
          })}
        />
        <div class="rj-row">
          <${UI.Button}
            icon="key-round"
            onClick=${function () {
              dialog[1]("passwort");
            }}
            >${K.t("passwort.aendern")}<//
          >
          <${UI.Button} icon="shield-check" onClick=${K.zumNeuenSchluessel}>${K.t("schluessel.neuTitel")}<//>
        </div>
      </section>
      <${BackupBereich} />
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("einstellungen.weiteres")}</h2>
        <${UI.Switch}
          label=${K.t("einstellungen.update")}
          wert=${e.updatePruefung}
          beiAenderung=${setzen(function (x, w) {
            x.updatePruefung = w;
          })}
        />
        <div class="rj-row"><${UI.Button} onClick=${exportLeeren}>${K.t("einstellungen.exportLeeren")}<//></div>
        <div class="rj-row">
          <${UI.Button}
            variante="danger"
            icon="trash-2"
            onClick=${function () {
              dialog[1]("loeschen");
            }}
            >${K.t("profil.loeschen")}<//
          >
        </div>
      </section>
      ${dialog[0] === "passwort" && html`<${PasswortDialog} beiSchliessen=${schliessen} />`}
      ${dialog[0] === "loeschen" && html`<${LoeschenDialog} beiSchliessen=${schliessen} />`}
    `;
  };
})();
