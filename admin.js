(() => {
  "use strict";

  const CONFIG = {
    SUPABASE_URL: "https://rpkogiieegqgxqbzwxwo.supabase.co",
    SUPABASE_ANON_KEY:"sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf"
      window.ZUNE_SUPABASE_ANON_KEY || "",
    LOGIN_PAGE: "login.html",
    HOME_PAGE: "index.html",
    ACCOUNT_PAGE: "account.html",
    NOTIFICATION_PAGE: "notification.html",
    SELLER_PAGE: "seller.html",
    SELLER_DASHBOARD_PAGE: "seller-dashboard.html",
    MAINTENANCE_PAGE: "maintenance.html"
  };

  const TABLES = {
    profiles: "profiles",
    products: "products",
    orders: "orders",
    sellerApplications: "seller_applications",
    announcements: "announcements",
    notifications: "notifications",
    customerVerification: "verification_requests",
    sellerVerification: "seller_verification_requests",
    coupons: "coupons",
    auditLogs: "admin_audit_logs",
    disputes: "disputes",
    settings: "site_settings"
  };

  const state = {
    supabase: null,
    session: null,
    admin: null,
    activeSection: "overview",
    profiles: [],
    products: [],
    orders: [],
    sellerApplications: [],
    announcements: [],
    customerVerification: [],
    sellerVerification: [],
    coupons: [],
    auditLogs: [],
    disputes: [],
    loading: false,
    maintenance: null
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const formatMoney = value =>
    new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  const formatDate = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("sw-TZ");
  };

  const notify = (message, type = "info") => {
    let box = $("#adminToast");

    if (!box) {
      box = document.createElement("div");
      box.id = "adminToast";
      box.setAttribute("role", "status");
      Object.assign(box.style, {
        position: "fixed",
        right: "16px",
        bottom: "22px",
        zIndex: "99999",
        maxWidth: "calc(100% - 32px)",
        padding: "13px 17px",
        borderRadius: "12px",
        color: "#fff",
        background: "#166534",
        boxShadow: "0 8px 28px #0002",
        fontSize: "14px",
        display: "none"
      });
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.background =
      type === "error" ? "#b91c1c" :
      type === "success" ? "#166534" : "#1f2937";
    box.style.display = "block";

    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      box.style.display = "none";
    }, 4500);
  };

  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value ?? "";
  };

  const showElement = (selector, visible = true) => {
    const element = $(selector);
    if (element) element.hidden = !visible;
  };

  const setBusy = (button, busy, busyText = "Inachakata...") => {
    if (!button) return;

    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  };

  function initializeSupabase() {
    if (state.supabase) return state.supabase;

    const library = window.supabase;

    if (!library || typeof library.createClient !== "function") {
      throw new Error(
        "Supabase SDK haijapakiwa. Hakikisha admin.html ina Supabase JS CDN."
      );
    }

    if (!CONFIG.SUPABASE_ANON_KEY) {
      throw new Error(
        "Weka Supabase publishable/anon key kwenye window.ZUNE_SUPABASE_ANON_KEY."
      );
    }

    state.supabase = library.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    return state.supabase;
  }

  function showLoginError(message) {
    const targets = [
      "#loginMessage",
      "#adminGlobalMessage",
      "#adminError",
      "#adminLoginMessage"
    ];

    let found = false;

    targets.forEach(selector => {
      const element = $(selector);
      if (!element) return;
      element.textContent = message;
      element.hidden = false;
      found = true;
    });

    if (!found) notify(message, "error");
  }

  function clearLoginError() {
    [
      "#loginMessage",
      "#adminGlobalMessage",
      "#adminError",
      "#adminLoginMessage"
    ].forEach(selector => {
      const element = $(selector);
      if (element) {
        element.textContent = "";
        element.hidden = true;
      }
    });
  }
  
