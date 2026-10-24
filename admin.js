// ============================================
// ZUNE ADMIN DASHBOARD
// PART 1/5: SUPABASE + UI HELPERS
// ============================================

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let supabaseClient = null;
let currentAdmin = null;
let authCheckInProgress = false;
let pageInitialized = false;

// ============================================
// SUPABASE CLIENT
// ============================================

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

// ============================================
// UI HELPERS
// ============================================

function makeElement(tag, className = '', text = '') {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function showAdminMessage(message, type = 'info') {
  const element =
    document.getElementById('adminGlobalMessage');

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
  const element =
    document.getElementById('adminGlobalMessage');

  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
}

function setLoginMessage(message, type = 'error') {
  const element =
    document.getElementById('loginMessage');

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
  const element =
    document.getElementById('loginMessage');

  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
}

function setLoginLoading(loading) {
  const button =
    document.getElementById('adminLoginButton');

  if (!button) return;

  button.disabled = loading;

  button.innerHTML = loading
    ? '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Inathibitisha...'
    : '<i class="fa-solid fa-lock mr-2"></i>Ingia kwenye Paneli';
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
    dashboardScreen.classList.toggle('flex', isLoggedIn);
  }
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

  if (!Number.isFinite(amount)) return '—';

  return 'TZS ' + new Intl.NumberFormat('sw-TZ', {
    maximumFractionDigits: 2
  }).format(amount);
}// ============================================
// PART 2/5: ADMIN LOGIN + AUTHENTICATION
// ============================================

async function verifyAdmin(session) {
    if (!session || !session.user) {
        currentAdmin = null;
        return {
            success: false,
            message: 'Tafadhali ingia kwa akaunti ya admin.'
        };
    }

    const client = getSupabaseClient();

    if (!client) {
        return {
            success: false,
            message: 'Supabase haijaunganishwa.'
        };
    }

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


// ADMIN LOGIN
async function handleAdminLogin(event) {
    if (event) {
        event.preventDefault();
    }

    const client = getSupabaseClient();

    if (!client) {
        setLoginMessage('Supabase haijaunganishwa.', true);
        return;
    }

    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const loginButton = document.getElementById('adminLoginButton');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        setLoginMessage('Weka email na password.', true);
        return;
    }

    setLoginLoading(true, loginButton);
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
                true
            );
            return;
        }

        const result = await verifyAdmin(data.session);

        if (!result.success) {
            await client.auth.signOut();
            setLoginMessage(result.message, true);
            return;
        }

        clearLoginMessage();
        showDashboard(result.admin);

    } catch (error) {
        console.error('handleAdminLogin error:', error);
        setLoginMessage('Hitilafu imetokea. Jaribu tena.', true);
    } finally {
        setLoginLoading(false, loginButton);
    }
}


// SHOW ADMIN DASHBOARD
function showDashboard(admin) {
    currentAdmin = admin;

    showScreen('adminLoginScreen', false);
    showScreen('adminDashboard', true);

    const identity = document.getElementById('adminIdentity');

    if (identity) {
        identity.textContent =
            admin.full_name || admin.email || 'Admin';
    }

    loadDashboardStats();
    loadSellerApplications();
    loadProducts();
    loadOrders();
    loadUsers();
}


// ADMIN LOGOUT
async function adminLogout() {
    const client = getSupabaseClient();

    try {
        if (client) {
            const { error } = await client.auth.signOut();

            if (error) {
                console.error('Admin logout error:', error);
                showAdminMessage(
                    'Imeshindwa kutoka. Jaribu tena.',
                    true
                );
                return;
            }
        }

        currentAdmin = null;

        showScreen('adminDashboard', false);
        showScreen('adminLoginScreen', true);

        const passwordInput =
            document.getElementById('adminPassword');

        if (passwordInput) {
            passwordInput.value = '';
        }

        clearLoginMessage();

    } catch (error) {
        console.error('adminLogout error:', error);
        showAdminMessage('Hitilafu wakati wa kutoka.', true);
    }
}


