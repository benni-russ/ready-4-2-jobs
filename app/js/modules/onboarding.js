(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var SCHRITTE = 8;
  var CHECKLISTE = ["postfach", "email", "telefon", "linkedin", "xing"];

  function Geruest(props) {
    var titel = hooks.useRef(null);
    hooks.useEffect(
      function () {
        titel.current.focus({ preventScroll: true });
      },
      [props.schritt],
    );
    return html`<main class="rj-content" style="margin:0 auto;width:min(720px,100%)">
      <${UI.Stepper}
        aktuell=${props.schritt}
        schritte=${[1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
          return K.t("onboarding.schritt" + n);
        })}
      />
      <section class="rj-card rj-stack">
        <h1 class="h2" tabindex="-1" ref=${titel}>${K.t("onboarding.titel" + props.schritt)}</h1>
        ${props.children}
      </section>
    </main>`;
  }

  function Knoepfe(props) {
    return html`<div class="rj-row rj-noprint" style="justify-content:space-between">
      ${props.zurueck ? html`<${UI.Button} onClick=${props.zurueck}>${K.t("aktion.zurueck")}<//>` : html`<span></span>`}
      <div class="rj-row">
        ${props.ueberspringen && html`<${UI.Button} variante="ghost" onClick=${props.ueberspringen}>${K.t("aktion.ueberspringen")}<//>`}
        <${UI.Button} variante="primary" iconHinten="arrow-right" laedt=${props.laedt} disabled=${props.laedt} onClick=${props.weiter}>
          ${props.weiterText || K.t("aktion.weiter")}
        <//>
      </div>
    </div>`;
  }

  function SchrittBackup(props) {
    var name = hooks.useState(null);
    var fehler = hooks.useState(null);

    async function waehlen() {
      fehler[1](null);
      try {
        var ordner = await K.fs.freienOrdnerWaehlen();
        if (!ordner) return;
        await K.backup.ziel2Setzen(K.tresor.eintrag(), ordner);
        K.tresor.aendern(function (d) {
          d.einstellungen.backupZiel2 = true;
        });
        name[1](ordner.name);
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
    }

    return html`
      <p>${K.t("onboarding.backupText")}</p>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      ${name[0] && html`<${UI.Alert} art="success">${K.t("backup.ziel2Gesetzt", { name: name[0] })}<//>`}
      <div class="rj-row"><${UI.Button} icon="folder-open" onClick=${waehlen}>${K.t("backup.ziel2Waehlen")}<//></div>
      <${Knoepfe} ueberspringen=${name[0] ? null : props.weiter} weiter=${props.weiter} />
    `;
  }

  function SchrittUpdate(props) {
    K.useBeobachtbar(K.tresorStand);
    return html`
      <p>${K.t("onboarding.updateText")}</p>
      <${UI.Switch}
        label=${K.t("einstellungen.update")}
        wert=${K.tresor.daten().einstellungen.updatePruefung}
        beiAenderung=${function (w) {
          K.tresor.aendern(function (d) {
            d.einstellungen.updatePruefung = w;
          });
        }}
      />
      <${Knoepfe} zurueck=${props.zurueck} weiter=${props.weiter} />
    `;
  }

  function SchrittCheckliste(props) {
    K.useBeobachtbar(K.tresorStand);
    var erledigt = K.tresor.daten().checklisten.einmal || {};
    return html`
      <p>${K.t("onboarding.checklisteText")}</p>
      <ul class="rj-checklist">
        ${CHECKLISTE.map(function (k) {
          return html`<li key=${k}>
            <${UI.Checkbox}
              label=${K.t("checkliste." + k)}
              erklaerung=${K.t("checkliste." + k + "Text")}
              wert=${!!erledigt[k]}
              beiAenderung=${function (w) {
                K.tresor.aendern(function (d) {
                  d.checklisten.einmal = Object.assign({}, d.checklisten.einmal);
                  d.checklisten.einmal[k] = w;
                });
              }}
            />
          </li>`;
        })}
      </ul>
      <${Knoepfe} zurueck=${props.zurueck} weiter=${props.weiter} />
    `;
  }

  // Manuell oder per KI; die übrigen Bereiche lassen sich später unter Stammdaten ergänzen.
  function SchrittStammdaten(props) {
    var weg = hooks.useState("manuell");
    return html`
      <p>${K.t("onboarding.stammdatenText")}</p>
      <${UI.SegmentedControl}
        label=${K.t("onboarding.stammdatenWeg")}
        wert=${weg[0]}
        beiAenderung=${weg[1]}
        optionen=${[
          { wert: "manuell", label: K.t("onboarding.manuell"), icon: "pencil" },
          { wert: "ki", label: K.t("onboarding.import"), icon: "sparkles" },
        ]}
      />
      ${weg[0] === "manuell"
        ? html`<${S.PersoenlichFelder} />`
        : html`<${S.LebenslaufImport}
            beiFertig=${props.weiter}
            beiSelbst=${function () {
              weg[1]("manuell");
            }}
          />`}
      <${Knoepfe} zurueck=${props.zurueck} ueberspringen=${props.weiter} weiter=${props.weiter} />
    `;
  }

  function SchrittAusrichtung(props) {
    var name = hooks.useState("");
    var kurzprofil = hooks.useState({});
    var zuordnen = hooks.useState(true);
    var fehler = hooks.useState(null);
    var vorhanden = K.stammdaten.hatEintraege();

    function weiter() {
      if (!name[0].trim()) return fehler[1](K.t("feld.fehlt"));
      var a = { id: K.uuid(), name: name[0].trim(), kurzprofil: kurzprofil[0], kernkompetenzen: [] };
      K.stammdaten.speichern("ausrichtungen", a);
      if (vorhanden && zuordnen[0]) K.stammdaten.allenZuordnen(a.id);
      props.weiter();
    }

    return html`
      <p>${K.t("ausrichtung.erklaerung")}</p>
      <${UI.TextField} label=${K.t("ausrichtung.name")} hinweis=${K.t("ausrichtung.nameHinweis")} pflicht=${true} fehler=${fehler[0]} wert=${name[0]} beiAenderung=${name[1]} />
      <${UI.BilingualField}
        label=${K.t("ausrichtung.kurzprofil")}
        hinweis=${K.t("ausrichtung.kurzprofilHinweis")}
        mehrzeilig=${true}
        wert=${kurzprofil[0]}
        beiAenderung=${kurzprofil[1]}
      />
      ${vorhanden && html`<${UI.Checkbox} label=${K.t("onboarding.allenZuordnen")} wert=${zuordnen[0]} beiAenderung=${zuordnen[1]} />`}
      <${Knoepfe}
        zurueck=${props.zurueck}
        ueberspringen=${props.ueberspringen}
        weiter=${weiter}
        weiterText=${K.t("onboarding.fertig")}
      />
    `;
  }

  // Bis zur Bestätigung des Schlüssels entsteht nichts auf dem Stick.
  S.Onboarding = function (props) {
    var schritt = hooks.useState(props.schritt);
    var passwort = hooks.useState("");
    var wieder = hooks.useState("");
    var bestaetigung = hooks.useState("");
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);
    var bloecke = hooks.useState(K.krypto.neuerCode)[0];
    var n = schritt[0];

    function gehe(ziel) {
      fehler[1](null);
      if (ziel > SCHRITTE) {
        K.tresor.aendern(function (d) {
          delete d.einstellungen.onboardingSchritt;
        });
        K.speichernVersuchen();
        return K.zurApp();
      }
      if (K.tresor.offen()) {
        K.tresor.aendern(function (d) {
          d.einstellungen.onboardingSchritt = ziel;
        });
      }
      schritt[1](ziel);
    }

    function passwortWeiter() {
      var problem = K.krypto.passwortFehler(passwort[0], wieder[0]);
      if (problem) return fehler[1](K.t(problem));
      gehe(3);
    }

    async function erstellen() {
      if (!K.krypto.codeBeginntMit(bloecke, bestaetigung[0])) return fehler[1](K.t("schluessel.falscheBloecke"));
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.erstellen(props.name, passwort[0], bloecke);
        K.nachEntsperren();
      } catch (e) {
        laedt[1](false);
        fehler[1](K.fehlerText(e));
      }
    }

    function nach(ziel) {
      return function () {
        gehe(ziel);
      };
    }

    var inhalt;
    if (n === 1) {
      inhalt = html`<${S.DarstellungFelder} /><${Knoepfe} zurueck=${K.zuProfilen} weiter=${nach(2)} />`;
    } else if (n === 2) {
      inhalt = html`
        <p>${K.t("onboarding.passwortText")}</p>
        ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
        <${UI.PasswordField} neu=${true} label=${K.t("passwort.label")} hinweis=${K.t("passwort.hinweis")} wert=${passwort[0]} beiAenderung=${passwort[1]} />
        <${UI.PasswordField} neu=${true} label=${K.t("passwort.wiederholen")} wert=${wieder[0]} beiAenderung=${wieder[1]} />
        <${Knoepfe} zurueck=${nach(1)} weiter=${passwortWeiter} />
      `;
    } else if (n === 3) {
      inhalt = html`
        <${UI.SchluesselBlatt} bloecke=${bloecke} name=${props.name} />
        <div class="rj-noprint rj-stack">
          ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
          <${UI.TextField}
            label=${K.t("schluessel.bestaetigen")}
            hinweis=${K.t("schluessel.bestaetigenHinweis")}
            wert=${bestaetigung[0]}
            beiAenderung=${bestaetigung[1]}
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <${Knoepfe} zurueck=${nach(2)} weiter=${erstellen} laedt=${laedt[0]} />
      `;
    } else if (n === 4) {
      inhalt = html`<${SchrittBackup} weiter=${nach(5)} />`;
    } else if (n === 5) {
      inhalt = html`<${SchrittUpdate} zurueck=${nach(4)} weiter=${nach(6)} />`;
    } else if (n === 6) {
      inhalt = html`<${SchrittCheckliste} zurueck=${nach(5)} weiter=${nach(7)} />`;
    } else if (n === 7) {
      inhalt = html`<${SchrittStammdaten} zurueck=${nach(6)} weiter=${nach(8)} />`;
    } else {
      inhalt = html`<${SchrittAusrichtung} zurueck=${nach(7)} ueberspringen=${nach(9)} weiter=${nach(9)} />`;
    }
    return html`<${Geruest} schritt=${n}>${inhalt}<//>`;
  };

  // Ersetzt den Schlüssel erst, wenn der neue nachweislich notiert ist.
  S.SchluesselNeu = function () {
    var bloecke = hooks.useState(K.krypto.neuerCode)[0];
    var passwort = hooks.useState("");
    var bestaetigung = hooks.useState("");
    var alteWeg = hooks.useState(false);
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);

    async function ersetzen() {
      if (!K.krypto.codeBeginntMit(bloecke, bestaetigung[0])) return fehler[1](K.t("schluessel.falscheBloecke"));
      laedt[1](true);
      fehler[1](null);
      try {
        await K.tresor.codeErneuern(passwort[0], bloecke);
        await K.alteSicherungenEntfernen(alteWeg[0]);
        K.meldung(K.t("schluessel.ersetzt"));
        K.zurApp();
      } catch (e) {
        laedt[1](false);
        fehler[1](K.fehlerText(e));
      }
    }

    return html`<main class="rj-content" style="margin:0 auto;width:min(720px,100%)">
      <section class="rj-card rj-stack">
        <h1 class="h2">${K.t("schluessel.neuTitel")}</h1>
        <${UI.SchluesselBlatt} bloecke=${bloecke} name=${K.tresor.eintrag().name} />
        <div class="rj-noprint rj-stack">
          ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
          <${UI.TextField}
            label=${K.t("schluessel.bestaetigen")}
            hinweis=${K.t("schluessel.bestaetigenHinweis")}
            wert=${bestaetigung[0]}
            beiAenderung=${bestaetigung[1]}
            autocomplete="off"
            spellcheck="false"
          />
          <${UI.PasswordField} label=${K.t("passwort.label")} wert=${passwort[0]} beiAenderung=${passwort[1]} />
          <${UI.Checkbox} label=${K.t("backup.alteEntfernen")} erklaerung=${K.t("backup.alteEntfernenText")} wert=${alteWeg[0]} beiAenderung=${alteWeg[1]} />
        </div>
        <${Knoepfe} zurueck=${K.zurApp} weiter=${ersetzen} weiterText=${K.t("schluessel.ersetzen")} laedt=${laedt[0]} />
      </section>
    </main>`;
  };
})();
