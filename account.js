/* ==========================================
   ZUNE - ACCOUNT.JS
   Account Profile, Authentication & Logout
========================================== */

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

/* SUPABASE CLIENT */
const zuneSupabase = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

let accountLoading = false;
let logoutInProgress = false;

/* ELEMENT HELPER */
function accountElement(id) {
  return document.getElementById(id);
}

/* ONYESHA UJUMBE */
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

/* FICHA UJUMBE */
function hideAccountMessage() {
  accountElement('accountMessage')?.classList.add('hidden');
}

/* ONDOA TAARIFA ZA ZAMANI ZA LOGIN */
function clearLegacyLoginData() {
  localStorage.removeItem('zune_logged_in');
  localStorage.removeItem('zune_user_name');
  localStorage.removeItem('zune_user_phone');
}

/* ELEKEZA KWENYE LOGIN */
function redirectToLogin() {
  window.location.replace('./login.html');
}

/* PAKIA TAARIFA ZA AKAUNTI */
async function loadAccount() {
  if (accountLoading || logoutInProgress) return;

  if (!zuneSupabase) {
    showAccountMessage(
      'Supabase haijapakiwa. Tafadhali jaribu tena baadaye.',
      true
    );
    return;
  }

  accountLoading = true;

  const nameEl = accountElement('userNameDisplay');
  const phoneEl = accountElement('userPhoneDisplay');
  const emailEl = accountElement('userEmailDisplay');
  const roleBadge = accountElement('accountRoleBadge');
  const adminLink = accountElement('adminMenuLink');
  const retryButton = accountElement('retryAccountButton');

  if (retryButton) retryButton.classList.add('hidden');

  try {
    const {
      data: sessionData,
      error: sessionError
    } = await zuneSupabase.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;

    if (!user) {
      redirectToLogin();
      return;
    }

    const {
      data: profile,
      error: profileError
    } = await zuneSupabase
      .from('profiles')
      .select('full_name, phone_number, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile loading error:', profileError);

      showAccountMessage(
        'Akaunti imeingia, lakini taarifa za profile hazijapatikana.',
        true
      );
    } else {
      hideAccountMessage();
    }

    if (nameEl) {
      nameEl.textContent =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Mtumiaji wa ZUNE';
    }

    if (phoneEl) {
      phoneEl.textContent =
        profile?.phone_number ||
        user.user_metadata?.phone ||
        'Namba ya simu haijawekwa';
    }

    if (emailEl) {
      emailEl.textContent = user.email || '';
    }

    /* ADMIN LINK: ADMIN PEKEE */
    if (adminLink) {
      adminLink.classList.add('hidden');
      adminLink.classList.remove('flex');
    }

    if (!profileError && profile?.role === 'admin') {
      adminLink?.classList.remove('hidden');
      adminLink?.classList.add('flex');

      if (roleBadge) {
        roleBadge.textContent = 'Admin';
        roleBadge.className =
          'inline-block bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-2 border border-rose-100';
      }
    } else if (roleBadge) {
      roleBadge.textContent = 'Akaunti ya ZUNE';
      roleBadge.className =
        'inline-block bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-2 border border-blue-100';
    }

    clearLegacyLoginData();

  } catch (error) {
    console.error('Account loading error:', error);

    showAccountMessage(
      'Imeshindikana kupakia akaunti. Kagua intaneti kisha ujaribu tena.',
      true
    );

    retryButton?.classList.remove('hidden');

  } finally {
    accountLoading = false;
  }
}

/* BADILI HALI YA BUTTON YA LOGOUT */
function setLogoutButtonLoading(isLoading) {
  const button = accountElement('logoutButton');

  if (!button) return;

  button.disabled = isLoading;

  if (isLoading) {
    button.textContent = 'Inatoka kwenye akaunti...';
  } else {
    button.textContent = 'Ondoka kwenye Akaunti';
  }
}

/* LOGOUT YA MTEJA */
window.logoutUser = async function () {
  if (logoutInProgress) return;

  if (!zuneSupabase) {
    showAccountMessage(
      'Supabase haijapakiwa. Haiwezekani kutoka kwa usalama.',
      true
    );
    return;
  }

  logoutInProgress = true;
  setLogoutButtonLoading(true);

  showAccountMessage('Unaondoka kwenye akaunti...');

  try {
    const { error } = await zuneSupabase.auth.signOut({
      scope: 'local'
    });

    if (error) throw error;

    clearLegacyLoginData();

    redirectToLogin();

  } catch (error) {
    console.error('Logout error:', error);

    logoutInProgress = false;
    setLogoutButtonLoading(false);

    showAccountMessage(
      'Imeshindikana kutoka kwenye akaunti. Kagua intaneti kisha ujaribu tena.',
      true
    );
  }
};

/* AUTHENTICATION STATE */
if (zuneSupabase) {
  zuneSupabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !logoutInProgress) {
      clearLegacyLoginData();
      redirectToLogin();
    }
  });
}

/* ANZA UKURASA */
document.addEventListener('DOMContentLoaded', () => {
  loadAccount();
});

/* RUHUSU BUTTON YA HTML KUITA FUNCTION */
window.loadAccount = loadAccount;