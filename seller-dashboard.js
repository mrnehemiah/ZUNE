// =============================================
// ZUNE SELLER DASHBOARD
// seller-dashboard.js
// SEHEMU YA 1/4: CONFIGURATION, AUTH, SLIDER
// =============================================

"use strict";

// SUPABASE CONFIGURATION
const ZUNE_SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const ZUNE_SUPABASE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

// VIGEZO VYA MFUMO
const ZUNE = {
  supabase: null,
  user: null,
  profile: null,
  products: [],
  orders: [],
  buyers: {},
  productNames: {},
  slideIndex: 0,
  slideTimer: null,
  initialised: false
};

// HELPER ZA HTML
const zuneEl = (id) => document.getElementById(id);

function zuneEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function zuneMoney(value) {
  return "TZS " + Number(value || 0).toLocaleString("en-TZ");
}

function zuneMessage(id, message, type = "") {
  const element = zuneEl(id);
  if (!element) return;

  element.textContent = message;
  element.className = "message" + (type ? " " + type : "");
}

function zuneConnectionStatus(message) {
  const element = zuneEl("connectionStatus");
  if (element) element.textContent = message;
}

// KUPATA SESSION YA MTUMIAJI
async function zuneGetSession() {
  if (!ZUNE.supabase) {
    return { session: null, error: new Error("Supabase haijaunganishwa.") };
  }

  const { data, error } = await ZUNE.supabase.auth.getSession();

  return {
    session: data?.session || null,
    error
  };
}

// KUANZISHA SUPABASE
function zuneCreateSupabase() {
  if (!window.supabase?.createClient) {
    zuneConnectionStatus("Haijaunganishwa");

    zuneMessage(
      "globalMessage",
      "Supabase haijapakia. Hakikisha script ya Supabase JS ipo kwenye HTML.",
      "error"
    );

    return false;
  }

  ZUNE.supabase = window.supabase.createClient(
    ZUNE_SUPABASE_URL,
    ZUNE_SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return true;
}

// KUTHIBITISHA MTUMIAJI ALIYEINGIA
async function zuneLoadProfile() {
  const { session, error } = await zuneGetSession();

  if (error || !session) {
    zuneConnectionStatus("Ingia kwanza");

    zuneMessage(
      "globalMessage",
      "Inakuelekeza kwenye ukurasa wa kuingia...",
      "error"
    );

    setTimeout(() => {
      if (!ZUNE.user) {
        window.location.href = "login.html";
      }
    }, 900);

    return false;
  }

  ZUNE.user = session.user;

  const { data: profile, error: profileError } = await ZUNE.supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", ZUNE.user.id)
    .maybeSingle();

  if (profileError) {
    zuneConnectionStatus("Tatizo la wasifu");

    zuneMessage(
      "globalMessage",
      "Imeshindikana kusoma wasifu. Kagua ruhusa za jedwali la profiles.",
      "error"
    );

    return false;
  }

  ZUNE.profile = profile || null;

  const role = String(profile?.role || "").toLowerCase();

  if (!["vendor", "admin"].includes(role)) {
    zuneConnectionStatus("Si akaunti ya muuzaji");

    zuneMessage(
      "globalMessage",
      "Akaunti hii haina ruhusa ya dashibodi ya muuzaji. Hakikisha jukumu lako limethibitishwa.",
      "error"
    );

    return false;
  }

  const name =
    profile?.full_name ||
    ZUNE.user.email ||
    "Muuzaji";

  const title = zuneEl("welcomeTitle");
  const avatar = zuneEl("sellerAvatar");

  if (title) title.textContent = "Karibu, " + name;

  if (avatar) {
    avatar.textContent = name.trim().charAt(0).toUpperCase() || "Z";
  }

  zuneConnectionStatus("Imeunganishwa");

  return true;
}

// SLIDER YA PICHA 10
function zuneSetupSlider() {
  const slider = zuneEl("promoSlider");
  const slides = [...document.querySelectorAll("#promoSlider .slide")];
  const dotsContainer = zuneEl("slideDots");

  if (!slider || !slides.length || !dotsContainer) return;

  dotsContainer.innerHTML = "";

  slides.forEach((slide, index) => {
    const dot = document.createElement("button");

    dot.type = "button";
    dot.className = "slide-dot";
    dot.setAttribute("aria-label", `Fungua picha ${index + 1}`);

    dot.addEventListener("click", () => {
      zuneShowSlide(index);
      zuneRestartSlider();
    });

    dotsContainer.appendChild(dot);
  });

  function showSlide(index) {
    ZUNE.slideIndex =
      (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === ZUNE.slideIndex);
    });

    [...dotsContainer.children].forEach((dot, i) => {
      dot.classList.toggle("active", i === ZUNE.slideIndex);
    });
  }

  // Hifadhi function ili vitufe viweze kuitumia
  window.zuneShowSlide = showSlide;

  const previous = zuneEl("slidePrev");
  const next = zuneEl("slideNext");

  if (previous) {
    previous.addEventListener("click", () => {
      showSlide(ZUNE.slideIndex - 1);
      zuneRestartSlider();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      showSlide(ZUNE.slideIndex + 1);
      zuneRestartSlider();
    });
  }

  slider.addEventListener("mouseenter", () => {
    if (ZUNE.slideTimer) {
      clearInterval(ZUNE.slideTimer);
    }
  });

  slider.addEventListener("mouseleave", zuneRestartSlider);

  showSlide(0);
  zuneRestartSlider();
}

