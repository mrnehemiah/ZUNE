function explainUserCreationRequirement(event) {
  if (event) event.preventDefault();

  showAdminMessage(
    'Kuunda akaunti kupitia admin bado hakujawashwa. Inahitaji Supabase Edge Function au server salama yenye uthibitishaji wa admin. Hakuna akaunti iliyoundwa.',
    'warning'
  );
}

window.explainUserCreationRequirement =
  explainUserCreationRequirement;

/* ---------- BIND LOGIN AND FORMS ---------- */

function bindAdminForms() {
  const loginForm = byId('adminLoginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }

  const addSellerForm = byId('addSellerForm');

  if (addSellerForm) {
    addSellerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  const addCustomerForm = byId('addCustomerForm');

  if (addCustomerForm) {
    addCustomerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  bindUserControls();
}

/* ---------- VERIFY EXISTING SESSION ---------- */

async function verifySessionAndRender() {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const session = data?.session;

    if (!session) {
      currentAdmin = null;
      showScreen('login');
      return;
    }

    const result = await verifyAdmin(session);

    if (!result.allowed) {
      await client.auth.signOut();

      currentAdmin = null;
      showScreen('login');

      setLoginMessage(
        result.error ||
          'Akaunti hii haina ruhusa ya kufungua dashboard.'
      );

      return;
    }

    currentAdmin = result.admin;
    showDashboard(currentAdmin);
  } catch (error) {
    console.error('Session verification error:', error);

    currentAdmin = null;
    showScreen('login');

    setLoginMessage(
      'Imeshindikana kuthibitisha session. Kagua muunganisho wa Supabase na ujaribu tena.'
    );
  }
}

/* ---------- START ADMIN PAGE ---------- */

function initializeAdminPage() {
  bindAdminForms();
  showScreen('login');
  verifySessionAndRender();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeAdminPage,
    { once: true }
  );
} else {
  initializeAdminPage();
}  const labels = {
    buyer: 'Mnunuzi',
    vendor: 'Muuzaji',
    admin: 'Admin'
  };

  return labels[String(role || '').toLowerCase()] || 'Haijulikani';
}

function userRoleClass(role) {
  const value = String(role || '').toLowerCase();

  if (value === 'admin') return 'status-pending';
  if (value === 'vendor') return 'status-approved';
  if (value === 'buyer') return 'status-neutral';

  return 'status-neutral';
}

