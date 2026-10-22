// ============================================
// ZUNE ADMIN DASHBOARD
// Supabase Authentication + profiles.role
// ============================================

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let supabaseClient = null;
let currentAdmin = null;
let authCheckInProgress = false;

// --------------------------------------------
// Anzisha Supabase
// --------------------------------------------

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error(
      'Supabase SDK haijapakiwa. Kagua script ya Supabase kwenye admin.html.'
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

// --------------------------------------------
// Ujumbe wa mfumo
// --------------------------------------------

function showAdminMessage(message, type = 'info') {
  const element = document.getElementById('adminGlobalMessage');

  if (!element) {
    console.log('[ZUNE Admin]', message);
    return;
  }

  element.textContent = message;
  element.classList.remove('hidden');

  element.classList.remove(
    'text-red-700',
    'text-green-700',
    'text-blue-700',
    'text-amber-700'
  );

  const colors = {
    error: 'text-red-700',
    success: 'text-green-700',
    info: 'text-blue-700',
    warning: 'text-amber-700'
  };

  element.classList.add(colors[type] || colors.info);
}

function hideAdminMessage() {
  const element = document.getElementById('adminGlobalMessage');

  if (element) {
    element.textContent = '';
    element.classList.add('hidden');
  }
}

function setLoginMessage(message) {
  const element = document.getElementById('loginMessage');

  if (element) {
    element.textContent = message;
    element.classList.remove('hidden');
  } else {
    showAdminMessage(message, 'error');
  }
}

function setLoginLoading(loading) {
  const button = document.getElementById('adminLoginButton');

  if (!button) return;

  button.disabled = loading;
  button.textContent = loading ? 'Inathibitisha...' : 'Ingia';
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function showScreen(isLoggedIn) {
  const loginScreen =
    document.getElementById('adminLoginScreen');

  const dashboardScreen =
    document.getElementById('adminDashboardScreen');

  if (loginScreen) {
    loginScreen.classList.toggle('hidden', isLoggedIn);
  }

  if (dashboardScreen) {
    dashboardScreen.classList.toggle('hidden', !isLoggedIn);
  }
}

// --------------------------------------------
// Thibitisha ruhusa ya admin
// --------------------------------------------

async function verifyAdmin(session) {
  if (!session || !session.user) {
    return {
      allowed: false,
      message: 'Tafadhali ingia kwenye akaunti yako.'
    };
  }

  const client = getSupabaseClient();

  const { data: profile, error } = await client
    .from('profiles')
    .select('id, full_name, role, phone, email')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Profile verification error:', error);

    return {
      allowed: false,
      message:
        'Imeshindikana kuthibitisha role yako. Kagua profiles table na RLS.'
    };
  }

  if (!profile || profile.role !== 'admin') {
    return {
      allowed: false,
      message:
        'Akaunti hii haina ruhusa ya kuingia kwenye ZUNE Admin.'
    };
  }

  return {
    allowed: true,
    admin: {
      id: profile.id,
      full_name: profile.full_name || 'ZUNE Admin',
      email: profile.email || session.user.email || '',
      role: profile.role
    }
  };
}

// --------------------------------------------
// Login kwa Supabase Authentication
// --------------------------------------------

async function handleAdminLogin(event) {
  event.preventDefault();
  hideAdminMessage();

  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');

  if (!emailInput || !passwordInput) {
    setLoginMessage(
      'Sehemu za email na password hazijapatikana.'
    );
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setLoginMessage('Ingiza email na password.');
    return;
  }

  setLoginLoading(true);

  try {
    const client = getSupabaseClient();

    const { data, error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      console.error('Supabase login error:', error);

      setLoginMessage(
        'Imeshindikana kuingia. Kagua email, password na hali ya akaunti.'
      );
      return;
    }

    const verification = await verifyAdmin(data.session);

    if (!verification.allowed) {
      await client.auth.signOut();
      setLoginMessage(verification.message);
      return;
    }

    currentAdmin = verification.admin;
    showDashboard(currentAdmin);

  } catch (error) {
    console.error('Admin login error:', error);

    setLoginMessage(
      'Hitilafu imetokea. Kagua internet na mipangilio ya Supabase.'
    );
  } finally {
    setLoginLoading(false);
  }
}

// --------------------------------------------
// Fungua dashboard
// --------------------------------------------

function showDashboard(admin) {
  currentAdmin = admin;
  showScreen(true);

  const identity = document.getElementById('adminIdentity');

  if (identity) {
    identity.textContent =
      `${admin.full_name} (${admin.role})`;
  }

  hideAdminMessage();
  switchAdminTab('overview');
  loadDashboardStats();
}

// --------------------------------------------
// Logout
// --------------------------------------------

async function adminLogout() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      console.error('Logout error:', error);

      showAdminMessage(
        'Imeshindikana kutoka. Jaribu tena.',
        'error'
      );
      return;
    }

    currentAdmin = null;
    showScreen(false);

  } catch (error) {
    console.error('Logout error:', error);

    showAdminMessage(
      'Hitilafu wakati wa kutoka.',
      'error'
    );
  }
}

