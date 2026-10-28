
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const ZUNE_SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const ZUNE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

const zuneSupabase = createClient(
  ZUNE_SUPABASE_URL,
  ZUNE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/* Ruhusu sehemu nyingine za ZUNE kutumia client hii. */
window.zuneSupabase = zuneSupabase;

window.zuneProducts = window.zuneProducts || [];

let zuneCurrentUser = null;
let zuneCurrentSession = null;
let zuneProductsLoading = false;
let zuneProductsLoaded = false;

const zuneMoneyFormatter = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2
});
function zuneById(id) {
  return document.getElementById(id);
}

function zuneQueryAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function zuneShowMessage(message, type = "info") {
  if (typeof window.zuneShowToast === "function") {
    window.zuneShowToast(message, type);
    return;
  }

  console[type === "error" ? "error" : "log"](
    "[ZUNE]",
    message
  );
}

function zuneText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function zuneEscapeHTML(value) {
  return zuneText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function zuneFormatPrice(value) {
  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    return "Bei haijawekwa";
  }

  return "TSh " + zuneMoneyFormatter.format(price);
}

function zuneSafeImageURL(value) {
  const url = zuneText(value).trim();

  if (!url) return "";

  try {
    const parsed = new URL(url, window.location.href);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.href;
    }
  } catch (error) {
    // URL si halali.
  }

  return "";
}
function zuneGetStorageKey(type, userId = null) {
  const validTypes = ["cart", "wishlist"];

  if (!validTypes.includes(type)) {
    throw new Error("Aina ya hifadhi ya ZUNE haijulikani.");
  }

  if (!userId) {
    return null;
  }

  return `zune_${type}_${userId}`;
}

function zuneReadJSON(key, fallback = []) {
  if (!key) return fallback;

  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      "[ZUNE] Imeshindikana kusoma hifadhi:",
      key
    );

    return fallback;
  }
}

function zuneWriteJSON(key, value) {
  if (!key) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("[ZUNE] Imeshindikana kuhifadhi data.", error);

    zuneShowMessage(
      "Hifadhi ya kifaa imejaa au haipatikani.",
      "error"
    );

    return false;
  }
}
function zuneGetCart() {
  const userId = zuneCurrentUser?.id;

  if (!userId) return [];

  const key = zuneGetStorageKey("cart", userId);
  const cart = zuneReadJSON(key, []);

  return Array.isArray(cart) ? cart : [];
}

function zuneSaveCart(cart) {
  const userId = zuneCurrentUser?.id;

  if (!userId) {
    zuneShowMessage(
      "Ingia kwenye akaunti yako ili kuhifadhi kapuni.",
      "info"
    );
    return false;
  }

  if (!Array.isArray(cart)) return false;

  const key = zuneGetStorageKey("cart", userId);

  if (!zuneWriteJSON(key, cart)) return false;

  /*
    Compatibility kwa index.html na cart.html za sasa.
    Hifadhi hii ya jumla inawakilisha akaunti iliyoingia
    kwa wakati huu tu.
  */
  zuneWriteJSON("zune_cart", cart);

  window.dispatchEvent(new Event("zune:cart-updated"));

  return true;
}

function zuneGetWishlist() {
  const userId = zuneCurrentUser?.id;

  if (!userId) return [];

  const key = zuneGetStorageKey("wishlist", userId);
  const wishlist = zuneReadJSON(key, []);

  if (Array.isArray(wishlist)) {
    return wishlist.map(String);
  }

  return [];
}

function zuneSaveWishlist(wishlist) {
  const userId = zuneCurrentUser?.id;

  if (!userId) {
    zuneShowMessage(
      "Ingia kwenye akaunti yako ili kuhifadhi vipendwa.",
      "info"
    );
    return false;
  }

  if (!Array.isArray(wishlist)) return false;

  const key = zuneGetStorageKey("wishlist", userId);

  if (!zuneWriteJSON(key, wishlist)) return false;

  zuneWriteJSON("zune_wishlist", wishlist);

  window.dispatchEvent(
    new CustomEvent("zune:wishlist-updated")
  );

  return true;
}
async function zuneGetAuthenticatedUser() {
  const { data, error } = await zuneSupabase.auth.getUser();

  if (error) {
    console.warn(
      "[ZUNE] Imeshindikana kuthibitisha akaunti:",
      error.message
    );

    zuneCurrentUser = null;
    return null;
  }

  zuneCurrentUser = data?.user ?? null;

  return zuneCurrentUser;
}

