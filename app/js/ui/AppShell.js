(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;
  var K = window.R42J_CORE;
  var hooks = window.preactHooks;

  var NAVIGATION = [
    {
      eintraege: [
        { seite: "uebersicht", icon: "house" },
        { seite: "bewerbungen", icon: "briefcase-business" },
        { seite: "stammdaten", icon: "user" },
        { seite: "anlagen", icon: "files" },
      ],
    },
    {
      titel: "nav.gruppeWeiter",
      eintraege: [
        { seite: "vergleich", icon: "scale" },
        { seite: "vorbereitung", icon: "graduation-cap" },
        { seite: "wissen", icon: "book-open" },
        { seite: "statistik", icon: "chart-column" },
      ],
    },
  ];
  var THEMES = ["system", "hell", "dunkel"];

  function NavEintrag(props) {
    var text = K.t("nav." + props.seite);
    return html`<li>
      <a
        href=${"#/" + props.seite}
        aria-current=${props.aktiv ? "page" : undefined}
        title=${props.eingeklappt ? text : undefined}
      >
        <${UI.Icon} name=${props.icon} />
        <span class="rj-nav__text">${text}</span>
      </a>
    </li>`;
  }

  UI.AppShell = function (props) {
    var z = K.store.get();
    var eingeklappt = z.seitenleisteEingeklappt;
    var seite = props.seite;
    var inhalt = hooks.useRef(null);
    var profilName = K.tresor.eintrag().name;
    var dunkel = document.documentElement.getAttribute("data-theme") === "dark";

    function umschalten() {
      K.store.set({ seitenleisteEingeklappt: !K.store.get().seitenleisteEingeklappt });
    }

    hooks.useEffect(function () {
      function taste(e) {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "b" || e.key === "B")) {
          e.preventDefault();
          umschalten();
        }
      }
      document.addEventListener("keydown", taste);
      return function () {
        document.removeEventListener("keydown", taste);
      };
    }, []);

    // Beim Entsperren und Seitenwechsel landet der Fokus im Inhalt, damit Tastatur und Screenreader folgen.
    hooks.useEffect(
      function () {
        inhalt.current.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      },
      [seite],
    );

    function themeWechseln() {
      var i = THEMES.indexOf(K.store.get().theme);
      K.store.set({ theme: THEMES[(i + 1) % THEMES.length] });
    }

    var labelLeiste = K.t(eingeklappt ? "shell.ausklappen" : "shell.einklappen");
    var labelTheme = K.t("shell.darstellung", { aktuell: K.t("theme." + z.theme) });

    return html`<div class="rj-shell" data-collapsed=${eingeklappt ? "true" : "false"}>
      <nav class="rj-sidebar" id="rj-navigation" aria-label=${K.t("shell.hauptnavigation")}>
        <div class="rj-brand">
          <span class="rj-brand__full"><${UI.Logo} size=${32} /></span>
          <span class="rj-brand__mini"><${UI.Logo} size=${32} mitText=${false} /></span>
          <button
            class="rj-iconbtn rj-sidebar__toggle"
            type="button"
            aria-controls="rj-navigation"
            aria-expanded=${eingeklappt ? "false" : "true"}
            aria-label=${labelLeiste}
            title=${labelLeiste + " (" + K.t("shell.tasteB") + ")"}
            onClick=${umschalten}
          >
            <${UI.Icon} name=${eingeklappt ? "panel-left-open" : "panel-left-close"} />
          </button>
        </div>
        ${NAVIGATION.map(function (gruppe, i) {
          return html`
            ${gruppe.titel && html`<div class="rj-nav__label" key=${"t" + i}>${K.t(gruppe.titel)}</div>`}
            <ul class="rj-nav" key=${"g" + i}>
              ${gruppe.eintraege.map(function (e) {
                return html`<${NavEintrag} key=${e.seite} ...${e} aktiv=${e.seite === seite} eingeklappt=${eingeklappt} />`;
              })}
            </ul>
          `;
        })}
        <div class="rj-sidebar__foot">
          <span class="rj-avatar">${K.initialen(profilName)}</span>
          <span class="rj-nav__text" style="flex:1;font-weight:700">${profilName}</span>
          <${UI.IconButton}
            icon="lock"
            label=${K.t("shell.sperren")}
            onClick=${function () {
              K.jetztSperren("manuell");
            }}
          />
        </div>
      </nav>
      <div class="rj-main">
        <div class="rj-topbar">
          <span style="flex:1"></span>
          <${UI.IconButton} icon=${dunkel ? "moon" : "sun"} label=${labelTheme} onClick=${themeWechseln} />
          <${UI.IconButton}
            icon="settings"
            label=${K.t("nav.einstellungen")}
            aria-current=${seite === "einstellungen" ? "page" : undefined}
            onClick=${function () {
              K.navigieren("einstellungen");
            }}
          />
        </div>
        <main class="rj-content" tabindex="-1" ref=${inhalt}>${props.children}</main>
      </div>
    </div>`;
  };
})();
