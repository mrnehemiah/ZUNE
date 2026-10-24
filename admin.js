
/* ==========================================
   ZUNE ADMIN DASHBOARD
   SEHEMU YA 1/3: SUPABASE + LOGIN
========================================== */

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let supabaseClient = null;
let currentAdmin = null;
let pageInitialized = false;

// ==========================================
// SUPABASE CLIENT
// ==========================================

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== 'function'
  ) {
    throw new Error(
      'Supabase SDK haijapakiwa. Kagua admin.html.'
    );
  }

  supabaseClient = window.supabase.createClient(
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

  return supabaseClient;
}

// ==========================================
// UI HELPERS
// ==========================================

function makeElement(tag, className = '', text = '') {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== null && text !== undefined) {
    element.textContent = String(text);
  }

  return element;
}

function showAdminMessage(message, type = 'info') {
  const element = document.getElementById('adminGlobalMessage');

  if (!element) {
    console.log('[ZUNE Admin]', message);
    return;
  }

  const styles = {
    error: 'text-red-700 bg-red-50',
    success: 'text-green-700 bg-green-50',
    info: 'text-blue-700 bg-blue-50',
    warning: 'text-amber-700 bg-amber-50'
  };

  element.textContent = message;
  element.className =
    'p-4 rounded-2xl text-sm font-medium ' +
    (styles[type] || styles.info);
}

function hideAdminMessage() {
  const element = document.getElementById('adminGlobalMessage');

  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
}

function setLoginMessage(message, type = 'error') {
  const element = document.getElementById('loginMessage');

  if (!element) {
    showAdminMessage(message, type);
    return;
  }

  const styles = {
    error: 'text-red-700 bg-red-50',
    success: 'text-green-700 bg-green-50',
    info: 'text-blue-700 bg-blue-50',
    warning: 'text-amber-700 bg-amber-50'
  };

  element.textContent = message;
  element.className =
    'p-3 mb-4 rounded-xl text-xs font-medium ' +
    (styles[type] || styles.error);
}

function clearLoginMessage() {
  const element = document.getElementById('loginMessage');

  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
}

function setLoginLoading(loading) {
  const button = document.getElementById('adminLoginButton');

  if (!button) return;

  button.disabled = loading;

  button.innerHTML = loading
    ? '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Inathibitisha...'
    : '<i class="fa-solid fa-lock mr-2"></i>Ingia kwenye Paneli';
}

function setStat(id, value) {
  const element = document.getElementById(id);

  if (!element) return;

  element.textContent =
    value === null || value === undefined
      ? '—'
      : String(value);
}

function formatTZS(value) {
  const amount = Number(value);

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (!Number.isFinite(amount)) return '—';

  return 'TZS ' + new Intl.NumberFormat('sw-TZ', {
    maximumFractionDigits: 2
  }).format(amount);
}

// ==========================================
// ONYESHA AU FICHA SCREEN
// TUMIA ID HALISI ZILIZO KWENYE admin.html
// ==========================================

function showScreen(screenId, visible) {
  const screen = document.getElementById(screenId);

  if (!screen) {
    console.warn('Screen haijapatikana:', screenId);
    return;
  }

  screen.classList.toggle('hidden', !visible);

  if (screenId === 'adminDashboard') {
    screen.classList.toggle('flex', visible);
  }
}

// ==========================================
// THIBITISHA ROLE YA ADMIN
// ==========================================

async function verifyAdmin(session) {
  if (!session || !session.user) {
    currentAdmin = null;

    return {
      success: false,
      message: 'Tafadhali ingia kwa akaunti ya admin.'
    };
  }

  const client = getSupabaseClient();

  try {
    const { data: profile, error } = await client
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Admin profile error:', error);

      return {
        success: false,
        message: 'Imeshindwa kuthibitisha ruhusa za akaunti.'
      };
    }

    if (!profile || profile.role !== 'admin') {
      currentAdmin = null;

      return {
        success: false,
        message: 'Akaunti hii haina ruhusa za admin.'
      };
    }

    currentAdmin = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      email: session.user.email || ''
    };

    return {
      success: true,
      admin: currentAdmin
    };
  } catch (error) {
    console.error('verifyAdmin error:', error);

    return {
      success: false,
      message: 'Hitilafu imetokea wakati wa kuthibitisha admin.'
    };
  }
}

// ==========================================
// ADMIN LOGIN
// ==========================================

