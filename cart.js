// ============================================
// ZUNE CHECKOUT & CART
// Supabase integration
// File: cart.js
// ============================================

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CART_KEY = "zune_cart";

let checkoutInProgress = false;

// ============================================
// 1. INITIALIZE
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("checkoutForm");

  if (form) {
    form.addEventListener("submit", handleCheckout);
  }

  renderCart();

  // Hakikisha mtumiaji ameingia.
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    showNotice(
      "Tafadhali ingia kwenye akaunti yako kabla ya kutuma oda.",
      "error"
    );
  } else {
    // Jaza jina na simu kutoka kwenye wasifu ikiwa zinapatikana.
    await loadCustomerProfile(data.user);
  }
});

// ============================================
// 2. CART HELPERS
// ============================================

function getCartItems() {
  try {
    const raw = localStorage.getItem(CART_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(item => item && typeof item === "object");
  } catch (error) {
    console.error("ZUNE: Imeshindwa kusoma kikapu.", error);
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    showNotice(
      "Kikapu hakijaweza kuhifadhiwa kwenye simu yako.",
      "error"
    );
    return false;
  }
}

function getProductId(item) {
  return item.product_id || item.productId || item.id || null;
}

function getQuantity(item) {
  const quantity = Number(item.quantity ?? 1);

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return 1;
  }

  return quantity;
}

function formatMoney(amount) {
  return "TZS " + Number(amount).toLocaleString("en-TZ", {
    maximumFractionDigits: 2
  });
}

// ============================================
// 3. DISPLAY NOTICES
// ============================================

function showNotice(message, type = "info") {
  let notice = document.getElementById("cartNotice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "cartNotice";
    notice.className = "max-w-xl mx-auto px-4 py-2 text-xs";
    notice.setAttribute("role", "status");

    const main = document.querySelector("main");

    if (main) {
      main.prepend(notice);
    } else {
      document.body.prepend(notice);
    }
  }

  notice.textContent = message;

  notice.className =
    "max-w-xl mx-auto px-4 py-3 text-xs rounded-xl " +
    (type === "error"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : type === "success"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-blue-50 text-blue-700 border border-blue-200");
}

// ============================================
// 4. RENDER CART
// ============================================

function renderCart() {
  const container = document.getElementById("cart-items-container");
  const subtotalEl = document.getElementById("subtotal-price");
  const totalEl = document.getElementById("total-price");
  const checkoutButton = document.getElementById("placeOrderBtn");

  if (!container) return;

  const items = getCartItems();

  container.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-center py-8";

    const icon = document.createElement("i");
    icon.className =
      "fa-solid fa-cart-arrow-down text-slate-300 text-3xl mb-2";

    const text = document.createElement("p");
    text.className = "text-xs text-slate-500 font-semibold";
    text.textContent = "Kikapu chako kiko wazi kwa sasa.";

    const link = document.createElement("a");
    link.href = "./index.html";
    link.className =
      "inline-block mt-3 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs";
    link.textContent = "Anza Ununuzi";

    empty.append(icon, text, link);
    container.appendChild(empty);

    if (subtotalEl) subtotalEl.textContent = formatMoney(0);
    if (totalEl) totalEl.textContent = formatMoney(0);
    if (checkoutButton) checkoutButton.disabled = true;

    return;
  }

  if (checkoutButton) checkoutButton.disabled = false;

  let total = 0;

  items.forEach((item, index) => {
    const quantity = getQuantity(item);
    const price = Number(item.price);

    const safePrice =
      Number.isFinite(price) && price >= 0 ? price : 0;

    total += safePrice * quantity;

    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 gap-3";

    const details = document.createElement("div");
    details.className = "flex-1 min-w-0";

    const title = document.createElement("h4");
    title.className = "font-bold text-xs text-slate-800 break-words";
    title.textContent = String(item.title || item.name || "Bidhaa");

    const priceText = document.createElement("p");
    priceText.className =
      "text-[11px] text-blue-600 font-extrabold mt-1";
    priceText.textContent = formatMoney(safePrice);

    const lineTotal = document.createElement("p");
    lineTotal.className = "text-[10px] text-slate-500 mt-1";
    lineTotal.textContent =
      "Jumla: " + formatMoney(safePrice * quantity);

    details.append(title, priceText, lineTotal);

    const controls = document.createElement("div");
    controls.className =
      "flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shrink-0";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.className = "px-2 font-bold text-slate-600";
    minus.setAttribute("aria-label", "Punguza idadi");
    minus.addEventListener("click", () => changeQty(index, -1));

    const qty = document.createElement("span");
    qty.className = "text-xs font-bold px-1";
    qty.textContent = String(quantity);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.className = "px-2 font-bold text-slate-600";
    plus.setAttribute("aria-label", "Ongeza idadi");
    plus.addEventListener("click", () => changeQty(index, 1));

    controls.append(minus, qty, plus);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-rose-500 p-2 shrink-0";
    remove.setAttribute("aria-label", "Ondoa bidhaa");
    remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    remove.addEventListener("click", () => removeItem(index));

    row.append(details, controls, remove);
    container.appendChild(row);
  });

  if (subtotalEl) subtotalEl.textContent = formatMoney(total);
  if (totalEl) totalEl.textContent = formatMoney(total);
}

