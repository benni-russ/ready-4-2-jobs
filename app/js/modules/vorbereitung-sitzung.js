(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function Karte(props) {
    var f = props.frage;
    var offen = hooks.useState(false);
    var stand = K.lernen.stand(f.kartenId);

    function bewerten(gewusst) {
      K.lernen.bewerten(f.kartenId, gewusst);
      props.beiFertig(gewusst);
    }

    return html`<${UI.Flashcard}
      kopf=${props.kopf}
      box=${stand ? stand.box : 1}
      frage=${f.frage}
      antwort=${f.antworten[f.richtig[0]]}
      erklaerung=${f.erklaerung}
      offen=${offen[0]}
      beiZeigen=${function () {
        offen[1](true);
      }}
      beiBewerten=${bewerten}
    />`;
  }

  function Auswahl(props) {
    var f = props.frage;
    var mehrere = f.typ === "mc-multi";
    var kopf = hooks.useRef(null);
    var weiter = hooks.useRef(null);
    var optionen = hooks.useState(function () {
      return K.lernen.mischen(
        f.antworten.map(function (t, i) {
          return { text: t, richtig: f.richtig.indexOf(i) > -1 };
        }),
      );
    })[0];
    var auswahl = hooks.useState([]);
    var ergebnis = hooks.useState(null);

    hooks.useEffect(function () {
      kopf.current.focus();
    }, []);

    hooks.useEffect(
      function () {
        if (ergebnis[0] !== null) weiter.current.querySelector("button").focus();
      },
      [ergebnis[0]],
    );

    function aufloesen(gewaehlt) {
      var gewusst = optionen.every(function (o, i) {
        return o.richtig === (gewaehlt.indexOf(i) > -1);
      });
      K.lernen.bewerten(f.kartenId, gewusst);
      ergebnis[1](gewusst);
    }

    function wahl(i) {
      if (!mehrere) {
        auswahl[1]([i]);
        return aufloesen([i]);
      }
      auswahl[1](function (alt) {
        return alt.indexOf(i) > -1
          ? alt.filter(function (x) {
              return x !== i;
            })
          : alt.concat([i]);
      });
    }

    var fertig = ergebnis[0] !== null;
    return html`<div class="rj-flash">
      <div class="rj-flash__meta"><span>${props.kopf}</span></div>
      <p class="rj-flash__q" tabindex="-1" ref=${kopf}>${f.frage}</p>
      ${mehrere && html`<p class="rj-hint">${K.t("quiz.mehrere")}</p>`}
      <${UI.Quiz} optionen=${optionen} mehrere=${mehrere} auswahl=${auswahl[0]} aufgeloest=${fertig} beiWahl=${wahl} />
      ${fertig &&
      html`<${UI.Alert} art=${ergebnis[0] ? "success" : "info"}>
        <strong>${K.t(ergebnis[0] ? "quiz.stimmt" : "quiz.stimmtNicht")}</strong>${f.erklaerung ? " " + f.erklaerung : ""}
      <//>`}
      <div class="rj-row" ref=${weiter}>
        ${fertig
          ? html`<${UI.Button}
              variante="primary"
              iconHinten="arrow-right"
              onClick=${function () {
                props.beiFertig(ergebnis[0]);
              }}
              >${K.t("quiz.weiter")}<//
            >`
          : mehrere &&
            html`<${UI.Button}
              variante="primary"
              icon="check"
              disabled=${auswahl[0].length === 0}
              onClick=${function () {
                aufloesen(auswahl[0]);
              }}
              >${K.t("quiz.pruefen")}<//
            >`}
      </div>
    </div>`;
  }

  function Abschluss(props) {
    var knopf = hooks.useRef(null);
    hooks.useEffect(function () {
      knopf.current.focus();
    }, []);
    return html`<div class="rj-stack">
      <h2 class="h2" tabindex="-1" ref=${knopf}>${K.t("sitzung.fertig")}</h2>
      <div class="rj-grid-2">
        <div class="rj-stat">
          <span class="rj-stat__label">${K.t("sitzung.gewusst")}</span>
          <span class="rj-stat__value">${props.gewusst}</span>
          <span class="rj-stat__basis">${K.t("sitzung.vonKarten", { gesamt: props.gesamt })}</span>
        </div>
        <div class="rj-stat">
          <span class="rj-stat__label">${K.t("sitzung.wiederholen")}</span>
          <span class="rj-stat__value">${props.gesamt - props.gewusst}</span>
          <span class="rj-stat__basis">${K.t("sitzung.morgenWieder")}</span>
        </div>
      </div>
      <div class="rj-row"><${UI.Button} variante="primary" onClick=${props.beiEnde}>${K.t("sitzung.zurueck")}<//></div>
    </div>`;
  }

  // Führt durch eine feste Liste. Jede Antwort landet sofort im Lernstand, Abbrechen verliert also nichts.
  S.LernSitzung = function (props) {
    var karten = props.karten;
    var nr = hooks.useState(0);
    var gewusst = hooks.useState(0);
    var f = karten[nr[0]];

    function fertig(ok) {
      if (ok) gewusst[1](gewusst[0] + 1);
      nr[1](nr[0] + 1);
    }

    if (!f) return html`<${Abschluss} gewusst=${gewusst[0]} gesamt=${karten.length} beiEnde=${props.beiEnde} />`;

    var kopf = K.t("sitzung.kopf", { titel: props.titel, nr: nr[0] + 1, gesamt: karten.length });
    var Teil = f.typ === "karte" ? Karte : Auswahl;
    return html`<div class="rj-stack">
      <div class="rj-row" style="justify-content:space-between">
        <${UI.ProgressBar}
          label=${K.t("sitzung.fortschritt")}
          text=${K.t("sitzung.stand", { nr: nr[0], gesamt: karten.length })}
          wert=${nr[0]}
          max=${karten.length}
        />
        <${UI.Button} variante="ghost" icon="x" onClick=${props.beiEnde}>${K.t("sitzung.beenden")}<//>
      </div>
      <div lang=${props.sprache}>
        <${Teil} frage=${f} kopf=${kopf} beiFertig=${fertig} key=${f.kartenId} />
      </div>
    </div>`;
  };
})();
