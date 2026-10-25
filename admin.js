
/* ============================================
   ZUNE ADMIN DASHBOARD
   PART 1/5: SUPABASE, HELPERS & ADMIN LOGIN
   ============================================ */

'use strict';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let zuneAdminClient = null;
let currentAdmin = null;
let adminUsersCache = [];
let filteredAdminUsers = [];
let currentUsersPage = 1;

const USERS_PER_PAGE = 10;

/* ---------- SUPABASE CLIENT ---------- */

function getSupabaseClient() {
  if (zuneAdminClient) return zuneAdminClient;

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error(
      'Supabase haijapakiwa. Hakikisha script ya Supabase ipo kwenye admin.html.'
    );
  }

  zuneAdminClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return zuneAdminClient;
}

/* ---------- BASIC HELPERS ---------- */

function byId(id) {
  return document.getElementById(id);
}

function makeElement(tag, className = '', text = '') {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function clearElement(element) {
  if (element) element.replaceChildren();
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent =
      value === undefined || value === null ? '' : String(value);
  }
}

function formatTZS(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0
  }).format(number);
}

function formatDate(value) {
  if (!value) return 'Haijawekwa';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Haijulikani';

  return new Intl.DateTimeFormat('sw-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function showAdminMessage(message, type = 'info') {
  const host = byId('adminGlobalMessage') || byId('adminMessageHost');
  if (!host) return;

  const styles = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200'
  };

  host.className =
    'admin-message ' + (styles[type] || styles.info);

  host.textContent = message;
  host.classList.remove('hidden');
}

function hideAdminMessage() {
  ['adminGlobalMessage', 'adminMessageHost'].forEach((id) => {
    const element = byId(id);
    if (element) {
      element.textContent = '';
      element.classList.add('hidden');
    }
  });
}

function setLoginMessage(message, type = 'error') {
  const element = byId('loginMessage');
  if (!element) return;

  const styles = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200'
  };

  element.className =
    'admin-message ' + (styles[type] || styles.error);

  element.textContent = message;
  element.classList.remove('hidden');
}

function clearLoginMessage() {
  const element = byId('loginMessage');

  if (element) {
    element.textContent = '';
    element.classList.add('hidden');
  }
}

function setLoginLoading(isLoading) {
  const button = byId('adminLoginButton');
  if (!button) return;

  button.disabled = isLoading;
  button.classList.toggle('opacity-60', isLoading);
  button.classList.toggle('cursor-not-allowed', isLoading);

  const label = button.querySelector('span');

  if (label) {
    label.textContent = isLoading
      ? 'Inathibitisha...'
      : 'Ingia kwenye dashboard';
  }
}

function showScreen(screenName) {
  const login = byId('adminLoginScreen');
  const dashboard = byId('adminDashboard');

  if (login) {
    login.classList.toggle('hidden', screenName !== 'login');
  }

  if (dashboard) {
    dashboard.classList.toggle('hidden', screenName !== 'dashboard');
  }
}

function showEmptyState(container, message, icon = 'fa-circle-info') {
  if (!container) return;

  clearElement(container);

  const box = makeElement(
    'div',
    'panel p-6 text-center muted'
  );

  box.append(
    makeElement('i', `fa-solid ${icon} text-2xl mb-3`),
    makeElement('p', '', message)
  );

  container.appendChild(box);
}

function showLoadingState(container, message = 'Inapakia taarifa...') {
  if (!container) return;

  clearElement(container);

  const box = makeElement(
    'div',
    'panel p-6 text-center muted'
  );

  box.append(
    makeElement('i', 'fa-solid fa-spinner fa-spin text-2xl mb-3'),
    makeElement('p', '', message)
  );

  container.appendChild(box);
}

/* ---------- VERIFY ADMIN ROLE ---------- */

async function verifyAdmin(session) {
  if (!session || !session.user || !session.user.id) {
    return {
      allowed: false,
      admin: null,
      error: 'Hakuna session ya kuingia.'
    };
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role, is_verified')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Admin profile error:', error);

    return {
      allowed: false,
      admin: null,
      error: 'Imeshindikana kuthibitisha role ya akaunti.'
    };
  }

  if (!data || data.role !== 'admin') {
    return {
      allowed: false,
      admin: null,
      error: 'Akaunti hii haina ruhusa ya admin.'
    };
  }

  return {
    allowed: true,
    admin: data,
    error: null
  };
}

/* ---------- LOGIN ---------- */