// ============================================
// 5. CHANGE QUANTITY
// ============================================

function changeQty(index, change) {
  const items = getCartItems();

  if (!items[index]) return;

  const newQuantity = getQuantity(items[index]) + change;

  if (newQuantity <= 0) {
    items.splice(index, 1);
  } else {
    items[index].quantity = newQuantity;
  }

  if (saveCart(items)) renderCart();
}

window.changeQty = changeQty;

// ============================================
// 6. REMOVE ITEM
// ============================================

function removeItem(index) {
  const items = getCartItems();

  if (index < 0 || index >= items.length) return;

  items.splice(index, 1);

  if (saveCart(items)) renderCart();
}

window.removeItem = removeItem;

// ============================================
// 7. CLEAR CART
// ============================================

function clearCart() {
  if (!window.confirm("Una uhakika unataka kusafisha kikapu chote?")) {
    return;
  }

  try {
    localStorage.removeItem(CART_KEY);
    renderCart();
    showNotice("Kikapu kimesafishwa.", "success");
  } catch (error) {
    showNotice("Imeshindikana kusafisha kikapu.", "error");
  }
}

window.clearCart = clearCart;

// ============================================
// 8. LOAD CUSTOMER PROFILE
// ============================================

async function loadCustomerProfile(user) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    const nameInput = document.getElementById("custName");
    const phoneInput = document.getElementById("custPhone");

    if (nameInput && !nameInput.value) {
      nameInput.value =
        profile?.full_name || user.user_metadata?.full_name || "";
    }

    if (phoneInput && !phoneInput.value) {
      phoneInput.value =
        profile?.phone_number || user.phone || "";
    }
  } catch (error) {
    console.warn("ZUNE: Wasifu haukuweza kupakiwa.", error);
  }
}

// ============================================
// 9. CHECKOUT
// ============================================