async function zuneGetCurrentSession() {
  const { data, error } = await zuneSupabase.auth.getSession();

  if (error) {
    console.warn(
      "[ZUNE] Imeshindikana kusoma session:",
      error.message
    );

    zuneCurrentSession = null;
    return null;
  }

  zuneCurrentSession = data?.session ?? null;
  zuneCurrentUser = zuneCurrentSession?.user ?? null;

  return zuneCurrentSession;
}
function zuneUpdateCartCount() {
  const cart = zuneGetCart();

  const total = cart.reduce((sum, item) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? 1);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }

    return sum + quantity;
  }, 0);

  const countElement = zuneById("bottomCartCount");

  if (countElement) {
    countElement.textContent = String(total);
    countElement.hidden = total === 0;
  }

  return total;
}

function zuneGetProductId(product) {
  return String(product?.id ?? "");
}

function zuneGetProductName(product) {
  return zuneText(
    product?.title,
    "Bidhaa ya ZUNE"
  );
}

function zuneGetProductCategory(product) {
  return zuneText(
    product?.category ??
    product?.category_name ??
    product?.category_id ??
    "Bidhaa nyingine"
  );
}

function zuneGetProductDescription(product) {
  return zuneText(
    product?.description,
    "Hakuna maelezo ya bidhaa yaliyowekwa."
  );
}

function zuneGetProductImage(product) {
  return zuneSafeImageURL(
    product?.image_url ??
    product?.image ??
    ""
  );
}

function zuneGetProductStock(product) {
  const stock = Number(product?.stock_quantity);

  return Number.isFinite(stock) ? stock : null;
}