window.logoutAdmin = adminLogout;
window.adminLogout = adminLogout;

// --------------------------------------------
// Badili tab za dashboard
// --------------------------------------------

window.switchAdminTab = function(tabName) {
  if (!currentAdmin) {
    showScreen(false);
    return;
  }

  const allowedTabs = [
    'overview',
    'applications',
    'products',
    'orders',
    'users'
  ];

  if (!allowedTabs.includes(tabName)) return;

  allowedTabs.forEach(name => {
    const section =
      document.getElementById(`section-${name}`);

    if (section) {
      section.classList.toggle(
        'hidden',
        name !== tabName
      );
    }

    const button =
      document.getElementById(`tab-${name}`);

    if (button) {
      button.setAttribute(
        'aria-selected',
        name === tabName ? 'true' : 'false'
      );
    }
  });

  if (tabName === 'applications') {
    loadSellerApplications();
  }

  if (tabName === 'products') {
    loadProducts();
  }

  if (tabName === 'orders') {
    loadOrders();
  }

  if (tabName === 'users') {
    loadUsers();
  }
};// --------------------------------------------
// Dashboard statistics
// --------------------------------------------

async function getTableCount(tableName) {
  const client = getSupabaseClient();

  const { count, error } = await client
    .from(tableName)
    .select('*', {
      count: 'exact',
      head: true
    });

  if (error) {
    console.error(`Count error (${tableName}):`, error);
    return null;
  }

  return count ?? 0;
}

function setStat(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent =
      value === null || value === undefined
        ? '—'
        : String(value);
  }
}

async function loadDashboardStats() {
  if (!currentAdmin) return;

  try {
    const [
      applicationsCount,
      productsCount,
      ordersCount,
      profilesCount
    ] = await Promise.all([
      getTableCount('seller_applications'),
      getTableCount('products'),
      getTableCount('orders'),
      getTableCount('profiles')
    ]);

    setStat('statTotalOrders', ordersCount);
    setStat('statTotalSellers', applicationsCount);
    setStat('statTotalCustomers', profilesCount);

    // Mauzo hayajahesabiwa mpaka schema ya malipo ithibitishwe.
    setStat('statTotalSales', '—');

    // IDs za ziada kama zipo kwenye HTML.
    setStat('stat-sellers', applicationsCount);

    await updatePendingApplicationsCount();

  } catch (error) {
    console.error('Dashboard statistics error:', error);

    showAdminMessage(
      'Baadhi ya takwimu hazikuweza kupakiwa. Kagua ruhusa za database.',
      'warning'
    );
  }
}

// --------------------------------------------
// Orodha ya maombi ya wauzaji
// --------------------------------------------

