(() => {
  "use strict";

  const ZUNE_CONFIG = {
    SUPABASE_URL: "https://rpkogiieegqgxqbzwxwo.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_2TEqZv-NBM9n5knU",
    NOTIFICATIONS_KEY: "zune_notifications",
    SETTINGS_KEY: "zune_notification_settings"
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const state = {
    supabase: null,
    user: null,
    profile: null,
    notifications: [],
    settings: {
      orders: true,
      account: true,
      promotions: true
    },
    filter: "all",
    initialized: false,
    pollingTimer: null
  };

  const DEFAULT_NOTIFICATIONS = [
    {
      id: "zune-welcome",
      type: "account",
      title: "Karibu ZUNE!",
      message:
        "Karibu kwenye ZUNE. Tembelea soko letu na ugundue bidhaa mbalimbali.",
      time: Date.now(),
      read: false,
      link: "./index.html",
      source: "local"
    },
    {
      id: "zune-discover",
      type: "promotions",
      title: "Gundua bidhaa mpya",
      message:
        "Angalia bidhaa zinazopatikana kwenye ZUNE na uchague unachohitaji.",
      time: Date.now() - 60000,
      read: false,
      link: "./index.html",
      source: "local"
    }
  ];

  function getCurrentUserId() {
    return state.user?.id || null;
  }

  function getStorageKey() {
    const userId = getCurrentUserId();
    return userId
      ? `${ZUNE_CONFIG.NOTIFICATIONS_KEY}_${userId}`
      : ZUNE_CONFIG.NOTIFICATIONS_KEY;
  }

  function getSettingsKey() {
    const userId = getCurrentUserId();
    return userId
      ? `${ZUNE_CONFIG.SETTINGS_KEY}_${userId}`
      : ZUNE_CONFIG.SETTINGS_KEY;
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readLocalNotifications() {
    const saved = safeParse(
      localStorage.getItem(getStorageKey()),
      null
    );

    if (!Array.isArray(saved)) {
      return DEFAULT_NOTIFICATIONS.map(item => ({ ...item }));
    }

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.message === "string"
    );
  }

  function saveLocalNotifications() {
    try {
      localStorage.setItem(
        getStorageKey(),
        JSON.stringify(state.notifications)
      );
      return true;
    } catch (error) {
      console.error("ZUNE: Imeshindikana kuhifadhi taarifa.", error);
      showToast("Imeshindikana kuhifadhi taarifa kwenye kifaa.");
      return false;
    }
  }

  function loadLocalSettings() {
    const saved = safeParse(
      localStorage.getItem(getSettingsKey()),
      {}
    );

    state.settings = {
      orders: saved.orders !== false,
      account: saved.account !== false,
      promotions: saved.promotions !== false
    };
  }

  function saveLocalSettings() {
    try {
      localStorage.setItem(
        getSettingsKey(),
        JSON.stringify(state.settings)
      );
      return true;
    } catch (error) {
      console.error("ZUNE: Imeshindikana kuhifadhi mipangilio.", error);
      return false;
    }
  }

  function showToast(message) {
    let toast = $("#toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function initializeSupabaseClient() {
    if (state.supabase) return state.supabase;

    if (!window.supabase?.createClient) {
      console.warn(
        "ZUNE: Supabase JS haijapakiwa. Taarifa za kifaa pekee zitatumika."
      );
      return null;
    }

    state.supabase = window.supabase.createClient(
      ZUNE_CONFIG.SUPABASE_URL,
      ZUNE_CONFIG.SUPABASE_ANON_KEY
    );

    return state.supabase;
  }

  function setUser(user) {
    const previousUserId = getCurrentUserId();

    state.user = user || null;

    if (previousUserId !== getCurrentUserId()) {
      loadLocalSettings();
      state.notifications = readLocalNotifications();
      renderNotifications();
    }
  }
  function getNotificationIcon(type) {
    const icons = {
      orders: `
        <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6"/>
        <circle cx="10" cy="21" r="1"/>
        <circle cx="18" cy="21" r="1"/>`,
      account: `
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21a8 8 0 0 1 16 0"/>`,
      promotions: `
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>`,
      system: `
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
        <path d="M10 21h4"/>`
    };

    return `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        ${icons[type] || icons.system}
      </svg>`;
  }

  function formatTime(timestamp) {
    const time = Number(timestamp);

    if (!Number.isFinite(time)) return "Sasa hivi";

    const elapsed = Math.max(0, Date.now() - time);
    const minutes = Math.floor(elapsed / 60000);

    if (minutes < 1) return "Sasa hivi";
    if (minutes < 60) return `Dakika ${minutes} zilizopita`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saa ${hours} zilizopita`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `Siku ${days} zilizopita`;

    return new Date(time).toLocaleDateString("sw-TZ", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function getFilteredNotifications() {
    return state.notifications.filter(item => {
      if (state.filter === "all") return true;
      if (state.filter === "unread") return !item.read;
      return item.type === state.filter;
    });
  }

  function updateNotificationCounters() {
    const unreadCount =
      state.notifications.filter(item => !item.read).length;

    const counter = $("#unreadCount");
    if (counter) {
      counter.textContent = `${unreadCount} mpya`;
    }

    const navCounter = $("#navUnreadCount");
    if (navCounter) {
      navCounter.textContent =
        unreadCount > 99 ? "99+" : String(unreadCount);
      navCounter.hidden = unreadCount === 0;
    }
  }

  function renderNotifications() {
    const list = $("#notificationList");
    const emptyState = $("#emptyState");

    if (!list) {
      updateNotificationCounters();
      return;
    }

    const filtered = getFilteredNotifications();

    list.innerHTML = filtered.map(item => {
      const iconClass =
        item.type === "promotions" ? "yellow" :
        item.type === "orders" && item.status === "cancelled"
          ? "red"
          : "";

      const readAction = item.read
        ? ""
        : `<button class="small-action"
             data-action="read"
             data-id="${escapeHTML(item.id)}">
             Weka kuwa imesomwa
           </button>`;

      const openAction = item.link
        ? `<button class="small-action"
             data-action="open"
             data-id="${escapeHTML(item.id)}">
             Fungua
           </button>`
        : "";

      return `
        <article class="notification-card ${item.read ? "" : "unread"}"
          data-id="${escapeHTML(item.id)}">

          <div class="notification-icon ${iconClass}">
            ${getNotificationIcon(item.type)}
          </div>

          <div class="notification-content">
            <div class="notification-top">
              <h3 class="notification-title">
                ${escapeHTML(item.title)}
              </h3>
              ${item.read ? "" : `
                <span class="unread-dot"
                  aria-label="Haijasomwa"></span>
              `}
            </div>

            <div class="notification-message">
              ${escapeHTML(item.message)}
            </div>

            <div class="notification-time">
              ${escapeHTML(formatTime(item.time))}
            </div>

            <div class="notification-actions">
              ${readAction}
              ${openAction}
              <button class="small-action delete"
                data-action="delete"
                data-id="${escapeHTML(item.id)}">
                Futa
              </button>
            </div>
          </div>
        </article>`;
    }).join("");

    if (emptyState) {
      emptyState.classList.toggle("show", filtered.length === 0);
    }

    updateNotificationCounters();
  }

  function setFilter(filter) {
    const allowed = [
      "all",
      "unread",
      "orders",
      "account",
      "promotions"
    ];

    if (!allowed.includes(filter)) return;

    state.filter = filter;

    $$(".filter-button").forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderNotifications();
  }

  function markNotificationRead(id) {
    const item = state.notifications.find(
      notification => notification.id === id
    );

    if (!item || item.read) return;

    item.read = true;
    saveLocalNotifications();
    renderNotifications();
    showToast("Taarifa imesomwa.");
  }

  function markAllNotificationsRead() {
    state.notifications = state.notifications.map(item => ({
      ...item,
      read: true
    }));

    saveLocalNotifications();
    renderNotifications();
    showToast("Taarifa zote zimewekwa kuwa zimesomwa.");
  }

  function deleteNotification(id) {
    const originalLength = state.notifications.length;

    state.notifications = state.notifications.filter(
      item => item.id !== id
    );

    if (state.notifications.length === originalLength) return;

    saveLocalNotifications();
    renderNotifications();
    showToast("Taarifa imefutwa kwenye kifaa hiki.");
  }

  function openNotification(id) {
    const item = state.notifications.find(
      notification => notification.id === id
    );

    if (!item) return;

    item.read = true;
    saveLocalNotifications();
    renderNotifications();

    if (typeof item.link === "string" &&
        item.link.startsWith("./")) {
      window.location.href = item.link;
    } else {
      showToast("Taarifa imesomwa.");
    }
  }

  function loadSettingsIntoUI() {
    const orders = $("#settingOrders");
    const account = $("#settingAccount");
    const promotions = $("#settingPromotions");

    if (orders) orders.checked = state.settings.orders;
    if (account) account.checked = state.settings.account;
    if (promotions) promotions.checked = state.settings.promotions;
  }

  function saveSettingsFromUI() {
    state.settings = {
      orders: $("#settingOrders")?.checked !== false,
      account: $("#settingAccount")?.checked !== false,
      promotions: $("#settingPromotions")?.checked !== false
    };

    if (saveLocalSettings()) {
      showToast("Mipangilio imehifadhiwa.");
    } else {
      showToast("Imeshindikana kuhifadhi mipangilio.");
    }
  }

  function isNotificationEnabled(type) {
    if (type === "orders") return state.settings.orders;
    if (type === "account") return state.settings.account;
    if (type === "promotions") return state.settings.promotions;
    return true;
  }

  function addNotification(data = {}) {
    const title = String(data.title || "").trim();
    const message = String(data.message || "").trim();

    if (!title || !message) return false;

    const typeList = [
      "orders",
      "account",
      "promotions",
      "system"
    ];

    const type = typeList.includes(data.type)
      ? data.type
      : "system";

    if (!isNotificationEnabled(type)) return false;

    const item = {
      id: `zune-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: title.slice(0, 150),
      message: message.slice(0, 1500),
      time: Date.now(),
      read: false,
      link: typeof data.link === "string" &&
        data.link.startsWith("./")
          ? data.link
          : "",
      source: "local"
    };

    state.notifications.unshift(item);
    saveLocalNotifications();
    renderNotifications();
    showToast("Umepokea taarifa mpya.");

    return true;
  }

  async function loadSupabaseNotifications() {
    const client = initializeSupabaseClient();
    const userId = getCurrentUserId();

    if (!client || !userId) return false;

    /*
      Hii inajaribu kusoma jedwali la notifications.
      Ikiwa jedwali au columns zake hazipo, taarifa za
      localStorage zitaendelea kufanya kazi.
    */

    try {
      const { data, error } = await client
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn(
          "ZUNE: Taarifa za Supabase hazijapakiwa.",
          error.message
        );
        return false;
      }

      if (!Array.isArray(data)) return false;

      const remoteItems = data.map(row => ({
        id: String(row.id),
        type: [
          "orders",
          "account",
          "promotions",
          "system"
        ].includes(row.type) ? row.type : "system",
        title: String(row.title || "Taarifa ya ZUNE"),
        message: String(row.message || ""),
        time: row.created_at
          ? new Date(row.created_at).getTime()
          : Date.now(),
        read: Boolean(row.is_read ?? row.read ?? false),
        link: typeof row.link === "string" &&
          row.link.startsWith("./") ? row.link : "",
        source: "supabase"
      })).filter(item => item.message);

      const localItems = state.notifications.filter(
        item => item.source !== "supabase"
      );

      const combined = new Map();

      [...remoteItems, ...localItems].forEach(item => {
        combined.set(String(item.id), item);
      });

      state.notifications = [...combined.values()]
        .sort((a, b) => Number(b.time) - Number(a.time))
        .slice(0, 150);

      saveLocalNotifications();
      renderNotifications();
      return true;
    } catch (error) {
      console.warn("ZUNE: Tatizo la kupakia taarifa.", error);
      return false;
    }
  }

  async function markSupabaseNotificationRead(id) {
    const client = initializeSupabaseClient();
    const userId = getCurrentUserId();

    if (!client || !userId) return;

    const item = state.notifications.find(
      notification => String(notification.id) === String(id)
    );

    if (!item || item.source !== "supabase") return;

    try {
      const { error } = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.warn(
          "ZUNE: Hali ya kusomwa haikuhifadhiwa Supabase.",
          error.message
        );
      }
    } catch (error) {
      console.warn("ZUNE: Imeshindikana kusasisha taarifa.", error);
    }
  }

  async function deleteSupabaseNotification(id) {
    const client = initializeSupabaseClient();
    const userId = getCurrentUserId();

    if (!client || !userId) return;

    const item = state.notifications.find(
      notification => String(notification.id) === String(id)
    );

    if (!item || item.source !== "supabase") return;

    try {
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.warn(
          "ZUNE: Taarifa haikufutwa Supabase.",
          error.message
        );
      }
    } catch (error) {
      console.warn("ZUNE: Tatizo wakati wa kufuta taarifa.", error);
    }
  }

  function handleNotificationListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const item = state.notifications.find(
      notification => String(notification.id) === String(id)
    );

    if (!item) return;

    if (action === "read") {
      item.read = true;
      saveLocalNotifications();
      renderNotifications();
      void markSupabaseNotificationRead(id);
      showToast("Taarifa imesomwa.");
    }

    if (action === "delete") {
      void deleteSupabaseNotification(id);
      deleteNotification(id);
    }

    if (action === "open") {
      if (item.source === "supabase") {
        item.read = true;
        saveLocalNotifications();
        renderNotifications();
        void markSupabaseNotificationRead(id);
      }

      openNotification(id);
    }
  }

  function bindEvents() {
    const list = $("#notificationList");

    if (list && !list.dataset.zuneBound) {
      list.addEventListener("click", handleNotificationListClick);
      list.dataset.zuneBound = "true";
    }

    $$(".filter-button").forEach(button => {
      if (button.dataset.zuneBound) return;

      button.addEventListener("click", () => {
        setFilter(button.dataset.filter);
      });

      button.dataset.zuneBound = "true";
    });

    ["markAllButton", "markAllTop"].forEach(id => {
      const button = document.getElementById(id);

      if (!button || button.dataset.zuneBound) return;

      button.addEventListener("click", markAllNotificationsRead);
      button.dataset.zuneBound = "true";
    });

    const saveSettingsButton = $("#saveSettings");

    if (saveSettingsButton && !saveSettingsButton.dataset.zuneBound) {
      saveSettingsButton.addEventListener(
        "click",
        saveSettingsFromUI
      );
      saveSettingsButton.dataset.zuneBound = "true";
    }

    const settingsShortcut = $("#settingsShortcut");

    if (settingsShortcut && !settingsShortcut.dataset.zuneBound) {
      settingsShortcut.addEventListener("click", () => {
        $("#settingsSection")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });

      settingsShortcut.dataset.zuneBound = "true";
    }

    const openOrders = $("#openOrders");
    const viewOrders = $("#viewOrdersButton");

    [openOrders, viewOrders].forEach(button => {
      if (!button || button.dataset.zuneBound) return;

      button.addEventListener("click", () => {
        window.location.href = "./cart.html";
      });

      button.dataset.zuneBound = "true";
    });

    $$(".quick-link[data-go]").forEach(button => {
      if (button.dataset.zuneBound) return;

      button.addEventListener("click", () => {
        const destination = button.dataset.go;

        if (typeof destination === "string" &&
            destination.startsWith("./")) {
          window.location.href = destination;
        }
      });

      button.dataset.zuneBound = "true";
    });

    ["settingOrders", "settingAccount", "settingPromotions"]
      .forEach(id => {
        const input = document.getElementById(id);

        if (!input || input.dataset.zuneBound) return;

        input.addEventListener("change", () => {
          state.settings = {
            orders: $("#settingOrders")?.checked !== false,
            account: $("#settingAccount")?.checked !== false,
            promotions: $("#settingPromotions")?.checked !== false
          };

          saveLocalSettings();
        });

        input.dataset.zuneBound = "true";
      });
  }

  async function initializeAuthentication() {
    const client = initializeSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client.auth.getSession();

      if (error) {
        console.warn("ZUNE: Session haikupatikana.", error.message);
        return;
      }

      setUser(data?.session?.user || null);

      if (state.user) {
        await loadSupabaseNotifications();
      }

      client.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);

        if (session?.user) {
          window.setTimeout(() => {
            void loadSupabaseNotifications();
          }, 0);
        }
      });
    } catch (error) {
      console.warn("ZUNE: Tatizo la uthibitishaji.", error);
    }
  }

  function listenForNewNotifications() {
    window.addEventListener("zune:new-notification", event => {
      addNotification(event.detail || {});
    });
  }

  function startNotificationRefresh() {
    if (state.pollingTimer) {
      clearInterval(state.pollingTimer);
    }

    state.pollingTimer = setInterval(() => {
      if (document.hidden || !getCurrentUserId()) return;
      void loadSupabaseNotifications();
    }, 60000);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && getCurrentUserId()) {
        void loadSupabaseNotifications();
      }
    });
  }

  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    loadLocalSettings();
    state.notifications = readLocalNotifications();

    loadSettingsIntoUI();
    bindEvents();
    listenForNewNotifications();
    renderNotifications();

    await initializeAuthentication();
    startNotificationRefresh();
  }

  /*
    Kuongeza taarifa kutoka file jingine la ZUNE:

    window.dispatchEvent(new CustomEvent("zune:new-notification", {
      detail: {
        type: "orders",
        title: "Oda yako imepokelewa",
        message: "Oda yako imepokelewa na inasubiri hatua inayofuata.",
        link: "./cart.html"
      }
    }));

    Aina zinazokubalika:
    orders, account, promotions, system

    MUHIMU:
    - Supabase inahitaji script yake kupakiwa kabla ya hii file.
    - Jedwali la notifications lazima liwe na columns zinazolingana
      na zinazotumiwa hapa, pamoja na RLS inayoruhusu mtumiaji
      kusoma na kusasisha taarifa zake mwenyewe.
    - Taarifa za localStorage huhifadhiwa kwenye kifaa hiki pekee.
  */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initialize();
    }, { once: true });
  } else {
    void initialize();
  }

  window.ZUNENotifications = Object.freeze({
    add: addNotification,
    refresh: loadSupabaseNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    remove: deleteNotification,
    setFilter,
    render: renderNotifications
  });

})();
