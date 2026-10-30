(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ICS_TYP = { "text/calendar": [".ics"] };
  var ICONS = { telefon: "phone", digital: "calendar", vor_ort: "map-pin", test: "list-checks", sonstiges: "calendar" };

  function lokal(iso) {
    var d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  S.terminZeit = function (t) {
    return K.t("termin.zeit", { datum: S.datumAnzeige(t.start), von: lokal(t.start).slice(11, 16), bis: lokal(t.ende).slice(11, 16) });
  };

  S.terminIcon = function (t) {
    return ICONS[t.art];
  };

  S.icsSpeichern = async function (t, b) {
    try {
      if (await K.fs.speichernUnter(K.termine.dateiname(t, b), K.termine.ics(t, b), K.t("termin.dateityp"), ICS_TYP)) K.meldung(K.t("termin.icsGespeichert"));
    } catch (e) {
      K.meldung(K.fehlerText(e), "danger");
    }
  };

  // Links zu Anbietern öffnen sich nur nach Klick, und nur https kommt in ein href.
  S.AussenLink = function (props) {
    return html`<${UI.Button} href=${props.href} target="_blank" rel="noopener noreferrer" icon=${props.icon} iconHinten="external-link">${props.children}<//>`;
  };

  function sichererLink(s) {
    return /^https:\/\//i.test(s || "");
  }

  function TerminDialog(props) {
    var b = props.bewerbung;
    var t = props.termin;
    var w = hooks.useState(
      t
        ? { art: t.art, datum: lokal(t.start).slice(0, 10), von: lokal(t.start).slice(11, 16), bis: lokal(t.ende).slice(11, 16), ort: t.ort || "", link: t.link || "", notiz: t.notiz || "" }
        : { art: "vor_ort", datum: "", von: "10:00", bis: "11:00", ort: "", link: "", notiz: "" },
    );
    var fehler = hooks.useState({});

    function setzen(feld) {
      return function (v) {
        var neu = Object.assign({}, w[0]);
        neu[feld] = v;
        w[1](neu);
      };
    }

    function speichern() {
      var f = {};
      if (!w[0].datum) f.datum = K.t("termin.fehlerDatum");
      if (!w[0].von || !w[0].bis || w[0].bis <= w[0].von) f.zeit = K.t("termin.fehlerZeit");
      if (w[0].link.trim() && !sichererLink(w[0].link.trim())) f.link = K.t("termin.fehlerLink");
      fehler[1](f);
      if (Object.keys(f).length) return;
      var neu = {
        id: t ? t.id : undefined,
        art: w[0].art,
        start: new Date(w[0].datum + "T" + w[0].von).toISOString(),
        ende: new Date(w[0].datum + "T" + w[0].bis).toISOString(),
      };
      ["ort", "link", "notiz"].forEach(function (k) {
        if (w[0][k].trim()) neu[k] = w[0][k].trim();
      });
      K.termine.speichern(b.id, neu);
      K.meldung(K.t("termin.gespeichert"));
      props.beiSchliessen();
    }

    return html`<${UI.Dialog} titel=${K.t(t ? "termin.bearbeiten" : "termin.neu")} bestaetigen=${K.t("termin.speichern")} eigenePruefung=${true} beiBestaetigen=${speichern} beiSchliessen=${props.beiSchliessen}>
      <${UI.Select}
        label=${K.t("termin.artLabel")}
        wert=${w[0].art}
        optionen=${K.TERMIN_ARTEN.map(function (a) {
          return { wert: a, label: K.t("termin.art." + a) };
        })}
        beiAenderung=${setzen("art")}
      />
      <${UI.DatePicker} label=${K.t("termin.datum")} pflicht=${true} fehler=${fehler[0].datum} wert=${w[0].datum} beiAenderung=${setzen("datum")} />
      <div class="rj-grid-2">
        <${UI.TextField} label=${K.t("termin.von")} type="time" fehler=${fehler[0].zeit} wert=${w[0].von} beiAenderung=${setzen("von")} />
        <${UI.TextField} label=${K.t("termin.bis")} type="time" wert=${w[0].bis} beiAenderung=${setzen("bis")} />
      </div>
      <${UI.TextField} label=${K.t("termin.ort")} hinweis=${K.t("termin.ortHinweis")} wert=${w[0].ort} beiAenderung=${setzen("ort")} />
      <${UI.TextField} label=${K.t("termin.link")} fehler=${fehler[0].link} wert=${w[0].link} beiAenderung=${setzen("link")} />
      <${UI.Textarea} label=${K.t("termin.notiz")} rows="3" wert=${w[0].notiz} beiAenderung=${setzen("notiz")} />
    <//>`;
  }

  function TerminKarte(props) {
    var t = props.termin;
    var b = props.bewerbung;
    var ort = K.termine.ort(t, b);
    var route = t.art === "vor_ort" ? K.termine.mapsLink(ort) : null;
    return html`<article class="rj-card rj-stack">
      <div class="rj-card__head">
        <div>
          <h3 class="h3">${K.t("termin.art." + t.art)}</h3>
          <p>${S.terminZeit(t)}${ort ? " · " + ort : ""}</p>
          ${t.notiz && html`<p style="white-space:pre-line">${t.notiz}</p>`}
          ${sichererLink(t.link) && html`<p><a class="rj-link" href=${t.link} target="_blank" rel="noopener noreferrer">${t.link}</a></p>`}
        </div>
        <div class="rj-row" style="flex:none;gap:0">
          <${UI.IconButton} icon="pencil" label=${K.t("termin.bearbeiten")} onClick=${props.beiBearbeiten} />
          <${UI.IconButton}
            icon="trash-2"
            gefahr=${true}
            label=${K.t("termin.loeschen")}
            onClick=${function () {
              K.termine.loeschen(b.id, t.id);
              K.meldung(K.t("termin.geloescht"));
            }}
          />
        </div>
      </div>
      <div class="rj-row">
        <${UI.Button}
          icon="download"
          onClick=${function () {
            S.icsSpeichern(t, b);
          }}
        >
          ${K.t("termin.ics")}
        <//>
        <${S.AussenLink} href=${K.termine.googleLink(t, b)} icon="calendar">${K.t("termin.google")}<//>
        <${S.AussenLink} href=${K.termine.outlookLink(t, b)} icon="calendar">${K.t("termin.outlook")}<//>
        ${route && html`<${S.AussenLink} href=${route} icon="map-pin">${K.t("route.anzeigen")}<//>`}
      </div>
    </article>`;
  }

  S.BewerbungTermine = function (props) {
    var b = props.bewerbung;
    var dialog = hooks.useState(null);
    return html`<section class="rj-card rj-stack">
      <div class="rj-pagehead">
        <h2 class="h3">${K.t("termin.titel")}</h2>
        <${UI.Button}
          icon="plus"
          onClick=${function () {
            dialog[1]({});
          }}
        >
          ${K.t("termin.neu")}
        <//>
      </div>
      ${b.termine.length === 0 && html`<p class="rj-muted">${K.t("termin.leer")}</p>`}
      ${b.termine.map(function (t) {
        return html`<${TerminKarte}
          key=${t.id}
          termin=${t}
          bewerbung=${b}
          beiBearbeiten=${function () {
            dialog[1]({ termin: t });
          }}
        />`;
      })}
      ${b.termine.length > 0 && html`<p class="rj-muted">${K.t("termin.anbieterHinweis")}</p>`}
      ${dialog[0] &&
      html`<${TerminDialog}
        bewerbung=${b}
        termin=${dialog[0].termin}
        beiSchliessen=${function () {
          dialog[1](null);
        }}
      />`}
    </section>`;
  };
})();