(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART2) return;
  window.ZUNE_ADMIN_PART2 = true;

  const getClient = () => {
    if (window.ZUNE_ADMIN && window.ZUNE_ADMIN.client) {
      return window.ZUNE_ADMIN.client;
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase SDK haipatikani.");
    }

    const key = window.ZUNE_SUPABASE_ANON_KEY || "";
    if (!key) throw new Error("Supabase key haijawekwa.");

    const client = window.supabase.createClient(
      "https://rpkogiieegqgxqbzwxwo.supabase.co",
      key
    );

    window.ZUNE_ADMIN = { client };
    return client;
  };

  const $ = selector => document.querySelector(selector);

  async function checkAdminSession() {
    const client = getClient();

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session?.user) {
      window.location.replace("login.html?next=admin.html");
      return null;
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id,full_name,role,is_verified,created_at")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      await client.auth.signOut();
      window.location.replace("index.html?access=denied");
      return null;
    }

    window.ZUNE_ADMIN = {
      ...(window.ZUNE_ADMIN || {}),
      client,
      session,
      profile
    };

    return { client, session, profile };
  }

  async function signInAdmin(event) {
    event?.preventDefault();

    const client = getClient();
    const form = $("#adminLoginForm") || $("#loginForm");
    const email = (
      $("#adminEmail")?.value ||
      $("#loginEmail")?.value ||
      form?.querySelector('[name="email"]')?.value ||
      ""
    ).trim();

    const password =
      $("#adminPassword")?.value ||
      $("#loginPassword")?.value ||
      form?.querySelector('[name="password"]')?.value ||
      "";

    if (!email || !password) {
      throw new Error("Weka barua pepe na nenosiri.");
    }

    const button =
      form?.querySelector('[type="submit"]') ||
      $("#adminLoginButton");

    if (button) button.disabled = true;

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data?.session) {
        throw new Error("Kuingia hakukukamilika.");
      }

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id,full_name,role,is_verified")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== "admin") {
        await client.auth.signOut();
        throw new Error("Akaunti hii haina ruhusa ya Admin.");
      }

      window.location.replace("admin.html");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function signOutAdmin() {
    const client = getClient();

    const confirmed = window.confirm(
      "Una uhakika unataka kutoka kwenye Admin Dashboard?"
    );

    if (!confirmed) return;

    const { error } = await client.auth.signOut();
    if (error) throw error;

    window.location.replace("login.html");
  }

  function openAdminSection(section) {
    const destinations = {
      overview: "#overview",
      analytics: "#analytics",
      users: "#users",
      roles: "#roles",
      customerVerification: "#customer-verification",
      sellerVerification: "#seller-verification",
      sellerApplications: "#seller-applications",
      products: "#products",
      orders: "#orders",
      finance: "#finance",
      announcements: "#announcements",
      coupons: "#coupons",
      branding: "#branding",
      maintenance: "#maintenance",
      security: "#security",
      auditLogs: "#audit-logs",
      disputes: "#disputes",
      support: "#support",
      settings: "#settings"
    };

    if (!destinations[section]) {
      throw new Error("Sehemu haijatambuliwa: " + section);
    }

    const target = $(destinations[section]);

    if (!target) {
      notify(
        "Sehemu hii haipo kwenye admin.html: " + section,
        "error"
      );
      return;
    }

    document.querySelectorAll("[data-admin-section]").forEach(element => {
      element.hidden = element.dataset.adminSection !== section;
    });

    document.querySelectorAll("[data-admin-nav]").forEach(button => {
      const active = button.dataset.adminNav === section;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    target.hidden = false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    history.replaceState(null, "", destinations[section]);

    window.dispatchEvent(new CustomEvent("zune:admin-section", {
      detail: { section }
    }));
  }

  function initializeAdminNavigation() {
    document.addEventListener("click", event => {
      const nav = event.target.closest("[data-admin-nav]");
      if (nav) {
        event.preventDefault();
        openAdminSection(nav.dataset.adminNav);
        return;
      }

      const routeButton = event.target.closest("[data-admin-route]");
      if (routeButton) {
        event.preventDefault();

        const route = routeButton.dataset.adminRoute;
        const allowed = new Set([
          "index.html",
          "account.html",
          "notification.html",
          "seller.html",
          "seller-dashboard.html",
          "admin.html",
          "maintenance.html",
          "terms.html",
          "privacy.html"
        ]);

        if (allowed.has(route)) {
          window.location.href = route;
        }
      }
    });

    document.addEventListener("submit", event => {
      const form = event.target.closest("#adminLoginForm, #loginForm");
      if (form) {
        event.preventDefault();
        signInAdmin(event).catch(error =>
          window.ZUNE_ADMIN_SHOW_ERROR?.(error.message) ||
          alert(error.message)
        );
      }
    });

    const logoutButton =
      $("#adminLogoutButton") ||
      $('[data-admin-action="logout"]');

    logoutButton?.addEventListener("click", () => {
      signOutAdmin().catch(error => alert(error.message));
    });
  }

  window.ZUNE_ADMIN_AUTH = {
    getClient,
    checkAdminSession,
    signInAdmin,
    signOutAdmin,
    openAdminSection,
    initializeAdminNavigation
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAdminNavigation);
  } else {
    initializeAdminNavigation();
  }
})();
(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART3) return;
  window.ZUNE_ADMIN_PART3 = true;

  const $ = selector => document.querySelector(selector);

  const client = () =>
    window.ZUNE_ADMIN?.client ||
    window.ZUNE_ADMIN_AUTH?.getClient();

  const put = (selectors, value) => {
    for (const selector of selectors) {
      const element = $(selector);
      if (element) {
        element.textContent = String(value ?? "—");
        return;
      }
    }
  };

  const money = value =>
    new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  async function countRows(table, configure) {
    let query = client()
      .from(table)
      .select("*", { count: "exact", head: true });

    if (configure) query = configure(query);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }

  async function sumColumn(table, column, configure) {
    let query = client().from(table).select(column);
    if (configure) query = configure(query);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).reduce(
      (total, row) => total + Number(row[column] || 0),
      0
    );
  }

  async function loadDashboardStats() {
    const [
      customers,
      sellers,
      products,
      orders,
      pendingApplications,
      pendingCustomerVerification,
      pendingSellerVerification,
      totalSales
    ] = await Promise.all([
      countRows("profiles", query => query.eq("role", "buyer")),
      countRows("profiles", query => query.eq("role", "vendor")),
      countRows("products"),
      countRows("orders"),
      countRows("seller_applications", query =>
        query.eq("status", "pending")
      ),
      countRows("verification_requests", query =>
        query.eq("status", "pending")
      ),
      countRows("seller_verification_requests", query =>
        query.eq("status", "pending")
      ),
      sumColumn("orders", "total_price", query =>
        query.eq("status", "completed")
      )
    ]);

    put(["#statTotalCustomers", "[data-stat='customers']"], customers);
    put(["#statTotalSellers", "[data-stat='sellers']"], sellers);
    put(["#statTotalProducts", "[data-stat='products']"], products);
    put(["#statTotalOrders", "[data-stat='orders']"], orders);
    put(["#statTotalSales", "[data-stat='sales']"], money(totalSales));
    put(["#pendingAppsCount", "[data-stat='pending-applications']"], pendingApplications);
    put(["#pendingCustomerVerification", "[data-stat='customer-verification']"], pendingCustomerVerification);
    put(["#pendingSellerVerification", "[data-stat='seller-verification']"], pendingSellerVerification);

    const pendingTotal =
      pendingApplications +
      pendingCustomerVerification +
      pendingSellerVerification;

    put(["#adminPendingTotal", "[data-stat='pending-total']"], pendingTotal);

    return {
      customers,
      sellers,
      products,
      orders,
      pendingApplications,
      pendingCustomerVerification,
      pendingSellerVerification,
      totalSales
    };
  }

  async function loadRecentOrders(limit = 8) {
    const { data, error } = await client()
      .from("orders")
      .select("id,buyer_id,product_id,quantity,total_price,status,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const container =
      $("#recentOrdersTableBody") ||
      $("#recentOrdersBody") ||
      $("[data-admin-list='recent-orders']");

    if (!container) return data || [];

    if (!data?.length) {
      container.innerHTML =
        '<tr><td colspan="6">Hakuna oda zilizopatikana.</td></tr>';
      return [];
    }

    container.innerHTML = data.map(order => `
      <tr>
        <td>${escapeValue(order.id)}</td>
        <td>${escapeValue(order.buyer_id)}</td>
        <td>${Number(order.quantity || 0)}</td>
        <td>${money(order.total_price)}</td>
        <td>${escapeValue(order.status)}</td>
        <td>${escapeValue(new Date(order.created_at).toLocaleDateString("sw-TZ"))}</td>
      </tr>
    `).join("");

    return data;
  }

  async function loadRecentProducts(limit = 8) {
    const { data, error } = await client()
      .from("products")
      .select("id,title,price,stock_quantity,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const container =
      $("#recentProductsTableBody") ||
      $("#recentProductsBody") ||
      $("[data-admin-list='recent-products']");

    if (!container) return data || [];

    if (!data?.length) {
      container.innerHTML =
        '<tr><td colspan="5">Hakuna bidhaa zilizopatikana.</td></tr>';
      return [];
    }

    container.innerHTML = data.map(product => `
      <tr>
        <td>${escapeValue(product.title)}</td>
        <td>${money(product.price)}</td>
        <td>${Number(product.stock_quantity || 0)}</td>
        <td>${escapeValue(new Date(product.created_at).toLocaleDateString("sw-TZ"))}</td>
        <td><button type="button" data-admin-nav="products">Angalia</button></td>
      </tr>
    `).join("");

    return data;
  }

  function escapeValue(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  async function refreshDashboard() {
    const refreshButton = $("#refreshAdminDashboard");
    if (refreshButton) refreshButton.disabled = true;

    try {
      await Promise.all([
        loadDashboardStats(),
        loadRecentOrders(),
        loadRecentProducts()
      ]);

      window.ZUNE_ADMIN_SHOW_MESSAGE?.(
        "Takwimu zimesasishwa.",
        "success"
      );
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function initializeDashboard() {
    $("#refreshAdminDashboard")?.addEventListener("click", () => {
      refreshDashboard().catch(error =>
        window.ZUNE_ADMIN_SHOW_ERROR?.(error.message) ||
        alert(error.message)
      );
    });

    $("#exportAdminSummary")?.addEventListener("click", async () => {
      try {
        const stats = await loadDashboardStats();
        const rows = [
          ["Kipengele", "Thamani"],
          ["Wateja", stats.customers],
          ["Wauzaji", stats.sellers],
          ["Bidhaa", stats.products],
          ["Oda", stats.orders],
          ["Mauzo yaliyokamilika", stats.totalSales],
          ["Maombi ya wauzaji yanayosubiri", stats.pendingApplications],
          ["Uhakiki wa wateja unaosubiri", stats.pendingCustomerVerification],
          ["Uhakiki wa wauzaji unaosubiri", stats.pendingSellerVerification]
        ];

        const csv = rows.map(row =>
          row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
          ).join(",")
        ).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
          type: "text/csv;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "zune-admin-summary.csv";
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  window.ZUNE_ADMIN_DASHBOARD = {
    loadDashboardStats,
    loadRecentOrders,
    loadRecentProducts,
    refreshDashboard
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDashboard);
  } else {
    initializeDashboard();
  }
})();

(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART4) return;
  window.ZUNE_ADMIN_PART4 = true;

  const $ = selector => document.querySelector(selector);

  const client = () => window.ZUNE_ADMIN?.client;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const money = value =>
    new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  async function loadUsers() {
    const search = ($("#adminUserSearch")?.value || "").trim().toLowerCase();
    const role = $("#adminUserRoleFilter")?.value || "";

    let query = client()
      .from("profiles")
      .select("id,full_name,phone_number,role,is_verified,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (role) query = query.eq("role", role);

    const { data, error } = await query;
    if (error) throw error;

    const users = (data || []).filter(user => {
      const searchable = [
        user.full_name,
        user.phone_number,
        user.id,
        user.role
      ].join(" ").toLowerCase();

      return searchable.includes(search);
    });

    const container =
      $("#adminUsersTableBody") ||
      $("#usersTableBody") ||
      $("[data-admin-list='users']");

    if (!container) return users;

    container.innerHTML = users.length
      ? users.map(user => `
        <tr>
          <td>${esc(user.full_name || "—")}</td>
          <td>${esc(user.phone_number || "—")}</td>
          <td>${esc(user.role)}</td>
          <td>${user.is_verified ? "Imethibitishwa" : "Haijathibitishwa"}</td>
          <td>${esc(new Date(user.created_at).toLocaleDateString("sw-TZ"))}</td>
          <td>
            <button type="button" data-user-detail="${esc(user.id)}">Taarifa</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna watumiaji waliopatikana.</td></tr>';

    return users;
  }

  async function showUserDetail(userId) {
    const { data, error } = await client()
      .from("profiles")
      .select("id,full_name,phone_number,role,is_verified,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Mtumiaji hajapatikana.");

    const output = [
      `Jina: ${data.full_name || "—"}`,
      `Simu: ${data.phone_number || "—"}`,
      `Role: ${data.role}`,
      `Verified: ${data.is_verified ? "Ndiyo" : "Hapana"}`,
      `ID: ${data.id}`,
      `Amejiunga: ${data.created_at || "—"}`
    ].join("\n");

    const dialog = $("#adminUserDetailDialog");
    const content = $("#adminUserDetailContent");

    if (dialog && content) {
      content.textContent = output;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.hidden = false;
    } else {
      alert(output);
    }

    return data;
  }

  async function changeUserRole(userId, newRole) {
    const allowedRoles = ["buyer", "vendor", "admin"];

    if (!allowedRoles.includes(newRole)) {
      throw new Error("Role iliyochaguliwa hairuhusiwi.");
    }

    const currentUserId = window.ZUNE_ADMIN?.session?.user?.id;

    if (userId === currentUserId) {
      throw new Error("Huwezi kubadilisha role ya akaunti yako hapa.");
    }

    const confirmed = confirm(
      `Unataka kubadilisha role ya mtumiaji kuwa ${newRole}?`
    );

    if (!confirmed) return;

    const { error } = await client()
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) throw error;

    message(
      "Ombi limetumwa. Mabadiliko yatafanikiwa tu ikiwa sera za usalama zinaruhusu.",
      "success"
    );

    await loadUsers();
  }

  async function loadSellerApplications() {
    const filter = $("#sellerApplicationStatusFilter")?.value || "";
    const search = (
      $("#sellerApplicationSearch")?.value || ""
    ).trim().toLowerCase();

    let query = client()
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (filter) query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) throw error;

    const applications = (data || []).filter(application => {
      const searchable = [
        application.store_name,
        application.owner_name,
        application.phone,
        application.email,
        application.country,
        application.city,
        application.status,
        application.id
      ].join(" ").toLowerCase();

      return searchable.includes(search);
    });

    const container =
      $("#sellerApplicationsTableBody") ||
      $("#sellerApplicationsBody") ||
      $("[data-admin-list='seller-applications']");

    if (!container) return applications;

    container.innerHTML = applications.length
      ? applications.map(application => `
        <tr>
          <td>${esc(application.store_name)}</td>
          <td>${esc(application.owner_name)}</td>
          <td>${esc(application.phone)}</td>
          <td>${esc(application.country)}</td>
          <td>${esc(application.city)}</td>
          <td>${esc(application.status)}</td>
          <td>
            <button type="button" data-seller-application-detail="${esc(application.id)}">
              Fungua
            </button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="7">Hakuna maombi yaliyopatikana.</td></tr>';

    return applications;
  }

  async function showSellerApplication(applicationId) {
    const { data, error } = await client()
      .from("seller_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Ombi halijapatikana.");

    const container =
      $("#sellerApplicationDetail") ||
      $("#sellerApplicationDetails");

    if (!container) {
      alert([
        `Duka: ${data.store_name || "—"}`,
        `Mmiliki: ${data.owner_name || "—"}`,
        `Simu: ${data.phone || "—"}`,
        `Barua pepe: ${data.email || "—"}`,
        `Nchi: ${data.country || "—"}`,
        `Mkoa: ${data.region || "—"}`,
        `Wilaya: ${data.district || "—"}`,
        `Mji: ${data.city || "—"}`,
        `Aina ya biashara: ${data.category || "—"}`,
        `Hali: ${data.status || "—"}`
      ].join("\n"));
      return data;
    }

    container.hidden = false;
    container.dataset.applicationId = data.id;

    container.innerHTML = `
      <h3>${esc(data.store_name || "Duka")}</h3>
      <p><strong>Mmiliki:</strong> ${esc(data.owner_name || "—")}</p>
      <p><strong>Simu:</strong> ${esc(data.phone || "—")}</p>
      <p><strong>Barua pepe:</strong> ${esc(data.email || "—")}</p>
      <p><strong>Nchi:</strong> ${esc(data.country || "—")}</p>
      <p><strong>Mkoa:</strong> ${esc(data.region || "—")}</p>
      <p><strong>Wilaya:</strong> ${esc(data.district || "—")}</p>
      <p><strong>Mji:</strong> ${esc(data.city || "—")}</p>
      <p><strong>Aina:</strong> ${esc(data.category || "—")}</p>
      <p><strong>TIN:</strong> ${esc(data.tin_number || "—")}</p>
      <p><strong>Hali:</strong> ${esc(data.status || "—")}</p>
      <p><strong>Tarehe:</strong> ${esc(data.created_at || "—")}</p>
      <button type="button" data-application-decision="approved">Idhinisha</button>
      <button type="button" data-application-decision="rejected">Kataa</button>
      <button type="button" data-application-decision="pending">Rudisha kusubiri</button>
    `;

    return data;
  }

  async function updateSellerApplication(applicationId, status) {
    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Hali ya ombi si sahihi.");
    }

    if (!confirm(`Unataka kuweka hali ya ombi kuwa ${status}?`)) return;

    const { data: application, error: fetchError } = await client()
      .from("seller_applications")
      .select("id,store_name,owner_name,status")
      .eq("id", applicationId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!application) throw new Error("Ombi halijapatikana.");

    const { error } = await client()
      .from("seller_applications")
      .update({ status })
      .eq("id", applicationId);

    if (error) throw error;

    message(
      "Ombi limefanyiwa kazi ikiwa ruhusa za database zinaruhusu.",
      "success"
    );

    await loadSellerApplications();
  }

  function initializeUserAndApplicationEvents() {
    $("#adminUserSearch")?.addEventListener("input", () =>
      loadUsers().catch(error => message(error.message, "error"))
    );

    $("#adminUserRoleFilter")?.addEventListener("change", () =>
      loadUsers().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminUsers")?.addEventListener("click", () =>
      loadUsers().catch(error => message(error.message, "error"))
    );

    $("#sellerApplicationSearch")?.addEventListener("input", () =>
      loadSellerApplications().catch(error => message(error.message, "error"))
    );

    $("#sellerApplicationStatusFilter")?.addEventListener("change", () =>
      loadSellerApplications().catch(error => message(error.message, "error"))
    );

    $("#refreshSellerApplications")?.addEventListener("click", () =>
      loadSellerApplications().catch(error => message(error.message, "error"))
    );

    document.addEventListener("click", event => {
      const detailButton = event.target.closest("[data-user-detail]");
      if (detailButton) {
        showUserDetail(detailButton.dataset.userDetail)
          .catch(error => message(error.message, "error"));
      }

      const applicationButton = event.target.closest(
        "[data-seller-application-detail]"
      );

      if (applicationButton) {
        showSellerApplication(
          applicationButton.dataset.sellerApplicationDetail
        ).catch(error => message(error.message, "error"));
      }

      const decisionButton = event.target.closest(
        "[data-application-decision]"
      );

      if (decisionButton) {
        const container =
          $("#sellerApplicationDetail") ||
          $("#sellerApplicationDetails");

        const id = container?.dataset.applicationId;
        if (!id) return;

        updateSellerApplication(
          id,
          decisionButton.dataset.applicationDecision
        ).then(() => showSellerApplication(id))
         .catch(error => message(error.message, "error"));
      }

      const roleButton = event.target.closest("[data-user-role]");
      if (roleButton) {
        changeUserRole(
          roleButton.dataset.userId,
          roleButton.dataset.userRole
        ).catch(error => message(error.message, "error"));
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUserAndApplicationEvents);
  } else {
    initializeUserAndApplicationEvents();
  }
})();

(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART5) return;
  window.ZUNE_ADMIN_PART5 = true;

  const $ = selector => document.querySelector(selector);
  const client = () => window.ZUNE_ADMIN?.client;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  async function loadVerificationRequests(kind) {
    const isCustomer = kind === "customer";
    const table = isCustomer
      ? "verification_requests"
      : "seller_verification_requests";

    const statusFilter = isCustomer
      ? $("#customerVerificationStatusFilter")
      : $("#sellerVerificationStatusFilter");

    const searchInput = isCustomer
      ? $("#customerVerificationSearch")
      : $("#sellerVerificationSearch");

    const container = isCustomer
      ? (
        $("#customerVerificationTableBody") ||
        $("[data-admin-list='customer-verification']")
      )
      : (
        $("#sellerVerificationTableBody") ||
        $("[data-admin-list='seller-verification']")
      );

    const status = statusFilter?.value || "";
    const search = (searchInput?.value || "").trim().toLowerCase();

    let query = client()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const requests = (data || []).filter(request => {
      const searchable = [
        request.id,
        request.user_id,
        request.profile_id,
        request.full_name,
        request.name,
        request.phone,
        request.status
      ].join(" ").toLowerCase();

      return searchable.includes(search);
    });

    if (!container) return requests;

    container.innerHTML = requests.length
      ? requests.map(request => `
        <tr>
          <td>${esc(request.full_name || request.name || request.user_id || request.profile_id || "—")}</td>
          <td>${esc(request.phone || "—")}</td>
          <td>${esc(request.status || "pending")}</td>
          <td>${esc(request.created_at || "—")}</td>
          <td>
            <button type="button"
              data-verification-detail="${esc(request.id)}"
              data-verification-kind="${kind}">
              Kagua
            </button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="5">Hakuna maombi ya uhakiki yaliyopatikana.</td></tr>';

    return requests;
  }

  async function showVerificationRequest(kind, requestId) {
    const table = kind === "customer"
      ? "verification_requests"
      : "seller_verification_requests";

    const { data, error } = await client()
      .from(table)
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Ombi la uhakiki halijapatikana.");

    const detailSelector = kind === "customer"
      ? "#customerVerificationDetail"
      : "#sellerVerificationDetail";

    const container = $(detailSelector);

    if (!container) {
      alert(JSON.stringify(data, null, 2));
      return data;
    }

    container.hidden = false;
    container.dataset.requestId = requestId;
    container.dataset.verificationKind = kind;

    const fields = Object.entries(data)
      .filter(([key]) => !/password|token|secret/i.test(key))
      .map(([key, value]) => `
        <p><strong>${esc(key)}:</strong> ${esc(
          typeof value === "object" ? JSON.stringify(value) : value
        )}</p>
      `).join("");

    container.innerHTML = `
      <h3>${kind === "customer" ? "Uhakiki wa Mteja — Gold" : "Uhakiki wa Muuzaji — Green"}</h3>
      ${fields}
      <label for="${kind}VerificationAdminNote">Maelezo ya Admin</label>
      <textarea id="${kind}VerificationAdminNote" rows="3"></textarea>
      <div>
        <button type="button" data-verification-decision="approved">Idhinisha</button>
        <button type="button" data-verification-decision="rejected">Kataa</button>
        <button type="button" data-verification-decision="changes_requested">Omba marekebisho</button>
      </div>
    `;

    return data;
  }

  async function updateVerificationRequest(kind, requestId, status, note = "") {
    const allowed = ["approved", "rejected", "changes_requested"];

    if (!allowed.includes(status)) {
      throw new Error("Uamuzi wa uhakiki si sahihi.");
    }

    const table = kind === "customer"
      ? "verification_requests"
      : "seller_verification_requests";

    const current = window.ZUNE_ADMIN?.profile;

    if (!current || current.role !== "admin") {
      throw new Error("Ruhusa ya Admin inahitajika.");
    }

    if (!confirm(`Unataka kuweka hali ya uhakiki kuwa ${status}?`)) {
      return;
    }

    const { data: existing, error: readError } = await client()
      .from(table)
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (readError) throw readError;
    if (!existing) throw new Error("Ombi halijapatikana.");

    // Tunatuma tu fields zinazojulikana; ikiwa schema haitambui field,
    // ujumbe wa Supabase utaonyesha kosa bila kufuta taarifa nyingine.
    const updatePayload = { status };

    if ("admin_note" in existing) updatePayload.admin_note = note;
    if ("reviewed_by" in existing) updatePayload.reviewed_by = current.id;
    if ("reviewed_at" in existing) updatePayload.reviewed_at = new Date().toISOString();

    const { error: updateError } = await client()
      .from(table)
      .update(updatePayload)
      .eq("id", requestId);

    if (updateError) throw updateError;

    // Badge ya mteja inahitaji profile ID inayotambulika.
    // Mabadiliko ya is_verified yanafanywa tu ikiwa schema na sera zinaruhusu.
    if (status === "approved" && kind === "customer") {
      const userId = existing.user_id || existing.profile_id;

      if (userId && existing.user_id) {
        const { error: profileError } = await client()
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", userId);

        if (profileError) {
          message(
            "Ombi limeidhinishwa lakini profile badge haikusasishwa: " +
            profileError.message,
            "error"
          );
        }
      }
    }

    message(
      "Uamuzi umehifadhiwa ikiwa sera za database zinaruhusu.",
      "success"
    );

    await loadVerificationRequests(kind);
  }

  function initializeVerificationEvents() {
    $("#customerVerificationStatusFilter")?.addEventListener("change", () =>
      loadVerificationRequests("customer").catch(error => message(error.message, "error"))
    );

    $("#customerVerificationSearch")?.addEventListener("input", () =>
      loadVerificationRequests("customer").catch(error => message(error.message, "error"))
    );

    $("#sellerVerificationStatusFilter")?.addEventListener("change", () =>
      loadVerificationRequests("seller").catch(error => message(error.message, "error"))
    );

    $("#sellerVerificationSearch")?.addEventListener("input", () =>
      loadVerificationRequests("seller").catch(error => message(error.message, "error"))
    );

    document.addEventListener("click", event => {
      const detailButton = event.target.closest("[data-verification-detail]");

      if (detailButton) {
        showVerificationRequest(
          detailButton.dataset.verificationKind,
          detailButton.dataset.verificationDetail
        ).catch(error => message(error.message, "error"));
      }

      const decisionButton = event.target.closest("[data-verification-decision]");

      if (decisionButton) {
        const container = decisionButton.closest("[data-request-id]") ||
          decisionButton.closest("#customerVerificationDetail, #sellerVerificationDetail");

        const requestId = container?.dataset.requestId;
        const kind = container?.dataset.verificationKind;
        if (!requestId || !kind) return;

        const noteSelector = kind === "customer"
          ? "#customerVerificationAdminNote"
          : "#sellerVerificationAdminNote";

        updateVerificationRequest(
          kind,
          requestId,
          decisionButton.dataset.verificationDecision,
          $(noteSelector)?.value || ""
        ).catch(error => message(error.message, "error"));
      }
    });
  }

  window.ZUNE_ADMIN_VERIFICATION = {
    loadVerificationRequests,
    showVerificationRequest,
    updateVerificationRequest
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeVerificationEvents);
  } else {
    initializeVerificationEvents();
  }
})();
(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART6) return;
  window.ZUNE_ADMIN_PART6 = true;

  const $ = selector => document.querySelector(selector);
  const client = () => window.ZUNE_ADMIN?.client;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const money = value =>
    new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  async function loadProducts() {
    const search = ($("#adminProductSearch")?.value || "").trim().toLowerCase();

    const { data, error } = await client()
      .from("products")
      .select("id,vendor_id,title,description,price,stock_quantity,image_url,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const rows = (data || []).filter(product =>
      [
        product.title,
        product.description,
        product.vendor_id,
        product.id
      ].join(" ").toLowerCase().includes(search)
    );

    const container =
      $("#adminProductsTableBody") ||
      $("[data-admin-list='products']");

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(product => `
        <tr>
          <td>${esc(product.title)}</td>
          <td>${money(product.price)}</td>
          <td>${Number(product.stock_quantity || 0)}</td>
          <td>${esc(product.vendor_id)}</td>
          <td>${esc(product.created_at || "—")}</td>
          <td>
            <button type="button" data-product-detail="${esc(product.id)}">Taarifa</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">Hakuna bidhaa zilizopatikana.</td></tr>';

    return rows;
  }

  async function showProductDetail(productId) {
    const { data, error } = await client()
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Bidhaa haijapatikana.");

    const detail = [
      `Jina: ${data.title || "—"}`,
      `Bei: ${money(data.price)}`,
      `Stock: ${data.stock_quantity ?? 0}`,
      `Muuzaji: ${data.vendor_id || "—"}`,
      `Maelezo: ${data.description || "—"}`,
      `ID: ${data.id}`
    ].join("\n");

    alert(detail);
    return data;
  }

  async function loadOrders() {
    const status = $("#adminOrderStatusFilter")?.value || "";
    const search = ($("#adminOrderSearch")?.value || "").trim().toLowerCase();

    let query = client()
      .from("orders")
      .select("id,buyer_id,product_id,quantity,total_price,commission_fee,status,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).filter(order =>
      [
        order.id,
        order.buyer_id,
        order.product_id,
        order.status
      ].join(" ").toLowerCase().includes(search)
    );

    const container =
      $("#adminOrdersTableBody") ||
      $("[data-admin-list='orders']");

    if (!container) return rows;

    container.innerHTML = rows.length
      ? rows.map(order => `
        <tr>
          <td>${esc(order.id)}</td>
          <td>${esc(order.buyer_id)}</td>
          <td>${esc(order.product_id)}</td>
          <td>${Number(order.quantity || 0)}</td>
          <td>${money(order.total_price)}</td>
          <td>${esc(order.status)}</td>
          <td>${esc(order.created_at || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="7">Hakuna oda zilizopatikana.</td></tr>';

    return rows;
  }

  async function loadFinanceSummary() {
    const { data, error } = await client()
      .from("orders")
      .select("total_price,commission_fee,status")
      .limit(5000);

    if (error) throw error;

    const completed = (data || []).filter(order => order.status === "completed");

    const sales = completed.reduce(
      (sum, order) => sum + Number(order.total_price || 0), 0
    );

    const commission = completed.reduce(
      (sum, order) => sum + Number(order.commission_fee || 0), 0
    );

    const pending = (data || [])
      .filter(order => order.status === "pending")
      .reduce((sum, order) => sum + Number(order.total_price || 0), 0);

    const set = (selectors, value) => {
      for (const selector of selectors) {
        const element = $(selector);
        if (element) {
          element.textContent = value;
          return;
        }
      }
    };

    set(["#financeTotalSales", "[data-finance='sales']"], money(sales));
    set(["#financeTotalCommission", "[data-finance='commission']"], money(commission));
    set(["#financePendingOrders", "[data-finance='pending']"], money(pending));

    return { sales, commission, pending };
  }

  async function loadDisputes() {
    const container =
      $("#adminDisputesTableBody") ||
      $("[data-admin-list='disputes']");

    const { data, error } = await client()
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        message("Jedwali la disputes halijasanidiwa kwenye Supabase.", "error");
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
          <td>${esc(dispute.created_at || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna migogoro iliyopatikana.</td></tr>';

    return data || [];
  }

  function initializeProductOrderEvents() {
    $("#adminProductSearch")?.addEventListener("input", () =>
      loadProducts().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminProducts")?.addEventListener("click", () =>
      loadProducts().catch(error => message(error.message, "error"))
    );

    $("#adminOrderSearch")?.addEventListener("input", () =>
      loadOrders().catch(error => message(error.message, "error"))
    );

    $("#adminOrderStatusFilter")?.addEventListener("change", () =>
      loadOrders().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminOrders")?.addEventListener("click", () =>
      loadOrders().catch(error => message(error.message, "error"))
    );

    $("#refreshFinanceSummary")?.addEventListener("click", () =>
      loadFinanceSummary().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminDisputes")?.addEventListener("click", () =>
      loadDisputes().catch(error => message(error.message, "error"))
    );

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-product-detail]");
      if (!button) return;

      showProductDetail(button.dataset.productDetail)
        .catch(error => message(error.message, "error"));
    });
  }

  window.ZUNE_ADMIN_COMMERCE = {
    loadProducts,
    showProductDetail,
    loadOrders,
    loadFinanceSummary,
    loadDisputes
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeProductOrderEvents);
  } else {
    initializeProductOrderEvents();
  }
})();
(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART7) return;
  window.ZUNE_ADMIN_PART7 = true;

  const $ = selector => document.querySelector(selector);
  const client = () => window.ZUNE_ADMIN?.client;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  function getAnnouncementFormValues() {
    const title = ($("#announcementTitle")?.value || "").trim();
    const body = ($("#announcementMessage")?.value || "").trim();
    const audience = $("#announcementAudience")?.value || "all";
    const displayMode = $("#announcementDisplayMode")?.value || "notification";
    const priority = $("#announcementPriority")?.value || "normal";
    const expiresAt = $("#announcementExpiresAt")?.value || null;
    const startsAt = $("#announcementStartsAt")?.value || null;

    if (!title || !body) {
      throw new Error("Weka kichwa na ujumbe wa tangazo.");
    }

    if (!["customers", "sellers", "all"].includes(audience)) {
      throw new Error("Walengwa hawajatambuliwa.");
    }

    if (!["notification", "slide", "both"].includes(displayMode)) {
      throw new Error("Aina ya tangazo haijatambuliwa.");
    }

    return {
      title,
      message: body,
      audience,
      display_mode: displayMode,
      priority,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "published",
      created_by: window.ZUNE_ADMIN?.profile?.id
    };
  }

  async function loadAnnouncements() {
    const container =
      $("#adminAnnouncementsTableBody") ||
      $("[data-admin-list='announcements']");

    const { data, error } = await client()
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        message(
          "Jedwali la announcements halipo kwenye Supabase. Sanidi schema kabla ya kutuma matangazo.",
          "error"
        );
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(item => `
        <tr>
          <td>${esc(item.title)}</td>
          <td>${esc(item.audience || "all")}</td>
          <td>${esc(item.display_mode || "notification")}</td>
          <td>${esc(item.priority || "normal")}</td>
          <td>${esc(item.status || "published")}</td>
          <td>${esc(item.expires_at || "—")}</td>
          <td>
            <button type="button" data-announcement-edit="${esc(item.id)}">Hariri</button>
            <button type="button" data-announcement-stop="${esc(item.id)}">Sitisha</button>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="7">Hakuna matangazo yaliyopatikana.</td></tr>';

    return data || [];
  }

  async function publishAnnouncement(event) {
    event?.preventDefault();

    const form = $("#adminAnnouncementForm");
    const submit = form?.querySelector('[type="submit"]');

    if (submit) submit.disabled = true;

    try {
      const payload = getAnnouncementFormValues();
      const announcementId = $("#announcementId")?.value;

      let result;

      if (announcementId) {
        result = await client()
          .from("announcements")
          .update(payload)
          .eq("id", announcementId)
          .select()
          .single();
      } else {
        result = await client()
          .from("announcements")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      message(
        "Tangazo limehifadhiwa. Watumiaji wataliona tu ikiwa schema, RLS na notification.js vimeunganishwa.",
        "success"
      );

      form?.reset();
      if ($("#announcementId")) $("#announcementId").value = "";

      await loadAnnouncements();
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function editAnnouncement(id) {
    const { data, error } = await client()
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Tangazo halijapatikana.");

    const assign = (selector, value) => {
      const element = $(selector);
      if (element) element.value = value ?? "";
    };

    assign("#announcementId", data.id);
    assign("#announcementTitle", data.title);
    assign("#announcementMessage", data.message);
    assign("#announcementAudience", data.audience);
    assign("#announcementDisplayMode", data.display_mode);
    assign("#announcementPriority", data.priority);
    assign("#announcementStartsAt", data.starts_at?.slice(0, 16));
    assign("#announcementExpiresAt", data.expires_at?.slice(0, 16));

    window.ZUNE_ADMIN_AUTH?.openAdminSection("announcements");
    $("#announcementTitle")?.focus();

    return data;
  }

  async function stopAnnouncement(id) {
    if (!confirm("Unataka kusitisha tangazo hili?")) return;

    const { error } = await client()
      .from("announcements")
      .update({ status: "paused" })
      .eq("id", id);

    if (error) throw error;

    message("Ombi la kusitisha tangazo limetumwa.", "success");
    await loadAnnouncements();
  }

  function previewAnnouncement() {
    try {
      const payload = getAnnouncementFormValues();
      const preview = $("#announcementPreview");

      if (!preview) {
        alert(
          `${payload.title}\n\n${payload.message}\n\nWalengwa: ${payload.audience}\nMuonekano: ${payload.display_mode}`
        );
        return;
      }

      preview.hidden = false;
      preview.innerHTML = `
        <article class="zune-announcement-preview">
          <small>${esc(payload.audience)} · ${esc(payload.display_mode)}</small>
          <h3>${esc(payload.title)}</h3>
          <p>${esc(payload.message).replace(/\n/g, "<br>")}</p>
          <small>Kipaumbele: ${esc(payload.priority)}</small>
        </article>
      `;
    } catch (error) {
      message(error.message, "error");
    }
  }

  function initializeAnnouncementEvents() {
    $("#adminAnnouncementForm")?.addEventListener("submit", event => {
      publishAnnouncement(event).catch(error => message(error.message, "error"));
    });

    $("#previewAnnouncementButton")?.addEventListener("click", previewAnnouncement);

    $("#refreshAdminAnnouncements")?.addEventListener("click", () =>
      loadAnnouncements().catch(error => message(error.message, "error"))
    );

    document.addEventListener("click", event => {
      const editButton = event.target.closest("[data-announcement-edit]");
      if (editButton) {
        editAnnouncement(editButton.dataset.announcementEdit)
          .catch(error => message(error.message, "error"));
      }

      const stopButton = event.target.closest("[data-announcement-stop]");
      if (stopButton) {
        stopAnnouncement(stopButton.dataset.announcementStop)
          .catch(error => message(error.message, "error"));
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAnnouncementEvents);
  } else {
    initializeAnnouncementEvents();
  }
})();

(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART8) return;
  window.ZUNE_ADMIN_PART8 = true;

  const $ = selector => document.querySelector(selector);
  const client = () => window.ZUNE_ADMIN?.client;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  async function loadCoupons() {
    const container =
      $("#adminCouponsTableBody") ||
      $("[data-admin-list='coupons']");

    const { data, error } = await client()
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        message("Jedwali la coupons halijasanidiwa kwenye Supabase.", "error");
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
          <td>${esc(coupon.expires_at || "—")}</td>
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

    const code = ($("#couponCode")?.value || "").trim().toUpperCase();
    const discountType = $("#couponDiscountType")?.value || "percentage";
    const discountValue = Number($("#couponDiscountValue")?.value || 0);
    const minimumOrder = Number($("#couponMinimumOrder")?.value || 0);
    const usageLimitValue = $("#couponUsageLimit")?.value;
    const startsAt = $("#couponStartsAt")?.value || null;
    const expiresAt = $("#couponExpiresAt")?.value || null;

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new Error("Code ya coupon iwe na herufi/namba 3–40.");
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      throw new Error("Aina ya punguzo si sahihi.");
    }

    if (discountValue <= 0) {
      throw new Error("Weka thamani sahihi ya punguzo.");
    }

    if (discountType === "percentage" && discountValue > 100) {
      throw new Error("Punguzo la asilimia haliwezi kuzidi 100%.");
    }

    const payload = {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      minimum_order_amount: minimumOrder,
      usage_limit: usageLimitValue ? Number(usageLimitValue) : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active"
    };

    const { error } = await client()
      .from("coupons")
      .insert(payload);

    if (error) throw error;

    message("Coupon imehifadhiwa.", "success");
    $("#adminCouponForm")?.reset();
    await loadCoupons();
  }

  async function toggleCoupon(id) {
    const { data, error: readError } = await client()
      .from("coupons")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();

    if (readError) throw readError;
    if (!data) throw new Error("Coupon haijapatikana.");

    const nextStatus = data.status === "active" ? "disabled" : "active";

    if (!confirm(`Unataka kuweka coupon kuwa ${nextStatus}?`)) return;

    const { error } = await client()
      .from("coupons")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) throw error;

    message("Hali ya coupon imesasishwa.", "success");
    await loadCoupons();
  }

  function initializeLogoPreview() {
    const input = $("#zuneLogoUpload");
    const preview = $("#zuneLogoPreview");

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        message("Chagua faili la picha.", "error");
        input.value = "";
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        message("Picha isizidi MB 3.", "error");
        input.value = "";
        return;
      }

      const url = URL.createObjectURL(file);

      if (preview) {
        preview.hidden = false;
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

    const clientInstance = client();

    // Bucket ya Storage lazima iwepo na sera zake ziwe salama.
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `branding/zune-logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await clientInstance
      .storage
      .from("site-assets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = clientInstance
      .storage
      .from("site-assets")
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      throw new Error("URL ya logo haikupatikana.");
    }

    // Hifadhi ya setting hutegemea schema ya site_settings.
    const { error: settingsError } = await clientInstance
      .from("site_settings")
      .upsert({
        key: "zune_logo_url",
        value: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: window.ZUNE_ADMIN?.profile?.id
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
      preview.innerHTML = `<img src="${esc(publicUrl)}" alt="Logo mpya ya ZUNE"
        style="max-width:180px;max-height:180px;object-fit:contain">`;
    }

    message("Logo imechapishwa kwenye settings.", "success");
  }

  async function loadCurrentLogo() {
    const { data, error } = await client()
      .from("site_settings")
      .select("key,value")
      .eq("key", "zune_logo_url")
      .maybeSingle();

    if (error) throw error;

    const url = data?.value;
    const preview = $("#zuneLogoPreview");

    if (url && preview) {
      preview.hidden = false;
      preview.innerHTML = `<img src="${esc(url)}" alt="Logo ya sasa ya ZUNE"
        style="max-width:180px;max-height:180px;object-fit:contain">`;
    }

    return url || null;
  }

  function initializeBrandingEvents() {
    $("#adminCouponForm")?.addEventListener("submit", event => {
      saveCoupon(event).catch(error => message(error.message, "error"));
    });

    $("#refreshAdminCoupons")?.addEventListener("click", () =>
      loadCoupons().catch(error => message(error.message, "error"))
    );

    $("#publishZuneLogo")?.addEventListener("click", () =>
      publishLogo().catch(error => message(error.message, "error"))
    );

    $("#loadCurrentZuneLogo")?.addEventListener("click", () =>
      loadCurrentLogo().catch(error => message(error.message, "error"))
    );

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-coupon-toggle]");
      if (!button) return;

      toggleCoupon(button.dataset.couponToggle)
        .catch(error => message(error.message, "error"));
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBrandingEvents);
  } else {
    initializeBrandingEvents();
  }
})();

(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART9) return;
  window.ZUNE_ADMIN_PART9 = true;

  const $ = selector => document.querySelector(selector);
  const client = () => window.ZUNE_ADMIN?.client;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function message(text, type = "info") {
    if (window.ZUNE_ADMIN_SHOW_MESSAGE) {
      window.ZUNE_ADMIN_SHOW_MESSAGE(text, type);
    } else {
      alert(text);
    }
  }

  async function loadMaintenanceSettings() {
    const { data, error } = await client()
      .from("site_settings")
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

    const enabled = String(settings.maintenance_enabled) === "true";

    const checkbox = $("#maintenanceEnabled");
    if (checkbox) checkbox.checked = enabled;

    if ($("#maintenanceMessage")) {
      $("#maintenanceMessage").value = settings.maintenance_message || "";
    }

    if ($("#maintenanceEndAt")) {
      $("#maintenanceEndAt").value =
        settings.maintenance_end_at?.slice(0, 16) || "";
    }

    return settings;
  }

  async function saveMaintenanceSettings(event) {
    event?.preventDefault();

    const enabled = Boolean($("#maintenanceEnabled")?.checked);
    const maintenanceMessage = (
      $("#maintenanceMessage")?.value || ""
    ).trim();

    const endAt = $("#maintenanceEndAt")?.value || null;

    if (enabled && !maintenanceMessage) {
      throw new Error("Weka ujumbe wa matengenezo.");
    }

    if (enabled && !confirm(
      "Unataka kuwezesha hali ya matengenezo? Hakikisha ukurasa wa maintenance umeunganishwa."
    )) {
      return;
    }

    const updatedAt = new Date().toISOString();

    const settings = [
      {
        key: "maintenance_enabled",
        value: String(enabled),
        updated_at: updatedAt,
        updated_by: window.ZUNE_ADMIN?.profile?.id
      },
      {
        key: "maintenance_message",
        value: maintenanceMessage,
        updated_at: updatedAt,
        updated_by: window.ZUNE_ADMIN?.profile?.id
      },
      {
        key: "maintenance_end_at",
        value: endAt ? new Date(endAt).toISOString() : "",
        updated_at: updatedAt,
        updated_by: window.ZUNE_ADMIN?.profile?.id
      }
    ];

    const { error } = await client()
      .from("site_settings")
      .upsert(settings, { onConflict: "key" });

    if (error) throw error;

    message(
      "Mipangilio imehifadhiwa. GitHub Pages haitazuia routes zote bila enforcement ya server/backend.",
      "success"
    );
  }

  async function loadAuditLogs() {
    const container =
      $("#adminAuditLogsTableBody") ||
      $("[data-admin-list='audit-logs']");

    const { data, error } = await client()
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        message("Jedwali la audit logs halijasanidiwa kwenye Supabase.", "error");
        return [];
      }
      throw error;
    }

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(log => `
        <tr>
          <td>${esc(log.created_at || "—")}</td>
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
    const container =
      $("#adminRolesTableBody") ||
      $("[data-admin-list='roles']");

    const { data, error } = await client()
      .from("profiles")
      .select("id,full_name,role,created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw error;

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(admin => `
        <tr>
          <td>${esc(admin.full_name || "Admin")}</td>
          <td>${esc(admin.id)}</td>
          <td>${esc(admin.role)}</td>
          <td>${esc(admin.created_at || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna Admin aliyepatikana.</td></tr>';

    return data || [];
  }

  async function loadSecurityEvents() {
    const container =
      $("#adminSecurityEventsTableBody") ||
      $("[data-admin-list='security-events']");

    const { data, error } = await client()
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!container) return data || [];

    container.innerHTML = data?.length
      ? data.map(item => `
        <tr>
          <td>${esc(item.created_at || "—")}</td>
          <td>${esc(item.action || "—")}</td>
          <td>${esc(item.admin_id || "—")}</td>
          <td>${esc(item.result || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4">Hakuna matukio yaliyorekodiwa.</td></tr>';

    return data || [];
  }

  function initializeMaintenanceSecurityEvents() {
    $("#adminMaintenanceForm")?.addEventListener("submit", event => {
      saveMaintenanceSettings(event).catch(error => message(error.message, "error"));
    });

    $("#refreshMaintenanceSettings")?.addEventListener("click", () =>
      loadMaintenanceSettings().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminAuditLogs")?.addEventListener("click", () =>
      loadAuditLogs().catch(error => message(error.message, "error"))
    );

    $("#refreshAdminRoles")?.addEventListener("click", () =>
      loadAdminRoles().catch(error => message(error.message, "error"))
    );

    $("#refreshSecurityEvents")?.addEventListener("click", () =>
      loadSecurityEvents().catch(error => message(error.message, "error"))
    );
  }

  window.ZUNE_ADMIN_SECURITY = {
    loadMaintenanceSettings,
    saveMaintenanceSettings,
    loadAuditLogs,
    loadAdminRoles,
    loadSecurityEvents
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMaintenanceSecurityEvents);
  } else {
    initializeMaintenanceSecurityEvents();
  }
})();

(() => {
  "use strict";

  if (window.ZUNE_ADMIN_PART10) return;
  window.ZUNE_ADMIN_PART10 = true;

  const $ = selector => document.querySelector(selector);

  function showMessage(text, type = "info") {
    let element = $("#adminGlobalMessage");

    if (!element) {
      element = document.createElement("div");
      element.id = "adminGlobalMessage";
      element.setAttribute("role", "status");
      document.body.prepend(element);
    }

    element.textContent = text;
    element.hidden = false;
    element.dataset.type = type;
  }

  function showError(text) {
    showMessage(text, "error");
  }

  window.ZUNE_ADMIN_SHOW_MESSAGE = showMessage;
  window.ZUNE_ADMIN_SHOW_ERROR = showError;

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
      element.setAttribute("aria-label", "Akaunti iliyothibitishwa ya Admin");
    });
  }

  function bindButton(buttonId, action) {
    const button = $(buttonId);
    if (!button) return;

    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await action();
      } catch (error) {
        showError(error.message || "Kuna tatizo limetokea.");
      } finally {
        button.disabled = false;
      }
    });
  }

  async function initializeDashboard() {
    const auth = window.ZUNE_ADMIN_AUTH;

    if (!auth?.checkAdminSession) {
      showError("Sehemu za uthibitishaji hazijapakiwa.");
      return;
    }

    try {
      const result = await auth.checkAdminSession();
      if (!result) return;

      showAdminIdentity(result.profile);

      // Sehemu zinafunguliwa baada ya uthibitishaji wa Admin.
      const hash = window.location.hash.replace(/^#/, "");
      const sectionMap = {
        overview: "overview",
        analytics: "analytics",
        users: "users",
        roles: "roles",
        "customer-verification": "customerVerification",
        "seller-verification": "sellerVerification",
        "seller-applications": "sellerApplications",
        products: "products",
        orders: "orders",
        finance: "finance",
        announcements: "announcements",
        coupons: "coupons",
        branding: "branding",
        maintenance: "maintenance",
        security: "security",
        "audit-logs": "auditLogs",
        disputes: "disputes",
        support: "support",
        settings: "settings"
      };

      if (hash && sectionMap[hash]) {
        auth.openAdminSection(sectionMap[hash]);
      }

      const loaders = {
        overview: () => window.ZUNE_ADMIN_DASHBOARD?.refreshDashboard(),
        users: () => window.ZUNE_ADMIN_USERS?.loadUsers(),
        sellerApplications: () => window.ZUNE_ADMIN_USERS?.loadSellerApplications(),
        customerVerification: () =>
          window.ZUNE_ADMIN_VERIFICATION?.loadVerificationRequests("customer"),
        sellerVerification: () =>
          window.ZUNE_ADMIN_VERIFICATION?.loadVerificationRequests("seller"),
        products: () => window.ZUNE_ADMIN_COMMERCE?.loadProducts(),
        orders: () => window.ZUNE_ADMIN_COMMERCE?.loadOrders(),
        finance: () => window.ZUNE_ADMIN_COMMERCE?.loadFinanceSummary(),
        announcements: () => window.ZUNE_ADMIN_ANNOUNCEMENTS?.loadAnnouncements(),
        coupons: () => window.ZUNE_ADMIN_BRANDING?.loadCoupons(),
        branding: () => window.ZUNE_ADMIN_BRANDING?.loadCurrentLogo(),
        maintenance: () => window.ZUNE_ADMIN_SECURITY?.loadMaintenanceSettings(),
        roles: () => window.ZUNE_ADMIN_SECURITY?.loadAdminRoles(),
        auditLogs: () => window.ZUNE_ADMIN_SECURITY?.loadAuditLogs(),
        security: () => window.ZUNE_ADMIN_SECURITY?.loadSecurityEvents(),
        disputes: () => window.ZUNE_ADMIN_COMMERCE?.loadDisputes()
      };

      window.addEventListener("zune:admin-section", event => {
        const loader = loaders[event.detail?.section];
        if (loader) {
          Promise.resolve(loader()).catch(error => showError(error.message));
        }
      });

      await loaders.overview?.();
    } catch (error) {
      showError(error.message || "Imeshindikana kufungua Admin Dashboard.");
    }
  }

  function bindShortcutButtons() {
    const shortcuts = {
      "#openCustomerVerification": "customerVerification",
      "#openSellerVerification": "sellerVerification",
      "#openSellerApplications": "sellerApplications",
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
      "#openAdminAuditLogs": "auditLogs",
      "#openAdminDisputes": "disputes",
      "#openAdminAnalytics": "analytics",
      "#openAdminSupport": "support",
      "#openAdminSettings": "settings"
    };

    Object.entries(shortcuts).forEach(([selector, section]) => {
      bindButton(selector, async () => {
        window.ZUNE_ADMIN_AUTH?.openAdminSection(section);
      });
    });

    const routeButtons = [
      ["#adminGoHome", "index.html"],
      ["#adminGoAccount", "account.html"],
      ["#adminGoNotifications", "notification.html"],
      ["#adminGoSeller", "seller.html"],
      ["#adminGoSellerDashboard", "seller-dashboard.html"],
      ["#adminGoTerms", "terms.html"],
      ["#adminGoPrivacy", "privacy.html"],
      ["#adminGoMaintenancePage", "maintenance.html"]
    ];

    routeButtons.forEach(([selector, url]) => {
      bindButton(selector, async () => {
        window.location.href = url;
      });
    });

    bindButton("#adminLogoutButton", async () => {
      await window.ZUNE_ADMIN_AUTH.signOutAdmin();
    });

    bindButton("#adminReloadPage", async () => {
      window.location.reload();
    });
  }

  function bindFallbackButtons() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-admin-action]");
      if (!button) return;

      const action = button.dataset.adminAction;

      const actions = {
        refresh: () => window.location.reload(),
        logout: () => window.ZUNE_ADMIN_AUTH?.signOutAdmin(),
        home: () => window.location.assign("index.html"),
        account: () => window.location.assign("account.html"),
        notifications: () => window.location.assign("notification.html"),
        seller: () => window.location.assign("seller.html"),
        "seller-dashboard": () => window.location.assign("seller-dashboard.html")
      };

      if (actions[action]) {
        Promise.resolve(actions[action]()).catch(error => showError(error.message));
      }
    });
  }

  function start() {
    bindShortcutButtons();
    bindFallbackButtons();

    if ($("#adminLoginForm") || $("#loginForm")) {
      return;
    }

    initializeDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();