function getUserInitials(name) {
  const cleaned = String(name || '').trim();

  if (!cleaned) return 'U';

  const parts = cleaned.split(/\s+/).filter(Boolean);

  return parts.slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/* ---------- USER STATISTICS ---------- */

function updateUserStatistics() {
  const users = adminUsersCache;

  const buyers = users.filter(
    (user) => String(user.role || '').toLowerCase() === 'buyer'
  ).length;

  const vendors = users.filter(
    (user) => String(user.role || '').toLowerCase() === 'vendor'
  ).length;

  const verified = users.filter(
    (user) => user.is_verified === true
  ).length;

  setText('usersStatAll', users.length);
  setText('usersStatBuyers', buyers);
  setText('usersStatVendors', vendors);
  setText('usersStatVerified', verified);
}

/* ---------- USER CARD ---------- */

function createUserCard(user) {
  const card = makeElement('article', 'admin-user-card');

  const name = user.full_name || 'Jina halijawekwa';
  const phone = user.phone_number || 'Namba haijawekwa';
  const role = String(user.role || '').toLowerCase();
  const verified = user.is_verified === true;

  const top = makeElement(
    'div',
    'flex items-start gap-3'
  );

  const avatar = makeElement(
    'div',
    'user-avatar',
    getUserInitials(name)
  );

  const identity = makeElement('div', 'flex-1 min-w-0');

  identity.append(
    makeElement('h3', 'font-extrabold break-words', name),
    makeElement('p', 'text-sm muted mt-1 break-words', phone)
  );

  const badges = makeElement(
    'div',
    'flex flex-wrap gap-2 mt-3'
  );

  badges.append(
    makeElement(
      'span',
      `status-pill ${userRoleClass(role)}`,
      userRoleLabel(role)
    ),
    makeElement(
      'span',
      `status-pill ${verified ? 'status-verified' : 'status-unverified'}`,
      verified ? 'Amethibitishwa' : 'Hajathibitishwa'
    )
  );

  identity.appendChild(badges);
  top.append(avatar, identity);

  const detailButton = makeElement(
    'button',
    'admin-btn admin-btn-light w-full mt-4'
  );

  detailButton.type = 'button';
  detailButton.setAttribute('aria-expanded', 'false');

  detailButton.append(
    makeElement('i', 'fa-solid fa-chevron-down'),
    makeElement('span', '', 'Onyesha maelezo')
  );

  const details = makeElement(
    'div',
    'hidden mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm'
  );

  const detailRows = [
    ['ID ya akaunti', user.id || 'Haipo'],
    ['Jina kamili', name],
    ['Namba ya simu', phone],
    ['Role', role || 'Haijawekwa'],
    ['Uthibitishaji', verified ? 'Amethibitishwa' : 'Hajathibitishwa'],
    ['Akaunti imeundwa', formatDate(user.created_at)]
  ];

  detailRows.forEach(([label, value]) => {
    const row = makeElement(
      'div',
      'flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-3'
    );

    row.append(
      makeElement('span', 'muted', label),
      makeElement('span', 'font-semibold break-all sm:text-right', value)
    );

    details.appendChild(row);
  });

  detailButton.addEventListener('click', () => {
    const isHidden = details.classList.contains('hidden');

    details.classList.toggle('hidden', !isHidden);
    detailButton.setAttribute('aria-expanded', String(isHidden));

    const icon = detailButton.querySelector('i');
    const label = detailButton.querySelector('span');

    if (icon) {
      icon.className = isHidden
        ? 'fa-solid fa-chevron-up'
        : 'fa-solid fa-chevron-down';
    }

    if (label) {
      label.textContent = isHidden
        ? 'Ficha maelezo'
        : 'Onyesha maelezo';
    }
  });

  card.append(top, detailButton, details);

  return card;
}

/* ---------- SEARCH AND FILTERS ---------- */

function getFilteredAdminUsers() {
  const searchValue = (
    byId('adminUserSearch')?.value || ''
  ).trim().toLowerCase();

  const roleFilter =
    byId('adminUserRoleFilter')?.value || 'all';

  const verificationFilter =
    byId('adminUserVerificationFilter')?.value || 'all';

  return adminUsersCache.filter((user) => {
    const name = String(user.full_name || '').toLowerCase();
    const phone = String(user.phone_number || '').toLowerCase();
    const id = String(user.id || '').toLowerCase();
    const role = String(user.role || '').toLowerCase();

    const matchesSearch =
      !searchValue ||
      name.includes(searchValue) ||
      phone.includes(searchValue) ||
      id.includes(searchValue);

    const matchesRole =
      roleFilter === 'all' || role === roleFilter;

    const matchesVerification =
      verificationFilter === 'all' ||
      (verificationFilter === 'verified' && user.is_verified === true) ||
      (verificationFilter === 'unverified' && user.is_verified !== true);

    return matchesSearch && matchesRole && matchesVerification;
  });
}

/* ---------- RENDER USERS ---------- */

function renderAdminUsers() {
  const container = byId('adminUsersContainer');
  if (!container) return;

  updateUserStatistics();

  filteredAdminUsers = getFilteredAdminUsers();

  const totalUsers = filteredAdminUsers.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalUsers / USERS_PER_PAGE)
  );

  if (currentUsersPage > totalPages) {
    currentUsersPage = totalPages;
  }

  if (currentUsersPage < 1) {
    currentUsersPage = 1;
  }

  const startIndex = (currentUsersPage - 1) * USERS_PER_PAGE;
  const pageUsers = filteredAdminUsers.slice(
    startIndex,
    startIndex + USERS_PER_PAGE
  );

  setText(
    'adminUsersResultCount',
    `Matokeo ${totalUsers === 0 ? 0 : startIndex + 1}–${Math.min(
      startIndex + USERS_PER_PAGE,
      totalUsers
    )} kati ya watumiaji ${totalUsers}`
  );

  setText('usersPageInfo', `Ukurasa ${currentUsersPage} kati ya ${totalPages}`);

  const prevButton = byId('usersPrevPage');
  const nextButton = byId('usersNextPage');

  if (prevButton) prevButton.disabled = currentUsersPage <= 1;
  if (nextButton) nextButton.disabled = currentUsersPage >= totalPages;

  if (!adminUsersCache.length) {
    showEmptyState(
      container,
      'Hakuna taarifa za watumiaji zilizopakiwa. Jaribu kusasisha orodha.',
      'fa-users'
    );
    return;
  }

  if (!pageUsers.length) {
    showEmptyState(
      container,
      'Hakuna watumiaji wanaolingana na utafutaji au vichujio.',
      'fa-magnifying-glass'
    );
    return;
  }

  clearElement(container);

  pageUsers.forEach((user) => {
    container.appendChild(createUserCard(user));
  });
}

