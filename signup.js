
"use strict";

/**
 * ZUNE Marketplace — signup.js
 *
 * Kazi:
 * 1. Kuelekeza usajili kwenye ZUNE Account iliyopo.
 * 2. Kuelekeza kuingia kwenye ZUNE Account.
 * 3. Kuzuia link zisizotarajiwa na kushughulikia vitufe vya hiari.
 *
 * Haiundi akaunti mpya hapa.
 * Usajili na uthibitishaji unasimamiwa na ZUNE Account.
 */

(() => {
  const ACCOUNT_BASE =
    "https://mrnehemiah.github.io/zune-account-/";

  const SIGNUP_URL =
    ACCOUNT_BASE + "signup.html";

  // Ikiwa ZUNE Account ina ukurasa tofauti wa login,
  // badilisha LOGIN_URL baada ya kuthibitisha jina lake.
  const LOGIN_URL =
    ACCOUNT_BASE;

  function navigateTo(url) {
    window.location.assign(url);
  }

  function bindRedirect(selector, destination) {
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("click", (event) => {
        // Ruhusu tab mpya au vitendo vya kawaida vya browser.
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
        navigateTo(destination);
      });
    });
  }

  function initializeSignupPage() {
    // Vitufe/link za kujisajili.
    bindRedirect(
      "[data-zune-signup], .zune-signup-link",
      SIGNUP_URL
    );

    // Vitufe/link za kuingia.
    bindRedirect(
      "[data-zune-login], .zune-login-link",
      LOGIN_URL
    );

    // Link za kawaida za terms na privacy zinaendelea
    // kutumia href zao bila kubadilishwa.

    console.info(
      "ZUNE Marketplace signup.js imeanzishwa."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSignupPage,
      { once: true }
    );
  } else {
    initializeSignupPage();
  }
})();