async function loadSellerApplications() {
  if (!currentAdmin) return;

  const container = document.getElementById(
    'applicationsContainer'
  );

  if (!container) return;

  container.replaceChildren(
    makeElement(
      'p',
      'text-sm text-slate-500',
      'Inapakia maombi ya wauzaji...'
    )
  );

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.appendChild(
        makeElement(
          'p',
          'text-sm text-slate-500',
          'Hakuna maombi ya wauzaji yaliyopatikana.'
        )
      );
      return;
    }

    data.forEach(application => {
      const card = makeElement(
        'div',
        'mb-3 rounded-xl border border-slate-200 bg-white p-4'
      );

      const title = makeElement(
        'h3',
        'font-bold text-slate-800',
        application.store_name ||
          application.business_name ||
          application.owner_name ||
          'Ombi la muuzaji'
      );

      const details = makeElement(
        'p',
        'mt-1 text-sm text-slate-600',
        [
          application.owner_name,
          application.phone,
          application.city,
          application.country
        ].filter(Boolean).join(' • ') ||
          'Hakuna maelezo ya ziada'
      );

      const status = makeElement(
        'p',
        'mt-2 text-xs font-semibold',
        `Hali: ${application.status || 'Haijaainishwa'}`
      );

      card.append(title, details, status);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Seller applications error:', error);

    container.replaceChildren(
      makeElement(
        'p',
        'text-sm text-red-600',
        'Imeshindikana kupakia maombi. Kagua jedwali na ruhusa za RLS.'
      )
    );
  }
}

// --------------------------------------------
// Idadi ya maombi yanayosubiri
// --------------------------------------------

async function updatePendingApplicationsCount() {
  try {
    const client = getSupabaseClient();

    const { count, error } = await client
      .from('seller_applications')
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('status', 'pending');

    if (error) throw error;

    setStat('pendingAppsCount', count ?? 0);
    setStat('stat-pending', count ?? 0);

  } catch (error) {
    console.error(
      'Pending applications count error:',
      error
    );

    setStat('pendingAppsCount', '—');
  }
}

// --------------------------------------------
// Orodha ya bidhaa
// --------------------------------------------

async function loadProducts() {
  if (!currentAdmin) return;

  const container = document.getElementById(
    'adminProductsContainer'
  );

  if (!container) return;

  container.replaceChildren(
    makeElement(
      'p',
      'text-sm text-slate-500',
      'Inapakia bidhaa...'
    )
  );

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('products')
      .select('*')
      .limit(100);

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.appendChild(
        makeElement(
          'p',
          'text-sm text-slate-500',
          'Hakuna bidhaa zilizopatikana.'
        )
      );
      return;
    }

    data.forEach(product => {
      const card = makeElement(
        'div',
        'mb-3 rounded-xl border border-slate-200 bg-white p-4'
      );

      const name = makeElement(
        'h3',
        'font-bold text-slate-800',
        product.name ||
          product.product_name ||
          product.title ||
          'Bidhaa'
      );

      const priceValue =
        product.price ?? product.selling_price;

      const price = makeElement(
        'p',
        'mt-1 text-sm text-slate-600',
        priceValue !== undefined && priceValue !== null
          ? `Bei: ${priceValue}`
          : 'Bei haijaainishwa'
      );

      card.append(name, price);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Products error:', error);

    container.replaceChildren(
      makeElement(
        'p',
        'text-sm text-red-600',
        'Imeshindikana kupakia bidhaa. Thibitisha jedwali products na RLS.'
      )
    );
  }
}// --------------------------------------------
// Orodha ya oda
// --------------------------------------------

async function loadOrders() {
  if (!currentAdmin) return;

  const container = document.getElementById(
    'adminOrdersContainer'
  );

  if (!container) return;

  container.replaceChildren(
    makeElement(
      'p',
      'text-sm text-slate-500',
      'Inapakia oda...'
    )
  );

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.appendChild(
        makeElement(
          'p',
          'text-sm text-slate-500',
          'Hakuna oda zilizopatikana.'
        )
      );
      return;
    }

    data.forEach(order => {
      const card = makeElement(
        'div',
        'mb-3 rounded-xl border border-slate-200 bg-white p-4'
      );

      const heading = makeElement(
        'h3',
        'font-bold text-slate-800',
        `Oda: ${order.id || order.order_number || 'Haijulikani'}`
      );

      const status = makeElement(
        'p',
        'mt-1 text-sm text-slate-600',
        `Hali: ${order.status || order.payment_status || 'Haijaainishwa'}`
      );

      const amount =
        order.total_amount ?? order.total ?? order.amount;

      const price = makeElement(
        'p',
        'mt-1 text-sm text-slate-600',
        amount !== undefined && amount !== null
          ? `Jumla: ${amount}`
          : 'Jumla haijaainishwa'
      );

      card.append(heading, status, price);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Orders error:', error);

    container.replaceChildren(
      makeElement(
        'p',
        'text-sm text-red-600',
        'Imeshindikana kupakia oda. Kagua jedwali orders na RLS.'
      )
    );
  }
}

