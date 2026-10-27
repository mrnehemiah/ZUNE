(() => {
  "use strict";

  if (window.ZUNE_ADMIN_APP_LOADED) return;
  window.ZUNE_ADMIN_APP_LOADED = true;

  const CONFIG = Object.freeze({
    SUPABASE_URL: "https://rpkogiieegqgxqbzwxwo.supabase.co",
    SUPABASE_PUBLISHABLE_KEY:
      "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf",
    PAGE_SIZE: 25,
    MAX_ROWS: 300,
    CURRENCY: "TZS"
  });

  const TABLES = Object.freeze({
    profiles: "profiles",
    products: "products",
    orders: "orders",
    sellerApplications: "seller_applications",
    customerVerification: "verification_requests",
    sellerVerification: "seller_verification_requests",
    announcements: "announcements",
    coupons: "coupons",
    settings: "site_settings",
    audit: "admin_audit_logs",
    disputes: "disputes"
  });

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    client: null,
    user: null,
    profile: null,
    initialized: false,
    currentSection: "overview",
    page: {},
    search: {},
    cache: {},
    announcementEditingId: null
  };

  function client() {
    if (state.client) return state.client;

    if (!window.supabase?.createClient) {
      throw new Error(
        "Supabase SDK haijapakiwa. Hakikisha admin.html ina Supabase JS CDN."
      );
    }

    state.client = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    window.ZUNE_ADMIN = window.ZUNE_ADMIN || {};
    window.ZUNE_ADMIN.client = state.client;

    return state.client;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function money(value) {
    return new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: CONFIG.CURRENCY,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);

    return new Intl.DateTimeFormat("sw-TZ", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function showMessage(text, type = "info") {
    let element = $("#adminGlobalMessage");

    if (!element) {
      element = document.createElement("div");
      element.id = "adminGlobalMessage";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.prepend(element);
    }

    element.textContent = String(text || "");
    element.dataset.type = type;
    element.hidden = false;
  }

  function showError(error) {
    const text = typeof error === "string"
      ? error
      : error?.message || "Kuna tatizo limetokea.";

    showMessage(text, "error");
  }

  function clearMessage() {
    const element = $("#adminGlobalMessage");
    if (element) {
      element.textContent = "";
      element.hidden = true;
    }
  }

  function requireClient() {
    const instance = client();

    if (!state.profile || state.profile.role !== "admin") {
      throw new Error("Unahitaji kuingia kwa akaunti yenye ruhusa za Admin.");
    }

    return instance;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value ?? "—");
  }

  function setHTML(selector, html) {
    const element = $(selector);
    if (element) element.innerHTML = html;
  }

  function setLoading(container, message = "Inapakia...") {
    if (container) {
      container.innerHTML =
        `<tr><td colspan="12">${esc(message)}</td></tr>`;
    }
  }

  function emptyRow(container, message, columns = 6) {
    if (container) {
      container.innerHTML =
        `<tr><td colspan="${columns}">${esc(message)}</td></tr>`;
    }
  }

  function tableContainer(id, fallbackSelector) {
    return $(`#${id}`) || $(fallbackSelector);
  }

  function readValue(selector, fallback = "") {
    return ($(selector)?.value ?? fallback).trim();
  }

  function getErrorMessage(error) {
    if (!error) return "Kuna tatizo lisilojulikana.";
    if (error.code === "42501") {
      return "Huna ruhusa ya kufanya kitendo hiki. Kagua sera za RLS na ruhusa za Admin.";
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      return "Jedwali linalohitajika halijapatikana kwenye Supabase.";
    }
    if (error.code === "23505") {
      return "Taarifa hizi tayari zipo.";
    }
    return error.message || "Kuna tatizo limetokea.";
  }

  async function safeRun(task) {
    try {
      clearMessage();
      return await task();
    } catch (error) {
      showError(getErrorMessage(error));
      return null;
    }
  }

  window.ZUNE_ADMIN_SHOW_MESSAGE = showMessage;
  window.ZUNE_ADMIN_SHOW_ERROR = showError;

  async function checkAdminSession() {
    const supabase = client();

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session?.user) {
      state.user = null;
      state.profile = null;
      showLoginForm();
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from(TABLES.profiles)
      .select("id,full_name,phone_number,role,is_verified,created_at")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      state.user = null;
      state.profile = null;

      await supabase.auth.signOut();

      showLoginForm();
      showMessage(
        "Akaunti hii haina ruhusa za Admin wa ZUNE.",
        "error"
      );
      return null;
    }

    state.user = session.user;
    state.profile = profile;

    window.ZUNE_ADMIN.user = session.user;
    window.ZUNE_ADMIN.profile = profile;
    window.ZUNE_ADMIN.client = supabase;

    showAdminIdentity(profile);
    showDashboard();

    return { session, user: session.user, profile };
  }

  function showLoginForm() {
    const dashboard = $("#adminDashboard");
    if (dashboard) dashboard.hidden = true;

    const login = $("#adminLoginSection") ||
      $("#adminLoginForm")?.closest("section") ||
      $("#loginSection");

    if (login) login.hidden = false;
  }

  function showDashboard() {
    const login = $("#adminLoginSection") ||
      $("#adminLoginForm")?.closest("section") ||
      $("#loginSection");

    if (login) login.hidden = true;

    const dashboard = $("#adminDashboard");
    if (dashboard) dashboard.hidden = false;
  }

  function showAdminIdentity(profile) {
    const name = profile?.full_name || "Admin";

    [
      "#adminName",
      "#adminProfileName",
      "[data-admin-name]"
    ].forEach(selector => {
      const element = $(selector);
      if (element) element.textContent = name;
    });

    [
      "#adminVerificationBadge",
      "#adminVerifiedBadge",
      "[data-admin-badge]"
    ].forEach(selector => {
      const element = $(selector);
      if (!element) return;

      element.hidden = profile?.role !== "admin";
      element.textContent = "ZUNE ADMIN";
      element.setAttribute("aria-label", "Akaunti ya Admin");
    });
  }

  async function signInAdmin(event) {
    event?.preventDefault();

    const email = readValue("#adminEmail") ||
      readValue("#loginEmail");

    const password = $("#adminPassword")?.value ||
      $("#loginPassword")?.value ||
      "";

    if (!email || !password) {
      throw new Error("Weka email na password.");
    }

    const { data, error } = await client().auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("Imeshindikana kuthibitisha akaunti.");
    }

    const result = await checkAdminSession();

    if (!result) return;

    showMessage("Umeingia kwenye ZUNE Admin Dashboard.", "success");
    await loadDashboardStats();
  }

  async function signOutAdmin() {
    const supabase = client();
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    state.user = null;
    state.profile = null;

    if (window.ZUNE_ADMIN) {
      window.ZUNE_ADMIN.user = null;
      window.ZUNE_ADMIN.profile = null;
    }

    showLoginForm();
    showMessage("Umetoka kwenye akaunti ya Admin.", "success");
  }

  function openAdminSection(section) {
    const aliases = {
      sellerApplications: "seller-applications",
      customerVerification: "customer-verification",
      sellerVerification: "seller-verification",
      auditLogs: "audit-logs"
    };

    const sectionName = aliases[section] || section;

    const panels = $$("[data-admin-section]");
    let matched = false;

    panels.forEach(panel => {
      const active = panel.dataset.adminSection === section ||
        panel.dataset.adminSection === sectionName;

      panel.hidden = !active;
      if (active) matched = true;
    });

    $$("[data-admin-target]").forEach(button => {
      const target = button.dataset.adminTarget;
      const active = target === section || target === sectionName;

      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    state.currentSection = section;

    if (sectionName) {
      history.replaceState(null, "", `#${sectionName}`);
    }

    window.dispatchEvent(new CustomEvent("zune:admin-section", {
      detail: { section }
    }));

    if (!matched) {
      const fallback = $(`#adminSection-${section}`);
      if (fallback) fallback.hidden = false;
    }
  }

  function initializeAdminNavigation() {
    document.addEventListener("click", event => {
      const target = event.target.closest("[data-admin-target]");
      if (!target) return;

      event.preventDefault();
      openAdminSection(target.dataset.adminTarget);
    });

    const loginForm = $("#adminLoginForm") || $("#loginForm");

    loginForm?.addEventListener("submit", event => {
      safeRun(() => signInAdmin(event));
    });

    [
      "#adminLogoutButton",
      "#adminLogout",
      "[data-admin-action='logout']"
    ].forEach(selector => {
      $(selector)?.addEventListener("click", event => {
        event.preventDefault();
        safeRun(signOutAdmin);
      });
    });
  }

  window.ZUNE_ADMIN_AUTH = {
    checkAdminSession,
    signInAdmin,
    signOutAdmin,
    openAdminSection
  };
  async function countRows(table, filters = []) {
    let query = requireClient()
      .from(table)
      .select("*", { count: "exact", head: true });

    for (const filter of filters) {
      query = query.eq(filter.column, filter.value);
    }

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }

  async function loadDashboardStats() {
    const supabase = requireClient();

    const results = await Promise.all([
      countRows(TABLES.profiles),
      countRows(TABLES.profiles, [{ column: "role", value: "buyer" }]),
      countRows(TABLES.profiles, [{ column: "role", value: "vendor" }]),
      countRows(TABLES.products),
      countRows(TABLES.orders),
      countRows(TABLES.orders, [{ column: "status", value: "pending" }]),
      countRows(TABLES.sellerApplications, [
        { column: "status", value: "pending" }
      ])
    ]);

    const [
      totalUsers,
      customers,
      sellers,
      products,
      orders,
      pendingOrders,
      pendingApplications
    ] = results;

    const { data: completedOrders, error } = await supabase
      .from(TABLES.orders)
      .select("total_price")
      .eq("status", "completed")
      .limit(CONFIG.MAX_ROWS);

    if (error) throw error;

    const sales = (completedOrders || []).reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    const stats = {
      totalUsers,
      customers,
      sellers,
      products,
      orders,
      pendingOrders,
      pendingApplications,
      sales
    };

    const selectors = {
      totalUsers: ["#statTotalUsers", "#totalUsers"],
      customers: ["#statTotalCustomers", "#totalCustomers"],
      sellers: ["#statTotalSellers", "#totalSellers"],
      products: ["#statTotalProducts", "#totalProducts"],
      orders: ["#statTotalOrders", "#totalOrders"],
      pendingOrders: ["#statPendingOrders", "#pendingOrders"],
      pendingApplications: ["#pendingAppsCount", "#statPendingApplications"],
      sales: ["#statTotalSales", "#totalSales"]
    };

    Object.entries(selectors).forEach(([key, ids]) => {
      ids.forEach(selector => {
        const element = $(selector);
        if (!element) return;

        element.textContent = key === "sales"
          ? money(stats[key])
          : String(stats[key]);
      });
    });

    state.cache.stats = stats;
    return stats;
  }

  async function loadRecentOrders() {
    const container = tableContainer(
      "adminRecentOrdersTableBody",
      "[data-admin-list='recent-orders']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.orders)
      .select("id,buyer_id,product_id,quantity,total_price,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(order => `
        <tr>
          <td>${esc(order.id)}</td>
          <td>${esc(order.buyer_id)}</td>
          <td>${esc(order.product_id)}</td>
          <td>${esc(order.quantity)}</td>
          <td>${esc(money(order.total_price))}</td>
          <td>${esc(order.status)}</td>
          <td>${esc(formatDate(order.created_at))}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="7">Hakuna oda bado.</td></tr>';

    return data || [];
  }

  async function loadRecentProducts() {
    const container = tableContainer(
      "adminRecentProductsTableBody",
      "[data-admin-list='recent-products']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.products)
      .select("id,title,price,stock_quantity,created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(product => `
        <tr>
          <td>${esc(product.title)}</td>
          <td>${esc(money(product.price))}</td>
          <td>${esc(product.stock_quantity ?? 0)}</td>
          <td>${esc(formatDate(product.created_at))}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna bidhaa bado.</td></tr>';

    return data || [];
  }

  async function refreshDashboard() {
    await Promise.all([
      loadDashboardStats(),
      loadRecentOrders(),
      loadRecentProducts()
    ]);

    return state.cache.stats;
  }

  function exportRowsToCSV(filename, rows) {
    if (!rows?.length) {
      showMessage("Hakuna taarifa za ku-export.", "info");
      return;
    }

    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];

    const csvCell = value => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      columns.map(csvCell).join(","),
      ...rows.map(row =>
        columns.map(column => csvCell(row[column])).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function exportOrders() {
    const { data, error } = await requireClient()
      .from(TABLES.orders)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) throw error;

    exportRowsToCSV("zune-orders.csv", data || []);
  }

  function initializeDashboardEvents() {
    $("#refreshAdminDashboard")?.addEventListener("click", () =>
      safeRun(refreshDashboard)
    );

    $("#exportAdminOrders")?.addEventListener("click", () =>
      safeRun(exportOrders)
    );

    $("#adminReloadPage")?.addEventListener("click", () =>
      window.location.reload()
    );
  }

  window.ZUNE_ADMIN_DASHBOARD = {
    loadDashboardStats,
    loadRecentOrders,
    loadRecentProducts,
    refreshDashboard,
    exportOrders
  };

  async function loadUsers() {
    const container = tableContainer(
      "adminUsersTableBody",
      "[data-admin-list='users']"
    );

    if (container) setLoading(container);

    const search = readValue("#adminUserSearch").toLowerCase();
    const role = readValue("#adminUserRoleFilter");

    let query = requireClient()
      .from(TABLES.profiles)
      .select("id,full_name,phone_number,role,is_verified,created_at")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (role && role !== "all") query = query.eq("role", role);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];

    if (search) {
      rows = rows.filter(user =>
        [
          user.full_name,
          user.phone_number,
          user.id,
          user.role
        ].some(value =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    state.cache.users = rows;

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(user => `
        <tr>
          <td>${esc(user.full_name || "—")}</td>
          <td>${esc(user.phone_number || "—")}</td>
          <td>${esc(user.role)}</td>
          <td>${user.is_verified ? "Imethibitishwa" : "Hajathibitishwa"}</td>
          <td>${esc(formatDate(user.created_at))}</td>
          <td>
            <button type="button" data-user-detail="${esc(user.id)}">
              Taarifa
            </button>
            <select data-user-role="${esc(user.id)}" aria-label="Badili jukumu">
              <option value="buyer" ${user.role === "buyer" ? "selected" : ""}>Mteja</option>
              <option value="vendor" ${user.role === "vendor" ? "selected" : ""}>Muuzaji</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
            <button type="button" data-user-role-save="${esc(user.id)}">
              Hifadhi jukumu
            </button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna watumiaji waliopatikana.</td></tr>';

    return rows;
  }

  async function showUserDetail(id) {
    const user = (state.cache.users || []).find(item => item.id === id);

    if (!user) {
      throw new Error("Mtumiaji hajapatikana. Sasisha orodha kwanza.");
    }

    const details = [
      `Jina: ${user.full_name || "—"}`,
      `Simu: ${user.phone_number || "—"}`,
      `Jukumu: ${user.role}`,
      `Akaunti ID: ${user.id}`,
      `Uhakiki: ${user.is_verified ? "Imethibitishwa" : "Hajathibitishwa"}`,
      `Tarehe: ${formatDate(user.created_at)}`
    ].join("\n");

    const panel = $("#adminUserDetails");
    if (panel) {
      panel.hidden = false;
      panel.textContent = details;
    } else {
      alert(details);
    }

    return user;
  }

  async function changeUserRole(id, role) {
    if (!["buyer", "vendor", "admin"].includes(role)) {
      throw new Error("Jukumu lililochaguliwa si sahihi.");
    }

    if (id === state.user?.id && role !== "admin") {
      throw new Error("Huwezi kuondoa jukumu la Admin kwenye akaunti yako mwenyewe.");
    }

    if (!confirm(`Unataka kubadilisha jukumu la mtumiaji kuwa ${role}?`)) {
      return;
    }

    const { error } = await requireClient()
      .from(TABLES.profiles)
      .update({ role })
      .eq("id", id);

    if (error) throw error;

    showMessage(
      "Jukumu limetumwa kusasishwa. Ikiwa sera ya database inalizuia, hakuna mabadiliko yatakayofanyika.",
      "success"
    );

    await loadUsers();
  }

  async function loadSellerApplications() {
    const container = tableContainer(
      "adminSellerApplicationsTableBody",
      "[data-admin-list='seller-applications']"
    );

    if (container) setLoading(container);

    const search = readValue("#sellerApplicationSearch").toLowerCase();
    const status = readValue("#sellerApplicationStatus");

    let query = requireClient()
      .from(TABLES.sellerApplications)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];

    if (search) {
      rows = rows.filter(item =>
        [
          item.store_name,
          item.business_name,
          item.owner_name,
          item.phone,
          item.email,
          item.country,
          item.region,
          item.district,
          item.city,
          item.status,
          item.id
        ].some(value =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    state.cache.sellerApplications = rows;

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(item => `
        <tr>
          <td>${esc(item.store_name || item.business_name || "—")}</td>
          <td>${esc(item.owner_name || "—")}</td>
          <td>${esc(item.phone || "—")}</td>
          <td>${esc(item.country || "—")}</td>
          <td>${esc(item.city || item.region || "—")}</td>
          <td>${esc(item.status || "pending")}</td>
          <td>${esc(formatDate(item.created_at))}</td>
          <td>
            <button type="button" data-seller-app-detail="${esc(item.id)}">Tazama</button>
            <button type="button" data-seller-app-status="${esc(item.id)}" data-status="approved">Kubali</button>
            <button type="button" data-seller-app-status="${esc(item.id)}" data-status="rejected">Kataa</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="8">Hakuna maombi ya wauzaji yaliyopatikana.</td></tr>';

    return rows;
  }

  async function showSellerApplication(id) {
    const application = (state.cache.sellerApplications || [])
      .find(item => String(item.id) === String(id));

    if (!application) {
      throw new Error("Ombi halijapatikana. Pakia orodha upya.");
    }

    const panel = $("#adminSellerApplicationDetails");

    const fields = Object.entries(application)
      .map(([key, value]) =>
        `${key}: ${value == null ? "—" : String(value)}`
      ).join("\n");

    if (panel) {
      panel.hidden = false;
      panel.textContent = fields;
    } else {
      alert(fields);
    }

    return application;
  }

  async function updateSellerApplication(id, status) {
    if (!["approved", "rejected", "pending"].includes(status)) {
      throw new Error("Hali iliyochaguliwa si sahihi.");
    }

    if (!confirm(`Unataka kuweka hali ya ombi kuwa ${status}?`)) return;

    const { error } = await requireClient()
      .from(TABLES.sellerApplications)
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    showMessage(`Hali ya ombi imewekwa kuwa ${status}.`, "success");

    await Promise.all([
      loadSellerApplications(),
      loadDashboardStats()
    ]);
  }

  function initializeUserEvents() {
    $("#refreshAdminUsers")?.addEventListener("click", () =>
      safeRun(loadUsers)
    );

    $("#adminUserSearch")?.addEventListener("input", () =>
      safeRun(loadUsers)
    );

    $("#adminUserRoleFilter")?.addEventListener("change", () =>
      safeRun(loadUsers)
    );

    $("#refreshSellerApplications")?.addEventListener("click", () =>
      safeRun(loadSellerApplications)
    );

    $("#sellerApplicationSearch")?.addEventListener("input", () =>
      safeRun(loadSellerApplications)
    );

    $("#sellerApplicationStatus")?.addEventListener("change", () =>
      safeRun(loadSellerApplications)
    );

    document.addEventListener("click", event => {
      const detail = event.target.closest("[data-user-detail]");
      if (detail) {
        safeRun(() => showUserDetail(detail.dataset.userDetail));
        return;
      }

      const roleSave = event.target.closest("[data-user-role-save]");
      if (roleSave) {
        const id = roleSave.dataset.userRoleSave;
        const role = $(`[data-user-role="${CSS.escape(id)}"]`)?.value;
        safeRun(() => changeUserRole(id, role));
        return;
      }

      const appDetail = event.target.closest("[data-seller-app-detail]");
      if (appDetail) {
        safeRun(() => showSellerApplication(appDetail.dataset.sellerAppDetail));
        return;
      }

      const appStatus = event.target.closest("[data-seller-app-status]");
      if (appStatus) {
        safeRun(() => updateSellerApplication(
          appStatus.dataset.sellerAppStatus,
          appStatus.dataset.status
        ));
      }
    });
  }

  window.ZUNE_ADMIN_USERS = {
    loadUsers,
    showUserDetail,
    changeUserRole,
    loadSellerApplications,
    showSellerApplication,
    updateSellerApplication
  };

  function verificationTable(kind) {
    if (kind === "customer") return TABLES.customerVerification;
    if (kind === "seller") return TABLES.sellerVerification;

    throw new Error("Aina ya uhakiki haijulikani.");
  }

  async function loadVerificationRequests(kind) {
    const table = verificationTable(kind);
    const container = kind === "customer"
      ? tableContainer("adminCustomerVerificationTableBody", "[data-admin-list='customer-verification']")
      : tableContainer("adminSellerVerificationTableBody", "[data-admin-list='seller-verification']");

    if (container) setLoading(container);

    const status = readValue(
      kind === "customer"
        ? "#customerVerificationStatus"
        : "#sellerVerificationStatus"
    );

    const search = readValue(
      kind === "customer"
        ? "#customerVerificationSearch"
        : "#sellerVerificationSearch"
    ).toLowerCase();

    let query = requireClient()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, `Jedwali ${table} halijasanidiwa.`, 7);
        showMessage(`Jedwali ${table} halijapatikana Supabase.`, "error");
        return [];
      }
      throw error;
    }

    let rows = data || [];

    if (search) {
      rows = rows.filter(item =>
        Object.entries(item).some(([key, value]) =>
          !/password|token|secret/i.test(key) &&
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    state.cache[table] = rows;

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(item => {
        const identity = item.user_id || item.profile_id || item.id || "—";
        return `
          <tr>
            <td>${esc(identity)}</td>
            <td>${esc(item.full_name || item.owner_name || item.name || "—")}</td>
            <td>${esc(item.phone || item.phone_number || "—")}</td>
            <td>${esc(item.status || "pending")}</td>
            <td>${esc(formatDate(item.created_at))}</td>
            <td>
              <button type="button" data-verification-detail="${esc(item.id)}" data-kind="${esc(kind)}">Tazama</button>
              <button type="button" data-verification-status="${esc(item.id)}" data-kind="${esc(kind)}" data-status="approved">Kubali</button>
              <button type="button" data-verification-status="${esc(item.id)}" data-kind="${esc(kind)}" data-status="rejected">Kataa</button>
              <button type="button" data-verification-status="${esc(item.id)}" data-kind="${esc(kind)}" data-status="changes_requested">Omba marekebisho</button>
            </td>
          </tr>
        `;
      }).join("")
      : '<tr><td colspan="6">Hakuna maombi ya uhakiki yaliyopatikana.</td></tr>';

    return rows;
  }

  async function showVerificationRequest(kind, id) {
    const table = verificationTable(kind);
    const request = (state.cache[table] || [])
      .find(item => String(item.id) === String(id));

    if (!request) {
      throw new Error("Ombi la uhakiki halijapatikana. Pakia orodha upya.");
    }

    const safeFields = Object.entries(request)
      .filter(([key]) => !/password|token|secret/i.test(key))
      .map(([key, value]) =>
        `${key}: ${value == null ? "—" : String(value)}`
      ).join("\n");

    const panel = $("#adminVerificationDetails");

    if (panel) {
      panel.hidden = false;
      panel.textContent = safeFields;
    } else {
      alert(safeFields);
    }

    return request;
  }

  async function updateVerificationRequest(kind, id, status) {
    if (!["approved", "rejected", "changes_requested", "pending"].includes(status)) {
      throw new Error("Hali ya uhakiki si sahihi.");
    }

    if (!confirm(`Unataka kuweka hali ya uhakiki kuwa ${status}?`)) return;

    const table = verificationTable(kind);
    const supabase = requireClient();

    const { data: existing, error: readError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readError) throw readError;
    if (!existing) throw new Error("Ombi halijapatikana.");

    const payload = { status };

    if ("admin_note" in existing) {
      payload.admin_note = readValue("#verificationAdminNote");
    }
    if ("reviewed_at" in existing) {
      payload.reviewed_at = new Date().toISOString();
    }
    if ("reviewed_by" in existing) {
      payload.reviewed_by = state.user.id;
    }

    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    if (status === "approved" && kind === "customer") {
      const userId = existing.user_id || existing.profile_id;

      if (userId) {
        const { error: profileError } = await supabase
          .from(TABLES.profiles)
          .update({ is_verified: true })
          .eq("id", userId);

        if (profileError) {
          showMessage(
            "Ombi limeidhinishwa lakini hali ya is_verified kwenye profiles haikubadilika. Kagua sera na schema.",
            "error"
          );
        }
      }
    }

    showMessage(`Uhakiki umesasishwa: ${status}.`, "success");
    await loadVerificationRequests(kind);
  }

  function initializeVerificationEvents() {
    [
      ["#refreshCustomerVerification", "customer"],
      ["#refreshSellerVerification", "seller"]
    ].forEach(([selector, kind]) => {
      $(selector)?.addEventListener("click", () =>
        safeRun(() => loadVerificationRequests(kind))
      );
    });

    [
      ["#customerVerificationStatus", "customer"],
      ["#customerVerificationSearch", "customer"],
      ["#sellerVerificationStatus", "seller"],
      ["#sellerVerificationSearch", "seller"]
    ].forEach(([selector, kind]) => {
      const element = $(selector);
      if (!element) return;

      element.addEventListener(
        element.tagName === "SELECT" ? "change" : "input",
        () => safeRun(() => loadVerificationRequests(kind))
      );
    });

    document.addEventListener("click", event => {
      const detail = event.target.closest("[data-verification-detail]");
      if (detail) {
        safeRun(() => showVerificationRequest(
          detail.dataset.kind,
          detail.dataset.verificationDetail
        ));
        return;
      }

      const button = event.target.closest("[data-verification-status]");
      if (button) {
        safeRun(() => updateVerificationRequest(
          button.dataset.kind,
          button.dataset.verificationStatus,
          button.dataset.status
        ));
      }
    });
  }

  window.ZUNE_ADMIN_VERIFICATION = {
    loadVerificationRequests,
    showVerificationRequest,
    updateVerificationRequest
  };

  async function loadProducts() {
    const container = tableContainer(
      "adminProductsTableBody",
      "[data-admin-list='products']"
    );

    if (container) setLoading(container);

    const search = readValue("#adminProductSearch").toLowerCase();

    const { data, error } = await requireClient()
      .from(TABLES.products)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) throw error;

    let rows = data || [];

    if (search) {
      rows = rows.filter(product =>
        [
          product.title,
          product.description,
          product.vendor_id,
          product.id
        ].some(value =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    state.cache.products = rows;

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(product => `
        <tr>
          <td>${esc(product.title || "—")}</td>
          <td>${esc(product.vendor_id || "—")}</td>
          <td>${esc(money(product.price))}</td>
          <td>${esc(product.stock_quantity ?? 0)}</td>
          <td>${esc(formatDate(product.created_at))}</td>
          <td>
            <button type="button" data-product-detail="${esc(product.id)}">Tazama</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna bidhaa zilizopatikana.</td></tr>';

    return rows;
  }

  async function showProductDetail(id) {
    const product = (state.cache.products || [])
      .find(item => String(item.id) === String(id));

    if (!product) throw new Error("Bidhaa haijapatikana.");

    const panel = $("#adminProductDetails");
    const details = Object.entries(product)
      .map(([key, value]) => `${key}: ${value ?? "—"}`)
      .join("\n");

    if (panel) {
      panel.hidden = false;
      panel.textContent = details;
    } else {
      alert(details);
    }

    return product;
  }

  async function loadOrders() {
    const container = tableContainer(
      "adminOrdersTableBody",
      "[data-admin-list='orders']"
    );

    if (container) setLoading(container);

    const status = readValue("#adminOrderStatus");
    const search = readValue("#adminOrderSearch").toLowerCase();

    let query = requireClient()
      .from(TABLES.orders)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];

    if (search) {
      rows = rows.filter(order =>
        [
          order.id,
          order.buyer_id,
          order.product_id,
          order.status
        ].some(value =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    state.cache.orders = rows;

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(order => `
        <tr>
          <td>${esc(order.id)}</td>
          <td>${esc(order.buyer_id)}</td>
          <td>${esc(order.product_id)}</td>
          <td>${esc(order.quantity)}</td>
          <td>${esc(money(order.total_price))}</td>
          <td>${esc(money(order.commission_fee))}</td>
          <td>${esc(order.status)}</td>
          <td>${esc(formatDate(order.created_at))}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="8">Hakuna oda zilizopatikana.</td></tr>';

    return rows;
  }

  async function loadFinanceSummary() {
    const { data, error } = await requireClient()
      .from(TABLES.orders)
      .select("total_price,commission_fee,status")
      .limit(CONFIG.MAX_ROWS);

    if (error) throw error;

    const completed = (data || []).filter(
      order => order.status === "completed"
    );

    const sales = completed.reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    const commissions = completed.reduce(
      (sum, order) => sum + (Number(order.commission_fee) || 0),
      0
    );

    setText("#financeTotalSales", money(sales));
    setText("#financeTotalCommission", money(commissions));
    setText("#financeCompletedOrders", completed.length);

    return { sales, commissions, completedOrders: completed.length };
  }

  async function loadDisputes() {
    const container = tableContainer(
      "adminDisputesTableBody",
      "[data-admin-list='disputes']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.disputes)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, "Jedwali la disputes halijasanidiwa.", 6);
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(dispute => `
        <tr>
          <td>${esc(dispute.id)}</td>
          <td>${esc(dispute.order_id || "—")}</td>
          <td>${esc(dispute.status || "—")}</td>
          <td>${esc(dispute.reason || dispute.description || "—")}</td>
          <td>${esc(formatDate(dispute.created_at))}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="5">Hakuna migogoro iliyopatikana.</td></tr>';

    return data || [];
  }

  function initializeCommerceEvents() {
    $("#refreshAdminProducts")?.addEventListener("click", () =>
      safeRun(loadProducts)
    );

    $("#adminProductSearch")?.addEventListener("input", () =>
      safeRun(loadProducts)
    );

    $("#refreshAdminOrders")?.addEventListener("click", () =>
      safeRun(loadOrders)
    );

    $("#adminOrderStatus")?.addEventListener("change", () =>
      safeRun(loadOrders)
    );

    $("#adminOrderSearch")?.addEventListener("input", () =>
      safeRun(loadOrders)
    );

    $("#refreshAdminFinance")?.addEventListener("click", () =>
      safeRun(loadFinanceSummary)
    );

    $("#refreshAdminDisputes")?.addEventListener("click", () =>
      safeRun(loadDisputes)
    );

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-product-detail]");
      if (button) {
        safeRun(() => showProductDetail(button.dataset.productDetail));
      }
    });
  }

  window.ZUNE_ADMIN_COMMERCE = {
    loadProducts,
    showProductDetail,
    loadOrders,
    loadFinanceSummary,
    loadDisputes
  };

  function getAnnouncementFormValues() {
    const title = readValue("#announcementTitle");
    const messageText = readValue("#announcementMessage");
    const audience = readValue("#announcementAudience", "all");
    const displayMode = readValue("#announcementDisplayMode", "both");
    const priority = Number(readValue("#announcementPriority", "1")) || 1;
    const startsAt = readValue("#announcementStartsAt");
    const expiresAt = readValue("#announcementExpiresAt");

    if (!title || !messageText) {
      throw new Error("Weka kichwa na ujumbe wa tangazo.");
    }

    if (!["customers", "sellers", "all"].includes(audience)) {
      throw new Error("Walengwa wa tangazo si sahihi.");
    }

    if (!["notification", "slide", "both"].includes(displayMode)) {
      throw new Error("Aina ya kuonyesha tangazo si sahihi.");
    }

    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      throw new Error("Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza.");
    }

    return {
      title,
      message: messageText,
      audience,
      display_mode: displayMode,
      priority,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "published",
      created_by: state.user?.id
    };
  }

  async function loadAnnouncements() {
    const container = tableContainer(
      "adminAnnouncementsTableBody",
      "[data-admin-list='announcements']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.announcements)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, "Jedwali la announcements halijasanidiwa.", 7);
        return [];
      }
      throw error;
    }

    state.cache.announcements = data || [];

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(item => `
        <tr>
          <td>${esc(item.title)}</td>
          <td>${esc(item.audience || "all")}</td>
          <td>${esc(item.display_mode || "both")}</td>
          <td>${esc(item.priority ?? 1)}</td>
          <td>${esc(item.status || "—")}</td>
          <td>${esc(formatDate(item.expires_at))}</td>
          <td>
            <button type="button" data-announcement-edit="${esc(item.id)}">Hariri</button>
            <button type="button" data-announcement-stop="${esc(item.id)}">Simamisha</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="7">Hakuna matangazo yaliyopatikana.</td></tr>';

    return data || [];
  }

  async function publishAnnouncement(event) {
    event?.preventDefault();

    const payload = getAnnouncementFormValues();
    const editingId = state.announcementEditingId;

    let result;

    if (editingId) {
      const { data, error } = await requireClient()
        .from(TABLES.announcements)
        .update(payload)
        .eq("id", editingId)
        .select()
        .maybeSingle();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await requireClient()
        .from(TABLES.announcements)
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) throw error;
      result = data;
    }

    state.announcementEditingId = null;
    $("#adminAnnouncementForm")?.reset();

    showMessage(
      editingId ? "Tangazo limesasishwa." : "Tangazo limechapishwa.",
      "success"
    );

    await loadAnnouncements();
    return result;
  }

  async function editAnnouncement(id) {
    const item = (state.cache.announcements || [])
      .find(announcement => String(announcement.id) === String(id));

    if (!item) throw new Error("Tangazo halijapatikana. Pakia orodha upya.");

    state.announcementEditingId = item.id;

    const values = {
      "#announcementTitle": item.title,
      "#announcementMessage": item.message,
      "#announcementAudience": item.audience || "all",
      "#announcementDisplayMode": item.display_mode || "both",
      "#announcementPriority": item.priority ?? 1,
      "#announcementStartsAt": item.starts_at?.slice(0, 16) || "",
      "#announcementExpiresAt": item.expires_at?.slice(0, 16) || ""
    };

    Object.entries(values).forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.value = value ?? "";
    });

    $("#adminAnnouncementForm")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    showMessage("Tangazo limewekwa tayari kwa kuhariri.", "info");
    return item;
  }

  async function stopAnnouncement(id) {
    if (!confirm("Unataka kusimamisha tangazo hili?")) return;

    const { error } = await requireClient()
      .from(TABLES.announcements)
      .update({ status: "stopped" })
      .eq("id", id);

    if (error) throw error;

    showMessage("Tangazo limesimamishwa.", "success");
    await loadAnnouncements();
  }

  function previewAnnouncement() {
    const values = getAnnouncementFormValues();
    const preview = $("#announcementPreview");

    const html = `
      <div class="zune-announcement-preview">
        <strong>${esc(values.title)}</strong>
        <p>${esc(values.message)}</p>
        <small>
          Walengwa: ${esc(values.audience)} ·
          Muonekano: ${esc(values.display_mode)} ·
          Kipaumbele: ${esc(values.priority)}
        </small>
      </div>
    `;

    if (preview) {
      preview.hidden = false;
      preview.innerHTML = html;
    } else {
      alert(`${values.title}\n\n${values.message}`);
    }
  }

  function initializeAnnouncementEvents() {
    $("#adminAnnouncementForm")?.addEventListener("submit", event =>
      safeRun(() => publishAnnouncement(event))
    );

    $("#refreshAdminAnnouncements")?.addEventListener("click", () =>
      safeRun(loadAnnouncements)
    );

    $("#previewAnnouncement")?.addEventListener("click", () =>
      safeRun(previewAnnouncement)
    );

    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-announcement-edit]");
      if (edit) {
        safeRun(() => editAnnouncement(edit.dataset.announcementEdit));
        return;
      }

      const stop = event.target.closest("[data-announcement-stop]");
      if (stop) {
        safeRun(() => stopAnnouncement(stop.dataset.announcementStop));
      }
    });
  }

  window.ZUNE_ADMIN_ANNOUNCEMENTS = {
    loadAnnouncements,
    publishAnnouncement,
    editAnnouncement,
    stopAnnouncement,
    previewAnnouncement
  };

  async function loadCoupons() {
    const container = tableContainer(
      "adminCouponsTableBody",
      "[data-admin-list='coupons']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.coupons)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, "Jedwali la coupons halijasanidiwa.", 6);
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(coupon => `
        <tr>
          <td>${esc(coupon.code)}</td>
          <td>${esc(coupon.discount_type || "—")}</td>
          <td>${esc(coupon.discount_value ?? "—")}</td>
          <td>${esc(coupon.status || "—")}</td>
          <td>${esc(formatDate(coupon.expires_at))}</td>
          <td>
            <button type="button" data-coupon-toggle="${esc(coupon.id)}">
              ${coupon.status === "active" ? "Zima" : "Washa"}
            </button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna coupon zilizopatikana.</td></tr>';

    return data || [];
  }

  async function saveCoupon(event) {
    event?.preventDefault();

    const code = readValue("#couponCode").toUpperCase();
    const discountType = readValue("#couponDiscountType", "percentage");
    const discountValue = Number(readValue("#couponDiscountValue", "0"));
    const minimumOrder = Number(readValue("#couponMinimumOrder", "0"));
    const usageLimitText = readValue("#couponUsageLimit");
    const startsAt = readValue("#couponStartsAt");
    const expiresAt = readValue("#couponExpiresAt");

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new Error("Code ya coupon iwe na herufi/namba 3–40.");
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      throw new Error("Aina ya punguzo si sahihi.");
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Error("Weka thamani sahihi ya punguzo.");
    }

    if (discountType === "percentage" && discountValue > 100) {
      throw new Error("Punguzo la asilimia haliwezi kuzidi 100%.");
    }

    if (!Number.isFinite(minimumOrder) || minimumOrder < 0) {
      throw new Error("Kiasi cha chini cha oda si sahihi.");
    }

    const payload = {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      minimum_order_amount: minimumOrder,
      usage_limit: usageLimitText ? Number(usageLimitText) : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active"
    };

    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      throw new Error("Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza.");
    }

    const { error } = await requireClient()
      .from(TABLES.coupons)
      .insert(payload);

    if (error) throw error;

    $("#adminCouponForm")?.reset();
    showMessage("Coupon imehifadhiwa.", "success");
    await loadCoupons();
  }

  async function toggleCoupon(id) {
    const supabase = requireClient();

    const { data, error: readError } = await supabase
      .from(TABLES.coupons)
      .select("id,status")
      .eq("id", id)
      .maybeSingle();

    if (readError) throw readError;
    if (!data) throw new Error("Coupon haijapatikana.");

    const nextStatus = data.status === "active" ? "disabled" : "active";

    if (!confirm(`Unataka kuweka coupon kuwa ${nextStatus}?`)) return;

    const { error } = await supabase
      .from(TABLES.coupons)
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) throw error;

    showMessage("Hali ya coupon imesasishwa.", "success");
    await loadCoupons();
  }

  function initializeLogoPreview() {
    const input = $("#zuneLogoUpload");
    const preview = $("#zuneLogoPreview");

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showMessage("Chagua faili la picha.", "error");
        input.value = "";
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        showMessage("Picha isizidi MB 3.", "error");
        input.value = "";
        return;
      }

      const previousUrl = preview?.dataset.objectUrl;
      if (previousUrl) URL.revokeObjectURL(previousUrl);

      const url = URL.createObjectURL(file);

      if (preview) {
        preview.hidden = false;
        preview.dataset.objectUrl = url;
        preview.innerHTML = `
          <img src="${url}" alt="Hakiki logo ya ZUNE"
            style="max-width:180px;max-height:180px;object-fit:contain">
        `;
      }
    });
  }

  async function publishLogo() {
    const input = $("#zuneLogoUpload");
    const file = input?.files?.[0];

    if (!file) throw new Error("Chagua picha ya logo kwanza.");

    const supabase = requireClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `branding/zune-logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase
      .storage
      .from("site-assets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase
      .storage
      .from("site-assets")
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) throw new Error("URL ya logo haikupatikana.");

    const { error: settingsError } = await supabase
      .from(TABLES.settings)
      .upsert({
        key: "zune_logo_url",
        value: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: state.user?.id
      }, { onConflict: "key" });

    if (settingsError) {
      throw new Error(
        "Logo imepakiwa lakini setting haikuhifadhiwa: " +
        settingsError.message
      );
    }

    const preview = $("#zuneLogoPreview");

    if (preview) {
      preview.hidden = false;
      preview.innerHTML = `
        <img src="${esc(publicUrl)}" alt="Logo mpya ya ZUNE"
          style="max-width:180px;max-height:180px;object-fit:contain">
      `;
    }

    showMessage("Logo imehifadhiwa kwenye settings.", "success");
  }

  async function loadCurrentLogo() {
    const { data, error } = await requireClient()
      .from(TABLES.settings)
      .select("key,value")
      .eq("key", "zune_logo_url")
      .maybeSingle();

    if (error) throw error;

    const url = data?.value;
    const preview = $("#zuneLogoPreview");

    if (url && preview) {
      preview.hidden = false;
      preview.innerHTML = `
        <img src="${esc(url)}" alt="Logo ya sasa ya ZUNE"
          style="max-width:180px;max-height:180px;object-fit:contain">
      `;
    }

    return url || null;
  }

  function initializeBrandingEvents() {
    $("#adminCouponForm")?.addEventListener("submit", event =>
      safeRun(() => saveCoupon(event))
    );

    $("#refreshAdminCoupons")?.addEventListener("click", () =>
      safeRun(loadCoupons)
    );

    $("#publishZuneLogo")?.addEventListener("click", () =>
      safeRun(publishLogo)
    );

    $("#loadCurrentZuneLogo")?.addEventListener("click", () =>
      safeRun(loadCurrentLogo)
    );

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-coupon-toggle]");
      if (button) {
        safeRun(() => toggleCoupon(button.dataset.couponToggle));
      }
    });

    initializeLogoPreview();
  }

  window.ZUNE_ADMIN_BRANDING = {
    loadCoupons,
    saveCoupon,
    toggleCoupon,
    publishLogo,
    loadCurrentLogo
  };

  async function loadMaintenanceSettings() {
    const { data, error } = await requireClient()
      .from(TABLES.settings)
      .select("key,value")
      .in("key", [
        "maintenance_enabled",
        "maintenance_message",
        "maintenance_end_at"
      ]);

    if (error) throw error;

    const settings = Object.fromEntries(
      (data || []).map(item => [item.key, item.value])
    );

    const checkbox = $("#maintenanceEnabled");
    if (checkbox) {
      checkbox.checked = String(settings.maintenance_enabled) === "true";
    }

    const messageInput = $("#maintenanceMessage");
    if (messageInput) {
      messageInput.value = settings.maintenance_message || "";
    }

    const endInput = $("#maintenanceEndAt");
    if (endInput) {
      endInput.value = settings.maintenance_end_at?.slice(0, 16) || "";
    }

    return settings;
  }

  async function saveMaintenanceSettings(event) {
    event?.preventDefault();

    const enabled = Boolean($("#maintenanceEnabled")?.checked);
    const maintenanceMessage = readValue("#maintenanceMessage");
    const endAt = readValue("#maintenanceEndAt");

    if (enabled && !maintenanceMessage) {
      throw new Error("Weka ujumbe wa matengenezo.");
    }

    if (enabled && !confirm(
      "Unataka kuwezesha hali ya matengenezo? Hakikisha ukurasa wa maintenance umeunganishwa."
    )) {
      return;
    }

    const updatedAt = new Date().toISOString();
    const updatedBy = state.user?.id;

    const settings = [
      {
        key: "maintenance_enabled",
        value: String(enabled),
        updated_at: updatedAt,
        updated_by: updatedBy
      },
      {
        key: "maintenance_message",
        value: maintenanceMessage,
        updated_at: updatedAt,
        updated_by: updatedBy
      },
      {
        key: "maintenance_end_at",
        value: endAt ? new Date(endAt).toISOString() : "",
        updated_at: updatedAt,
        updated_by: updatedBy
      }
    ];

    const { error } = await requireClient()
      .from(TABLES.settings)
      .upsert(settings, { onConflict: "key" });

    if (error) throw error;

    showMessage(
      "Mipangilio imehifadhiwa. GitHub Pages haiwezi kulazimisha matengenezo kwenye routes zote bila enforcement ya server/backend.",
      "success"
    );
  }

  async function loadAuditLogs() {
    const container = tableContainer(
      "adminAuditLogsTableBody",
      "[data-admin-list='audit-logs']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.audit)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, "Jedwali la audit logs halijasanidiwa.", 6);
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(log => `
        <tr>
          <td>${esc(formatDate(log.created_at))}</td>
          <td>${esc(log.admin_id || "—")}</td>
          <td>${esc(log.action || "—")}</td>
          <td>${esc(log.target_type || "—")}</td>
          <td>${esc(log.target_id || "—")}</td>
          <td>${esc(log.result || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna kumbukumbu zilizopatikana.</td></tr>';

    return data || [];
  }

  async function loadAdminRoles() {
    const container = tableContainer(
      "adminRolesTableBody",
      "[data-admin-list='roles']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.profiles)
      .select("id,full_name,role,created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false })
      .limit(CONFIG.MAX_ROWS);

    if (error) throw error;

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(admin => `
        <tr>
          <td>${esc(admin.full_name || "Admin")}</td>
          <td>${esc(admin.id)}</td>
          <td>${esc(admin.role)}</td>
          <td>${esc(formatDate(admin.created_at))}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna Admin aliyepatikana.</td></tr>';

    return data || [];
  }

  async function loadSecurityEvents() {
    const container = tableContainer(
      "adminSecurityEventsTableBody",
      "[data-admin-list='security-events']"
    );

    if (container) setLoading(container);

    const { data, error } = await requireClient()
      .from(TABLES.audit)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        emptyRow(container, "Jedwali la audit logs halijasanidiwa.", 4);
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(item => `
        <tr>
          <td>${esc(formatDate(item.created_at))}</td>
          <td>${esc(item.action || "—")}</td>
          <td>${esc(item.admin_id || "—")}</td>
          <td>${esc(item.result || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna matukio yaliyorekodiwa.</td></tr>';

    return data || [];
  }

  function initializeSecurityEvents() {
    $("#adminMaintenanceForm")?.addEventListener("submit", event =>
      safeRun(() => saveMaintenanceSettings(event))
    );

    $("#refreshMaintenanceSettings")?.addEventListener("click", () =>
      safeRun(loadMaintenanceSettings)
    );

    $("#refreshAdminAuditLogs")?.addEventListener("click", () =>
      safeRun(loadAuditLogs)
    );

    $("#refreshAdminRoles")?.addEventListener("click", () =>
      safeRun(loadAdminRoles)
    );

    $("#refreshSecurityEvents")?.addEventListener("click", () =>
      safeRun(loadSecurityEvents)
    );
  }

  window.ZUNE_ADMIN_SECURITY = {
    loadMaintenanceSettings,
    saveMaintenanceSettings,
    loadAuditLogs,
    loadAdminRoles,
    loadSecurityEvents
  };

  const loaders = {
    overview: refreshDashboard,
    users: loadUsers,
    sellerApplications: loadSellerApplications,
    customerVerification: () => loadVerificationRequests("customer"),
    sellerVerification: () => loadVerificationRequests("seller"),
    products: loadProducts,
    orders: loadOrders,
    finance: loadFinanceSummary,
    announcements: loadAnnouncements,
    coupons: loadCoupons,
    branding: loadCurrentLogo,
    maintenance: loadMaintenanceSettings,
    roles: loadAdminRoles,
    auditLogs: loadAuditLogs,
    security: loadSecurityEvents,
    disputes: loadDisputes
  };

  function initializeShortcutButtons() {
    const shortcuts = {
      "#openCustomerVerification": "customer-verification",
      "#openSellerVerification": "seller-verification",
      "#openSellerApplications": "seller-applications",
      "#openAdminUsers": "users",
      "#openAdminRoles": "roles",
      "#openAdminProducts": "products",
      "#openAdminOrders": "orders",
      "#openAdminFinance": "finance",
      "#openAdminAnnouncements": "announcements",
      "#openAdminCoupons": "coupons",
      "#openAdminBranding": "branding",
      "#openAdminMaintenance": "maintenance",
      "#openAdminSecurity": "security",
      "#openAdminAuditLogs": "audit-logs",
      "#openAdminDisputes": "disputes",
      "#openAdminAnalytics": "analytics",
      "#openAdminSupport": "support",
      "#openAdminSettings": "settings"
    };

    Object.entries(shortcuts).forEach(([selector, section]) => {
      $(selector)?.addEventListener("click", event => {
        event.preventDefault();
        openAdminSection(section);
      });
    });

    const routes = {
      "#adminGoHome": "index.html",
      "#adminGoAccount": "account.html",
      "#adminGoNotifications": "notification.html",
      "#adminGoSeller": "seller.html",
      "#adminGoSellerDashboard": "seller-dashboard.html",
      "#adminGoTerms": "terms.html",
      "#adminGoPrivacy": "privacy.html",
      "#adminGoMaintenancePage": "maintenance.html"
    };

    Object.entries(routes).forEach(([selector, url]) => {
      $(selector)?.addEventListener("click", event => {
        event.preventDefault();
        window.location.assign(url);
      });
    });

    $("#adminReloadPage")?.addEventListener("click", () => {
      window.location.reload();
    });

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-admin-action]");
      if (!button) return;

      const actions = {
        refresh: () => window.location.reload(),
        logout: signOutAdmin,
        home: () => window.location.assign("index.html"),
        account: () => window.location.assign("account.html"),
        notifications: () => window.location.assign("notification.html"),
        seller: () => window.location.assign("seller.html"),
        "seller-dashboard": () =>
          window.location.assign("seller-dashboard.html")
      };

      const action = actions[button.dataset.adminAction];

      if (action) {
        event.preventDefault();
        safeRun(action);
      }
    });
  }

  function initializeSectionEvents() {
    initializeAdminNavigation();
    initializeDashboardEvents();
    initializeUserEvents();
    initializeVerificationEvents();
    initializeCommerceEvents();
    initializeAnnouncementEvents();
    initializeBrandingEvents();
    initializeSecurityEvents();
    initializeShortcutButtons();
  }

  async function loadSection(section) {
    if (!state.profile || state.profile.role !== "admin") {
      throw new Error("Thibitisha akaunti ya Admin kwanza.");
    }

    const loader = loaders[section];

    if (loader) {
      return loader();
    }

    if (section === "analytics") {
      return loadDashboardStats();
    }

    if (section === "support" || section === "settings") {
      showMessage(
        "Sehemu hii inahitaji kuunganishwa na jedwali au huduma yake kwenye Supabase.",
        "info"
      );
      return null;
    }

    return null;
  }

  function initializeSectionListener() {
    window.addEventListener("zune:admin-section", event => {
      const section = event.detail?.section;
      if (!section) return;

      safeRun(() => loadSection(section));
    });
  }

  function sectionFromHash() {
    const hash = window.location.hash.replace(/^#/, "");

    const aliases = {
      "customer-verification": "customerVerification",
      "seller-verification": "sellerVerification",
      "seller-applications": "sellerApplications",
      "audit-logs": "auditLogs"
    };

    const section = aliases[hash] || hash;
    return section || "overview";
  }

  async function initializeDashboard() {
    const result = await checkAdminSession();

    if (!result) return;

    const section = sectionFromHash();

    const sectionAliases = {
      customerVerification: "customer-verification",
      sellerVerification: "seller-verification",
      sellerApplications: "seller-applications",
      auditLogs: "audit-logs"
    };

    const validSections = new Set([
      "overview",
      "analytics",
      "users",
      "roles",
      "customerVerification",
      "sellerVerification",
      "sellerApplications",
      "products",
      "orders",
      "finance",
      "announcements",
      "coupons",
      "branding",
      "maintenance",
      "security",
      "auditLogs",
      "disputes",
      "support",
      "settings"
    ]);

    if (validSections.has(section)) {
      openAdminSection(sectionAliases[section] || section);
    } else {
      openAdminSection("overview");
    }

    await safeRun(() => loadSection(
      validSections.has(section) ? section : "overview"
    ));
  }

  function initializeAuthListener() {
    client().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        state.user = null;
        state.profile = null;
        showLoginForm();
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        // Epuka kufanya Supabase calls moja kwa moja ndani ya callback.
        setTimeout(() => {
          checkAdminSession().catch(showError);
        }, 0);
      }
    });
  }

  async function start() {
    if (state.initialized) return;
    state.initialized = true;

    try {
      client();
      initializeSectionEvents();
      initializeSectionListener();
      initializeAuthListener();

      await initializeDashboard();
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }

  window.ZUNE_ADMIN_APP = {
    config: CONFIG,
    tables: TABLES,
    state,
    start,
    loadSection,
    refreshDashboard,
    exportRowsToCSV,
    client
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
