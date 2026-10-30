(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var REITER = ["angebote", "punkte", "achten"];

  function geld(w, stellen) {
    return w.toLocaleString(K.sprache(), { style: "currency", currency: "EUR", minimumFractionDigits: stellen, maximumFractionDigits: stellen });
  }

  function dezimal(w) {
    return w.toLocaleString(K.sprache(), { maximumFractionDigits: 1 });
  }

  // Gleiche Firma zweimal: Erst die Stelle macht die Spalten unterscheidbar.
  function namen(liste) {
    var ergebnis = {};
    liste.forEach(function (b) {
      var doppelt = liste.some(function (x) {
        return x !== b && x.firma.name === b.firma.name;
      });
      ergebnis[b.id] = doppelt ? b.firma.name + " · " + b.stelle.titel : b.firma.name;
    });
    return ergebnis;
  }

  function zahlZeile(id, liste, opt) {
    var werte = liste.map(opt.wert);
    var beste = opt.richtung ? K.vergleich.beste(werte, opt.richtung === "klein") : [];
    return {
      schluessel: id,
      titel: K.t("vergleich.zeile." + id),
      erklaerung: opt.erklaerung,
      zellen: werte.map(function (w, i) {
        return w === null
          ? { text: K.t(opt.fehltText || "vergleich.nichtAngegeben"), fehlt: true }
          : { text: opt.text(w), beste: beste[i] };
      }),
    };
  }

  function feldZeile(id, liste, text, richtung) {
    return zahlZeile(id, liste, {
      wert: function (b) {
        return typeof b.angebot[id] === "number" ? b.angebot[id] : null;
      },
      text: text,
      richtung: richtung,
    });
  }

  function textZeile(id, liste, text) {
    return {
      schluessel: id,
      titel: K.t("vergleich.zeile." + id),
      zellen: liste.map(function (b) {
        var t = text(b.angebot);
        return t ? { text: t } : { text: K.t("vergleich.nichtAngegeben"), fehlt: true };
      }),
    };
  }

  function einheit(schluessel, einzahl) {
    return function (w) {
      return w === 1 && einzahl ? K.t(einzahl) : K.t(schluessel, { anzahl: dezimal(w) });
    };
  }

  function Tabelle(props) {
    var liste = props.liste;
    var bez = namen(liste);
    var pauschale = K.vergleich.feiertagsWochen();
    function euro(w) {
      return geld(w, 0);
    }
    var zeilen = [
      feldZeile("bruttoJahr", liste, euro, "gross"),
      feldZeile("bonusJahr", liste, euro, "gross"),
      feldZeile("nettoMonat", liste, euro, "gross"),
      feldZeile("wochenstunden", liste, einheit("vergleich.stunden")),
      feldZeile("urlaubstage", liste, einheit("vergleich.tage", "vergleich.tag"), "gross"),
      feldZeile("homeofficeTage", liste, einheit("vergleich.tage", "vergleich.tag"), "gross"),
      feldZeile("praesenzTage", liste, einheit("vergleich.tage", "vergleich.tag")),
      feldZeile("pendelMinutenEinfach", liste, einheit("vergleich.minuten"), "klein"),
      feldZeile("pendelKostenMonat", liste, euro, "klein"),
      zahlZeile("arbeitswochen", liste, {
        wert: function (b) {
          return K.vergleich.arbeitswochen(b.angebot, pauschale);
        },
        text: dezimal,
        fehltText: "vergleich.nichtBerechenbar",
        erklaerung: K.t("vergleich.formelWochen", { pauschale: pauschale }),
      }),
      zahlZeile("pendelStunden", liste, {
        wert: function (b) {
          return K.vergleich.pendelStunden(b.angebot);
        },
        text: einheit("vergleich.stunden"),
        richtung: "klein",
        fehltText: "vergleich.nichtBerechenbar",
        erklaerung: K.t("vergleich.formelPendel"),
      }),
      zahlZeile("stundenlohn", liste, {
        wert: function (b) {
          return K.vergleich.stundenlohn(b.angebot, pauschale);
        },
        text: function (w) {
          return geld(w, 2);
        },
        richtung: "gross",
        fehltText: "vergleich.nichtBerechenbar",
        erklaerung: K.t("vergleich.formelLohn"),
      }),
      textZeile("befristet", liste, function (a) {
        return typeof a.befristet === "boolean" ? K.t(a.befristet ? "angebot.befristet.ja" : "angebot.befristet.nein") : "";
      }),
      feldZeile("probezeitMonate", liste, einheit("vergleich.monate", "vergleich.monat")),
      textZeile("zusatzleistungen", liste, function (a) {
        return (a.zusatzleistungen || []).join(", ");
      }),
    ];
    var luecken = liste.filter(function (b) {
      return K.vergleich.stundenlohn(b.angebot, pauschale) === null;
    });
    return html`
      <${UI.ComparisonTable}
        label=${K.t("vergleich.tabelle")}
        kopf=${K.t("vergleich.kriteriumSpalte")}
        spalten=${liste.map(function (b) {
          return { schluessel: b.id, titel: bez[b.id] };
        })}
        zeilen=${zeilen}
      />
      <p class="rj-hint">${K.t("vergleich.formelLohn")}</p>
      ${luecken.map(function (b) {
        var felder = K.vergleich.fehlendeFelder(b.angebot);
        return html`<${UI.Alert} art="warning" key=${b.id}>
          ${K.t(felder.length ? "vergleich.lueckeFelder" : "vergleich.lueckeWerte", {
            firma: bez[b.id],
            felder: felder
              .map(function (f) {
                return K.t("angebot.feld." + f);
              })
              .join(", "),
          })}
        <//>`;
      })}
    `;
  }

  function Punkte(props) {
    var liste = props.liste;
    var bez = namen(liste);
    var kriterien = K.vergleich.kriterien();
    var neu = hooks.useState("");
    var ergebnis = K.vergleich.wertung(
      liste.map(function (b) {
        return { id: b.id, angebot: b.angebot };
      }),
      kriterien,
      K.vergleich.feiertagsWochen(),
    );
    var manuell = kriterien.filter(function (k) {
      return k.typ === "manuell";
    });
    var nichtsGewichtet = !kriterien.some(function (k) {
      return k.gewicht > 0;
    });

    function name(id) {
      return K.vergleich.kriteriumName(
        kriterien.filter(function (k) {
          return k.id === id;
        })[0],
      );
    }

    function anlegen() {
      var t = neu[0].trim();
      if (!t) return;
      K.vergleich.kriteriumNeu(t);
      neu[1]("");
    }

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("vergleich.rangfolge")}</h2>
        ${nichtsGewichtet && html`<${UI.Alert} art="warning">${K.t("vergleich.keinGewicht")}<//>`}
        <div aria-live="polite">
          <${UI.ScoreList}
            eintraege=${ergebnis.map(function (e) {
              return {
                schluessel: e.id,
                platz: e.platz,
                name: bez[e.id],
                punkte: e.punkte,
                text:
                  e.punkte === null
                    ? K.t("vergleich.keineWertung")
                    : K.t("vergleich.punkteText", { punkte: e.punkte.toLocaleString(K.sprache(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }),
                hinweis:
                  e.fehlend.length && e.punkte !== null
                    ? K.t("vergleich.ohneKriterien", { kriterien: e.fehlend.map(name).join(", ") })
                    : "",
              };
            })}
          />
        </div>
        <p class="rj-hint">${K.t("vergleich.wertungHinweis")}</p>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("vergleich.gewichte")}</h2>
        <div class="rj-grid-2">
          ${kriterien.map(function (k) {
            return html`<${UI.Slider}
              key=${k.id}
              label=${K.vergleich.kriteriumName(k)}
              min="0"
              max="5"
              wert=${k.gewicht}
              skalaMin=${K.t("vergleich.unwichtig")}
              skalaMax=${K.t("vergleich.sehrWichtig")}
              beiAenderung=${function (w) {
                K.vergleich.gewichtSetzen(k.id, w);
              }}
            />`;
          })}
        </div>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("vergleich.bewertungen")}</h2>
        <p class="rj-hint">${K.t("vergleich.bewertungenHinweis")}</p>
        ${manuell.map(function (k) {
          return html`<fieldset class="rj-fieldset rj-stack" key=${k.id}>
            <legend>${K.vergleich.kriteriumName(k)}</legend>
            <div class="rj-grid-2">
              ${liste.map(function (b) {
                var w = b.angebot.bewertungen[k.id];
                return html`<${UI.Slider}
                  key=${b.id}
                  label=${bez[b.id]}
                  min="0"
                  max="10"
                  wert=${typeof w === "number" ? w : 5}
                  skalaMin=${K.t("vergleich.schlecht")}
                  skalaMax=${K.t("vergleich.gut")}
                  beiAenderung=${function (x) {
                    K.vergleich.bewertungSetzen(b.id, k.id, x);
                  }}
                />`;
              })}
            </div>
            ${!K.vergleich.istStandard(k.id) &&
            html`<div class="rj-row">
              <${UI.Button}
                icon="trash-2"
                onClick=${function () {
                  K.vergleich.kriteriumLoeschen(k.id);
                }}
                >${K.t("vergleich.kriteriumLoeschen", { name: k.name })}<//
              >
            </div>`}
          </fieldset>`;
        })}
        <${UI.TextField}
          label=${K.t("vergleich.kriteriumNeu")}
          placeholder=${K.t("vergleich.kriteriumPlatzhalter")}
          wert=${neu[0]}
          beiAenderung=${neu[1]}
        />
        <div class="rj-row"><${UI.Button} icon="plus" onClick=${anlegen}>${K.t("vergleich.kriteriumAnlegen")}<//></div>
      </section>
    `;
  }

  function Achten(props) {
    var bez = namen(props.liste);
    return html`${props.liste.map(function (b) {
      var haken = b.angebot.pruefliste || {};
      var erledigt = K.vergleich.PRUEFLISTE.filter(function (p) {
        return haken[p.id];
      }).length;
      var gesamt = K.vergleich.PRUEFLISTE.length;
      return html`<section class="rj-card rj-stack" key=${b.id}>
        <h2 class="h3">${bez[b.id]}</h2>
        <${UI.TagInput}
          label=${K.t("vergleich.achtenAuf")}
          hinweis=${K.t("vergleich.achtenAufHinweis")}
          platzhalter=${K.t("vergleich.achtenAufPlatzhalter")}
          wert=${b.angebot.achtenAuf}
          beiAenderung=${function (w) {
            K.vergleich.achtenAufSetzen(b.id, w);
          }}
        />
        <${UI.ProgressBar}
          label=${K.t("vergleich.pruefliste")}
          text=${K.t("vergleich.prueflisteStand", { erledigt: erledigt, gesamt: gesamt })}
          wert=${erledigt}
          max=${gesamt}
        />
        <${UI.Checklist}
          punkte=${K.vergleich.PRUEFLISTE.map(function (p) {
            var thema = K.t("vergleich.pruefung." + p.id);
            return {
              schluessel: p.id,
              label: thema,
              erklaerung: K.t("vergleich.pruefungText." + p.id),
              wert: !!haken[p.id],
              aktion: html`<${UI.Button} icon="book-open" href=${"#/wissen/" + p.artikel}>${K.t("vergleich.mehrDazu", { thema: thema })}<//>`,
            };
          })}
          beiAenderung=${function (id, w) {
            K.vergleich.prueflisteSetzen(b.id, id, w);
          }}
        />
      </section>`;
    })}`;
  }

  function AngebotWahl(props) {
    var offen = K.tresor.daten().bewerbungen.filter(function (b) {
      return !b.angebot;
    });
    var wahl = hooks.useState(offen.length ? offen[0].id : "");
    return html`<${UI.Dialog}
      titel=${K.t("angebot.erfassen")}
      bestaetigen=${K.t("vergleich.weiter")}
      beiBestaetigen=${function () {
        K.navigieren("vergleich/angebot/" + wahl[0]);
      }}
      beiSchliessen=${props.beiSchliessen}
    >
      <${UI.Select}
        label=${K.t("vergleich.bewerbungWaehlen")}
        wert=${wahl[0]}
        optionen=${offen.map(function (b) {
          return { wert: b.id, label: b.firma.name + " · " + b.stelle.titel };
        })}
        beiAenderung=${wahl[1]}
      />
    <//>`;
  }

  function Seite() {
    var bewerbungen = K.tresor.daten().bewerbungen;
    var alle = K.vergleich.mitAngebot();
    var auswahl = hooks.useState(null);
    var reiter = hooks.useState("angebote");
    var dialog = hooks.useState(false);
    var ohneAngebot = bewerbungen.length > alle.length;
    var bez = namen(alle);

    var gewaehlt =
      auswahl[0] ||
      alle.slice(0, K.vergleich.MAX_ANGEBOTE).map(function (b) {
        return b.id;
      });
    var liste = alle.filter(function (b) {
      return gewaehlt.indexOf(b.id) > -1;
    });
    var voll = liste.length >= K.vergleich.MAX_ANGEBOTE;

    function umschalten(id, an) {
      var ids = liste.map(function (b) {
        return b.id;
      });
      auswahl[1](
        an
          ? ids.concat([id])
          : ids.filter(function (x) {
              return x !== id;
            }),
      );
    }

    var erfassen =
      ohneAngebot &&
      html`<${UI.Button}
        variante=${alle.length ? "secondary" : "primary"}
        icon="plus"
        onClick=${function () {
          dialog[1](true);
        }}
        >${K.t("angebot.erfassen")}<//
      >`;
    var wahlDialog =
      dialog[0] &&
      html`<${AngebotWahl}
        beiSchliessen=${function () {
          dialog[1](false);
        }}
      />`;

    if (!alle.length) {
      return html`
        <div class="rj-pagehead"><h1 class="h1">${K.t("nav.vergleich")}</h1></div>
        <${UI.EmptyState} icon="scale" titel=${K.t("vergleich.leerTitel")} text=${K.t("vergleich.leerText")}>
          ${erfassen || html`<${UI.Button} variante="primary" icon="plus" href="#/bewerbungen/neu">${K.t("bewerbung.neu")}<//>`}
        <//>
        ${wahlDialog}
      `;
    }

    var genug = liste.length >= K.vergleich.MIN_ANGEBOTE;
    return html`
      <div class="rj-pagehead">
        <h1 class="h1">${K.t("nav.vergleich")}</h1>
        ${erfassen}
      </div>
      <section class="rj-card rj-stack">
        <fieldset class="rj-fieldset">
          <legend>${K.t("vergleich.auswahl", { anzahl: liste.length, max: K.vergleich.MAX_ANGEBOTE })}</legend>
          ${alle.map(function (b) {
            var an = gewaehlt.indexOf(b.id) > -1;
            return html`<div class="rj-row rj-row--between" key=${b.id}>
              <${UI.Checkbox}
                label=${bez[b.id]}
                erklaerung=${voll && !an ? K.t("vergleich.auswahlVoll") : b.stelle.titel}
                wert=${an}
                disabled=${voll && !an}
                beiAenderung=${function (w) {
                  umschalten(b.id, w);
                }}
              />
              <${UI.IconButton}
                icon="pencil"
                label=${K.t("vergleich.angebotBearbeiten", { firma: bez[b.id] })}
                onClick=${function () {
                  K.navigieren("vergleich/angebot/" + b.id);
                }}
              />
            </div>`;
          })}
        </fieldset>
      </section>
      ${liste.length > 0 &&
      html`<${UI.Tabs}
        label=${K.t("vergleich.reiter")}
        wert=${reiter[0]}
        tabs=${REITER.map(function (r) {
          return { wert: r, label: K.t("vergleich.reiter." + r) };
        })}
        beiAenderung=${reiter[1]}
      >
        ${reiter[0] === "achten" && html`<${Achten} liste=${liste} />`}
        ${reiter[0] !== "achten" && !genug && html`<${UI.Alert} art="info">${K.t("vergleich.zuWenige")}<//>`}
        ${reiter[0] === "angebote" && genug && html`<${Tabelle} liste=${liste} />`}
        ${reiter[0] === "punkte" && genug && html`<${Punkte} liste=${liste} />`}
      <//>`}
      ${liste.length === 0 && html`<${UI.Alert} art="info">${K.t("vergleich.zuWenige")}<//>`}
      ${wahlDialog}
    `;
  }

  S.Vergleich = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var teile = props.teile || [];
    if (teile[0] === "angebot" && teile[1]) return html`<${S.AngebotFormular} id=${teile[1]} key=${teile[1]} />`;
    return html`<${Seite} />`;
  };
})();