function zuneRestartSlider() {
  if (ZUNE.slideTimer) {
    clearInterval(ZUNE.slideTimer);
  }

  ZUNE.slideTimer = setInterval(() => {
    if (typeof window.zuneShowSlide === "function") {
      window.zuneShowSlide(ZUNE.slideIndex + 1);
    }
  }, 5000);
}// =============================================
// SEHEMU YA 2/4: NAVIGATION AND PRODUCTS
// =============================================

// SEHEMU ZINAZORUHUSIWA KUFUNGULIWA NDANI YA DASHIBODI
const ZUNE_SECTIONS = [
  "homeSection",
  "products",
  "orders",
  "store",
  "sales",
  "notifications",
  "settings"
];

// KUFUNGUA SEHEMU
function zuneNavigate(sectionId) {
  if (!ZUNE_SECTIONS.includes(sectionId)) return;

  const home = zuneEl("homeSection");
  if (!home) return;

  const isHome = sectionId === "homeSection";

  home.style.display = isHome ? "block" : "none";

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === sectionId);
  });

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle(
      "active",
      link.getAttribute("data-nav") === sectionId
    );
  });

  const newUrl = isHome
    ? window.location.pathname + window.location.search
    : "#" + sectionId;

  window.history.replaceState(null, "", newUrl);

  window.scrollTo({ top: 0, behavior: "smooth" });

  // Pakia data kila mtumiaji anapofungua sehemu husika
  if (sectionId === "products") zuneLoadProducts();
  if (sectionId === "orders") zuneLoadOrders();
  if (sectionId === "sales") zuneLoadSales();
}

// KUUNGANISHA VITufe VYENYE href="#..."
function zuneSetupNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      const sectionId = href ? href.substring(1) : "";

      if (!ZUNE_SECTIONS.includes(sectionId)) return;

      event.preventDefault();
      zuneNavigate(sectionId);
    });
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      zuneNavigate(button.dataset.go);
    });
  });

  window.addEventListener("hashchange", () => {
    const sectionId =
      window.location.hash.substring(1) || "homeSection";

    if (ZUNE_SECTIONS.includes(sectionId)) {
      zuneNavigate(sectionId);
    }
  });
}

// KUPAKIA BIDHAA ZA MUUZAJI ALIYEINGIA
async function zuneLoadProducts() {
  if (!ZUNE.supabase || !ZUNE.user) return;

  const list = zuneEl("productsList");
  if (list) list.textContent = "Inapakia bidhaa...";

  const { data, error } = await ZUNE.supabase
    .from("products")
    .select("id, title, description, price, stock_quantity, image_url, created_at")
    .eq("vendor_id", ZUNE.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (list) {
      list.textContent = "Bidhaa hazijaweza kupakiwa.";
    }

    zuneMessage(
      "productsMessage",
      "Kuna tatizo la kusoma bidhaa au ruhusa za Supabase: " + error.message,
      "error"
    );

    if (zuneEl("statProducts")) {
      zuneEl("statProducts").textContent = "—";
    }

    return;
  }

  ZUNE.products = data || [];

  // Hifadhi majina kwa ajili ya kuonyesha kwenye oda
  ZUNE.productNames = {};

  ZUNE.products.forEach((product) => {
    ZUNE.productNames[product.id] = product.title;
  });

  if (zuneEl("statProducts")) {
    zuneEl("statProducts").textContent = ZUNE.products.length;
  }

  if (!list) return;

  if (!ZUNE.products.length) {
    list.innerHTML = `
      <div class="empty">
        Bado huna bidhaa. Tumia kitufe cha usimamizi wa bidhaa
        kuongeza bidhaa zako.
        <br><br>
        <a class="btn" href="seller.html">Fungua usimamizi wa bidhaa ↗</a>
      </div>
    `;
    return;
  }

  list.innerHTML = ZUNE.products.map((product) => `
    <article class="product-card">
      <div class="product-title">${zuneEscape(product.title)}</div>
      <div class="muted">Bei: ${zuneMoney(product.price)}</div>
      <div class="muted">
        Idadi iliyopo: ${zuneEscape(product.stock_quantity)}
      </div>
      <div class="muted">
        ${zuneEscape(product.description || "Hakuna maelezo ya ziada.")}
      </div>
    </article>
  `).join("");
}

