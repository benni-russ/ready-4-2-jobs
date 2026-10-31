(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  // Kontextbezogener Sprung aus einem Modul in den passenden Artikel.
  S.WissenLink = function (props) {
    return html`<p class="rj-hint"><a class="rj-link" href=${"#/wissen/" + props.artikel}>${K.t("wissen.link." + props.artikel)}</a></p>`;
  };

  function Editor(props) {
    var a = props.artikel;
    var entwurf = hooks.useState({
      titel: a ? a.titel : "",
      kategorie: a ? a.kategorie : "",
      quellen: a ? a.quellen.map(function (q) { return q.titel + " | " + q.url; }).join("\n") : "",
      text: a ? a.text.trim() : "",
    });
    var fehler = hooks.useState({});
    var laedt = hooks.useState(false);
    var ersetzen = hooks.useState(null);
    var e = entwurf[0];
    var aktuell = hooks.useRef(e);
    aktuell.current = e;
    var basis = hooks.useRef(JSON.stringify(e));

    function setze(feld) {
      return function (wert) {
        var neu = Object.assign({}, aktuell.current);
        neu[feld] = wert;
        entwurf[1](neu);
      };
    }

    function quellenZeilen(wert) {
      return wert.split(/\r?\n/).filter(function (z) {
        return z.trim();
      });
    }

    // Beim Sichern ohne Rückfrage bleiben gültige Quellen auch dann erhalten, wenn eine Zeile unlesbar ist.
    function schreiben() {
      var w = aktuell.current;
      return K.wissen.speichern({ datei: a && a.datei, titel: w.titel.trim() || K.t("wissen.entwurfTitel"), kategorie: w.kategorie, text: w.text, quellen: K.wissen.quellenLesen(quellenZeilen(w.quellen).join(" ;; ")) });
    }

    hooks.useEffect(function () {
      K.brotkrumenTitel.set({ titel: a ? a.titel : "" });
      function geaendert() {
        return JSON.stringify(aktuell.current) !== basis.current;
      }
      K.verlassenSchutz.setzen(geaendert, function () {
        if (!aktuell.current.titel.trim() && !aktuell.current.text.trim()) return;
        schreiben().catch(function (x) {
          K.meldung(K.fehlerText(x), "danger");
        });
      });
      return function () {
        K.verlassenSchutz.loesen(geaendert);
      };
    }, []);

    async function speichern() {
      var problem = {};
      if (!e.titel.trim()) problem.titel = K.t("wissen.fehlerTitel");
      if (!e.text.trim()) problem.text = K.t("wissen.fehlerText");
      var zeilen = quellenZeilen(e.quellen);
      if (K.wissen.quellenLesen(zeilen.join(" ;; ")).length !== zeilen.length) problem.quellen = K.t("wissen.fehlerQuellen");
      fehler[1](problem);
      if (Object.keys(problem).length) return;
      laedt[1](true);
      try {
        var kennung = await schreiben();
        basis.current = JSON.stringify(aktuell.current);
        await props.beiNeuLesen();
        K.meldung(K.t("speichern.gespeichert"));
        K.navigieren("wissen/" + encodeURIComponent(kennung));
      } catch (x) {
        fehler[1]({ allgemein: K.fehlerText(x) });
      }
      laedt[1](false);
    }

    async function dateiLesen(dateien) {
      try {
        var inhalt = await K.kiInterview.dateiLesen(dateien[0]);
        var f = K.frontmatter(inhalt);
        entwurf[1](
          Object.assign({}, aktuell.current, {
            titel: f.felder.title || aktuell.current.titel || dateien[0].name.replace(/\.[^.]+$/, ""),
            kategorie: f.felder.category || aktuell.current.kategorie,
            text: f.rest.trim(),
          }),
        );
        fehler[1]({});
      } catch (x) {
        fehler[1]({ allgemein: K.fehlerText(x) });
      }
    }

    function dateiGewaehlt(dateien) {
      if (aktuell.current.text.trim()) ersetzen[1](dateien);
      else dateiLesen(dateien);
    }

    var vorschau = hooks.useMemo(
      function () {
        return K.wissen.alsHtml(e.text);
      },
      [e.text],
    );

    return html`
      <div class="rj-pagehead"><h1 class="h1">${K.t(a ? "wissen.bearbeiten" : "wissen.neu")}</h1></div>
      <${UI.Alert} art="warning">${K.t("wissen.datenschutz")}<//>
      <div class="rj-grid-2 rj-wissen-editor">
        <div class="rj-stack">
          <${UI.TextField} label=${K.t("wissen.titel")} pflicht=${true} fehler=${fehler[0].titel} wert=${e.titel} beiAenderung=${setze("titel")} />
          <${UI.TextField} label=${K.t("wissen.kategorie")} wert=${e.kategorie} beiAenderung=${setze("kategorie")} />
          <${UI.Textarea} label=${K.t("wissen.text")} pflicht=${true} fehler=${fehler[0].text} hinweis=${K.t("wissen.textHinweis")} wert=${e.text} beiAenderung=${setze("text")} rows="16" spellcheck="true" />
          <${UI.Textarea} label=${K.t("wissen.quellen")} fehler=${fehler[0].quellen} hinweis=${K.t("wissen.quellenHinweis")} wert=${e.quellen} beiAenderung=${setze("quellen")} rows="3" spellcheck="false" />
          <${UI.FileDrop} accept=".md,.txt" hinweis=${K.t("wissen.dateiHinweis")} beiDateien=${dateiGewaehlt} />
        </div>
        <section class="rj-card rj-stack" aria-label=${K.t("wissen.vorschau")}>
          <h2 class="h3">${K.t("wissen.vorschau")}</h2>
          <div class="rj-prose" dangerouslySetInnerHTML=${{ __html: vorschau }}></div>
        </section>
      </div>
      <div class="rj-editbar rj-editbar--klebt">
        ${fehler[0].allgemein ? html`<${UI.Alert} art="danger">${fehler[0].allgemein}<//>` : html`<span class="rj-muted">${K.t("speichern.entwurfHinweis")}</span>`}
        <div class="rj-editbar__aktionen">
          <${UI.Button} variante="ghost" href=${a ? "#/wissen/" + encodeURIComponent(a.kennung) : "#/wissen"}>${K.t("aktion.abbrechen")}<//>
          <${UI.Button} variante="primary" icon="save" laedt=${laedt[0]} disabled=${laedt[0]} onClick=${speichern}>${K.t("speichern.speichern")}<//>
        </div>
      </div>
      ${ersetzen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("wissen.ersetzenTitel")}
        bestaetigen=${K.t("wissen.ersetzenKnopf")}
        beiBestaetigen=${function () {
          dateiLesen(ersetzen[0]);
          ersetzen[1](null);
        }}
        beiSchliessen=${function () {
          ersetzen[1](null);
        }}
      >
        <p>${K.t("wissen.ersetzenText")}</p>
      <//>`}
    `;
  }

  function Quellen(props) {
    return html`<section class="rj-wissen-quellen">
      <h2 class="h3">${K.t("wissen.quellen")}</h2>
      <ol>
        ${props.quellen.map(function (q) {
          return html`<li key=${q.url}><a class="rj-link" href=${q.url} target="_blank" rel="noopener noreferrer">${q.titel}</a></li>`;
        })}
      </ol>
    </section>`;
  }

  function Artikel(props) {
    var a = props.artikel;
    var loeschen = hooks.useState(false);

    async function entfernen() {
      try {
        await K.wissen.entfernen(a.datei);
        await props.beiNeuLesen();
        K.meldung(K.t("stammdaten.geloescht"));
        K.navigieren("wissen");
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    hooks.useEffect(
      function () {
        K.brotkrumenTitel.set({ titel: a.titel });
      },
      [a.titel],
    );
    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${a.titel}</h1>
        ${a.eigen &&
        html`<div class="rj-row">
          <${UI.Button} icon="pencil" href=${"#/wissen/" + encodeURIComponent(a.kennung) + "/bearbeiten"}>${K.t("speichern.bearbeiten")}<//>
          <${UI.IconButton}
            icon="trash-2"
            gefahr=${true}
            label=${K.t("stammdaten.loeschenVon", { name: a.titel })}
            onClick=${function () {
              loeschen[1](true);
            }}
          />
        </div>`}
      </div>
      <p class="rj-muted">${a.kategorie}</p>
      ${a.bild &&
      html`<figure class="rj-wissen-bild" tabindex=${window.innerWidth <= 600 ? "0" : undefined}>
        <img src=${"img/wissen/" + a.bild + "." + (a.sprache || "de") + ".svg"} alt=${a.bildText} />
      </figure>`}
      <article class="rj-prose" dangerouslySetInnerHTML=${{ __html: K.wissen.alsHtml(a.text) }}></article>
      ${a.quellen.length > 0 && html`<${Quellen} quellen=${a.quellen} />`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("stammdaten.loeschenTitel")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${entfernen}
        beiSchliessen=${function () {
          loeschen[1](false);
        }}
      >
        <p>${K.t("wissen.loeschenText", { name: a.titel })}</p>
      <//>`}
    `;
  }

  function Liste(props) {
    var suche = hooks.useState("");
    var kategorie = hooks.useState("");
    var kategorien = props.artikel
      .map(function (a) {
        return a.kategorie;
      })
      .filter(function (k, i, alle) {
        return alle.indexOf(k) === i;
      })
      .sort()
      .map(function (k) {
        return { wert: k, label: k };
      });
    var treffer = props.artikel.filter(function (a) {
      return (!kategorie[0] || a.kategorie === kategorie[0]) && UI.textTrifft(a.titel + " " + a.kategorie + " " + a.text, suche[0]);
    });
    var spalten = [
      {
        schluessel: "titel",
        titel: K.t("wissen.artikel"),
        zelle: function (a) {
          return html`<a class="rj-link" href=${"#/wissen/" + encodeURIComponent(a.kennung)}>${a.titel}</a>${a.eigen ? html` <span class="rj-chip">${K.t("wissen.eigen")}</span>` : ""}`;
        },
      },
      { schluessel: "kategorie", titel: K.t("wissen.kategorie") },
    ];

    return html`
      <div class="rj-filterbar">
        <${UI.SearchField} label=${K.t("wissen.suchen")} platzhalter=${K.t("wissen.suchen")} wert=${suche[0]} beiAenderung=${suche[1]} />
        <${UI.FilterSelect}
          label=${K.t("wissen.kategorie")}
          wert=${kategorie[0]}
          optionen=${[{ wert: "", label: K.t("wissen.alleKategorien") }].concat(kategorien)}
          beiAenderung=${kategorie[1]}
        />
      </div>
      ${treffer.length > 0
        ? html`<${UI.DataTable} ohneSuche=${true} spalten=${spalten} zeilen=${treffer} startSortierung=${{ spalte: "titel", richtung: "ascending" }} />`
        : html`<${UI.EmptyState} icon="search-x" titel=${K.t("wissen.keinTreffer")} text=${K.t("wissen.keinTrefferText")} />`}
      <p class="rj-hint">${K.t("wissen.eigeneHinweis")}</p>
    `;
  }

  S.Wissen = function (props) {
    var stand = hooks.useState(null);
    var fehler = hooks.useState(null);

    function neuLaden() {
      return K.wissen.laden().then(stand[1], function (e) {
        fehler[1](K.fehlerText(e));
      });
    }

    hooks.useEffect(function () {
      neuLaden();
    }, []);

    var kopf = html`<div class="rj-pagehead"><h1 class="h1">${K.t("nav.wissen")}</h1></div>`;
    if (fehler[0]) return html`${kopf}<${UI.Alert} art="danger">${fehler[0]}<//>`;
    if (!stand[0]) return kopf;

    var kennung = props.teile[0];
    if (kennung === "neu") return html`<${Editor} key="neu" beiNeuLesen=${neuLaden} />`;
    if (kennung) {
      var artikel = stand[0].artikel.filter(function (a) {
        return a.kennung === kennung;
      })[0];
      if (artikel && artikel.eigen && props.teile[1] === "bearbeiten") return html`<${Editor} key=${kennung + "-edit"} artikel=${artikel} beiNeuLesen=${neuLaden} />`;
      if (artikel) return html`<${Artikel} key=${kennung} artikel=${artikel} beiNeuLesen=${neuLaden} />`;
      return html`${kopf}<${UI.EmptyState} icon="search-x" titel=${K.t("wissen.fehltTitel")} text=${K.t("wissen.fehltText")}>
        <${UI.Button} href="#/wissen">${K.t("wissen.alleArtikel")}<//>
      <//>`;
    }

    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("nav.wissen")}</h1>
        <${UI.Button} variante="primary" icon="plus" href="#/wissen/neu">${K.t("wissen.neu")}<//>
      </div>
      ${stand[0].uebersprungen > 0 && html`<${UI.Alert} art="warning">${K.t("wissen.uebersprungen", { anzahl: stand[0].uebersprungen })}<//>`}
      <${Liste} artikel=${stand[0].artikel} />
    `;
  };
})();
