
/* ==========================================
   ZUNE - ACCOUNT.JS
   Account profile, authentication and logout
========================================== */

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

// Hakikisha Supabase JS imeunganishwa kwenye account.html
if (!window.supabase) {
  console.error(
    'Supabase JS haijapakiwa. Kagua script ya Supabase kwenye account.html.'
  );
}

const zuneSupabase = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

let accountLoading = false;
let logoutInProgress = false;

/* ONYESHA UJUMBE */
function showAccountMessage(message, isError = false) {
  const box = document.getElementById('accountMessage');

  if (!box) return;

  box.textContent = message;

  box.className = isError
    ? 'p-3.5 rounded-2xl text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100'
    : 'p-3.5 rounded-2xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100';

  box.classList.remove('hidden');
}

/* PAKIA TAARIFA ZA AKAUNTI */
async function loadAccount() {
  if (accountLoading || !zuneSupabase) return;

  accountLoading = true;

  const nameEl = document.getElementById('userNameDisplay');
  const phoneEl = document.getElementById('userPhoneDisplay');
  const emailEl = document.getElementById('userEmailDisplay');
  const roleBadge = document.getElementById('accountRoleBadge');
  const adminLink = document.getElementById('adminMenuLink');
  const retryButton = document.getElementById('retryAccountButton');

  retryButton?.classList.add('hidden');

  try {
    // Thibitisha session halali ya Supabase
    const {
      data: sessionData,
      error: sessionError
    } = await zuneSupabase.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;

    if (!user) {
      window.location.replace('./login.html');
      return;
    }

    // Soma profile ya mtumiaji
    const {
      data: profile,
      error: profileError
    } = await zuneSupabase
      .from('profiles')
      .select('full_name, phone, role, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile error:', profileError);

      showAccountMessage(
        'Imeshindikana kusoma profile. Kagua ruhusa za jedwali la profiles.',
        true
      );
    }

    // Onyesha taarifa zilizothibitishwa
    if (nameEl) {
      nameEl.textContent =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Mtumiaji wa ZUNE';
    }

    if (phoneEl) {
      phoneEl.textContent = profile?.phone || 'Namba ya simu haijawekwa';
    }

    if (emailEl) {
      emailEl.textContent = user.email || profile?.email || '';
    }

    // Admin link ionekane tu ikiwa profile imesomwa
    // na role yake ni admin
    adminLink?.classList.add('hidden');

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

    // Ondoa utegemezi wa taarifa za zamani za login
    localStorage.removeItem('zune_logged_in');
    localStorage.removeItem('zune_user_name');
    localStorage.removeItem('zune_user_phone');

  } catch (error) {
    console.error('Account loading error:', error);

    showAccountMessage(
      'Imeshindikana kuthibitisha akaunti. Kagua intaneti na mipangilio ya Supabase.',
      true
    );

    retryButton?.classList.remove('hidden');

  } finally {
    accountLoading = false;
  }
}

/* LOGOUT KUPITIA SUPABASE */
window.logoutUser = async function () {
  if (logoutInProgress || !zuneSupabase) return;

  logoutInProgress = true;

  const logoutButton = document.getElementById('logoutButton');

  if (logoutButton) {
    logoutButton.disabled = true;
    logoutButton.textContent = 'Inatoka...';
  }

  showAccountMessage('Unaondoka kwenye akaunti...');

  try {
    const { error } = await zuneSupabase.auth.signOut();

    if (error) throw error;

    localStorage.removeItem('zune_logged_in');
    localStorage.removeItem('zune_user_name');
    localStorage.removeItem('zune_user_phone');

    window.location.replace('./login.html');

  } catch (error) {
    console.error('Logout error:', error);

    logoutInProgress = false;

    if (logoutButton) {
      logoutButton.disabled = false;
      logoutButton.textContent =
        'Ondoka kwenye Akaunti (Logout)';
    }

    showAccountMessage(
      'Imeshindikana kutoka kwenye akaunti. Tafadhali jaribu tena.',
      true
    );
  }
};

/* ANZA UKURASA UKIFUNGUKA */
document.addEventListener('DOMContentLoaded', loadAccount);

/* THIBITISHA MABADILIKO YA SESSION */
if (zuneSupabase) {
  zuneSupabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !logoutInProgress) {
      window.location.replace('./login.html');
    }
  });
}
