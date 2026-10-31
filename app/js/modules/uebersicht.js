(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ZEITRAEUME = [30, 90, 365];
  var SORTIERUNGEN = ["neu", "alt", "firma", "passung"];
  var FILTER_LEER = { suche: "", status: "", ausrichtung: "", zeitraum: "", sortierung: "neu" };

  function bezugsDatum(b) {
    return b.versendetAm || b.erstellt;
  }

  function ausrichtungName(b) {
    var a = K.tresor.daten().ausrichtungen.filter(function (x) {
      return x.id === b.ausrichtungId;
    })[0];
    return a ? a.name : "";
  }

  function detailsLink(b) {
    return "#/bewerbungen/" + b.id + "/details";
  }

  // Reihenfolge wie in den Reitern. Ohne Dokument gilt der Schritt als offen.
  function schritte(b) {
    return [
      { reiter: "lebenslauf", label: K.t("uebersicht.schrittLebenslauf"), erledigt: !!b.dokumente.lebenslauf },
      { reiter: "anschreiben", label: K.t("uebersicht.schrittAnschreiben"), erledigt: !!b.dokumente.anschreiben },
      { reiter: "anlagen", label: K.t("uebersicht.schrittAnlagen"), erledigt: !!b.dokumente.anlagenPdf },
      { reiter: "versand", label: K.t("uebersicht.schrittVersand"), erledigt: !!b.versendetAm },
    ];
  }

  function altersText(b) {
    var tage = K.tageSeit(bezugsDatum(b));
    var art = b.versendetAm ? "versendet" : "erstellt";
    if (tage === 0) return K.t("uebersicht." + art + "Heute");
    return K.t("uebersicht." + art + (tage === 1 ? "Tag" : "Tage"), { tage: tage });
  }

  function passungText(b) {
    var s = K.keywords.score(b.keywords);
    return s === null ? "" : K.t("uebersicht.passung", { wert: s });
  }

  function suchText(b) {
    return [b.firma.name, b.stelle.titel, ausrichtungName(b), UI.statusText(K.bewerbungen.anzeigeStatus(b))].join(" ");
  }

  function filtern(liste, f) {
    var treffer = liste.filter(function (b) {
      if (f.status && K.bewerbungen.anzeigeStatus(b) !== f.status) return false;
      if (f.ausrichtung && b.ausrichtungId !== f.ausrichtung) return false;
      if (f.zeitraum && K.tageSeit(bezugsDatum(b)) > +f.zeitraum) return false;
      return UI.textTrifft(suchText(b), f.suche);
    });
    var vergleich = new Intl.Collator(K.sprache(), { numeric: true, sensitivity: "base" });
    return treffer.slice().sort(function (x, y) {
      if (f.sortierung === "firma") return vergleich.compare(x.firma.name, y.firma.name);
      if (f.sortierung === "passung") return (K.keywords.score(y.keywords) || 0) - (K.keywords.score(x.keywords) || 0);
      var r = bezugsDatum(x) < bezugsDatum(y) ? -1 : 1;
      return f.sortierung === "alt" ? r : -r;
    });
  }

  function Erinnerung(props) {
    var e = props.eintrag;
    var b = e.bewerbung;
    function spaeter() {
      K.erinnerungen.spaeter(e.art, b.id);
    }
    if (e.art === "termin") {
      var t = e.termin;
      var ort = K.termine.ort(t, b);
      var route = t.art === "vor_ort" ? K.termine.mapsLink(ort) : null;
      return html`<${UI.ReminderCard}
        termin=${true}
        icon=${S.terminIcon(t)}
        titel=${K.t("erinnerung.termin", { art: K.t("termin.art." + t.art), firma: b.firma.name })}
        text=${S.terminZeit(t) + (ort ? " · " + ort : "")}
      >
        ${route && html`<${S.AussenLink} href=${route} icon="map-pin">${K.t("route.kurz")}<//>`}
        <${UI.Button}
          icon="calendar"
          onClick=${function () {
            S.icsSpeichern(t, b);
          }}
        >
          ${K.t("erinnerung.inKalender")}
        <//>
      <//>`;
    }
    var text = { tage: e.tage, stelle: b.stelle.titel };
    if (e.art === "keineAntwort") {
      return html`<${UI.ReminderCard} icon="hourglass" titel=${K.t("erinnerung.keineAntwort", { firma: b.firma.name })} text=${K.t("erinnerung.keineAntwortText", text)}>
        <${UI.Button} onClick=${spaeter}>${K.t("erinnerung.spaeter")}<//>
        <${UI.Button}
          variante="primary"
          onClick=${function () {
            K.bewerbungen.statusSetzen(b.id, "keine_antwort", new Date().toISOString());
            K.meldung(K.t("status.gesetzt"));
          }}
        >
          ${K.t("erinnerung.keineAntwortSetzen")}
        <//>
      <//>`;
    }
    return html`<${UI.ReminderCard} icon="bell" titel=${K.t("erinnerung.rueckfrage", { firma: b.firma.name })} text=${K.t("erinnerung.rueckfrageText", text)}>
      <${UI.Button} onClick=${spaeter}>${K.t("erinnerung.spaeter")}<//>
      <${UI.Button} variante="primary" icon="mail" onClick=${props.beiRueckfrage}>${K.t("rueckfrage.erstellen")}<//>
    <//>`;
  }

  function Karten(props) {
    return html`<div class="rj-grid-2">
      ${props.liste.map(function (b) {
        var termin = K.termine.naechster(b);
        var meta = [
          { icon: "layers", text: ausrichtungName(b) },
          termin ? { icon: "calendar", text: K.t("uebersicht.termin", { datum: S.datumAnzeige(termin.start) }) } : { icon: b.versendetAm ? "send" : "calendar", text: altersText(b) },
          { icon: "star", text: passungText(b) },
        ].filter(function (m) {
          return m.text;
        });
        // Nach dem Versand oder einer Absage gibt es keinen nächsten Schritt mehr.
        var stand = K.bewerbungen.aktuellerStatus(b) === "vorbereitung" ? schritte(b) : null;
        var naechster =
          stand &&
          stand.filter(function (s) {
            return !s.erledigt;
          })[0];
        return html`<${UI.ApplicationCard}
          key=${b.id}
          href=${naechster ? "#/bewerbungen/" + b.id + "/" + naechster.reiter : detailsLink(b)}
          titel=${b.firma.name}
          rolle=${b.stelle.titel}
          status=${K.bewerbungen.anzeigeStatus(b)}
          meta=${meta}
          schritte=${stand || undefined}
          naechster=${naechster && K.t("uebersicht.naechster", { schritt: naechster.label })}
        />`;
      })}
    </div>`;
  }

  function Tabelle(props) {
    var spalten = [
      {
        schluessel: "firma",
        titel: K.t("bewerbung.firma"),
        text: function (b) {
          return b.firma.name;
        },
        zelle: function (b) {
          return html`<a class="rj-link" href=${detailsLink(b)}>${b.firma.name}</a>`;
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
      { schluessel: "ausrichtung", titel: K.t("bewerbung.ausrichtung"), text: ausrichtungName },
      {
        schluessel: "datum",
        titel: K.t("uebersicht.datum"),
        typ: "date",
        text: function (b) {
          return S.datumAnzeige(bezugsDatum(b));
        },
      },
      {
        schluessel: "passung",
        titel: K.t("bewerbung.passung"),
        typ: "number",
        num: true,
        text: passungText,
        zelle: function (b) {
          return passungText(b) || html`<span class="rj-nodata">${K.t("bewerbung.passungOffen")}</span>`;
        },
      },
    ];
    return html`<${UI.DataTable} spalten=${spalten} zeilen=${props.liste} schluessel="id" ohneSuche=${true} />`;
  }

  function optionenMit(alle, liste) {
    return [{ wert: "", label: alle }].concat(liste);
  }

  function UpdateHinweis() {
    K.useStore();
    var h = K.update.hinweis();
    if (!h) return null;
    return html`<${UI.Alert}
      titel=${K.t("update.titel", { version: h.version })}
      aktionen=${html`
        <${UI.Button} icon="download" href=${h.zip} target="_blank" rel="noopener noreferrer">${K.t("update.zumRelease")}<//>
        <${UI.Button} icon="book-open" href="#/wissen/update-installieren">${K.t("update.anleitung")}<//>
        <${UI.Button} onClick=${K.update.ausblenden}>${K.t("update.ausblenden")}<//>
      `}
      >${K.t("update.text")}<//
    >`;
  }

  S.Uebersicht = function () {
    K.useBeobachtbar(K.tresorStand);
    var d = K.tresor.daten();
    var f = hooks.useState(FILTER_LEER);
    var ansicht = hooks.useState("karten");
    var rueckfrage = hooks.useState(null);
    var erinnerungen = K.erinnerungen.liste();
    var treffer = filtern(d.bewerbungen, f[0]);
    var gefiltert = f[0].suche || f[0].status || f[0].ausrichtung || f[0].zeitraum;
    var mitRoute = erinnerungen.some(function (e) {
      return e.art === "termin" && e.termin.art === "vor_ort" && K.termine.ort(e.termin, e.bewerbung);
    });

    function setzen(feld) {
      return function (v) {
        var neu = Object.assign({}, f[0]);
        neu[feld] = v;
        f[1](neu);
      };
    }

    var kopf = html`<div class="rj-pagehead">
      <h1 class="h1">${K.t("nav.uebersicht")}</h1>
      ${d.bewerbungen.length > 0 && html`<${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.anlegen")}<//>`}
    </div>
    <${UpdateHinweis} />`;

    if (d.bewerbungen.length === 0) {
      return html`${kopf}
        <${UI.EmptyState} icon="briefcase-business" titel=${K.t("bewerbung.leerTitel")} text=${K.t("bewerbung.leerText")}>
          <${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.anlegen")}<//>
        <//>`;
    }

    return html`
      ${kopf}
      ${erinnerungen.length > 0 &&
      html`<section class="rj-stack" aria-label=${K.t("erinnerung.titel")}>
        ${erinnerungen.map(function (e) {
          return html`<${Erinnerung}
            key=${e.art + e.bewerbung.id + (e.termin ? e.termin.id : "")}
            eintrag=${e}
            beiRueckfrage=${function () {
              rueckfrage[1](e.bewerbung);
            }}
          />`;
        })}
        ${mitRoute && html`<p class="rj-muted">${K.t("route.hinweis")}</p>`}
      </section>`}
      <div class="rj-filterbar">
        <${UI.SearchField} label=${K.t("uebersicht.suchen")} platzhalter=${K.t("uebersicht.suchen")} wert=${f[0].suche} beiAenderung=${setzen("suche")} />
        <${UI.FilterSelect} icon="funnel" label=${K.t("bewerbung.status")} wert=${f[0].status} optionen=${optionenMit(K.t("uebersicht.alleStatus"), S.statusOptionen())} beiAenderung=${setzen("status")} />
        <${UI.FilterSelect}
          icon="funnel"
          label=${K.t("bewerbung.ausrichtung")}
          wert=${f[0].ausrichtung}
          optionen=${optionenMit(
            K.t("uebersicht.alleAusrichtungen"),
            d.ausrichtungen.map(function (a) {
              return { wert: a.id, label: a.name };
            }),
          )}
          beiAenderung=${setzen("ausrichtung")}
        />
        <${UI.FilterSelect}
          icon="funnel"
          label=${K.t("uebersicht.zeitraum")}
          wert=${f[0].zeitraum}
          optionen=${optionenMit(
            K.t("uebersicht.alleZeiten"),
            ZEITRAEUME.map(function (t) {
              return { wert: String(t), label: K.t("uebersicht.letzteTage", { tage: t }) };
            }),
          )}
          beiAenderung=${setzen("zeitraum")}
        />
        <${UI.FilterSelect}
          icon="arrow-up-down"
          label=${K.t("uebersicht.sortierung")}
          wert=${f[0].sortierung}
          optionen=${SORTIERUNGEN.map(function (s) {
            return { wert: s, label: K.t("uebersicht.sortierung." + s) };
          })}
          beiAenderung=${setzen("sortierung")}
        />
        <div class="rj-filter">
          <span class="rj-filter__titel" aria-hidden="true">${K.t("uebersicht.ansicht")}</span>
          <${UI.SegmentedControl}
            label=${K.t("uebersicht.ansicht")}
            wert=${ansicht[0]}
            optionen=${[
              { wert: "karten", icon: "layout-grid", label: K.t("uebersicht.karten") },
              { wert: "liste", icon: "list", label: K.t("uebersicht.liste") },
            ]}
            beiAenderung=${ansicht[1]}
          />
        </div>
      </div>
      <div class="rj-row" style="justify-content:space-between">
        <span class="rj-datatable__count" aria-live="polite">${K.t("tabelle.zaehler", { anzahl: treffer.length, gesamt: d.bewerbungen.length })}</span>
        ${gefiltert &&
        html`<${UI.Button}
          variante="ghost"
          onClick=${function () {
            f[1](Object.assign({}, FILTER_LEER, { sortierung: f[0].sortierung }));
          }}
          >${K.t("uebersicht.zuruecksetzen")}<//
        >`}
      </div>
      ${treffer.length === 0 && html`<${UI.EmptyState} icon="search-x" titel=${K.t("uebersicht.keineTreffer")} text=${K.t("uebersicht.keineTrefferText")} />`}
      ${treffer.length > 0 && ansicht[0] === "karten" && html`<${Karten} liste=${treffer} />`}
      ${treffer.length > 0 && ansicht[0] === "liste" && html`<${Tabelle} liste=${treffer} />`}
      ${rueckfrage[0] &&
      html`<${S.EmailDialog}
        bewerbung=${rueckfrage[0]}
        rueckfrage=${true}
        beiSchliessen=${function () {
          rueckfrage[1](null);
        }}
        beiErstellt=${function () {
          K.navigieren("bewerbungen/" + rueckfrage[0].id + "/details");
        }}
      />`}
    `;
  };
})();
