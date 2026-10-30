(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var VORLAGE = {
    firma: "",
    titel: "",
    branche: "",
    groesse: "",
    adresse: "",
    website: "",
    keywords: ["..."],
    anforderungen: ["..."],
    unternehmensinfos: "",
  };

  var SCHEMA = {
    firma: { typ: "text" },
    titel: { typ: "text" },
    branche: { typ: "text" },
    groesse: { typ: "text" },
    adresse: { typ: "text" },
    website: { typ: "text" },
    keywords: { typ: "liste", pflicht: true },
    anforderungen: { typ: "liste" },
    unternehmensinfos: { typ: "text" },
  };

  // Feld schreibt direkt in die Bewerbung, der Tresor speichert verzögert.
  function feld(b, bereich, name) {
    return {
      wert: (bereich ? b[bereich][name] : b[name]) || "",
      beiAenderung: function (w) {
        K.bewerbungen.aendern(b.id, function (x) {
          (bereich ? x[bereich] : x)[name] = w;
        });
      },
    };
  }

  // Vorhandene Eingaben bleiben, die KI füllt nur Lücken.
  function uebernehmen(b, r) {
    K.bewerbungen.aendern(b.id, function (x) {
      ["branche", "groesse", "adresse", "website"].forEach(function (f) {
        if (r[f] && !x.firma[f]) x.firma[f] = r[f];
      });
      if (r.titel && !x.stelle.titel) x.stelle.titel = r.titel;
    });
    (r.keywords || []).forEach(function (k) {
      K.bewerbungen.keywordHinzufuegen(b.id, k);
    });
  }

  function KiAnalyse(props) {
    var b = props.bewerbung;
    var ergebnis = hooks.useState(null);
    var aktiv = K.ki.platzhalterAktiv();
    var d = K.tresor.daten();
    var maske = aktiv ? K.ki.maskieren(b.stelle.anzeigeText, d.profil, K.tresor.eintrag().name) : { text: b.stelle.anzeigeText, karte: {} };
    var prompt = K.t("ki.promptStelle", { vorlage: JSON.stringify(VORLAGE, null, 2), anzeige: maske.text });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var probleme = K.ki.pruefen(roh, SCHEMA, K.t("stelle.kiBereich"));
      if (probleme.length) return probleme;
      if (!roh.keywords.length) throw K.Fehler("ki.fehlerLeerJson");
      ergebnis[1](roh);
      return [];
    }

    if (ergebnis[0]) {
      var r = ergebnis[0];
      return html`<div class="rj-stack">
        <${UI.Alert} art="success">${K.t("import.gueltig")}<//>
        <div class="rj-chips">
          ${r.keywords.map(function (k) {
            return html`<span class="rj-chip" key=${k}>${k}</span>`;
          })}
        </div>
        ${(r.anforderungen || []).length > 0 &&
        html`<ul style="margin:0;padding-left:1.25em">
          ${r.anforderungen.map(function (a, i) {
            return html`<li key=${i}>${a}</li>`;
          })}
        </ul>`}
        ${r.unternehmensinfos && html`<p>${r.unternehmensinfos}</p>`}
        <div class="rj-row">
          <${UI.Button}
            variante="primary"
            icon="check"
            onClick=${function () {
              uebernehmen(b, r);
              ergebnis[1](null);
              K.meldung(K.t("stelle.kiUebernommen"));
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

  S.BewerbungStelle = function (props) {
    var b = props.bewerbung;
    var d = K.tresor.daten();
    var neu = hooks.useState("");

    function luecke(name) {
      var id = K.stammdaten.kompetenzAnlegen(name);
      K.tresor.aendern(function (t) {
        t.kompetenzen.forEach(function (k) {
          if (k.id === id) k.ausrichtungen.push(b.ausrichtungId);
        });
      });
      K.bewerbungen.keywordsAbgleichen(b.id);
      K.meldung(K.t("match.angelegt", { name: name }));
    }

    function hinzufuegen() {
      K.bewerbungen.keywordHinzufuegen(b.id, neu[0]);
      neu[1]("");
    }

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.passung")}</h2>
        <${UI.KeywordMatch}
          kw=${b.keywords}
          beiLuecke=${luecke}
          beiEntfernen=${function (n) {
            K.bewerbungen.keywordEntfernen(b.id, n);
          }}
          beiEntfernenTreffer=${function (id) {
            K.bewerbungen.trefferEntfernen(b.id, id);
          }}
        />
        <div class="rj-row" style="align-items:flex-end">
          <div style="flex:1;min-width:200px">
            <${UI.TextField}
              label=${K.t("stelle.keywordNeu")}
              placeholder=${K.t("stelle.keywordPlatzhalter")}
              wert=${neu[0]}
              beiAenderung=${neu[1]}
              onKeyDown=${function (e) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  hinzufuegen();
                }
              }}
            />
          </div>
          <${UI.Button} icon="plus" onClick=${hinzufuegen}>${K.t("stelle.keywordHinzufuegen")}<//>
        </div>
      </section>

      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.anzeige")}</h2>
        <${UI.Textarea}
          label=${K.t("bewerbung.anzeige")}
          placeholder=${K.t("bewerbung.anzeigePlatzhalter")}
          rows="10"
          ...${feld(b, "stelle", "anzeigeText")}
          onBlur=${function () {
            K.bewerbungen.anzeigeAnalysieren(b.id);
          }}
        />
        <div class="rj-grid-2">
          <${UI.TextField} label=${K.t("bewerbung.stelle")} placeholder=${K.t("bewerbung.stellePlatzhalter")} pflicht=${true} ...${feld(b, "stelle", "titel")} />
          <${UI.TextField} label=${K.t("stelle.referenz")} placeholder=${K.t("stelle.referenzPlatzhalter")} ...${feld(b, "stelle", "referenz")} />
          <${UI.TextField} label=${K.t("stelle.quelle")} placeholder=${K.t("stelle.quellePlatzhalter")} hinweis=${K.t("stelle.quelleHinweis")} ...${feld(b, "stelle", "quelle")} />
          <${UI.TextField} label=${K.t("stelle.link")} placeholder=${K.t("stelle.linkPlatzhalter")} ...${feld(b, "stelle", "link")} />
        </div>
        <${UI.Select}
          label=${K.t("bewerbung.ausrichtung")}
          optionen=${d.ausrichtungen.map(function (a) {
            return { wert: a.id, label: a.name };
          })}
          ...${feld(b, null, "ausrichtungId")}
        />
        <div class="rj-grid-2">
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.sprache")}</span>
            <${UI.SegmentedControl}
              label=${K.t("bewerbung.sprache")}
              wert=${b.sprache}
              optionen=${S.sprachOptionen()}
              beiAenderung=${function (w) {
                K.bewerbungen.aendern(b.id, function (x) {
                  K.anschreiben.satzWechseln(x, w, x.anrede);
                });
              }}
            />
          </div>
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.anrede")}</span>
            <${UI.SegmentedControl}
              label=${K.t("bewerbung.anrede")}
              wert=${b.anrede}
              optionen=${S.anredeOptionen()}
              beiAenderung=${function (w) {
                K.bewerbungen.aendern(b.id, function (x) {
                  K.anschreiben.satzWechseln(x, x.sprache, w);
                });
              }}
            />
          </div>
        </div>
      </section>

      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.firma")}</h2>
        <${UI.TextField} label=${K.t("bewerbung.firma")} placeholder=${K.t("bewerbung.firmaPlatzhalter")} pflicht=${true} ...${feld(b, "firma", "name")} />
        <${UI.Textarea} label=${K.t("stelle.adresse")} placeholder=${K.t("stelle.adressePlatzhalter")} hinweis=${K.t("stelle.adresseHinweis")} rows="3" ...${feld(b, "firma", "adresse")} />
        <div class="rj-grid-2">
          <${UI.TextField} label=${K.t("stelle.website")} placeholder=${K.t("stelle.websitePlatzhalter")} ...${feld(b, "firma", "website")} />
          <${UI.TextField} label=${K.t("stelle.branche")} placeholder=${K.t("stelle.branchePlatzhalter")} ...${feld(b, "firma", "branche")} />
        </div>
      </section>

      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.ansprechpartner")}</h2>
        <div class="rj-grid-2">
          <${UI.Select}
            label=${K.t("stelle.ansprechAnrede")}
            optionen=${[
              { wert: "", label: K.t("stelle.anredeOffen") },
              { wert: "frau", label: K.t("stelle.anredeFrau") },
              { wert: "herr", label: K.t("stelle.anredeHerr") },
            ]}
            ...${feld(b, "ansprechpartner", "anrede")}
          />
          <${UI.TextField} label=${K.t("stelle.ansprechName")} placeholder=${K.t("stelle.ansprechNamePlatzhalter")} ...${feld(b, "ansprechpartner", "name")} />
          <${UI.TextField} label=${K.t("stelle.ansprechPosition")} placeholder=${K.t("stelle.ansprechPositionPlatzhalter")} ...${feld(b, "ansprechpartner", "position")} />
          <${UI.TextField} label=${K.t("stelle.ansprechEmail")} placeholder=${K.t("stelle.ansprechEmailPlatzhalter")} ...${feld(b, "ansprechpartner", "email")} />
          <${UI.TextField} label=${K.t("stelle.ansprechTelefon")} placeholder=${K.t("stelle.ansprechTelefonPlatzhalter")} ...${feld(b, "ansprechpartner", "telefon")} />
        </div>
      </section>

      <div class="rj-accordion">
        <details>
          <summary>${K.t("stelle.kiTitel")}</summary>
          <div class="rj-stack">
            <p>${K.t("stelle.kiText")}</p>
            <${KiAnalyse} bewerbung=${b} />
          </div>
        </details>
      </div>
    `;
  };
})();