/* ---------- LOAD USERS FROM SUPABASE ---------- */

async function loadUsers() {
  if (!currentAdmin) return;

  const container = byId('adminUsersContainer');

  showLoadingState(
    container,
    'Inapakia watumiaji kutoka Supabase...'
  );

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, phone_number, role, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    adminUsersCache = data || [];
    currentUsersPage = 1;

    renderAdminUsers();
  } catch (error) {
    console.error('Users load error:', error);

    adminUsersCache = [];
    filteredAdminUsers = [];

    showEmptyState(
      container,
      'Watumiaji hawakupakiwa. Kagua RLS ya profiles na ruhusa ya SELECT ya admin.',
      'fa-triangle-exclamation'
    );

    showAdminMessage(
      `Tatizo la kupakia watumiaji: ${error.message || 'Hitilafu isiyojulikana.'}`,
      'error'
    );
  }
}

window.loadUsers = loadUsers;

/* ============================================
   PART 5/5: EVENTS, SAFE FORMS & INITIALIZATION
   ============================================ */

/* ---------- USER FILTER EVENTS ---------- */

function resetUserFilters() {
  const search = byId('adminUserSearch');
  const role = byId('adminUserRoleFilter');
  const verification = byId('adminUserVerificationFilter');

  if (search) search.value = '';
  if (role) role.value = 'all';
  if (verification) verification.value = 'all';

  currentUsersPage = 1;
  renderAdminUsers();
}

function bindUserControls() {
  const search = byId('adminUserSearch');
  const role = byId('adminUserRoleFilter');
  const verification = byId('adminUserVerificationFilter');
  const clearButton = byId('clearUserFiltersButton');
  const previousButton = byId('usersPrevPage');
  const nextButton = byId('usersNextPage');
  const refreshButton = byId('refreshUsersButton');

  if (search) {
    search.addEventListener('input', () => {
      currentUsersPage = 1;
      renderAdminUsers();
    });
  }

  if (role) {
    role.addEventListener('change', () => {
      currentUsersPage = 1;
      renderAdminUsers();
    });
  }

  if (verification) {
    verification.addEventListener('change', () => {
      currentUsersPage = 1;
      renderAdminUsers();
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', resetUserFilters);
  }

  if (previousButton) {
    previousButton.addEventListener('click', () => {
      if (currentUsersPage > 1) {
        currentUsersPage -= 1;
        renderAdminUsers();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredAdminUsers.length / USERS_PER_PAGE)
      );

      if (currentUsersPage < totalPages) {
        currentUsersPage += 1;
        renderAdminUsers();
      }
    });
  }

  /*
    HTML yako tayari ina onclick="loadUsers()".
    Hatuongezi click listener nyingine ili kuepuka
    kupakia orodha mara mbili kwa kubonyeza kitufe.
  */
  void refreshButton;
}

/* ---------- SAFE ACCOUNT CREATION PLACEHOLDER ---------- */
/* ---------- SELLER APPLICATIONS ---------- */

function applicationStatusLabel(status) {
  const labels = {
    pending: 'Inasubiri',
    approved: 'Imeidhinishwa',
    rejected: 'Imekataliwa'
  };

  return labels[String(status || '').toLowerCase()] ||
    (status || 'Haijulikani');
}

function applicationStatusClass(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'approved') return 'status-approved';
  if (value === 'rejected') return 'status-rejected';
  if (value === 'pending') return 'status-pending';

  return 'status-neutral';
}

