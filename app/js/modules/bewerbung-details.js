(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  // Abgeleitete Status setzt die App selbst, sie stehen deshalb nicht zur Wahl.
  var ABGELEITET = ["rueckfrage_faellig"];

  function heuteIso() {
    var heute = new Date();
    return new Date(heute.getTime() - heute.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  S.statusOptionen = function () {
    return Object.keys(window.R42J.statuses).map(function (s) {
      return { wert: s, label: UI.statusText(s), icon: window.R42J.statuses[s].icon };
    });
  };

  S.StatusDialog = function (props) {
    var b = props.bewerbung;
    var aktuell = K.bewerbungen.aktuellerStatus(b);
    var optionen = S.statusOptionen().filter(function (o) {
      return ABGELEITET.indexOf(o.wert) === -1;
    });
    var status = hooks.useState(props.status || aktuell);
    var datum = hooks.useState(heuteIso());
    var notiz = hooks.useState("");
    var fehler = hooks.useState(null);

    function bestaetigen() {
      if (!datum[0]) return fehler[1](K.t("versand.datumFehler"));
      if (status[0] === aktuell) return fehler[1](K.t("status.fehlerGleich"));
      K.bewerbungen.statusSetzen(b.id, status[0], new Date(datum[0] + "T12:00").toISOString(), notiz[0].trim());
      K.meldung(K.t("status.gesetzt"));
      props.beiSchliessen();
    }

    return html`<${UI.Dialog} titel=${K.t("status.aendern")} bestaetigen=${K.t("status.speichern")} beiBestaetigen=${bestaetigen} beiSchliessen=${props.beiSchliessen}>
      ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
      <${UI.Select} label=${K.t("status.neu")} wert=${status[0]} optionen=${optionen} beiAenderung=${status[1]} />
      <${UI.DatePicker} label=${K.t("status.datum")} wert=${datum[0]} beiAenderung=${datum[1]} />
      <${UI.Textarea} label=${K.t("status.notiz")} hinweis=${K.t("status.notizHinweis")} placeholder=${K.t("status.notizPlatzhalter")} rows="3" wert=${notiz[0]} beiAenderung=${notiz[1]} />
    <//>`;
  };

  function Stelle(props) {
    var b = props.bewerbung;
    var a = b.ansprechpartner || {};
    var route = K.termine.mapsLink(b.firma.adresse);
    var zeilen = [
      [K.t("bewerbung.firma"), b.firma.name],
      [K.t("bewerbung.stelle"), b.stelle.titel],
      [K.t("stelle.adresse"), b.firma.adresse],
      [K.t("stelle.ansprechpartner"), [a.name, a.position, a.email, a.telefon].filter(Boolean).join(" · ")],
    ].filter(function (z) {
      return z[1];
    });
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("details.stelle")}</h2>
      ${zeilen.map(function (z) {
        return html`<div key=${z[0]}>
          <span class="rj-label">${z[0]}</span>
          <div style="white-space:pre-line">${z[1]}</div>
        </div>`;
      })}
      ${route &&
      html`<div class="rj-row"><${S.AussenLink} href=${route} icon="map-pin">${K.t("route.anzeigen")}<//></div>
        <p class="rj-muted">${K.t("route.hinweis")}</p>`}
      ${b.stelle.anzeigeText &&
      html`<div class="rj-accordion">
        <details>
          <summary>${K.t("details.anzeige")}<${UI.Icon} name="chevron-down" /></summary>
          <div style="white-space:pre-line">${b.stelle.anzeigeText}</div>
        </details>
      </div>`}
    </section>`;
  }

  function Dokumente(props) {
    var b = props.bewerbung;
    var vorhanden = K.bewerbungen.SNAPSHOTS.filter(function (a) {
      return b.dokumente[a];
    });
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("details.dokumente")}</h2>
      ${vorhanden.length === 0 && b.emails.length === 0 && html`<p class="rj-muted">${K.t("details.keineDokumente")}</p>`}
      ${vorhanden.map(function (a) {
        return html`<${S.DokumentZeile} bewerbung=${b} art=${a} key=${a} />`;
      })}
      <${S.Entwuerfe} bewerbung=${b} />
    </section>`;
  }

  function Verlauf(props) {
    var b = props.bewerbung;
    var rueckfrage = hooks.useState(false);
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("details.verlauf")}</h2>
      <${UI.StatusTimeline} eintraege=${b.status} />
      ${b.versendetAm &&
      html`<div class="rj-row">
        <${UI.Button}
          icon="mail"
          onClick=${function () {
            rueckfrage[1](true);
          }}
        >
          ${K.t("rueckfrage.erstellen")}
        <//>
      </div>`}
      ${rueckfrage[0] &&
      html`<${S.EmailDialog}
        bewerbung=${b}
        rueckfrage=${true}
        beiSchliessen=${function () {
          rueckfrage[1](false);
        }}
      />`}
    </section>`;
  }

  function Checkliste(props) {
    var b = props.bewerbung;
    var c = K.bewerbungen.checkliste(b);
    var punkte = K.CHECKLISTE.map(function (k) {
      return {
        schluessel: k,
        label: K.t("bewerbungCheck." + k),
        wert: !!b.checkliste[k],
        aktion:
          k === "recherche"
            ? html`<a class="rj-link rj-link--solo" style="font-size:.875rem" href=${"#/vorbereitung/unternehmen/" + b.id}>${K.t("vorbereitung.zuFragen")}</a>`
            : k === "rechtschreibung"
            ? html`<a class="rj-link rj-link--solo" style="font-size:.875rem" href=${"#/bewerbungen/" + b.id + "/anschreiben"}>${K.t("bewerbungCheck.kiKorrektur")}</a>`
            : null,
      };
    });
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("bewerbungCheck.titel")}</h2>
      <${UI.ProgressBar}
        label=${K.t("bewerbungCheck.fortschritt")}
        text=${K.t("bewerbungCheck.stand", { erledigt: c.erledigt, gesamt: c.gesamt })}
        wert=${c.erledigt}
        max=${c.gesamt}
      />
      <${UI.Checklist}
        punkte=${punkte}
        beiAenderung=${function (k, w) {
          K.bewerbungen.checklistePunkt(b.id, k, w);
        }}
      />
    </section>`;
  }

  S.BewerbungDetails = function (props) {
    var b = props.bewerbung;
    return html`
      <${Verlauf} bewerbung=${b} />
      <${S.BewerbungTermine} bewerbung=${b} />
      <section class="rj-card rj-stack">
        <${UI.Textarea}
          label=${K.t("details.notizen")}
          placeholder=${K.t("details.notizenPlatzhalter")}
          hinweis=${K.t("details.notizenHinweis")}
          rows="5"
          wert=${b.notizen}
          beiAenderung=${function (w) {
            K.bewerbungen.aendern(b.id, function (x) {
              x.notizen = w;
            });
          }}
        />
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("details.angebot")}</h2>
        <p>${K.t(b.angebot ? "details.angebotDa" : "details.angebotText")}</p>
        <div class="rj-row">
          <${UI.Button} icon="scale" href=${"#/vergleich/angebot/" + b.id}>${K.t(b.angebot ? "angebot.bearbeiten" : "angebot.erfassen")}<//>
        </div>
      </section>
      <${Checkliste} bewerbung=${b} />
      <${Stelle} bewerbung=${b} />
      <${Dokumente} bewerbung=${b} />
    `;
  };
})();
