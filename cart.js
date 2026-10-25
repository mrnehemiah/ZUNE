// ======================================================
// ZUNE CART.JS
// SEHEMU YA 1/4: MIPANGILIO NA KAZI ZA MSINGI
// ======================================================

"use strict";

(() => {
  // ----------------------------------------------------
  // 1. MIPANGILIO
  // ----------------------------------------------------

  const CART_KEY = "zune_cart";

  const CURRENCY = "TZS";

  const SELECTORS = {
    cartContainer: "cart-items-container",
    emptyCart: "empty-cart",
    clearButton: "clearCartButton",
    itemCount: "summary-item-count",
    subtotal: "subtotal",
    deliveryFee: "delivery-fee",
    total: "total",
    status: "cart-status-message",
    toast: "cart-toast",
    checkoutForm: "checkout-form",
    reviewButton: "reviewOrderButton",
    confirmButton: "review-details-button"
  };

  const $ = (id) => document.getElementById(id);

  // ----------------------------------------------------
  // 2. KUSOMA NA KUHIFADHI KIKAPU
  // ----------------------------------------------------

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        console.warn("ZUNE: Muundo wa kikapu si orodha.");
        return [];
      }

      return parsed
        .filter((item) => item && typeof item === "object")
        .map(normalizeItem)
        .filter((item) => item.id !== "" && item.quantity > 0);
    } catch (error) {
      console.error("ZUNE: Imeshindwa kusoma kikapu:", error);
      return [];
    }
  }

  function saveCart(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));

      window.dispatchEvent(
        new CustomEvent("zune:cart-updated", {
          detail: { count: getItemCount(items) }
        })
      );

      return true;
    } catch (error) {
      console.error("ZUNE: Imeshindwa kuhifadhi kikapu:", error);
      showToast("Imeshindikana kuhifadhi mabadiliko ya kikapu.");
      return false;
    }
  }

  // ----------------------------------------------------
  // 3. KUSAWAZISHA MUUNDO WA BIDHAA
  // Inasaidia majina kadhaa ya kawaida ya properties.
  // ----------------------------------------------------

  function normalizeItem(item) {
    const rawId =
      item.id ??
      item.product_id ??
      item.productId ??
      item.uuid ??
      "";

    const rawName =
      item.title ??
      item.name ??
      item.product_name ??
      item.productName ??
      "Bidhaa ya ZUNE";

    const rawPrice =
      item.price ??
      item.unit_price ??
      item.unitPrice ??
      0;

    const rawQuantity =
      item.quantity ??
      item.qty ??
      item.count ??
      1;

    const rawImage =
      item.image_url ??
      item.imageUrl ??
      item.image ??
      item.photo ??
      "";

    const price = Number(rawPrice);
    const quantity = Math.floor(Number(rawQuantity));

    return {
      ...item,
      id: String(rawId),
      title: String(rawName),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      quantity:
        Number.isFinite(quantity) && quantity > 0
          ? quantity
          : 1,
      image_url: typeof rawImage === "string" ? rawImage : ""
    };
  }

  // ----------------------------------------------------
  // 4. HESABU ZA KIKAPU
  // ----------------------------------------------------

  function getItemCount(items = readCart()) {
    return items.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);
  }

  function getSubtotal(items = readCart()) {
    return items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  }

  function formatMoney(amount) {
    const safeAmount = Number.isFinite(Number(amount))
      ? Number(amount)
      : 0;

    return new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 0
    }).format(safeAmount);
  }

  // ----------------------------------------------------
  // 5. UJUMBE KWA MTUMIAJI
  // ----------------------------------------------------

  let toastTimer = null;

  function showToast(message) {
    const toast = $(SELECTORS.toast);

    if (!toast) {
      console.info("ZUNE:", message);
      return;
    }

    toast.textContent = String(message);
    toast.classList.remove("hidden");

    if (toastTimer !== null) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }

  function setStatus(message) {
    const status = $(SELECTORS.status);

    if (status) {
      status.textContent = String(message || "");
    }
  }

  // Kazi hizi zitatumiwa na sehemu zinazofuata.  // ====================================================
  // SEHEMU YA 2/4: KUCHORA BIDHAA KWENYE KIKAPU
  // ====================================================

  // ----------------------------------------------------
  // 1. KUKAGUA URL YA PICHA
  // ----------------------------------------------------

  function isSafeImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
      return false;
    }

    try {
      const url = new URL(value, window.location.href);

      return (
        url.protocol === "https:" ||
        url.protocol === "http:"
      );
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------
  // 2. KUTENGENEZA KIPENGELE CHA HTML KWA USALAMA
  // ----------------------------------------------------

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    return element;
  }

  function createProductImage(item) {
    const wrapper = createElement(
      "div",
      "cart-item-image"
    );

    if (isSafeImageUrl(item.image_url)) {
      const image = document.createElement("img");

      image.src = item.image_url;
      image.alt = item.title;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";

      image.addEventListener("error", () => {
        wrapper.replaceChildren(
          createElement("span", "", "🛍️")
        );
      }, { once: true });

      wrapper.appendChild(image);
    } else {
      wrapper.appendChild(
        createElement("span", "", "🛍️")
      );
    }

    return wrapper;
  }

  // ----------------------------------------------------
  // 3. KUTENGENEZA KADI YA BIDHAA
  // ----------------------------------------------------

  function createCartItem(item) {
    const article = createElement("article", "cart-item");

    article.dataset.productId = item.id;

    const image = createProductImage(item);

    const info = createElement("div", "cart-item-info");

    const title = createElement(
      "h3",
      "cart-item-title",
      item.title
    );

    const price = createElement(
      "div",
      "cart-item-price",
      formatMoney(item.price)
    );

    const lineTotal = createElement(
      "div",
      "muted small-text",
      "Jumla: " + formatMoney(item.price * item.quantity)
    );

    lineTotal.classList.add("cart-line-total");

    const bottom = createElement(
      "div",
      "cart-item-bottom"
    );

    // Vidhibiti vya idadi
    const quantityControl = createElement(
      "div",
      "quantity-control"
    );

    const decreaseButton = createElement(
      "button",
      "",
      "−"
    );

    decreaseButton.type = "button";
    decreaseButton.dataset.action = "decrease";
    decreaseButton.dataset.productId = item.id;
    decreaseButton.setAttribute(
      "aria-label",
      "Punguza idadi ya " + item.title
    );

    const quantityValue = createElement(
      "span",
      "quantity-value",
      item.quantity
    );

    quantityValue.setAttribute("aria-live", "polite");

    const increaseButton = createElement(
      "button",
      "",
      "+"
    );

    increaseButton.type = "button";
    increaseButton.dataset.action = "increase";
    increaseButton.dataset.productId = item.id;
    increaseButton.setAttribute(
      "aria-label",
      "Ongeza idadi ya " + item.title
    );

    quantityControl.append(
      decreaseButton,
      quantityValue,
      increaseButton
    );

    // Kitufe cha kuondoa bidhaa moja
    const removeButton = createElement(
      "button",
      "remove-item",
      "Ondoa bidhaa"
    );

    removeButton.type = "button";
    removeButton.dataset.action = "remove";
    removeButton.dataset.productId = item.id;

    bottom.append(quantityControl, removeButton);

    info.append(title, price, lineTotal, bottom);
    article.append(image, info);

    return article;
  }

  // ----------------------------------------------------
  // 4. KUONYESHA KIKAPU
  // ----------------------------------------------------

  function renderCart() {
    const container = $(SELECTORS.cartContainer);

    if (!container) {
      console.warn(
        "ZUNE: Haijapatikana #cart-items-container kwenye cart.html."
      );
      return;
    }

    const items = readCart();

    container.replaceChildren();

    if (items.length === 0) {
      const empty = createElement("div", "empty-cart");

      const icon = createElement(
        "div",
        "empty-cart-icon",
        "🛍️"
      );

      const heading = createElement(
        "h3",
        "",
        "Kikapu chako hakina bidhaa"
      );

      const paragraph = createElement(
        "p",
        "",
        "Chagua bidhaa unazopenda kutoka ZUNE."
      );

      const link = createElement(
        "a",
        "primary-button",
        "Endelea kununua"
      );

      link.href = "index.html";

      empty.append(icon, heading, paragraph, link);
      container.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();

      items.forEach((item) => {
        fragment.appendChild(createCartItem(item));
      });

      container.appendChild(fragment);
    }

    updateSummary(items);
    updateCartBadge(items);
  }

  // ----------------------------------------------------
  // 5. KUBADILISHA IDADI YA BIDHAA
  // ----------------------------------------------------

  function changeQuantity(productId, difference) {
    const items = readCart();

    const index = items.findIndex(
      (item) => item.id === String(productId)
    );

    if (index === -1) {
      showToast("Bidhaa haijapatikana kwenye kikapu.");
      return;
    }

    const nextQuantity =
      items[index].quantity + Number(difference);

    if (nextQuantity <= 0) {
      removeItem(productId);
      return;
    }

    // Kikomo cha kuzuia idadi isiyo na maana
    if (nextQuantity > 99) {
      showToast("Idadi ya juu kwa bidhaa hii ni 99.");
      return;
    }

    items[index].quantity = nextQuantity;

    if (saveCart(items)) {
      renderCart();
      showToast("Idadi ya bidhaa imesasishwa.");
    }
  }

  // ----------------------------------------------------
  // 6. KUONDOA BIDHAA MOJA
  // ----------------------------------------------------

  function removeItem(productId) {
    const items = readCart();

    const updatedItems = items.filter(
      (item) => item.id !== String(productId)
    );

    if (updatedItems.length === items.length) {
      showToast("Bidhaa haijapatikana kwenye kikapu.");
      return;
    }

    if (saveCart(updatedItems)) {
      renderCart();
      showToast("Bidhaa imeondolewa kwenye kikapu.");
    }
  }

  // ----------------------------------------------------
  // 7. KUONDOA BIDHAA ZOTE
  // ----------------------------------------------------

  function clearCart() {
    if (saveCart([])) {
      renderCart();
      showToast("Kikapu kimeondolewa bidhaa zote.");
    }
  }

  // Kitufe cha HTML kinaweza kutumia kazi hii.
  window.clearCart = clearCart;

  // ----------------------------------------------------
  // 8. KUSASISHA BEJI YA KIKAPU
  // ----------------------------------------------------

  function updateCartBadge(items = readCart()) {
    const count = getItemCount(items);

    // Inaunga mkono beji hizi ikiwa zipo kwenye ukurasa.
    const badgeSelectors = [
      "[data-zune-cart-count]",
      "#cart-count",
      "#cartBadge"
    ];

    badgeSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((badge) => {
        badge.textContent = String(count);
        badge.setAttribute("aria-label", count + " bidhaa kwenye kikapu");
        badge.classList.toggle("hidden", count === 0);
      });
    });
  }  // ====================================================
  // SEHEMU YA 3/4: MUHTASARI NA TAARIFA ZA ODA
  // ====================================================

  // ----------------------------------------------------
  // 1. KUSASISHA MUHTASARI WA KIKAPU
  // ----------------------------------------------------

  function updateSummary(items = readCart()) {
    const count = getItemCount(items);
    const subtotal = getSubtotal(items);

    const countElement = $(SELECTORS.itemCount);
    const subtotalElement = $(SELECTORS.subtotal);
    const deliveryElement = $(SELECTORS.deliveryFee);
    const totalElement = $(SELECTORS.total);

    if (countElement) {
      countElement.textContent = String(count);
    }

    if (subtotalElement) {
      subtotalElement.textContent = formatMoney(subtotal);
    }

    /*
     * Gharama ya usafirishaji haikadiriwi hapa.
     * Itawekwa tu ikiwa mfumo wa uwasilishaji utatoa gharama halisi.
     */
    if (deliveryElement) {
      deliveryElement.textContent = "Haujahesabiwa";
    }

    if (totalElement) {
      totalElement.textContent =
        count > 0 ? "Inasubiri gharama ya uwasilishaji" : formatMoney(0);
    }

    const deliveryStatus = $("delivery-cost-status");

    if (deliveryStatus) {
      deliveryStatus.textContent =
        " Inasubiri gharama halisi kutoka mfumo wa uwasilishaji.";
    }

    const confirmCount = $("confirm-item-count");

    if (confirmCount) {
      confirmCount.textContent =
        count + (count === 1 ? " bidhaa" : " bidhaa");
    }

    setStatus(
      count > 0
        ? "Kikapu kina bidhaa " + count + "."
        : "Kikapu hakina bidhaa kwa sasa."
    );
  }

  // ----------------------------------------------------
  // 2. KUSASISHA TAARIFA ZA MPOKEAJI
  // ----------------------------------------------------

  function getValue(id) {
    const element = $(id);
    return element ? element.value.trim() : "";
  }

  function getSelectedPayment() {
    const selected = document.querySelector(
      'input[name="payment_method"]:checked'
    );

    return selected ? selected.value : "";
  }

  function updateCheckoutPreview() {
    const name = getValue("checkout-name");
    const phone = getValue("checkout-phone");
    const region = getValue("checkout-region");
    const district = getValue("checkout-district");
    const address = getValue("checkout-address");

    const recipientElement = $("confirm-recipient");
    const paymentElement = $("confirm-payment");
    const deliveryElement = $("confirm-delivery");

    if (recipientElement) {
      recipientElement.textContent = name || "Hajawekwa";
    }

    const paymentLabels = {
      mobile_money: "Mobile Money",
      zune_wallet: "ZUNE Wallet",
      cash_on_delivery: "Lipa unapopokea"
    };

    if (paymentElement) {
      paymentElement.textContent =
        paymentLabels[getSelectedPayment()] || "Haijachaguliwa";
    }

    const deliveryMethod = getValue("delivery-method");

    if (deliveryElement) {
      deliveryElement.textContent =
        deliveryMethod === "delivery"
          ? "Kufikishiwa kwenye anwani"
          : deliveryMethod === "pickup"
            ? "Kuchukulia mwenyewe"
            : "Haijachaguliwa";
    }

    return {
      name,
      phone,
      email: getValue("checkout-email"),
      region,
      district,
      address,
      instructions: getValue("delivery-instructions"),
      deliveryMethod,
      deliveryTime: getValue("delivery-time"),
      paymentMethod: getSelectedPayment()
    };
  }

  // ----------------------------------------------------
  // 3. KUTHIBITISHA TAARIFA ZA MSINGI
  // ----------------------------------------------------

  function validateCheckout() {
    const form = $(SELECTORS.checkoutForm);

    if (!form) {
      showToast("Fomu ya checkout haijapatikana.");
      return false;
    }

    if (!form.reportValidity()) {
      return false;
    }

    const items = readCart();

    if (items.length === 0) {
      showToast("Ongeza bidhaa kwenye kikapu kwanza.");
      $("cart-products")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      return false;
    }

    const details = updateCheckoutPreview();

    if (!details.paymentMethod) {
      showToast("Chagua njia ya malipo kwanza.");
      $("payment-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      return false;
    }

    if (!details.name || !details.phone ||
        !details.region || !details.district || !details.address) {
      showToast("Jaza taarifa zote zinazohitajika.");
      return false;
    }

    return true;
  }

  // ----------------------------------------------------
  // 4. KUKAGUA ODA KABLA YA KUTUMA
  // ----------------------------------------------------

  function reviewOrder() {
    updateCheckoutPreview();

    if (!validateCheckout()) {
      return;
    }

    const warning = $("checkout-warning");

    if (warning) {
      warning.textContent =
        "Taarifa zako zimekaguliwa kwenye kifaa hiki. " +
        "Oda bado haijatumwa wala kuthibitishwa na Supabase.";
      warning.classList.add("warning");
    }

    $("confirm-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    showToast(
      "Ukaguzi umekamilika. Oda bado haijatumwa."
    );
  }

  // ----------------------------------------------------
  // 5. VIFUNGO VYA UKAGUZI
  // ----------------------------------------------------

  const reviewButton = $(SELECTORS.reviewButton);
  const confirmButton = $(SELECTORS.confirmButton);

  if (reviewButton) {
    reviewButton.addEventListener("click", reviewOrder);
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", reviewOrder);
  }

  // ----------------------------------------------------
  // 6. KUSASISHA MUHTASARI KILA TAARIFA INAPOBADILIKA
  // ----------------------------------------------------

  [
    "checkout-name",
    "checkout-phone",
    "checkout-email",
    "checkout-region",
    "checkout-district",
    "checkout-address",
    "delivery-instructions",
    "delivery-method",
    "delivery-time"
  ].forEach((id) => {
    const element = $(id);

    if (element) {
      element.addEventListener("input", updateCheckoutPreview);
      element.addEventListener("change", updateCheckoutPreview);
    }
  });

  document.querySelectorAll(
    'input[name="payment_method"]'
  ).forEach((radio) => {
    radio.addEventListener("change", updateCheckoutPreview);
  });

  // Fomu haitumiwi hadi muunganisho wa backend uwe tayari.
  const checkoutForm = $(SELECTORS.checkoutForm);

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      reviewOrder();
    });
  }  // ====================================================
  // SEHEMU YA 4/4: MATUKIO NA KUANZISHA CART
  // ====================================================

  // ----------------------------------------------------
  // 1. VIFUNGO VYA BIDHAA
  // ----------------------------------------------------

  const cartContainer = $(SELECTORS.cartContainer);

  if (cartContainer) {
    cartContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");

      if (!button || !cartContainer.contains(button)) {
        return;
      }

      const productId = button.dataset.productId;
      const action = button.dataset.action;

      if (!productId) {
        showToast("Kitambulisho cha bidhaa hakijapatikana.");
        return;
      }

      if (action === "increase") {
        changeQuantity(productId, 1);
      } else if (action === "decrease") {
        changeQuantity(productId, -1);
      } else if (action === "remove") {
        const confirmed = window.confirm(
          "Una uhakika unataka kuondoa bidhaa hii?"
        );

        if (confirmed) {
          removeItem(productId);
        }
      }
    });
  }

  // ----------------------------------------------------
  // 2. KITufe CHA KUONDOA BIDHAA ZOTE
  // ----------------------------------------------------

  const clearButton = $(SELECTORS.clearButton);

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const items = readCart();

      if (items.length === 0) {
        showToast("Kikapu tayari hakina bidhaa.");
        return;
      }

      const confirmed = window.confirm(
        "Una uhakika unataka kuondoa bidhaa zote kwenye kikapu?"
      );

      if (confirmed) {
        clearCart();
      }
    });
  }

  // ----------------------------------------------------
  // 3. KUSIKILIZA MABADILIKO YA KIKAPU
  // ----------------------------------------------------

  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY) {
      renderCart();
      updateCheckoutPreview();
    }
  });

  window.addEventListener("zune:cart-updated", () => {
    renderCart();
    updateCheckoutPreview();
  });

  // ----------------------------------------------------
  // 4. KAZI ZA HIARI KWA KURASA NYINGINE
  // ----------------------------------------------------

  /*
   * Tumia window.ZuneCart.getItems() kupata nakala ya kikapu.
   * Tumia window.ZuneCart.refresh() kusasisha ukurasa.
   * Usibadilishe bei au salio kupitia browser console.
   */

  window.ZuneCart = Object.freeze({
    getItems: () => readCart().map((item) => ({ ...item })),
    getItemCount: () => getItemCount(),
    getSubtotal: () => getSubtotal(),
    refresh: () => renderCart(),
    formatMoney
  });

  // ----------------------------------------------------
  // 5. KUANZISHA UKURASA
  // ----------------------------------------------------

  function initCartPage() {
    renderCart();
    updateCheckoutPreview();
    updateSummary();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initCartPage,
      { once: true }
    );
  } else {
    initCartPage();
  }

  console.info("ZUNE Cart: imeanzishwa.");

})();