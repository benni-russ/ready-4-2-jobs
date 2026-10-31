(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ANLAGEFELDER = ["foto", "unterschrift"];
  var FELDER_PERSON = ["vorname", "nachname", "titel"];
  var FELDER_ADRESSE = ["strasse", "plz", "ort", "land"];
  var FELDER_ONLINE = ["linkedin", "xing", "website"];
  var FELDER_KONTAKT = ["email", "telefon"];
  var FELDER_BEWERBUNG = ["fuehrerschein", "kuendigungsfrist", "gehaltsvorstellung"];

  function setzenIn(p, feld, wert) {
    if (wert) p[feld] = wert;
    else delete p[feld];
  }

  function adresseSetzenIn(p, feld, wert) {
    p.adresse = Object.assign({}, p.adresse);
    p.adresse[feld] = wert;
  }

  function AnlageWahl(props) {
    var optionen = [{ wert: "", label: K.t("stammdaten.keineAnlage") }].concat(
      K.anlagen.auswahl([props.kategorie]).map(function (a) {
        return { wert: a.id, label: a.titel };
      }),
    );
    return html`<${UI.Select}
      label=${K.t("profil." + props.feld)}
      hinweis=${K.t("profil.anlageHinweis")}
      optionen=${optionen}
      wert=${props.profil[props.feld] || ""}
      beiAenderung=${function (w) {
        props.setze(props.feld, w);
      }}
    />`;
  }

  function Felder(props) {
    var p = props.profil;
    var a = p.adresse || {};

    function text(feld, extra) {
      return html`<${UI.TextField}
        label=${K.t("profil." + feld)}
        placeholder=${K.t("profil." + feld + "Platzhalter")}
        wert=${p[feld] || ""}
        beiAenderung=${function (w) {
          props.setze(feld, w);
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
          props.setzeAdresse(feld, w);
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
            props.setze("geburtsdatum", w);
          }}
        />
        ${adresse("strasse", { autocomplete: "street-address" })} ${adresse("plz", { autocomplete: "postal-code", inputmode: "numeric" })}
        ${adresse("ort", { autocomplete: "address-level2" })} ${adresse("land", { autocomplete: "country-name" })}
        ${text("email", { autocomplete: "email", type: "email", inputmode: "email" })} ${text("telefon", { autocomplete: "tel", inputmode: "tel" })}
      </div>
    `;
  }

  // Im Onboarding läuft alles durch den Autosave, dort gibt es keinen Bearbeiten-Schritt.
  S.PersoenlichFelder = function () {
    K.useBeobachtbar(K.tresorStand);
    return html`<${Felder}
      profil=${K.tresor.daten().profil}
      setze=${function (feld, wert) {
        K.tresor.aendern(function (d) {
          setzenIn(d.profil, feld, wert);
        });
      }}
      setzeAdresse=${function (feld, wert) {
        K.tresor.aendern(function (d) {
          adresseSetzenIn(d.profil, feld, wert);
        });
      }}
    />`;
  };

  function anlageTitel(id) {
    var a = K.tresor.daten().anlagen.filter(function (x) {
      return x.id === id;
    })[0];
    return a ? a.titel : "";
  }

  function datum(iso) {
    return iso ? window.R42J.formatDate(new Date(iso + "T00:00")) : "";
  }

  function eintraege(p, felder, werte) {
    return felder.map(function (f) {
      return [K.t("profil." + f), (werte || p)[f]];
    });
  }

  function Lesen(props) {
    var p = props.profil;
    var a = p.adresse || {};
    return html`<div class="rj-cards">
      <section class="rj-card rj-card--breit rj-stack">
        <${UI.LeseListe}
          eintraege=${eintraege(p, FELDER_PERSON)
            .concat([[K.t("profil.geburtsdatum"), datum(p.geburtsdatum)]])
            .concat(eintraege(p, FELDER_ADRESSE, a))
            .concat(eintraege(p, FELDER_KONTAKT))}
        />
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.online")}</h3>
        <${UI.LeseListe} eintraege=${eintraege(p, FELDER_ONLINE)} />
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.bewerbung")}</h3>
        <${UI.LeseListe}
          eintraege=${eintraege(p, FELDER_BEWERBUNG)
            .concat([[K.t("profil.verfuegbarAb"), datum(p.verfuegbarAb)]])
            .concat(
              ANLAGEFELDER.map(function (f) {
                return [K.t("profil." + f), anlageTitel(p[f])];
              }),
            )}
        />
      </section>
    </div>`;
  }

  function istLeer(p) {
    var a = p.adresse || {};
    return (
      !Object.keys(p).some(function (k) {
        return k !== "adresse" && p[k];
      }) &&
      !Object.keys(a).some(function (k) {
        return a[k];
      })
    );
  }

  S.StammdatenPersoenlich = function () {
    K.useBeobachtbar(K.tresorStand);
    var f = UI.useEntwurf({
      lesen: function () {
        return K.tresor.daten().profil;
      },
      schreiben: function (e) {
        K.tresor.aendern(function (d) {
          d.profil = JSON.parse(JSON.stringify(e));
        });
      },
      istLeer: istLeer,
    });
    var p = f.entwurf;

    function setze(feld, wert) {
      f.setze(function (e) {
        setzenIn(e, feld, wert);
      });
    }

    function text(feld, extra) {
      return html`<${UI.TextField}
        label=${K.t("profil." + feld)}
        placeholder=${K.t("profil." + feld + "Platzhalter")}
        wert=${p[feld] || ""}
        beiAenderung=${function (w) {
          setze(feld, w);
        }}
        ...${extra}
      />`;
    }

    var kopf = html`<div class="rj-pagehead">
      <h2 class="h2">${K.t("stammdaten.persoenlich")}</h2>
      ${!f.bearbeiten && html`<${UI.BearbeitenLeiste} form=${f} />`}
    </div>`;

    if (!f.bearbeiten) return html`${kopf}<${Lesen} profil=${K.tresor.daten().profil} />`;

    return html`
      ${kopf}
      <div class="rj-cards">
      <section class="rj-card rj-card--breit rj-stack">
        <${Felder}
          profil=${p}
          setze=${setze}
          setzeAdresse=${function (feld, wert) {
            f.setze(function (e) {
              adresseSetzenIn(e, feld, wert);
            });
          }}
        />
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.online")}</h3>
        <div class="rj-grid-2">${text("linkedin", { inputmode: "url" })} ${text("xing", { inputmode: "url" })} ${text("website", { inputmode: "url" })}</div>
      </section>
      <section class="rj-card rj-stack">
        <h3 class="h3">${K.t("profil.bewerbung")}</h3>
        <div class="rj-grid-2 rj-grid-2--drei">
          ${text("fuehrerschein")}
          <${UI.DatePicker}
            label=${K.t("profil.verfuegbarAb")}
            wert=${p.verfuegbarAb || ""}
            beiAenderung=${function (w) {
              setze("verfuegbarAb", w);
            }}
          />
          ${text("kuendigungsfrist")} ${text("gehaltsvorstellung")}
          <${AnlageWahl} feld="foto" kategorie="foto" profil=${p} setze=${setze} />
          <${AnlageWahl} feld="unterschrift" kategorie="unterschrift" profil=${p} setze=${setze} />
        </div>
      </section>
      </div>
      <${UI.BearbeitenLeiste} form=${f} />
    `;
  };
})();
