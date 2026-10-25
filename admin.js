
// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 1/10
// SUPABASE CONFIGURATION + SHARED HELPERS
// =====================================================

"use strict";

// -----------------------------------------------------
// 1. SUPABASE CONNECTION
// -----------------------------------------------------

const ZUNE_SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const ZUNE_SUPABASE_ANON_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

if (!window.supabase || !window.supabase.createClient) {
  console.error(
    "[ZUNE ADMIN] Supabase SDK haijapakiwa. Kagua admin.html."
  );
}

const zuneSupabase =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(
        ZUNE_SUPABASE_URL,
        ZUNE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      )
    : null;

// -----------------------------------------------------
// 2. SHARED ADMIN STATE
// -----------------------------------------------------

const ZUNE_ADMIN = {
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  initialized: false,
  currentPage: "overview",
  searchTerm: "",
  toastTimer: null,
  confirmCallback: null,

  cache: {
    profiles: [],
    products: [],
    orders: [],
    sellerApplications: [],
    verificationRequests: [],
    announcements: [],
    supportTickets: [],
    fraudReports: [],
    auditLogs: [],
    coupons: [],
    wallets: []
  },

  settings: {},
  maintenance: {}
};

// Majedwali yaliyothibitishwa katika schema ya sasa.
const ZUNE_TABLES = {
  profiles: "profiles",
  products: "products",
  orders: "orders",
  sellerApplications: "seller_applications"
};

// -----------------------------------------------------
// 3. DOM HELPERS
// -----------------------------------------------------

function zuneEl(id) {
  return document.getElementById(id);
}

function zuneValue(id, fallback = "") {
  const element = zuneEl(id);

  return element
    ? element.value ?? fallback
    : fallback;
}

function zuneChecked(id) {
  const element = zuneEl(id);

  return Boolean(element && element.checked);
}

function zuneSetText(id, value) {
  const element = zuneEl(id);

  if (element) {
    element.textContent =
      value === null || value === undefined
        ? ""
        : String(value);
  }
}

function zuneSetValue(id, value) {
  const element = zuneEl(id);

  if (element) {
    element.value =
      value === null || value === undefined
        ? ""
        : String(value);
  }
}

function zuneSetHidden(id, hidden = true) {
  const element = zuneEl(id);

  if (element) {
    element.hidden = Boolean(hidden);
  }
}

// -----------------------------------------------------
// 4. SECURITY AND FORMATTING HELPERS
// -----------------------------------------------------

function zuneEscapeHTML(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    character => replacements[character]
  );
}

function zuneNormalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function zuneNormalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function zuneFormatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("sw-TZ", {
    maximumFractionDigits: decimals
  }).format(number);
}

