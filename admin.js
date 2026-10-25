
// ================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 1/5
// Supabase, Authentication, Admin Verification
// ================================================

'use strict';

// -----------------------------------------------
// 1. SUPABASE CONFIGURATION
// -----------------------------------------------

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

if (!window.supabase) {
  console.error(
    'ZUNE: Supabase SDK haijapakiwa. Kagua script ya Supabase kwenye admin.html.'
  );
}

const zuneAdminSupabase = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  : null;

// Tumia client moja kwa shughuli zote za admin.js.
const supabaseAdmin = zuneAdminSupabase;

// -----------------------------------------------
// 2. STATE YA DASHBOARD
// -----------------------------------------------

let currentAdminSession = null;
let currentAdminProfile = null;
let currentAdminTab = 'overview';

let adminUsersData = [];
let filteredAdminUsers = [];
let currentUsersPage = 1;
const USERS_PER_PAGE = 10;

let sellerApplicationsData = [];
let adminProductsData = [];
let adminOrdersData = [];

let selectedUserCategory = 'all';

// Zuia shughuli zinazojirudia bila kukusudia.
let isAdminInitializing = false;
let isAdminLoggingOut = false;

// -----------------------------------------------
// 3. HTML HELPERS
// -----------------------------------------------

function adminElement(id) {
  return document.getElementById(id);
}

function adminSetText(id, value) {
  const element = adminElement(id);

  if (element) {
    element.textContent =
      value === null || value === undefined ? '' : String(value);
  }
}

function adminShow(elementOrId) {
  const element =
    typeof elementOrId === 'string'
      ? adminElement(elementOrId)
      : elementOrId;

  if (element) {
    element.classList.remove('hidden');
  }
}

function adminHide(elementOrId) {
  const element =
    typeof elementOrId === 'string'
      ? adminElement(elementOrId)
      : elementOrId;

  if (element) {
    element.classList.add('hidden');
  }
}

// Salama kwa kuonyesha data kutoka Supabase ndani ya HTML.
function adminEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, function (character) {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return entities[character];
  });
}

function adminFormatNumber(value) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? new Intl.NumberFormat('sw-TZ').format(number)
    : '0';
}

function adminFormatMoney(value) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return 'TSh 0';
  }

  return 'TSh ' + new Intl.NumberFormat('sw-TZ', {
    maximumFractionDigits: 2
  }).format(number);
}

function adminFormatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('sw-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

// -----------------------------------------------
// 4. UJUMBE WA ADMIN
// -----------------------------------------------

function showAdminMessage(message, type = 'info') {
  const element = adminElement('adminGlobalMessage');

  if (!element) {
    console.log('[ZUNE Admin]', message);
    return;
  }

  element.textContent = message;
  element.classList.remove(
    'hidden',
    'bg-red-50',
    'text-red-700',
    'bg-green-50',
    'text-green-700',
    'bg-blue-50',
    'text-blue-700',
    'bg-amber-50',
    'text-amber-800'
  );

  if (type === 'error') {
    element.classList.add('bg-red-50', 'text-red-700');
  } else if (type === 'success') {
    element.classList.add('bg-green-50', 'text-green-700');
  } else if (type === 'warning') {
    element.classList.add('bg-amber-50', 'text-amber-800');
  } else {
    element.classList.add('bg-blue-50', 'text-blue-700');
  }

  element.setAttribute('role', 'status');
}

function clearAdminMessage() {
  const element = adminElement('adminGlobalMessage');

  if (element) {
    element.textContent = '';
    element.classList.add('hidden');
  }

  const loginMessage = adminElement('loginMessage');

  if (loginMessage) {
    loginMessage.textContent = '';
    loginMessage.classList.add('hidden');
  }
}

function showLoginMessage(message, type = 'error') {
  const element = adminElement('loginMessage');

  if (!element) {
    alert(message);
    return;
  }

  element.textContent = message;
  element.classList.remove(
    'hidden',
    'text-red-600',
    'text-green-600',
    'text-amber-700'
  );

  if (type === 'success') {
    element.classList.add('text-green-600');
  } else if (type === 'warning') {
    element.classList.add('text-amber-700');
  } else {
    element.classList.add('text-red-600');
  }
}

// -----------------------------------------------
// 5. LOGIN SCREEN NA DASHBOARD
// -----------------------------------------------

function showAdminLogin() {
  adminShow('adminLoginScreen');
  adminHide('adminDashboard');

  currentAdminSession = null;
  currentAdminProfile = null;
}

function showAdminDashboard() {
  adminHide('adminLoginScreen');
  adminShow('adminDashboard');

  if (currentAdminProfile) {
    const displayName =
      currentAdminProfile.full_name ||
      currentAdminSession?.user?.email ||
      'ZUNE Admin';

    adminSetText('adminIdentity', displayName);
    adminSetText('sidebarAdminName', displayName);
  }
}

// -----------------------------------------------
// 6. THIBITISHA RUHUSA YA ADMIN
// -----------------------------------------------

async function verifyAdmin(session) {
  if (!supabaseAdmin || !session?.user?.id) {
    return {
      allowed: false,
      profile: null,
      message: 'Tafadhali ingia tena kwenye akaunti yako.'
    };
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('ZUNE admin profile check:', error);

      return {
        allowed: false,
        profile: null,
        message:
          'Imeshindikana kuthibitisha ruhusa yako. Kagua muunganisho na sera za Supabase.'
      };
    }

    if (!profile || profile.role !== 'admin') {
      return {
        allowed: false,
        profile: null,
        message: 'Akaunti hii haina ruhusa ya kuingia Admin Dashboard.'
      };
    }

    return {
      allowed: true,
      profile,
      message: 'Uthibitisho umekamilika.'
    };
  } catch (error) {
    console.error('ZUNE verifyAdmin error:', error);

    return {
      allowed: false,
      profile: null,
      message: 'Hitilafu imetokea wakati wa kuthibitisha akaunti.'
    };
  }
}