function zuneRenderProductCard(product) {
  const id = zuneEscapeHTML(zuneGetProductId(product));
  const title = zuneEscapeHTML(zuneGetProductName(product));
  const category = zuneEscapeHTML(
    zuneGetProductCategory(product)
  );
  const price = zuneEscapeHTML(
    zuneFormatPrice(product?.price)
  );
  const imageURL = zuneGetProductImage(product);
  const description = zuneEscapeHTML(
    zuneGetProductDescription(product)
  );

  const imageHTML = imageURL
    ? `
      <img
        src="${zuneEscapeHTML(imageURL)}"
        alt="${title}"
        loading="lazy"
        class="product-image"
        onerror="this.style.display='none';this.nextElementSibling.hidden=false"
      >
      <div class="product-image-placeholder" hidden>
        <i class="fa-solid fa-image"></i>
        <span>Picha haipatikani</span>
      </div>
    `
    : `
      <div class="product-image-placeholder">
        <i class="fa-solid fa-image"></i>
        <span>Hakuna picha</span>
      </div>
    `;

  const favourite = zuneGetWishlist().includes(id);

  return `
    <article
      class="product-card"
      data-product-id="${id}"
      data-category="${category}"
    >
      <div class="product-card-image-wrap">

        ${imageHTML}

        <button
          type="button"
          class="product-favourite-button"
          data-favourite-id="${id}"
          aria-label="Ongeza ${title} kwenye vipendwa"
          aria-pressed="${favourite}"
        >
          <i class="${favourite
            ? "fa-solid fa-heart"
            : "fa-regular fa-heart"}"></i>
        </button>

      </div>

      <button
        type="button"
        class="product-card-details"
        data-product-preview
        aria-label="Angalia maelezo ya ${title}"
      >
        <span class="product-card-category">
          ${category}
        </span>

        <span class="product-card-title">
          ${title}
        </span>

        <span class="product-card-price">
          ${price}
        </span>
      </button>

      <div class="product-card-actions">
        <button
          type="button"
          class="product-add-button"
          data-add-to-cart
        >
          <i class="fa-solid fa-cart-plus"></i>
          Ongeza kapuni
        </button>
      </div>

      <span class="sr-only">
        ${description}
      </span>
    </article>
  `;
}
function zuneShowProductsLoading() {
  const grid = zuneById("homeProductsGrid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-8 text-center">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-green-700"></i>
      <p class="mt-3 text-sm text-gray-500">
        Inapakia bidhaa za ZUNE...
      </p>
    </div>
  `;
}

function zuneShowProductsError(message) {
  const grid = zuneById("homeProductsGrid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-8 text-center">
      <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-600"></i>

      <p class="mt-3 text-sm font-semibold text-gray-700">
        ${zuneEscapeHTML(message)}
      </p>

      <button
        type="button"
        id="zuneRetryProducts"
        class="mt-4 rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white"
      >
        Jaribu tena
      </button>
    </div>
  `;

  zuneById("zuneRetryProducts")?.addEventListener(
    "click",
    () => zuneLoadProducts(true)
  );
}

function zuneShowProductsEmpty() {
  const grid = zuneById("homeProductsGrid");
  const empty = zuneById("homeProductsEmpty");

  if (grid) {
    grid.innerHTML = "";
  }

  if (empty) {
    empty.hidden = false;
  }
}

function zuneRenderProducts(products) {
  const grid = zuneById("homeProductsGrid");
  const empty = zuneById("homeProductsEmpty");

  if (!grid) {
    console.warn(
      "[ZUNE] homeProductsGrid haipo kwenye ukurasa huu."
    );
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    zuneShowProductsEmpty();
    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  grid.innerHTML = products
    .map((product) => zuneRenderProductCard(product))
    .join("");

  /*
    Hifadhi data halisi inayotumiwa na vitufe vya
    preview, vipendwa na kapuni.
  */
  window.zuneProducts = products;

  window.dispatchEvent(
    new CustomEvent("zune:products-loaded", {
      detail: { count: products.length }
    })
  );
}

function zuneRenderDailyDeals(products) {
  const grid = zuneById("dailyDealsGrid");

  if (!grid) return;

  /*
    Kwa sasa tunatumia bidhaa chache za kwanza.
    Hakuna punguzo la kubuniwa au bei kubadilishwa.
  */
  const deals = products.slice(0, 4);

  if (deals.length === 0) {
    grid.innerHTML = `
      <p class="col-span-full py-5 text-center text-sm text-gray-500">
        Hakuna ofa zilizowekwa bado.
      </p>
    `;
    return;
  }

  grid.innerHTML = deals
    .map((product) => zuneRenderProductCard(product))
    .join("");
}

async function zuneLoadProducts(forceReload = false) {
  if (zuneProductsLoading) return;

  if (zuneProductsLoaded && !forceReload) {
    return;
  }

  zuneProductsLoading = true;

  zuneShowProductsLoading();

  try {
    const { data, error } = await zuneSupabase
      .from("products")
      .select(
        "id, vendor_id, title, description, price, stock_quantity, image_url, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      throw error;
    }

    const products = Array.isArray(data) ? data : [];

    /*
      Onyesha bidhaa zilizorudishwa na Supabase.
      Sera za RLS za database ndizo huamua bidhaa
      ambazo mtumiaji anaruhusiwa kuona.
    */
    window.zuneProducts = products;

    zuneRenderProducts(products);
    zuneRenderDailyDeals(products);

    zuneProductsLoaded = true;

    console.info(
      `[ZUNE] Bidhaa ${products.length} zimepakiwa.`
    );

  } catch (error) {
    console.error(
      "[ZUNE] Hitilafu ya kupakia bidhaa:",
      error
    );

    zuneShowProductsError(
      "Imeshindikana kupakia bidhaa. Kagua intaneti au ruhusa za Supabase."
    );

  } finally {
    zuneProductsLoading = false;
  }
}

function zuneNormalizeCategory(value) {
  return zuneText(value)
    .trim()
    .toLocaleLowerCase();
}

function zuneFilterProductsByCategory(category) {
  const grid = zuneById("homeProductsGrid");

  if (!grid) return;

  const requested = zuneNormalizeCategory(category);
  const cards = zuneQueryAll(".product-card", grid);

  let visible = 0;

  cards.forEach((card) => {
    const cardCategory = zuneNormalizeCategory(
      card.dataset.category
    );

    const matches =
      !requested ||
      requested === "all" ||
      cardCategory === requested;

    card.hidden = !matches;

    if (matches) visible++;
  });

  const empty = zuneById("homeProductsEmpty");

  if (empty && cards.length > 0) {
    empty.hidden = visible > 0;
  }
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => zuneLoadProducts(),
    { once: true }
  );
} else {
  zuneLoadProducts();
}
function zuneGetCartItemId(item) {
  return String(item?.product_id ?? item?.id ?? "");
}

function zuneGetCartQuantity(item) {
  const quantity = Number(item?.quantity ?? item?.qty ?? 1);

  return Number.isFinite(quantity) && quantity > 0
    ? Math.floor(quantity)
    : 1;
}

function zuneGetCartTotalQuantity() {
  return zuneGetCart().reduce(
    (total, item) => total + zuneGetCartQuantity(item),
    0
  );
}

function zuneGetCartTotalPrice() {
  return zuneGetCart().reduce((total, item) => {
    const price = Number(item?.price ?? 0);

    if (!Number.isFinite(price) || price < 0) {
      return total;
    }

    return total + price * zuneGetCartQuantity(item);
  }, 0);
}
function zuneAddToCart(product, quantity = 1) {
  if (!zuneCurrentUser) {
    zuneShowMessage(
      "Ingia kwenye akaunti yako kabla ya kuhifadhi kapuni.",
      "info"
    );

    window.location.href = "./login.html";
    return false;
  }

  if (!product || !product.id) {
    zuneShowMessage(
      "Bidhaa haijatambulika. Jaribu tena.",
      "error"
    );

    return false;
  }

  const amount = Math.floor(Number(quantity));

  if (!Number.isFinite(amount) || amount < 1) {
    zuneShowMessage(
      "Tafadhali chagua idadi sahihi.",
      "error"
    );

    return false;
  }

  const stock = Number(product.stock_quantity);

  if (Number.isFinite(stock) && stock < amount) {
    zuneShowMessage(
      "Idadi uliyochagua haipatikani kwa sasa.",
      "error"
    );

    return false;
  }

  const cart = zuneGetCart();
  const id = String(product.id);

  const existing = cart.find(
    (item) => zuneGetCartItemId(item) === id
  );

  if (existing) {
    const nextQuantity = zuneGetCartQuantity(existing) + amount;

    if (Number.isFinite(stock) && nextQuantity > stock) {
      zuneShowMessage(
        "Idadi ya kapuni imezidi stock iliyopo.",
        "error"
      );

      return false;
    }

    existing.quantity = nextQuantity;
  } else {
    cart.push({
      id: product.id,
      product_id: product.id,
      title: zuneGetProductName(product),
      price: Number(product.price) || 0,
      image_url: product.image_url || "",
      quantity: amount
    });
  }

  if (!zuneSaveCart(cart)) {
    return false;
  }

  zuneUpdateCartCount();

  zuneShowMessage(
    "Bidhaa imeongezwa kwenye kapuni.",
    "success"
  );

  return true;
}

function zuneRemoveFromCart(productId) {
  if (!zuneCurrentUser) return false;

  const id = String(productId);

  const cart = zuneGetCart().filter(
    (item) => zuneGetCartItemId(item) !== id
  );

  if (!zuneSaveCart(cart)) return false;

  zuneUpdateCartCount();

  return true;
}

function zuneUpdateCartQuantity(productId, quantity) {
  if (!zuneCurrentUser) return false;

  const id = String(productId);
  const nextQuantity = Math.floor(Number(quantity));

  if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
    return zuneRemoveFromCart(id);
  }

  const cart = zuneGetCart();
  const item = cart.find(
    (entry) => zuneGetCartItemId(entry) === id
  );

  if (!item) return false;

  const product = window.zuneProducts.find(
    (entry) => String(entry.id) === id
  );

  if (product) {
    const stock = Number(product.stock_quantity);

    if (Number.isFinite(stock) && nextQuantity > stock) {
      zuneShowMessage(
        "Idadi hiyo haipatikani kwenye stock.",
        "error"
      );

      return false;
    }
  }

  item.quantity = nextQuantity;

  if (!zuneSaveCart(cart)) return false;

  zuneUpdateCartCount();

  return true;
}