async function handleAdminLogin(event) {
  if (event) event.preventDefault();

  let client;

  try {
    client = getSupabaseClient();
  } catch (error) {
    console.error(error);
    setLoginMessage(error.message, 'error');
    return;
  }

  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  if (!email || !password) {
    setLoginMessage('Weka email na password.', 'error');
    return;
  }

  setLoginLoading(true);
  clearLoginMessage();

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Admin login error:', error);

      setLoginMessage(
        'Imeshindwa kuingia. Hakiki email na password.',
        'error'
      );
      return;
    }

    const result = await verifyAdmin(data.session);

    if (!result.success) {
      await client.auth.signOut();
      setLoginMessage(result.message, 'error');
      return;
    }

    clearLoginMessage();
    showDashboard(result.admin);

  } catch (error) {
    console.error('handleAdminLogin error:', error);

    setLoginMessage(
      'Hitilafu imetokea. Jaribu tena.',
      'error'
    );
  } finally {
    setLoginLoading(false);
  }
}

// ==========================================
// ONYESHA DASHBOARD
// ==========================================

function showDashboard(admin) {
  currentAdmin = admin;

  // Hizi IDs zinaendana na admin.html yako
  showScreen('adminLoginScreen', false);
  showScreen('adminDashboard', true);

  const identity = document.getElementById('adminIdentity');

  if (identity) {
    identity.textContent =
      admin.full_name || admin.email || 'Admin';
  }

  // Pakia taarifa za dashboard
  loadDashboardStats();
  loadSellerApplications();
  loadProducts();
  loadOrders();
  loadUsers();
}

// ==========================================
// ADMIN LOGOUT
// ==========================================

async function adminLogout() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      console.error('Admin logout error:', error);

      showAdminMessage(
        'Imeshindwa kutoka. Jaribu tena.',
        'error'
      );
      return;
    }

    currentAdmin = null;

    showScreen('adminDashboard', false);
    showScreen('adminLoginScreen', true);

    const passwordInput =
      document.getElementById('adminPassword');

    if (passwordInput) passwordInput.value = '';

    clearLoginMessage();

  } catch (error) {
    console.error('adminLogout error:', error);

    showAdminMessage(
      'Hitilafu imetokea wakati wa kutoka.',
      'error'
    );
  }
}

window.adminLogout = adminLogout;
window.logoutAdmin = adminLogout;

/* ==========================================
   SEHEMU YA 2/3: DASHBOARD DATA
========================================== */

// ==========================================
// NAVIGATION YA ADMIN
// ==========================================

window.switchAdminTab = function (tabName) {
  const sections = [
    'overview',
    'applications',
    'products',
    'orders',
    'users'
  ];

  if (!sections.includes(tabName)) {
    console.warn('Unknown admin tab:', tabName);
    return;
  }

  sections.forEach(function (section) {
    const element = document.getElementById(
      'section-' + section
    );

    if (element) element.classList.add('hidden');
  });

  const activeSection = document.getElementById(
    'section-' + tabName
  );

  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  document.querySelectorAll('[data-admin-tab]').forEach(
    function (button) {
      const active =
        button.getAttribute('data-admin-tab') === tabName;

      button.classList.toggle('active', active);
      button.setAttribute(
        'aria-selected',
        active ? 'true' : 'false'
      );
    }
  );

  if (tabName === 'overview') {
    loadDashboardStats();
  } else if (tabName === 'applications') {
    loadSellerApplications();
  } else if (tabName === 'products') {
    loadProducts();
  } else if (tabName === 'orders') {
    loadOrders();
  } else if (tabName === 'users') {
    loadUsers();
  }
};

// ==========================================
// COUNT YA JEDWALI
// ==========================================