// -----------------------------------------------
// 7. LOGIN KWA BARUA PEPE NA PASSWORD
// -----------------------------------------------

async function handleAdminLogin(event) {
  if (event) {
    event.preventDefault();
  }

  if (!supabaseAdmin) {
    showLoginMessage(
      'Supabase haijapakiwa. Kagua muunganisho wa SDK kwenye admin.html.'
    );
    return;
  }

  const emailInput = adminElement('adminEmail');
  const passwordInput = adminElement('adminPassword');
  const loginButton = adminElement('adminLoginButton');

  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';

  if (!email || !password) {
    showLoginMessage('Tafadhali jaza barua pepe na password.');
    return;
  }

  const originalButtonText = loginButton
    ? loginButton.innerHTML
    : '';

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = 'Inathibitisha...';
  }

  clearAdminMessage();

  try {
    const { data, error } = await supabaseAdmin.auth
      .signInWithPassword({
        email,
        password
      });

    if (error) {
      console.error('ZUNE admin login error:', error);
      showLoginMessage(
        'Imeshindikana kuingia. Kagua barua pepe na password yako.'
      );
      return;
    }

    if (!data?.session || !data?.user) {
      showLoginMessage(
        'Session haikupatikana. Tafadhali jaribu kuingia tena.'
      );
      return;
    }

    const verification = await verifyAdmin(data.session);

    if (!verification.allowed) {
      // Ondoa session ya akaunti isiyo na ruhusa ya admin.
      await supabaseAdmin.auth.signOut();

      showAdminLogin();
      showLoginMessage(verification.message);
      return;
    }

    currentAdminSession = data.session;
    currentAdminProfile = verification.profile;

    showAdminDashboard();
    showLoginMessage('Umeingia kikamilifu.', 'success');

    await initializeAdminDashboard();

  } catch (error) {
    console.error('ZUNE login exception:', error);

    showLoginMessage(
      'Hitilafu imetokea. Kagua intaneti kisha ujaribu tena.'
    );
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = originalButtonText || 'Ingia';
    }
  }
}

// -----------------------------------------------
// 8. LOGOUT
// -----------------------------------------------

async function adminLogout() {
  if (!supabaseAdmin || isAdminLoggingOut) {
    return;
  }

  isAdminLoggingOut = true;

  try {
    const { error } = await supabaseAdmin.auth.signOut();

    if (error) {
      console.error('ZUNE admin logout error:', error);
      showAdminMessage(
        'Imeshindikana kutoka kikamilifu. Tafadhali jaribu tena.',
        'error'
      );
      return;
    }

    currentAdminSession = null;
    currentAdminProfile = null;

    adminUsersData = [];
    filteredAdminUsers = [];
    sellerApplicationsData = [];
    adminProductsData = [];
    adminOrdersData = [];

    showAdminLogin();
    clearAdminMessage();

    const loginForm = adminElement('adminLoginForm');

    if (loginForm) {
      loginForm.reset();
    }
  } finally {
    isAdminLoggingOut = false;
  }
}


// ================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 2/5
// Navigation, Dashboard Statistics, Seller Applications
// ================================================

// -----------------------------------------------
// 9. BADILISHA UKURASA WA ADMIN
// -----------------------------------------------

function switchAdminTab(tabName) {
  const allowedTabs = [
    'overview',
    'applications',
    'products',
    'orders',
    'users'
  ];

  if (!allowedTabs.includes(tabName)) {
    console.warn('ZUNE: Ukurasa haujatambuliwa:', tabName);
    return;
  }

  currentAdminTab = tabName;

  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.add('hidden');
  });

  const targetSection = adminElement('section-' + tabName);

  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

  document.querySelectorAll('[data-admin-tab]').forEach(button => {
    button.classList.toggle(
      'active',
      button.getAttribute('data-admin-tab') === tabName
    );
  });

  const titles = {
    overview: 'Muhtasari',
    applications: 'Maombi ya Wauzaji',
    products: 'Bidhaa',
    orders: 'Oda na Malipo',
    users: 'Watumiaji'
  };

  adminSetText('adminPageTitle', titles[tabName] || 'ZUNE Admin');

  if (tabName === 'overview') {
    loadDashboardStats();
  } else if (tabName === 'applications') {
    loadSellerApplications();
  } else if (tabName === 'products') {
    loadAdminProducts();
  } else if (tabName === 'orders') {
    loadAdminOrders();
  } else if (tabName === 'users') {
    loadAdminUsers();
  }
}

// -----------------------------------------------
// 10. KAGUA SESSION KABLA YA KUPAKIA DATA
// -----------------------------------------------

async function requireAdminSession() {
  if (!supabaseAdmin) {
    return false;
  }

  const { data, error } = await supabaseAdmin.auth.getSession();

  if (error || !data?.session) {
    showAdminLogin();
    return false;
  }

  const verification = await verifyAdmin(data.session);

  if (!verification.allowed) {
    await supabaseAdmin.auth.signOut();
    showAdminLogin();
    showLoginMessage(verification.message);
    return false;
  }

  currentAdminSession = data.session;
  currentAdminProfile = verification.profile;

  return true;
}