function zuneIsFavourite(productId) {
  return zuneGetWishlist().includes(String(productId));
}

function zuneToggleWishlist(productId) {
  if (!zuneCurrentUser) {
    zuneShowMessage(
      "Ingia kwenye akaunti yako ili kuhifadhi vipendwa.",
      "info"
    );

    window.location.href = "./login.html";
    return false;
  }

  const id = String(productId);
  const wishlist = zuneGetWishlist();

  const updated = wishlist.includes(id)
    ? wishlist.filter((itemId) => itemId !== id)
    : [...wishlist, id];

  if (!zuneSaveWishlist(updated)) {
    return false;
  }

  zuneShowMessage(
    updated.includes(id)
      ? "Bidhaa imeongezwa kwenye vipendwa."
      : "Bidhaa imeondolewa kwenye vipendwa.",
    "success"
  );

  return true;
}

function zuneUpdateHeaderAccount() {
  const profileImage = zuneById("headerProfileImage");

  if (!profileImage) return;

  if (zuneCurrentUser) {
    profileImage.title = "Akaunti yangu";
    profileImage.setAttribute(
      "aria-label",
      "Fungua akaunti yangu"
    );
  } else {
    profileImage.title = "Ingia au fungua akaunti";
    profileImage.setAttribute(
      "aria-label",
      "Ingia au fungua akaunti"
    );
  }
}

