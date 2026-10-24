
/* =====================================================
   ZUNE — ACCOUNT.JS
   Account Profile • Supabase Auth • Logout
   Version: 2.0
===================================================== */

'use strict';

/* =========================
   1. SUPABASE CONFIGURATION
========================= */

const ZUNE_CONFIG = Object.freeze({
  SUPABASE_URL:
    'https://rpkogiieegqgxqbzwxwo.supabase.co',

  SUPABASE_PUBLISHABLE_KEY:
    'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf',

  PROFILE_TABLE: 'profiles',

  LOGIN_PAGE: './login.html'
});

/* =========================
   2. SUPABASE CLIENT
========================= */

const zuneSupabase = (() => {
  if (!window.supabase?.createClient) {
    console.error(
      'ZUNE: Supabase SDK haijapakiwa.'
    );
    return null;
  }

  try {
    /*
     * Tumia client iliyopo ikiwa app.js
     * tayari imeunda client ya project hii.
     */
    if (
      window.zuneSupabase &&
      typeof window.zuneSupabase.auth?.getSession === 'function'
    ) {
      return window.zuneSupabase;
    }

    return window.supabase.createClient(
      ZUNE_CONFIG.SUPABASE_URL,
      ZUNE_CONFIG.SUPABASE_PUBLISHABLE_KEY
    );
  } catch (error) {
    console.error(
      'ZUNE: Imeshindikana kuanzisha Supabase.',
      error
    );
    return null;
  }
})();

/* =========================
   3. STATE MANAGEMENT
========================= */

let accountLoading = false;
let logoutInProgress = false;
let redirectInProgress = false;
let authSubscription = null;

/* =========================
   4. DOM HELPERS
========================= */

function accountElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = accountElement(id);

  if (element) {
    element.textContent = value ?? '';
  }
}

function setHidden(id, hidden) {
  const element = accountElement(id);

  if (!element) return;

  element.classList.toggle('hidden', hidden);
}

function showAccountMessage(message, isError = false) {
  const box = accountElement('accountMessage');

  if (!box) {
    console[isError ? 'error' : 'log'](message);
    return;
  }

  box.textContent = message;

  box.className = isError
    ? 'p-3.5 rounded-2xl text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100'
    : 'p-3.5 rounded-2xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100';

  box.classList.remove('hidden');
}

function hideAccountMessage() {
  setHidden('accountMessage', true);
}

/* =========================
   5. LEGACY DATA CLEANUP
========================= */

function clearLegacyLoginData() {
  try {
    localStorage.removeItem('zune_logged_in');
    localStorage.removeItem('zune_user_name');
    localStorage.removeItem('zune_user_phone');
  } catch (error) {
    console.warn(
      'ZUNE: Legacy storage haikuweza kusafishwa.',
      error
    );
  }
}

/*
 * Usihifadhi jina, simu au role ya mteja
 * kama utambulisho wa kuaminika kwenye localStorage.
 * Supabase Auth ndiyo chanzo cha session.
 */

/* =========================
   6. NAVIGATION
========================= */

function redirectToLogin() {
  if (redirectInProgress) return;

  redirectInProgress = true;

  window.location.replace(ZUNE_CONFIG.LOGIN_PAGE);
}

/* =========================
   7. LOADING STATE
========================= */

function setAccountLoading(isLoading) {
  const retryButton = accountElement(
    'retryAccountButton'
  );

  if (retryButton) {
    retryButton.disabled = isLoading;
    retryButton.classList.toggle(
      'opacity-50',
      isLoading
    );
  }

  const nameEl = accountElement('userNameDisplay');

  if (nameEl && isLoading) {
    nameEl.setAttribute('aria-busy', 'true');
  } else {
    nameEl?.removeAttribute('aria-busy');
  }
}

/* =========================
   8. RESET PROFILE DISPLAY
========================= */

function resetAccountDisplay() {
  setText('userNameDisplay', 'Inapakia akaunti...');
  setText('userPhoneDisplay', 'Inapakia...');
  setText('userEmailDisplay', '');

  setText('accountRoleBadge', 'Akaunti ya ZUNE');

  setHidden('adminMenuLink', true);
}

/* =========================
   9. LOAD ACCOUNT PROFILE
========================= */