// KUPATA BIDHAA KWA AJILI YA ODA
async function zuneEnsureProducts() {
  if (ZUNE.products.length) return true;
  if (!ZUNE.supabase || !ZUNE.user) return false;

  const { data, error } = await ZUNE.supabase
    .from("products")
    .select("id, title")
    .eq("vendor_id", ZUNE.user.id);

  if (error) {
    zuneMessage("ordersMessage", error.message, "error");
    return false;
  }

  ZUNE.products = data || [];
  ZUNE.productNames = {};

  ZUNE.products.forEach((product) => {
    ZUNE.productNames[product.id] = product.title;
  });

  return true;
}// =============================================
// SEHEMU YA 3/4: ORDERS, BUYERS, SALES
// =============================================

// KUPAKIA ODA ZA BIDHAA ZA MUUZAJI
async function zuneLoadOrders() {
  if (!ZUNE.supabase || !ZUNE.user) return;

  const list = zuneEl("ordersList");
  if (list) list.textContent = "Inapakia oda...";

  const productsLoaded = await zuneEnsureProducts();

  if (!productsLoaded) {
    if (list) list.textContent = "Imeshindikana kuthibitisha bidhaa zako.";
    return;
  }

  const productIds = ZUNE.products.map((product) => product.id);

  if (!productIds.length) {
    ZUNE.orders = [];

    if (zuneEl("statOrders")) {
      zuneEl("statOrders").textContent = "0";
    }

    if (list) {
      list.innerHTML = `
        <div class="empty">
          Bado hakuna bidhaa zilizounganishwa na duka lako.
        </div>
      `;
    }

    return;
  }

  const { data, error } = await ZUNE.supabase
    .from("orders")
    .select("id, buyer_id, product_id, quantity, total_price, commission_fee, status, created_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (list) {
      list.textContent = "Oda hazijaweza kupakiwa.";
    }

    zuneMessage(
      "ordersMessage",
      "Kagua sera za RLS na muundo wa jedwali la orders: " + error.message,
      "error"
    );

    if (zuneEl("statOrders")) {
      zuneEl("statOrders").textContent = "—";
    }

    return;
  }

  ZUNE.orders = data || [];

  const pendingCount = ZUNE.orders.filter(
    (order) => order.status === "pending"
  ).length;

  if (zuneEl("statOrders")) {
    zuneEl("statOrders").textContent = pendingCount;
  }

  // Tafuta majina ya wateja kwa kutumia buyer_id
  const buyerIds = [
    ...new Set(
      ZUNE.orders
        .map((order) => order.buyer_id)
        .filter(Boolean)
    )
  ];

  ZUNE.buyers = {};

  if (buyerIds.length) {
    const { data: profiles, error: buyerError } = await ZUNE.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", buyerIds);

    if (!buyerError && profiles) {
      profiles.forEach((profile) => {
        ZUNE.buyers[profile.id] =
          profile.full_name || "Mteja";
      });
    }
  }

  zuneRenderOrders();
}

// KUCHUJA ODA KWA HALI
function zuneRenderOrders() {
  const list = zuneEl("ordersList");
  if (!list) return;

  const filter = zuneEl("orderFilter")?.value || "all";

  const filteredOrders = ZUNE.orders.filter((order) => {
    return filter === "all" || order.status === filter;
  });

  if (!filteredOrders.length) {
    list.innerHTML = `
      <div class="empty">
        Hakuna oda katika kundi hili.
      </div>
    `;
    return;
  }

  list.innerHTML = filteredOrders.map((order) => {
    const date = order.created_at
      ? new Date(order.created_at).toLocaleString("sw-TZ")
      : "—";

    const buyerName =
      ZUNE.buyers[order.buyer_id] || "Jina halipatikani";

    const productName =
      ZUNE.productNames[order.product_id] || "Bidhaa";

    return `
      <article class="product-card">
        <div class="product-title">
          Oda #${zuneEscape(String(order.id).slice(0, 8))}
        </div>

        <div class="muted">
          Mteja: ${zuneEscape(buyerName)}
        </div>

        <div class="muted">
          Bidhaa: ${zuneEscape(productName)}
        </div>

        <div class="muted">
          Idadi: ${zuneEscape(order.quantity)}
        </div>

        <div class="muted">
          Jumla: ${zuneMoney(order.total_price)}
        </div>

        <div class="muted">
          Tarehe: ${zuneEscape(date)}
        </div>

        <div class="item-row">
          <span class="status-pill">
            ${zuneEscape(order.status || "pending")}
          </span>
        </div>
      </article>
    `;
  }).join("");
}

