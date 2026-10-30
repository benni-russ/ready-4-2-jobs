(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var ANZEIGE_WARTEZEIT_MS = 300;
  var OHNE = ["foto", "unterschrift"];
  var VORAUSWAHL = ["zeugnis-schule", "zeugnis-arbeit", "zertifikat"];

  function waehlbar() {
    return K.tresor.daten().anlagen.filter(function (a) {
      return OHNE.indexOf(a.kategorie) === -1;
    });
  }

  // Zeugnisse und Zertifikate der Ausrichtung, dazu alles, was keiner Station zugeordnet ist.
  function vorauswahl(b) {
    var d = K.tresor.daten();
    var fremd = [];
    d.stationen.forEach(function (s) {
      if (s.ausrichtungen.indexOf(b.ausrichtungId) === -1) fremd = fremd.concat(s.anlagen);
    });
    d.zertifikate.forEach(function (z) {
      if (z.anlageId && z.ausrichtungen.indexOf(b.ausrichtungId) === -1) fremd.push(z.anlageId);
    });
    return waehlbar()
      .filter(function (a) {
        return VORAUSWAHL.indexOf(a.kategorie) > -1 && fremd.indexOf(a.id) === -1;
      })
      .map(function (a) {
        return a.id;
      });
  }

  function texte(b) {
    var p = K.tresor.daten().profil;
    var t = K.BRIEF_TEXTE[b.sprache === "en" ? "en" : "de-sie"];
    return { titel: t.anlagen, seite: t.seite, name: [p.vorname, p.nachname].filter(Boolean).join(" ") };
  }

  function optionen(b) {
    return Object.assign(texte(b), {
      ids: b.dokumente.anlagenAuswahl,
      stufe: b.dokumente.komprimierung,
      deckblatt: b.dokumente.deckblatt,
    });
  }

  function dokument(b, feld, wert) {
    K.bewerbungen.aendern(b.id, function (x) {
      x.dokumente[feld] = wert;
    });
  }

  async function snapshotBytes(b, art) {
    return b.dokumente[art] ? K.tresor.anlageLesen(b.dokumente[art].anlageId) : null;
  }

  S.BewerbungAnlagen = function (props) {
    var b = props.bewerbung;
    var anzeige = hooks.useState(null);
    var laedt = hooks.useState(false);
    var fehler = hooks.useState(null);
    var d = b.dokumente;
    var alle = waehlbar();
    var stand = JSON.stringify([d.anlagenAuswahl, d.komprimierung, d.deckblatt]);

    hooks.useEffect(function () {
      if (d.anlagenVorausgewaehlt) return;
      K.bewerbungen.aendern(b.id, function (x) {
        x.dokumente.anlagenAuswahl = vorauswahl(b);
        x.dokumente.anlagenVorausgewaehlt = true;
      });
    }, []);

    // Größe live aus dem echten Ergebnis, die alte Rechnung verfällt bei jeder Änderung.
    hooks.useEffect(
      function () {
        var aktuell = true;
        var timer = window.setTimeout(async function () {
          if (!d.anlagenAuswahl.length) return anzeige[1](null);
          try {
            var r = await K.anlagenPdf.erstellen(optionen(b));
            if (aktuell) anzeige[1](r);
          } catch (e) {
            if (aktuell) fehler[1](K.fehlerText(e));
          }
        }, ANZEIGE_WARTEZEIT_MS);
        return function () {
          aktuell = false;
          window.clearTimeout(timer);
        };
      },
      [stand],
    );

    function umschalten(id, an) {
      K.bewerbungen.aendern(b.id, function (x) {
        var liste = x.dokumente.anlagenAuswahl.filter(function (i) {
          return i !== id;
        });
        x.dokumente.anlagenAuswahl = an ? liste.concat([id]) : liste;
      });
    }

    async function erstellen() {
      laedt[1](true);
      fehler[1](null);
      try {
        var t = K.tresor.daten().profil;
        var r = await K.anlagenPdf.erstellen(optionen(b));
        if (!r.bytes.length) throw K.Fehler("fehler.anlagenLeer");
        await K.bewerbungen.snapshotSpeichern(b.id, "anlagenPdf", r.bytes, K.dateiname([t.vorname, t.nachname, "anlagen"], "pdf"));
        await gesamt(r.bytes);
        K.meldung(K.t("dokument.erstellt"));
      } catch (e) {
        fehler[1](K.fehlerText(e));
      }
      laedt[1](false);
    }

    // Reihenfolge wie in einer Bewerbungsmappe: Anschreiben, Lebenslauf, Anlagen.
    async function gesamt(anlagenBytes) {
      var aktuell = K.bewerbungen.holen(b.id);
      if (!aktuell.dokumente.allesInEinem) return K.bewerbungen.snapshotLoeschen(b.id, "gesamtPdf");
      var teile = [await snapshotBytes(aktuell, "anschreiben"), await snapshotBytes(aktuell, "lebenslauf"), anlagenBytes].filter(Boolean);
      var t = K.tresor.daten().profil;
      var titel = K.BRIEF_TEXTE[aktuell.sprache === "en" ? "en" : "de-sie"].bewerbung + " " + aktuell.stelle.titel;
      var name = [t.vorname, t.nachname].filter(Boolean).join(" ");
      var bytes = await K.anlagenPdf.zusammenfuegen(teile, titel, name);
      await K.bewerbungen.snapshotSpeichern(b.id, "gesamtPdf", bytes, K.dateiname([t.vorname, t.nachname, "bewerbung"], "pdf"));
    }

    if (!alle.length) {
      return html`<${UI.EmptyState} icon="files" titel=${K.t("anlagenPdf.leerTitel")} text=${K.t("anlagenPdf.leerText")}>
        <${UI.Button} variante="primary" href="#/anlagen">${K.t("anlagenPdf.zuAnlagen")}<//>
      <//>`;
    }

    var gewaehlt = d.anlagenAuswahl
      .map(function (id) {
        return alle.filter(function (a) {
          return a.id === id;
        })[0];
      })
      .filter(Boolean);
    var fehltFuerGesamt = d.allesInEinem && (!d.anschreiben || !d.lebenslauf);

    return html`
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("anlagenPdf.auswahl")}</h2>
        <div class="rj-stack" style="gap:0">
          ${alle.map(function (a) {
            return html`<${UI.Checkbox}
              key=${a.id}
              label=${a.titel}
              erklaerung=${K.anlagen.meta(a)}
              wert=${d.anlagenAuswahl.indexOf(a.id) > -1}
              beiAenderung=${function (w) {
                umschalten(a.id, w);
              }}
            />`;
          })}
        </div>
      </section>
      ${gewaehlt.length > 0 &&
      html`<section class="rj-card rj-stack">
        <h2 class="h3">${K.t("anlagenPdf.reihenfolge")}</h2>
        <${UI.SortableFileList}
          eintraege=${gewaehlt.map(function (a) {
            return { id: a.id, titel: a.titel, meta: K.anlagen.meta(a) };
          })}
          beiAenderung=${function (ids) {
            dokument(b, "anlagenAuswahl", ids);
          }}
        />
      </section>`}
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("anlagenPdf.groesse")}</h2>
        ${fehler[0] && html`<${UI.Alert} art="danger">${fehler[0]}<//>`}
        <${UI.Switch}
          label=${K.t("anlagenPdf.deckblatt")}
          wert=${d.deckblatt}
          beiAenderung=${function (w) {
            dokument(b, "deckblatt", w);
          }}
        />
        <div class="rj-field">
          <span class="rj-label">${K.t("anlagenPdf.komprimierung")}</span>
          <${UI.SegmentedControl}
            label=${K.t("anlagenPdf.komprimierung")}
            wert=${d.komprimierung}
            optionen=${K.anlagenPdf.STUFEN.map(function (s) {
              return { wert: s, label: K.t("anlagenPdf.stufe." + s) };
            })}
            beiAenderung=${function (w) {
              dokument(b, "komprimierung", w);
            }}
          />
          <span class="rj-hint">${K.t("anlagenPdf.komprimierungHinweis")}</span>
        </div>
        ${anzeige[0] && html`<${UI.SizeMeter} bytes=${anzeige[0].bytes.length} grenze=${K.anlagenPdf.MAX_BYTES} />`}
        ${anzeige[0] &&
        anzeige[0].hinweise.map(function (h) {
          return html`<${UI.Alert} art="warning" key=${h.werte.titel}>${K.t(h.text, h.werte)}<//>`;
        })}
        ${anzeige[0] &&
        anzeige[0].bytes.length > K.anlagenPdf.MAX_BYTES &&
        html`<${UI.Alert} art="warning">${K.t("anlagenPdf.zuGross")}<//>`}
        <${UI.Switch}
          label=${K.t("anlagenPdf.gesamt")}
          wert=${d.allesInEinem}
          beiAenderung=${function (w) {
            dokument(b, "allesInEinem", w);
          }}
        />
        ${fehltFuerGesamt && html`<${UI.Alert} art="info">${K.t("anlagenPdf.gesamtFehlt")}<//>`}
        <div class="rj-row">
          <${UI.Button} variante="primary" icon="file-text" laedt=${laedt[0]} disabled=${laedt[0] || !gewaehlt.length} onClick=${erstellen}>${K.t("anlagenPdf.erstellen")}<//>
        </div>
        <${S.DokumentZeile} bewerbung=${b} art="anlagenPdf" />
        <${S.DokumentZeile} bewerbung=${b} art="gesamtPdf" />
      </section>
    `;
  };
})();
