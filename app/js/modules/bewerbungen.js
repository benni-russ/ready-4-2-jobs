(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var REITER = ["stelle", "lebenslauf", "anschreiben", "anlagen", "versand", "details"];

  S.sprachOptionen = function () {
    return [
      { wert: "de", label: "Deutsch" },
      { wert: "en", label: "English" },
    ];
  };

  S.anredeOptionen = function () {
    return [
      { wert: "sie", label: K.t("bewerbung.anredeSie") },
      { wert: "du", label: K.t("bewerbung.anredeDu") },
    ];
  };

  S.datumAnzeige = function (iso) {
    return iso ? window.R42J.formatDate(new Date(iso)) : "";
  };

  function Liste() {
    var d = K.tresor.daten();
    var spalten = [
      {
        schluessel: "firma",
        titel: K.t("bewerbung.firma"),
        text: function (b) {
          return b.firma.name;
        },
        zelle: function (b) {
          return html`<a class="rj-link" href=${"#/bewerbungen/" + b.id}>${b.firma.name}</a>`;
        },
      },
      {
        schluessel: "stelle",
        titel: K.t("bewerbung.stelle"),
        text: function (b) {
          return b.stelle.titel;
        },
      },
      {
        schluessel: "status",
        titel: K.t("bewerbung.status"),
        text: function (b) {
          return UI.statusText(K.bewerbungen.anzeigeStatus(b));
        },
        zelle: function (b) {
          return html`<${UI.StatusBadge} status=${K.bewerbungen.anzeigeStatus(b)} />`;
        },
      },
      {
        schluessel: "passung",
        titel: K.t("bewerbung.passung"),
        typ: "number",
        num: true,
        text: function (b) {
          var s = K.keywords.score(b.keywords);
          return s === null ? "" : s + " %";
        },
        zelle: function (b) {
          var s = K.keywords.score(b.keywords);
          return s === null ? html`<span class="rj-nodata">${K.t("bewerbung.passungOffen")}</span>` : s + " %";
        },
      },
      {
        schluessel: "erstellt",
        titel: K.t("bewerbung.erstellt"),
        typ: "date",
        text: function (b) {
          return S.datumAnzeige(b.erstellt);
        },
      },
    ];
    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("nav.bewerbungen")}</h1>
        ${d.bewerbungen.length > 0 && html`<${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.anlegen")}<//>`}
      </div>
      ${d.bewerbungen.length === 0
        ? html`<${UI.EmptyState} icon="briefcase-business" titel=${K.t("bewerbung.leerTitel")} text=${K.t("bewerbung.leerText")}>
            <${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.anlegen")}<//>
          <//>`
        : html`<${UI.DataTable} spalten=${spalten} zeilen=${d.bewerbungen} schluessel="id" />`}
    `;
  }

  function Neu() {
    var d = K.tresor.daten();
    var w = hooks.useState({
      firma: "",
      titel: "",
      ausrichtungId: d.ausrichtungen.length ? d.ausrichtungen[0].id : "",
      sprache: K.sprache(),
      anrede: "sie",
      anzeigeText: "",
    });
    var fehler = hooks.useState({});
    var meldung = hooks.useState(null);

    function setzen(feld) {
      return function (v) {
        var neu = Object.assign({}, w[0]);
        neu[feld] = v;
        w[1](neu);
      };
    }

    async function datei(dateien) {
      meldung[1](null);
      try {
        var m = await K.bewerbungen.markdownDatei(dateien[0]);
        w[1](
          Object.assign({}, w[0], {
            firma: m.firma || w[0].firma,
            titel: m.titel || w[0].titel,
            link: m.link,
            quelle: m.quelle,
            anzeigeText: m.anzeigeText,
            anzeigeMd: m.anzeigeMd,
          }),
        );
        K.meldung(K.t("bewerbung.importiert"));
      } catch (e) {
        meldung[1](K.fehlerText(e));
      }
    }

    function anlegen() {
      var f = {};
      if (!w[0].firma.trim()) f.firma = K.t("bewerbung.fehlerFirma");
      if (!w[0].titel.trim()) f.titel = K.t("bewerbung.fehlerTitel");
      if (!w[0].ausrichtungId) f.ausrichtung = K.t("bewerbung.fehlerAusrichtung");
      fehler[1](f);
      if (Object.keys(f).length) return;
      var b = K.bewerbungen.neu(Object.assign({}, w[0], { firma: w[0].firma.trim(), titel: w[0].titel.trim() }));
      K.navigieren("bewerbungen/" + b.id);
    }

    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("bewerbung.neu")}</h1>
      </div>
      <section class="rj-card rj-stack">
        ${meldung[0] && html`<${UI.Alert} art="danger">${meldung[0]}<//>`}
        <${UI.Textarea} label=${K.t("bewerbung.anzeige")} placeholder=${K.t("bewerbung.anzeigePlatzhalter")} hinweis=${K.t("bewerbung.anzeigeHinweis")} wert=${w[0].anzeigeText} beiAenderung=${setzen("anzeigeText")} rows="10" />
        <${UI.FileDrop} hinweis=${K.t("bewerbung.markdownHinweis")} accept=".md,.markdown,.txt,text/markdown,text/plain" beiDateien=${datei} />
        <div class="rj-grid-2">
          <${UI.TextField} label=${K.t("bewerbung.firma")} placeholder=${K.t("bewerbung.firmaPlatzhalter")} pflicht=${true} fehler=${fehler[0].firma} wert=${w[0].firma} beiAenderung=${setzen("firma")} />
          <${UI.TextField} label=${K.t("bewerbung.stelle")} placeholder=${K.t("bewerbung.stellePlatzhalter")} pflicht=${true} fehler=${fehler[0].titel} wert=${w[0].titel} beiAenderung=${setzen("titel")} />
        </div>
        ${d.ausrichtungen.length
          ? html`<${UI.Select}
              label=${K.t("bewerbung.ausrichtung")}
              wert=${w[0].ausrichtungId}
              optionen=${d.ausrichtungen.map(function (a) {
                return { wert: a.id, label: a.name };
              })}
              beiAenderung=${setzen("ausrichtungId")}
            />`
          : html`<${UI.Alert} art="warning">${K.t("bewerbung.keineAusrichtung")}<//>`}
        <div class="rj-grid-2">
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.sprache")}</span>
            <${UI.SegmentedControl} label=${K.t("bewerbung.sprache")} wert=${w[0].sprache} optionen=${S.sprachOptionen()} beiAenderung=${setzen("sprache")} />
          </div>
          <div class="rj-field">
            <span class="rj-label">${K.t("bewerbung.anrede")}</span>
            <${UI.SegmentedControl} label=${K.t("bewerbung.anrede")} wert=${w[0].anrede} optionen=${S.anredeOptionen()} beiAenderung=${setzen("anrede")} />
          </div>
        </div>
        <div class="rj-row"><${UI.Button} variante="primary" icon="check" onClick=${anlegen}>${K.t("bewerbung.anlegen")}<//></div>
      </section>
    `;
  }

  // Erzeugt den Lebenslauf passend zur Stelle und legt ihn als Snapshot ab.
  function LebenslaufReiter(props) {
    var b = props.bewerbung;
    var laedt = hooks.useState(false);
    var fehler = hooks.useState(null);
    var hinweise = hooks.useState([]);
    var t = K.tresor.daten();

    async function erstellen() {
      laedt[1](true);
      fehler[1](null);
      hinweise[1]([]);
      try {
        var r = await K.lebenslauf.erstellen({
          ausrichtungId: b.ausrichtungId,
          sprache: b.sprache,
          mitFoto: b.dokumente.mitFoto,
          mitInteressen: true,
          akzent: t.einstellungen.cvAkzent || K.store.get().farbschema,
          keywords: K.keywords.alle(b.keywords),
        });
        await K.bewerbungen.snapshotSpeichern(b.id, "lebenslauf", r.bytes, r.dateiname);
        hinweise[1](r.hinweise);
        K.meldung(K.t("dokument.erstellt"));
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
      laedt[1](false);
    }

    return html`<section class="rj-card rj-stack">
      <p>${K.t("bewerbung.lebenslaufText")}</p>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      ${hinweise[0].map(function (h) {
        return html`<${UI.Alert} art="warning" key=${h.text}>${K.t(h.text, h.werte)}<//>`;
      })}
      <${S.WissenLink} artikel="ats-erklaert" />
      <${UI.Switch}
        label=${K.t("cv.foto")}
        wert=${b.dokumente.mitFoto}
        beiAenderung=${function (w) {
          K.bewerbungen.aendern(b.id, function (x) {
            x.dokumente.mitFoto = w;
          });
        }}
      />
      <${S.WissenLink} artikel="foto-ja-nein" />
      <div class="rj-row">
        <${UI.Button} variante="primary" icon="file-text" laedt=${laedt[0]} disabled=${laedt[0]} onClick=${erstellen}>${K.t("cv.erstellen")}<//>
      </div>
      <${S.DokumentZeile} bewerbung=${b} art="lebenslauf" />
    </section>`;
  }

  function Detail(props) {
    var b = K.bewerbungen.holen(props.id);
    var reiter = REITER.indexOf(props.reiter) > -1 ? props.reiter : "stelle";
    var loeschen = hooks.useState(false);
    var laedt = hooks.useState(false);
    var statusDialog = hooks.useState(false);

    hooks.useEffect(
      function () {
        if (b) K.bewerbungen.keywordsAbgleichen(b.id);
      },
      [props.id],
    );

    if (!b) {
      return html`<${UI.EmptyState} icon="search-x" titel=${K.t("bewerbung.fehltTitel")} text=${K.t("bewerbung.fehltText")}>
        <${UI.Button} variante="primary" href="#/bewerbungen">${K.t("nav.bewerbungen")}<//>
      <//>`;
    }

    async function endgueltig() {
      laedt[1](true);
      try {
        await K.bewerbungen.loeschen(b.id);
        K.meldung(K.t("bewerbung.geloescht"));
        K.navigieren("bewerbungen");
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
        laedt[1](false);
      }
    }

    return html`
      <div class="rj-pagehead">
        <div>
          <h1 class="h1">${b.firma.name}</h1>
          <p class="rj-muted" style="margin:0">${b.stelle.titel}</p>
        </div>
        <div class="rj-row">
          <${UI.StatusBadge} status=${K.bewerbungen.anzeigeStatus(b)} />
          <${UI.Button}
            icon="pencil"
            onClick=${function () {
              statusDialog[1](true);
            }}
          >
            ${K.t("status.aendern")}
          <//>
          <${UI.IconButton}
            icon="trash-2"
            gefahr=${true}
            label=${K.t("bewerbung.loeschen")}
            onClick=${function () {
              loeschen[1](true);
            }}
          />
        </div>
      </div>
      <${UI.Tabs}
        label=${K.t("bewerbung.reiter")}
        wert=${reiter}
        tabs=${REITER.map(function (r) {
          return { wert: r, label: K.t("bewerbung.reiter." + r) };
        })}
        beiAenderung=${function (r) {
          K.navigieren("bewerbungen/" + b.id + "/" + r);
        }}
      >
        ${reiter === "stelle" && html`<${S.BewerbungStelle} bewerbung=${b} key=${b.id} />`}
        ${reiter === "lebenslauf" && html`<${LebenslaufReiter} bewerbung=${b} key=${b.id} />`}
        ${reiter === "anschreiben" && html`<${S.BewerbungAnschreiben} bewerbung=${b} key=${b.id} />`}
        ${reiter === "anlagen" && html`<${S.BewerbungAnlagen} bewerbung=${b} key=${b.id} />`}
        ${reiter === "versand" && html`<${S.BewerbungVersand} bewerbung=${b} key=${b.id} />`}
        ${reiter === "details" && html`<${S.BewerbungDetails} bewerbung=${b} key=${b.id} />`}
      <//>
      ${statusDialog[0] &&
      html`<${S.StatusDialog}
        bewerbung=${b}
        beiSchliessen=${function () {
          statusDialog[1](false);
        }}
      />`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("bewerbung.loeschen")}
        bestaetigen=${K.t("bewerbung.loeschen")}
        gefahr=${true}
        laedt=${laedt[0]}
        beiBestaetigen=${endgueltig}
        beiSchliessen=${function () {
          loeschen[1](false);
        }}
      >
        <p>${K.t("bewerbung.loeschenText", { firma: b.firma.name })}</p>
      <//>`}
    `;
  }

  S.Bewerbungen = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var teile = props.teile || [];
    if (teile[0] === "neu") return html`<${Neu} />`;
    if (teile[0]) return html`<${Detail} id=${teile[0]} reiter=${teile[1]} key=${teile[0]} />`;
    return html`<${Liste} />`;
  };
})();