function createApplicationCard(application) {
  const card = makeElement(
    'article',
    'admin-application-card'
  );

  const top = makeElement(
    'div',
    'flex items-start justify-between gap-3'
  );

  const details = makeElement('div', 'min-w-0');

  const storeName =
    application.store_name ||
    application.business_name ||
    'Duka halina jina';

  const ownerName =
    application.owner_name ||
    application.full_name ||
    'Jina halijawekwa';

  details.append(
    makeElement('h3', 'font-extrabold break-words', storeName),
    makeElement('p', 'text-sm muted mt-1', `Mmiliki: ${ownerName}`)
  );

  const status = makeElement(
    'span',
    `status-pill ${applicationStatusClass(application.status)}`,
    applicationStatusLabel(application.status)
  );

  top.append(details, status);

  const info = makeElement('div', 'mt-4 space-y-2 text-sm');

  const fields = [
    ['Simu', application.phone || 'Haijawekwa'],
    ['Barua pepe', application.email || 'Haijawekwa'],
    ['Nchi', application.country || 'Haijawekwa'],
    ['Mkoa/County', application.region || 'Haijawekwa'],
    ['Wilaya', application.district || 'Haijawekwa'],
    ['Aina ya biashara', application.category || 'Haijawekwa'],
    ['Tarehe', formatDate(application.created_at)]
  ];

  fields.forEach(([label, value]) => {
    const row = makeElement(
      'div',
      'flex justify-between gap-4'
    );

    row.append(
      makeElement('span', 'muted', label),
      makeElement('span', 'font-semibold text-right break-words', value)
    );

    info.appendChild(row);
  });

  card.append(top, info);

  return card;
}

async function loadSellerApplications() {
  if (!currentAdmin) return;

  const container = byId('applicationsContainer');
  if (!container) return;

  showLoadingState(container, 'Inapakia maombi ya wauzaji...');

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const applications = data || [];

    const pendingCount = applications.filter((application) =>
      String(application.status || '').toLowerCase() === 'pending'
    ).length;

    setText('pendingAppsCount', pendingCount);

    clearElement(container);

    if (!applications.length) {
      showEmptyState(
        container,
        'Hakuna maombi ya wauzaji yaliyopatikana.',
        'fa-store'
      );
      return;
    }

    applications.forEach((application) => {
      container.appendChild(createApplicationCard(application));
    });
  } catch (error) {
    console.error('Seller applications error:', error);

    showEmptyState(
      container,
      'Maombi hayakupakiwa. Kagua ruhusa za SELECT (RLS) na majina ya safu kwenye Supabase.',
      'fa-triangle-exclamation'
    );

    showAdminMessage(
      `Tatizo la kupakia maombi: ${error.message || 'Hitilafu isiyojulikana.'}`,
      'error'
    );
  }
}

window.loadSellerApplications = loadSellerApplications;

/* ============================================
   PART 3/5: PRODUCTS & ORDERS
   ============================================ */

/* ---------- PRODUCTS ---------- */

function createProductCard(product) {
  const card = makeElement('article', 'admin-product-card');

  const title = product.title || product.name || 'Bidhaa bila jina';

  const heading = makeElement(
    'div',
    'flex items-start justify-between gap-3'
  );

  heading.append(
    makeElement('h3', 'font-extrabold break-words', title),
    makeElement(
      'span',
      'status-pill status-neutral',
      `ID: ${String(product.id || '—').slice(0, 8)}`
    )
  );

  const description = makeElement(
    'p',
    'text-sm muted mt-3 break-words',
    product.description || 'Hakuna maelezo ya bidhaa.'
  );

  const details = makeElement('div', 'mt-4 space-y-2 text-sm');

  const rows = [
    ['Bei', formatTZS(product.price)],
    ['Idadi ya bidhaa', product.stock_quantity ?? 'Haijawekwa'],
    ['Tarehe ya kuwekwa', formatDate(product.created_at)],
    ['Muuzaji ID', product.vendor_id || 'Haijawekwa']
  ];

  rows.forEach(([label, value]) => {
    const row = makeElement(
      'div',
      'flex items-start justify-between gap-3'
    );

    row.append(
      makeElement('span', 'muted', label),
      makeElement('span', 'font-semibold text-right break-words', value)
    );

    details.appendChild(row);
  });

  card.append(heading, description, details);

  return card;
}