async function zuneLoadCurrentProfile() {
  if (!zuneCurrentUser) return null;

  const { data, error } = await zuneSupabase
    .from("profiles")
    .select("id, full_name, role, is_verified")
    .eq("id", zuneCurrentUser.id)
    .maybeSingle();

  if (error) {
    console.warn(
      "[ZUNE] Taarifa za profile hazikupatikana:",
      error.message
    );

    return null;
  }

  return data;
}
async function zuneInitializeAuth() {
  await zuneGetCurrentSession();

  if (!zuneCurrentSession) {
    zuneCurrentUser = null;
    zuneUpdateHeaderAccount();
    zuneUpdateCartCount();

    return;
  }

  zuneCurrentUser = zuneCurrentSession.user;

  /*
    Pakia data za akaunti husika. Hatuingizi taarifa
    za mtumiaji mmoja kwenye akaunti ya mwingine.
  */
  const userId = zuneCurrentUser.id;

  const privateCart = zuneReadJSON(
    zuneGetStorageKey("cart", userId),
    null
  );

  const privateWishlist = zuneReadJSON(
    zuneGetStorageKey("wishlist", userId),
    null
  );

  /*
    Hamisha data za zamani za kifaa kwenda kwenye
    akaunti ikiwa akaunti hiyo bado haina data yake.
  */
  if (privateCart === null) {
    const oldCart = zuneReadJSON("zune_cart", []);

    if (Array.isArray(oldCart) && oldCart.length > 0) {
      zuneWriteJSON(
        zuneGetStorageKey("cart", userId),
        oldCart
      );
    }
  }

  if (privateWishlist === null) {
    const oldWishlist = zuneReadJSON(
      "zune_wishlist",
      []
    );

    if (
      Array.isArray(oldWishlist) &&
      oldWishlist.length > 0
    ) {
      zuneWriteJSON(
        zuneGetStorageKey("wishlist", userId),
        oldWishlist
      );
    }
  }

  zuneWriteJSON(
    "zune_cart",
    zuneGetCart()
  );

  zuneWriteJSON(
    "zune_wishlist",
    zuneGetWishlist()
  );

  zuneUpdateHeaderAccount();
  zuneUpdateCartCount();
}
zuneSupabase.auth.onAuthStateChange(
  (event, session) => {
    zuneCurrentSession = session ?? null;
    zuneCurrentUser = session?.user ?? null;

    zuneUpdateHeaderAccount();

    /*
      Usifanye maombi mengine ya Supabase ndani ya
      callback hii moja kwa moja; initialization
      itafanyika baada ya callback kumaliza.
    */
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      setTimeout(() => {
        zuneInitializeAuth().catch((error) => {
          console.error(
            "[ZUNE] Auth initialization error:",
            error
          );
        });
      }, 0);
    }

    if (event === "SIGNED_OUT") {
      zuneCurrentUser = null;
      zuneCurrentSession = null;

      zuneUpdateHeaderAccount();
      zuneUpdateCartCount();
    }
  }
);

zuneInitializeAuth().catch((error) => {
  console.error(
    "[ZUNE] Imeshindikana kuanzisha akaunti:",
    error
  );
});