async function handleAdminLogin(event) {
  if (event) event.preventDefault();

  clearLoginMessage();

  const email = (byId('adminEmail')?.value || '').trim();
  const password = byId('adminPassword')?.value || '';

  if (!email || !password) {
    setLoginMessage('Ingiza barua pepe na password.');
    return;
  }

  setLoginLoading(true);

  try {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const result = await verifyAdmin(data.session);

    if (!result.allowed) {
      await client.auth.signOut();

      setLoginMessage(
        result.error || 'Akaunti haina ruhusa ya admin.'
      );
      return;
    }

    currentAdmin = result.admin;
    showDashboard(currentAdmin);
  } catch (error) {
    console.error('Admin login error:', error);

    setLoginMessage(
      error.message || 'Imeshindikana kuingia. Jaribu tena.'
    );
  } finally {
    setLoginLoading(false);
  }
}

/* ---------- OPEN DASHBOARD ---------- */

function showDashboard(admin) {
  currentAdmin = admin;

  showScreen('dashboard');
  hideAdminMessage();

  setText(
    'adminIdentity',
    admin.full_name || 'Admin'
  );

  switchAdminTab('overview');

  loadDashboardStats();
  loadSellerApplications();
  loadProducts();
  loadOrders();
  loadUsers();
}

/* ---------- LOGOUT ---------- */

async function adminLogout() {
  try {
    const client = getSupabaseClient();

    const { error } = await client.auth.signOut();

    if (error) throw error;

    currentAdmin = null;
    adminUsersCache = [];
    filteredAdminUsers = [];
    currentUsersPage = 1;

    showScreen('login');
    clearLoginMessage();

    const password = byId('adminPassword');
    if (password) password.value = '';
  } catch (error) {
    console.error('Admin logout error:', error);

    showAdminMessage(
      'Imeshindikana kutoka kikamilifu. Jaribu tena.',
      'error'
    );
  }
}

window.adminLogout = adminLogout;
window.logoutAdmin = adminLogout;

/* ============================================
   PART 2/5: NAVIGATION, STATS & SELLER APPLICATIONS
   ============================================ */

/* ---------- DASHBOARD NAVIGATION ---------- */

const adminTabTitles = {
  overview: 'Muhtasari',
  applications: 'Maombi ya Wauzaji',
  products: 'Bidhaa',
  orders: 'Oda na Malipo',
  users: 'Watumiaji'
};

function switchAdminTab(tabName) {
  const validTabs = Object.keys(adminTabTitles);

  if (!validTabs.includes(tabName)) return;

  document.querySelectorAll('.admin-section').forEach((section) => {
    section.classList.add('hidden');
  });

  const section = byId(`section-${tabName}`);

  if (section) {
    section.classList.remove('hidden');
  }

  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    const active = button.dataset.adminTab === tabName;

    button.classList.toggle('active', active);

    if (active) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  setText('adminPageTitle', adminTabTitles[tabName]);

  if (tabName === 'overview') loadDashboardStats();
  if (tabName === 'applications') loadSellerApplications();
  if (tabName === 'products') loadProducts();
  if (tabName === 'orders') loadOrders();
  if (tabName === 'users') renderAdminUsers();

  hideAdminMessage();
}

window.switchAdminTab = switchAdminTab;

/* ---------- TABLE COUNTS ---------- */

async function getTableCount(tableName, filters = []) {
  const client = getSupabaseClient();

  let query = client
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  for (const filter of filters) {
    if (filter.operator === 'eq') {
      query = query.eq(filter.column, filter.value);
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Count error (${tableName}):`, error);
    return null;
  }

  return count ?? 0;
}

/* ---------- DASHBOARD STATISTICS ---------- */

async function loadDashboardStats() {
  if (!currentAdmin) return;

  const client = getSupabaseClient();

  try {
    const results = await Promise.all([
      getTableCount('orders'),
      getTableCount('profiles', [
        { operator: 'eq', column: 'role', value: 'vendor' }
      ]),
      getTableCount('profiles', [
        { operator: 'eq', column: 'role', value: 'buyer' }
      ])
    ]);

    setText(
      'statTotalOrders',
      results[0] === null ? '—' : results[0]
    );

    setText(
      'statTotalSellers',
      results[1] === null ? '—' : results[1]
    );

    setText(
      'statTotalCustomers',
      results[2] === null ? '—' : results[2]
    );

    /*
      Mauzo yanaachwa kama — mpaka hesabu ya mauzo iwe
      imefafanuliwa kulingana na oda zilizokamilika na
      sera ya RLS inayoruhusu admin kuzisoma.
    */
    setText('statTotalSales', '—');

    // Ondoa warning isiyo ya lazima ya client kutotumika.
    void client;
  } catch (error) {
    console.error('Dashboard stats error:', error);

    showAdminMessage(
      'Baadhi ya takwimu hazikuweza kupakiwa.',
      'warning'
    );
  }
}
