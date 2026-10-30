(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;
  var S = (window.R42J_SEITEN = window.R42J_SEITEN || {});

  var MONAT = /^\d{4}(-\d{1,2}){0,2}$|^\d{1,2}[./]\d{4}$/;
  var DATUM = /^\d{4}(-\d{1,2}){0,2}$/;

  var SCHEMA = {
    sprache: { typ: "text", erlaubt: ["de", "en"] },
    profil: {
      typ: "objekt",
      felder: {
        vorname: { typ: "text" },
        nachname: { typ: "text" },
        titel: { typ: "text" },
        geburtsdatum: { typ: "text" },
        email: { typ: "text" },
        telefon: { typ: "text" },
        linkedin: { typ: "text" },
        xing: { typ: "text" },
        website: { typ: "text" },
      },
    },
    stationen: {
      typ: "liste",
      eintrag: {
        typ: { typ: "text", pflicht: true, erlaubt: ["beruf", "ausbildung", "schule", "studium", "praktikum", "ehrenamt"] },
        titel: { typ: "text", pflicht: true },
        organisation: { typ: "text", pflicht: true },
        ort: { typ: "text" },
        von: { typ: "text", pflicht: true, muster: MONAT },
        bis: { typ: "text" },
        beschreibung: { typ: "text" },
        abschluss: { typ: "text" },
        note: { typ: "text" },
      },
    },
    kompetenzen: {
      typ: "liste",
      eintrag: {
        name: { typ: "text", pflicht: true },
        synonyme: { typ: "liste" },
        kategorie: { typ: "text", erlaubt: ["fach", "methode", "sozial", "it", "sonstige"] },
      },
    },
    zertifikate: {
      typ: "liste",
      eintrag: {
        name: { typ: "text", pflicht: true },
        aussteller: { typ: "text" },
        datum: { typ: "text", muster: DATUM },
      },
    },
    sprachen: {
      typ: "liste",
      eintrag: {
        sprache: { typ: "text", pflicht: true },
        niveau: { typ: "text", erlaubt: ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"] },
      },
    },
    interessen: { typ: "liste", eintrag: { text: { typ: "text", pflicht: true } } },
  };

  var VORLAGE = {
    sprache: "de|en",
    profil: {
      vorname: "",
      nachname: "",
      titel: "",
      geburtsdatum: "JJJJ-MM-TT",
      adresse: { strasse: "", plz: "", ort: "", land: "" },
      email: "",
      telefon: "",
      linkedin: "",
      xing: "",
      website: "",
    },
    stationen: [
      {
        typ: "beruf|ausbildung|schule|studium|praktikum|ehrenamt",
        titel: "",
        organisation: "",
        ort: "",
        von: "JJJJ-MM",
        bis: "JJJJ-MM|heute",
        beschreibung: "",
        abschluss: "",
        note: "",
      },
    ],
    kompetenzen: [{ name: "", synonyme: [""], kategorie: "fach|methode|sozial|it|sonstige" }],
    zertifikate: [{ name: "", aussteller: "", datum: "JJJJ-MM-TT" }],
    sprachen: [{ sprache: "", niveau: "A1|A2|B1|B2|C1|C2|Muttersprache" }],
    interessen: [{ text: "" }],
  };

  function datumVoll(s) {
    if (!s) return "";
    var t = s.split("-");
    if (!/^\d{4}$/.test(t[0])) return "";
    function zwei(n) {
      return (n || "1").padStart(2, "0");
    }
    return t[0] + "-" + zwei(t[1]) + "-" + zwei(t[2]);
  }

  function geburtIso(s) {
    var m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s || "");
    if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    return /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s : "";
  }

  // Ein maskierter Wert kommt als ein Text zurück und muss in die Adressfelder.
  function adresseLesen(a) {
    if (a && typeof a === "object") return a;
    var m = /^(.*?),\s*(\d{4,5})\s+(.+)$/.exec(a || "");
    return m ? { strasse: m[1], plz: m[2], ort: m[3] } : {};
  }

  function aufbereiten(roh) {
    var i18n = function (text) {
      var o = {};
      if (text) o[roh.sprache || K.sprache()] = text;
      return o;
    };
    var p = roh.profil || {};
    var profil = {};
    ["vorname", "nachname", "titel", "email", "telefon", "linkedin", "xing", "website"].forEach(function (k) {
      var w = (p[k] || "").trim();
      if (w && !/^\{\{.*\}\}$/.test(w)) profil[k] = w;
    });
    var geburt = geburtIso(p.geburtsdatum);
    if (geburt) profil.geburtsdatum = geburt;
    var adresse = adresseLesen(p.adresse);
    if (adresse.strasse || adresse.plz || adresse.ort) profil.adresse = adresse;
    return {
      profil: profil,
      stationen: (roh.stationen || []).map(function (s) {
        var e = {
          id: K.uuid(),
          typ: s.typ,
          titel: i18n(s.titel),
          organisation: s.organisation,
          ort: s.ort || "",
          von: K.monatLesen(s.von) || "",
          ausrichtungen: [],
          anlagen: [],
        };
        var bis = s.bis === "heute" ? "heute" : K.monatLesen(s.bis);
        if (bis) e.bis = bis;
        if (s.beschreibung) e.beschreibung = i18n(s.beschreibung);
        if (s.abschluss) e.abschluss = s.abschluss;
        if (s.note) e.note = s.note;
        return e;
      }),
      kompetenzen: (roh.kompetenzen || []).map(function (k) {
        return { id: K.uuid(), name: i18n(k.name), synonyme: k.synonyme || [], kategorie: k.kategorie || "sonstige", ausrichtungen: [] };
      }),
      zertifikate: (roh.zertifikate || []).map(function (z) {
        return { id: K.uuid(), name: z.name, aussteller: z.aussteller || "", datum: datumVoll(z.datum), ausrichtungen: [] };
      }),
      sprachen: (roh.sprachen || []).map(function (s) {
        return { id: K.uuid(), sprache: s.sprache, niveau: s.niveau || "B2" };
      }),
      interessen: (roh.interessen || []).map(function (i) {
        return { id: K.uuid(), text: i18n(i.text), ausrichtungen: [] };
      }),
    };
  }

  function nameVon(liste, e) {
    if (liste === "stationen") return (K.i18nText(e.titel) + "|" + e.organisation + "|" + e.von).toLowerCase();
    if (liste === "kompetenzen") return K.i18nText(e.name).toLowerCase();
    if (liste === "zertifikate") return e.name.toLowerCase();
    if (liste === "sprachen") return e.sprache.toLowerCase();
    return K.i18nText(e.text).toLowerCase();
  }

  var LISTEN = ["stationen", "kompetenzen", "zertifikate", "sprachen", "interessen"];

  // Vorhandene Angaben bleiben, doppelte Einträge kommen nicht noch einmal dazu.
  function uebernehmen(neu) {
    K.tresor.aendern(function (d) {
      var p = neu.profil;
      Object.keys(p).forEach(function (k) {
        if (k === "adresse") {
          d.profil.adresse = Object.assign({}, p.adresse, d.profil.adresse);
        } else if (!d.profil[k]) d.profil[k] = p[k];
      });
      LISTEN.forEach(function (l) {
        var da = d[l].map(function (e) {
          return nameVon(l, e);
        });
        neu[l].forEach(function (e) {
          if (da.indexOf(nameVon(l, e)) === -1) d[l].push(e);
        });
      });
    });
  }

  function Vorschau(props) {
    var n = props.neu;
    var name = [n.profil.vorname, n.profil.nachname].filter(Boolean).join(" ");
    return html`<div class="rj-stack">
      <${UI.Alert} art="success">${K.t("import.gueltig")}<//>
      ${name && html`<p><strong>${K.t("import.name")}:</strong> ${name}</p>`}
      ${n.stationen.length > 0 &&
      html`<section class="rj-stack" style="gap:var(--space-2)">
        <h3 class="h3">${K.t("station")} (${n.stationen.length})</h3>
        <ul style="margin:0;padding-left:1.25em">
          ${n.stationen.map(function (s) {
            return html`<li key=${s.id}>${K.zeitraum(s)}: ${K.i18nText(s.titel)}, ${s.organisation}</li>`;
          })}
        </ul>
      </section>`}
      ${n.kompetenzen.length > 0 &&
      html`<section class="rj-stack" style="gap:var(--space-2)">
        <h3 class="h3">${K.t("kompetenz")} (${n.kompetenzen.length})</h3>
        <div class="rj-chips">
          ${n.kompetenzen.map(function (k) {
            return html`<span class="rj-chip" key=${k.id}>${K.i18nText(k.name)}</span>`;
          })}
        </div>
      </section>`}
      <p class="rj-muted">
        ${K.t("import.weitere", { zertifikate: n.zertifikate.length, sprachen: n.sprachen.length, interessen: n.interessen.length })}
      </p>
      <div class="rj-row">
        <${UI.Button} variante="primary" icon="check" onClick=${props.beiUebernehmen}>${K.t("import.uebernehmen")}<//>
        <${UI.Button} variante="ghost" onClick=${props.beiZurueck}>${K.t("aktion.zurueck")}<//>
      </div>
    </div>`;
  }

  // Lebenslauf-Import (SPEC §6.3), auch als Onboarding-Schritt 7.
  S.LebenslaufImport = function (props) {
    K.useBeobachtbar(K.tresorStand);
    var text = hooks.useState("");
    var ergebnis = hooks.useState(null);
    var aktiv = K.ki.platzhalterAktiv();
    var d = K.tresor.daten();
    var maske = aktiv ? K.ki.maskieren(text[0], d.profil, K.tresor.eintrag().name) : { text: text[0], karte: {} };
    var prompt = K.t("ki.promptLebenslauf", { vorlage: JSON.stringify(VORLAGE, null, 2), lebenslauf: maske.text });

    function pruefen(antwort) {
      var roh = K.ki.zurueck(K.ki.jsonLesen(antwort), maske.karte);
      var probleme = K.ki.pruefen(roh, SCHEMA, K.t("import.bereich"));
      if (probleme.length) return probleme;
      var neu = aufbereiten(roh);
      if (!Object.keys(neu.profil).length && !LISTEN.some(function (l) { return neu[l].length; })) throw K.Fehler("ki.fehlerLeerJson");
      ergebnis[1](neu);
      return [];
    }

    if (ergebnis[0]) {
      return html`<${Vorschau}
        neu=${ergebnis[0]}
        beiZurueck=${function () {
          ergebnis[1](null);
        }}
        beiUebernehmen=${function () {
          uebernehmen(ergebnis[0]);
          K.meldung(K.t("import.fertig"));
          props.beiFertig();
        }}
      />`;
    }

    return html`
      <p>${K.t("import.text")}</p>
      <${UI.Textarea} label=${K.t("import.lebenslauf")} placeholder=${K.t("import.lebenslaufPlatzhalter")} hinweis=${K.t("import.lebenslaufHinweis")} wert=${text[0]} beiAenderung=${text[1]} rows="6" />
      <${UI.PromptPanel}
        prompt=${prompt}
        platzhalter=${aktiv}
        beiPlatzhalter=${function (w) {
          K.tresor.aendern(function (t) {
            t.einstellungen.kiPlatzhalter = w;
          });
        }}
        beiPruefen=${pruefen}
        beiSelbst=${props.beiSelbst}
      />
    `;
  };
})();
