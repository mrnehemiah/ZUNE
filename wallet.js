
"use strict";

// ============================================
// ZUNE WALLET
// Toleo salama: hakuna salio la kubuni
// ============================================

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

const moneyFormatter = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2
});

let supabaseClient = null;
let isHidden = false;
let currentBalance = null;
let currentUser = null;

const $ = (id) => document.getElementById(id);

function formatTZS(amount) {
  return `TZS ${moneyFormatter.format(amount)}`;
}

function showMessage(message, type = "info") {
  const element = $("walletMessage");
  if (!element) return;

  element.textContent = message;

  element.className =
    "wallet-card p-4 text-sm " +
    (type === "error"
      ? "text-red-700"
      : type === "success"
        ? "text-green-700"
        : "text-slate-600");
}

function renderBalance() {
  const balanceElement = $("balanceText");

  if (!balanceElement) return;

  // Usionyeshe kiasi kama hakijathibitishwa.
  if (
    currentBalance === null ||
    !Number.isFinite(currentBalance) ||
    currentBalance < 0
  ) {
    balanceElement.textContent = "Halijathibitishwa";
    return;
  }

  balanceElement.textContent = isHidden
    ? "TZS ••••••••"
    : formatTZS(currentBalance);
}

function setWalletStatus(message) {
  const element = $("walletStatus");
  if (element) element.textContent = message;
}

function setAccountStatus(message) {
  const element = $("accountStatus");
  if (element) element.textContent = message;
}

function setUnavailableSummary() {
  const sales = $("completedSales");
  const pending = $("pendingBalance");

  if (sales) sales.textContent = "Hayajathibitishwa";
  if (pending) pending.textContent = "Hayajathibitishwa";
}

function renderEmptyTransactions(message) {
  const list = $("transactions-list");
  if (!list) return;

  // textContent huzuia ujumbe kuingizwa kama HTML.
  list.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "py-5 text-center";

  const icon = document.createElement("i");
  icon.className =
    "fa-solid fa-clock-rotate-left mb-3 text-2xl text-slate-300";

  const heading = document.createElement("p");
  heading.className = "font-semibold text-slate-700";
  heading.textContent = "Historia haipatikani";

  const description = document.createElement("p");
  description.className = "mt-1 text-sm text-slate-500";
  description.textContent = message;

  wrapper.append(icon, heading, description);
  list.appendChild(wrapper);
}

function resetWalletDisplay() {
  currentBalance = null;
  renderBalance();
  setWalletStatus("Salio halijathibitishwa");
  setUnavailableSummary();

  renderEmptyTransactions(
    "Hakuna chanzo cha miamala kilichounganishwa bado."
  );
}

function disableWalletActions() {
  [
    "depositBtn",
    "withdrawBtn",
    "payOrderBtn",
    "sendMoneyBtn"
  ].forEach((id) => {
    const button = $(id);
    if (button) button.disabled = true;
    if (button) button.classList.add("opacity-60");
  });
}

function enableWalletActions() {
  [
    "depositBtn",
    "withdrawBtn",
    "payOrderBtn",
    "sendMoneyBtn"
  ].forEach((id) => {
    const button = $(id);
    if (button) button.disabled = false;
    if (button) button.classList.remove("opacity-60");
  });
}

async function initializeSupabase() {
  if (!window.supabase?.createClient) {
    throw new Error(
      "Huduma ya Supabase haijapakia. Hakikisha una intaneti kisha jaribu tena."
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
}

async function checkAuthentication() {
  if (!supabaseClient) {
    throw new Error("Supabase haijaunganishwa.");
  }

  const { data, error } = await supabaseClient.auth.getUser();

  if (error) throw error;

  currentUser = data?.user ?? null;

  if (!currentUser) {
    setAccountStatus("Hujaingia kwenye akaunti ya ZUNE.");
    setWalletStatus("Ingia ili kuendelea");
    showMessage(
      "Tafadhali ingia kwenye akaunti yako kabla ya kutumia huduma za Wallet.",
      "error"
    );

    disableWalletActions();
    return false;
  }

  setAccountStatus("Akaunti imethibitishwa.");
  setWalletStatus("Akaunti ipo; salio bado halijaunganishwa.");
  enableWalletActions();

  return true;
}

async function loadWallet() {
  const refreshButton = $("refreshWalletBtn");

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.classList.add("opacity-60");
  }

  resetWalletDisplay();

  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    const authenticated = await checkAuthentication();

    if (!authenticated) return;

    // Muhimu:
    // Hatuulizi jedwali lisilothibitishwa kuwepo.
    // Hatuonyeshi salio la mfano.
    // Hatugeuzi jumla ya oda kuwa salio la kutoa.
    showMessage(
      "Akaunti imethibitishwa. Ili kuonyesha salio na historia halisi, wallet inahitaji kuunganishwa na jedwali la miamala lililopo na sheria zake za usalama."
    );

    setWalletStatus("Inasubiri kuunganishwa na data halisi.");
    resetWalletDisplay();
  } catch (error) {
    console.error("ZUNE Wallet error:", error);

    resetWalletDisplay();
    setWalletStatus("Imeshindikana kuthibitisha taarifa.");

    showMessage(
      error?.message ||
        "Imeshindikana kuunganisha Wallet. Hakikisha intaneti ipo kisha ujaribu tena.",
      "error"
    );
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.classList.remove("opacity-60");
    }
  }
}

// Ficha au onyesha salio.
const toggleButton = $("toggleBalance");

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    isHidden = !isHidden;
    renderBalance();

    toggleButton.setAttribute(
      "aria-pressed",
      String(isHidden)
    );

    const eyeIcon = $("eyeIcon");

    if (eyeIcon) {
      eyeIcon.className = isHidden
        ? "fa-regular fa-eye-slash text-lg"
        : "fa-regular fa-eye text-lg";
    }
  });
}

// Hakiki tena taarifa.
const refreshButton = $("refreshWalletBtn");

if (refreshButton) {
  refreshButton.addEventListener("click", loadWallet);
}

// Vitendo vya wallet vinabaki vimezuiwa mpaka
// njia halisi na salama ya malipo iunganishwe.
function explainUnavailableAction(action) {
  showMessage(
    `${action}: huduma hii bado haijaunganishwa na mfumo halisi wa malipo. Hakuna pesa iliyoongezwa, kutolewa au kutumwa.`,
    "error"
  );
}

$("depositBtn")?.addEventListener("click", () => {
  explainUnavailableAction("Kuweka pesa");
});

$("withdrawBtn")?.addEventListener("click", () => {
  explainUnavailableAction("Kutoa pesa");
});

$("payOrderBtn")?.addEventListener("click", () => {
  explainUnavailableAction("Kulipia oda");
});

$("sendMoneyBtn")?.addEventListener("click", () => {
  explainUnavailableAction("Kutuma pesa");
});

// Hali ya mwanzo kabla ya uthibitisho.
disableWalletActions();
resetWalletDisplay();

// Anzisha ukaguzi wa akaunti.
loadWallet();

// Fuata mabadiliko ya kuingia au kutoka.
async function listenForAuthChanges() {
  try {
    if (!supabaseClient) await initializeSupabase();

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        currentUser = null;
        resetWalletDisplay();
        disableWalletActions();
        setAccountStatus("Hujaingia kwenye akaunti.");
        setWalletStatus("Ingia ili kuendelea");
        showMessage("Ingia kwenye akaunti yako ya ZUNE ili kuendelea.");
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadWallet();
      }
    });
  } catch (error) {
    console.error("Auth listener error:", error);
  }
}

listenForAuthChanges();
