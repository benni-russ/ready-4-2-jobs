(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ANSCHREIBEN_KURZ = 60;
  var EML_TYP = { "message/rfc822": [".eml"] };

  async function herunterladen(snapshot) {
    try {
      var bytes = await K.tresor.anlageLesen(snapshot.anlageId);
      if (await K.fs.speichernUnter(snapshot.dateiname, bytes, K.t("cv.dateityp"))) K.meldung(K.t("cv.gespeichert"));
    } catch (e) {
      K.meldung(K.fehlerText(e), "danger");
    }
  }

  S.DokumentZeile = function (props) {
    var s = props.bewerbung.dokumente[props.art];
    if (!s) return null;
    return html`<${UI.FileItem}
      name=${s.dateiname}
      meta=${K.t("dokument.meta", { art: K.t("dokument.art." + props.art), groesse: K.groesseText(s.groesse), datum: S.datumAnzeige(s.erzeugtAm) })}
    >
      <${UI.IconButton}
        icon="download"
        label=${K.t("dokument.herunterladen", { name: s.dateiname })}
        onClick=${function () {
          herunterladen(s);
        }}
      />
    <//>`;
  };

  // Das Gesamt-PDF enthält die Einzelteile, beides zusammen wäre doppelt.
  function vorauswahl(b) {
    if (b.dokumente.gesamtPdf) return ["gesamtPdf"];
    return ["anschreiben", "lebenslauf", "anlagenPdf"].filter(function (a) {
      return b.dokumente[a];
    });
  }

  function EmailDialog(props) {
    var b = props.bewerbung;
    var vorschlag = hooks.useMemo(function () {
      return K.anschreiben.emailVorschlag(b);
    }, []);
    var w = hooks.useState(vorschlag);
    var auswahl = hooks.useState(vorauswahl(b));
    var laedt = hooks.useState(false);
    var fehler = hooks.useState(null);
    var vorhanden = K.bewerbungen.SNAPSHOTS.filter(function (a) {
      return b.dokumente[a];
    });
    var summe = auswahl[0].reduce(function (s, a) {
      return s + b.dokumente[a].groesse;
    }, 0);

    function setzen(feld) {
      return function (v) {
        var neu = Object.assign({}, w[0]);
        neu[feld] = v;
        w[1](neu);
      };
    }

    async function erstellen() {
      laedt[1](true);
      fehler[1](null);
      try {
        var p = K.tresor.daten().profil;
        var anhaenge = [];
        for (var i = 0; i < auswahl[0].length; i++) {
          var s = b.dokumente[auswahl[0][i]];
          anhaenge.push({ name: s.dateiname, mime: "application/pdf", bytes: await K.tresor.anlageLesen(s.anlageId) });
        }
        var bytes = K.eml.erzeugen({
          vonName: [p.vorname, p.nachname].filter(Boolean).join(" "),
          vonEmail: p.email,
          an: w[0].an,
          betreff: w[0].betreff,
          text: w[0].text,
          anhaenge: anhaenge,
        });
        await K.bewerbungen.emailSpeichern(
          b.id,
          {
            an: w[0].an,
            betreff: w[0].betreff,
            text: w[0].text,
            anhaenge: anhaenge.map(function (a) {
              return a.name;
            }),
            dateiname: K.dateiname([p.vorname, p.nachname, "bewerbung", b.firma.name], "eml"),
          },
          bytes,
        );
        K.meldung(K.t("email.erstellt"));
        props.beiSchliessen();
      } catch (e) {
        fehler[1](K.fehlerText(e));
        laedt[1](false);
      }
    }

    return html`<${UI.Dialog} titel=${K.t("email.titel")} breit=${true} bestaetigen=${K.t("email.erstellen")} laedt=${laedt[0]} beiBestaetigen=${erstellen} beiSchliessen=${props.beiSchliessen}>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <${UI.TextField} label=${K.t("email.an")} wert=${w[0].an} beiAenderung=${setzen("an")} hinweis=${K.t("email.anHinweis")} />
      <${UI.TextField} label=${K.t("email.betreff")} wert=${w[0].betreff} beiAenderung=${setzen("betreff")} />
      <${UI.Textarea} label=${K.t("email.text")} rows="8" spellcheck="true" lang=${b.sprache} wert=${w[0].text} beiAenderung=${setzen("text")} />
      <div class="rj-stack" style="gap:0">
        <span class="rj-label">${K.t("email.anhaenge")}</span>
        ${vorhanden.map(function (a) {
          var s = b.dokumente[a];
          return html`<${UI.Checkbox}
            key=${a}
            label=${s.dateiname}
            erklaerung=${K.groesseText(s.groesse)}
            wert=${auswahl[0].indexOf(a) > -1}
            beiAenderung=${function (an) {
              var rest = auswahl[0].filter(function (x) {
                return x !== a;
              });
              auswahl[1](an ? rest.concat([a]) : rest);
            }}
          />`;
        })}
      </div>
      <${UI.SizeMeter} bytes=${summe} grenze=${K.anlagenPdf.MAX_BYTES} />
    <//>`;
  }

  function Entwuerfe(props) {
    var b = props.bewerbung;
    var geoeffnet = hooks.useState(null);

    async function oeffnen(e) {
      try {
        await K.profile.exportSchreiben(e.dateiname, await K.tresor.anlageLesen(e.anlageId));
        geoeffnet[1](e.dateiname);
      } catch (f) {
        K.meldung(K.fehlerText(f), "danger");
      }
    }

    async function speichern(e) {
      try {
        var bytes = await K.tresor.anlageLesen(e.anlageId);
        if (await K.fs.speichernUnter(e.dateiname, bytes, K.t("email.dateityp"), EML_TYP)) K.meldung(K.t("cv.gespeichert"));
      } catch (f) {
        K.meldung(K.fehlerText(f), "danger");
      }
    }

    async function loeschen(e) {
      try {
        await K.bewerbungen.emailLoeschen(b.id, e.id);
        K.meldung(K.t("email.geloescht"));
      } catch (f) {
        K.meldung(K.fehlerText(f), "danger");
      }
    }

    return html`
      ${geoeffnet[0] && html`<${UI.Alert} art="info" titel=${K.t("email.exportTitel")}>${K.t("email.exportText", { datei: geoeffnet[0] })}<//>`}
      ${b.emails.map(function (e) {
        return html`<${UI.FileItem}
          key=${e.id}
          icon="mail"
          name=${e.betreff}
          meta=${K.t("email.meta", { groesse: K.groesseText(e.groesse), anzahl: e.anhaenge.length, datum: S.datumAnzeige(e.erstellt) })}
        >
          <${UI.IconButton}
            icon="external-link"
            label=${K.t("email.oeffnen")}
            onClick=${function () {
              oeffnen(e);
            }}
          />
          <${UI.IconButton}
            icon="download"
            label=${K.t("email.speichern")}
            onClick=${function () {
              speichern(e);
            }}
          />
          <${UI.IconButton}
            icon="trash-2"
            gefahr=${true}
            label=${K.t("email.loeschen")}
            onClick=${function () {
              loeschen(e);
            }}
          />
        <//>`;
      })}
    `;
  }

  function adresseText(a) {
    if (!a) return "";
    return [a.strasse, [a.plz, a.ort].filter(Boolean).join(" "), a.land].filter(Boolean).join(", ");
  }

  // Einzelfelder für Bewerbungsportale, in der üblichen Reihenfolge der Formulare.
  function portalFelder(b) {
    var p = K.tresor.daten().profil;
    var anschreiben = K.anschreiben.klartext(b);
    var a = p.adresse || {};
    var felder = [
      ["vorname", p.vorname],
      ["nachname", p.nachname],
      ["email", p.email],
      ["telefon", p.telefon],
      ["strasse", a.strasse],
      ["plz", a.plz],
      ["ort", a.ort],
      ["adresse", adresseText(p.adresse)],
      ["linkedin", p.linkedin],
      ["xing", p.xing],
      ["website", p.website],
      ["eintritt", K.anschreiben.datum(p.verfuegbarAb, b.sprache)],
      ["kuendigung", p.kuendigungsfrist],
      ["gehalt", p.gehaltsvorstellung],
    ]
      .filter(function (f) {
        return f[1];
      })
      .map(function (f) {
        return { label: K.t("portal." + f[0]), wert: f[1] };
      });
    felder.push({
      label: K.t("portal.anschreiben"),
      wert: anschreiben,
      anzeige: anschreiben.length > ANSCHREIBEN_KURZ ? anschreiben.slice(0, ANSCHREIBEN_KURZ) + " …" : anschreiben,
    });
    return felder;
  }

  function VersendetDialog(props) {
    var heute = new Date();
    var datum = hooks.useState(new Date(heute.getTime() - heute.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    var fehler = hooks.useState(null);

    function bestaetigen() {
      if (!datum[0]) return fehler[1](K.t("versand.datumFehler"));
      K.bewerbungen.versendet(props.bewerbung.id, new Date(datum[0] + "T12:00").toISOString());
      K.meldung(K.t("versand.gesetzt"));
      props.beiSchliessen();
    }

    return html`<${UI.Dialog} titel=${K.t("versand.dialogTitel")} bestaetigen=${K.t("versand.bestaetigen")} beiBestaetigen=${bestaetigen} beiSchliessen=${props.beiSchliessen}>
      <p>${K.t("versand.dialogText")}</p>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <${UI.DatePicker} label=${K.t("versand.datum")} wert=${datum[0]} beiAenderung=${datum[1]} />
    <//>`;
  }

  S.BewerbungVersand = function (props) {
    var b = props.bewerbung;
    var email = hooks.useState(false);
    var versendet = hooks.useState(false);
    var ansicht = hooks.useState("email");
    var dokumente = K.bewerbungen.SNAPSHOTS.filter(function (a) {
      return b.dokumente[a];
    });

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("versand.dokumente")}</h2>
        ${dokumente.length === 0 && html`<${UI.Alert} art="info">${K.t("versand.keineDokumente")}<//>`}
        ${dokumente.map(function (a) {
          return html`<${S.DokumentZeile} bewerbung=${b} art=${a} key=${a} />`;
        })}
      </section>
      <section class="rj-card rj-stack">
        <div class="rj-field">
          <span class="rj-label">${K.t("versand.weg")}</span>
          <${UI.SegmentedControl}
            label=${K.t("versand.weg")}
            wert=${ansicht[0]}
            optionen=${[
              { wert: "email", label: K.t("versand.email"), icon: "mail" },
              { wert: "portal", label: K.t("versand.portal"), icon: "copy" },
            ]}
            beiAenderung=${ansicht[1]}
          />
        </div>
        ${ansicht[0] === "email" &&
        html`<p class="rj-muted">${K.t("versand.emailText")}</p>
          <div class="rj-row">
            <${UI.Button}
              variante="primary"
              icon="mail"
              disabled=${dokumente.length === 0}
              onClick=${function () {
                email[1](true);
              }}
            >
              ${K.t("email.erstellen")}
            <//>
          </div>
          <${Entwuerfe} bewerbung=${b} />`}
        ${ansicht[0] === "portal" &&
        html`<p class="rj-muted">${K.t("versand.portalText")}</p>
          <${UI.CopyFieldList} felder=${portalFelder(b)} />`}
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("versand.abschluss")}</h2>
        ${b.versendetAm
          ? html`<${UI.Alert} art="success">${K.t("versand.warVersendet", { datum: S.datumAnzeige(b.versendetAm) })}<//>`
          : html`<p class="rj-muted">${K.t("versand.abschlussText")}</p>
              <div class="rj-row">
                <${UI.Button}
                  icon="send"
                  onClick=${function () {
                    versendet[1](true);
                  }}
                >
                  ${K.t("versand.markieren")}
                <//>
              </div>`}
      </section>
      ${email[0] &&
      html`<${EmailDialog}
        bewerbung=${b}
        beiSchliessen=${function () {
          email[1](false);
        }}
      />`}
      ${versendet[0] &&
      html`<${VersendetDialog}
        bewerbung=${b}
        beiSchliessen=${function () {
          versendet[1](false);
        }}
      />`}
    `;
  };
})();
