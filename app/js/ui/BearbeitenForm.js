(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  function klon(w) {
    return JSON.parse(JSON.stringify(w));
  }

  // Ausgefüllte Angaben sind geschützt: Änderungen entstehen im Entwurf und erreichen den Tresor erst beim Speichern.
  // optionen: lesen(), schreiben(entwurf), istLeer(wert)?, pruefen(entwurf)? liefert einen Fehlertext oder nichts.
  UI.useEntwurf = function (optionen) {
    var o = hooks.useRef(optionen);
    o.current = optionen;
    var entwurf = hooks.useState(function () {
      return klon(optionen.lesen());
    });
    var bearbeiten = hooks.useState(function () {
      return !!optionen.istLeer && optionen.istLeer(optionen.lesen());
    });
    var fehler = hooks.useState("");
    var laedt = hooks.useState(false);
    var aktuell = hooks.useRef(entwurf[0]);
    var basis = hooks.useRef(JSON.stringify(entwurf[0]));
    aktuell.current = entwurf[0];

    hooks.useEffect(
      function () {
        if (!bearbeiten[0]) return undefined;
        function geaendert() {
          return JSON.stringify(aktuell.current) !== basis.current;
        }
        K.verlassenSchutz.setzen(geaendert, function () {
          o.current.schreiben(aktuell.current);
        });
        return function () {
          K.verlassenSchutz.loesen(geaendert);
        };
      },
      [bearbeiten[0]],
    );

    var erstesMal = hooks.useRef(true);
    hooks.useEffect(
      function () {
        if (erstesMal.current) {
          erstesMal.current = false;
          return;
        }
        var ziel = document.querySelector(bearbeiten[0] ? "main input:not([type=file]):not([type=hidden]), main textarea" : "main .rj-editbar__aktionen button");
        if (ziel) ziel.focus();
      },
      [bearbeiten[0]],
    );

    function neuLaden() {
      var frisch = klon(o.current.lesen());
      basis.current = JSON.stringify(frisch);
      entwurf[1](frisch);
      fehler[1]("");
    }

    return {
      entwurf: entwurf[0],
      bearbeiten: bearbeiten[0],
      fehler: fehler[0],
      laedt: laedt[0],
      setze: function (aufgabe) {
        var neu = klon(aktuell.current);
        aufgabe(neu);
        aktuell.current = neu;
        entwurf[1](neu);
      },
      starten: function () {
        neuLaden();
        bearbeiten[1](true);
      },
      abbrechen: function () {
        neuLaden();
        bearbeiten[1](false);
      },
      speichern: async function () {
        var problem = o.current.pruefen && o.current.pruefen(aktuell.current);
        if (problem) return fehler[1](problem);
        laedt[1](true);
        try {
          o.current.schreiben(aktuell.current);
          await K.tresor.speichernJetzt();
          basis.current = JSON.stringify(aktuell.current);
          fehler[1]("");
          bearbeiten[1](false);
          K.meldung(K.t("speichern.gespeichert"));
        } catch (e) {
          // Der Entwurf bleibt stehen, damit nichts neu getippt werden muss.
          fehler[1](K.fehlerText(e));
        }
        laedt[1](false);
      },
    };
  };

  // Leseansicht: Knopf „Bearbeiten“. Im Bearbeiten: Leiste mit „Abbrechen“ und „Speichern“ am unteren Rand.
  UI.BearbeitenLeiste = function (props) {
    var f = props.form;
    if (!f.bearbeiten) {
      return html`<div class="rj-editbar">
        <span class="rj-muted">${props.hinweis}</span>
        <div class="rj-editbar__aktionen">
          <${UI.Button} icon="pencil" onClick=${f.starten}>${K.t("speichern.bearbeiten")}<//>
        </div>
      </div>`;
    }
    return html`<div class="rj-editbar rj-editbar--klebt">
      ${f.fehler ? html`<${UI.Alert} art="danger">${f.fehler}<//>` : html`<span class="rj-muted">${K.t("speichern.entwurfHinweis")}</span>`}
      <div class="rj-editbar__aktionen">
        <${UI.Button} variante="ghost" disabled=${f.laedt} onClick=${f.abbrechen}>${K.t("aktion.abbrechen")}<//>
        <${UI.Button} variante="primary" icon="save" laedt=${f.laedt} disabled=${f.laedt} onClick=${f.speichern}>${K.t("speichern.speichern")}<//>
      </div>
    </div>`;
  };

  // eintraege: [[beschriftung, wert]]. Leere Werte erscheinen nicht.
  UI.LeseListe = function (props) {
    var gefuellt = props.eintraege.filter(function (e) {
      return e[1];
    });
    if (!gefuellt.length) {
      return html`<p class="rj-muted">${K.t("speichern.nochLeer")}</p>
        ${props.leerAktion &&
        html`<div class="rj-row">
          <${UI.Button} icon="pencil" onClick=${props.leerAktion.onClick}>${props.leerAktion.label}<//>
        </div>`}`;
    }
    return html`<dl class=${"rj-readlist" + (props.voll ? " rj-readlist--voll" : "")}>
      ${gefuellt.map(function (e) {
        return html`<div key=${e[0]}>
          <dt>${e[0]}</dt>
          <dd>${e[1]}</dd>
        </div>`;
      })}
    </dl>`;
  };
})();