// -----------------------------------------------
// 11. TAKWIMU ZA DASHBOARD
// -----------------------------------------------

async function loadDashboardStats() {
  if (!supabaseAdmin || !currentAdminSession) {
    return;
  }

  try {
    const [
      ordersResult,
      sellersResult,
      customersResult,
      applicationsResult
    ] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, total_price, status'),

      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'vendor'),

      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'buyer'),

      supabaseAdmin
        .from('seller_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ]);

    if (ordersResult.error) {
      console.error('ZUNE orders statistics:', ordersResult.error);
    }

    if (sellersResult.error) {
      console.error('ZUNE sellers statistics:', sellersResult.error);
    }

    if (customersResult.error) {
      console.error('ZUNE customers statistics:', customersResult.error);
    }

    if (applicationsResult.error) {
      console.error('ZUNE applications statistics:', applicationsResult.error);
    }

    // Oda zilizopatikana kwa mafanikio pekee ndizo hutumika
    // kwenye hesabu za hapa. Hii si uthibitisho wa malipo.
    if (!ordersResult.error) {
      const orders = ordersResult.data || [];

      adminSetText('statTotalOrders', adminFormatNumber(orders.length));

      const sales = orders
        .filter(order =>
          ['completed'].includes(String(order.status || '').toLowerCase())
        )
        .reduce((sum, order) => sum + Number(order.total_price || 0), 0);

      adminSetText('statTotalSales', adminFormatMoney(sales));
    }

    if (!sellersResult.error) {
      adminSetText(
        'statTotalSellers',
        adminFormatNumber(sellersResult.count || 0)
      );
    }

    if (!customersResult.error) {
      adminSetText(
        'statTotalCustomers',
        adminFormatNumber(customersResult.count || 0)
      );
    }

    if (!applicationsResult.error) {
      adminSetText(
        'pendingAppsCount',
        adminFormatNumber(applicationsResult.count || 0)
      );
    }

  } catch (error) {
    console.error('ZUNE dashboard statistics error:', error);
    showAdminMessage(
      'Imeshindikana kupakia baadhi ya takwimu. Kagua ruhusa za Supabase.',
      'warning'
    );
  }
}

// -----------------------------------------------
// 12. KUPAKIA MAOMBI YA WAUZAJI
// -----------------------------------------------

