(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function Fehlerliste(props) {
    return html`<${UI.Alert} art="danger">
      <strong>${K.t("kataloge.fehlerTitel")}</strong>
      <ul style="margin:0;padding-left:1.25em">
        ${props.fehler.map(function (f) {
          return html`<li key=${f.datei}>
            <strong>${f.datei}</strong>: ${f.meldungen.join(" ")}
          </li>`;
        })}
      </ul>
    <//>`;
  }

  var VORLAGE = {
    fragen: [
      { id: "frage-1", typ: "mc", frage: "...", antworten: ["...", "...", "...", "..."], richtig: [0], erklaerung: "..." },
      { id: "frage-2", typ: "karte", frage: "...", antworten: ["..."], richtig: [0] },
    ],
  };

  function kiKatalogLesen(antwort, kategorie, sprache) {
    var roh = K.ki.jsonLesen(antwort);
    var fragen = Array.isArray(roh) ? roh : roh && roh.fragen;
    return {
      kategorie: kategorie,
      sprache: sprache,
      fragen: (fragen || []).map(function (f, i) {
        return typeof f === "object" && f !== null ? Object.assign({ id: "frage-" + (i + 1) }, f) : f;
      }),
    };
  }

  // Die App kennt nur Thema, Kategorie und Sprache. Der Prompt enthält keine Profildaten.
  function KiKatalog(props) {
    var thema = hooks.useState("");
    var kategorie = hooks.useState(K.fragen.KATEGORIEN[0]);
    var sprache = hooks.useState(K.sprache());
    var vorschau = hooks.useState(null);
    var auswahl = hooks.useState([]);
    var laedt = hooks.useState(false);
    var fehler = hooks.useState("");

    function pruefen(antwort) {
      var katalog = kiKatalogLesen(antwort, kategorie[0], sprache[0]);
      var probleme = K.fragen.pruefen(katalog);
      if (probleme.length) return probleme;
      vorschau[1](katalog);
      auswahl[1](
        katalog.fragen.map(function (f) {
          return f.id;
        }),
      );
      return [];
    }

    async function speichern() {
      laedt[1](true);
      try {
        var gewaehlt = vorschau[0].fragen.filter(function (f) {
          return auswahl[0].indexOf(f.id) > -1;
        });
        await K.fragen.speichern(Object.assign({}, vorschau[0], { fragen: gewaehlt }), thema[0]);
        K.meldung(K.t("kataloge.importiert", { anzahl: 1 }));
        await props.beiNeuLesen();
        props.beiSchliessen();
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
      laedt[1](false);
    }

    var inhalt = vorschau[0]
      ? html`<${UI.ImportPreview}
          titel=${K.t("import.gueltig")}
          wert=${auswahl[0]}
          beiAenderung=${auswahl[1]}
          gruppen=${[
            {
              titel: K.t("vorbereitung.neueFragen"),
              eintraege: vorschau[0].fragen.map(function (f) {
                return { id: f.id, label: f.frage, erklaerung: f.richtig.map(function (i) { return f.antworten[i]; }).join(", ") };
              }),
            },
          ]}
        >
          ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
          <div class="rj-row">
            <${UI.Button} variante="primary" icon="check" laedt=${laedt[0]} disabled=${auswahl[0].length === 0 || laedt[0]} onClick=${speichern}>${K.t("kataloge.kiSpeichern")}<//>
            <${UI.Button}
              variante="ghost"
              onClick=${function () {
                vorschau[1](null);
              }}
              >${K.t("aktion.zurueck")}<//
            >
          </div>
        <//>`
      : html`
          <${UI.Alert} art="warning">${K.t("kataloge.datenschutz")}<//>
          <${UI.TextField} label=${K.t("kataloge.kiThema")} placeholder=${K.t("kataloge.kiThemaBeispiel")} wert=${thema[0]} beiAenderung=${thema[1]} />
          <div class="rj-grid-2">
            <${UI.Select}
              label=${K.t("vorbereitung.kategorie")}
              optionen=${K.fragen.KATEGORIEN.map(function (k) {
                return { wert: k, label: K.fragen.kategorieName(k) };
              })}
              wert=${kategorie[0]}
              beiAenderung=${kategorie[1]}
            />
            <${UI.Select}
              label=${K.t("vorbereitung.sprache")}
              optionen=${["de", "en"].map(function (s) {
                return { wert: s, label: K.t("fragen.sprache." + s) };
              })}
              wert=${sprache[0]}
              beiAenderung=${sprache[1]}
            />
          </div>
          ${thema[0].trim()
            ? html`<${UI.PromptPanel}
                prompt=${K.t("ki.promptKatalog", {
                  thema: thema[0].trim(),
                  kategorie: K.fragen.kategorieName(kategorie[0]),
                  sprache: K.t("fragen.sprache." + sprache[0]),
                  vorlage: JSON.stringify(VORLAGE, null, 2),
                })}
                beiPruefen=${pruefen}
              />`
            : html`<p class="rj-muted">${K.t("kataloge.kiThemaFehlt")}</p>`}
        `;

    return html`<${UI.Dialog} titel=${K.t("kataloge.kiTitel")} breit=${true} beiSchliessen=${props.beiSchliessen}>${inhalt}<//>`;
  }

  S.Kataloge = function (props) {
    var importFehler = hooks.useState([]);
    var loeschen = hooks.useState(null);
    var ki = hooks.useState(false);
    var eigene = K.fragen.eigene();

    async function importieren(dateien) {
      try {
        var r = await K.fragen.importieren(dateien);
        importFehler[1](r.fehler);
        if (r.fehler.length) document.getElementById("rj-live").textContent = K.t("kataloge.fehlerKurz", { anzahl: r.fehler.length });
        if (r.gespeichert.length) {
          K.meldung(K.t("kataloge.importiert", { anzahl: r.gespeichert.length }));
          await props.beiNeuLesen();
        }
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    async function entfernen() {
      try {
        await K.fragen.entfernen(loeschen[0].datei);
        loeschen[1](null);
        await props.beiNeuLesen();
        K.meldung(K.t("kataloge.entfernt"));
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    var mitgelieferte = K.fragen.kataloge().filter(function (k) {
      return !k.datei;
    });
    function zeile(k) {
      return {
        id: k.datei || k.kategorie + "-" + k.sprache,
        name: k.datei || K.fragen.kategorieName(k.kategorie),
        kategorie: K.fragen.kategorieName(k.kategorie),
        sprache: K.t("fragen.sprache." + k.sprache),
        anzahl: k.fragen.length,
        katalog: k,
      };
    }

    var spaltenEigene = [
      { schluessel: "name", titel: K.t("kataloge.datei") },
      { schluessel: "kategorie", titel: K.t("vorbereitung.kategorie") },
      { schluessel: "sprache", titel: K.t("vorbereitung.sprache") },
      { schluessel: "anzahl", titel: K.t("vorbereitung.fragen"), num: true },
      {
        schluessel: "aktion",
        titel: K.t("vorbereitung.aktion"),
        nurScreenreader: true,
        sortierbar: false,
        zelle: function (z) {
          return html`<${UI.IconButton}
            icon="trash-2"
            label=${K.t("kataloge.entfernen", { name: z.name })}
            onClick=${function () {
              loeschen[1](z.katalog);
            }}
          />`;
        },
      },
    ];

    var spaltenMit = [
      { schluessel: "name", titel: K.t("vorbereitung.kategorie") },
      { schluessel: "sprache", titel: K.t("vorbereitung.sprache") },
      { schluessel: "anzahl", titel: K.t("vorbereitung.fragen"), num: true },
    ];

    return html`
      <section class="rj-card rj-stack">
        <div class="rj-card__head">
          <h2 class="h3">${K.t("kataloge.importTitel")}</h2>
          <${UI.Button}
            icon="sparkles"
            onClick=${function () {
              ki[1](true);
            }}
            >${K.t("kataloge.kiKnopf")}<//
          >
        </div>
        <p>${K.t("kataloge.importText")}</p>
        <${UI.Alert} art="warning">${K.t("kataloge.datenschutz")}<//>
        <${UI.FileDrop} accept=".json" hinweis=${K.t("kataloge.dateiHinweis")} beiDateien=${importieren} />
        ${importFehler[0].length > 0 && html`<${Fehlerliste} fehler=${importFehler[0]} />`}
        <div class="rj-accordion">
          <details>
            <summary>${K.t("kataloge.format")}<${UI.Icon} name="chevron-down" /></summary>
            <div class="rj-stack">
              <p>${K.t("kataloge.formatText")}</p>
              <pre style="margin:0;overflow-x:auto">${K.t("kataloge.beispiel")}</pre>
            </div>
          </details>
        </div>
      </section>
      <section class="rj-stack">
        <div class="rj-row" style="justify-content:space-between">
          <h2 class="h3">${K.t("kataloge.eigene")}</h2>
          <${UI.Button} icon="refresh-cw" onClick=${props.beiNeuLesen}>${K.t("kataloge.neuLesen")}<//>
        </div>
        ${props.fehler.length > 0 && html`<${Fehlerliste} fehler=${props.fehler} />`}
        ${eigene.length === 0
          ? html`<p class="rj-muted">${K.t("kataloge.keine")}</p>`
          : html`<${UI.DataTable} label=${K.t("kataloge.eigene")} spalten=${spaltenEigene} zeilen=${eigene.map(zeile)} />`}
      </section>
      <section class="rj-stack">
        <h2 class="h3">${K.t("kataloge.mitgeliefert")}</h2>
        <${UI.DataTable} label=${K.t("kataloge.mitgeliefert")} spalten=${spaltenMit} zeilen=${mitgelieferte.map(zeile)} />
      </section>
      ${ki[0] &&
      html`<${KiKatalog}
        beiNeuLesen=${props.beiNeuLesen}
        beiSchliessen=${function () {
          ki[1](false);
        }}
      />`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("kataloge.entfernenTitel")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${entfernen}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
      >
        <p>${K.t("kataloge.entfernenText", { name: loeschen[0].datei })}</p>
      <//>`}
    `;
  };
})();