// MAKE LOGOUT AVAILABLE TO HTML
window.adminLogout = adminLogout;
window.logoutAdmin = adminLogout;// ============================================
// PART 3/5: NAVIGATION + DASHBOARD STATISTICS
// ============================================

// ADMIN TAB NAVIGATION
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

    // Ficha sections zote
    sections.forEach(function (section) {
        const sectionElement = document.getElementById(
            'section-' + section
        );

        if (sectionElement) {
            sectionElement.classList.add('hidden');
        }
    });

    // Onyesha section iliyochaguliwa
    const activeSection = document.getElementById(
        'section-' + tabName
    );

    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // Rekebisha muonekano wa navigation buttons
    document.querySelectorAll('[data-admin-tab]').forEach(
        function (button) {
            const isActive =
                button.getAttribute('data-admin-tab') === tabName;

            button.classList.toggle('active', isActive);
            button.setAttribute(
                'aria-selected',
                isActive ? 'true' : 'false'
            );
        }
    );

    // Pakia taarifa upya kulingana na sehemu iliyofunguliwa
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


// COUNT ROWS IN A TABLE
async function getTableCount(tableName) {
    const client = getSupabaseClient();

    if (!client) {
        return {
            count: null,
            error: new Error('Supabase haijaunganishwa.')
        };
    }

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


// LOAD DASHBOARD STATISTICS
async function loadDashboardStats() {
    const client = getSupabaseClient();

    if (!client || !currentAdmin) {
        return;
    }

    try {
        // Hesabu users kulingana na role zao
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

        // Jumla ya wateja
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

        // Jumla ya wauzaji
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

        // Jumla ya oda
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
        // columns za malipo na status kwenye jedwali la orders.
        setStat('statTotalSales', '—');

    } catch (error) {
        console.error('loadDashboardStats error:', error);

        setStat('statTotalCustomers', '—');
        setStat('statTotalSellers', '—');
        setStat('statTotalOrders', '—');
        setStat('statTotalSales', '—');
    }
}// ============================================
// PART 4/5: APPLICATIONS + PRODUCTS + ORDERS
// ============================================


// 1. LOAD SELLER APPLICATIONS
async function loadSellerApplications() {
    const client = getSupabaseClient();
    const container = document.getElementById(
        'applicationsContainer'
    );

    if (!client || !currentAdmin || !container) {
        return;
    }

    container.textContent = 'Inapakia maombi ya wauzaji...';

    try {
        const { data, error } = await client
            .from('seller_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Seller applications error:', error);
            container.textContent =
                'Imeshindwa kupakia maombi. Hakiki ruhusa na schema ya jedwali.';
            return;
        }

        updatePendingApplicationsCount(data || []);

        if (!data || data.length === 0) {
            container.textContent = 'Hakuna maombi yaliyopatikana.';
            return;
        }

        container.replaceChildren();

        data.forEach(function (application) {
            const card = makeElement('div', 'admin-application-card');

            const name = makeElement(
                'h3',
                'font-semibold',
                application.full_name || 'Jina halijawekwa'
            );

            const phone = makeElement(
                'p',
                'text-sm',
                'Simu: ' + (application.phone_number || application.phone || 'Haijawekwa')
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


// UPDATE PENDING APPLICATIONS COUNT
function updatePendingApplicationsCount(applications) {
    const countElement = document.getElementById(
        'pendingAppsCount'
    );

    if (!countElement) {
        return;
    }

    const pending = applications.filter(function (application) {
        return String(application.status || '').toLowerCase() === 'pending';
    }).length;

    countElement.textContent = String(pending);
}


// 2. LOAD PRODUCTS
async function loadProducts() {
    const client = getSupabaseClient();
    const container = document.getElementById(
        'adminProductsContainer'
    );

    if (!client || !currentAdmin || !container) {
        return;
    }

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
                'Imeshindwa kupakia bidhaa. Hakiki jina la jedwali na ruhusa.';
            return;
        }

        if (!data || data.length === 0) {
            container.textContent = 'Hakuna bidhaa zilizopatikana.';
            return;
        }

        container.replaceChildren();

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


// 3. LOAD ORDERS
async function loadOrders() {
    const client = getSupabaseClient();
    const container = document.getElementById(
        'adminOrdersContainer'
    );

    if (!client || !currentAdmin || !container) {
        return;
    }

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
                'Imeshindwa kupakia oda. Hakiki jina la jedwali na ruhusa.';
            return;
        }

        if (!data || data.length === 0) {
            container.textContent = 'Hakuna oda zilizopatikana.';
            return;
        }

        container.replaceChildren();

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
                'Kiasi: ' + formatTZS(
                    order.total_amount ?? order.total ?? order.amount
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
}// ============================================
// PART 5/5: USERS + PAGE INITIALIZATION
// ============================================


// 1. LOAD USERS
async function loadUsers() {
    const client = getSupabaseClient();

    // admin.html yako ya sasa haina adminUsersContainer.
    // Usivunje ukurasa ikiwa container haipo.
    const container = document.getElementById(
        'adminUsersContainer'
    );

    if (!client || !currentAdmin || !container) {
        return;
    }

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
                'Imeshindwa kupakia watumiaji. Hakiki ruhusa za database.';
            return;
        }

        if (!data || data.length === 0) {
            container.textContent = 'Hakuna watumiaji waliopatikana.';
            return;
        }

        container.replaceChildren();

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


// 2. SAFE ACCOUNT-CREATION NOTICE
function explainUserCreationRequirement(event) {
    if (event) {
        event.preventDefault();
    }

    showAdminMessage(
        'Kutengeneza akaunti kunahitaji uthibitishaji salama wa server. ' +
        'Haijawezeshwa hapa ili kulinda akaunti na ruhusa za watumiaji.',
        true
    );
}


// 3. VERIFY EXISTING SESSION
async function verifySessionAndRender() {
    const client = getSupabaseClient();

    if (!client) {
        showScreen('adminDashboard', false);
        showScreen('adminLoginScreen', true);
        setLoginMessage('Supabase haijaunganishwa.', true);
        return;
    }

    try {
        const { data, error } = await client.auth.getSession();

        if (error) {
            console.error('Get session error:', error);
            showScreen('adminDashboard', false);
            showScreen('adminLoginScreen', true);
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
        } else {
            await client.auth.signOut();
            currentAdmin = null;
            showScreen('adminDashboard', false);
            showScreen('adminLoginScreen', true);
            setLoginMessage(result.message, true);
        }

    } catch (error) {
        console.error('Session verification error:', error);
        showScreen('adminDashboard', false);
        showScreen('adminLoginScreen', true);
    }
}


// 4. INITIALIZE ADMIN PAGE
function initializeAdminPage() {
    if (pageInitialized) {
        return;
    }

    pageInitialized = true;

    const client = getSupabaseClient();

    if (!client) {
        showScreen('adminDashboard', false);
        showScreen('adminLoginScreen', true);
        setLoginMessage('Supabase haijaunganishwa.', true);
        return;
    }

    // Login form
    const loginForm = document.getElementById('adminLoginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    // Add-seller form: bado haiundi akaunti
    const addSellerForm = document.getElementById('addSellerForm');

    if (addSellerForm) {
        addSellerForm.addEventListener(
            'submit',
            explainUserCreationRequirement
        );
    }

    // Add-customer form: bado haiundi akaunti
    const addCustomerForm = document.getElementById('addCustomerForm');

    if (addCustomerForm) {
        addCustomerForm.addEventListener(
            'submit',
            explainUserCreationRequirement
        );
    }

    // Buttons with data-admin-tab attribute
    document.querySelectorAll('[data-admin-tab]').forEach(
        function (button) {
            button.addEventListener('click', function () {
                const tabName = button.getAttribute('data-admin-tab');
                window.switchAdminTab(tabName);
            });
        }
    );

    // Check whether an admin is already signed in
    verifySessionAndRender();
}


// 5. START WHEN HTML IS READY
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initializeAdminPage,
        { once: true }
    );
} else {
    initializeAdminPage();
}