// --------------------------------------------
// Orodha ya watumiaji
// --------------------------------------------

async function loadUsers() {
  if (!currentAdmin) return;

  const container = document.getElementById(
    'adminUsersContainer'
  );

  if (!container) return;

  container.replaceChildren(
    makeElement(
      'p',
      'text-sm text-slate-500',
      'Inapakia watumiaji...'
    )
  );

  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role, phone, email')
      .order('full_name', { ascending: true })
      .limit(100);

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.appendChild(
        makeElement(
          'p',
          'text-sm text-slate-500',
          'Hakuna wasifu uliopatikana.'
        )
      );
      return;
    }

    data.forEach(profile => {
      const card = makeElement(
        'div',
        'mb-3 rounded-xl border border-slate-200 bg-white p-4'
      );

      const name = makeElement(
        'h3',
        'font-bold text-slate-800',
        profile.full_name || 'Mtumiaji'
      );

      const contact = makeElement(
        'p',
        'mt-1 text-sm text-slate-600',
        [profile.email, profile.phone]
          .filter(Boolean)
          .join(' • ') || 'Hakuna mawasiliano'
      );

      const role = makeElement(
        'p',
        'mt-1 text-xs font-semibold text-slate-500',
        `Role: ${profile.role || 'user'}`
      );

      card.append(name, contact, role);
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Users error:', error);

    container.replaceChildren(
      makeElement(
        'p',
        'text-sm text-red-600',
        'Imeshindikana kupakia watumiaji. Kagua jedwali profiles na RLS.'
      )
    );
  }
}

// --------------------------------------------
// Fomu za kuongeza seller/customer
// --------------------------------------------

function explainUserCreationRequirement(event) {
  event.preventDefault();

  showAdminMessage(
    'Kuongeza akaunti kunahitaji backend salama au Supabase Edge Function inayothibitisha ruhusa za admin. Hakuna data iliyobadilishwa.',
    'warning'
  );
}

// --------------------------------------------
// Anzisha ukurasa wa admin
// --------------------------------------------

async function initializeAdminPage() {
  const loginForm = document.getElementById(
    'adminLoginForm'
  );

  if (loginForm) {
    loginForm.addEventListener(
      'submit',
      handleAdminLogin
    );
  }

  const logoutButton = document.getElementById(
    'adminLogoutButton'
  );

  if (logoutButton) {
    logoutButton.addEventListener(
      'click',
      adminLogout
    );
  }

  const addSellerForm = document.getElementById(
    'adminAddSellerForm'
  );

  if (addSellerForm) {
    addSellerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  const addCustomerForm = document.getElementById(
    'adminAddCustomerForm'
  );

  if (addCustomerForm) {
    addCustomerForm.addEventListener(
      'submit',
      explainUserCreationRequirement
    );
  }

  showScreen(false);

  if (authCheckInProgress) return;

  authCheckInProgress = true;

  try {
    const client = getSupabaseClient();

    const { data, error } =
      await client.auth.getSession();

    if (error) throw error;

    const session = data.session;

    if (!session) {
      currentAdmin = null;
      showScreen(false);
      return;
    }

    const verification = await verifyAdmin(session);

    if (!verification.allowed) {
      await client.auth.signOut();

      currentAdmin = null;
      showScreen(false);
      setLoginMessage(verification.message);
      return;
    }

    showDashboard(verification.admin);

  } catch (error) {
    console.error(
      'Admin initialization error:',
      error
    );

    currentAdmin = null;
    showScreen(false);

    setLoginMessage(
      'Imeshindikana kuunganisha na Supabase. Kagua internet, URL na publishable key.'
    );

  } finally {
    authCheckInProgress = false;
  }
}

// --------------------------------------------
// Anzisha mara ukurasa unapopakiwa
// --------------------------------------------

window.addEventListener(
  'load',
  initializeAdminPage
);