// FILTER YA ODA
function zuneSetupOrderFilter() {
  const filter = zuneEl("orderFilter");

  if (filter) {
    filter.addEventListener("change", zuneRenderOrders);
  }
}

// TAKWIMU ZA MAUZO YALIYOKAMILIKA
async function zuneLoadSales() {
  if (!ZUNE.supabase || !ZUNE.user) return;

  const productsLoaded = await zuneEnsureProducts();
  if (!productsLoaded) return;

  const productIds = ZUNE.products.map((product) => product.id);

  if (!productIds.length) {
    zuneDisplaySales([], 0);
    return;
  }

  const { data, error } = await ZUNE.supabase
    .from("orders")
    .select("id, total_price, status")
    .in("product_id", productIds)
    .eq("status", "completed");

  if (error) {
    zuneMessage(
      "salesMessage",
      "Imeshindikana kupakia takwimu za mauzo: " + error.message,
      "error"
    );

    if (zuneEl("statSales")) {
      zuneEl("statSales").textContent = "—";
    }

    if (zuneEl("salesTotal")) {
      zuneEl("salesTotal").textContent = "—";
    }

    return;
  }

  const completedOrders = data || [];

  const total = completedOrders.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0
  );

  zuneDisplaySales(completedOrders, total);
}

function zuneDisplaySales(orders, total) {
  if (zuneEl("statSales")) {
    zuneEl("statSales").textContent = zuneMoney(total);
  }

  if (zuneEl("salesTotal")) {
    zuneEl("salesTotal").textContent = zuneMoney(total);
  }

  if (zuneEl("salesCompletedOrders")) {
    zuneEl("salesCompletedOrders").textContent = orders.length;
  }
}// =============================================
// SEHEMU YA 4/4: STORE, LOGOUT, INITIALISATION
// =============================================

// KUFUNGUA UKURASA BINAFSI WA DUKA
function zuneSetupMyStore() {
  const button = zuneEl("openMyStore");
  if (!button) return;

  button.addEventListener("click", () => {
    if (!ZUNE.user) {
      window.location.href = "login.html";
      return;
    }

    // store.html itatengenezwa kama faili tofauti.
    const storeUrl =
      "store.html?id=" + encodeURIComponent(ZUNE.user.id);

    window.location.href = storeUrl;
  });
}

// KUANZISHA SEHEMU YA TAARIFA
function zuneSetupNotifications() {
  const notificationLinks = document.querySelectorAll(
    'a[href="notification.html"]'
  );

  notificationLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!ZUNE.user) {
        event.preventDefault();
        window.location.href = "login.html";
      }
    });
  });
}

// KUTOKA KWENYE AKAUNTI
function zuneSetupLogout() {
  const button = zuneEl("logoutButton");
  if (!button) return;

  button.addEventListener("click", async () => {
    if (!ZUNE.supabase) {
      window.location.href = "login.html";
      return;
    }

    const confirmed = window.confirm(
      "Unataka kutoka kwenye akaunti yako?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Inatoka...";

    const { error } = await ZUNE.supabase.auth.signOut();

    if (error) {
      button.disabled = false;
      button.textContent = "Toka kwenye akaunti";

      zuneMessage(
        "settingsMessage",
        "Imeshindikana kutoka: " + error.message,
        "error"
      );

      return;
    }

    ZUNE.user = null;
    ZUNE.profile = null;

    window.location.href = "login.html";
  });
}

// KUCHAGUA SEHEMU YA KUANZIA KUTOKANA NA URL
function zuneOpenInitialSection() {
  const sectionId =
    window.location.hash.substring(1) || "homeSection";

  if (ZUNE_SECTIONS.includes(sectionId)) {
    zuneNavigate(sectionId);
  } else {
    zuneNavigate("homeSection");
  }
}

// KUANZISHA DASHIBODI
async function zuneInitialiseDashboard() {
  if (ZUNE.initialised) return;
  ZUNE.initialised = true;

  zuneSetupSlider();
  zuneSetupNavigation();
  zuneSetupOrderFilter();
  zuneSetupMyStore();
  zuneSetupNotifications();
  zuneSetupLogout();

  const connected = zuneCreateSupabase();

  if (!connected) return;

  const authenticated = await zuneLoadProfile();

  if (!authenticated) return;

  // Pakia taarifa za msingi baada ya kuthibitisha akaunti
  await Promise.all([
    zuneLoadProducts(),
    zuneLoadOrders(),
    zuneLoadSales()
  ]);

  zuneOpenInitialSection();
}

// Subiri HTML yote isomeke
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    zuneInitialiseDashboard,
    { once: true }
  );
} else {
  zuneInitialiseDashboard();
}