async function handleCheckout(event) {
  event.preventDefault();

  if (checkoutInProgress) return;

  const form = document.getElementById("checkoutForm");

  if (form && !form.reportValidity()) return;

  const button = document.getElementById("placeOrderBtn");
  const items = getCartItems();

  if (items.length === 0) {
    showNotice("Kikapu chako kiko wazi. Ongeza bidhaa kwanza.", "error");
    return;
  }

  const customerName =
    document.getElementById("custName")?.value.trim() || "";

  const customerPhone =
    document.getElementById("custPhone")?.value.trim() || "";

  const customerAddress =
    document.getElementById("custAddress")?.value.trim() || "";

  const paymentMethod =
    document.getElementById("paymentMethod")?.value || "";

  if (!customerName || !customerPhone || !customerAddress) {
    showNotice("Jaza jina, namba ya simu na anwani yako.", "error");
    return;
  }

  checkoutInProgress = true;

  if (button) {
    button.disabled = true;
    button.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Inatuma oda...';
  }

  try {
    // Thibitisha mtumiaji kupitia Supabase Auth.
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error(
        "Tafadhali ingia kwenye akaunti yako kabla ya kutuma oda."
      );
    }

    const user = authData.user;

    // Hakikisha kila bidhaa ina ID halisi ya Supabase.
    const normalizedItems = items.map(item => ({
      productId: getProductId(item),
      quantity: getQuantity(item)
    }));

    if (
      normalizedItems.some(item =>
        !item.productId ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      )
    ) {
      throw new Error(
        "Kuna bidhaa isiyo na kitambulisho sahihi. Ondoa bidhaa hiyo kwenye kikapu kisha iongeze tena kutoka sokoni."
      );
    }

    // Pata bei na stock za sasa kutoka Supabase.
    const productIds = [
      ...new Set(normalizedItems.map(item => item.productId))
    ];

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title, price, stock_quantity, vendor_id")
      .in("id", productIds);

    if (productsError) {
      throw new Error("Imeshindikana kuthibitisha bidhaa: " + productsError.message);
    }

    const productMap = new Map(
      (products || []).map(product => [String(product.id), product])
    );

    const orderRows = [];

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.productId));

      if (!product) {
        throw new Error(
          "Bidhaa moja au zaidi hazipatikani tena sokoni. Sasisha kikapu chako."
        );
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Bei ya bidhaa si sahihi.");
      }

      if (
        product.stock_quantity !== null &&
        product.stock_quantity !== undefined &&
        Number(product.stock_quantity) < item.quantity
      ) {
        throw new Error(
          `Stock haitoshi kwa bidhaa: ${product.title}. Punguza idadi au ondoa bidhaa hiyo.`
        );
      }

      orderRows.push({
        buyer_id: user.id,
        product_id: product.id,
        quantity: item.quantity,
        total_price: Number((price * item.quantity).toFixed(2)),
        commission_fee: 0,
        status: "pending"
      });
    }

    // Ingiza oda kwenye jedwali lililopo.
    // Kila bidhaa ni rekodi tofauti kwa sababu orders.product_id
    // inahifadhi bidhaa moja kwa kila rekodi.
    const { data: createdOrders, error: orderError } = await supabase
      .from("orders")
      .insert(orderRows)
      .select("id, product_id, quantity, total_price, status");

    if (orderError) {
      throw new Error(
        "Supabase haikukubali oda. Hakikisha sera ya INSERT ya orders inaruhusu buyer_id = auth.uid(). Maelezo: " +
        orderError.message
      );
    }

    if (!createdOrders || createdOrders.length !== orderRows.length) {
      throw new Error(
        "Oda haikuthibitishwa kikamilifu. Tafadhali kagua oda zako kabla ya kujaribu tena."
      );
    }

    // Hifadhi taarifa za ziada kwenye kifaa hiki kwa sasa.
    // Hizi si rekodi rasmi za malipo au anwani kwenye Supabase.
    const checkoutReference = {
      orderIds: createdOrders.map(order => order.id),
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      const oldReferences = JSON.parse(
        localStorage.getItem("zune_checkout_details") || "[]"
      );

      const references = Array.isArray(oldReferences)
        ? oldReferences
        : [];

      references.unshift(checkoutReference);

      localStorage.setItem(
        "zune_checkout_details",
        JSON.stringify(references)
      );
    } catch (storageError) {
      console.warn("Taarifa za checkout hazijahifadhiwa kwenye kifaa.");
    }

    // Futa kikapu baada ya kupokelewa na Supabase.
    localStorage.removeItem(CART_KEY);

    renderCart();

    showNotice(
      "Oda yako imepokelewa na Supabase. Namba za oda: " +
      createdOrders.map(order => order.id).join(", "),
      "success"
    );

    window.alert(
      "Hongera " + customerName +
      "! Oda yako imepokelewa. Namba za oda: " +
      createdOrders.map(order => order.id).join(", ")
    );

    window.location.href = "./notification.html";

  } catch (error) {
    console.error("ZUNE checkout error:", error);

    showNotice(
      error.message || "Hitilafu imetokea wakati wa kutuma oda.",
      "error"
    );
  } finally {
    checkoutInProgress = false;

    if (button) {
      button.disabled = getCartItems().length === 0;
      button.innerHTML =
        '<i class="fa-solid fa-check-circle"></i> Thibitisha & Tuma Oda';
    }
  }
}