async function loadProducts() {
  if (!currentAdmin) return;

  const container = byId('adminProductsContainer');
  if (!container) return;

  showLoadingState(container, 'Inapakia bidhaa...');

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('products')
      .select('id, vendor_id, title, description, price, stock_quantity, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const products = data || [];

    clearElement(container);

    if (!products.length) {
      showEmptyState(
        container,
        'Hakuna bidhaa zilizopatikana.',
        'fa-box-open'
      );
      return;
    }

    products.forEach((product) => {
      container.appendChild(createProductCard(product));
    });
  } catch (error) {
    console.error('Products error:', error);

    showEmptyState(
      container,
      'Bidhaa hazikupakiwa. Kagua ruhusa za SELECT na schema ya products.',
      'fa-triangle-exclamation'
    );

    showAdminMessage(
      `Tatizo la kupakia bidhaa: ${error.message || 'Hitilafu isiyojulikana.'}`,
      'error'
    );
  }
}

window.loadProducts = loadProducts;

/* ---------- ORDERS ---------- */

function orderStatusLabel(status) {
  const labels = {
    pending: 'Inasubiri',
    confirmed: 'Imethibitishwa',
    completed: 'Imekamilika',
    cancelled: 'Imeghairiwa'
  };

  return labels[String(status || '').toLowerCase()] ||
    (status || 'Haijulikani');
}

function orderStatusClass(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'completed') return 'status-completed';
  if (value === 'pending') return 'status-pending';
  if (value === 'cancelled') return 'status-cancelled';
  if (value === 'confirmed') return 'status-approved';

  return 'status-neutral';
}

function createOrderCard(order) {
  const card = makeElement('article', 'admin-order-card');

  const top = makeElement(
    'div',
    'flex items-start justify-between gap-3'
  );

  const id = String(order.id || '—');

  const orderTitle = makeElement(
    'h3',
    'font-extrabold break-all',
    `Oda #${id.slice(0, 12)}`
  );

  const status = makeElement(
    'span',
    `status-pill ${orderStatusClass(order.status)}`,
    orderStatusLabel(order.status)
  );

  top.append(orderTitle, status);

  const amount = makeElement(
    'div',
    'text-xl font-extrabold mt-4',
    formatTZS(order.total_price)
  );

  const details = makeElement('div', 'mt-4 space-y-2 text-sm');

  const rows = [
    ['Mteja ID', order.buyer_id || 'Haijawekwa'],
    ['Bidhaa ID', order.product_id || 'Haijawekwa'],
    ['Idadi', order.quantity ?? 'Haijawekwa'],
    ['Kamisheni', formatTZS(order.commission_fee)],
    ['Tarehe', formatDate(order.created_at)]
  ];

  rows.forEach(([label, value]) => {
    const row = makeElement(
      'div',
      'flex items-start justify-between gap-3'
    );

    row.append(
      makeElement('span', 'muted', label),
      makeElement('span', 'font-semibold text-right break-words', value)
    );

    details.appendChild(row);
  });

  card.append(top, amount, details);

  return card;
}

async function loadOrders() {
  if (!currentAdmin) return;

  const container = byId('adminOrdersContainer');
  if (!container) return;

  showLoadingState(container, 'Inapakia oda...');

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('orders')
      .select('id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const orders = data || [];

    clearElement(container);

    if (!orders.length) {
      showEmptyState(
        container,
        'Hakuna oda zilizopatikana.',
        'fa-receipt'
      );
      return;
    }

    orders.forEach((order) => {
      container.appendChild(createOrderCard(order));
    });
  } catch (error) {
    console.error('Orders error:', error);

    showEmptyState(
      container,
      'Oda hazikupakiwa. Kagua ruhusa za SELECT na schema ya orders.',
      'fa-triangle-exclamation'
    );

    showAdminMessage(
      `Tatizo la kupakia oda: ${error.message || 'Hitilafu isiyojulikana.'}`,
      'error'
    );
  }
}

window.loadOrders = loadOrders;

/* ============================================
   PART 4/5: USERS, SEARCH, FILTERS & PAGINATION
   ============================================ */

/* ---------- USER LABELS ---------- */

function userRoleLabel(role) {
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
