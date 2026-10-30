(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var MODI = ["interview", "text"];
  // Kein Text enthält dieses Zeichen, so bleiben Kontext und eigener Text nach dem Maskieren trennbar.
  var TRENNER = "\u0000";

  function platzhalterSetzen(w) {
    K.tresor.aendern(function (t) {
      t.einstellungen.kiPlatzhalter = w;
    });
  }

  function maskeBauen(text) {
    var d = K.tresor.daten();
    return K.ki.platzhalterAktiv() ? K.ki.maskieren(text, d.profil, K.tresor.eintrag().name) : { text: text, karte: {} };
  }

  function alleIds(gruppen) {
    var ids = [];
    gruppen.forEach(function (g) {
      g.eintraege.forEach(function (e) {
        ids.push(e.id);
      });
    });
    return ids;
  }

  function Aktionen(props) {
    return html`<div class="rj-row">
      <${UI.Button} variante="primary" icon="check" disabled=${props.leer} onClick=${props.beiUebernehmen}>${K.t("import.uebernehmen")}<//>
      <${UI.Button} variante="ghost" onClick=${props.beiZurueck}>${K.t("aktion.zurueck")}<//>
    </div>`;
  }

  function Vorschau(props) {
    var v = props.vorschau;
    var gruppen = ["ausrichtungen", "erfolge", "kompetenzen", "interessen"].map(function (l) {
      return { titel: K.t("interview.gruppe." + l), eintraege: v.gruppen[l] };
    });
    var auswahl = hooks.useState(alleIds(gruppen));
    var plan = K.kiInterview.plan(v, auswahl[0]);

    return html`<${UI.ImportPreview} titel=${K.t("import.gueltig")} gruppen=${gruppen} wert=${auswahl[0]} beiAenderung=${auswahl[1]}>
      ${v.doppelt > 0 && html`<p class="rj-muted">${K.t("interview.doppelt", { anzahl: v.doppelt })}</p>`}
      ${plan.mehrKompetenzen.length > 0 &&
      html`<p class="rj-muted">
        ${K.t("interview.neueKompetenzen", {
          namen: plan.mehrKompetenzen
            .map(function (k) {
              return K.i18nText(k.name);
            })
            .join(", "),
        })}
      </p>`}
      ${plan.offen.length > 0 && html`<${UI.Alert} art="warning">${K.t("interview.offen", { namen: plan.offen.join(", ") })}<//>`}
      <${Aktionen}
        leer=${!auswahl[0].length}
        beiZurueck=${props.beiZurueck}
        beiUebernehmen=${function () {
          K.kiInterview.uebernehmen(v, auswahl[0]);
          K.meldung(K.t("interview.fertig", { anzahl: auswahl[0].length }));
          props.beiFertig();
        }}
      />
    <//>`;
  }

  // KI-Interview und Strukturieren eigener Texte (SPEC §6.3).
  S.KiInterview = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var modus = hooks.useState("interview");
    var bereich = hooks.useState("gesamt");
    var mitgeben = hooks.useState(false);
    var text = hooks.useState("");
    var vorschau = hooks.useState(null);

    var kontext = mitgeben[0] ? K.kiInterview.kontext() : "";
    var eigener = modus[0] === "text" ? text[0].replace(/\u0000/g, "") : "";
    // Beide Texte laufen gemeinsam durch die Maske, damit die Karte alle Platzhalter kennt.
    var maske = maskeBauen(kontext + TRENNER + eigener);
    var teile = maske.text.split(TRENNER);
    var prompt = K.t(modus[0] === "text" ? "ki.promptStrukturieren" : "ki.promptInterview", {
      thema: K.t("interview.thema." + bereich[0]),
      kontext: teile[0] || K.t("interview.keinKontext"),
      text: teile[1],
      vorlage: K.kiInterview.vorlage(bereich[0]),
    });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var probleme = K.kiInterview.pruefen(roh);
      if (probleme.length) return probleme;
      var v = K.kiInterview.lesen(roh);
      if (!K.kiInterview.anzahl(v)) throw K.Fehler(v.doppelt ? "interview.fehlerNurDoppelt" : "interview.fehlerLeer");
      vorschau[1](v);
      return [];
    }

    if (vorschau[0]) {
      return html`<${Vorschau}
        vorschau=${vorschau[0]}
        beiFertig=${props.beiFertig}
        beiZurueck=${function () {
          vorschau[1](null);
        }}
      />`;
    }

    return html`
      <div class="rj-stack">
        <p>${K.t("interview.text")}</p>
        <${UI.Alert} art="warning">${K.t("interview.datenschutz")}<//>
        <${UI.SegmentedControl}
          label=${K.t("interview.modus")}
          optionen=${MODI.map(function (m) {
            return { wert: m, label: K.t("interview.modus." + m) };
          })}
          wert=${modus[0]}
          beiAenderung=${modus[1]}
        />
        <${UI.Select}
          label=${K.t("interview.bereich")}
          optionen=${K.kiInterview.BEREICHE.map(function (b) {
            return { wert: b, label: K.t("interview.bereich." + b) };
          })}
          wert=${bereich[0]}
          beiAenderung=${bereich[1]}
        />
        ${modus[0] === "text" &&
        html`<${UI.Textarea}
          label=${K.t("interview.eigenerText")}
          placeholder=${K.t("interview.eigenerTextPlatzhalter")}
          hinweis=${K.t("interview.eigenerTextHinweis")}
          wert=${text[0]}
          beiAenderung=${text[1]}
          rows="6"
        />`}
        <${UI.Checkbox}
          label=${K.t("interview.mitgeben")}
          erklaerung=${K.t("interview.mitgebenHinweis")}
          wert=${mitgeben[0]}
          beiAenderung=${mitgeben[1]}
        />
        <${UI.PromptPanel}
          prompt=${prompt}
          platzhalter=${K.ki.platzhalterAktiv()}
          beiPlatzhalter=${platzhalterSetzen}
          beiPruefen=${pruefen}
          beiSelbst=${props.beiFertig}
          datei=${true}
        />
      </div>
    `;
  };

  // Fehlende Fassungen zweisprachiger Felder per KI ergänzen (SPEC §6.3).
  S.UebersetzungenErgaenzen = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var ergebnis = hooks.useState(null);
    var auswahl = hooks.useState([]);
    var offen = hooks.useRef(K.kiInterview.offen()).current;

    if (!offen.length) {
      return html`<div class="rj-stack">
        <${UI.Alert} art="success">${K.t("uebersetzen.leer")}<//>
        <div class="rj-row"><${UI.Button} onClick=${props.beiFertig}>${K.t("aktion.zurueck")}<//></div>
      </div>`;
    }

    var maske = maskeBauen(K.kiInterview.uebersetzungFelder(offen));
    var prompt = K.t("ki.promptUebersetzen", { felder: maske.text });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var r = K.kiInterview.uebersetzungLesen(roh, offen);
      if (r.probleme.length) return r.probleme;
      auswahl[1](
        r.liste.map(function (u) {
          return u.id;
        }),
      );
      ergebnis[1](r.liste);
      return [];
    }

    if (ergebnis[0]) {
      var gruppen = [
        {
          titel: K.t("uebersetzen.gruppe"),
          eintraege: ergebnis[0].map(function (u) {
            return { id: u.id, label: u.neu, erklaerung: u.text };
          }),
        },
      ];
      return html`<${UI.ImportPreview} titel=${K.t("import.gueltig")} gruppen=${gruppen} wert=${auswahl[0]} beiAenderung=${auswahl[1]}>
        ${ergebnis[0].length < offen.length &&
        html`<p class="rj-muted">${K.t("uebersetzen.teilweise", { anzahl: ergebnis[0].length, gesamt: offen.length })}</p>`}
        <${Aktionen}
          leer=${!auswahl[0].length}
          beiZurueck=${function () {
            ergebnis[1](null);
          }}
          beiUebernehmen=${function () {
            K.kiInterview.uebersetzungUebernehmen(
              ergebnis[0].filter(function (u) {
                return auswahl[0].indexOf(u.id) > -1;
              }),
            );
            K.meldung(K.t("uebersetzen.fertig", { anzahl: auswahl[0].length }));
            props.beiFertig();
          }}
        />
      <//>`;
    }

    return html`
      <div class="rj-stack">
        <p>${K.t("uebersetzen.text", { anzahl: offen.length })}</p>
        <${UI.Alert} art="warning">${K.t("interview.datenschutz")}<//>
        <${UI.PromptPanel}
          prompt=${prompt}
          platzhalter=${K.ki.platzhalterAktiv()}
          beiPlatzhalter=${platzhalterSetzen}
          beiPruefen=${pruefen}
          datei=${true}
        />
      </div>
    `;
  };
})();