window.zuneCart = {
  getItems: zuneGetCart,
  getQuantity: zuneGetCartTotalQuantity,
  getTotal: zuneGetCartTotalPrice,
  add: zuneAddToCart,
  remove: zuneRemoveFromCart,
  updateQuantity: zuneUpdateCartQuantity
};

window.zuneWishlist = {
  getItems: zuneGetWishlist,
  isFavourite: zuneIsFavourite,
  toggle: zuneToggleWishlist
};
function zuneFindProduct(productId) {
  const id = String(productId ?? "");

  return window.zuneProducts.find(
    (product) => String(product.id) === id
  ) ?? null;
}

document.addEventListener("click", (event) => {
  const favouriteButton = event.target.closest(
    "[data-favourite-id]"
  );

  const addButton = event.target.closest(
    "[data-add-to-cart]"
  );

  if (!favouriteButton && !addButton) return;

  const button = favouriteButton || addButton;
  const card = button.closest(".product-card");

  const productId =
    button.dataset.favouriteId ??
    card?.dataset.productId ??
    card?.dataset.id ??
    "";

  const product = zuneFindProduct(productId);

  if (!product) {
    event.preventDefault();
    event.stopImmediatePropagation();

    zuneShowMessage(
      "Bidhaa haijapatikana. Jaribu kupakia ukurasa upya.",
      "error"
    );

    return;
  }

  if (favouriteButton) {
    event.preventDefault();
    event.stopImmediatePropagation();

    zuneToggleWishlist(product.id);

    return;
  }

  if (addButton) {
    event.preventDefault();
    event.stopImmediatePropagation();

    zuneAddToCart(product, 1);
  }
}, true);

window.addEventListener("zune:cart-updated", () => {
  zuneUpdateCartCount();
});

window.addEventListener("storage", (event) => {
  if (
    event.key === "zune_cart" ||
    event.key?.startsWith("zune_cart_")
  ) {
    zuneUpdateCartCount();
  }
});

async function zuneLogout() {
  const confirmed = window.confirm(
    "Unataka kutoka kwenye akaunti yako ya ZUNE?"
  );

  if (!confirmed) return;

  const { error } = await zuneSupabase.auth.signOut();

  if (error) {
    console.error(
      "[ZUNE] Imeshindikana kutoka:",
      error.message
    );

    zuneShowMessage(
      "Imeshindikana kutoka. Tafadhali jaribu tena.",
      "error"
    );

    return;
  }

  zuneCurrentSession = null;
  zuneCurrentUser = null;

  zuneUpdateHeaderAccount();
  zuneUpdateCartCount();

  zuneShowMessage(
    "Umetoka kwenye akaunti yako.",
    "success"
  );

  window.location.href = "./login.html";
}

/*
  Kitufe kinaweza kutumia id="logoutButton"
  au data-zune-logout.
*/
document.addEventListener("click", (event) => {
  const logoutButton = event.target.closest(
    "#logoutButton, [data-zune-logout]"
  );

  if (!logoutButton) return;

  event.preventDefault();

  zuneLogout();
});

window.zuneRefreshProducts = async function () {
  zuneProductsLoaded = false;

  await zuneLoadProducts(true);
};
window.zuneApp = {
  getCurrentUser: () => zuneCurrentUser,
  getCurrentSession: () => zuneCurrentSession,
  getProfile: zuneLoadCurrentProfile,
  refreshProducts: window.zuneRefreshProducts,
  formatPrice: zuneFormatPrice,
  logout: zuneLogout
};
async function zuneFinalizeApp() {
  try {
    await zuneInitializeAuth();

    zuneUpdateHeaderAccount();
    zuneUpdateCartCount();

    /*
      Sasisha bidhaa baada ya kusoma akaunti ili
      hali ya vipendwa ionekane kwa mtumiaji aliyeingia.
    */
    if (zuneProductsLoaded) {
      zuneRenderProducts(window.zuneProducts);
      zuneRenderDailyDeals(window.zuneProducts);
    }

    console.info("[ZUNE] App.js imeanzishwa.");

  } catch (error) {
    console.error(
      "[ZUNE] Hitilafu wakati wa kuanzisha app:",
      error
    );
  }
}

zuneFinalizeApp();