async function loadSellerApplications() {
  if (!supabaseAdmin || !currentAdminSession) {
    return;
  }

  const container = adminElement('applicationsContainer');

  if (container) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-3"></i>
        <p>Inapakia maombi...</p>
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ZUNE seller applications error:', error);

      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-600">
            <i class="fa-solid fa-circle-exclamation text-2xl mb-3"></i>
            <p class="font-semibold">Imeshindikana kupakia maombi.</p>
            <p class="text-sm mt-2">
              Kagua sera za RLS na ruhusa za admin kwenye Supabase.
            </p>
          </div>
        `;
      }

      return;
    }

    sellerApplicationsData = data || [];

    renderSellerApplications();
    updateApplicationStatistics();

  } catch (error) {
    console.error('ZUNE applications exception:', error);

    if (container) {
      container.textContent = 'Hitilafu imetokea wakati wa kupakia maombi.';
    }
  }
}

// -----------------------------------------------
// 13. TAKWIMU ZA MAOMBI
// -----------------------------------------------

function updateApplicationStatistics() {
  const applications = sellerApplicationsData;

  const pending = applications.filter(app =>
    String(app.status || '').toLowerCase() === 'pending'
  ).length;

  const approved = applications.filter(app =>
    ['approved', 'accepted'].includes(
      String(app.status || '').toLowerCase()
    )
  ).length;

  adminSetText('applicationsTotalCount', applications.length);
  adminSetText('applicationsPendingCount', pending);
  adminSetText('applicationsApprovedCount', approved);
  adminSetText('pendingAppsCount', pending);
}

// -----------------------------------------------
// 14. KUCHUJA NA KUONYESHA MAOMBI
// -----------------------------------------------

function renderSellerApplications() {
  const container = adminElement('applicationsContainer');

  if (!container) {
    return;
  }

  const statusFilter = adminElement('applicationStatusFilter')?.value || 'all';

  const applications = sellerApplicationsData.filter(app => {
    const status = String(app.status || 'pending').toLowerCase();

    if (statusFilter === 'all') {
      return true;
    }

    if (statusFilter === 'approved') {
      return ['approved', 'accepted'].includes(status);
    }

    if (statusFilter === 'rejected') {
      return ['rejected', 'declined'].includes(status);
    }

    return status === statusFilter;
  });

  if (applications.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-inbox text-3xl mb-3"></i>
        <p class="font-semibold">Hakuna maombi yanayolingana na kichujio.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = applications.map(app => {
    const name = adminEscape(
      app.store_name || app.business_name || 'Duka halijawekewa jina'
    );

    const owner = adminEscape(app.owner_name || '—');
    const phone = adminEscape(app.phone || '—');
    const country = adminEscape(app.country || '—');
    const city = adminEscape(app.city || '—');
    const category = adminEscape(app.category || '—');
    const date = adminEscape(adminFormatDate(app.created_at));
    const status = String(app.status || 'pending').toLowerCase();

    let statusLabel = 'Inasubiri';
    let statusClass = 'bg-amber-50 text-amber-700';

    if (['approved', 'accepted'].includes(status)) {
      statusLabel = 'Imeidhinishwa';
      statusClass = 'bg-green-50 text-green-700';
    } else if (['rejected', 'declined'].includes(status)) {
      statusLabel = 'Imekataliwa';
      statusClass = 'bg-red-50 text-red-700';
    }

    return `
      <article class="border border-slate-200 rounded-xl p-4 mb-4">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <h4 class="font-bold text-slate-800">${name}</h4>
              <span class="text-xs font-semibold rounded-full px-3 py-1 ${statusClass}">
                ${statusLabel}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
              <p><strong>Mmiliki:</strong> ${owner}</p>
              <p><strong>Simu:</strong> ${phone}</p>
              <p><strong>Nchi:</strong> ${country}</p>
              <p><strong>Mji:</strong> ${city}</p>
              <p><strong>Aina ya biashara:</strong> ${category}</p>
              <p><strong>Tarehe:</strong> ${date}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            ${
              status === 'pending'
                ? `
                  <button type="button"
                    class="rounded-lg px-3 py-2 text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
                    onclick="showAdminMessage('Uidhinishaji wa maombi utaunganishwa baada ya kuthibitisha schema na sera za database.','warning')">
                    Kagua na uidhinishe
                  </button>
                  <button type="button"
                    class="rounded-lg px-3 py-2 text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100"
                    onclick="showAdminMessage('Utaratibu wa kukataa maombi bado haujaunganishwa na database.','warning')">
                    Kataa
                  </button>
                `
                : ''
            }
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 3/5
// Products, Product Search, Orders
// ================================================

// -----------------------------------------------
// 16. KUPAKIA BIDHAA
// -----------------------------------------------

async function loadAdminProducts() {
  if (!supabaseAdmin || !currentAdminSession) return;

  const container = adminElement('adminProductsContainer');

  if (container) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-3"></i>
        <p>Inapakia bidhaa...</p>
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(
        'id, vendor_id, title, description, price, stock_quantity, image_url, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ZUNE products error:', error);

      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-600">
            <i class="fa-solid fa-circle-exclamation text-2xl mb-3"></i>
            <p class="font-semibold">Imeshindikana kupakia bidhaa.</p>
            <p class="text-sm mt-2">
              Kagua ruhusa za kusoma jedwali la products kwenye Supabase.
            </p>
          </div>
        `;
      }

      return;
    }

    adminProductsData = data || [];

    updateProductStatistics();
    renderAdminProducts();

  } catch (error) {
    console.error('ZUNE products exception:', error);

    if (container) {
      container.textContent = 'Hitilafu imetokea wakati wa kupakia bidhaa.';
    }
  }
}

// -----------------------------------------------
// 17. TAKWIMU ZA BIDHAA
// -----------------------------------------------

function updateProductStatistics() {
  const products = adminProductsData;

  const inStock = products.filter(product =>
    Number(product.stock_quantity || 0) > 0
  ).length;

  const outOfStock = products.filter(product =>
    Number(product.stock_quantity || 0) <= 0
  ).length;

  adminSetText('productsTotalCount', adminFormatNumber(products.length));
  adminSetText('productsInStockCount', adminFormatNumber(inStock));
  adminSetText('productsOutOfStockCount', adminFormatNumber(outOfStock));
}

// -----------------------------------------------
// 18. UTAFUTAJI NA KUCHUJA BIDHAA
// -----------------------------------------------

function renderAdminProducts() {
  const container = adminElement('adminProductsContainer');

  if (!container) return;

  const search =
    (adminElement('adminProductSearch')?.value || '')
      .trim()
      .toLowerCase();

  const stockFilter =
    adminElement('adminProductStockFilter')?.value || 'all';

  const products = adminProductsData.filter(product => {
    const title = String(product.title || '').toLowerCase();
    const description = String(product.description || '').toLowerCase();
    const stock = Number(product.stock_quantity || 0);

    const matchesSearch =
      !search ||
      title.includes(search) ||
      description.includes(search) ||
      String(product.id || '').toLowerCase().includes(search);

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'available' && stock > 0) ||
      (stockFilter === 'empty' && stock <= 0);

    return matchesSearch && matchesStock;
  });

  if (products.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-box-open text-3xl mb-3"></i>
        <p class="font-semibold">Hakuna bidhaa zilizopatikana.</p>
        <p class="text-sm mt-1">Jaribu kubadilisha utafutaji au kichujio.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="border-b border-slate-200 text-slate-500">
            <th class="px-3 py-3 font-semibold">Bidhaa</th>
            <th class="px-3 py-3 font-semibold">Bei</th>
            <th class="px-3 py-3 font-semibold">Stock</th>
            <th class="px-3 py-3 font-semibold">Tarehe</th>
            <th class="px-3 py-3 font-semibold">ID</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(product => {
            const title = adminEscape(product.title || 'Bidhaa bila jina');
            const description = adminEscape(product.description || '');
            const price = adminEscape(adminFormatMoney(product.price));
            const stock = Number(product.stock_quantity || 0);
            const stockLabel = stock > 0 ? 'Inapatikana' : 'Imeisha';
            const stockClass = stock > 0
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700';

            return `
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-4">
                  <p class="font-semibold text-slate-800">${title}</p>
                  <p class="text-xs text-slate-500 mt-1">${description}</p>
                </td>
                <td class="px-3 py-4 whitespace-nowrap font-semibold">${price}</td>
                <td class="px-3 py-4">
                  <span class="inline-block rounded-full px-2 py-1 text-xs ${stockClass}">
                    ${stockLabel} (${adminEscape(stock)})
                  </span>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-slate-500">
                  ${adminEscape(adminFormatDate(product.created_at))}
                </td>
                <td class="px-3 py-4 text-xs text-slate-500">
                  ${adminEscape(String(product.id || '').slice(0, 8))}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-xs text-slate-500 mt-4">
      Bidhaa zilizopatikana: ${adminFormatNumber(products.length)}
    </p>
  `;
}

// -----------------------------------------------
// 19. KUPAKIA ODA
// -----------------------------------------------

async function loadAdminOrders() {
  if (!supabaseAdmin || !currentAdminSession) return;

  const container = adminElement('adminOrdersContainer');

  if (container) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-3"></i>
        <p>Inapakia oda...</p>
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ZUNE orders error:', error);

      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-600">
            <i class="fa-solid fa-circle-exclamation text-2xl mb-3"></i>
            <p class="font-semibold">Imeshindikana kupakia oda.</p>
            <p class="text-sm mt-2">
              Kagua ruhusa za kusoma jedwali la orders kwenye Supabase.
            </p>
          </div>
        `;
      }

      return;
    }

    adminOrdersData = data || [];

    updateOrderStatistics();
    renderAdminOrders();

  } catch (error) {
    console.error('ZUNE orders exception:', error);

    if (container) {
      container.textContent = 'Hitilafu imetokea wakati wa kupakia oda.';
    }
  }
}

