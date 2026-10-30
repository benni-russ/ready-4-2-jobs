(function () {
  "use strict";
  var K = (window.R42J_CORE = window.R42J_CORE || {});

  // Die App braucht die File System Access API; Firefox und Safari haben sie nicht.
  K.browserUnterstuetzt = function () {
    return typeof window.showDirectoryPicker === "function" && !!(window.crypto && window.crypto.subtle);
  };
})();