async function loadAccount() {
  if (accountLoading || logoutInProgress) return;

  if (!zuneSupabase) {
    showAccountMessage(
      'Huduma ya akaunti haijapatikana. Tafadhali pakia ukurasa upya.',
      true
    );

    return;
  }

  accountLoading = true;

  setAccountLoading(true);
  hideAccountMessage();
  resetAccountDisplay();

  try {
    /*
     * Thibitisha mtumiaji kupitia Supabase Auth.
     * Usitumie localStorage kama uthibitisho wa login.
     */
    const {
      data: userData,
      error: userError
    } = await zuneSupabase.auth.getUser();

    if (userError) throw userError;

    const user = userData?.user;

    if (!user?.id) {
      clearLegacyLoginData();
      redirectToLogin();
      return;
    }

    /*
     * Soma profile ya mtumiaji huyu pekee.
     * profiles.id lazima ilingane na auth.users.id.
     */
    const {
      data: profile,
      error: profileError
    } = await zuneSupabase
      .from(ZUNE_CONFIG.PROFILE_TABLE)
      .select('id, full_name, phone_number, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        'ZUNE profile error:',
        profileError.message
      );

      showAccountMessage(
        'Imeshindikana kupata taarifa za profile. Jaribu tena.',
        true
      );
    }

    /*
     * Hakikisha profile inayotumika ni ya user huyu.
     */
    const validProfile =
      !profileError &&
      profile &&
      profile.id === user.id;

    const metadata = user.user_metadata || {};

    const fullName =
      (validProfile && profile.full_name) ||
      metadata.full_name ||
      metadata.name ||
      'Mtumiaji wa ZUNE';

    const phoneNumber =
      (validProfile && profile.phone_number) ||
      metadata.phone ||
      'Namba ya simu haijawekwa';

    setText('userNameDisplay', fullName);
    setText('userPhoneDisplay', phoneNumber);
    setText('userEmailDisplay', user.email || '');

    /*
     * Onyesha admin link kwa role iliyosomwa.
     * Hii ni UI tu; haitoshi kulinda admin APIs au database.
     */
    const isAdmin =
      validProfile &&
      profile.role === 'admin';

    setHidden('adminMenuLink', !isAdmin);

    const roleBadge = accountElement(
      'accountRoleBadge'
    );

    if (roleBadge) {
      roleBadge.textContent = isAdmin
        ? 'Admin'
        : 'Akaunti ya ZUNE';

      roleBadge.className = isAdmin
        ? 'inline-block bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-2 border border-rose-100'
        : 'inline-block bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-2 border border-blue-100';
    }

    /*
     * Ikiwa profile haipo, usitengeneze profile
     * moja ya pamoja kwa wateja wote.
     * Rekodi inaweza kuundwa kwa user.id yake
     * kupitia signup flow au database trigger.
     */
    if (!profileError && !profile) {
      showAccountMessage(
        'Akaunti imeingia, lakini profile haipo. Tafadhali wasiliana na admin.',
        true
      );
    } else if (validProfile) {
      hideAccountMessage();
    }

    clearLegacyLoginData();

    console.info(
      'ZUNE account loaded successfully.'
    );

  } catch (error) {
    console.error(
      'ZUNE account loading failed:',
      error.message || error
    );

    showAccountMessage(
      'Imeshindikana kupakia taarifa za akaunti. Kagua intaneti kisha ujaribu tena.',
      true
    );

    setHidden('retryAccountButton', false);

  } finally {
    accountLoading = false;
    setAccountLoading(false);
  }
}

/* =========================
   10. LOGOUT BUTTON STATE
========================= */

function setLogoutButtonLoading(isLoading) {
  const button = accountElement('logoutButton');

  if (!button) return;

  button.disabled = isLoading;

  button.textContent = isLoading
    ? 'Inatoka kwenye akaunti...'
    : 'Ondoka kwenye Akaunti';
}

/* =========================
   11. SECURE LOGOUT
========================= */

window.logoutUser = async function () {
  if (logoutInProgress) return;

  if (!zuneSupabase) {
    showAccountMessage(
      'Supabase haijapatikana. Imeshindikana kutoka kwa usalama.',
      true
    );
    return;
  }

  logoutInProgress = true;

  setLogoutButtonLoading(true);
  showAccountMessage('Unaondoka kwenye akaunti...');

  try {
    /*
     * LOCAL logout: toka kwenye session ya browser hii.
     * Session za vifaa vingine hazitafungwa.
     */
    const { error } = await zuneSupabase.auth.signOut({
      scope: 'local'
    });

    if (error) throw error;

    clearLegacyLoginData();
    redirectToLogin();

  } catch (error) {
    console.error(
      'ZUNE logout failed:',
      error.message || error
    );

    logoutInProgress = false;

    setLogoutButtonLoading(false);

    showAccountMessage(
      'Imeshindikana kutoka kwenye akaunti. Jaribu tena.',
      true
    );
  }
};

/* =========================
   12. AUTH STATE LISTENER
========================= */

function setupAuthListener() {
  if (!zuneSupabase || authSubscription) return;

  const { data } =
    zuneSupabase.auth.onAuthStateChange(
      (event) => {
        /*
         * Usifanye query nyingine za Supabase
         * moja kwa moja ndani ya callback hii.
         */
        if (
          event === 'SIGNED_OUT' &&
          !logoutInProgress
        ) {
          clearLegacyLoginData();
          redirectToLogin();
        }
      }
    );

  authSubscription = data?.subscription || null;
}

/* =========================
   13. INITIALIZE PAGE
========================= */

function initializeAccountPage() {
  setupAuthListener();

  const retryButton = accountElement(
    'retryAccountButton'
  );

  if (retryButton) {
    retryButton.addEventListener(
      'click',
      loadAccount
    );
  }

  loadAccount();
}

/* =========================
   14. PUBLIC FUNCTIONS
========================= */

window.loadAccount = loadAccount;

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeAccountPage,
    { once: true }
  );
} else {
  initializeAccountPage();
}
