(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  // Grenzen fangen Tippfehler ab. Leere Felder sind erlaubt, das Angebot steht oft erst nach und nach fest.
  var FELDER = [
    { id: "bruttoJahr", einheit: "€", max: 10000000 },
    { id: "bonusJahr", einheit: "€", max: 10000000 },
    { id: "nettoMonat", einheit: "€", max: 1000000 },
    { id: "wochenstunden", einheit: "h", max: 80 },
    { id: "urlaubstage", einheit: "d", max: 100 },
    { id: "homeofficeTage", einheit: "d", max: 7 },
    { id: "praesenzTage", einheit: "d", max: 7 },
    { id: "pendelMinutenEinfach", einheit: "min", max: 600 },
    { id: "pendelKostenMonat", einheit: "€", max: 100000 },
    { id: "probezeitMonate", einheit: "M", max: 24 },
  ];

  function alsText(w) {
    return typeof w === "number" ? w.toLocaleString(K.sprache(), { maximumFractionDigits: 2 }) : "";
  }

  function feldText(id) {
    return K.t("angebot.feld." + id);
  }

  function pruefen(eingaben) {
    var fehler = {};
    var werte = {};
    FELDER.forEach(function (f) {
      var w = K.vergleich.zahlLesen(eingaben[f.id] || "", K.sprache());
      if (w === null || w <= f.max) werte[f.id] = w;
      if (w !== null && !(w <= f.max)) {
        fehler[f.id] = isNaN(w) ? K.t("angebot.fehlerZahl") : K.t("angebot.fehlerMax", { max: alsText(f.max) });
      }
    });
    if ((werte.homeofficeTage || 0) + (werte.praesenzTage || 0) > 7 && !fehler.praesenzTage) {
      fehler.praesenzTage = K.t("angebot.fehlerTage");
    }
    return { fehler: fehler, werte: werte };
  }

  // Die Punkte entstehen im Vergleich mit den anderen Angeboten, darum zählt der aktuelle Entwurf mit.
  function LivePunkte(props) {
    var kriterien = K.vergleich.kriterien().filter(function (k) {
      return k.gewicht > 0;
    });
    var andere = K.vergleich.mitAngebot().filter(function (x) {
      return x.id !== props.id;
    });
    var eintraege = andere
      .map(function (x) {
        return { id: x.id, angebot: x.angebot };
      })
      .concat([{ id: props.id, angebot: props.angebot }]);
    var teile = K.vergleich.teilpunkte(eintraege, kriterien, K.vergleich.feiertagsWochen());
    var i = eintraege.length - 1;
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("angebot.punkteTitel")}</h2>
      <p class="rj-muted">${K.t(andere.length ? "angebot.punkteText" : "angebot.punkteAllein")}</p>
      <div class="rj-table-wrap">
        <table class="rj-table rj-table--streifen">
          <caption class="rj-sr-only">${K.t("angebot.punkteTitel")}</caption>
          <thead>
            <tr>
              <th scope="col">${K.t("angebot.punkteKriterium")}</th>
              <th scope="col" class="is-num">${K.t("angebot.punkteSpalte")}</th>
            </tr>
          </thead>
          <tbody>
            ${kriterien.map(function (k) {
              var w = teile[k.id][i];
              var zahl = w === null ? "" : w.toLocaleString(K.sprache(), { maximumFractionDigits: 1 });
              return html`<tr key=${k.id}>
                <th scope="row">${K.vergleich.kriteriumName(k)}</th>
                <td class="is-num">
                  ${w === null
                    ? html`<span class="rj-nodata">${K.t("angebot.punkteFehlt")}</span>`
                    : K.t(k.typ === "auto" ? "angebot.punkteAuto" : "angebot.punkteHand", { punkte: zahl })}
                </td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  S.AngebotFormular = function (props) {
    var b = K.bewerbungen.holen(props.id);
    var a = (b && b.angebot) || {};
    var eingaben = hooks.useState(function () {
      var start = {};
      FELDER.forEach(function (f) {
        start[f.id] = alsText(a[f.id]);
      });
      return start;
    });
    var befristet = hooks.useState(a.befristet === true ? "ja" : a.befristet === false ? "nein" : "");
    var zusatz = hooks.useState(a.zusatzleistungen || []);
    var fehler = hooks.useState({});
    var loeschen = hooks.useState(false);

    if (!b) {
      return html`<${UI.EmptyState} icon="search-x" titel=${K.t("fehler.seiteTitel")} text=${K.t("fehler.seiteText")}>
        <${UI.Button} variante="primary" href="#/vergleich">${K.t("nav.vergleich")}<//>
      <//>`;
    }

    function feld(f) {
      return html`<${UI.ZahlFeld}
        key=${f.id}
        label=${feldText(f.id)}
        einheit=${K.t("angebot.einheit." + f.einheit)}
        placeholder=${K.t("angebot.platzhalter." + f.id)}
        hinweis=${K.t("angebot.hinweis." + f.id)}
        wert=${eingaben[0][f.id]}
        fehler=${fehler[0][f.id]}
        beiAenderung=${function (w) {
          eingaben[1](Object.assign({}, eingaben[0], { [f.id]: w }));
        }}
      />`;
    }

    function speichern() {
      var ergebnis = pruefen(eingaben[0]);
      fehler[1](ergebnis.fehler);
      if (Object.keys(ergebnis.fehler).length) return;
      K.vergleich.angebotSpeichern(
        b.id,
        Object.assign(ergebnis.werte, {
          befristet: befristet[0] === "" ? null : befristet[0] === "ja",
          zusatzleistungen: zusatz[0],
        }),
      );
      K.meldung(K.t("angebot.gespeichert"));
      K.navigieren("vergleich");
    }

    function endgueltig() {
      K.vergleich.angebotLoeschen(b.id);
      K.meldung(K.t("angebot.geloescht"));
      K.navigieren("vergleich");
    }

    return html`
      <div class="rj-pagehead">
        <div>
          <h1 class="h1">${K.t(b.angebot ? "angebot.bearbeiten" : "angebot.erfassen")}</h1>
          <p>${b.firma.name} · ${b.stelle.titel}</p>
        </div>
      </div>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("angebot.geld")}</h2>
        <div class="rj-grid-2">${FELDER.slice(0, 3).map(feld)}</div>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("angebot.zeit")}</h2>
        <div class="rj-grid-2">${FELDER.slice(3, 7).map(feld)}</div>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("angebot.weg")}</h2>
        <div class="rj-grid-2">${FELDER.slice(7, 9).map(feld)}</div>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("angebot.vertrag")}</h2>
        <div class="rj-grid-2">
          <${UI.Select}
            label=${K.t("angebot.feld.befristet")}
            wert=${befristet[0]}
            optionen=${[
              { wert: "", label: K.t("angebot.befristet.offen") },
              { wert: "nein", label: K.t("angebot.befristet.nein") },
              { wert: "ja", label: K.t("angebot.befristet.ja") },
            ]}
            beiAenderung=${befristet[1]}
          />
          ${feld(FELDER[9])}
        </div>
        <${UI.TagInput}
          label=${K.t("angebot.feld.zusatzleistungen")}
          hinweis=${K.t("angebot.hinweis.zusatzleistungen")}
          platzhalter=${K.t("angebot.platzhalter.zusatzleistungen")}
          wert=${zusatz[0]}
          beiAenderung=${zusatz[1]}
        />
      </section>
      <${LivePunkte} id=${b.id} angebot=${Object.assign({}, a, pruefen(eingaben[0]).werte)} />
      <div class="rj-row">
        <${UI.Button} variante="primary" icon="check" onClick=${speichern}>${K.t("angebot.speichern")}<//>
        ${b.angebot &&
        html`<${UI.Button}
          variante="danger"
          icon="trash-2"
          onClick=${function () {
            loeschen[1](true);
          }}
          >${K.t("angebot.loeschen")}<//
        >`}
      </div>
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("angebot.loeschen")}
        bestaetigen=${K.t("angebot.loeschen")}
        gefahr=${true}
        beiBestaetigen=${endgueltig}
        beiSchliessen=${function () {
          loeschen[1](false);
        }}
      >
        <p>${K.t("angebot.loeschenText", { firma: b.firma.name })}</p>
      <//>`}
    `;
  };
})();
