
"use strict";

/**
 * ZUNE Marketplace — login.js
 *
 * Kuingia kunafanyika kupitia ZUNE Account iliyopo.
 * Faili hili halisomi wala kuhifadhi password.
 * Halitengenezi session nyingine ya authentication.
 */

(() => {
  const ZUNE_ACCOUNT_URL =
    "https://mrnehemiah.github.io/zune-account-/";

  const LOGIN_URL =
    ZUNE_ACCOUNT_URL + "login.html";

  const SIGNUP_URL =
    ZUNE_ACCOUNT_URL + "signup.html";

  function redirectTo(url) {
    window.location.assign(url);
  }

  function bindRedirect(selectors, url) {
    document.querySelectorAll(selectors).forEach((element) => {
      element.addEventListener("click", (event) => {
        // Usizuie kufungua link kwenye tab mpya.
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        redirectTo(url);
      });
    });
  }

  function initializeLoginPage() {
    bindRedirect(
      "[data-zune-login], .zune-login-link",
      LOGIN_URL
    );

    bindRedirect(
      "[data-zune-signup], .zune-signup-link",
      SIGNUP_URL
    );

    console.info(
      "ZUNE Marketplace login.js imeanzishwa."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeLoginPage,
      { once: true }
    );
  } else {
    initializeLoginPage();
  }
})();