// -----------------------------------------------
// 20. TAKWIMU ZA ODA
// -----------------------------------------------

function updateOrderStatistics() {
  const orders = adminOrdersData;

  const countStatus = status =>
    orders.filter(order =>
      String(order.status || '').toLowerCase() === status
    ).length;

  adminSetText('ordersTotalCount', adminFormatNumber(orders.length));
  adminSetText('ordersPendingCount', adminFormatNumber(countStatus('pending')));
  adminSetText('ordersCompletedCount', adminFormatNumber(countStatus('completed')));
  adminSetText('ordersCancelledCount', adminFormatNumber(countStatus('cancelled')));
}

// -----------------------------------------------
// 21. UTAFUTAJI NA KUCHUJA ODA
// -----------------------------------------------

function renderAdminOrders() {
  const container = adminElement('adminOrdersContainer');

  if (!container) return;

  const search =
    (adminElement('adminOrderSearch')?.value || '')
      .trim()
      .toLowerCase();

  const statusFilter =
    adminElement('adminOrderStatusFilter')?.value || 'all';

  const orders = adminOrdersData.filter(order => {
    const status = String(order.status || '').toLowerCase();

    const matchesSearch =
      !search ||
      String(order.id || '').toLowerCase().includes(search) ||
      String(order.buyer_id || '').toLowerCase().includes(search) ||
      String(order.product_id || '').toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-receipt text-3xl mb-3"></i>
        <p class="font-semibold">Hakuna oda zilizopatikana.</p>
        <p class="text-sm mt-1">Jaribu kubadilisha utafutaji au kichujio.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="border-b border-slate-200 text-slate-500">
            <th class="px-3 py-3 font-semibold">Oda ID</th>
            <th class="px-3 py-3 font-semibold">Buyer ID</th>
            <th class="px-3 py-3 font-semibold">Product ID</th>
            <th class="px-3 py-3 font-semibold">Idadi</th>
            <th class="px-3 py-3 font-semibold">Jumla</th>
            <th class="px-3 py-3 font-semibold">Hali</th>
            <th class="px-3 py-3 font-semibold">Tarehe</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            const status = String(order.status || 'pending').toLowerCase();

            const labels = {
              pending: 'Inasubiri',
              confirmed: 'Imethibitishwa',
              completed: 'Imekamilika',
              cancelled: 'Imeghairiwa'
            };

            const classes = {
              pending: 'bg-amber-50 text-amber-700',
              confirmed: 'bg-blue-50 text-blue-700',
              completed: 'bg-green-50 text-green-700',
              cancelled: 'bg-red-50 text-red-700'
            };

            return `
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-4 font-semibold text-slate-800">
                  ${adminEscape(String(order.id || '').slice(0, 8))}
                </td>
                <td class="px-3 py-4 text-slate-600">
                  ${adminEscape(String(order.buyer_id || '').slice(0, 8))}
                </td>
                <td class="px-3 py-4 text-slate-600">
                  ${adminEscape(String(order.product_id || '').slice(0, 8))}
                </td>
                <td class="px-3 py-4">${adminEscape(order.quantity ?? 0)}</td>
                <td class="px-3 py-4 whitespace-nowrap font-semibold">
                  ${adminEscape(adminFormatMoney(order.total_price))}
                </td>
                <td class="px-3 py-4">
                  <span class="inline-block rounded-full px-2 py-1 text-xs ${classes[status] || 'bg-slate-100 text-slate-700'}">
                    ${adminEscape(labels[status] || status)}
                  </span>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-slate-500">
                  ${adminEscape(adminFormatDate(order.created_at))}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-xs text-slate-500 mt-4">
      Oda zilizopatikana: ${adminFormatNumber(orders.length)}
    </p>
  `;
}

// ============================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 4/5: USIMAMIZI WA WATUMIAJI
// ============================================

// 1. PAKIA WATUMIAJI KUTOKA SUPABASE
async function loadAdminUsers() {
  if (!(await requireAdminSession())) return;

  const container = adminElement('adminUsersContainer');

  if (container) {
    container.innerHTML = `
      <div class="p-6 text-center">
        Inapakia taarifa za watumiaji...
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone_number,
        role,
        is_verified,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    adminUsersData = Array.isArray(data) ? data : [];

    updateAdminUserStatistics();
    applyAdminUserFilters();

  } catch (error) {
    console.error('ZUNE loadAdminUsers error:', error);

    if (container) {
      container.innerHTML = `
        <div class="p-5 text-center text-red-600">
          Imeshindikana kupakia watumiaji.
          <p class="mt-2 text-sm">
            ${adminEscape(error.message || 'Hitilafu haijajulikana')}
          </p>
        </div>
      `;
    }

    showAdminMessage(
      'Imeshindikana kupakia watumiaji. Hakikisha ruhusa za Supabase RLS zinaruhusu admin kusoma profiles.',
      'error'
    );
  }
}


// 2. TAKWIMU ZA WATUMIAJI
function updateAdminUserStatistics() {
  const users = Array.isArray(adminUsersData)
    ? adminUsersData
    : [];

  const buyers = users.filter(
    user => user.role === 'buyer'
  ).length;

  const vendors = users.filter(
    user => user.role === 'vendor'
  ).length;

  const verified = users.filter(
    user => user.is_verified === true
  ).length;

  adminSetText('usersStatAll', users.length);
  adminSetText('usersStatBuyers', buyers);
  adminSetText('usersStatVendors', vendors);
  adminSetText('usersStatVerified', verified);
}


// 3. CHAGUA KUNDI LA WATUMIAJI
function selectUserCategory(category) {
  const allowedCategories = [
    'all',
    'buyer',
    'vendor',
    'verified'
  ];

  if (!allowedCategories.includes(category)) {
    category = 'all';
  }

  selectedUserCategory = category;
  currentUsersPage = 1;

  // Sasisha mwonekano wa kadi za makundi
  document.querySelectorAll('[data-user-category]').forEach(card => {
    const cardCategory = card.getAttribute(
      'data-user-category'
    );

    card.classList.toggle(
      'ring-2',
      cardCategory === category
    );

    card.classList.toggle(
      'ring-green-600',
      cardCategory === category
    );
  });

  // Sawazisha kichujio cha role pale inapohitajika
  const roleFilter = adminElement('adminUserRoleFilter');

  if (roleFilter) {
    if (category === 'buyer' || category === 'vendor') {
      roleFilter.value = category;
    } else {
      roleFilter.value = 'all';
    }
  }

  applyAdminUserFilters();
}


// 4. CHUJA WATUMIAJI KWA MASHARTI
function applyAdminUserFilters() {
  const searchInput = adminElement('adminUserSearch');
  const roleFilter = adminElement('adminUserRoleFilter');
  const verificationFilter = adminElement(
    'adminUserVerificationFilter'
  );

  const searchTerm = (
    searchInput?.value || ''
  ).trim().toLowerCase();

  const selectedRole = roleFilter?.value || 'all';
  const selectedVerification =
    verificationFilter?.value || 'all';

  let users = [...(adminUsersData || [])];

  // Kichujio cha kundi
  if (selectedUserCategory === 'buyer') {
    users = users.filter(user => user.role === 'buyer');
  } else if (selectedUserCategory === 'vendor') {
    users = users.filter(user => user.role === 'vendor');
  } else if (selectedUserCategory === 'verified') {
    users = users.filter(user => user.is_verified === true);
  }

  // Kichujio cha maandishi
  if (searchTerm) {
    users = users.filter(user => {
      const searchableText = [
        user.full_name || '',
        user.phone_number || '',
        user.role || '',
        user.id || ''
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  // Kichujio cha aina ya akaunti
  if (selectedRole !== 'all') {
    users = users.filter(
      user => user.role === selectedRole
    );
  }

  // Kichujio cha uthibitishaji
  if (selectedVerification === 'verified') {
    users = users.filter(
      user => user.is_verified === true
    );
  } else if (selectedVerification === 'unverified') {
    users = users.filter(
      user => user.is_verified !== true
    );
  }

  filteredAdminUsers = users;

  const resultCount = adminElement('adminUsersResultCount');

  if (resultCount) {
    resultCount.textContent =
      `${filteredAdminUsers.length} mtumiaji/watumiaji`;
  }

  currentUsersPage = 1;
  renderAdminUsers();
}


// 5. ONYESHA ORODHA YA WATUMIAJI
function renderAdminUsers() {
  const container = adminElement('adminUsersContainer');

  if (!container) return;

  const users = Array.isArray(filteredAdminUsers)
    ? filteredAdminUsers
    : [];

  const totalPages = Math.max(
    1,
    Math.ceil(users.length / USERS_PER_PAGE)
  );

  if (currentUsersPage > totalPages) {
    currentUsersPage = totalPages;
  }

  if (currentUsersPage < 1) {
    currentUsersPage = 1;
  }

  const startIndex =
    (currentUsersPage - 1) * USERS_PER_PAGE;

  const pageUsers = users.slice(
    startIndex,
    startIndex + USERS_PER_PAGE
  );

  if (users.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center">
        <div class="text-4xl mb-3">👥</div>
        <h3 class="font-semibold text-gray-800">
          Hakuna watumiaji waliopatikana
        </h3>
        <p class="text-sm text-gray-500 mt-2">
          Jaribu kubadilisha maneno ya utafutaji au vichujio.
        </p>
      </div>
    `;

    adminSetText('usersPageInfo', 'Ukurasa 1 wa 1');

    const previousButton = adminElement('usersPrevPage');
    const nextButton = adminElement('usersNextPage');

    if (previousButton) previousButton.disabled = true;
    if (nextButton) nextButton.disabled = true;

    return;
  }

  const rows = pageUsers.map((user, index) => {
    const name = adminEscape(
      user.full_name || 'Jina halijawekwa'
    );

    const phone = adminEscape(
      user.phone_number || 'Hakuna namba ya simu'
    );

    const role = adminEscape(
      user.role || 'Haijulikani'
    );

    const userId = adminEscape(user.id || '');

    const createdAt = user.created_at
      ? adminEscape(adminFormatDate(user.created_at))
      : 'Haijulikani';

    const verified = user.is_verified === true;

    const verificationLabel = verified
      ? 'Amethibitishwa'
      : 'Hajathibitishwa';

    const verificationClass = verified
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-800';

    const roleLabel = {
      admin: 'Admin',
      vendor: 'Muuzaji',
      buyer: 'Mteja'
    }[user.role] || role;

    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="px-4 py-3 text-sm">
          ${startIndex + index + 1}
        </td>

        <td class="px-4 py-3">
          <div class="font-semibold text-gray-800">
            ${name}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            ID: ${userId}
          </div>
        </td>

        <td class="px-4 py-3 text-sm">
          ${phone}
        </td>

        <td class="px-4 py-3">
          <span class="inline-block rounded-full px-3 py-1 text-xs bg-blue-100 text-blue-700">
            ${adminEscape(roleLabel)}
          </span>
        </td>

        <td class="px-4 py-3">
          <span class="inline-block rounded-full px-3 py-1 text-xs ${verificationClass}">
            ${verificationLabel}
          </span>
        </td>

        <td class="px-4 py-3 text-sm text-gray-600">
          ${createdAt}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Na.
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Mtumiaji
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Simu
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Aina ya akaunti
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Uthibitishaji
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-600">
              Tarehe ya kujiunga
            </th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  adminSetText(
    'usersPageInfo',
    `Ukurasa ${currentUsersPage} wa ${totalPages}`
  );

  const previousButton = adminElement('usersPrevPage');
  const nextButton = adminElement('usersNextPage');

  if (previousButton) {
    previousButton.disabled = currentUsersPage <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentUsersPage >= totalPages;
  }
}


// 6. BADILISHA UKURASA WA WATUMIAJI
function changeAdminUsersPage(direction) {
  const totalPages = Math.max(
    1,
    Math.ceil(
      (filteredAdminUsers || []).length / USERS_PER_PAGE
    )
  );

  const nextPage = currentUsersPage + direction;

  if (nextPage < 1 || nextPage > totalPages) {
    return;
  }

  currentUsersPage = nextPage;
  renderAdminUsers();
}


// 7. FUTA VICHUJO VYA WATUMIAJI
function clearAdminUserFilters() {
  const searchInput = adminElement('adminUserSearch');
  const roleFilter = adminElement('adminUserRoleFilter');
  const verificationFilter = adminElement(
    'adminUserVerificationFilter'
  );

  if (searchInput) searchInput.value = '';
  if (roleFilter) roleFilter.value = 'all';
  if (verificationFilter) verificationFilter.value = 'all';

  selectedUserCategory = 'all';
  currentUsersPage = 1;

  document.querySelectorAll('[data-user-category]').forEach(card => {
    const category = card.getAttribute('data-user-category');

    card.classList.toggle('ring-2', category === 'all');
    card.classList.toggle('ring-green-600', category === 'all');
  });

  applyAdminUserFilters();
}

 // ============================================
 // ZUNE ADMIN DASHBOARD
 // SEHEMU YA 5/5: EVENTS, INITIALIZATION & STARTUP
 // ============================================

// 1. ANZISHA DASHBOARD BAADA YA ADMIN KUINGIA
async function initializeAdminDashboard() {
  if (isAdminInitializing) return;

  isAdminInitializing = true;

  try {
    if (!(await requireAdminSession())) {
      showAdminLogin();
      return;
    }

    showAdminDashboard();

    await Promise.allSettled([
      loadDashboardStats(),
      loadSellerApplications(),
      loadAdminProducts(),
      loadAdminOrders(),
      loadAdminUsers()
    ]);

    switchAdminTab(currentAdminTab || 'overview');

  } catch (error) {
    console.error(
      'ZUNE dashboard initialization error:',
      error
    );

    showAdminMessage(
      'Dashboard imeshindwa kuanzishwa. Jaribu kuingia tena.',
      'error'
    );
  } finally {
    isAdminInitializing = false;
  }
}


// 2. UNGANISHA FORM YA ADMIN LOGIN
function bindAdminLoginEvents() {
  const loginForm = adminElement('adminLoginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }
}


// 3. UNGANISHA VITufe VYA DASHBOARD
function bindAdminNavigationEvents() {
  document.querySelectorAll('[data-admin-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-admin-tab');

      if (tab) {
        switchAdminTab(tab);
      }
    });
  });

  const logoutButton = adminElement('adminLogoutButton');

  if (logoutButton) {
    logoutButton.addEventListener('click', adminLogout);
  }

  const refreshUsersButton = adminElement(
    'refreshUsersButton'
  );

  if (refreshUsersButton) {
    refreshUsersButton.addEventListener(
      'click',
      loadAdminUsers
    );
  }

  const previousButton = adminElement('usersPrevPage');

  if (previousButton) {
    previousButton.addEventListener('click', () => {
      changeAdminUsersPage(-1);
    });
  }

  const nextButton = adminElement('usersNextPage');

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      changeAdminUsersPage(1);
    });
  }

  const clearFiltersButton = adminElement(
    'clearUserFiltersButton'
  );

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener(
      'click',
      clearAdminUserFilters
    );
  }
}