function zuneFormatMoney(value, currency = "TZS") {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${currency} 0`;
  }

  try {
    return new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(number);
  } catch (error) {
    return `${currency} ${zuneFormatNumber(number)}`;
  }
}

function zuneFormatDate(value) {
  if (!value) return "Haijawekwa";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tarehe haijulikani";
  }

  return new Intl.DateTimeFormat("sw-TZ", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function zuneLogError(context, error) {
  console.error(`[ZUNE ADMIN] ${context}`, error);
}

// -----------------------------------------------------
// 5. TOAST MESSAGES
// -----------------------------------------------------

function zuneToast(message, type = "info") {
  const toast = zuneEl("adminToast");
  const messageElement = zuneEl("adminToastMessage");

  if (!toast || !messageElement) {
    console.log(`[ZUNE ${type.toUpperCase()}] ${message}`);
    return;
  }

  if (ZUNE_ADMIN.toastTimer) {
    clearTimeout(ZUNE_ADMIN.toastTimer);
  }

  messageElement.textContent = String(message || "");

  toast.classList.remove(
    "toast-success",
    "toast-error",
    "toast-warning",
    "toast-info"
  );

  toast.classList.add(`toast-${type}`);
  toast.hidden = false;

  ZUNE_ADMIN.toastTimer = setTimeout(() => {
    toast.hidden = true;
    ZUNE_ADMIN.toastTimer = null;
  }, 4500);
}

// -----------------------------------------------------
// 6. SUPABASE GUARD
// -----------------------------------------------------

function zuneRequireSupabase() {
  if (!zuneSupabase) {
    zuneToast(
      "Supabase haijaunganishwa. Kagua SDK kwenye admin.html.",
      "error"
    );

    return false;
  }

  return true;
}

// -----------------------------------------------------
// 7. SAFE SELECT HELPER
// -----------------------------------------------------

async function zuneSelectRows(
  table,
  columns = "*",
  configureQuery = null
) {
  if (!zuneRequireSupabase()) {
    return {
      data: null,
      error: new Error("Supabase haipatikani.")
    };
  }

  try {
    let query = zuneSupabase
      .from(table)
      .select(columns);

    if (typeof configureQuery === "function") {
      query = configureQuery(query);
    }

    const result = await query;

    if (result.error) {
      zuneLogError(`Kusoma jedwali ${table}`, result.error);
    }

    return result;
  } catch (error) {
    zuneLogError(`Kusoma jedwali ${table}`, error);

    return {
      data: null,
      error
    };
  }
}

// -----------------------------------------------------
// 8. STATUS LABELS
// -----------------------------------------------------

function zuneStatusLabel(status) {
  const labels = {
    pending: "Inasubiri",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    active: "Hai",
    inactive: "Haifanyi kazi",
    confirmed: "Imethibitishwa",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    suspended: "Imesimamishwa",
    paid: "Imelipwa",
    failed: "Imeshindwa",
    open: "Wazi",
    resolved: "Imetatuliwa"
  };

  const normalized = zuneNormalizeStatus(status);

  return labels[normalized] || status || "Haijulikani";
}

// -----------------------------------------------------
// MWISHO WA SEHEMU YA 1/10
// SEHEMU YA 2 ITAENDELEA CHINI YA HII CODE.
// USIONDOE CODE HII UNAPOONGEZA SEHEMU INAYOFUATA.
// =====================================================

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 2/10
// AUTHENTICATION + ADMIN ACCESS CONTROL
// =====================================================

// -----------------------------------------------------
// 1. ADMIN LOGIN ELEMENTS
// -----------------------------------------------------

function zuneShowAdminLogin() {
  const loginPanel = zuneEl("adminLoginPanel");
  const mainArea = zuneEl("adminMainArea");
  const sidebar = zuneEl("adminSidebar");

  if (loginPanel) loginPanel.hidden = false;
  if (mainArea) mainArea.hidden = true;
  if (sidebar) sidebar.hidden = true;
}

function zuneShowAdminDashboard() {
  const loginPanel = zuneEl("adminLoginPanel");
  const mainArea = zuneEl("adminMainArea");
  const sidebar = zuneEl("adminSidebar");

  if (loginPanel) loginPanel.hidden = true;
  if (mainArea) mainArea.hidden = false;
  if (sidebar) sidebar.hidden = false;
}

// -----------------------------------------------------
// 2. SHOW LOGIN ERROR
// -----------------------------------------------------

function zuneShowLoginMessage(message, type = "error") {
  const element =
    zuneEl("loginMessage") ||
    zuneEl("adminLoginMessage");

  if (!element) {
    zuneToast(message, type);
    return;
  }

  element.textContent = String(message || "");

  element.classList.remove(
    "success",
    "error",
    "warning",
    "text-red-600",
    "text-green-600"
  );

  element.classList.add(type);
  element.hidden = false;
}

// -----------------------------------------------------
// 3. VERIFY CURRENT AUTHENTICATED USER
// -----------------------------------------------------

async function zuneGetCurrentSession() {
  if (!zuneRequireSupabase()) {
    return {
      session: null,
      error: new Error("Supabase haipatikani.")
    };
  }

  try {
    const { data, error } =
      await zuneSupabase.auth.getSession();

    if (error) {
      zuneLogError("Kupata session", error);

      return {
        session: null,
        error
      };
    }

    ZUNE_ADMIN.session = data.session || null;
    ZUNE_ADMIN.user = data.session?.user || null;

    return {
      session: ZUNE_ADMIN.session,
      error: null
    };
  } catch (error) {
    zuneLogError("Kupata session", error);

    return {
      session: null,
      error
    };
  }
}

// -----------------------------------------------------
// 4. LOAD PROFILE FROM SUPABASE
// -----------------------------------------------------

async function zuneLoadAdminProfile(userId) {
  if (!userId) {
    return {
      profile: null,
      error: new Error("ID ya mtumiaji haipo.")
    };
  }

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, role, phone_number, created_at, is_verified")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    zuneLogError("Kusoma profile", error);

    return {
      profile: null,
      error
    };
  }

  ZUNE_ADMIN.profile = data || null;

  return {
    profile: ZUNE_ADMIN.profile,
    error: null
  };
}

// -----------------------------------------------------
// 5. ADMIN ROLE CHECK
// -----------------------------------------------------

async function zuneVerifyAdmin(session = null) {
  const activeSession =
    session || ZUNE_ADMIN.session;

  if (!activeSession?.user?.id) {
    ZUNE_ADMIN.isAdmin = false;
    ZUNE_ADMIN.profile = null;

    return false;
  }

  const { profile, error } =
    await zuneLoadAdminProfile(
      activeSession.user.id
    );

  if (error || !profile) {
    ZUNE_ADMIN.isAdmin = false;

    zuneLogError(
      "Admin verification imeshindwa",
      error || "Profile haijapatikana."
    );

    return false;
  }

  const role = zuneNormalizeRole(profile.role);

  ZUNE_ADMIN.isAdmin = role === "admin";

  if (!ZUNE_ADMIN.isAdmin) {
    console.warn(
      "[ZUNE ADMIN] Akaunti hii haina role ya admin."
    );
  }

  return ZUNE_ADMIN.isAdmin;
}

// -----------------------------------------------------
// 6. UPDATE ADMIN IDENTITY IN SIDEBAR
// -----------------------------------------------------

function zuneUpdateAdminIdentity() {
  const user = ZUNE_ADMIN.user;
  const profile = ZUNE_ADMIN.profile;

  if (!user) return;

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Admin";

  const displayEmail = user.email || "Email haipo";

  zuneSetText("adminDisplayName", displayName);
  zuneSetText("adminDisplayEmail", displayEmail);

  const avatar = zuneEl("adminAvatar");

  if (avatar) {
    const initial = String(displayName)
      .trim()
      .charAt(0)
      .toUpperCase();

    avatar.textContent = initial || "A";
  }
}

// -----------------------------------------------------
// 7. REDIRECT / ACCESS DENIED HANDLING
// -----------------------------------------------------

function zuneHandleNoAdminAccess(message) {
  ZUNE_ADMIN.isAdmin = false;

  zuneShowAdminLogin();

  zuneShowLoginMessage(
    message ||
      "Huna ruhusa ya kufungua dashboard ya admin. Ingia kwa akaunti yenye role ya admin.",
    "error"
  );
}

// -----------------------------------------------------
// 8. INITIAL ADMIN AUTH CHECK
// -----------------------------------------------------

async function zuneCheckAdminAccess() {
  if (!zuneRequireSupabase()) {
    zuneShowAdminLogin();

    zuneShowLoginMessage(
      "Muunganisho wa Supabase haujapatikana.",
      "error"
    );

    return false;
  }

  const { session, error } =
    await zuneGetCurrentSession();

  if (error || !session?.user) {
    ZUNE_ADMIN.isAdmin = false;
    zuneShowAdminLogin();
    return false;
  }

  const allowed = await zuneVerifyAdmin(session);

  if (!allowed) {
    zuneHandleNoAdminAccess(
      "Akaunti hii haina ruhusa ya admin. Tumia akaunti ya admin iliyoidhinishwa."
    );

    return false;
  }

  zuneUpdateAdminIdentity();
  zuneShowAdminDashboard();

  ZUNE_ADMIN.initialized = true;

  return true;
}

// -----------------------------------------------------
// 9. ADMIN LOGIN
// -----------------------------------------------------

async function zuneAdminLogin(event) {
  if (event) event.preventDefault();

  if (!zuneRequireSupabase()) return;

  const email =
    zuneValue("adminEmail").trim() ||
    zuneValue("loginEmail").trim();

  const password =
    zuneValue("adminPassword") ||
    zuneValue("loginPassword");

  if (!email || !password) {
    zuneShowLoginMessage(
      "Weka barua pepe na nenosiri.",
      "error"
    );

    return;
  }

  const submitButton =
    zuneEl("adminLoginBtn") ||
    zuneEl("adminLoginSubmit") ||
    zuneEl("loginBtn");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText =
      submitButton.textContent;

    submitButton.textContent = "Inaingia...";
  }

  try {
    const { data, error } =
      await zuneSupabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      zuneLogError("Admin login", error);

      zuneShowLoginMessage(
        "Imeshindikana kuingia. Kagua barua pepe, nenosiri na mipangilio ya Supabase.",
        "error"
      );

      return;
    }

    ZUNE_ADMIN.session = data.session || null;
    ZUNE_ADMIN.user = data.user || null;

    const allowed = await zuneVerifyAdmin(
      data.session
    );

    if (!allowed) {
      // Akaunti ya kawaida haipaswi kuingia dashboard.
      // Tunaondoa session kwenye kifaa hiki kwa usalama.
      await zuneSupabase.auth.signOut();

      ZUNE_ADMIN.session = null;
      ZUNE_ADMIN.user = null;
      ZUNE_ADMIN.profile = null;
      ZUNE_ADMIN.isAdmin = false;

      zuneShowAdminLogin();

      zuneShowLoginMessage(
        "Umeingia lakini akaunti hii haina role ya admin. Hakuna mabadiliko ya role yaliyofanywa.",
        "error"
      );

      return;
    }

    zuneUpdateAdminIdentity();
    zuneShowAdminDashboard();

    zuneShowLoginMessage(
      "Umeingia kwenye dashboard ya admin.",
      "success"
    );

    ZUNE_ADMIN.initialized = true;

    // Kazi hizi zitafafanuliwa katika sehemu zinazofuata.
    if (typeof zuneLoadOverview === "function") {
      await zuneLoadOverview();
    }

  } catch (error) {
    zuneLogError("Admin login exception", error);

    zuneShowLoginMessage(
      "Hitilafu imetokea wakati wa kuingia. Jaribu tena.",
      "error"
    );

  } finally {
    if (submitButton) {
      submitButton.disabled = false;

      submitButton.textContent =
        submitButton.dataset.originalText ||
        "Ingia";
    }
  }
}

// -----------------------------------------------------
// 10. ADMIN LOGOUT
// -----------------------------------------------------

async function zuneAdminLogout() {
  if (!zuneSupabase) return;

  const logoutButton = zuneEl("adminLogoutBtn");

  if (logoutButton) {
    logoutButton.disabled = true;
  }

  try {
    const { error } =
      await zuneSupabase.auth.signOut();

    if (error) {
      zuneLogError("Admin logout", error);

      zuneToast(
        "Imeshindikana kutoka. Jaribu tena.",
        "error"
      );

      return;
    }

    ZUNE_ADMIN.session = null;
    ZUNE_ADMIN.user = null;
    ZUNE_ADMIN.profile = null;
    ZUNE_ADMIN.isAdmin = false;
    ZUNE_ADMIN.initialized = false;

    zuneShowAdminLogin();

    zuneToast(
      "Umetoka kwenye akaunti ya admin.",
      "success"
    );

  } catch (error) {
    zuneLogError("Admin logout exception", error);

    zuneToast(
      "Hitilafu imetokea wakati wa kutoka.",
      "error"
    );

  } finally {
    if (logoutButton) {
      logoutButton.disabled = false;
    }
  }
}

// -----------------------------------------------------
// 11. AUTH SESSION CHANGES
// -----------------------------------------------------

function zuneRegisterAuthListener() {
  if (!zuneSupabase) return;

  zuneSupabase.auth.onAuthStateChange(
    (event, session) => {
      ZUNE_ADMIN.session = session || null;
      ZUNE_ADMIN.user = session?.user || null;

      if (event === "SIGNED_OUT") {
        ZUNE_ADMIN.isAdmin = false;
        ZUNE_ADMIN.profile = null;
        ZUNE_ADMIN.initialized = false;

        zuneShowAdminLogin();
      }

      // Tukio la SIGNED_IN linashughulikiwa na login/check
      // ili kuepuka kufanya query nyingi kwa wakati mmoja.
    }
  );
}

// -----------------------------------------------------
// MWISHO WA SEHEMU YA 2/10
// SEHEMU YA 3 ITAONGEZA DASHBOARD NA TAKWIMU.
// =====================================================

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 3/10
// OVERVIEW + ANALYTICS + DASHBOARD STATISTICS
// =====================================================

// -----------------------------------------------------
// 1. DASHBOARD ELEMENT HELPERS
// -----------------------------------------------------

function zuneSetStat(id, value) {
  const element = zuneEl(id);

  if (element) {
    element.textContent = String(value);
  }
}

function zuneSetStatMoney(id, value) {
  const element = zuneEl(id);

  if (element) {
    element.textContent = zuneFormatMoney(value, "TZS");
  }
}

function zuneGetArray(value) {
  return Array.isArray(value) ? value : [];
}

function zuneSum(rows, field) {
  return zuneGetArray(rows).reduce((total, row) => {
    const amount = Number(row?.[field]);

    return total + (
      Number.isFinite(amount) ? amount : 0
    );
  }, 0);
}

// -----------------------------------------------------
// 2. LOAD COUNTS FROM KNOWN TABLES
// -----------------------------------------------------

async function zuneGetTableCount(table, filter = null) {
  if (!zuneRequireSupabase()) {
    return null;
  }

  try {
    let query = zuneSupabase
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });

    if (typeof filter === "function") {
      query = filter(query);
    }

    const { count, error } = await query;

    if (error) {
      zuneLogError(`Kuhesabu ${table}`, error);
      return null;
    }

    return Number(count ?? 0);
  } catch (error) {
    zuneLogError(`Kuhesabu ${table}`, error);
    return null;
  }
}

// -----------------------------------------------------
// 3. LOAD OVERVIEW STATISTICS
// -----------------------------------------------------

async function zuneLoadOverview() {
  if (!ZUNE_ADMIN.isAdmin) {
    console.warn(
      "[ZUNE ADMIN] Dashboard haijapakiwa: admin access inahitajika."
    );

    return;
  }

  const stats = [
    {
      key: "customers",
      table: "profiles",
      filter: query => query.eq("role", "buyer")
    },
    {
      key: "sellers",
      table: "profiles",
      filter: query => query.eq("role", "vendor")
    },
    {
      key: "products",
      table: "products"
    },
    {
      key: "orders",
      table: "orders"
    },
    {
      key: "pendingApplications",
      table: "seller_applications",
      filter: query => query.eq("status", "pending")
    }
  ];

  const results = await Promise.all(
    stats.map(async item => ({
      ...item,
      count: await zuneGetTableCount(
        item.table,
        item.filter
      )
    }))
  );

  const values = {};

  results.forEach(item => {
    values[item.key] = item.count;
  });

  // IDs zilizopo kwenye muundo wa admin.html.
  if (values.customers !== null) {
    zuneSetStat(
      "statTotalCustomers",
      zuneFormatNumber(values.customers, 0)
    );
  } else {
    zuneSetStat("statTotalCustomers", "—");
  }

  if (values.sellers !== null) {
    zuneSetStat(
      "statTotalSellers",
      zuneFormatNumber(values.sellers, 0)
    );
  } else {
    zuneSetStat("statTotalSellers", "—");
  }

  if (values.orders !== null) {
    zuneSetStat(
      "statTotalOrders",
      zuneFormatNumber(values.orders, 0)
    );
  } else {
    zuneSetStat("statTotalOrders", "—");
  }

  if (values.pendingApplications !== null) {
    zuneSetStat(
      "pendingAppsCount",
      zuneFormatNumber(values.pendingApplications, 0)
    );
  } else {
    zuneSetStat("pendingAppsCount", "—");
  }

  // Takwimu za mauzo zinahitaji kusoma oda.
  await zuneLoadOverviewOrders();

  // Jaribu kupakia jedwali la bidhaa kwa sehemu nyingine.
  if (values.products !== null) {
    zuneSetStat(
      "statTotalProducts",
      zuneFormatNumber(values.products, 0)
    );
  }

  return values;
}

// -----------------------------------------------------
// 4. LOAD ORDERS FOR OVERVIEW
// -----------------------------------------------------

async function zuneLoadOverviewOrders() {
  const { data, error } = await zuneSupabase
    .from("orders")
    .select(
      "id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    zuneLogError("Kupakia oda za dashboard", error);

    zuneSetStat("statTotalSales", "—");

    return {
      data: null,
      error
    };
  }

  const orders = zuneGetArray(data);

  ZUNE_ADMIN.cache.orders = orders;

  // Jumla ya thamani za oda zote zilizopakiwa.
  // Hii si sawa na malipo yaliyothibitishwa.
  const totalOrderValue = zuneSum(
    orders,
    "total_price"
  );

  const totalSalesElement = zuneEl("statTotalSales");

  if (totalSalesElement) {
    totalSalesElement.textContent =
      zuneFormatMoney(totalOrderValue, "TZS");
    totalSalesElement.title =
      "Jumla ya total_price za oda zilizopakiwa; si uthibitisho wa malipo.";
  }

  zuneRenderRecentOrders(orders);

  return {
    data: orders,
    error: null
  };
}

// -----------------------------------------------------
// 5. RENDER RECENT ORDERS
// -----------------------------------------------------

function zuneRenderRecentOrders(orders) {
  const possibleBodies = [
    "recentOrdersTableBody",
    "recentOrdersBody",
    "overviewOrdersBody"
  ];

  const body = possibleBodies
    .map(id => zuneEl(id))
    .find(Boolean);

  if (!body) return;

  const rows = zuneGetArray(orders).slice(0, 10);

  if (!rows.length) {
    body.innerHTML = zuneRenderEmptyRow(
      5,
      "Hakuna oda zilizopatikana."
    );

    return;
  }

  body.innerHTML = rows.map(order => `
    <tr>
      <td>${zuneEscapeHTML(order.id ?? "—")}</td>
      <td>${zuneEscapeHTML(order.buyer_id ?? "—")}</td>
      <td>${zuneEscapeHTML(
        zuneFormatMoney(order.total_price, "TZS")
      )}</td>
      <td>${zuneEscapeHTML(
        zuneStatusLabel(order.status)
      )}</td>
      <td>${zuneEscapeHTML(
        zuneFormatDate(order.created_at)
      )}</td>
    </tr>
  `).join("");
}

// -----------------------------------------------------
// 6. ANALYTICS DATA
// -----------------------------------------------------

async function zuneLoadAnalytics() {
  if (!ZUNE_ADMIN.isAdmin) return;

  const { data, error } = await zuneSupabase
    .from("orders")
    .select(
      "id, total_price, commission_fee, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    zuneLogError("Kupakia analytics", error);

    zuneToast(
      "Imeshindikana kupakia uchanganuzi wa oda.",
      "error"
    );

    return;
  }

  const orders = zuneGetArray(data);

  ZUNE_ADMIN.cache.orders = orders;

  const totalOrders = orders.length;

  const completedOrders = orders.filter(order =>
    zuneNormalizeStatus(order.status) === "completed"
  );

  const pendingOrders = orders.filter(order =>
    zuneNormalizeStatus(order.status) === "pending"
  );

  const cancelledOrders = orders.filter(order =>
    zuneNormalizeStatus(order.status) === "cancelled"
  );

  const completedValue = zuneSum(
    completedOrders,
    "total_price"
  );

  const totalCommission = zuneSum(
    completedOrders,
    "commission_fee"
  );

  zuneSetStat(
    "analyticsTotalOrders",
    zuneFormatNumber(totalOrders, 0)
  );

  zuneSetStat(
    "analyticsCompletedOrders",
    zuneFormatNumber(completedOrders.length, 0)
  );

  zuneSetStat(
    "analyticsPendingOrders",
    zuneFormatNumber(pendingOrders.length, 0)
  );

  zuneSetStat(
    "analyticsCancelledOrders",
    zuneFormatNumber(cancelledOrders.length, 0)
  );

  zuneSetStatMoney(
    "analyticsCompletedValue",
    completedValue
  );

  zuneSetStatMoney(
    "analyticsCommission",
    totalCommission
  );

  zuneRenderAnalyticsByDay(orders);
}

// -----------------------------------------------------
// 7. DAILY ORDER ANALYTICS
// -----------------------------------------------------

function zuneRenderAnalyticsByDay(orders) {
  const container =
    zuneEl("analyticsDailySummary") ||
    zuneEl("analyticsChart");

  if (!container) return;

  const daily = new Map();

  zuneGetArray(orders).forEach(order => {
    if (!order.created_at) return;

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) return;

    const key = date.toISOString().slice(0, 10);

    if (!daily.has(key)) {
      daily.set(key, {
        date: key,
        count: 0,
        value: 0
      });
    }

    const item = daily.get(key);

    item.count += 1;

    const amount = Number(order.total_price);

    if (Number.isFinite(amount)) {
      item.value += amount;
    }
  });

  const entries = [...daily.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  if (!entries.length) {
    container.textContent =
      "Hakuna taarifa za oda za kuonyesha kwa sasa.";

    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tarehe</th>
            <th>Idadi ya oda</th>
            <th>Thamani ya oda</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(item => `
            <tr>
              <td>${zuneEscapeHTML(item.date)}</td>
              <td>${zuneEscapeHTML(
                zuneFormatNumber(item.count, 0)
              )}</td>
              <td>${zuneEscapeHTML(
                zuneFormatMoney(item.value, "TZS")
              )}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// -----------------------------------------------------
// 8. REFRESH DASHBOARD
// -----------------------------------------------------

async function zuneRefreshDashboard() {
  if (!ZUNE_ADMIN.isAdmin) {
    zuneToast(
      "Ruhusa ya admin inahitajika.",
      "error"
    );

    return;
  }

  zuneToast("Inasasisha takwimu...", "info");

  try {
    await zuneLoadOverview();

    zuneToast(
      "Takwimu zimefanyiwa upya.",
      "success"
    );
  } catch (error) {
    zuneLogError("Dashboard refresh", error);

    zuneToast(
      "Imeshindikana kusasisha dashboard.",
      "error"
    );
  }
}

// -----------------------------------------------------
// MWISHO WA SEHEMU YA 3/10
// SEHEMU YA 4 ITAONGEZA USERS NA SELLERS.
// =====================================================

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 4/10
// USERS + SELLERS MANAGEMENT
// =====================================================

// -----------------------------------------------------
// 1. LOAD USERS
// -----------------------------------------------------

async function zuneLoadUsers() {
  if (!ZUNE_ADMIN.isAdmin) {
    zuneToast("Ruhusa ya admin inahitajika.", "error");
    return;
  }

  const body =
    zuneEl("usersTableBody") ||
    zuneEl("usersTable") ||
    zuneEl("adminUsersTableBody");

  if (body) {
    body.innerHTML = zuneRenderEmptyRow(
      6,
      "Inapakia watumiaji..."
    );
  }

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, phone_number, role, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    zuneLogError("Kupakia watumiaji", error);

    if (body) {
      body.innerHTML = zuneRenderEmptyRow(
        6,
        "Imeshindikana kupakia watumiaji. Kagua ruhusa za Supabase."
      );
    }

    zuneToast("Imeshindikana kupakia watumiaji.", "error");
    return;
  }

  ZUNE_ADMIN.cache.profiles = Array.isArray(data) ? data : [];

  zuneRenderUsers(ZUNE_ADMIN.cache.profiles);
}

// -----------------------------------------------------
// 2. RENDER USERS TABLE
// -----------------------------------------------------

function zuneRenderUsers(users) {
  const body =
    zuneEl("usersTableBody") ||
    zuneEl("usersTable") ||
    zuneEl("adminUsersTableBody");

  if (!body) return;

  const rows = Array.isArray(users) ? users : [];

  if (!rows.length) {
    body.innerHTML = zuneRenderEmptyRow(
      6,
      "Hakuna watumiaji waliopatikana."
    );
    return;
  }

  body.innerHTML = rows.map(user => {
    const role = zuneNormalizeRole(user.role);
    const verified = user.is_verified === true;

    return `
      <tr>
        <td>${zuneEscapeHTML(user.full_name || "Bila jina")}</td>
        <td>${zuneEscapeHTML(user.id || "—")}</td>
        <td>${zuneEscapeHTML(user.phone_number || "—")}</td>
        <td>${zuneEscapeHTML(role || "Haijulikani")}</td>
        <td>${verified ? "Imethibitishwa" : "Haijathibitishwa"}</td>
        <td>${zuneEscapeHTML(zuneFormatDate(user.created_at))}</td>
      </tr>
    `;
  }).join("");
}

// -----------------------------------------------------
// 3. FILTER USERS
// -----------------------------------------------------

