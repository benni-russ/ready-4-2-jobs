(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ALLE = "alle";

  function Bearbeiten(props) {
    var entwurf = hooks.useState(props.anlage);
    var e = entwurf[0];

    function setze(feld, wert) {
      var n = Object.assign({}, e);
      if (wert === "") delete n[feld];
      else n[feld] = wert;
      entwurf[1](n);
    }

    return html`<${UI.Dialog}
      titel=${K.t("anlagen.bearbeiten")}
      bestaetigen=${K.t("aktion.speichern")}
      eigenePruefung=${true}
      beiBestaetigen=${function () {
        K.stammdaten.speichern("anlagen", Object.assign({}, e, { titel: (e.titel || "").trim() || props.anlage.titel }));
        K.meldung(K.t("stammdaten.gespeichert"));
        props.beiSchliessen();
      }}
      beiSchliessen=${props.beiSchliessen}
    >
      <${UI.TextField}
        label=${K.t("anlagen.titel")}
        wert=${e.titel || ""}
        beiAenderung=${function (w) {
          setze("titel", w);
        }}
      />
      <div class="rj-grid-2">
        <${UI.Select}
          label=${K.t("anlagen.kategorie")}
          optionen=${K.ANLAGE_KATEGORIEN.map(function (k) {
            return { wert: k, label: K.t("anlagen.kategorie." + k) };
          })}
          wert=${e.kategorie}
          beiAenderung=${function (w) {
            setze("kategorie", w);
          }}
        />
        <${UI.DatePicker}
          label=${K.t("anlagen.datum")}
          wert=${e.datum || ""}
          beiAenderung=${function (w) {
            setze("datum", w);
          }}
        />
      </div>
      <${UI.TagInput}
        label=${K.t("anlagen.tags")}
        platzhalter=${K.t("anlagen.tagPlatzhalter")}
        wert=${e.tags}
        beiAenderung=${function (w) {
          setze("tags", w);
        }}
      />
    <//>`;
  }

  S.Anlagen = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var alle = K.tresor.daten().anlagen;
    var suche = hooks.useState("");
    var kategorie = hooks.useState(ALLE);
    var laden = hooks.useState(false);
    var fehler = hooks.useState([]);
    var vorschau = hooks.useState(null);
    var bearbeiten = hooks.useState(null);
    var loeschen = hooks.useState(null);
    var id = props.teile[0];

    hooks.useEffect(
      function () {
        var treffer = alle.find(function (a) {
          return a.id === id;
        });
        if (treffer) vorschau[1](treffer);
      },
      [id],
    );

    async function hochladen(dateien) {
      laden[1](true);
      fehler[1]([]);
      var probleme = [];
      for (var i = 0; i < dateien.length; i++) {
        try {
          await K.anlagen.hinzufuegen(dateien[i]);
        } catch (e) {
          probleme.push(dateien[i].name + ": " + K.fehlerText(e));
        }
      }
      fehler[1](probleme);
      laden[1](false);
      var fertig = dateien.length - probleme.length;
      if (fertig) K.meldung(K.t("anlagen.hinzugefuegt", { n: fertig }));
    }

    async function entfernen() {
      var a = loeschen[0];
      loeschen[1](null);
      try {
        await K.anlagen.loeschen(a.id);
        K.meldung(K.t("stammdaten.geloescht"));
      } catch (e) {
        K.meldung(K.fehlerText(e), "danger");
      }
    }

    var q = K.normalisieren(suche[0].trim());
    var sichtbar = alle.filter(function (a) {
      if (kategorie[0] !== ALLE && a.kategorie !== kategorie[0]) return false;
      return !q || K.normalisieren([a.titel, a.dateiname].concat(a.tags).join(" ")).indexOf(q) > -1;
    });

    return html`
      <div class="rj-pagehead">
        <div>
          <h1 class="h1">${K.t("nav.anlagen")}</h1>
          <p class="rj-muted">${K.t("anlagen.erklaerung")}</p>
        </div>
      </div>
      <${UI.FileDrop} hinweis=${K.t("drop.hinweis")} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" beiDateien=${hochladen} />
      ${laden[0] && html`<p class="rj-muted" role="status"><span class="rj-spinner"></span> ${K.t("anlagen.verschluesselt")}</p>`}
      ${fehler[0].length > 0 &&
      html`<${UI.Alert} art="danger">
        ${fehler[0].map(function (f, i) {
          return html`<div key=${i}>${f}</div>`;
        })}
      <//>`}
      ${alle.length === 0 && !laden[0] && html`<${UI.EmptyState} icon="files" titel=${K.t("anlagen.leerTitel")} text=${K.t("anlagen.leerText")} />`}
      ${alle.length > 0 &&
      html`<div class="rj-grid-2">
        <${UI.SearchField} label=${K.t("anlagen.suchen")} platzhalter=${K.t("anlagen.suchen")} wert=${suche[0]} beiAenderung=${suche[1]} />
        <${UI.Select}
          label=${K.t("anlagen.kategorie")}
          optionen=${[{ wert: ALLE, label: K.t("anlagen.alleKategorien") }].concat(
            K.ANLAGE_KATEGORIEN.map(function (k) {
              return { wert: k, label: K.t("anlagen.kategorie." + k) };
            }),
          )}
          wert=${kategorie[0]}
          beiAenderung=${kategorie[1]}
        />
      </div>`}
      ${alle.length > 0 && !sichtbar.length && html`<p class="rj-muted">${K.t("anlagen.keineTreffer")}</p>`}
      <div class="rj-stack" style="gap:var(--space-2)">
        ${sichtbar.map(function (a) {
          return html`<${UI.FileItem} key=${a.id} name=${a.titel} meta=${K.anlagen.meta(a)}>
            <${UI.IconButton}
              icon="eye"
              label=${K.t("anlagen.vorschauVon", { name: a.titel })}
              onClick=${function () {
                vorschau[1](a);
              }}
            />
            <${UI.IconButton}
              icon="pencil"
              label=${K.t("stammdaten.bearbeitenVon", { name: a.titel })}
              onClick=${function () {
                bearbeiten[1](a);
              }}
            />
            <${UI.IconButton}
              icon="trash-2"
              gefahr=${true}
              label=${K.t("stammdaten.loeschenVon", { name: a.titel })}
              onClick=${function () {
                loeschen[1](a);
              }}
            />
          <//>`;
        })}
      </div>
      ${vorschau[0] &&
      html`<${UI.FilePreview}
        key=${vorschau[0].id}
        anlage=${vorschau[0]}
        beiSchliessen=${function () {
          vorschau[1](null);
          if (id) K.navigieren("anlagen");
        }}
      />`}
      ${bearbeiten[0] &&
      html`<${Bearbeiten}
        key=${bearbeiten[0].id}
        anlage=${bearbeiten[0]}
        beiSchliessen=${function () {
          bearbeiten[1](null);
        }}
      />`}
      ${loeschen[0] &&
      html`<${UI.Dialog}
        titel=${K.t("stammdaten.loeschenTitel")}
        bestaetigen=${K.t("aktion.loeschen")}
        gefahr=${true}
        beiBestaetigen=${entfernen}
        beiSchliessen=${function () {
          loeschen[1](null);
        }}
      >
        <p>${K.t("anlagen.loeschenText", { name: loeschen[0].titel })}</p>
        ${K.anlagen.verwendung(loeschen[0].id).length > 0 &&
        html`<${UI.Alert} art="warning">
          ${K.t("anlagen.inVerwendung", {
            firmen: K.anlagen
              .verwendung(loeschen[0].id)
              .map(function (b) {
                return b.firma.name;
              })
              .join(", "),
          })}
        <//>`}
      <//>`}
    `;
  };
})();
