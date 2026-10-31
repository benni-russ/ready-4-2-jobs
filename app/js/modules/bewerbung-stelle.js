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
              K.meldung(K.t("stelle.kiUebernommen"));
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

  // Nur diese Teile stehen unter Bearbeiten-Schutz. Keywords bleiben eine Arbeitsfläche.
  function formularWerte(b) {
    return {
      stelle: b.stelle,
      firma: b.firma,
      ansprechpartner: b.ansprechpartner,
      ausrichtungId: b.ausrichtungId,
      sprache: b.sprache,
      anrede: b.anrede,
    };
  }

  function formularSchreiben(b, e) {
    var anzeigeNeu = e.stelle.anzeigeText !== b.stelle.anzeigeText;
    K.bewerbungen.aendern(b.id, function (x) {
      var kopie = JSON.parse(JSON.stringify(e));
      x.stelle = kopie.stelle;
      x.firma = kopie.firma;
      x.ansprechpartner = kopie.ansprechpartner;
      x.ausrichtungId = kopie.ausrichtungId;
      if (x.sprache !== e.sprache || x.anrede !== e.anrede) K.anschreiben.satzWechseln(x, e.sprache, e.anrede);
    });
    if (anzeigeNeu) K.bewerbungen.anzeigeAnalysieren(b.id);
  }

  function Lesen(props) {
    var b = props.bewerbung;
    var d = K.tresor.daten();
    var a = b.ansprechpartner;
    var ausrichtung = d.ausrichtungen.filter(function (x) {
      return x.id === b.ausrichtungId;
    })[0];
    var anredeWort = a.anrede ? K.t(a.anrede === "frau" ? "stelle.anredeFrau" : "stelle.anredeHerr") : "";
    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.anzeige")}</h2>
        <${UI.LeseListe}
          eintraege=${[
            [K.t("bewerbung.stelle"), b.stelle.titel],
            [K.t("stelle.referenz"), b.stelle.referenz],
            [K.t("stelle.quelle"), b.stelle.quelle],
            [K.t("stelle.link"), b.stelle.link],
            [K.t("bewerbung.ausrichtung"), ausrichtung && ausrichtung.name],
            [K.t("bewerbung.sprache"), (S.sprachOptionen().filter(function (o) { return o.wert === b.sprache; })[0] || {}).label],
            [K.t("bewerbung.anrede"), (S.anredeOptionen().filter(function (o) { return o.wert === b.anrede; })[0] || {}).label],
          ]}
        />
        ${b.stelle.anzeigeText &&
        html`<div class="rj-accordion">
          <details>
            <summary>${K.t("bewerbung.anzeige")}<${UI.Icon} name="chevron-down" /></summary>
            <div style="white-space:pre-line">${b.stelle.anzeigeText}</div>
          </details>
        </div>`}
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.firma")}</h2>
        <${UI.LeseListe}
          eintraege=${[
            [K.t("bewerbung.firma"), b.firma.name],
            [K.t("stelle.adresse"), b.firma.adresse],
            [K.t("stelle.website"), b.firma.website],
            [K.t("stelle.branche"), b.firma.branche],
          ]}
        />
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.ansprechpartner")}</h2>
        <${UI.LeseListe}
          eintraege=${[
            [K.t("stelle.ansprechAnrede"), anredeWort],
            [K.t("stelle.ansprechName"), a.name],
            [K.t("stelle.ansprechPosition"), a.position],
            [K.t("stelle.ansprechEmail"), a.email],
            [K.t("stelle.ansprechTelefon"), a.telefon],
          ]}
        />
      </section>
    `;
  }

  S.BewerbungStelle = function (props) {
    var b = props.bewerbung;
    var d = K.tresor.daten();
    var neu = hooks.useState("");
    var kiOffen = hooks.useState(false);
    var f = UI.useEntwurf({
      lesen: function () {
        return formularWerte(b);
      },
      schreiben: function (e) {
        formularSchreiben(b, e);
      },
      pruefen: function (e) {
        return e.stelle.titel.trim() && e.firma.name.trim() ? "" : K.t("stelle.pflichtFehlt");
      },
    });
    var e = f.entwurf;

    // Feld schreibt in den Entwurf, gespeichert wird erst über die Leiste.
    function feld(bereich, name) {
      return {
        wert: (bereich ? e[bereich][name] : e[name]) || "",
        beiAenderung: function (w) {
          f.setze(function (x) {
            (bereich ? x[bereich] : x)[name] = w;
          });
        },
      };
    }

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
      ${!f.bearbeiten &&
      html`<div class="rj-aktionen">
        <${UI.Button}
          icon="sparkles"
          onClick=${function () {
            kiOffen[1](true);
          }}
        >
          ${K.t("stelle.kiTitel")}
        <//>
        <${UI.Button} icon="pencil" onClick=${f.starten}>${K.t("speichern.bearbeiten")}<//>
      </div>`}
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

      ${!f.bearbeiten && html`<${Lesen} bewerbung=${b} />`}
      ${f.bearbeiten &&
      html`<section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.anzeige")}</h2>
        <${UI.Textarea}
          label=${K.t("bewerbung.anzeige")}
          placeholder=${K.t("bewerbung.anzeigePlatzhalter")}
          rows="10"
          ...${feld("stelle", "anzeigeText")}
        />
        <div class="rj-grid-2">
          <${UI.TextField} label=${K.t("bewerbung.stelle")} placeholder=${K.t("bewerbung.stellePlatzhalter")} pflicht=${true} ...${feld("stelle", "titel")} />
          <${UI.TextField} label=${K.t("stelle.referenz")} placeholder=${K.t("stelle.referenzPlatzhalter")} ...${feld("stelle", "referenz")} />
          <${UI.TextField} label=${K.t("stelle.quelle")} placeholder=${K.t("stelle.quellePlatzhalter")} hinweis=${K.t("stelle.quelleHinweis")} ...${feld("stelle", "quelle")} />
          <${UI.TextField} label=${K.t("stelle.link")} placeholder=${K.t("stelle.linkPlatzhalter")} ...${feld("stelle", "link")} />
        </div>
        <div class="rj-grid-2">
          <${UI.Select}
            label=${K.t("bewerbung.ausrichtung")}
            optionen=${d.ausrichtungen.map(function (a) {
              return { wert: a.id, label: a.name };
            })}
            ...${feld(null, "ausrichtungId")}
          />
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.sprache")}</span>
            <${UI.SegmentedControl}
              label=${K.t("bewerbung.sprache")}
              wert=${e.sprache}
              optionen=${S.sprachOptionen()}
              beiAenderung=${feld(null, "sprache").beiAenderung}
            />
          </div>
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.anrede")}</span>
            <${UI.SegmentedControl}
              label=${K.t("bewerbung.anrede")}
              wert=${e.anrede}
              optionen=${S.anredeOptionen()}
              beiAenderung=${feld(null, "anrede").beiAenderung}
            />
          </div>
        </div>
      </section>

      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("stelle.firma")}</h2>
        <div class="rj-grid-2">
          <${UI.TextField} label=${K.t("bewerbung.firma")} placeholder=${K.t("bewerbung.firmaPlatzhalter")} pflicht=${true} ...${feld("firma", "name")} />
          <${UI.TextField} label=${K.t("stelle.website")} placeholder=${K.t("stelle.websitePlatzhalter")} ...${feld("firma", "website")} />
          <${UI.TextField} label=${K.t("stelle.branche")} placeholder=${K.t("stelle.branchePlatzhalter")} ...${feld("firma", "branche")} />
        </div>
        <${UI.Textarea} label=${K.t("stelle.adresse")} placeholder=${K.t("stelle.adressePlatzhalter")} hinweis=${K.t("stelle.adresseHinweis")} rows="3" ...${feld("firma", "adresse")} />
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
            ...${feld("ansprechpartner", "anrede")}
          />
          <${UI.TextField} label=${K.t("stelle.ansprechName")} placeholder=${K.t("stelle.ansprechNamePlatzhalter")} ...${feld("ansprechpartner", "name")} />
          <${UI.TextField} label=${K.t("stelle.ansprechPosition")} placeholder=${K.t("stelle.ansprechPositionPlatzhalter")} ...${feld("ansprechpartner", "position")} />
          <${UI.TextField} label=${K.t("stelle.ansprechEmail")} placeholder=${K.t("stelle.ansprechEmailPlatzhalter")} ...${feld("ansprechpartner", "email")} />
          <${UI.TextField} label=${K.t("stelle.ansprechTelefon")} placeholder=${K.t("stelle.ansprechTelefonPlatzhalter")} ...${feld("ansprechpartner", "telefon")} />
        </div>
      </section>

      <${UI.BearbeitenLeiste} form=${f} />`}
      ${kiOffen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("stelle.kiTitel")}
        breit=${true}
        beiSchliessen=${function () {
          kiOffen[1](false);
        }}
      >
        <p>${K.t("stelle.kiText")}</p>
        <${KiAnalyse}
          bewerbung=${b}
          beiFertig=${function () {
            kiOffen[1](false);
          }}
        />
      <//>`}
    `;
  };
})();