function zuneFilterUsers() {
  const query = (
    zuneValue("usersSearch") ||
    zuneValue("userSearch") ||
    zuneValue("adminUserSearch")
  ).trim().toLowerCase();

  const roleFilter = zuneNormalizeRole(
    zuneValue("usersRoleFilter", "all")
  );

  const verifiedFilter = zuneValue(
    "usersVerifiedFilter",
    "all"
  );

  const filtered = ZUNE_ADMIN.cache.profiles.filter(user => {
    const searchable = [
      user.full_name,
      user.id,
      user.phone_number,
      user.role
    ].join(" ").toLowerCase();

    const matchesQuery =
      !query || searchable.includes(query);

    const matchesRole =
      roleFilter === "all" ||
      zuneNormalizeRole(user.role) === roleFilter;

    const matchesVerified =
      verifiedFilter === "all" ||
      (
        verifiedFilter === "verified" &&
        user.is_verified === true
      ) ||
      (
        verifiedFilter === "unverified" &&
        user.is_verified !== true
      );

    return (
      matchesQuery &&
      matchesRole &&
      matchesVerified
    );
  });

  zuneRenderUsers(filtered);
}

// -----------------------------------------------------
// 4. LOAD SELLERS
// -----------------------------------------------------

async function zuneLoadSellers() {
  if (!ZUNE_ADMIN.isAdmin) {
    zuneToast("Ruhusa ya admin inahitajika.", "error");
    return;
  }

  const body =
    zuneEl("sellersTableBody") ||
    zuneEl("sellerTableBody");

  if (body) {
    body.innerHTML = zuneRenderEmptyRow(
      5,
      "Inapakia wauzaji..."
    );
  }

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, phone_number, role, is_verified, created_at")
    .eq("role", "vendor")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    zuneLogError("Kupakia wauzaji", error);

    if (body) {
      body.innerHTML = zuneRenderEmptyRow(
        5,
        "Imeshindikana kupakia wauzaji."
      );
    }

    zuneToast("Imeshindikana kupakia wauzaji.", "error");
    return;
  }

  const sellers = Array.isArray(data) ? data : [];

  ZUNE_ADMIN.cache.sellerProfiles = sellers;

  zuneRenderSellers(sellers);
}

// -----------------------------------------------------
// 5. RENDER SELLERS
// -----------------------------------------------------

function zuneRenderSellers(sellers) {
  const body =
    zuneEl("sellersTableBody") ||
    zuneEl("sellerTableBody");

  if (!body) return;

  if (!Array.isArray(sellers) || sellers.length === 0) {
    body.innerHTML = zuneRenderEmptyRow(
      5,
      "Hakuna akaunti za wauzaji zilizopatikana."
    );
    return;
  }

  body.innerHTML = sellers.map(seller => `
    <tr>
      <td>${zuneEscapeHTML(seller.full_name || "Bila jina")}</td>
      <td>${zuneEscapeHTML(seller.id || "—")}</td>
      <td>${zuneEscapeHTML(seller.phone_number || "—")}</td>
      <td>${seller.is_verified === true
        ? "Imethibitishwa"
        : "Haijathibitishwa"}</td>
      <td>${zuneEscapeHTML(zuneFormatDate(seller.created_at))}</td>
    </tr>
  `).join("");
}

// -----------------------------------------------------
// 6. FILTER SELLERS
// -----------------------------------------------------

function zuneFilterSellers() {
  const query = (
    zuneValue("sellersSearch") ||
    zuneValue("sellerSearch")
  ).trim().toLowerCase();

  const sellers = ZUNE_ADMIN.cache.sellerProfiles || [];

  const filtered = sellers.filter(seller => {
    const searchable = [
      seller.full_name,
      seller.id,
      seller.phone_number
    ].join(" ").toLowerCase();

    return !query || searchable.includes(query);
  });

  zuneRenderSellers(filtered);
}

// -----------------------------------------------------
// 7. VIEW USER DETAILS
// -----------------------------------------------------

function zuneViewUserDetails(userId) {
  if (!ZUNE_ADMIN.isAdmin) {
    zuneToast("Ruhusa ya admin inahitajika.", "error");
    return;
  }

  const user = ZUNE_ADMIN.cache.profiles.find(
    item => String(item.id) === String(userId)
  );

  if (!user) {
    zuneToast("Mtumiaji huyu hakupatikana kwenye orodha.", "warning");
    return;
  }

  const details = `
    <div class="application-details">
      <p><strong>Jina:</strong> ${zuneEscapeHTML(user.full_name || "Bila jina")}</p>
      <p><strong>ID:</strong> ${zuneEscapeHTML(user.id)}</p>
      <p><strong>Simu:</strong> ${zuneEscapeHTML(user.phone_number || "Haijawekwa")}</p>
      <p><strong>Aina ya akaunti:</strong> ${zuneEscapeHTML(user.role || "Haijulikani")}</p>
      <p><strong>Uthibitishaji:</strong> ${user.is_verified === true ? "Imethibitishwa" : "Haijathibitishwa"}</p>
      <p><strong>Tarehe ya kuundwa:</strong> ${zuneEscapeHTML(zuneFormatDate(user.created_at))}</p>
    </div>
  `;

  const previewBody = zuneEl("adminPreviewBody");
  const previewModal = zuneEl("adminPreviewModal");

  if (previewBody && previewModal) {
    previewBody.innerHTML = details;
    zuneSetText("adminPreviewTitle", "Taarifa za Mtumiaji");
    previewModal.hidden = false;
  } else {
    zuneToast(
      `Akaunti: ${user.full_name || user.id}`,
      "info"
    );
  }
}

// -----------------------------------------------------
// 8. USER EXPORT TO CSV
// -----------------------------------------------------

function zuneExportUsersCSV() {
  if (!ZUNE_ADMIN.isAdmin) {
    zuneToast("Ruhusa ya admin inahitajika.", "error");
    return;
  }

  const users = ZUNE_ADMIN.cache.profiles || [];

  if (!users.length) {
    zuneToast(
      "Hakuna watumiaji wa kuhamishia kwenye CSV. Pakia orodha kwanza.",
      "warning"
    );
    return;
  }

  const headers = [
    "ID",
    "Full Name",
    "Phone",
    "Role",
    "Verified",
    "Created At"
  ];

  const rows = users.map(user => [
    user.id,
    user.full_name,
    user.phone_number,
    user.role,
    user.is_verified,
    user.created_at
  ]);

  const csvCell = value => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(","))
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "zune-users.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  zuneToast("Faili la watumiaji limeandaliwa.", "success");
}

// -----------------------------------------------------
// 9. RELOAD USERS AND SELLERS
// -----------------------------------------------------

async function zuneReloadUsersAndSellers() {
  if (!ZUNE_ADMIN.isAdmin) return;

  await Promise.all([
    zuneLoadUsers(),
    zuneLoadSellers()
  ]);
}

// -----------------------------------------------------
// MWISHO WA SEHEMU YA 4/10
// SEHEMU YA 5 ITAONGEZA MAOMBI YA WAUZAJI
// NA MAOMBI YA UTHIBITISHAJI.
// =====================================================

/* =====================================================
   ZUNE ADMIN DASHBOARD
   SEHEMU YA 5/10
   MAOMBI YA WAUZAJI + UTHIBITISHAJI
===================================================== */

/* ---------- 1. HELPER ZA MAOMBI ---------- */

function zuneApplicationValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function zuneApplicationStatus(status) {
  const value = String(status || "pending").toLowerCase();

  const labels = {
    pending: "Inasubiri",
    approved: "Imeidhinishwa",
    rejected: "Imekataliwa",
    verified: "Imethibitishwa",
    declined: "Imekataliwa"
  };

  return labels[value] || value;
}

function zuneApplicationDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("sw-TZ", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/* ---------- 2. PAKIA MAOMBI YA WAUZAJI ---------- */

async function zuneLoadSellerApplications() {
  const container =
    document.getElementById("sellerApplicationsList") ||
    document.getElementById("sellerApplicationsTableBody") ||
    document.getElementById("sellerAppsTableBody") ||
    document.getElementById("applicationsTableBody");

  if (!container) {
    console.warn(
      "ZUNE: Sehemu ya kuonyesha maombi ya wauzaji haijapatikana."
    );
    return;
  }

  container.innerHTML =
    '<tr><td colspan="8">Inapakia maombi...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.sellerApplications = data || [];

    zuneRenderSellerApplications(
      ZUNE_ADMIN.cache.sellerApplications
    );

    const pending = (data || []).filter(app =>
      String(app.status || "pending").toLowerCase() === "pending"
    ).length;

    const pendingCount =
      document.getElementById("pendingAppsCount");

    if (pendingCount) {
      pendingCount.textContent = String(pending);
    }

    const totalCount =
      document.getElementById("statPendingApplications") ||
      document.getElementById("statSellerApplications");

    if (totalCount) {
      totalCount.textContent = String((data || []).length);
    }
  } catch (error) {
    console.error(
      "ZUNE seller applications error:",
      error
    );

    container.innerHTML =
      '<tr><td colspan="8">Imeshindikana kupakia maombi. ' +
      'Kagua ruhusa za RLS na jedwali la seller_applications.</td></tr>';

    if (typeof zuneToast === "function") {
      zuneToast(
        "Imeshindikana kupakia maombi ya wauzaji.",
        "error"
      );
    }
  }
}

/* ---------- 3. CHUJA MAOMBI ---------- */

