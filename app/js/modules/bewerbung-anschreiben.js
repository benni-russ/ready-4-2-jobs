(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var PRUEF_WARTEZEIT_MS = 700;
  var A = K.anschreiben.ABSCHNITTE;

  function abschnittSchema() {
    var s = {};
    A.forEach(function (a) {
      s[a] = { typ: "text", pflicht: a !== "rahmen" };
    });
    return s;
  }

  function abschnittVorlage() {
    var v = {};
    A.forEach(function (a) {
      v[a] = "...";
    });
    return v;
  }

  function schalter(b, name) {
    return function (w) {
      K.bewerbungen.aendern(b.id, function (x) {
        x.anschreiben.rahmen[name] = w;
      });
    };
  }

  function uebernehmen(b, abschnitte) {
    K.bewerbungen.aendern(b.id, function (x) {
      A.forEach(function (a) {
        if (abschnitte[a] !== undefined) {
          x.anschreiben.abschnitte[a] = abschnitte[a];
          delete x.anschreiben.varianten[a];
        }
      });
    });
  }

  // Was die KI über dich erfährt: nur Fachliches zur Ausrichtung, keine Kontaktdaten.
  function profilAuszug(b) {
    var d = K.tresor.daten();
    var ausrichtung = d.ausrichtungen.filter(function (a) {
      return a.id === b.ausrichtungId;
    })[0];
    var erfolge = d.erfolge
      .filter(function (e) {
        return e.ausrichtungen.indexOf(b.ausrichtungId) > -1;
      })
      .map(function (e) {
        return "- " + K.i18nText(e.cvStichpunkt);
      });
    return [
      ausrichtung ? K.i18nText(ausrichtung.kurzprofil) : "",
      K.keywords.trefferNamen(b.keywords).join(", "),
      erfolge.join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function KiWorkflow(props) {
    var b = props.bewerbung;
    var ergebnis = hooks.useState(null);
    var aktiv = K.ki.platzhalterAktiv();
    var d = K.tresor.daten();

    function maskieren(text) {
      return aktiv ? K.ki.maskieren(text, d.profil, K.tresor.eintrag().name) : { text: text, karte: {} };
    }

    var korrektur = props.art === "korrektur";
    var maske = maskieren(korrektur ? JSON.stringify(b.anschreiben.abschnitte, null, 2) : profilAuszug(b) + "\n\n---\n\n" + b.stelle.anzeigeText);
    var sprache = K.t("bewerbung.sprache." + b.sprache);
    var prompt = korrektur
      ? K.t("ki.promptKorrektur", { sprache: sprache, text: maske.text, vorlage: JSON.stringify({ abschnitte: abschnittVorlage(), aenderungen: [{ vorher: "", nachher: "", grund: "" }] }, null, 2) })
      : K.t("ki.promptAnschreiben", {
          sprache: sprache,
          anrede: K.t("bewerbung.anrede" + (b.anrede === "du" ? "Du" : "Sie")),
          firma: b.firma.name,
          stelle: b.stelle.titel,
          text: maske.text,
          vorlage: JSON.stringify(abschnittVorlage(), null, 2),
        });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var schema = korrektur
        ? {
            abschnitte: { typ: "objekt", pflicht: true, felder: abschnittSchema() },
            aenderungen: { typ: "liste", eintrag: { vorher: { typ: "text" }, nachher: { typ: "text" }, grund: { typ: "text" } } },
          }
        : abschnittSchema();
      var probleme = K.ki.pruefen(roh, schema, K.t("anschreiben.kiBereich"));
      if (probleme.length) return probleme;
      ergebnis[1](korrektur ? roh : { abschnitte: roh });
      return [];
    }

    if (ergebnis[0]) {
      var r = ergebnis[0];
      return html`<div class="rj-stack">
        <${UI.Alert} art="success">${K.t("import.gueltig")}<//>
        ${(r.aenderungen || []).length > 0 &&
        html`<ul style="margin:0;padding-left:1.25em">
          ${r.aenderungen.map(function (a, i) {
            return html`<li key=${i}><s>${a.vorher}</s> → ${a.nachher}${a.grund ? " (" + a.grund + ")" : ""}</li>`;
          })}
        </ul>`}
        ${A.map(function (a) {
          return r.abschnitte[a] && html`<p key=${a}><strong>${K.t("anschreiben.abschnitt." + a)}:</strong> ${r.abschnitte[a]}</p>`;
        })}
        <div class="rj-row">
          <${UI.Button}
            variante="primary"
            icon="check"
            onClick=${function () {
              uebernehmen(b, r.abschnitte);
              K.meldung(K.t("anschreiben.kiUebernommen"));
              props.beiFertig();
            }}
          >
            ${K.t("import.uebernehmen")}
          <//>
          <${UI.Button}
            variante="ghost"
            onClick=${function () {
              ergebnis[1](null);
            }}
          >
            ${K.t("aktion.zurueck")}
          <//>
        </div>
      </div>`;
    }

    return html`<${UI.PromptPanel}
      prompt=${prompt}
      platzhalter=${aktiv}
      beiPlatzhalter=${function (w) {
        K.tresor.aendern(function (t) {
          t.einstellungen.kiPlatzhalter = w;
        });
      }}
      beiPruefen=${pruefen}
    />`;
  }

  function Vorschau(props) {
    var f = K.anschreiben.fertig(props.bewerbung);
    return html`<div class=${"rj-letter" + (f.postversand ? " rj-letter--post" : "")} lang=${props.bewerbung.sprache} role="group" aria-label=${K.t("anschreiben.vorschau")}>
      <div class="rj-letter__blatt">
      ${f.postversand && html`<span class="rj-letter__fenster" aria-hidden="true"></span>
        <span class="rj-letter__marke" style="--oben:105" aria-hidden="true"></span>
        <span class="rj-letter__marke rj-letter__marke--loch" style="--oben:148.5" aria-hidden="true"></span>
        <span class="rj-letter__marke" style="--oben:210" aria-hidden="true"></span>
        <p class="rj-letter__ruecksende">${f.ruecksende}</p>`}
      <p class="rj-letter__absender rj-letter__kopf">${f.absender}</p>
      <p class="rj-letter__anschrift">${f.empfaenger.join("\n")}</p>
      <p class="rj-letter__datum">${f.ortDatum}</p>
      <p class="rj-letter__betreff">${f.betreff}</p>
      ${f.referenz && html`<p class="rj-letter__absender">${f.referenz}</p>`}
      <p>${f.anrede}</p>
      ${f.absaetze.map(function (a, i) {
        return html`<p key=${i}>${a}</p>`;
      })}
      <p>${f.gruss}</p>
      <p>${f.name}</p>
      </div>
    </div>`;
  }

  // Der Schritt bleibt beim Reiterwechsel erhalten.
  var letzterSchritt = {};

  S.anschreibenZuSchritt = function (id, nr) {
    letzterSchritt[id] = nr;
  };

  function Abschnitt(props) {
    var b = props.bewerbung;
    var a = props.abschnitt;
    return html`<div class="rj-stack" style="gap:var(--space-2)">
      <${UI.Textarea}
        label=${props.label || K.t("anschreiben.abschnitt." + a)}
        placeholder=${K.t("anschreiben.platzhalter." + a)}
        rows="5"
        spellcheck="true"
        lang=${b.sprache}
        wert=${b.anschreiben.abschnitte[a]}
        beiAenderung=${function (w) {
          K.bewerbungen.aendern(b.id, function (x) {
            x.anschreiben.abschnitte[a] = w;
          });
        }}
      />
      <div class="rj-row">
        <${UI.Button}
          variante="ghost"
          icon="refresh-cw"
          onClick=${function () {
            var neu = K.anschreiben.andereFormulierung(b, a);
            K.bewerbungen.aendern(b.id, function (x) {
              x.anschreiben.abschnitte[a] = neu.text;
              x.anschreiben.varianten[a] = neu.id;
            });
          }}
        >
          ${K.t("anschreiben.andere")}
        <//>
        <${UI.Button}
          variante="ghost"
          icon="star"
          onClick=${function () {
            K.anschreiben.bausteinMerken(b, a, b.anschreiben.abschnitte[a]);
            K.meldung(K.t("anschreiben.gemerkt"));
          }}
        >
          ${K.t("anschreiben.merken")}
        <//>
      </div>
    </div>`;
  }

  function EigeneBausteine() {
    var liste = K.tresor.daten().bausteine;
    if (!liste.length) return null;
    return html`<details>
      <summary>${K.t("anschreiben.eigeneTitel", { n: liste.length })}<${UI.Icon} name="chevron-down" /></summary>
      <div class="rj-stack">
        ${liste.map(function (x) {
          return html`<${UI.FileItem} key=${x.id} icon="star" name=${K.t("anschreiben.abschnitt." + x.abschnitt)} meta=${x.text}>
            <${UI.IconButton}
              icon="trash-2"
              gefahr=${true}
              label=${K.t("anschreiben.bausteinLoeschen")}
              onClick=${function () {
                K.anschreiben.bausteinLoeschen(x.id);
              }}
            />
          <//>`;
        })}
      </div>
    </details>`;
  }

  S.BewerbungAnschreiben = function (props) {
    var b = props.bewerbung;
    var p = K.tresor.daten().profil;
    var pruefung = hooks.useState(null);
    var laedt = hooks.useState(false);
    var fehler = hooks.useState(null);
    var schritt = hooks.useState(letzterSchritt[b.id] || 1);
    var ki = hooks.useState(null);
    var stand = JSON.stringify([b.anschreiben, b.dokumente.mitUnterschrift, b.dokumente.postversand, b.firma, b.ansprechpartner, b.stelle.titel, b.stelle.referenz, b.keywords.treffer]);

    // Das echte PDF entscheidet, ob der Text auf eine Seite passt.
    hooks.useEffect(
      function () {
        var aktuell = true;
        var timer = window.setTimeout(async function () {
          try {
            var r = await K.anschreiben.erstellen(b);
            if (aktuell) pruefung[1](r);
          } catch (e) {
            if (aktuell) pruefung[1]({ fehler: K.fehlerText(e), hinweise: [] });
          }
        }, PRUEF_WARTEZEIT_MS);
        return function () {
          aktuell = false;
          window.clearTimeout(timer);
        };
      },
      [stand],
    );

    async function erstellen() {
      laedt[1](true);
      fehler[1](null);
      try {
        var r = await K.anschreiben.erstellen(b);
        await K.bewerbungen.snapshotSpeichern(b.id, "anschreiben", r.bytes, r.dateiname);
        K.meldung(K.t("dokument.erstellt"));
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
      laedt[1](false);
    }

    function wechseln(nr) {
      letzterSchritt[b.id] = nr;
      schritt[1](nr);
      window.scrollTo(0, 0);
      // Tastatur und Screenreader landen beim neuen Schritt, nicht am Anfang der Seite.
      window.setTimeout(function () {
        var kopf = document.querySelector(".rj-editor .rj-card h2");
        if (!kopf) return;
        kopf.setAttribute("tabindex", "-1");
        kopf.focus({ preventScroll: true });
      }, 0);
    }

    var r = pruefung[0];
    var nr = schritt[0];
    var rahmen = b.anschreiben.rahmen;
    var wertFehlt = (rahmen.eintritt && !p.verfuegbarAb) || (rahmen.kuendigungsfrist && !p.kuendigungsfrist) || (rahmen.gehalt && !p.gehaltsvorstellung);
    function kiKnopf(art, text) {
      return html`<div class="rj-row">
        <${UI.Button}
          icon="sparkles"
          onClick=${function () {
            ki[1](art);
          }}
        >
          ${K.t(text)}
        <//>
      </div>`;
    }

    return html`
      <${UI.Stepper} kompakt=${window.innerWidth <= 600} aktuell=${nr} beiWahl=${wechseln} schritte=${[K.t("anschreiben.rahmen"), K.t("anschreiben.schrittInhalt"), K.t("anschreiben.unterschrift"), K.t("anschreiben.schrittPruefen")]} />
      <div class="rj-editor">
      <div class="rj-stack">
        ${nr === 1 &&
        html`<section class="rj-card rj-stack">
          <h2 class="h3">${K.t("anschreiben.rahmen")}</h2>
          <p class="rj-muted">${K.t("anschreiben.rahmenHinweis")}</p>
          <${S.WissenLink} artikel="gehaltsverhandlung" />
          <${UI.Switch} label=${K.t("anschreiben.rahmenEintritt")} wert=${b.anschreiben.rahmen.eintritt} beiAenderung=${schalter(b, "eintritt")} />
          <${UI.Switch} label=${K.t("anschreiben.rahmenKuendigung")} wert=${b.anschreiben.rahmen.kuendigungsfrist} beiAenderung=${schalter(b, "kuendigungsfrist")} />
          <${UI.Switch} label=${K.t("anschreiben.rahmenGehalt")} wert=${b.anschreiben.rahmen.gehalt} beiAenderung=${schalter(b, "gehalt")} />
          ${wertFehlt &&
          html`<${UI.Alert} art="info">
            ${K.t("anschreiben.rahmenFehlt")} <a class="rj-link" href="#/stammdaten/persoenlich">${K.t("anschreiben.rahmenFehltLink")}</a>
          <//>`}
          <div class="rj-accordion">
            <details>
              <summary>${K.t("anschreiben.wortlautAendern")}<${UI.Icon} name="chevron-down" /></summary>
              <div class="rj-stack" style="padding:var(--space-4)">
                <p class="rj-muted">${K.t("anschreiben.platzhalterHinweis")}</p>
                <${Abschnitt} bewerbung=${b} abschnitt="rahmen" label=${K.t("anschreiben.wortlaut")} />
              </div>
            </details>
          </div>
        </section>`}
        ${nr === 2 &&
        html`<section class="rj-card rj-stack">
          <h2 class="h3">${K.t("anschreiben.schrittInhalt")}</h2>
          <p class="rj-muted">${K.t("anschreiben.vorschlagHinweis")} ${K.t("anschreiben.platzhalterHinweis")}</p>
          <${S.WissenLink} artikel="anschreiben-aufbau" />
          ${kiKnopf("anschreiben", "anschreiben.kiKnopf")}
          ${A.filter(function (x) {
            return x !== "rahmen";
          }).map(function (x) {
            return html`<${Abschnitt} bewerbung=${b} abschnitt=${x} key=${x} />`;
          })}
        </section>
        <div class="rj-accordion"><${EigeneBausteine} /></div>`}
        ${nr === 3 &&
        html`<section class="rj-card rj-stack">
          <h2 class="h3">${K.t("anschreiben.unterschrift")}</h2>
          <${UI.TextField}
            label=${K.t("anschreiben.signatur")}
            hinweis=${K.t("anschreiben.signaturHinweis")}
            placeholder=${K.anschreiben.nameStandard()}
            wert=${b.anschreiben.signatur == null ? K.anschreiben.nameStandard() : b.anschreiben.signatur}
            beiAenderung=${function (w) {
              K.bewerbungen.aendern(b.id, function (x) {
                x.anschreiben.signatur = w;
              });
            }}
          />
          <${UI.Switch}
            label=${K.t("anschreiben.unterschriftSchalter")}
            wert=${b.dokumente.mitUnterschrift}
            beiAenderung=${function (w) {
              K.bewerbungen.aendern(b.id, function (x) {
                x.dokumente.mitUnterschrift = w;
              });
            }}
          />
          ${b.dokumente.mitUnterschrift && html`<${UI.Alert} art="warning">${K.t("anschreiben.unterschriftWarnung")}<//>`}
          ${b.dokumente.mitUnterschrift && !p.unterschrift && html`<${UI.Alert} art="info">${K.t("anschreiben.unterschriftFehlt")}<//>`}
        </section>
        <section class="rj-card rj-stack">
          <h2 class="h3">${K.t("anschreiben.post")}</h2>
          <${UI.Switch}
            label=${K.t("anschreiben.postSchalter")}
            wert=${b.dokumente.postversand}
            beiAenderung=${function (w) {
              K.bewerbungen.aendern(b.id, function (x) {
                x.dokumente.postversand = w;
              });
            }}
          />
          <p class="rj-hint">${K.t("anschreiben.postHinweis")}</p>
        </section>`}
        ${nr === 4 &&
        html`<section class="rj-card rj-stack">
          <h2 class="h3">${K.t("anschreiben.schrittPruefen")}</h2>
          <p>${K.t("anschreiben.pruefenText")}</p>
          ${kiKnopf("korrektur", "anschreiben.korrekturKnopf")}
          <${S.DokumentZeile} bewerbung=${b} art="anschreiben" />
        </section>`}
        <div class="rj-row" style="justify-content:space-between">
          ${nr > 1
            ? html`<${UI.Button}
                icon="chevron-left"
                onClick=${function () {
                  wechseln(nr - 1);
                }}
              >
                ${K.t("aktion.zurueck")}
              <//>`
            : html`<span></span>`}
          ${nr < 4
            ? html`<${UI.Button}
                variante="primary"
                onClick=${function () {
                  wechseln(nr + 1);
                }}
              >
                ${K.t("aktion.weiter")}
              <//>`
            : html`<${UI.Button} variante="primary" icon="file-text" laedt=${laedt[0]} disabled=${laedt[0]} onClick=${erstellen}>${K.t("anschreiben.erstellen")}<//>`}
        </div>
      </div>
      <div class="rj-stack rj-editor__vorschau">
        ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
        ${r && r.fehler && html`<${UI.Alert} art="danger">${r.fehler}<//>`}
        ${r &&
        !r.fehler &&
        r.seiten <= K.anschreiben.MAX_SEITEN &&
        html`<${UI.Alert} art="success">${K.t("anschreiben.passt")}<//>`}
        ${r &&
        r.hinweise.map(function (h) {
          return html`<${UI.Alert} art="warning" key=${h.text}>${K.t(h.text, h.werte)}<//>`;
        })}
        <${UI.SegmentedControl}
          label=${K.t("anschreiben.vorschauArt")}
          wert=${b.dokumente.postversand ? "post" : "digital"}
          optionen=${[
            { wert: "digital", icon: "file-text", label: K.t("anschreiben.artDigital") },
            { wert: "post", icon: "mail", label: K.t("anschreiben.artPost") },
          ]}
          beiAenderung=${function (w) {
            K.bewerbungen.aendern(b.id, function (x) {
              x.dokumente.postversand = w === "post";
            });
          }}
        />
        <${Vorschau} bewerbung=${b} />
        ${b.dokumente.postversand && html`<p class="rj-hint">${K.t("anschreiben.postLegende")}</p>`}
      </div>
    </div>
    ${ki[0] &&
    html`<${UI.Dialog}
      titel=${K.t(ki[0] === "korrektur" ? "anschreiben.korrekturTitel" : "anschreiben.kiTitel")}
      breit=${true}
      beiSchliessen=${function () {
        ki[1](null);
      }}
    >
      <p>${K.t(ki[0] === "korrektur" ? "anschreiben.korrekturText" : "anschreiben.kiText")}</p>
      <${KiWorkflow}
        bewerbung=${b}
        art=${ki[0]}
        beiFertig=${function () {
          ki[1](null);
        }}
      />
    <//>`}`;
  };
})();