async function getTableCount(tableName) {
  const client = getSupabaseClient();

  try {
    const { count, error } = await client
      .from(tableName)
      .select('*', {
        count: 'exact',
        head: true
      });

    return {
      count: error ? null : count,
      error: error || null
    };
  } catch (error) {
    console.error('getTableCount error:', tableName, error);

    return {
      count: null,
      error
    };
  }
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

async function loadDashboardStats() {
  if (!currentAdmin) return;

  const client = getSupabaseClient();

  try {
    const [
      customersResult,
      sellersResult,
      ordersResult
    ] = await Promise.all([
      client
        .from('profiles')
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq('role', 'buyer'),

      client
        .from('profiles')
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq('role', 'vendor'),

      getTableCount('orders')
    ]);

    if (!customersResult.error) {
      setStat(
        'statTotalCustomers',
        customersResult.count ?? 0
      );
    } else {
      console.error(
        'Customers statistics error:',
        customersResult.error
      );
      setStat('statTotalCustomers', '—');
    }

    if (!sellersResult.error) {
      setStat(
        'statTotalSellers',
        sellersResult.count ?? 0
      );
    } else {
      console.error(
        'Sellers statistics error:',
        sellersResult.error
      );
      setStat('statTotalSellers', '—');
    }

    if (!ordersResult.error) {
      setStat(
        'statTotalOrders',
        ordersResult.count ?? 0
      );
    } else {
      console.error(
        'Orders statistics error:',
        ordersResult.error
      );
      setStat('statTotalOrders', '—');
    }

    // Mauzo yataunganishwa baada ya kuthibitisha
    // majina ya columns za malipo kwenye orders.
    setStat('statTotalSales', '—');

  } catch (error) {
    console.error('loadDashboardStats error:', error);

    setStat('statTotalCustomers', '—');
    setStat('statTotalSellers', '—');
    setStat('statTotalOrders', '—');
    setStat('statTotalSales', '—');
  }
}

// ==========================================
// MAOMBI YA WAUZAJI
// ==========================================

async function loadSellerApplications() {
  const client = getSupabaseClient();
  const container = document.getElementById(
    'applicationsContainer'
  );

  if (!currentAdmin || !container) return;

  container.textContent = 'Inapakia maombi ya wauzaji...';

  try {
    const { data, error } = await client
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Seller applications error:', error);

      container.textContent =
        'Imeshindwa kupakia maombi. Kagua ruhusa na schema ya jedwali.';
      return;
    }

    const applications = data || [];

    updatePendingApplicationsCount(applications);
    container.replaceChildren();

    if (applications.length === 0) {
      container.textContent = 'Hakuna maombi yaliyopatikana.';
      return;
    }

    applications.forEach(function (application) {
      const card = makeElement(
        'div',
        'admin-application-card'
      );

      const name = makeElement(
        'h3',
        'font-semibold',
        application.full_name || 'Jina halijawekwa'
      );

      const phone = makeElement(
        'p',
        'text-sm',
        'Simu: ' +
          (
            application.phone_number ||
            application.phone ||
            'Haijawekwa'
          )
      );

      const status = makeElement(
        'p',
        'text-sm',
        'Hali: ' + (application.status || 'Haijabainishwa')
      );

      card.append(name, phone, status);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('loadSellerApplications error:', error);

    container.textContent =
      'Hitilafu imetokea wakati wa kupakia maombi.';
  }
}

function updatePendingApplicationsCount(applications) {
  const element = document.getElementById('pendingAppsCount');

  if (!element) return;

  const pending = applications.filter(function (application) {
    return String(application.status || '').toLowerCase() === 'pending';
  }).length;

  element.textContent = String(pending);
}

// ==========================================
// BIDHAA
// ==========================================

async function loadProducts() {
  const client = getSupabaseClient();
  const container = document.getElementById(
    'adminProductsContainer'
  );

  if (!currentAdmin || !container) return;

  container.textContent = 'Inapakia bidhaa...';

  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Products error:', error);

      container.textContent =
        'Imeshindwa kupakia bidhaa. Kagua jina la jedwali na ruhusa.';
      return;
    }

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.textContent = 'Hakuna bidhaa zilizopatikana.';
      return;
    }

    data.forEach(function (product) {
      const card = makeElement('div', 'admin-product-card');

      const title = makeElement(
        'h3',
        'font-semibold',
        product.title || product.name || 'Bidhaa bila jina'
      );

      const price = makeElement(
        'p',
        'text-sm',
        'Bei: ' + formatTZS(product.price)
      );

      const stock = makeElement(
        'p',
        'text-sm',
        'Stock: ' + (product.stock ?? 'Haijabainishwa')
      );

      card.append(title, price, stock);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('loadProducts error:', error);

    container.textContent =
      'Hitilafu imetokea wakati wa kupakia bidhaa.';
  }
}

// ==========================================
// ODA
// ==========================================

async function loadOrders() {
  const client = getSupabaseClient();
  const container = document.getElementById(
    'adminOrdersContainer'
  );

  if (!currentAdmin || !container) return;

  container.textContent = 'Inapakia oda...';

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Orders error:', error);

      container.textContent =
        'Imeshindwa kupakia oda. Kagua jina la jedwali na ruhusa.';
      return;
    }

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.textContent = 'Hakuna oda zilizopatikana.';
      return;
    }

    data.forEach(function (order) {
      const card = makeElement('div', 'admin-order-card');

      const orderId = makeElement(
        'h3',
        'font-semibold',
        'Oda: ' + String(order.id || 'Haijulikani')
      );

      const status = makeElement(
        'p',
        'text-sm',
        'Hali: ' + (order.status || 'Haijabainishwa')
      );

      const amount = makeElement(
        'p',
        'text-sm',
        'Kiasi: ' +
          formatTZS(
            order.total_amount ??
            order.total ??
            order.amount
          )
      );

      card.append(orderId, status, amount);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('loadOrders error:', error);

    container.textContent =
      'Hitilafu imetokea wakati wa kupakia oda.';
  }
}

