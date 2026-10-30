(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var SPRACHEN = ["de", "en"];

  // wert ist { de?, en? }. Eine fehlende Fassung wird markiert, sobald die andere Text hat.
  UI.BilingualField = function (props) {
    var id = hooks.useId();
    var wert = props.wert || {};
    var aktiv = hooks.useState(K.sprache());
    var sprache = aktiv[0];
    var andere = sprache === "de" ? "en" : "de";
    var luecke = K.i18nLuecke(wert);
    var fehlt = luecke && !(wert[sprache] || "").trim() ? sprache : luecke ? andere : null;

    function eingabe(e) {
      var neu = Object.assign({}, wert);
      neu[sprache] = e.target.value;
      if (!neu[sprache]) delete neu[sprache];
      props.beiAenderung(neu);
    }

    function taste(e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      aktiv[1](andere);
      var knoepfe = e.currentTarget.querySelectorAll("button");
      knoepfe[SPRACHEN.indexOf(andere)].focus();
    }

    // Die Aktion erscheint nur, wenn es etwas zu übersetzen gibt.
    var quelle = luecke ? ((wert.de || "").trim() ? "de" : "en") : null;
    var ziel = quelle === "de" ? "en" : "de";
    var deepl = quelle && K.kiInterview.deepl(wert[quelle], quelle, ziel);

    var feld = {
      id: id,
      lang: sprache,
      value: wert[sprache] || "",
      placeholder: props.platzhalter ? K.tIn(sprache, props.platzhalter) : undefined,
      onInput: eingabe,
      "aria-invalid": props.fehler ? "true" : undefined,
      "aria-describedby": props.fehler || fehlt || props.hinweis ? id + "-info" : undefined,
    };

    return html`<div class="rj-field">
      <div class="rj-label">
        <label for=${id}>${props.label} ${props.pflicht && html`<span class="rj-req">${K.t("feld.pflicht")}</span>`}</label>
        <span class="rj-langtabs" role="tablist" aria-label=${K.t("feld.sprache")} onKeyDown=${taste}>
          ${SPRACHEN.map(function (s) {
            var name = s.toUpperCase();
            return html`<button
              key=${s}
              type="button"
              role="tab"
              aria-selected=${s === sprache ? "true" : "false"}
              aria-label=${fehlt === s ? K.t("feld.spracheFehlt", { sprache: name }) : name}
              tabindex=${s === sprache ? undefined : "-1"}
              onClick=${function () {
                aktiv[1](s);
              }}
            >
              ${name} ${fehlt === s && html`<span class="rj-dot"></span>`}
            </button>`;
          })}
        </span>
      </div>
      ${props.mehrzeilig ? html`<textarea class="rj-textarea" rows="3" ...${feld}></textarea>` : html`<input class="rj-input" type="text" ...${feld} />`}
      ${props.fehler && html`<span class="rj-error" id=${id + "-info"}><${UI.Icon} name="circle-alert" />${props.fehler}</span>`}
      ${!props.fehler && fehlt && html`<span class="rj-hint" id=${id + "-info"} style="color:var(--warning);font-weight:700">${K.t("feld.fassungFehlt." + fehlt)}</span>`}
      ${!props.fehler && !fehlt && props.hinweis && html`<span class="rj-hint" id=${id + "-info"}>${props.hinweis}</span>`}
      ${deepl &&
      html`<div class="rj-row">
        <${UI.Button}
          variante="ghost"
          icon="external-link"
          href=${deepl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label=${K.t("feld.deeplLabel", { von: quelle.toUpperCase(), nach: ziel.toUpperCase() })}
        >
          ${K.t("feld.deepl")}
        <//>
      </div>
      <span class="rj-hint">${K.t("feld.deeplHinweis")}</span>`}
      ${quelle && !deepl && html`<span class="rj-hint">${K.t("feld.deeplZuLang", { max: K.kiInterview.DEEPL_MAX })}</span>`}
    </div>`;
  };
})();