// 4. UNGANISHA VICHUJO VYA WATUMIAJI
function bindAdminUserFilterEvents() {
  const searchInput = adminElement('adminUserSearch');
  const roleFilter = adminElement('adminUserRoleFilter');
  const verificationFilter = adminElement(
    'adminUserVerificationFilter'
  );

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyAdminUserFilters();
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      selectedUserCategory = 'all';
      applyAdminUserFilters();
    });
  }

  if (verificationFilter) {
    verificationFilter.addEventListener('change', () => {
      applyAdminUserFilters();
    });
  }

  document.querySelectorAll('[data-user-category]').forEach(card => {
    card.addEventListener('click', () => {
      selectUserCategory(
        card.getAttribute('data-user-category')
      );
    });
  });
}


// 5. UNGANISHA VICHUJO VYA MAOMBI YA WAUZAJI
function bindApplicationEvents() {
  const statusFilter = adminElement(
    'applicationStatusFilter'
  );

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      renderSellerApplications();
    });
  }
}


// 6. UNGANISHA VICHUJO VYA BIDHAA
function bindAdminProductEvents() {
  const searchInput = adminElement('adminProductSearch');
  const stockFilter = adminElement(
    'adminProductStockFilter'
  );

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderAdminProducts();
    });
  }

  if (stockFilter) {
    stockFilter.addEventListener('change', () => {
      renderAdminProducts();
    });
  }
}


