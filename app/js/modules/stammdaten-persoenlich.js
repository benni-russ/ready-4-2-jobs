(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  function setzen(feld, wert) {
    K.tresor.aendern(function (d) {
      if (wert) d.profil[feld] = wert;
      else delete d.profil[feld];
    });
  }

  function adresseSetzen(feld, wert) {
    K.tresor.aendern(function (d) {
      d.profil.adresse = Object.assign({}, d.profil.adresse);
      d.profil.adresse[feld] = wert;
    });
  }

  function AnlageWahl(props) {
    var p = K.tresor.daten().profil;
    var optionen = [{ wert: "", label: K.t("stammdaten.keineAnlage") }].concat(
      K.anlagen.auswahl([props.kategorie]).map(function (a) {
        return { wert: a.id, label: a.titel };
      }),
    );
    return html`<${UI.Select}
      label=${K.t("profil." + props.feld)}
      hinweis=${K.t("profil.anlageHinweis")}
      optionen=${optionen}
      wert=${p[props.feld] || ""}
      beiAenderung=${function (w) {
        setzen(props.feld, w);
      }}
    />`;
  }

  // Änderungen landen sofort im Tresor, das Speichern übernimmt der Autosave.
  S.PersoenlichFelder = function () {
    K.useBeobachtbar(K.tresorStand);
    var p = K.tresor.daten().profil;
    var a = p.adresse || {};

    function text(feld, extra) {
      return html`<${UI.TextField}
        label=${K.t("profil." + feld)}
        placeholder=${K.t("profil." + feld + "Platzhalter")}
        wert=${p[feld] || ""}
        beiAenderung=${function (w) {
          setzen(feld, w);
        }}
        ...${extra}
      />`;
    }

    function adresse(feld, extra) {
      return html`<${UI.TextField}
        label=${K.t("profil." + feld)}
        placeholder=${K.t("profil." + feld + "Platzhalter")}
        wert=${a[feld] || ""}
        beiAenderung=${function (w) {
          adresseSetzen(feld, w);
        }}
        ...${extra}
      />`;
    }

    return html`
      <div class="rj-grid-2">
        ${text("vorname", { autocomplete: "given-name" })} ${text("nachname", { autocomplete: "family-name" })}
        ${text("titel", { hinweis: K.t("profil.titelHinweis") })}
        <${UI.DatePicker}
          label=${K.t("profil.geburtsdatum")}
          wert=${p.geburtsdatum || ""}
          beiAenderung=${function (w) {
            setzen("geburtsdatum", w);
          }}
        />
        ${adresse("strasse", { autocomplete: "street-address" })} ${adresse("plz", { autocomplete: "postal-code", inputmode: "numeric" })}
        ${adresse("ort", { autocomplete: "address-level2" })} ${adresse("land", { autocomplete: "country-name" })}
        ${text("email", { autocomplete: "email", type: "email", inputmode: "email" })} ${text("telefon", { autocomplete: "tel", inputmode: "tel" })}
      </div>
    `;
  };

  S.StammdatenPersoenlich = function () {
    K.useBeobachtbar(K.tresorStand);
    var p = K.tresor.daten().profil;

    function text(feld, extra) {
      return html`<${UI.TextField}
        label=${K.t("profil." + feld)}
        placeholder=${K.t("profil." + feld + "Platzhalter")}
        wert=${p[feld] || ""}
        beiAenderung=${function (w) {
          setzen(feld, w);
        }}
        ...${extra}
      />`;
    }

    return html`
      <div class="rj-pagehead">
        <div>
          <h2 class="h2">${K.t("stammdaten.persoenlich")}</h2>
          <p class="rj-muted">${K.t("stammdaten.autosave")}</p>
        </div>
      </div>
      <section class="rj-card rj-stack">
        <${S.PersoenlichFelder} />
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.online")}</h3>
        <div class="rj-grid-2">${text("linkedin", { inputmode: "url" })} ${text("xing", { inputmode: "url" })} ${text("website", { inputmode: "url" })}</div>
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.bewerbung")}</h3>
        <div class="rj-grid-2">
          ${text("fuehrerschein")}
          <${UI.DatePicker}
            label=${K.t("profil.verfuegbarAb")}
            wert=${p.verfuegbarAb || ""}
            beiAenderung=${function (w) {
              setzen("verfuegbarAb", w);
            }}
          />
          ${text("kuendigungsfrist")} ${text("gehaltsvorstellung")}
          <${AnlageWahl} feld="foto" kategorie="foto" />
          <${AnlageWahl} feld="unterschrift" kategorie="unterschrift" />
        </div>
      </section>
    `;
  };
})();
