(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var FARBSCHEMATA = ["blau", "petrol", "gruen", "violett", "graphit"];

  function Zeile(props) {
    return html`<div class="rj-field">
      <span class="rj-label">${props.label}</span>
      ${props.children}
    </div>`;
  }

  S.DarstellungFelder = function () {
    var z = K.useStore();
    return html`
        <${Zeile} label=${K.t("einstellungen.sprache")}>
          <${UI.SegmentedControl}
            label=${K.t("einstellungen.sprache")}
            wert=${z.sprache}
            optionen=${[
              { wert: "de", label: "Deutsch" },
              { wert: "en", label: "English" },
            ]}
            beiAenderung=${function (w) {
              K.store.set({ sprache: w });
            }}
          />
        <//>
        <${Zeile} label=${K.t("einstellungen.theme")}>
          <${UI.SegmentedControl}
            label=${K.t("einstellungen.theme")}
            wert=${z.theme}
            optionen=${[
              { wert: "system", label: K.t("theme.system") },
              { wert: "hell", label: K.t("theme.hell"), icon: "sun" },
              { wert: "dunkel", label: K.t("theme.dunkel"), icon: "moon" },
            ]}
            beiAenderung=${function (w) {
              K.store.set({ theme: w });
            }}
          />
        <//>
        <${UI.FarbschemaWahl}
          label=${K.t("einstellungen.farbschema")}
          wert=${z.farbschema}
          optionen=${FARBSCHEMATA.map(function (f) {
            return { wert: f, label: K.t("farbschema." + f) };
          })}
          beiAenderung=${function (w) {
            K.store.set({ farbschema: w });
          }}
        />
        <${Zeile} label=${K.t("einstellungen.schriftgroesse")}>
          <${UI.SegmentedControl}
            label=${K.t("einstellungen.schriftgroesse")}
            wert=${z.schriftgroesse}
            optionen=${[
              { wert: "normal", label: K.t("schrift.normal") },
              { wert: "gross", label: K.t("schrift.gross") },
              { wert: "sehr-gross", label: K.t("schrift.sehrGross") },
            ]}
            beiAenderung=${function (w) {
              K.store.set({ schriftgroesse: w });
            }}
          />
        <//>
    `;
  };

  S.Einstellungen = function () {
    return html`
      <div class="rj-pagehead"><h1 class="h1">${K.t("nav.einstellungen")}</h1></div>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("einstellungen.darstellung")}</h2>
        <${S.DarstellungFelder} />
      </section>
      <${S.TresorEinstellungen} />
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("einstellungen.tastatur")}</h2>
        <${UI.Switch}
          label=${K.t("einstellungen.suchTaste")}
          wert=${K.tresor.daten().einstellungen.suchTaste}
          beiAenderung=${function (w) {
            K.tresor.aendern(function (t) {
              t.einstellungen.suchTaste = w;
            });
          }}
        />
        <p class="rj-hint">${K.t("einstellungen.suchTasteHinweis")}</p>
      </section>
      <section class="rj-card rj-stack">
        <h2 class="h3">${K.t("einstellungen.komponenten")}</h2>
        <p class="rj-muted">${K.t("einstellungen.komponentenText")}</p>
        <div class="rj-row">
          <${UI.Button} href="#/komponenten" iconHinten="arrow-right">${K.t("einstellungen.komponentenAktion")}<//>
        </div>
      </section>
    `;
  };
})();