// 7. UNGANISHA VICHUJO VYA ODA
function bindAdminOrderEvents() {
  const searchInput = adminElement('adminOrderSearch');
  const statusFilter = adminElement(
    'adminOrderStatusFilter'
  );

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderAdminOrders();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      renderAdminOrders();
    });
  }
}


// 8. ZUIA FORM ZA KUUNDA AKAUNTI KWA NJIA ISIYO SALAMA
// Kuunda akaunti kunahitaji uthibitishaji wa upande wa server.
// Hizi form zitaonyesha ujumbe badala ya kujaribu kubadilisha
// watumiaji moja kwa moja kutoka browser.
function bindAdminAccountForms() {
  const formIds = [
    'addSellerForm',
    'addCustomerForm'
  ];

  formIds.forEach(formId => {
    const form = adminElement(formId);

    if (!form) return;

    form.addEventListener('submit', event => {
      event.preventDefault();

      showAdminMessage(
        'Kuunda akaunti kutoka dashboard bado hakujawashwa. Kunahitaji utaratibu salama wa server ili kulinda akaunti na ruhusa za watumiaji.',
        'warning'
      );
    });
  });
}


// 9. UNGANISHA VITufe VYENYE ONCLICK KWENYE HTML
// Hii husaidia pale HTML tayari ina vitufe vya kupakia data.
function bindAdminRefreshButtons() {
  const refreshBindings = [
    ['refreshApplicationsButton', loadSellerApplications],
    ['refreshProductsButton', loadAdminProducts],
    ['refreshOrdersButton', loadAdminOrders]
  ];

  refreshBindings.forEach(([elementId, callback]) => {
    const button = adminElement(elementId);

    if (button) {
      button.addEventListener('click', callback);
    }
  });
}


