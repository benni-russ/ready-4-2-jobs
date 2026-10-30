(function () {
  "use strict";
  var UI = window.R42J_UI;
  var html = UI.html;

  UI.ReminderCard = function (props) {
    return html`<div class=${"rj-reminder" + (props.termin ? " rj-reminder--event" : "")}>
      <${UI.Icon} name=${props.icon} />
      <div class="rj-reminder__body">
        <strong>${props.titel}</strong>
        <div>${props.text}</div>
      </div>
      <div class="rj-row">${props.children}</div>
    </div>`;
  };
})();
