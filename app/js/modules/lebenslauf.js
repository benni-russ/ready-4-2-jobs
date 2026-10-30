(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ALLE = "";

  // Der Klartext lebt nur als Blob im Speicher, solange die Seite offen ist.
  function Ergebnis(props) {
    var r = props.ergebnis;
    var url = hooks.useState(null);

    hooks.useEffect(
      function () {
        var adresse = URL.createObjectURL(new Blob([r.bytes], { type: "application/pdf" }));
        url[1](adresse);
        return function () {
          URL.revokeObjectURL(adresse);
        };
      },
      [r],
    );

    async function speichern() {
      try {
        if (await K.fs.speichernUnter(r.dateiname, r.bytes, K.t("cv.dateityp"))) K.meldung(K.t("cv.gespeichert"));
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    return html`<section class="rj-card rj-stack" aria-live="polite">
      <h2 class="h3">${K.t("cv.ergebnis")}</h2>
      <p>${K.t("cv.info", { datei: r.dateiname, seiten: r.seiten, groesse: K.groesseText(r.bytes.length) })}</p>
      ${r.hinweise.map(function (h) {
        return html`<${UI.Alert} art="warning" key=${h.text}>${K.t(h.text, h.werte)}<//>`;
      })}
      <div class="rj-row"><${UI.Button} variante="primary" icon="download" onClick=${speichern}>${K.t("cv.speichern")}<//></div>
      <p class="rj-muted">${K.t("cv.speichernHinweis")}</p>
      ${url[0] && html`<div class="rj-filepreview"><iframe src=${url[0]} title=${r.dateiname}></iframe></div>`}
    </section>`;
  }

  S.Lebenslauf = function () {
    K.useBeobachtbar(K.tresorStand);
    var t = K.tresor.daten();
    var ausrichtung = hooks.useState(t.ausrichtungen.length ? t.ausrichtungen[0].id : ALLE);
    var sprache = hooks.useState(K.sprache());
    var fotoGewaehlt = hooks.useState(null);
    var interessen = hooks.useState(true);
    var ergebnis = hooks.useState(null);
    var fehler = hooks.useState(null);
    var laedt = hooks.useState(false);
    var akzent = t.einstellungen.cvAkzent || K.store.get().farbschema;
    // Foto: Standard an bei Deutsch, aus bei Englisch, solange nichts gewählt wurde.
    var mitFoto = fotoGewaehlt[0] === null ? sprache[0] === "de" : fotoGewaehlt[0];

    function aendern(paar) {
      return function (w) {
        paar[1](w);
        ergebnis[1](null);
      };
    }

    async function erstellen() {
      laedt[1](true);
      fehler[1](null);
      ergebnis[1](null);
      try {
        ergebnis[1](
          await K.lebenslauf.erstellen({
            ausrichtungId: ausrichtung[0],
            sprache: sprache[0],
            mitFoto: mitFoto,
            mitInteressen: interessen[0],
            akzent: akzent,
          }),
        );
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
      laedt[1](false);
    }

    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("nav.lebenslauf")}</h1>
        <${UI.Button} icon="chevron-left" href="#/stammdaten">${K.t("nav.stammdaten")}<//>
      </div>
      <section class="rj-card rj-stack">
        <p>${K.t("cv.text")}</p>
        ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
        <div class="rj-grid-2">
          <${UI.Select}
            label=${K.t("cv.ausrichtung")}
            wert=${ausrichtung[0]}
            optionen=${[{ wert: ALLE, label: K.t("cv.alleEintraege") }].concat(
              t.ausrichtungen.map(function (a) {
                return { wert: a.id, label: a.name };
              }),
            )}
            beiAenderung=${aendern(ausrichtung)}
          />
          <${UI.Select}
            label=${K.t("cv.akzent")}
            wert=${akzent}
            optionen=${Object.keys(K.CV_AKZENTE).map(function (s) {
              return { wert: s, label: K.t("farbschema." + s) };
            })}
            beiAenderung=${function (w) {
              ergebnis[1](null);
              K.tresor.aendern(function (d) {
                d.einstellungen.cvAkzent = w;
              });
            }}
          />
        </div>
        <div class="rj-field">
          <span class="rj-label">${K.t("cv.sprache")}</span>
          <${UI.SegmentedControl}
            label=${K.t("cv.sprache")}
            wert=${sprache[0]}
            optionen=${[
              { wert: "de", label: "Deutsch" },
              { wert: "en", label: "English" },
            ]}
            beiAenderung=${aendern(sprache)}
          />
        </div>
        <${UI.Switch} label=${K.t("cv.foto")} wert=${mitFoto} beiAenderung=${aendern(fotoGewaehlt)} />
        <${UI.Switch} label=${K.t("cv.interessen")} wert=${interessen[0]} beiAenderung=${aendern(interessen)} />
        <div class="rj-row">
          <${UI.Button} variante="primary" icon="file-text" laedt=${laedt[0]} disabled=${laedt[0]} onClick=${erstellen}>${K.t("cv.erstellen")}<//>
        </div>
      </section>
      ${ergebnis[0] && html`<${Ergebnis} ergebnis=${ergebnis[0]} />`}
    `;
  };
})();