function zuneFilterSellerApplications() {
  const searchInput =
    document.getElementById("sellerApplicationsSearch") ||
    document.getElementById("sellerAppsSearch") ||
    document.getElementById("applicationSearch");

  const statusInput =
    document.getElementById("sellerApplicationsStatus") ||
    document.getElementById("sellerAppsStatusFilter") ||
    document.getElementById("applicationStatusFilter");

  const search = String(searchInput?.value || "")
    .trim()
    .toLowerCase();

  const status = String(statusInput?.value || "all")
    .trim()
    .toLowerCase();

  const applications =
    ZUNE_ADMIN.cache.sellerApplications || [];

  const filtered = applications.filter(app => {
    const searchable = [
      app.store_name,
      app.business_name,
      app.owner_name,
      app.phone,
      app.email,
      app.country,
      app.city,
      app.region,
      app.district,
      app.category,
      app.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const currentStatus =
      String(app.status || "pending").toLowerCase();

    const matchesStatus =
      status === "all" ||
      status === "" ||
      currentStatus === status;

    return matchesSearch && matchesStatus;
  });

  zuneRenderSellerApplications(filtered);
}

/* ---------- 4. ONYESHA MAOMBI ---------- */

function zuneRenderSellerApplications(applications) {
  const container =
    document.getElementById("sellerApplicationsList") ||
    document.getElementById("sellerApplicationsTableBody") ||
    document.getElementById("sellerAppsTableBody") ||
    document.getElementById("applicationsTableBody");

  if (!container) return;

  if (!applications || applications.length === 0) {
    container.innerHTML =
      '<tr><td colspan="8">Hakuna maombi yaliyopatikana.</td></tr>';
    return;
  }

  container.innerHTML = applications.map(app => {
    const id = String(app.id || "");
    const name = zuneEscapeHTML(
      zuneApplicationValue(app.store_name || app.business_name)
    );
    const owner = zuneEscapeHTML(
      zuneApplicationValue(app.owner_name)
    );
    const phone = zuneEscapeHTML(
      zuneApplicationValue(app.phone)
    );
    const location = zuneEscapeHTML(
      [
        app.city,
        app.district,
        app.region,
        app.country
      ].filter(Boolean).join(", ") || "—"
    );
    const category = zuneEscapeHTML(
      zuneApplicationValue(app.category)
    );
    const date = zuneEscapeHTML(
      zuneApplicationDate(app.created_at)
    );
    const status = String(app.status || "pending").toLowerCase();

    let actions = "";

    if (status === "pending") {
      actions = `
        <button type="button"
          class="zune-admin-btn zune-admin-btn-success"
          data-seller-app-action="approve"
          data-application-id="${zuneEscapeHTML(id)}">
          Idhinisha
        </button>
        <button type="button"
          class="zune-admin-btn zune-admin-btn-danger"
          data-seller-app-action="reject"
          data-application-id="${zuneEscapeHTML(id)}">
          Kataa
        </button>
      `;
    } else {
      actions = `
        <span>${zuneEscapeHTML(
          zuneApplicationStatus(status)
        )}</span>
      `;
    }

    return `
      <tr>
        <td>${name}</td>
        <td>${owner}</td>
        <td>${phone}</td>
        <td>${location}</td>
        <td>${category}</td>
        <td>${date}</td>
        <td>${zuneEscapeHTML(
          zuneApplicationStatus(status)
        )}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-seller-app-action="view"
            data-application-id="${zuneEscapeHTML(id)}">
            Tazama
          </button>
          ${actions}
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 5. KAGUA MAELEZO YA MAOMBI ---------- */

function zuneViewSellerApplication(applicationId) {
  const app = (
    ZUNE_ADMIN.cache.sellerApplications || []
  ).find(item => String(item.id) === String(applicationId));

  if (!app) {
    if (typeof zuneToast === "function") {
      zuneToast("Maombi hayo hayajapatikana.", "error");
    }
    return;
  }

  const details = [
    ["Jina la duka", app.store_name],
    ["Jina la biashara", app.business_name],
    ["Jina la mmiliki", app.owner_name],
    ["Simu", app.phone],
    ["Barua pepe", app.email],
    ["Nchi", app.country],
    ["Mkoa", app.region],
    ["Wilaya", app.district],
    ["Mji", app.city],
    ["Anwani", app.address],
    ["Aina ya bidhaa", app.category],
    ["TIN", app.tin_number],
    ["Aina ya kitambulisho", app.id_type],
    ["Namba ya kitambulisho", app.id_number],
    ["Hali", zuneApplicationStatus(app.status)],
    ["Tarehe ya maombi", zuneApplicationDate(app.created_at)]
  ];

  const html = details
    .filter(([label, value]) =>
      value !== null && value !== undefined && value !== ""
    )
    .map(([label, value]) => `
      <div class="zune-admin-detail-row">
        <strong>${zuneEscapeHTML(label)}:</strong>
        <span>${zuneEscapeHTML(String(value))}</span>
      </div>
    `)
    .join("");

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview(
      "Maelezo ya Maombi ya Muuzaji",
      `<div class="zune-admin-details">${html}</div>`
    );
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const title = document.getElementById("adminPreviewTitle");
  const body = document.getElementById("adminPreviewBody");

  if (modal && title && body) {
    title.textContent = "Maelezo ya Maombi ya Muuzaji";
    body.innerHTML =
      `<div class="zune-admin-details">${html}</div>`;
    modal.hidden = false;
    modal.classList.add("is-open");
  } else {
    alert(
      details
        .filter(([, value]) =>
          value !== null && value !== undefined && value !== ""
        )
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n")
    );
  }
}

/* ---------- 6. IDHINISHA AU KATAA ---------- */

async function zuneUpdateSellerApplicationStatus(
  applicationId,
  newStatus
) {
  if (!ZUNE_ADMIN.isAdmin) {
    if (typeof zuneToast === "function") {
      zuneToast("Ni msimamizi pekee anayeruhusiwa.", "error");
    }
    return;
  }

  if (!["approved", "rejected"].includes(newStatus)) {
    return;
  }

  const app = (
    ZUNE_ADMIN.cache.sellerApplications || []
  ).find(item => String(item.id) === String(applicationId));

  if (!app) {
    if (typeof zuneToast === "function") {
      zuneToast("Maombi hayajapatikana.", "error");
    }
    return;
  }

  const question = newStatus === "approved"
    ? `Unataka kuidhinisha ombi la ${app.store_name || app.business_name || "muuzaji"}?`
    : `Unataka kukataa ombi la ${app.store_name || app.business_name || "muuzaji"}?`;

  const confirmed = typeof zuneConfirm === "function"
    ? await zuneConfirm(question)
    : window.confirm(question);

  if (!confirmed) return;

  try {
    const { error } = await zuneSupabase
      .from("seller_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (error) throw error;

    if (typeof zuneToast === "function") {
      zuneToast(
        newStatus === "approved"
          ? "Ombi limeidhinishwa."
          : "Ombi limekataliwa.",
        "success"
      );
    }

    await zuneLoadSellerApplications();
  } catch (error) {
    console.error(
      "ZUNE application status error:",
      error
    );

    if (typeof zuneToast === "function") {
      zuneToast(
        "Imeshindikana kubadilisha hali. Kagua RLS na ruhusa za admin.",
        "error"
      );
    }
  }
}

/* ---------- 7. PAKIA MAOMBI YA UTHIBITISHAJI ---------- */

async function zuneLoadVerificationRequests() {
  const container =
    document.getElementById("verificationRequestsList") ||
    document.getElementById("verificationTableBody") ||
    document.getElementById("verificationRequestsTableBody");

  if (!container) {
    console.warn(
      "ZUNE: Sehemu ya maombi ya uthibitishaji haijapatikana."
    );
    return;
  }

  container.innerHTML =
    '<tr><td colspan="6">Inapakia maombi ya uthibitishaji...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.verificationRequests = data || [];

    zuneRenderVerificationRequests(data || []);
  } catch (error) {
    console.error(
      "ZUNE verification requests error:",
      error
    );

    container.innerHTML =
      '<tr><td colspan="6">Imeshindikana kupakia maombi ya uthibitishaji. ' +
      'Kagua kama jedwali lipo na kama RLS inaruhusu admin kulisoma.</td></tr>';
  }
}

/* ---------- 8. ONYESHA MAOMBI YA UTHIBITISHAJI ---------- */

function zuneRenderVerificationRequests(requests) {
  const container =
    document.getElementById("verificationRequestsList") ||
    document.getElementById("verificationTableBody") ||
    document.getElementById("verificationRequestsTableBody");

  if (!container) return;

  if (!requests.length) {
    container.innerHTML =
      '<tr><td colspan="6">Hakuna maombi ya uthibitishaji.</td></tr>';
    return;
  }

  container.innerHTML = requests.map(request => {
    const id = String(request.id || "");
    const userId =
      request.user_id ||
      request.profile_id ||
      request.requester_id ||
      "—";

    const status = request.status || "pending";
    const createdAt = zuneApplicationDate(request.created_at);

    const actions = String(status).toLowerCase() === "pending"
      ? `
        <button type="button"
          class="zune-admin-btn zune-admin-btn-success"
          data-verification-action="verified"
          data-verification-id="${zuneEscapeHTML(id)}">
          Thibitisha
        </button>
        <button type="button"
          class="zune-admin-btn zune-admin-btn-danger"
          data-verification-action="rejected"
          data-verification-id="${zuneEscapeHTML(id)}">
          Kataa
        </button>
      `
      : zuneEscapeHTML(zuneApplicationStatus(status));

    return `
      <tr>
        <td>${zuneEscapeHTML(id)}</td>
        <td>${zuneEscapeHTML(String(userId))}</td>
        <td>${zuneEscapeHTML(
          String(request.status || "pending")
        )}</td>
        <td>${zuneEscapeHTML(createdAt)}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-verification-action="view"
            data-verification-id="${zuneEscapeHTML(id)}">
            Tazama
          </button>
          ${actions}
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 9. BADILISHA HALI YA UTHIBITISHAJI ---------- */

async function zuneUpdateVerificationStatus(
  requestId,
  newStatus
) {
  if (!ZUNE_ADMIN.isAdmin) {
    if (typeof zuneToast === "function") {
      zuneToast("Huna ruhusa ya kufanya kitendo hiki.", "error");
    }
    return;
  }

  if (!["verified", "rejected"].includes(newStatus)) {
    return;
  }

  const confirmed = window.confirm(
    newStatus === "verified"
      ? "Unataka kuthibitisha ombi hili?"
      : "Unataka kukataa ombi hili?"
  );

  if (!confirmed) return;

  try {
    const { error } = await zuneSupabase
      .from("verification_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) throw error;

    if (typeof zuneToast === "function") {
      zuneToast(
        newStatus === "verified"
          ? "Ombi la uthibitishaji limekubaliwa."
          : "Ombi la uthibitishaji limekataliwa.",
        "success"
      );
    }

    await zuneLoadVerificationRequests();
  } catch (error) {
    console.error(
      "ZUNE verification update error:",
      error
    );

    if (typeof zuneToast === "function") {
      zuneToast(
        "Imeshindikana kubadilisha hali. Hakikisha safu ya status ipo na RLS inaruhusu admin.",
        "error"
      );
    }
  }
}

/* ---------- 10. MAELEZO YA OMBI LA UTHIBITISHAJI ---------- */

function zuneViewVerificationRequest(requestId) {
  const request = (
    ZUNE_ADMIN.cache.verificationRequests || []
  ).find(item => String(item.id) === String(requestId));

  if (!request) {
    if (typeof zuneToast === "function") {
      zuneToast("Ombi halijapatikana.", "error");
    }
    return;
  }

  const allowedFields = [
    "id",
    "user_id",
    "profile_id",
    "requester_id",
    "status",
    "created_at",
    "updated_at",
    "document_type",
    "id_type",
    "reviewed_at",
    "reviewed_by"
  ];

  const html = allowedFields
    .filter(key =>
      request[key] !== null &&
      request[key] !== undefined &&
      request[key] !== ""
    )
    .map(key => `
      <div class="zune-admin-detail-row">
        <strong>${zuneEscapeHTML(key)}:</strong>
        <span>${zuneEscapeHTML(String(request[key]))}</span>
      </div>
    `)
    .join("");

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview(
      "Maelezo ya Uthibitishaji",
      `<div class="zune-admin-details">${html || "Hakuna maelezo zaidi."}</div>`
    );
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const title = document.getElementById("adminPreviewTitle");
  const body = document.getElementById("adminPreviewBody");

  if (modal && title && body) {
    title.textContent = "Maelezo ya Uthibitishaji";
    body.innerHTML =
      `<div class="zune-admin-details">${html || "Hakuna maelezo zaidi."}</div>`;
    modal.hidden = false;
    modal.classList.add("is-open");
  }
}

/* ---------- 11. VITENDO VYA VIFUNGO ---------- */

document.addEventListener("click", function(event) {
  const appButton = event.target.closest(
    "[data-seller-app-action]"
  );

  if (appButton) {
    const action = appButton.dataset.sellerAppAction;
    const id = appButton.dataset.applicationId;

    if (action === "view") {
      zuneViewSellerApplication(id);
    } else if (action === "approve") {
      zuneUpdateSellerApplicationStatus(id, "approved");
    } else if (action === "reject") {
      zuneUpdateSellerApplicationStatus(id, "rejected");
    }

    return;
  }

  const verificationButton = event.target.closest(
    "[data-verification-action]"
  );

  if (verificationButton) {
    const action = verificationButton.dataset.verificationAction;
    const id = verificationButton.dataset.verificationId;

    if (action === "view") {
      zuneViewVerificationRequest(id);
    } else if (action === "verified") {
      zuneUpdateVerificationStatus(id, "verified");
    } else if (action === "rejected") {
      zuneUpdateVerificationStatus(id, "rejected");
    }
  }
});

/* ---------- 12. FILTER EVENTS ---------- */

[
  "sellerApplicationsSearch",
  "sellerAppsSearch",
  "applicationSearch",
  "sellerApplicationsStatus",
  "sellerAppsStatusFilter",
  "applicationStatusFilter"
].forEach(id => {
  const element = document.getElementById(id);

  if (element) {
    element.addEventListener(
      "input",
      zuneFilterSellerApplications
    );

    element.addEventListener(
      "change",
      zuneFilterSellerApplications
    );
  }
});

/* ---------- MWISHO WA SEHEMU YA 5/10 ---------- */

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 6/10
// BIDHAA + MAAGIZO + MALIPO
// =====================================================

/* ---------- 1. HELPER ZA BIDHAA NA MAAGIZO ---------- */

function zuneAdminMoney(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("sw-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }).format(amount);
}

function zuneAdminFindElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }

  return null;
}

function zuneAdminText(value) {
  return zuneEscapeHTML(
    value === null || value === undefined || value === ""
      ? "—"
      : String(value)
  );
}

/* ---------- 2. PAKIA BIDHAA ---------- */

async function zuneLoadAdminProducts() {
  const tableBody = zuneAdminFindElement(
    "adminProductsTableBody",
    "productsTableBody",
    "adminProductsList",
    "productsList"
  );

  if (!tableBody) return;

  tableBody.innerHTML =
    '<tr><td colspan="7">Inapakia bidhaa...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.products = data || [];

    zuneRenderAdminProducts(data || []);
  } catch (error) {
    console.error("ZUNE admin products:", error);

    tableBody.innerHTML =
      '<tr><td colspan="7">Imeshindikana kupakia bidhaa. Kagua RLS.</td></tr>';
  }
}

/* ---------- 3. ONYESHA BIDHAA ---------- */

function zuneRenderAdminProducts(products) {
  const tableBody = zuneAdminFindElement(
    "adminProductsTableBody",
    "productsTableBody",
    "adminProductsList",
    "productsList"
  );

  if (!tableBody) return;

  if (!products.length) {
    tableBody.innerHTML =
      '<tr><td colspan="7">Hakuna bidhaa zilizopatikana.</td></tr>';
    return;
  }

  tableBody.innerHTML = products.map(product => {
    const id = String(product.id || "");
    const title = zuneAdminText(product.title);
    const price = zuneAdminText(zuneAdminMoney(product.price));
    const stock = zuneAdminText(product.stock_quantity);
    const vendor = zuneAdminText(product.vendor_id);
    const date = zuneAdminText(
      zuneApplicationDate(product.created_at)
    );

    return `
      <tr>
        <td>${title}</td>
        <td>${price}</td>
        <td>${stock}</td>
        <td>${vendor}</td>
        <td>${date}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-product-action="view"
            data-product-id="${zuneEscapeHTML(id)}">
            Tazama
          </button>
          <button type="button"
            class="zune-admin-btn zune-admin-btn-danger"
            data-product-action="delete"
            data-product-id="${zuneEscapeHTML(id)}">
            Futa
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 4. TAFUTA BIDHAA ---------- */

function zuneFilterAdminProducts() {
  const searchInput = zuneAdminFindElement(
    "adminProductsSearch",
    "productsSearch",
    "productSearch"
  );

  const search = String(searchInput?.value || "")
    .trim()
    .toLowerCase();

  const products = ZUNE_ADMIN.cache.products || [];

  const filtered = products.filter(product => {
    const text = [
      product.title,
      product.description,
      product.vendor_id,
      product.id
    ].filter(Boolean).join(" ").toLowerCase();

    return !search || text.includes(search);
  });

  zuneRenderAdminProducts(filtered);
}

/* ---------- 5. MAELEZO YA BIDHAA ---------- */

function zuneViewAdminProduct(productId) {
  const product = (ZUNE_ADMIN.cache.products || [])
    .find(item => String(item.id) === String(productId));

  if (!product) {
    if (typeof zuneToast === "function") {
      zuneToast("Bidhaa haijapatikana.", "error");
    }
    return;
  }

  const fields = [
    ["Jina", product.title],
    ["Maelezo", product.description],
    ["Bei", zuneAdminMoney(product.price)],
    ["Idadi iliyopo", product.stock_quantity],
    ["ID ya muuzaji", product.vendor_id],
    ["ID ya bidhaa", product.id],
    ["Tarehe ya kuongezwa", zuneApplicationDate(product.created_at)]
  ];

  const html = fields
    .filter(([, value]) =>
      value !== null && value !== undefined && value !== ""
    )
    .map(([label, value]) => `
      <div class="zune-admin-detail-row">
        <strong>${zuneEscapeHTML(label)}:</strong>
        <span>${zuneEscapeHTML(String(value))}</span>
      </div>
    `)
    .join("");

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview(
      "Maelezo ya Bidhaa",
      `<div class="zune-admin-details">${html}</div>`
    );
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const title = document.getElementById("adminPreviewTitle");
  const body = document.getElementById("adminPreviewBody");

  if (modal && title && body) {
    title.textContent = "Maelezo ya Bidhaa";
    body.innerHTML = `<div class="zune-admin-details">${html}</div>`;
    modal.hidden = false;
    modal.classList.add("is-open");
  }
}

/* ---------- 6. FUTA BIDHAA ---------- */

async function zuneDeleteAdminProduct(productId) {
  if (!ZUNE_ADMIN.isAdmin) {
    if (typeof zuneToast === "function") {
      zuneToast("Ni admin pekee anayeruhusiwa.", "error");
    }
    return;
  }

  const product = (ZUNE_ADMIN.cache.products || [])
    .find(item => String(item.id) === String(productId));

  if (!product) return;

  const confirmed = window.confirm(
    `Una uhakika unataka kufuta bidhaa "${product.title || productId}"?`
  );

  if (!confirmed) return;

  try {
    const { error } = await zuneSupabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;

    if (typeof zuneToast === "function") {
      zuneToast("Bidhaa imefutwa.", "success");
    }

    await zuneLoadAdminProducts();
  } catch (error) {
    console.error("ZUNE delete product:", error);

    if (typeof zuneToast === "function") {
      zuneToast(
        "Imeshindikana kufuta bidhaa. Inaweza kuwa na maagizo yanayoihusisha au RLS imezuia kitendo.",
        "error"
      );
    }
  }
}

/* ---------- 7. PAKIA MAAGIZO ---------- */

async function zuneLoadAdminOrders() {
  const tableBody = zuneAdminFindElement(
    "adminOrdersTableBody",
    "ordersTableBody",
    "adminOrdersList",
    "ordersList"
  );

  if (!tableBody) return;

  tableBody.innerHTML =
    '<tr><td colspan="7">Inapakia maagizo...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.orders = data || [];

    zuneRenderAdminOrders(data || []);
  } catch (error) {
    console.error("ZUNE admin orders:", error);

    tableBody.innerHTML =
      '<tr><td colspan="7">Imeshindikana kupakia maagizo. Kagua RLS.</td></tr>';
  }
}

/* ---------- 8. ONYESHA MAAGIZO ---------- */

function zuneRenderAdminOrders(orders) {
  const tableBody = zuneAdminFindElement(
    "adminOrdersTableBody",
    "ordersTableBody",
    "adminOrdersList",
    "ordersList"
  );

  if (!tableBody) return;

  if (!orders.length) {
    tableBody.innerHTML =
      '<tr><td colspan="7">Hakuna maagizo yaliyopatikana.</td></tr>';
    return;
  }

  tableBody.innerHTML = orders.map(order => {
    const id = String(order.id || "");

    return `
      <tr>
        <td>${zuneAdminText(id)}</td>
        <td>${zuneAdminText(order.buyer_id)}</td>
        <td>${zuneAdminText(order.product_id)}</td>
        <td>${zuneAdminText(order.quantity)}</td>
        <td>${zuneAdminText(zuneAdminMoney(order.total_price))}</td>
        <td>${zuneAdminText(order.status)}</td>
        <td>${zuneAdminText(
          zuneApplicationDate(order.created_at)
        )}</td>
      </tr>
    `;
  }).join("");
}

/* ---------- 9. CHUJA MAAGIZO ---------- */

function zuneFilterAdminOrders() {
  const searchInput = zuneAdminFindElement(
    "adminOrdersSearch",
    "ordersSearch",
    "orderSearch"
  );

  const statusInput = zuneAdminFindElement(
    "adminOrdersStatus",
    "ordersStatusFilter",
    "orderStatusFilter"
  );

  const search = String(searchInput?.value || "")
    .trim()
    .toLowerCase();

  const status = String(statusInput?.value || "all")
    .trim()
    .toLowerCase();

  const orders = ZUNE_ADMIN.cache.orders || [];

  const filtered = orders.filter(order => {
    const text = [
      order.id,
      order.buyer_id,
      order.product_id,
      order.status
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = !search || text.includes(search);
    const currentStatus = String(order.status || "").toLowerCase();

    const matchesStatus =
      status === "all" ||
      status === "" ||
      currentStatus === status;

    return matchesSearch && matchesStatus;
  });

  zuneRenderAdminOrders(filtered);
}

/* ---------- 10. MUHTASARI WA MALIPO ---------- */

function zuneCalculateAdminOrderTotals(orders) {
  return (orders || []).reduce((totals, order) => {
    const status = String(order.status || "").toLowerCase();
    const amount = Number(order.total_price || 0);

    totals.orders += 1;

    if (Number.isFinite(amount)) {
      totals.orderValue += amount;
    }

    if (["completed", "confirmed"].includes(status)) {
      if (Number.isFinite(amount)) {
        totals.confirmedValue += amount;
      }
    }

    if (status === "completed") {
      if (Number.isFinite(amount)) {
        totals.completedValue += amount;
      }

      totals.completedOrders += 1;
    }

    if (status === "pending") {
      totals.pendingOrders += 1;
    }

    return totals;
  }, {
    orders: 0,
    orderValue: 0,
    confirmedValue: 0,
    completedValue: 0,
    completedOrders: 0,
    pendingOrders: 0
  });
}

function zuneRenderAdminOrderTotals(orders) {
  const totals = zuneCalculateAdminOrderTotals(orders);

  const mappings = [
    [
      ["statTotalOrders", "adminTotalOrders"],
      totals.orders
    ],
    [
      ["statTotalSales", "adminTotalSales"],
      zuneAdminMoney(totals.completedValue)
    ],
    [
      ["statPendingOrders", "adminPendingOrders"],
      totals.pendingOrders
    ],
    [
      ["statCompletedOrders", "adminCompletedOrders"],
      totals.completedOrders
    ],
    [
      ["statTotalOrderValue", "adminTotalOrderValue"],
      zuneAdminMoney(totals.orderValue)
    ]
  ];

  mappings.forEach(([ids, value]) => {
    const element = zuneAdminFindElement(...ids);
    if (element) element.textContent = String(value);
  });
}

/* ---------- 11. VITENDO VYA BIDHAA ---------- */

document.addEventListener("click", function(event) {
  const button = event.target.closest("[data-product-action]");

  if (!button) return;

  const action = button.dataset.productAction;
  const id = button.dataset.productId;

  if (action === "view") {
    zuneViewAdminProduct(id);
  }

  if (action === "delete") {
    zuneDeleteAdminProduct(id);
  }
});

/* ---------- 12. FILTER EVENTS ---------- */

[
  "adminProductsSearch",
  "productsSearch",
  "productSearch"
].forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("input", zuneFilterAdminProducts);
  }
});

[
  "adminOrdersSearch",
  "ordersSearch",
  "orderSearch",
  "adminOrdersStatus",
  "ordersStatusFilter",
  "orderStatusFilter"
].forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("input", zuneFilterAdminOrders);
    input.addEventListener("change", zuneFilterAdminOrders);
  }
});

/* ---------- MWISHO WA SEHEMU YA 6/10 ---------- */

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 7/10
// WATUMIAJI + WAUZAJI + TAKWIMU
// =====================================================

/* ---------- 1. PAKIA WASIFU WA WATUMIAJI ---------- */

async function zuneLoadAdminUsers() {
  const body = zuneAdminFindElement(
    "usersTableBody",
    "adminUsersTableBody",
    "usersList",
    "adminUsersList"
  );

  if (!body) return;

  body.innerHTML =
    '<tr><td colspan="6">Inapakia watumiaji...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("profiles")
      .select("id, full_name, phone_number, role, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.users = data || [];

    zuneRenderAdminUsers(data || []);
    zuneRenderAdminUserStats(data || []);
  } catch (error) {
    console.error("ZUNE admin users:", error);

    body.innerHTML =
      '<tr><td colspan="6">Imeshindikana kupakia watumiaji. Kagua RLS.</td></tr>';
  }
}

/* ---------- 2. ONYESHA WATUMIAJI ---------- */

function zuneRenderAdminUsers(users) {
  const body = zuneAdminFindElement(
    "usersTableBody",
    "adminUsersTableBody",
    "usersList",
    "adminUsersList"
  );

  if (!body) return;

  if (!users.length) {
    body.innerHTML =
      '<tr><td colspan="6">Hakuna watumiaji waliopatikana.</td></tr>';
    return;
  }

  body.innerHTML = users.map(user => {
    const id = String(user.id || "");

    return `
      <tr>
        <td>${zuneAdminText(user.full_name)}</td>
        <td>${zuneAdminText(user.phone_number)}</td>
        <td>${zuneAdminText(user.role)}</td>
        <td>${user.is_verified
          ? "Imethibitishwa"
          : "Haijathibitishwa"}</td>
        <td>${zuneAdminText(
          zuneApplicationDate(user.created_at)
        )}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-admin-user-action="view"
            data-user-id="${zuneEscapeHTML(id)}">
            Tazama
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 3. TAKWIMU ZA WATUMIAJI ---------- */

function zuneRenderAdminUserStats(users) {
  const total = users.length;
  const sellers = users.filter(
    user => user.role === "vendor"
  ).length;
  const buyers = users.filter(
    user => user.role === "buyer"
  ).length;
  const admins = users.filter(
    user => user.role === "admin"
  ).length;
  const verified = users.filter(
    user => user.is_verified === true
  ).length;

  const values = [
    [["statTotalCustomers", "statTotalUsers"], total],
    [["statTotalSellers", "adminTotalSellers"], sellers],
    [["statTotalBuyers", "adminTotalBuyers"], buyers],
    [["statTotalAdmins", "adminTotalAdmins"], admins],
    [["statVerifiedUsers", "adminVerifiedUsers"], verified]
  ];

  values.forEach(([ids, value]) => {
    const element = zuneAdminFindElement(...ids);

    if (element) {
      element.textContent = String(value);
    }
  });
}

/* ---------- 4. CHUJA WATUMIAJI ---------- */

function zuneFilterAdminUsers() {
  const searchInput = zuneAdminFindElement(
    "usersSearch",
    "userSearch",
    "adminUsersSearch"
  );

  const roleInput = zuneAdminFindElement(
    "usersRoleFilter",
    "userRoleFilter",
    "adminUsersRoleFilter"
  );

  const search = String(searchInput?.value || "")
    .trim()
    .toLowerCase();

  const selectedRole = String(roleInput?.value || "all")
    .trim()
    .toLowerCase();

  const users = ZUNE_ADMIN.cache.users || [];

  const filtered = users.filter(user => {
    const text = [
      user.id,
      user.full_name,
      user.phone_number,
      user.role
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch =
      !search || text.includes(search);

    const role = String(user.role || "").toLowerCase();

    const matchesRole =
      selectedRole === "all" ||
      selectedRole === "" ||
      role === selectedRole;

    return matchesSearch && matchesRole;
  });

  zuneRenderAdminUsers(filtered);
}

/* ---------- 5. TAARIFA ZA MTUMIAJI ---------- */

function zuneViewAdminUser(userId) {
  const user = (ZUNE_ADMIN.cache.users || [])
    .find(item => String(item.id) === String(userId));

  if (!user) {
    if (typeof zuneToast === "function") {
      zuneToast("Mtumiaji hajapatikana.", "error");
    }
    return;
  }

  const fields = [
    ["Jina kamili", user.full_name],
    ["Namba ya simu", user.phone_number],
    ["Aina ya akaunti", user.role],
    [
      "Uthibitishaji",
      user.is_verified ? "Imethibitishwa" : "Haijathibitishwa"
    ],
    ["Tarehe ya kujiunga", zuneApplicationDate(user.created_at)],
    ["Kitambulisho cha wasifu", user.id]
  ];

  const html = fields.map(([label, value]) => `
    <div class="zune-admin-detail-row">
      <strong>${zuneEscapeHTML(label)}:</strong>
      <span>${zuneEscapeHTML(
        value === null || value === undefined || value === ""
          ? "—"
          : String(value)
      )}</span>
    </div>
  `).join("");

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview(
      "Taarifa za Mtumiaji",
      `<div class="zune-admin-details">${html}</div>`
    );
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const title = document.getElementById("adminPreviewTitle");
  const body = document.getElementById("adminPreviewBody");

  if (modal && title && body) {
    title.textContent = "Taarifa za Mtumiaji";
    body.innerHTML = `<div class="zune-admin-details">${html}</div>`;
    modal.hidden = false;
    modal.classList.add("is-open");
  }
}

/* ---------- 6. PAKIA TAKWIMU ZA DASHBOARD ---------- */

async function zuneLoadAdminAnalytics() {
  try {
    const results = await Promise.all([
      zuneSupabase
        .from("profiles")
        .select("id, role, is_verified, created_at"),

      zuneSupabase
        .from("products")
        .select("id, price, stock_quantity, created_at"),

      zuneSupabase
        .from("orders")
        .select("id, total_price, status, created_at"),

      zuneSupabase
        .from("seller_applications")
        .select("id, status, created_at")
    ]);

    const names = [
      "profiles",
      "products",
      "orders",
      "seller_applications"
    ];

    const failed = results.find(result => result.error);

    if (failed) {
      console.error(
        "ZUNE analytics query error:",
        failed.error
      );

      if (typeof zuneToast === "function") {
        zuneToast(
          "Baadhi ya takwimu hazijapatikana. Kagua ruhusa za RLS.",
          "error"
        );
      }

      return;
    }

    const profiles = results[0].data || [];
    const products = results[1].data || [];
    const orders = results[2].data || [];
    const applications = results[3].data || [];

    ZUNE_ADMIN.cache.analytics = {
      profiles,
      products,
      orders,
      applications
    };

    zuneRenderAdminAnalytics({
      profiles,
      products,
      orders,
      applications
    });
  } catch (error) {
    console.error("ZUNE analytics error:", error);
  }
}

/* ---------- 7. CHAMBUA TAKWIMU ---------- */

function zuneRenderAdminAnalytics(data) {
  const profiles = data.profiles || [];
  const products = data.products || [];
  const orders = data.orders || [];
  const applications = data.applications || [];

  const orderTotals = zuneCalculateAdminOrderTotals(orders);

  const stats = [
    [
      ["analyticsTotalUsers", "statAnalyticsUsers"],
      profiles.length
    ],
    [
      ["analyticsTotalProducts", "statAnalyticsProducts"],
      products.length
    ],
    [
      ["analyticsTotalOrders", "statAnalyticsOrders"],
      orders.length
    ],
    [
      ["analyticsCompletedOrders", "statAnalyticsCompleted"],
      orderTotals.completedOrders
    ],
    [
      ["analyticsOrderValue", "statAnalyticsSales"],
      zuneAdminMoney(orderTotals.completedValue)
    ],
    [
      ["analyticsPendingApplications", "statAnalyticsPendingApps"],
      applications.filter(app =>
        String(app.status || "pending").toLowerCase() === "pending"
      ).length
    ]
  ];

  stats.forEach(([ids, value]) => {
    const element = zuneAdminFindElement(...ids);

    if (element) {
      element.textContent = String(value);
    }
  });

  zuneRenderAdminMonthlyOrders(orders);
}

/* ---------- 8. TAKWIMU ZA MAAGIZO KWA MWEZI ---------- */

function zuneRenderAdminMonthlyOrders(orders) {
  const container = zuneAdminFindElement(
    "adminMonthlyOrders",
    "monthlyOrdersChart",
    "analyticsMonthlyOrders"
  );

  if (!container) return;

  const monthly = new Map();

  (orders || []).forEach(order => {
    if (!order.created_at) return;

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) return;

    const key =
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    monthly.set(key, (monthly.get(key) || 0) + 1);
  });

  const entries = Array.from(monthly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);

  if (!entries.length) {
    container.textContent = "Hakuna takwimu za maagizo bado.";
    return;
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);

  container.innerHTML = entries.map(([month, count]) => {
    const width = Math.max(4, Math.round((count / max) * 100));

    return `
      <div class="zune-admin-chart-row">
        <span>${zuneEscapeHTML(month)}</span>
        <div class="zune-admin-chart-track">
          <div class="zune-admin-chart-bar"
            style="width:${width}%"></div>
        </div>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
}

/* ---------- 9. VIFUNGO VYA WATUMIAJI ---------- */

document.addEventListener("click", function(event) {
  const button = event.target.closest(
    "[data-admin-user-action]"
  );

  if (!button) return;

  if (button.dataset.adminUserAction === "view") {
    zuneViewAdminUser(button.dataset.userId);
  }
});

/* ---------- 10. EVENTS ZA UTAFUTAJI ---------- */

[
  "usersSearch",
  "userSearch",
  "adminUsersSearch"
].forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("input", zuneFilterAdminUsers);
  }
});

[
  "usersRoleFilter",
  "userRoleFilter",
  "adminUsersRoleFilter"
].forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("change", zuneFilterAdminUsers);
  }
});

/* ---------- MWISHO WA SEHEMU YA 7/10 ---------- */

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 8/10
// MATANGAZO + NOTIFICATIONS + SLIDE BANNER
// =====================================================

/*
  Jedwali linalotarajiwa: admin_announcements

  Sehemu hii inajaribu kutumia jedwali hilo.
  Ikiwa halipo au RLS imezuia, utaona ujumbe wa hitilafu.
*/

/* ---------- 1. HELPER ZA MATANGAZO ---------- */

function zuneAnnouncementValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function zuneAnnouncementFormatDate(value) {
  if (!value) return "Hakuna tarehe ya mwisho";

  return zuneApplicationDate(value);
}

function zuneAnnouncementTargetLabel(target) {
  const labels = {
    all: "Wateja na wauzaji wote",
    buyers: "Wateja pekee",
    sellers: "Wauzaji pekee"
  };

  return labels[target] || target || "Wote";
}

function zuneAnnouncementTypeLabel(type) {
  const labels = {
    notification: "Notification pekee",
    banner: "Slide banner pekee",
    both: "Notification na banner"
  };

  return labels[type] || type || "—";
}

function zuneAnnouncementPriorityLabel(priority) {
  const labels = {
    low: "Chini",
    normal: "Kawaida",
    high: "Juu",
    urgent: "Dharura"
  };

  return labels[priority] || priority || "Kawaida";
}

/* ---------- 2. HAKIKI YA TANGAZO ---------- */

function zunePreviewAnnouncement() {
  const title = zuneAdminFindElement(
    "announcementTitle",
    "adminAnnouncementTitle"
  );

  const message = zuneAdminFindElement(
    "announcementMessage",
    "adminAnnouncementMessage"
  );

  const audience = zuneAdminFindElement(
    "announcementAudience",
    "adminAnnouncementAudience"
  );

  const type = zuneAdminFindElement(
    "announcementType",
    "adminAnnouncementType"
  );

  const priority = zuneAdminFindElement(
    "announcementPriority",
    "adminAnnouncementPriority"
  );

  const expiry = zuneAdminFindElement(
    "announcementExpiresAt",
    "adminAnnouncementExpiresAt"
  );

  const titleValue = String(title?.value || "").trim();
  const messageValue = String(message?.value || "").trim();

  if (!titleValue || !messageValue) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Jaza kichwa na ujumbe kabla ya kuona hakiki.",
        "error"
      );
    }
    return;
  }

  const targetValue = audience?.value || "all";
  const typeValue = type?.value || "both";
  const priorityValue = priority?.value || "normal";

  const expiryValue = expiry?.value
    ? zuneAnnouncementFormatDate(expiry.value)
    : "Hakuna tarehe ya mwisho";

  const html = `
    <div class="zune-announcement-preview">
      <p><strong>Walengwa:</strong>
        ${zuneEscapeHTML(zuneAnnouncementTargetLabel(targetValue))}
      </p>
      <p><strong>Aina:</strong>
        ${zuneEscapeHTML(zuneAnnouncementTypeLabel(typeValue))}
      </p>
      <p><strong>Kipaumbele:</strong>
        ${zuneEscapeHTML(zuneAnnouncementPriorityLabel(priorityValue))}
      </p>
      <p><strong>Mwisho:</strong>
        ${zuneEscapeHTML(expiryValue)}
      </p>
      <hr>
      <h3>${zuneEscapeHTML(titleValue)}</h3>
      <p>${zuneEscapeHTML(messageValue).replace(/\n/g, "<br>")}</p>
    </div>
  `;

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview("Hakiki ya Tangazo", html);
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const modalTitle = document.getElementById("adminPreviewTitle");
  const modalBody = document.getElementById("adminPreviewBody");

  if (modal && modalTitle && modalBody) {
    modalTitle.textContent = "Hakiki ya Tangazo";
    modalBody.innerHTML = html;
    modal.hidden = false;
    modal.classList.add("is-open");
  }
}

/* ---------- 3. PAKIA MATANGAZO ---------- */

async function zuneLoadAnnouncements() {
  const body = zuneAdminFindElement(
    "announcementsTableBody",
    "adminAnnouncementsTableBody",
    "announcementsList"
  );

  if (!body) return;

  body.innerHTML =
    '<tr><td colspan="7">Inapakia matangazo...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("admin_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.announcements = data || [];

    zuneRenderAnnouncements(data || []);
  } catch (error) {
    console.error("ZUNE announcements load error:", error);

    body.innerHTML =
      '<tr><td colspan="7">Matangazo hayajapakiwa. Hakikisha jedwali la admin_announcements lipo na RLS inaruhusu admin.</td></tr>';
  }
}

/* ---------- 4. ONYESHA MATANGAZO ---------- */

function zuneRenderAnnouncements(announcements) {
  const body = zuneAdminFindElement(
    "announcementsTableBody",
    "adminAnnouncementsTableBody",
    "announcementsList"
  );

  if (!body) return;

  if (!announcements.length) {
    body.innerHTML =
      '<tr><td colspan="7">Hakuna matangazo yaliyopo.</td></tr>';
    return;
  }

  body.innerHTML = announcements.map(item => {
    const id = String(item.id || "");
    const title = zuneAnnouncementValue(item.title);
    const target = item.audience || item.target_audience || "all";
    const type = item.type || item.display_type || "both";
    const priority = item.priority || "normal";
    const status = item.is_active === false ? "Limesimamishwa" : "Linaendelea";

    return `
      <tr>
        <td>${zuneAdminText(title)}</td>
        <td>${zuneAdminText(zuneAnnouncementTargetLabel(target))}</td>
        <td>${zuneAdminText(zuneAnnouncementTypeLabel(type))}</td>
        <td>${zuneAdminText(zuneAnnouncementPriorityLabel(priority))}</td>
        <td>${zuneAdminText(status)}</td>
        <td>${zuneAdminText(
          zuneAnnouncementFormatDate(item.expires_at)
        )}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-announcement-action="edit"
            data-announcement-id="${zuneEscapeHTML(id)}">
            Hariri
          </button>
          <button type="button"
            class="zune-admin-btn zune-admin-btn-danger"
            data-announcement-action="stop"
            data-announcement-id="${zuneEscapeHTML(id)}">
            Simamisha
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 5. HIFADHI TANGAZO JIPYA AU MABADILIKO ---------- */

async function zuneSaveAnnouncement(announcementId = null) {
  if (!ZUNE_ADMIN.isAdmin) {
    if (typeof zuneToast === "function") {
      zuneToast("Ni admin pekee anayeruhusiwa.", "error");
    }
    return;
  }

  const title = zuneAdminFindElement(
    "announcementTitle",
    "adminAnnouncementTitle"
  );

  const message = zuneAdminFindElement(
    "announcementMessage",
    "adminAnnouncementMessage"
  );

  const audience = zuneAdminFindElement(
    "announcementAudience",
    "adminAnnouncementAudience"
  );

  const type = zuneAdminFindElement(
    "announcementType",
    "adminAnnouncementType"
  );

  const priority = zuneAdminFindElement(
    "announcementPriority",
    "adminAnnouncementPriority"
  );

  const expiry = zuneAdminFindElement(
    "announcementExpiresAt",
    "adminAnnouncementExpiresAt"
  );

  const titleValue = String(title?.value || "").trim();
  const messageValue = String(message?.value || "").trim();

  if (!titleValue || !messageValue) {
    if (typeof zuneToast === "function") {
      zuneToast("Kichwa na ujumbe vinahitajika.", "error");
    }
    return;
  }

  const expiresAt = expiry?.value
    ? new Date(expiry.value).toISOString()
    : null;

  if (
    expiresAt &&
    new Date(expiresAt).getTime() <= Date.now()
  ) {
    if (typeof zuneToast === "function") {
      zuneToast("Tarehe ya mwisho lazima iwe mbele ya sasa.", "error");
    }
    return;
  }

  /*
    Majina ya safu hapa yanapaswa kuendana na schema
    ya jedwali la admin_announcements.
  */
  const payload = {
    title: titleValue,
    message: messageValue,
    audience: audience?.value || "all",
    type: type?.value || "both",
    priority: priority?.value || "normal",
    expires_at: expiresAt,
    is_active: true
  };

  try {
    let result;

    if (announcementId) {
      result = await zuneSupabase
        .from("admin_announcements")
        .update(payload)
        .eq("id", announcementId);
    } else {
      result = await zuneSupabase
        .from("admin_announcements")
        .insert(payload);
    }

    if (result.error) throw result.error;

    if (typeof zuneToast === "function") {
      zuneToast(
        announcementId
          ? "Tangazo limehaririwa."
          : "Tangazo limehifadhiwa.",
        "success"
      );
    }

    const form = zuneAdminFindElement(
      "announcementForm",
      "adminAnnouncementForm"
    );

    if (form && !announcementId) form.reset();

    await zuneLoadAnnouncements();
  } catch (error) {
    console.error("ZUNE save announcement error:", error);

    if (typeof zuneToast === "function") {
      zuneToast(
        "Tangazo halijahifadhiwa. Kagua jedwali, majina ya safu na sera za RLS.",
        "error"
      );
    }
  }
}

/* ---------- 6. JAZA FOMU ILI KUHARIRI ---------- */

function zuneEditAnnouncement(announcementId) {
  const item = (ZUNE_ADMIN.cache.announcements || [])
    .find(row => String(row.id) === String(announcementId));

  if (!item) {
    if (typeof zuneToast === "function") {
      zuneToast("Tangazo halijapatikana.", "error");
    }
    return;
  }

  const title = zuneAdminFindElement(
    "announcementTitle",
    "adminAnnouncementTitle"
  );

  const message = zuneAdminFindElement(
    "announcementMessage",
    "adminAnnouncementMessage"
  );

  const audience = zuneAdminFindElement(
    "announcementAudience",
    "adminAnnouncementAudience"
  );

  const type = zuneAdminFindElement(
    "announcementType",
    "adminAnnouncementType"
  );

  const priority = zuneAdminFindElement(
    "announcementPriority",
    "adminAnnouncementPriority"
  );

  const expiry = zuneAdminFindElement(
    "announcementExpiresAt",
    "adminAnnouncementExpiresAt"
  );

  if (title) title.value = item.title || "";
  if (message) message.value = item.message || "";
  if (audience) audience.value =
    item.audience || item.target_audience || "all";
  if (type) type.value = item.type || item.display_type || "both";
  if (priority) priority.value = item.priority || "normal";

  if (expiry) {
    expiry.value = item.expires_at
      ? new Date(item.expires_at).toISOString().slice(0, 16)
      : "";
  }

  const idField = zuneAdminFindElement(
    "announcementEditId",
    "adminAnnouncementEditId"
  );

  if (idField) idField.value = String(item.id);

  const form = zuneAdminFindElement(
    "announcementForm",
    "adminAnnouncementForm"
  );

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/* ---------- 7. SIMAMISHA TANGAZO ---------- */

async function zuneStopAnnouncement(announcementId) {
  if (!ZUNE_ADMIN.isAdmin) {
    if (typeof zuneToast === "function") {
      zuneToast("Huna ruhusa ya kusimamisha tangazo.", "error");
    }
    return;
  }

  if (!window.confirm("Unataka kusimamisha tangazo hili?")) {
    return;
  }

  try {
    const { error } = await zuneSupabase
      .from("admin_announcements")
      .update({ is_active: false })
      .eq("id", announcementId);

    if (error) throw error;

    if (typeof zuneToast === "function") {
      zuneToast("Tangazo limesimamishwa.", "success");
    }

    await zuneLoadAnnouncements();
  } catch (error) {
    console.error("ZUNE stop announcement error:", error);

    if (typeof zuneToast === "function") {
      zuneToast(
        "Imeshindikana kusimamisha tangazo. Kagua schema na RLS.",
        "error"
      );
    }
  }
}

/* ---------- 8. VITENDO VYA MATANGAZO ---------- */

document.addEventListener("click", function(event) {
  const button = event.target.closest("[data-announcement-action]");
  if (!button) return;

  const action = button.dataset.announcementAction;
  const id = button.dataset.announcementId;

  if (action === "edit") {
    zuneEditAnnouncement(id);
  } else if (action === "stop") {
    zuneStopAnnouncement(id);
  }
});

/* ---------- 9. FOMU YA MATANGAZO ---------- */

const zuneAnnouncementForm = zuneAdminFindElement(
  "announcementForm",
  "adminAnnouncementForm"
);

if (zuneAnnouncementForm) {
  zuneAnnouncementForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const editId = zuneAdminFindElement(
      "announcementEditId",
      "adminAnnouncementEditId"
    );

    zuneSaveAnnouncement(editId?.value || null);
  });
}

const zuneAnnouncementPreviewButton = zuneAdminFindElement(
  "previewAnnouncementBtn",
  "adminPreviewAnnouncementBtn"
);

if (zuneAnnouncementPreviewButton) {
  zuneAnnouncementPreviewButton.addEventListener(
    "click",
    zunePreviewAnnouncement
  );
}

/* ---------- MWISHO WA SEHEMU YA 8/10 ---------- */

// =====================================================
// ZUNE ADMIN DASHBOARD
// SEHEMU YA 9/10
// RIPOTI + USAIDIZI + MALALAMIKO + AUDIT LOG
// =====================================================

/* ---------- 1. HELPER ZA RIPOTI ---------- */

function zuneReportDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function zuneReportCSV(rows) {
  return rows.map(row =>
    row.map(value => {
      const safeValue = String(
        value === null || value === undefined ? "" : value
      );

      return `"${safeValue.replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\r\n");
}

/* ---------- 2. RIPOTI YA MAAGIZO CSV ---------- */

function zuneExportOrdersCSV() {
  const orders = ZUNE_ADMIN.cache.orders || [];

  if (!orders.length) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Hakuna maagizo yaliyopakiwa ya kutengeneza ripoti.",
        "error"
      );
    }
    return;
  }

  const rows = [
    [
      "Order ID",
      "Buyer ID",
      "Product ID",
      "Quantity",
      "Total Price",
      "Status",
      "Created At"
    ],
    ...orders.map(order => [
      order.id,
      order.buyer_id,
      order.product_id,
      order.quantity,
      order.total_price,
      order.status,
      order.created_at
    ])
  ];

  zuneReportDownload(
    "zune-orders-report.csv",
    "\uFEFF" + zuneReportCSV(rows),
    "text/csv;charset=utf-8;"
  );

  if (typeof zuneToast === "function") {
    zuneToast("Ripoti ya maagizo imepakuliwa.", "success");
  }
}

/* ---------- 3. RIPOTI YA BIDHAA CSV ---------- */

function zuneExportProductsCSV() {
  const products = ZUNE_ADMIN.cache.products || [];

  if (!products.length) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Hakuna bidhaa zilizopakiwa za kutengeneza ripoti.",
        "error"
      );
    }
    return;
  }

  const rows = [
    [
      "Product ID",
      "Title",
      "Price",
      "Stock Quantity",
      "Vendor ID",
      "Created At"
    ],
    ...products.map(product => [
      product.id,
      product.title,
      product.price,
      product.stock_quantity,
      product.vendor_id,
      product.created_at
    ])
  ];

  zuneReportDownload(
    "zune-products-report.csv",
    "\uFEFF" + zuneReportCSV(rows),
    "text/csv;charset=utf-8;"
  );

  if (typeof zuneToast === "function") {
    zuneToast("Ripoti ya bidhaa imepakuliwa.", "success");
  }
}

/* ---------- 4. RIPOTI YA WATUMIAJI CSV ---------- */

function zuneExportUsersCSV() {
  const users = ZUNE_ADMIN.cache.users || [];

  if (!users.length) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Hakuna watumiaji waliopakiwa wa kutengeneza ripoti.",
        "error"
      );
    }
    return;
  }

  const rows = [
    [
      "Profile ID",
      "Full Name",
      "Phone Number",
      "Role",
      "Verified",
      "Created At"
    ],
    ...users.map(user => [
      user.id,
      user.full_name,
      user.phone_number,
      user.role,
      user.is_verified,
      user.created_at
    ])
  ];

  zuneReportDownload(
    "zune-users-report.csv",
    "\uFEFF" + zuneReportCSV(rows),
    "text/csv;charset=utf-8;"
  );

  if (typeof zuneToast === "function") {
    zuneToast("Ripoti ya watumiaji imepakuliwa.", "success");
  }
}

/* ---------- 5. RIPOTI YA MUHTASARI ---------- */

function zuneExportSummaryCSV() {
  const users = ZUNE_ADMIN.cache.users || [];
  const products = ZUNE_ADMIN.cache.products || [];
  const orders = ZUNE_ADMIN.cache.orders || [];
  const applications =
    ZUNE_ADMIN.cache.sellerApplications || [];

  const totals = zuneCalculateAdminOrderTotals(orders);

  const rows = [
    ["ZUNE ADMIN SUMMARY"],
    ["Tarehe ya ripoti", new Date().toISOString()],
    [],
    ["Kipimo", "Thamani"],
    ["Watumiaji waliopakiwa", users.length],
    ["Wateja", users.filter(user => user.role === "buyer").length],
    ["Wauzaji", users.filter(user => user.role === "vendor").length],
    ["Bidhaa", products.length],
    ["Maagizo", orders.length],
    ["Maagizo yaliyokamilika", totals.completedOrders],
    ["Thamani ya maagizo yaliyokamilika (TZS)", totals.completedValue],
    [
      "Maombi ya wauzaji yanayosubiri",
      applications.filter(app =>
        String(app.status || "pending").toLowerCase() === "pending"
      ).length
    ]
  ];

  zuneReportDownload(
    "zune-summary-report.csv",
    "\uFEFF" + zuneReportCSV(rows),
    "text/csv;charset=utf-8;"
  );
}

/* ---------- 6. CHAPISHA RIPOTI / HIFADHI PDF ---------- */

function zunePrintAdminReport() {
  const report = zuneAdminFindElement(
    "adminReportContent",
    "reportsContent",
    "adminAnalyticsReport"
  );

  if (!report) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Sehemu ya ripoti haijapatikana. Fungua ukurasa wa ripoti kwanza.",
        "error"
      );
    }
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    if (typeof zuneToast === "function") {
      zuneToast(
        "Browser imezuia dirisha la uchapishaji. Ruhusu pop-ups kisha jaribu tena.",
        "error"
      );
    }
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="sw">
    <head>
      <meta charset="UTF-8">
      <title>ZUNE Admin Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #172033;
        }
        h1, h2 { color: #15803d; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
        }
        th { background: #f3f4f6; }
        @media print {
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <h1>ZUNE Marketplace</h1>
      <h2>Ripoti ya Admin</h2>
      <p>Tarehe: ${zuneEscapeHTML(new Date().toLocaleString("sw-TZ"))}</p>
      ${report.innerHTML}
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

/* ---------- 7. PAKIA MALALAMIKO / USAIDIZI ---------- */

/*
  Jedwali linalotarajiwa: support_tickets

  Kwa sababu schema halijathibitishwa, code inasoma
  rekodi zilizopo bila kudhani majina ya safu maalum.
*/

async function zuneLoadSupportTickets() {
  const body = zuneAdminFindElement(
    "supportTicketsTableBody",
    "adminSupportTableBody",
    "supportTicketsList",
    "complaintsTableBody"
  );

  if (!body) return;

  body.innerHTML =
    '<tr><td colspan="6">Inapakia maombi ya usaidizi...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    ZUNE_ADMIN.cache.supportTickets = data || [];

    zuneRenderSupportTickets(data || []);
  } catch (error) {
    console.error("ZUNE support tickets:", error);

    body.innerHTML =
      '<tr><td colspan="6">Imeshindikana kupakia maombi. Hakikisha jedwali support_tickets lipo na RLS inaruhusu admin.</td></tr>';
  }
}

/* ---------- 8. ONYESHA MALALAMIKO ---------- */

function zuneRenderSupportTickets(tickets) {
  const body = zuneAdminFindElement(
    "supportTicketsTableBody",
    "adminSupportTableBody",
    "supportTicketsList",
    "complaintsTableBody"
  );

  if (!body) return;

  if (!tickets.length) {
    body.innerHTML =
      '<tr><td colspan="6">Hakuna maombi ya usaidizi.</td></tr>';
    return;
  }

  body.innerHTML = tickets.map(ticket => {
    const id = String(ticket.id || "");
    const subject =
      ticket.subject ||
      ticket.title ||
      ticket.category ||
      "Ombi la usaidizi";

    const user =
      ticket.user_id ||
      ticket.profile_id ||
      ticket.customer_id ||
      "—";

    const status = ticket.status || "pending";

    return `
      <tr>
        <td>${zuneAdminText(id)}</td>
        <td>${zuneAdminText(subject)}</td>
        <td>${zuneAdminText(user)}</td>
        <td>${zuneAdminText(status)}</td>
        <td>${zuneAdminText(
          zuneApplicationDate(ticket.created_at)
        )}</td>
        <td>
          <button type="button"
            class="zune-admin-btn"
            data-support-action="view"
            data-support-id="${zuneEscapeHTML(id)}">
            Tazama
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ---------- 9. TAZAMA OMBI LA USAIDIZI ---------- */

function zuneViewSupportTicket(ticketId) {
  const ticket = (
    ZUNE_ADMIN.cache.supportTickets || []
  ).find(item => String(item.id) === String(ticketId));

  if (!ticket) {
    if (typeof zuneToast === "function") {
      zuneToast("Ombi halijapatikana.", "error");
    }
    return;
  }

  const safeFields = [
    "id",
    "subject",
    "title",
    "category",
    "message",
    "description",
    "user_id",
    "profile_id",
    "customer_id",
    "status",
    "created_at",
    "updated_at"
  ];

  const html = safeFields
    .filter(key =>
      ticket[key] !== undefined &&
      ticket[key] !== null &&
      ticket[key] !== ""
    )
    .map(key => `
      <div class="zune-admin-detail-row">
        <strong>${zuneEscapeHTML(key)}:</strong>
        <span>${zuneEscapeHTML(String(ticket[key]))}</span>
      </div>
    `)
    .join("");

  if (typeof zuneShowPreview === "function") {
    zuneShowPreview(
      "Maelezo ya Ombi la Usaidizi",
      `<div class="zune-admin-details">${html}</div>`
    );
    return;
  }

  const modal = document.getElementById("adminPreviewModal");
  const title = document.getElementById("adminPreviewTitle");
  const body = document.getElementById("adminPreviewBody");

  if (modal && title && body) {
    title.textContent = "Maelezo ya Ombi la Usaidizi";
    body.innerHTML = `<div class="zune-admin-details">${html}</div>`;
    modal.hidden = false;
    modal.classList.add("is-open");
  }
}

/* ---------- 10. AUDIT LOG ---------- */

/*
  Jedwali linalotarajiwa: admin_audit_logs

  Kumbuka: log ya kweli ya usalama inapaswa kuandikwa
  upande wa server/database, si kutegemea browser pekee.
*/

async function zuneLoadAuditLogs() {
  const body = zuneAdminFindElement(
    "auditLogsTableBody",
    "adminAuditTableBody",
    "auditLogsList"
  );

  if (!body) return;

  body.innerHTML =
    '<tr><td colspan="5">Inapakia kumbukumbu...</td></tr>';

  try {
    const { data, error } = await zuneSupabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    ZUNE_ADMIN.cache.auditLogs = data || [];

    zuneRenderAuditLogs(data || []);
  } catch (error) {
    console.error("ZUNE audit logs:", error);

    body.innerHTML =
      '<tr><td colspan="5">Kumbukumbu hazijapatikana. Hakikisha jedwali admin_audit_logs lipo na RLS inaruhusu kusoma.</td></tr>';
  }
}

/* ---------- 11. ONYESHA AUDIT LOG ---------- */

function zuneRenderAuditLogs(logs) {
  const body = zuneAdminFindElement(
    "auditLogsTableBody",
    "adminAuditTableBody",
    "auditLogsList"
  );

  if (!body) return;

  if (!logs.length) {
    body.innerHTML =
      '<tr><td colspan="5">Hakuna kumbukumbu za shughuli.</td></tr>';
    return;
  }

  body.innerHTML = logs.map(log => {
    const actor =
      log.admin_id ||
      log.user_id ||
      log.actor_id ||
      "—";

    const action =
      log.action ||
      log.event ||
      log.action_type ||
      "Shughuli";

    const target =
      log.target_id ||
      log.record_id ||
      log.entity_id ||
      "—";

    return `
      <tr>
        <td>${zuneAdminText(
          zuneApplicationDate(log.created_at)
        )}</td>
        <td>${zuneAdminText(actor)}</td>
        <td>${zuneAdminText(action)}</td>
        <td>${zuneAdminText(target)}</td>
        <td>${zuneAdminText(
          log.details || log.description || "—"
        )}</td>
      </tr>
    `;
  }).join("");
}

/* ---------- 12. VIFUNGO VYA RIPOTI NA USAIDIZI ---------- */

document.addEventListener("click", function(event) {
  const supportButton = event.target.closest(
    "[data-support-action]"
  );

  if (supportButton) {
    if (supportButton.dataset.supportAction === "view") {
      zuneViewSupportTicket(
        supportButton.dataset.supportId
      );
    }
    return;
  }

  const button = event.target.closest("[data-admin-export]");

  if (!button) return;

  const type = button.dataset.adminExport;

  if (type === "orders") zuneExportOrdersCSV();
  if (type === "products") zuneExportProductsCSV();
  if (type === "users") zuneExportUsersCSV();
  if (type === "summary") zuneExportSummaryCSV();
  if (type === "print") zunePrintAdminReport();
});

/* ---------- MWISHO WA SEHEMU YA 9/10 ---------- */

/* =========================================================
   ZUNE ADMIN DASHBOARD
   SEHEMU YA 10/10
   PAGE NAVIGATION + INITIALIZATION + FINAL UI WIRING
   ========================================================= */

(function zuneAdminFinalSetup() {
  "use strict";

  // ---------------------------------------------------------
  // 1. UJUMBE NA TOAST
  // ---------------------------------------------------------

  function zuneFinalMessage(message, type = "info") {
    const toast = document.getElementById("adminToast");
    const toastMessage = document.getElementById("adminToastMessage");

    if (toast && toastMessage) {
      toastMessage.textContent = message;

      toast.dataset.type = type;
      toast.hidden = false;
      toast.style.display = "block";

      if (toast.dataset.hideTimer) {
        clearTimeout(Number(toast.dataset.hideTimer));
      }

      const timer = setTimeout(() => {
        toast.hidden = true;
        toast.style.display = "none";
      }, 4500);

      toast.dataset.hideTimer = String(timer);
      return;
    }

    const globalMessage =
      document.getElementById("adminGlobalMessage");

    if (globalMessage) {
      globalMessage.textContent = message;
      globalMessage.dataset.type = type;
      globalMessage.hidden = false;
      return;
    }

    console.log("[ZUNE ADMIN]", message);
  }

  // ---------------------------------------------------------
  // 2. KUONYESHA UJUMBE KWENYE UKURASA
  // ---------------------------------------------------------

  function zuneFinalPageMessage(pageId, message) {
    const page = document.getElementById(pageId);

    if (!page) {
      zuneFinalMessage(message);
      return;
    }

    let notice = page.querySelector(
      "[data-zune-page-notice]"
    );

    if (!notice) {
      notice = document.createElement("div");
      notice.dataset.zunePageNotice = "true";

      notice.style.padding = "14px";
      notice.style.margin = "16px 0";
      notice.style.borderRadius = "12px";
      notice.style.background = "#f1f5f9";
      notice.style.color = "#334155";
      notice.style.fontSize = "14px";
      notice.style.lineHeight = "1.6";

      page.prepend(notice);
    }

    notice.textContent = message;
  }

  // ---------------------------------------------------------
  // 3. KUHAMA KATI YA PAGES
  // ---------------------------------------------------------

  function zuneFinalGetPageId(pageName) {
    const name = String(pageName || "")
      .trim()
      .replace(/^page-/, "");

    return "page-" + name;
  }

  function zuneFinalNavigate(pageName) {
    const pageId = zuneFinalGetPageId(pageName);
    const target = document.getElementById(pageId);

    if (!target) {
      zuneFinalMessage(
        "Ukurasa haujapatikana kwenye admin.html: " + pageId,
        "error"
      );
      return false;
    }

    const pages = document.querySelectorAll(
      '[id^="page-"]'
    );

    pages.forEach((page) => {
      if (
        page.tagName === "SECTION" ||
        page.classList.contains("admin-page") ||
        page.classList.contains("page-content")
      ) {
        page.hidden = page.id !== pageId;

        if (page.id === pageId) {
          page.style.display = "";
          page.setAttribute("aria-hidden", "false");
        } else {
          page.setAttribute("aria-hidden", "true");
        }
      }
    });

    // In case the target uses a different page class.
    target.hidden = false;
    target.style.display = "";
    target.setAttribute("aria-hidden", "false");

    document.querySelectorAll("[data-page]").forEach((button) => {
      const buttonPage = String(
        button.dataset.page || ""
      ).replace(/^page-/, "");

      const active = buttonPage ===
        String(pageName || "").replace(/^page-/, "");

      button.classList.toggle("active", active);
      button.classList.toggle("is-active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    try {
      if (typeof ZUNE_ADMIN !== "undefined") {
        ZUNE_ADMIN.currentPage = pageId;
      }
    } catch (error) {
      console.debug("Current page state haikuwekwa.", error);
    }

    zuneFinalLoadPage(pageName);
    return true;
  }

  // ---------------------------------------------------------
  // 4. KUPAKIA TAARIFA ZA UKURASA ULIOCHAGULIWA
  // ---------------------------------------------------------

  async function zuneFinalSafeCall(functionName) {
    try {
      const loader = window[functionName];

      if (typeof loader === "function") {
        await loader();
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "[ZUNE ADMIN] Loader error:",
        functionName,
        error
      );

      zuneFinalMessage(
        "Imeshindikana kupakia baadhi ya taarifa. " +
        "Kagua muunganisho wa database na ruhusa za RLS.",
        "error"
      );

      return false;
    }
  }

  async function zuneFinalLoadPage(pageName) {
    const name = String(pageName || "")
      .replace(/^page-/, "");

    switch (name) {
      case "overview":
        await zuneFinalSafeCall("zuneLoadOverview");
        break;

      case "analytics":
        await zuneFinalSafeCall("zuneLoadAdminAnalytics");
        break;

      case "users":
        if (
          typeof window.zuneLoadAdminUsers === "function"
        ) {
          await zuneFinalSafeCall("zuneLoadAdminUsers");
        } else {
          await zuneFinalSafeCall("zuneLoadUsers");
        }
        break;

      case "sellers":
        await zuneFinalSafeCall("zuneLoadAdminUsers");
        await zuneFinalSafeCall("zuneLoadOverview");
        break;

      case "seller-applications":
        await zuneFinalSafeCall(
          "zuneLoadSellerApplications"
        );
        break;

      case "verification":
        await zuneFinalSafeCall(
          "zuneLoadVerificationRequests"
        );
        break;

      case "products":
        await zuneFinalSafeCall("zuneLoadAdminProducts");
        break;

      case "orders":
        await zuneFinalSafeCall("zuneLoadAdminOrders");

        // Kokotoa jumla ikiwa kazi hiyo ipo.
        await zuneFinalSafeCall(
          "zuneRenderAdminOrderTotals"
        );
        break;

      case "announcements":
        await zuneFinalSafeCall("zuneLoadAnnouncements");
        break;

      case "support":
        await zuneFinalSafeCall("zuneLoadSupportTickets");
        break;

      case "audit":
        await zuneFinalSafeCall("zuneLoadAuditLogs");
        break;

      case "reports":
        zuneFinalMessage(
          "Chagua ripoti unayotaka kutoa: CSV au kuchapisha/PDF.",
          "info"
        );
        break;

      case "wallet":
        zuneFinalPageMessage(
          "page-wallet",
          "Sehemu ya Wallet inahitaji jedwali na sera za database " +
          "za miamala ya fedha. Haijaunganishwa kiotomatiki kwa " +
          "sababu schema yake haijathibitishwa."
        );
        break;

      case "coupons":
        zuneFinalPageMessage(
          "page-coupons",
          "Sehemu ya kuponi inahitaji jedwali la coupons na " +
          "sera za ruhusa za database kabla ya kuanza kuhifadhi kuponi."
        );
        break;

      case "fraud":
        zuneFinalPageMessage(
          "page-fraud",
          "Sehemu ya uchunguzi wa shughuli zisizo za kawaida " +
          "inahitaji data na sheria za uchunguzi upande wa backend."
        );
        break;

      case "maintenance":
        zuneFinalMessage(
          "Unaweza kukagua fomu ya Maintenance. " +
          "Kuhifadhi mabadiliko kwa watumiaji wote kunahitaji backend."
        );
        break;

      case "settings":
        zuneFinalMessage(
          "Mipangilio imefunguliwa. Hakikisha mabadiliko " +
          "yanahifadhiwa kwenye database kabla ya kuyatumia kwa mfumo wote."
        );
        break;

      default:
        console.debug(
          "[ZUNE ADMIN] Hakuna loader iliyounganishwa kwa:",
          name
        );
    }
  }

  // ---------------------------------------------------------
  // 5. KUFUNGUA MENYU KWA KUBONYEZA
  // ---------------------------------------------------------

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-page]");

    if (!button) return;

    event.preventDefault();

    const pageName = button.dataset.page;

    if (!pageName) return;

    // Usifungue data za admin kabla ya kuthibitisha ruhusa.
    if (
      typeof ZUNE_ADMIN !== "undefined" &&
      ZUNE_ADMIN.isAdmin !== true
    ) {
      zuneFinalMessage(
        "Tafadhali ingia kwa akaunti yenye ruhusa za admin.",
        "error"
      );
      return;
    }

    zuneFinalNavigate(pageName);
  });

  // ---------------------------------------------------------
  // 6. MODAL YA PREVIEW
  // ---------------------------------------------------------

  function zuneFinalClosePreview() {
    const modal = document.getElementById(
      "adminPreviewModal"
    );

    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function zuneFinalOpenPreview(title, body) {
    const modal = document.getElementById(
      "adminPreviewModal"
    );

    const titleElement = document.getElementById(
      "adminPreviewTitle"
    );

    const bodyElement = document.getElementById(
      "adminPreviewBody"
    );

    if (!modal || !titleElement || !bodyElement) {
      zuneFinalMessage(
        "Preview modal haijapatikana kwenye admin.html.",
        "error"
      );
      return;
    }

    titleElement.textContent = title || "Hakiki";
    bodyElement.textContent = body || "";

    modal.hidden = false;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }

  [
    "adminPreviewCloseBtn",
    "adminPreviewDoneBtn"
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener(
      "click",
      zuneFinalClosePreview
    );
  });

  // ---------------------------------------------------------
  // 7. MODAL YA CONFIRMATION
  // ---------------------------------------------------------

  function zuneFinalCloseConfirm() {
    const modal = document.getElementById(
      "adminConfirmModal"
    );

    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  }

  [
    "adminConfirmCancelBtn",
    "adminConfirmCloseBtn"
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener(
      "click",
      zuneFinalCloseConfirm
    );
  });

  // ---------------------------------------------------------
  // 8. PREVIEW YA MATANGAZO
  // ---------------------------------------------------------

  document.getElementById(
    "previewMaintenanceBtn"
  )?.addEventListener("click", function () {
    const title =
      document.getElementById("maintenanceTitle")?.value ||
      "Mfumo unafanyiwa matengenezo";

    const message =
      document.getElementById("maintenanceMessage")?.value ||
      "Tafadhali jaribu tena baadaye.";

    const resumeAt =
      document.getElementById("maintenanceResumeAt")?.value;

    const timeText = resumeAt
      ? "\nMuda uliopangwa kurejea: " +
        new Date(resumeAt).toLocaleString()
      : "\nMuda wa kurejea bado haujawekwa.";

    zuneFinalOpenPreview(
      title,
      message + timeText
    );
  });

  // ---------------------------------------------------------
  // 9. KUPITIA FORM YA MAINTENANCE
  // ---------------------------------------------------------

  document.getElementById(
    "maintenanceForm"
  )?.addEventListener("submit", function (event) {
    event.preventDefault();

    const enabled = Boolean(
      document.getElementById(
        "maintenanceEnabled"
      )?.checked
    );

    const title =
      document.getElementById("maintenanceTitle")?.value
        ?.trim() || "";

    const message =
      document.getElementById("maintenanceMessage")?.value
        ?.trim() || "";

    if (enabled && (!title || !message)) {
      zuneFinalMessage(
        "Weka kichwa na ujumbe wa maintenance kwanza.",
        "error"
      );
      return;
    }

    /*
      Usalama muhimu:
      Hii ni ukaguzi wa fomu pekee. Haitoi maintenance
      kwa watumiaji wote na haihifadhi hali kwenye server.

      Mfumo wa kweli unahitaji mipangilio ihifadhiwe kwenye
      database salama au Edge Function, na hali hiyo ichunguzwe
      na backend. Admin pekee ndiye anayepaswa kuweza kuibadilisha.
    */

    zuneFinalMessage(
      "Fomu imekaguliwa, lakini maintenance haijahifadhiwa. " +
      "Unganisha backend salama ili mabadiliko yaanze kutumika " +
      "kwa watumiaji wote.",
      "info"
    );
  });

  // ---------------------------------------------------------
  // 10. KUPITIA FORM YA SETTINGS
  // ---------------------------------------------------------

  document.getElementById(
    "adminSettingsForm"
  )?.addEventListener("submit", function (event) {
    event.preventDefault();

    const siteName =
      document.getElementById("settingSiteName")?.value
        ?.trim() || "";

    const commission =
      Number(
        document.getElementById("settingCommission")?.value
      );

    if (!siteName) {
      zuneFinalMessage(
        "Jina la mfumo haliwezi kuwa tupu.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(commission) ||
      commission < 0 ||
      commission > 100
    ) {
      zuneFinalMessage(
        "Commission lazima iwe namba kati ya 0 na 100.",
        "error"
      );
      return;
    }

    /*
      Hatuhifadhi settings kwenye localStorage kana kwamba
      ni mipangilio ya mfumo mzima. Hifadhi ya browser moja
      haitasasisha vifaa vya watumiaji wengine.

      Unganisha form hii na jedwali la settings linalolindwa
      na RLS au backend function kabla ya kuruhusu Save.
    */

    zuneFinalMessage(
      "Mipangilio imekaguliwa lakini haijahifadhiwa kwenye server. " +
      "Unganisha database salama ili mabadiliko yadumu.",
      "info"
    );
  });

  // ---------------------------------------------------------
  // 11. VIFUNGO VYA KUCHAPISHA NA CSV
  // ---------------------------------------------------------

  const zuneFinalExportButtons = {
    "exportOrdersCSV": "zuneExportOrdersCSV",
    "exportProductsCSV": "zuneExportProductsCSV",
    "exportUsersCSV": "zuneExportUsersCSV",
    "exportSummaryCSV": "zuneExportSummaryCSV",
    "printAdminReport": "zunePrintAdminReport"
  };

  Object.entries(zuneFinalExportButtons).forEach(
    ([buttonId, functionName]) => {
      document.getElementById(buttonId)?.addEventListener(
        "click",
        async function () {
          const exportFunction = window[functionName];

          if (typeof exportFunction !== "function") {
            zuneFinalMessage(
              "Kitendo hiki hakipatikani. Kagua Sehemu ya 9.",
              "error"
            );
            return;
          }

          try {
            await exportFunction();
          } catch (error) {
            console.error(error);
            zuneFinalMessage(
              "Imeshindikana kukamilisha export.",
              "error"
            );
          }
        }
      );
    }
  );

  // ---------------------------------------------------------
  // 12. KUFUNGA TOAST
  // ---------------------------------------------------------

  document.getElementById("adminToast")?.addEventListener(
    "click",
    function (event) {
      if (
        event.target.closest("[data-toast-close]") ||
        event.target === this
      ) {
        this.hidden = true;
        this.style.display = "none";
      }
    }
  );

  // ---------------------------------------------------------
  // 13. KUANZISHA ADMIN AUTH
  // ---------------------------------------------------------

  async function zuneFinalInitialize() {
    try {
      if (
        typeof window.zuneRegisterAuthListener === "function"
      ) {
        window.zuneRegisterAuthListener();
      }

      if (
        typeof window.zuneCheckAdminAccess === "function"
      ) {
        await window.zuneCheckAdminAccess();
      } else {
        zuneFinalMessage(
          "Kazi ya kuthibitisha admin haijapatikana. " +
          "Kagua Sehemu ya 2 ya admin.js.",
          "error"
        );
        return;
      }

      if (
        typeof ZUNE_ADMIN !== "undefined" &&
        ZUNE_ADMIN.isAdmin === true
      ) {
        const requestedPage = String(
          window.location.hash || "#overview"
        ).replace(/^#/, "");

        const allowedPages = [
          "overview",
          "analytics",
          "users",
          "sellers",
          "seller-applications",
          "verification",
          "products",
          "orders",
          "wallet",
          "coupons",
          "reports",
          "announcements",
          "support",
          "fraud",
          "audit",
          "maintenance",
          "settings"
        ];

        const initialPage = allowedPages.includes(
          requestedPage
        ) ? requestedPage : "overview";

        zuneFinalNavigate(initialPage);
      }
    } catch (error) {
      console.error(
        "[ZUNE ADMIN] Initialization error:",
        error
      );

      zuneFinalMessage(
        "Dashboard haikuweza kuanzishwa. Kagua login, " +
        "Supabase connection na console ya browser.",
        "error"
      );
    }
  }

  // ---------------------------------------------------------
  // 14. HASH YA URL IKIBADILIKA
  // ---------------------------------------------------------

  window.addEventListener("hashchange", function () {
    if (
      typeof ZUNE_ADMIN !== "undefined" &&
      ZUNE_ADMIN.isAdmin === true
    ) {
      const pageName = String(
        window.location.hash || "#overview"
      ).replace(/^#/, "");

      zuneFinalNavigate(pageName);
    }
  });

  // ---------------------------------------------------------
  // 15. KUANZISHA BAADA YA HTML KUSOMWA
  // ---------------------------------------------------------

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      zuneFinalInitialize,
      { once: true }
    );
  } else {
    zuneFinalInitialize();
  }

})();