/* ==========================================
   SEHEMU YA 3/3: USERS + SESSION + INIT
========================================== */

// ==========================================
// ORODHA YA WATUMIAJI
// ==========================================

async function loadUsers() {
  const client = getSupabaseClient();
  const container = document.getElementById(
    'adminUsersContainer'
  );

  if (!currentAdmin || !container) return;

  container.textContent = 'Inapakia watumiaji...';

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, phone_number, role, is_verified')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Users loading error:', error);

      container.textContent =
        'Imeshindwa kupakia watumiaji. Kagua ruhusa za database.';
      return;
    }

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.textContent = 'Hakuna watumiaji waliopatikana.';
      return;
    }

    data.forEach(function (user) {
      const card = makeElement('div', 'admin-user-card');

      const name = makeElement(
        'h3',
        'font-semibold',
        user.full_name || 'Jina halijawekwa'
      );

      const phone = makeElement(
        'p',
        'text-sm',
        'Simu: ' + (user.phone_number || 'Haijawekwa')
      );

      const role = makeElement(
        'p',
        'text-sm',
        'Role: ' + (user.role || 'Haijabainishwa')
      );

      const verified = makeElement(
        'p',
        'text-sm',
        'Imethibitishwa: ' +
          (user.is_verified ? 'Ndiyo' : 'Hapana')
      );

      card.append(name, phone, role, verified);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('loadUsers error:', error);

    container.textContent =
      'Hitilafu imetokea wakati wa kupakia watumiaji.';
  }
}

// ==========================================
// UJUMBE WA KUUNDA AKAUNTI
// ==========================================

function explainUserCreationRequirement(event) {
  if (event) event.preventDefault();

  showAdminMessage(
    'Kutengeneza akaunti kunahitaji uthibitishaji salama wa server. ' +
    'Kipengele hiki bado hakijawezeshwa.',
    'warning'
  );
}

// ==========================================
// THIBITISHA SESSION ILIYOPO
// ==========================================

async function verifySessionAndRender() {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error('Get session error:', error);

      currentAdmin = null;
      showScreen('adminDashboard', false);
      showScreen('adminLoginScreen', true);

      setLoginMessage(
        'Imeshindwa kukagua session. Jaribu kuingia tena.',
        'error'
      );
      return;
    }

    const session = data.session;

    if (!session) {
      currentAdmin = null;
      showScreen('adminDashboard', false);
      showScreen('adminLoginScreen', true);
      return;
    }

    const result = await verifyAdmin(session);

    if (result.success) {
      showDashboard(result.admin);
      return;
    }

    await client.auth.signOut();

    currentAdmin = null;
    showScreen('adminDashboard', false);
    showScreen('adminLoginScreen', true);

    setLoginMessage(result.message, 'error');

  } catch (error) {
    console.error('Session verification error:', error);

    currentAdmin = null;
    showScreen('adminDashboard', false);
    showScreen('adminLoginScreen', true);

    setLoginMessage(
      'Hitilafu ya kuunganisha na Supabase. Jaribu tena.',
      'error'
    );
  }
}

// ==========================================
// ANZA UKURASA WA ADMIN
// ==========================================

function initializeAdminPage() {
  if (pageInitialized) return;

  pageInitialized = true;

  let client;

  try {
    client = getSupabaseClient();
  } catch (error) {
    console.error('Supabase initialization error:', error);

    showScreen('adminDashboard', false);
    showScreen('adminLoginScreen', true);
    setLoginMessage(error.message, 'error');
    return;
  }

  if (!client) {
    showScreen('adminDashboard', false);
    showScreen('adminLoginScreen', true);

    setLoginMessage(
      'Supabase haijaunganishwa.',
      'error'
    );
    return;
  }

  // Unganisha fomu ya kuingia
  const loginForm = document.getElementById('adminLoginForm');

  if (loginForm) {
    loginForm.addEventListener(
      'submit',
      handleAdminLogin
    );
  }

  // Fomu hizi zinaonyesha ujumbe tu kwa sasa
  const addSellerForm = document.getElementById('addSellerForm');

  if (addSellerForm) {
    addSellerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  const addCustomerForm = document.getElementById('addCustomerForm');

  if (addCustomerForm) {
    addCustomerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  // Kagua kama admin tayari ameingia
  verifySessionAndRender();
}

// ==========================================
// ANZA BAADA YA HTML KUSOMWA
// ==========================================

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeAdminPage,
    { once: true }
  );
} else {
  initializeAdminPage();
}
