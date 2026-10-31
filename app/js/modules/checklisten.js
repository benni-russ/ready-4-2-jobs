(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ARTIKEL = { email: "serioese-email", linkedin: "linkedin-xing-profil", xing: "linkedin-xing-profil" };

  // mitLinks: Im Onboarding gibt es noch keinen Wissensbereich, zu dem man springen könnte.
  S.EinmalCheckliste = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var erledigt = K.tresor.daten().checklisten.einmal || {};
    return html`<${UI.Checklist}
      punkte=${K.CHECKLISTE_EINMAL.map(function (k) {
        return {
          schluessel: k,
          label: K.t("checkliste." + k),
          erklaerung: K.t("checkliste." + k + "Text"),
          wert: !!erledigt[k],
          aktion: props.mitLinks && ARTIKEL[k] && html`<${S.WissenLink} artikel=${ARTIKEL[k]} />`,
        };
      })}
      beiAenderung=${function (k, w) {
        K.tresor.aendern(function (d) {
          d.checklisten.einmal = Object.assign({}, d.checklisten.einmal);
          d.checklisten.einmal[k] = w;
        });
      }}
    />`;
  };

  function Einmalig() {
    K.useBeobachtbar(K.tresorStand);
    var haken = K.tresor.daten().checklisten.einmal || {};
    var erledigt = K.CHECKLISTE_EINMAL.filter(function (k) {
      return haken[k];
    }).length;
    var gesamt = K.CHECKLISTE_EINMAL.length;
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("checklisten.einmalig")}</h2>
      <${UI.ProgressBar} label=${K.t("checklisten.fortschritt")} text=${K.t("checklisten.stand", { erledigt: erledigt, gesamt: gesamt })} wert=${erledigt} max=${gesamt} />
      <${S.EinmalCheckliste} mitLinks=${true} />
    </section>`;
  }

  function ProBewerbung() {
    K.useBeobachtbar(K.tresorStand);
    var zeilen = K.tresor.daten().bewerbungen.map(function (b) {
      return { b: b, firma: b.firma.name, stelle: b.stelle.titel, stand: K.bewerbungen.checkliste(b) };
    });
    var spalten = [
      {
        schluessel: "firma",
        titel: K.t("bewerbung.firma"),
        zelle: function (z) {
          return html`<a class="rj-link" href=${"#/bewerbungen/" + z.b.id + "/details"}>${z.firma}</a>`;
        },
      },
      { schluessel: "stelle", titel: K.t("bewerbung.stelle") },
      {
        schluessel: "status",
        titel: K.t("bewerbung.status"),
        text: function (z) {
          return K.t("status." + K.bewerbungen.anzeigeStatus(z.b));
        },
        zelle: function (z) {
          return html`<${UI.StatusBadge} status=${K.bewerbungen.anzeigeStatus(z.b)} />`;
        },
      },
      {
        schluessel: "fortschritt",
        titel: K.t("checklisten.fortschritt"),
        text: function (z) {
          return K.t("checklisten.stand", z.stand);
        },
        sortwert: function (z) {
          return z.stand.erledigt;
        },
        zelle: function (z) {
          var text = K.t("checklisten.stand", z.stand);
          return html`<${UI.ProgressBar} label=${z.firma} labelVersteckt=${true} text=${text} wert=${z.stand.erledigt} max=${z.stand.gesamt} />`;
        },
      },
    ];
    return html`<section class="rj-card rj-stack">
      <h2 class="h3">${K.t("checklisten.proBewerbung")}</h2>
      ${zeilen.length > 0
        ? html`<${UI.DataTable} spalten=${spalten} zeilen=${zeilen} startSortierung=${{ spalte: "fortschritt", richtung: "ascending" }} />`
        : html`<${UI.EmptyState} icon="briefcase-business" titel=${K.t("checklisten.leerTitel")} text=${K.t("checklisten.leerText")}>
            <${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.anlegen")}<//>
          <//>`}
    </section>`;
  }

  S.Checklisten = function () {
    return html`
      <div class="rj-pagehead"><h1 class="h1">${K.t("nav.checklisten")}</h1></div>
      <${Einmalig} />
      <${ProBewerbung} />
    `;
  };
})();
