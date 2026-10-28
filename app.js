(function () {
  "use strict";

  if (window.__ZUNE_APP_INITIALIZED__) {
    console.warn("ZUNE app.js tayari imeanzishwa.");
    return;
  }

  window.__ZUNE_APP_INITIALIZED__ = true;

  const CONFIG = Object.freeze({
    SUPABASE_URL: "https://rpkogiieegqgxqbzwxwo.supabase.co",
    SUPABASE_PUBLISHABLE_KEY:
      "sb_publishable_2TEqZv-NBM9n5knU46qgA_wqO3V1uf",

    TABLES: {
      PRODUCTS: "products",
      PROFILES: "profiles",
      ORDERS: "orders",
      SELLER_APPLICATIONS: "seller_applications"
    },

    STORAGE: {
      CART: "zune_cart",
      WISHLIST: "zune_wishlist",
      RECENT: "zune_recently_viewed",
      CATEGORY: "zune_selected_category",
      SEARCH: "zune_home_search",
      LANGUAGE: "zune_language"
    },

    SLIDE_INTERVAL: 5000,
    PRODUCT_LIMIT: 60,
    RECENT_LIMIT: 12,
    TOAST_DURATION: 3200
  });

  const state = {
    supabase: null,
    session: null,
    user: null,
    profile: null,

    products: [],
    filteredProducts: [],
    loadingProducts: false,
    productsError: "",

    searchTerm: "",
    selectedCategory: "all",

    cart: [],
    wishlist: [],
    recentlyViewed: [],

    activeSlide: 0,
    slideTimer: null,
    toastTimer: null,

    initialized: false,
    authListener: null
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function logError(message, error) {
    console.error("[ZUNE]", message, error || "");
  }

  function safeJSONParse(value, fallback) {
    if (typeof value !== "string" || !value.trim()) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readStorage(key, fallback = null) {
    try {
      return safeJSONParse(localStorage.getItem(key), fallback);
    } catch (error) {
      logError("Imeshindikana kusoma localStorage.", error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logError("Imeshindikana kuhifadhi taarifa.", error);
      showToast("Imeshindikana kuhifadhi taarifa kwenye kifaa.", "error");
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logError("Imeshindikana kufuta taarifa.", error);
    }
  }

  function getUserStorageKey(baseKey) {
    const userId = state.user?.id;

    return userId
      ? `${baseKey}_${userId}`
      : `${baseKey}_guest`;
  }

  function readUserStorage(baseKey, fallback = []) {
    const userKey = getUserStorageKey(baseKey);
    const value = readStorage(userKey, null);

    if (value !== null) {
      return value;
    }

    /*
      Legacy data husomwa kwa akaunti ya mgeni pekee.
      Data ya akaunti tofauti haitachanganywa.
    */
    if (!state.user) {
      return readStorage(baseKey, fallback);
    }

    return fallback;
  }

  function writeUserStorage(baseKey, value) {
    const userKey = getUserStorageKey(baseKey);

    if (!writeStorage(userKey, value)) {
      return false;
    }

    /*
      Funguo za zamani zinaendelezwa kwa compatibility,
      lakini data yake haisomwi kama data ya akaunti nyingine.
    */
    if (!state.user) {
      writeStorage(baseKey, value);
    }

    return true;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return replacements[character];
    });
  }

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase();
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function formatMoney(value) {
    const amount = safeNumber(value, NaN);

    if (!Number.isFinite(amount)) {
      return "Bei haijawekwa";
    }

    return "TSh " + new Intl.NumberFormat("en-TZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function getProductId(product) {
    return String(product?.id ?? "");
  }

  function getProductName(product) {
    return String(
      product?.title ??
      product?.name ??
      "Bidhaa ya ZUNE"
    );
  }

  function getProductDescription(product) {
    return String(
      product?.description ??
      "Wasiliana na muuzaji kupata maelezo zaidi kuhusu bidhaa hii."
    );
  }

  function getProductCategory(product) {
    return String(
      product?.category ??
      product?.category_name ??
      product?.product_category ??
      "Vingine"
    ).trim() || "Vingine";
  }

  function getProductPrice(product) {
    return safeNumber(product?.price, 0);
  }

  function getProductStock(product) {
    return Math.max(
      0,
      safeNumber(
        product?.stock_quantity ?? product?.stock,
        0
      )
    );
  }

  function getProductImage(product) {
    const rawImage = String(
      product?.image_url ??
      product?.image ??
      ""
    ).trim();

    if (!rawImage) {
      return "";
    }

    try {
      const url = new URL(rawImage, window.location.href);

      if (!["https:", "http:"].includes(url.protocol)) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function isLoggedIn() {
    return Boolean(state.session?.user?.id);
  }

  function getCurrentUserId() {
    return state.session?.user?.id ?? null;
  }

  function getCart() {
    const cart = readUserStorage(CONFIG.STORAGE.CART, []);

    return Array.isArray(cart) ? cart : [];
  }

  function getWishlist() {
    const wishlist = readUserStorage(CONFIG.STORAGE.WISHLIST, []);

    return Array.isArray(wishlist)
      ? wishlist.map(String)
      : [];
  }

  function getRecentlyViewed() {
    const recent = readUserStorage(CONFIG.STORAGE.RECENT, []);

    return Array.isArray(recent) ? recent : [];
  }

  function saveCart(cart) {
    if (!Array.isArray(cart)) {
      return false;
    }

    if (!writeUserStorage(CONFIG.STORAGE.CART, cart)) {
      return false;
    }

    state.cart = cart;
    updateCartCounters();

    return true;
  }

  function saveWishlist(wishlist) {
    if (!Array.isArray(wishlist)) {
      return false;
    }

    const uniqueWishlist = [...new Set(wishlist.map(String))];

    if (!writeUserStorage(CONFIG.STORAGE.WISHLIST, uniqueWishlist)) {
      return false;
    }

    state.wishlist = uniqueWishlist;
    updateWishlistButtons();

    return true;
  }

  function saveRecentlyViewed(products) {
    if (!Array.isArray(products)) {
      return false;
    }

    const recent = products.slice(0, CONFIG.RECENT_LIMIT);

    if (!writeUserStorage(CONFIG.STORAGE.RECENT, recent)) {
      return false;
    }

    state.recentlyViewed = recent;

    return true;
  }

  function showToast(message, type = "info") {
    let region = $("#toastRegion");

    if (!region) {
      region = document.createElement("div");
      region.id = "toastRegion";
      region.className = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }

    region.replaceChildren();

    const toast = document.createElement("div");
    toast.className = "toast-message";

    if (type === "error") {
      toast.classList.add("is-error");
    } else if (type === "success") {
      toast.classList.add("is-success");
    }

    toast.textContent = String(message ?? "");
    region.appendChild(toast);

    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }

    state.toastTimer = setTimeout(() => {
      toast.remove();
    }, CONFIG.TOAST_DURATION);
  }

  function navigateTo(page) {
    const allowedPages = new Set([
      "index.html",
      "login.html",
      "signup.html",
      "account.html",
      "cart.html",
      "category.html",
      "seller.html",
      "seller-dashboard.html",
      "wallet.html",
      "notification.html",
      "chat.html",
      "terms.html",
      "privacy.html",
      "admin.html"
    ]);

    if (!allowedPages.has(String(page))) {
      showToast("Ukurasa unaotakiwa haupatikani.", "error");
      return;
    }

    window.location.href = page;
  }

  function requireLogin(message = "Ingia kwenye akaunti yako ili kuendelea.") {
    if (isLoggedIn()) {
      return true;
    }

    showToast(message, "error");

    window.setTimeout(() => {
      navigateTo("login.html");
    }, 700);

    return false;
  }

  function getSupabaseClient() {
    return state.supabase;
  }

  window.zuneConfig = CONFIG;
  window.zuneState = state;
  window.zuneSupabase = null;
  window.zuneProducts = state.products;
  window.zuneGetCurrentUser = () => state.user;
  window.zuneIsLoggedIn = isLoggedIn;
  window.zuneFormatMoney = formatMoney;
  window.zuneShowToast = showToast;

  async function initializeSupabase() {
    if (state.supabase) {
      return state.supabase;
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase SDK haijapakiwa.");
    }

    state.supabase = window.supabase.createClient(
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

    window.zuneSupabase = state.supabase;

    return state.supabase;
  }

  async function loadCurrentUser() {
    const supabase = await initializeSupabase();

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    state.session = session;
    state.user = session?.user ?? null;
    state.profile = null;

    if (state.user) {
      try {
        const { data, error: profileError } = await supabase
          .from(CONFIG.TABLES.PROFILES)
          .select("id,full_name,phone_number,role,is_verified,created_at")
          .eq("id", state.user.id)
          .maybeSingle();

        if (profileError) {
          logError("Imeshindikana kupakia profile.", profileError);
        } else {
          state.profile = data;
        }
      } catch (error) {
        logError("Hitilafu wakati wa kusoma profile.", error);
      }
    }

    state.cart = getCart();
    state.wishlist = getWishlist();
    state.recentlyViewed = getRecentlyViewed();

    updateAccountHeader();
    updateCartCounters();
    updateWishlistButtons();

    return state.user;
  }

  function updateAccountHeader() {
    const nameElement = $("#drawerUserName");
    const emailElement = $("#drawerUserEmail");
    const avatarElement = $("#drawerUserAvatar");
    const loginButton = $("#drawerLoginBtn");
    const logoutButton = $("#drawerLogoutBtn");
    const verifiedStatus = $("#drawerVerifiedStatus");

    if (!isLoggedIn()) {
      if (nameElement) {
        nameElement.textContent = "Karibu ZUNE";
      }

      if (emailElement) {
        emailElement.textContent = "Ingia au fungua akaunti";
      }

      if (avatarElement) {
        avatarElement.textContent = "Z";
      }

      if (loginButton) loginButton.hidden = false;
      if (logoutButton) logoutButton.hidden = true;

      if (verifiedStatus) {
        verifiedStatus.textContent = "Ingia kuomba uthibitishaji";
      }

      return;
    }

    const user = state.user;

    const name =
      state.profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "Mtumiaji wa ZUNE";

    if (nameElement) {
      nameElement.textContent = name;
    }

    if (emailElement) {
      emailElement.textContent = user?.email || user?.phone || "Akaunti ya ZUNE";
    }

    if (avatarElement) {
      avatarElement.textContent = name.trim().charAt(0).toUpperCase() || "Z";
    }

    if (loginButton) loginButton.hidden = true;
    if (logoutButton) logoutButton.hidden = false;

    if (verifiedStatus) {
      verifiedStatus.textContent = state.profile?.is_verified
        ? "Akaunti imethibitishwa"
        : "Omba uthibitishaji";
    }
  }

  function handleAuthStateChange() {
    if (!state.supabase || state.authListener) {
      return;
    }

    const {
      data: { subscription }
    } = state.supabase.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      state.user = session?.user ?? null;

      state.profile = null;
      state.cart = getCart();
      state.wishlist = getWishlist();
      state.recentlyViewed = getRecentlyViewed();

      updateAccountHeader();
      updateCartCounters();
      updateWishlistButtons();

      window.setTimeout(() => {
        loadCurrentUser().catch(error => {
          logError("Imeshindikana kusasisha akaunti.", error);
        });
      }, 0);
    });

    state.authListener = subscription;
  }

  async function signOut() {
    const supabase = await initializeSupabase();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    state.session = null;
    state.user = null;
    state.profile = null;

    state.cart = getCart();
    state.wishlist = getWishlist();
    state.recentlyViewed = getRecentlyViewed();

    updateAccountHeader();
    updateCartCounters();
    updateWishlistButtons();

    showToast("Umetoka kwenye akaunti yako.", "success");

    window.setTimeout(() => {
      navigateTo("login.html");
    }, 500);
  }

  function updateCartCounters() {
    const cart = getCart();
    state.cart = cart;

    const total = cart.reduce((sum, item) => {
      const quantity = Math.max(1, safeNumber(item?.quantity, 1));
      return sum + quantity;
    }, 0);

    const counter = $("#cartNavCount");

    if (counter) {
      counter.textContent = total > 99 ? "99+" : String(total);
      counter.hidden = total === 0;
    }

    const drawerCounter = $("#drawerCartCount");

    if (drawerCounter) {
      drawerCounter.textContent = String(total);
    }
  }

  function updateWishlistButtons() {
    const wishlist = new Set(getWishlist());

    $$(".product-favorite").forEach(button => {
      const id = String(
        button.dataset.favoriteId ??
        button.dataset.productId ??
        ""
      );

      const active = wishlist.has(id);

      button.classList.toggle("is-favorite", active);
      button.setAttribute("aria-pressed", String(active));

      button.setAttribute(
        "aria-label",
        active
          ? "Ondoa kwenye ninazopenda"
          : "Ongeza kwenye ninazopenda"
      );
    });
  }

  async function loadProducts() {
    const supabase = await initializeSupabase();

    state.loadingProducts = true;
    state.productsError = "";

    const loading = $("#productsLoading");
    const empty = $("#productsEmpty");

    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;

    try {
      const { data, error } = await supabase
        .from(CONFIG.TABLES.PRODUCTS)
        .select(
          "id,vendor_id,title,description,price,stock_quantity,image_url,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(CONFIG.PRODUCT_LIMIT);

      if (error) {
        throw error;
      }

      state.products = Array.isArray(data) ? data : [];
      state.productsError = "";

      window.zuneProducts = state.products;

      applyProductFilters();
    } catch (error) {
      state.productsError = error?.message || "Imeshindikana kupakia bidhaa.";
      state.products = [];
      state.filteredProducts = [];

      window.zuneProducts = state.products;

      logError("Imeshindikana kupakia bidhaa.", error);

      renderProducts([]);
      showToast("Bidhaa hazikuweza kupakiwa kwa sasa.", "error");
    } finally {
      state.loadingProducts = false;

      if (loading) loading.hidden = true;

      renderProducts(state.filteredProducts);
    }
  }

  function applyProductFilters() {
    const search = normalizeText(state.searchTerm);
    const category = normalizeText(state.selectedCategory);

    state.filteredProducts = state.products.filter(product => {
      const name = normalizeText(getProductName(product));
      const description = normalizeText(getProductDescription(product));
      const productCategory = normalizeText(getProductCategory(product));

      const matchesSearch =
        !search ||
        name.includes(search) ||
        description.includes(search) ||
        productCategory.includes(search);

      const matchesCategory =
        category === "all" ||
        productCategory === category ||
        productCategory.includes(category);

      return matchesSearch && matchesCategory;
    });

    renderProducts(state.filteredProducts);
  }

  function setCategory(category = "all") {
    state.selectedCategory = String(category || "all");

    writeStorage(
      CONFIG.STORAGE.CATEGORY,
      state.selectedCategory
    );

    $$(".category-card").forEach(card => {
      const active =
        normalizeText(card.dataset.category) ===
        normalizeText(state.selectedCategory);

      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });

    const heading = $("#productsSectionTitle");

    if (heading) {
      heading.textContent =
        state.selectedCategory === "all"
          ? "Bidhaa Mpya"
          : `Bidhaa za ${state.selectedCategory}`;
    }

    applyProductFilters();
  }

  function getProductCategory(product) {
    return String(
      product?.category ||
      product?.category_name ||
      product?.product_category ||
      ""
    ).trim();
  }

  function getProductImage(product) {
    return String(product?.image_url || "").trim();
  }

  function getProductStock(product) {
    return Math.max(
      0,
      safeNumber(product?.stock_quantity, 0)
    );
  }

  function getProductId(product) {
    return String(product?.id || "");
  }

  function getProductPrice(product) {
    return Math.max(0, safeNumber(product?.price, 0));
  }

  function getProductDescription(product) {
    return String(product?.description || "").trim();
  }

  function getProductName(product) {
    return String(
      product?.title ||
      product?.name ||
      "Bidhaa ya ZUNE"
    ).trim();
  }

  function createProductCard(product) {
    const id = getProductId(product);
    const title = getProductName(product);
    const description = getProductDescription(product);
    const price = getProductPrice(product);
    const stock = getProductStock(product);
    const image = getProductImage(product);
    const favorite = getWishlist().includes(id);

    const card = document.createElement("article");
    card.className = "zune-product-card";
    card.dataset.productId = id;

    const imageArea = document.createElement("div");
    imageArea.className = "zune-product-image";

    if (image && /^https?:\/\//i.test(image)) {
      const img = document.createElement("img");

      img.src = image;
      img.alt = title;
      img.loading = "lazy";
      img.decoding = "async";

      img.addEventListener("error", () => {
        img.remove();

        const placeholder = document.createElement("div");
        placeholder.className = "zune-image-placeholder";
        placeholder.textContent = "ZUNE";
        imageArea.appendChild(placeholder);
      }, { once: true });

      imageArea.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "zune-image-placeholder";
      placeholder.textContent = "ZUNE";
      imageArea.appendChild(placeholder);
    }

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "product-favorite";
    favoriteButton.dataset.favoriteId = id;
    favoriteButton.setAttribute("aria-pressed", String(favorite));
    favoriteButton.setAttribute(
      "aria-label",
      favorite ? "Ondoa kwenye ninazopenda" : "Ongeza kwenye ninazopenda"
    );
    favoriteButton.textContent = favorite ? "♥" : "♡";

    favoriteButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggleWishlist(id);
    });

    imageArea.appendChild(favoriteButton);

    const details = document.createElement("div");
    details.className = "zune-product-details";

    const titleElement = document.createElement("h3");
    titleElement.className = "zune-product-title";
    titleElement.textContent = title;

    const descriptionElement = document.createElement("p");
    descriptionElement.className = "zune-product-description";
    descriptionElement.textContent = description || "Bidhaa bora kutoka ZUNE.";

    const priceElement = document.createElement("p");
    priceElement.className = "zune-product-price";
    priceElement.textContent = formatMoney(price);

    const stockElement = document.createElement("p");
    stockElement.className = "zune-product-stock";
    stockElement.textContent =
      stock > 0 ? `Zimebaki: ${stock}` : "Bidhaa imeisha";

    const actions = document.createElement("div");
    actions.className = "zune-product-actions";

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "zune-product-view";
    viewButton.textContent = "Tazama";
    viewButton.addEventListener("click", () => {
      recordRecentlyViewed(id);
      openProductDetails(id);
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "zune-product-add";
    addButton.textContent = stock > 0 ? "Weka kapuni" : "Imeisha";
    addButton.disabled = stock < 1;

    addButton.addEventListener("click", () => {
      addToCart(id, 1);
    });

    actions.append(viewButton, addButton);

    details.append(
      titleElement,
      descriptionElement,
      priceElement,
      stockElement,
      actions
    );

    card.append(imageArea, details);

    return card;
  }

  function renderProducts(products = []) {
    const grid = $("#homeProductsGrid");

    if (!grid) {
      return;
    }

    grid.replaceChildren();

    const empty = $("#productsEmpty");
    const emptyTitle = $("#productsEmptyTitle");
    const emptyText = $("#productsEmptyText");
    const status = $("#productsStatus");

    if (!Array.isArray(products) || products.length === 0) {
      if (empty) empty.hidden = false;

      if (emptyTitle) {
        emptyTitle.textContent = state.productsError
          ? "Bidhaa hazijapakiwa"
          : state.searchTerm || state.selectedCategory !== "all"
            ? "Hakuna bidhaa zilizopatikana"
            : "Hakuna bidhaa bado";
      }

      if (emptyText) {
        emptyText.textContent = state.productsError
          ? "Tafadhali hakikisha muunganisho wako kisha ujaribu tena."
          : state.searchTerm || state.selectedCategory !== "all"
            ? "Jaribu neno jingine au chagua aina nyingine ya bidhaa."
            : "Hakuna bidhaa zilizowekwa bado kwenye ZUNE.";
      }

      if (status) {
        status.textContent = "Bidhaa 0";
      }

      return;
    }

    if (empty) empty.hidden = true;

    const fragment = document.createDocumentFragment();

    products.forEach(product => {
      fragment.appendChild(createProductCard(product));
    });

    grid.appendChild(fragment);

    if (status) {
      status.textContent = `Bidhaa ${products.length}`;
    }

    updateWishlistButtons();
  }

  function recordRecentlyViewed(productId) {
    const id = String(productId || "");

    if (!id) return;

    let recent = getRecentlyViewed().filter(item => item !== id);

    recent.unshift(id);
    recent = recent.slice(0, 12);

    saveRecentlyViewed(recent);
    state.recentlyViewed = recent;

    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    const grid = $("#recentlyViewedGrid");
    const section = $("#recentlyViewedSection");

    if (!grid) return;

    const recentIds = getRecentlyViewed();
    const recentProducts = recentIds
      .map(id => state.products.find(product => getProductId(product) === id))
      .filter(Boolean);

    grid.replaceChildren();

    if (recentProducts.length === 0) {
      if (section) section.hidden = true;
      return;
    }

    if (section) section.hidden = false;

    const fragment = document.createDocumentFragment();

    recentProducts.forEach(product => {
      fragment.appendChild(createProductCard(product));
    });

    grid.appendChild(fragment);
  }

  function toggleWishlist(productId) {
    const id = String(productId || "");

    if (!id) return;

    let wishlist = getWishlist();

    if (wishlist.includes(id)) {
      wishlist = wishlist.filter(item => item !== id);
      showToast("Bidhaa imeondolewa kwenye unazopenda.", "success");
    } else {
      wishlist.push(id);
      showToast("Bidhaa imeongezwa kwenye unazopenda.", "success");
    }

    saveWishlist(wishlist);
    state.wishlist = wishlist;

    updateWishlistButtons();
    renderProducts(state.filteredProducts);
    renderRecentlyViewed();
  }

  function addToCart(productId, quantity = 1) {
    const id = String(productId || "");
    const product = state.products.find(
      item => getProductId(item) === id
    );

    if (!product) {
      showToast("Bidhaa haijapatikana.", "error");
      return;
    }

    const stock = getProductStock(product);
    const amount = Math.max(1, Math.floor(safeNumber(quantity, 1)));

    if (stock < 1) {
      showToast("Bidhaa hii imeisha.", "error");
      return;
    }

    const cart = getCart();
    const existing = cart.find(item => String(item.productId) === id);
    const currentQuantity = existing
      ? Math.max(0, safeNumber(existing.quantity, 0))
      : 0;

    if (currentQuantity + amount > stock) {
      showToast("Idadi uliyochagua inazidi bidhaa zilizobaki.", "error");
      return;
    }

    if (existing) {
      existing.quantity = currentQuantity + amount;
    } else {
      cart.push({
        productId: id,
        quantity: amount
      });
    }

    saveCart(cart);
    state.cart = cart;

    updateCartCounters();
    showToast("Bidhaa imeongezwa kwenye kapu.", "success");
  }

  function removeFromCart(productId) {
    const id = String(productId || "");
    const cart = getCart().filter(
      item => String(item.productId) !== id
    );

    saveCart(cart);
    state.cart = cart;

    updateCartCounters();
    showToast("Bidhaa imeondolewa kwenye kapu.", "success");
  }

  function changeCartQuantity(productId, quantity) {
    const id = String(productId || "");
    const product = state.products.find(
      item => getProductId(item) === id
    );

    const amount = Math.floor(safeNumber(quantity, 1));

    if (amount <= 0) {
      removeFromCart(id);
      return;
    }

    if (!product || amount > getProductStock(product)) {
      showToast("Idadi hiyo haipatikani kwenye stoo.", "error");
      return;
    }

    const cart = getCart();
    const item = cart.find(entry => String(entry.productId) === id);

    if (!item) return;

    item.quantity = amount;

    saveCart(cart);
    state.cart = cart;

    updateCartCounters();
  }

  window.zuneLoadProducts = loadProducts;
  window.zuneApplyProductFilters = applyProductFilters;
  window.zuneSetCategory = setCategory;
  window.zuneRenderProducts = renderProducts;
  window.zuneAddToCart = addToCart;
  window.zuneRemoveFromCart = removeFromCart;
  window.zuneChangeCartQuantity = changeCartQuantity;
  window.zuneToggleWishlist = toggleWishlist;
  window.zuneRenderRecentlyViewed = renderRecentlyViewed;

  function openProductDetails(productId) {
    const product = state.products.find(
      item => getProductId(item) === String(productId)
    );

    if (!product) {
      showToast("Bidhaa haijapatikana.", "error");
      return;
    }

    const modal = $("#zuneModal");
    const backdrop = $("#modalBackdrop");
    const title = $("#modalTitle");
    const subtitle = $("#modalSubtitle");
    const headingIcon = $("#modalHeadingIcon");
    const content = $("#modalContent");
    const footer = $("#modalFooter");

    if (!modal || !backdrop || !content) {
      navigateTo("product.html", { id: getProductId(product) });
      return;
    }

    if (title) title.textContent = getProductName(product);
    if (subtitle) subtitle.textContent = "Maelezo ya bidhaa";
    if (headingIcon) headingIcon.textContent = "🛍️";

    content.replaceChildren();

    const description = document.createElement("p");
    description.textContent =
      getProductDescription(product) || "Hakuna maelezo ya ziada.";

    const price = document.createElement("p");
    price.className = "zune-modal-price";
    price.textContent = formatMoney(getProductPrice(product));

    const stock = document.createElement("p");
    stock.textContent =
      getProductStock(product) > 0
        ? `Bidhaa zilizobaki: ${getProductStock(product)}`
        : "Bidhaa hii imeisha.";

    content.append(description, price, stock);

    if (footer) {
      footer.replaceChildren();

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "zune-product-add";
      addButton.textContent = "Weka kwenye kapu";
      addButton.disabled = getProductStock(product) < 1;

      addButton.addEventListener("click", () => {
        addToCart(getProductId(product), 1);
      });

      footer.appendChild(addButton);
    }

    modal.hidden = false;
    backdrop.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    const modal = $("#zuneModal");
    const backdrop = $("#modalBackdrop");

    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }

    if (backdrop) {
      backdrop.hidden = true;
    }

    document.body.classList.remove("modal-open");
  }

  function openDrawer() {
    const drawer = $("#sideDrawer");
    const backdrop = $("#drawerBackdrop");

    if (drawer) {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
    }

    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add("is-visible");
    }

    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    const drawer = $("#sideDrawer");
    const backdrop = $("#drawerBackdrop");

    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }

    if (backdrop) {
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
    }

    document.body.classList.remove("drawer-open");
  }

  function handleSearchSubmit(event) {
    if (event) event.preventDefault();

    const input = $("#homeSearchInput");

    state.searchTerm = String(input?.value || "").trim();

    applyProductFilters();

    const section = $("#productsSection");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function clearSearch() {
    const input = $("#homeSearchInput");

    if (input) {
      input.value = "";
    }

    state.searchTerm = "";
    applyProductFilters();
  }

  function handleDrawerAction(action) {
    closeDrawer();

    switch (String(action || "").toLowerCase()) {
      case "home":
        navigateTo("index.html");
        break;

      case "categories":
        navigateTo("category.html");
        break;

      case "cart":
        navigateTo("cart.html");
        break;

      case "account":
      case "profile":
        navigateTo("account.html");
        break;

      case "orders":
        navigateTo("account.html", { section: "orders" });
        break;

      case "wishlist":
        navigateTo("account.html", { section: "wishlist" });
        break;

      case "notifications":
        navigateTo("notification.html");
        break;

      case "wallet":
        navigateTo("wallet.html");
        break;

      case "seller":
        navigateTo("seller.html");
        break;

      case "seller-dashboard":
        navigateTo("seller-dashboard.html");
        break;

      case "admin":
        if (state.profile?.role === "admin") {
          navigateTo("admin.html");
        } else {
          showToast("Huna ruhusa ya kufungua ukurasa wa admin.", "error");
        }
        break;

      case "login":
        navigateTo("login.html");
        break;

      case "signup":
        navigateTo("signup.html");
        break;

      case "logout":
        signOut().catch(error => {
          logError("Imeshindikana kutoka kwenye akaunti.", error);
          showToast("Imeshindikana kutoka. Jaribu tena.", "error");
        });
        break;

      default:
        showToast("Sehemu hiyo haijapatikana.", "error");
    }
  }

  function bindClick(selector, callback) {
    $$(selector).forEach(element => {
      if (element.dataset.zuneBound === "true") return;

      element.dataset.zuneBound = "true";

      element.addEventListener("click", event => {
        callback(event, element);
      });
    });
  }

  function bindEvents() {
    const searchForm = $("#searchForm");

    if (searchForm && searchForm.dataset.zuneBound !== "true") {
      searchForm.dataset.zuneBound = "true";
      searchForm.addEventListener("submit", handleSearchSubmit);
    }

    const searchInput = $("#homeSearchInput");

    if (searchInput && searchInput.dataset.zuneBound !== "true") {
      searchInput.dataset.zuneBound = "true";

      searchInput.addEventListener("input", () => {
        state.searchTerm = searchInput.value.trim();
        applyProductFilters();
      });
    }

    bindClick("#clearSearchBtn", clearSearch);
    bindClick("#menuBtn", openDrawer);
    bindClick("#closeDrawerBtn", closeDrawer);
    bindClick("#drawerBackdrop", closeDrawer);
    bindClick("#closeModalBtn", closeModal);
    bindClick("#modalBackdrop", event => {
      if (event.target === $("#modalBackdrop")) {
        closeModal();
      }
    });

    bindClick("#cartBtn", () => navigateTo("cart.html"));
    bindClick("#profileBtn", () => navigateTo("account.html"));
    bindClick("#notificationBtn", () => navigateTo("notification.html"));
    bindClick("#verifiedBtn", () => navigateTo("account.html", { section: "verification" }));

    bindClick("#heroShopBtn", () => {
      const section = $("#productsSection");

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        navigateTo("category.html");
      }
    });

    bindClick("#heroSellerBtn", () => {
      if (!requireLogin("seller.html")) return;
      navigateTo("seller.html");
    });

    bindClick("#drawerLoginBtn", () => navigateTo("login.html"));
    bindClick("#drawerLogoutBtn", () => {
      signOut().catch(error => {
        logError("Hitilafu ya logout.", error);
        showToast("Imeshindikana kutoka. Jaribu tena.", "error");
      });
    });

    bindClick("#reloadProductsBtn", () => {
      loadProducts().catch(error => {
        logError("Imeshindikana kuanzisha upya upakiaji wa bidhaa.", error);
      });
    });

    bindClick("#recentlyViewedClearBtn", () => {
      saveRecentlyViewed([]);
      state.recentlyViewed = [];
      renderRecentlyViewed();
      showToast("Bidhaa ulizotazama zimefutwa kwenye orodha.", "success");
    });

    bindClick("#allCategoriesBtn", () => {
      navigateTo("category.html");
    });

    bindClick("#viewAllProductsBtn", () => {
      setCategory("all");

      const section = $("#productsSection");

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    bindClick(".category-card", (_event, element) => {
      setCategory(element.dataset.category || "all");

      const section = $("#productsSection");

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    bindClick("[data-drawer-action]", (_event, element) => {
      handleDrawerAction(element.dataset.drawerAction);
    });

    bindClick(".bottom-nav-item", (_event, element) => {
      const destination =
        element.dataset.page ||
        element.dataset.destination ||
        element.dataset.nav;

      if (destination) {
        const allowed = {
          home: "index.html",
          categories: "category.html",
          cart: "cart.html",
          account: "account.html"
        };

        const page = allowed[String(destination).toLowerCase()];

        if (page) navigateTo(page);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeModal();
        closeDrawer();
      }
    });
  }

  window.zuneOpenProductDetails = openProductDetails;
  window.zuneCloseModal = closeModal;
  window.zuneOpenDrawer = openDrawer;
  window.zuneCloseDrawer = closeDrawer;
  window.zuneHandleDrawerAction = handleDrawerAction;
  window.zuneSignOut = signOut;
  window.zuneLoadCurrentUser = loadCurrentUser;

  function initializeHeroSlider() {
    const slides = $$(".hero-slide");
    const dots = $$(".hero-dot");

    if (slides.length === 0) return;

    let currentSlide = 0;
    let sliderInterval = null;

    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === currentSlide;

        slide.classList.toggle("is-active", active);
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
      });

      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === currentSlide;

        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    function startSlider() {
      stopSlider();

      if (slides.length < 2) return;

      sliderInterval = window.setInterval(() => {
        showSlide(currentSlide + 1);
      }, CONFIG.SLIDE_INTERVAL);
    }

    function stopSlider() {
      if (sliderInterval !== null) {
        window.clearInterval(sliderInterval);
        sliderInterval = null;
      }
    }

    dots.forEach((dot, index) => {
      if (dot.dataset.zuneBound === "true") return;

      dot.dataset.zuneBound = "true";

      dot.addEventListener("click", () => {
        showSlide(index);
        startSlider();
      });
    });

    const sliderContainer = slides[0].parentElement;

    if (sliderContainer && sliderContainer.dataset.zuneSliderBound !== "true") {
      sliderContainer.dataset.zuneSliderBound = "true";

      sliderContainer.addEventListener("mouseenter", stopSlider);
      sliderContainer.addEventListener("mouseleave", startSlider);

      sliderContainer.addEventListener("focusin", stopSlider);
      sliderContainer.addEventListener("focusout", startSlider);
    }

    showSlide(0);
    startSlider();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopSlider();
      } else {
        startSlider();
      }
    });
  }

  function initializeBottomNavigation() {
    const currentPage = (
      window.location.pathname.split("/").pop() || "index.html"
    ).toLowerCase();

    const pageMap = {
      "index.html": "home",
      "": "home",
      "category.html": "categories",
      "cart.html": "cart",
      "account.html": "account"
    };

    const currentKey = pageMap[currentPage];

    $$(".bottom-nav-item").forEach(item => {
      const destination = String(
        item.dataset.page ||
        item.dataset.destination ||
        item.dataset.nav ||
        ""
      ).toLowerCase();

      const active = destination === currentKey;

      item.classList.toggle("is-active", active);

      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function initializeLanguage() {
    const language = readStorage("zune_language", "sw");

    document.documentElement.lang =
      language === "en" ? "en" : "sw";

    const languageButtons = $$("[data-language]");

    languageButtons.forEach(button => {
      if (button.dataset.zuneBound === "true") return;

      button.dataset.zuneBound = "true";

      button.addEventListener("click", () => {
        const selectedLanguage = button.dataset.language;

        if (!["sw", "en"].includes(selectedLanguage)) return;

        writeStorage("zune_language", selectedLanguage);

        document.documentElement.lang =
          selectedLanguage === "en" ? "en" : "sw";

        if (typeof window.setLanguage === "function") {
          window.setLanguage(selectedLanguage);
        }

        showToast(
          selectedLanguage === "en"
            ? "Language updated."
            : "Lugha imebadilishwa.",
          "success"
        );
      });
    });

    if (typeof window.setLanguage === "function") {
      try {
        window.setLanguage(language);
      } catch (error) {
        logError("Imeshindikana kuweka lugha.", error);
      }
    }
  }

  function initializeInstallPrompt() {
    let installPrompt = null;

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;

      const installButton = $("#installAppBtn");

      if (installButton) {
        installButton.hidden = false;
      }
    });

    bindClick("#installAppBtn", async () => {
      if (!installPrompt) {
        showToast(
          "Usakinishaji haupatikani kwa sasa kwenye kivinjari hiki.",
          "info"
        );
        return;
      }

      installPrompt.prompt();

      try {
        await installPrompt.userChoice;
      } catch (error) {
        logError("Hitilafu wakati wa kusakinisha ZUNE.", error);
      }

      installPrompt = null;

      const installButton = $("#installAppBtn");

      if (installButton) {
        installButton.hidden = true;
      }
    });

    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      showToast("ZUNE imesakinishwa.", "success");
    });
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    if (window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost") {
      return;
    }

    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      logError("Service worker haijasajiliwa.", error);
    }
  }

  async function initializeZuneApp() {
    if (state.initialized) return;

    state.initialized = true;

    bindEvents();
    initializeHeroSlider();
    initializeBottomNavigation();
    initializeLanguage();
    initializeInstallPrompt();

    state.selectedCategory = readStorage(
      CONFIG.STORAGE.CATEGORY,
      "all"
    );

    updateCartCounters();
    updateAccountHeader();
    renderRecentlyViewed();

    try {
      await initializeSupabase();
      await loadCurrentUser();
      handleAuthStateChange();
      await loadProducts();
    } catch (error) {
      state.initialized = false;

      logError("ZUNE haikuweza kuanzisha huduma zote.", error);

      showToast(
        "Baadhi ya huduma hazijapatikana. Tafadhali jaribu tena.",
        "error"
      );
    }

    registerServiceWorker();
  }

  function startZuneApp() {
    initializeZuneApp().catch(error => {
      state.initialized = false;
      logError("Hitilafu ya kuanzisha ZUNE.", error);
    });
  }

  window.zuneInitialize = initializeZuneApp;
  window.zuneReloadProducts = loadProducts;
  window.zuneRefreshAccount = loadCurrentUser;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startZuneApp, {
      once: true
    });
  } else {
    startZuneApp();
  }
})();
