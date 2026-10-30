(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;

  // kw wie Bewerbung.keywords. beiLuecke legt eine Lücke als Kompetenz an, beiEntfernen* nehmen ein Keyword heraus.
  UI.KeywordMatch = function (props) {
    var kw = props.kw;
    var score = K.keywords.score(kw);
    if (score === null) return html`<p class="rj-muted">${K.t("stelle.keineKeywords")}</p>`;
    var stufe = K.keywords.einstufung(score);
    var treffer = kw.treffer
      .map(function (id) {
        return K.tresor.daten().kompetenzen.filter(function (k) {
          return k.id === id;
        })[0];
      })
      .filter(Boolean);
    var text = K.t("match.stufe." + stufe);
    return html`<div class="rj-match">
      <div class="rj-match__score">
        <div class="rj-ring" style=${"--p:" + score} role="img" aria-label=${K.t("match.ring", { score: score, text: text })}><span>${score} %</span></div>
        <div>
          <strong>${text}</strong>
          <div class="rj-muted">${K.t("match.anzahl", { treffer: treffer.length, gesamt: treffer.length + kw.fehlend.length })}</div>
        </div>
      </div>
      ${treffer.length > 0 &&
      html`<div class="rj-match__group rj-match__group--hits">
        <h4><${UI.Icon} name="circle-check" />${K.t("match.treffer", { n: treffer.length })}</h4>
        <div class="rj-chips">
          ${treffer.map(function (k) {
            var name = K.i18nText(k.name);
            return html`<span class="rj-chip rj-chip--match" key=${k.id}>
              <${UI.Icon} name="check" />${name}
              <button
                type="button"
                aria-label=${K.t("feld.entfernen", { name: name })}
                onClick=${function () {
                  props.beiEntfernenTreffer(k.id);
                }}
              >
                <${UI.Icon} name="x" />
              </button>
            </span>`;
          })}
        </div>
      </div>`}
      ${kw.fehlend.length > 0 &&
      html`<div class="rj-match__group rj-match__group--gaps">
        <h4><${UI.Icon} name="triangle-alert" />${K.t("match.luecken", { n: kw.fehlend.length })}</h4>
        <p class="rj-muted" style="margin:0">${K.t("match.lueckenHinweis")}</p>
        <div class="rj-chips">
          ${kw.fehlend.map(function (name) {
            return html`<span class="rj-chip rj-chip--gap" key=${name}>
              <button
                type="button"
                class="rj-chip__add"
                aria-label=${K.t("match.anlegen", { name: name })}
                onClick=${function () {
                  props.beiLuecke(name);
                }}
              >
                <${UI.Icon} name="plus" />${name}
              </button>
              <button
                type="button"
                aria-label=${K.t("feld.entfernen", { name: name })}
                onClick=${function () {
                  props.beiEntfernen(name);
                }}
              >
                <${UI.Icon} name="x" />
              </button>
            </span>`;
          })}
        </div>
      </div>`}
    </div>`;
  };
})();