// 10. KAGUA SESSION YA ADMIN WAKATI UKURASA UNAPOFUNGUKA
async function checkExistingAdminSession() {
  try {
    const { data, error } =
      await supabaseAdmin.auth.getSession();

    if (error) throw error;

    const session = data?.session;

    if (!session) {
      showAdminLogin();
      return;
    }

    const isAuthorized = await verifyAdmin(session);

    if (!isAuthorized) {
      await supabaseAdmin.auth.signOut();
      showAdminLogin();

      showLoginMessage(
        'Akaunti hii haina ruhusa ya kuingia Admin Dashboard.',
        'error'
      );

      return;
    }

    currentAdminSession = session;

    await initializeAdminDashboard();

  } catch (error) {
    console.error(
      'ZUNE session check error:',
      error
    );

    showAdminLogin();

    showLoginMessage(
      'Imeshindwa kuthibitisha session. Tafadhali ingia tena.',
      'error'
    );
  }
}


// 11. SIKILIZA SESSION IKIBADILIKA
function bindAdminAuthStateEvents() {
  supabaseAdmin.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        currentAdminSession = null;
        currentAdminProfile = null;

        showAdminLogin();
        return;
      }

      if (
        event === 'SIGNED_IN' &&
        session &&
        !isAdminInitializing
      ) {
        setTimeout(() => {
          checkExistingAdminSession();
        }, 0);
      }
    }
  );
}


// 12. ANZISHA EVENTS ZOTE MARA MOJA
function bindAllAdminEvents() {
  bindAdminLoginEvents();
  bindAdminNavigationEvents();
  bindAdminUserFilterEvents();
  bindApplicationEvents();
  bindAdminProductEvents();
  bindAdminOrderEvents();
  bindAdminAccountForms();
  bindAdminRefreshButtons();
}


// 13. ANZISHA ZUNE ADMIN
async function startZuneAdmin() {
  if (
    typeof window.supabase === 'undefined' ||
    !supabaseAdmin
  ) {
    showAdminLogin();

    showLoginMessage(
      'Supabase haijapakiwa. Hakikisha Supabase JS CDN ipo kwenye admin.html.',
      'error'
    );

    return;
  }

  bindAllAdminEvents();
  bindAdminAuthStateEvents();

  await checkExistingAdminSession();
}


// 14. SUBIRI HTML IKAMILIKE KUPAKIA
if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    startZuneAdmin,
    { once: true }
  );
} else {
  startZuneAdmin();
}
