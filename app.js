import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. SUPABASE ENTERPRISE CONFIGURATION
const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const supabase = window.zuneSupabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
window.zuneSupabase = supabase;

// 2. GLOBAL SYSTEM STATE
let allProducts = [];
let cart = [];
let wishlist = [];
let searchQuery = '';
let currentCategory = '';
let currentUserId = null;
let cartStorageKey = 'zune_cart_guest';
let wishlistStorageKey = 'zune_wishlist_guest';

// 3. SECURE LOCAL STORAGE HELPERS
function readStorage(key, fallback = []) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallback;
    const parsed = JSON.parse(rawValue);
    return parsed !== null ? parsed : fallback;
  } catch (error) {
    console.error(`ZUNE Storage Read Error [${key}]:`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`ZUNE Storage Save Error [${key}]:`, error);
  }
}

// Tenganisha kikapu na wishlist kulingana na akaunti ya mtumiaji
function initializeCustomerStorage(userId) {
  currentUserId = userId || null;
  const identifier = currentUserId ? `user_${currentUserId}` : 'guest';

  cartStorageKey = `zune_cart_${identifier}`;
  wishlistStorageKey = `zune_wishlist_${identifier}`;

  const savedCart = readStorage(cartStorageKey, []);
  const savedWishlist = readStorage(wishlistStorageKey, []);

  cart = Array.isArray(savedCart) ? savedCart : [];
  wishlist = Array.isArray(savedWishlist) ? savedWishlist : [];

  updateHeaderCounts();
  applyProductFilters();
}

// 4. UTILITY & FORMATTING HELPERS
function byId(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[match]);
}

function money(amount) {
  return Number(amount || 0).toLocaleString('en-TZ');
}

function productTitle(product) {
  return product.title || product.name || 'Bidhaa Isiyo na Jina';
}

function productCategory(product) {
  return String(product.category_name || product.category || '').trim().toLowerCase();
}

function getProductIcon(product) {
  const cat = productCategory(product);
  if (cat.includes('simu') || cat.includes('phone')) return '📱';
  if (cat.includes('nguo') || cat.includes('fashion')) return '👕';
  if (cat.includes('kiatu') || cat.includes('shoe')) return '👟';
  if (cat.includes('chakula') || cat.includes('food')) return '🍎';
  if (cat.includes('nyumba') || cat.includes('home')) return '🏠';
  if (cat.includes('urembo') || cat.includes('beauty')) return '🧴';
  if (cat.includes('computer') || cat.includes('laptop')) return '💻';
  if (cat.includes('vitabu') || cat.includes('book')) return '📚';
  return '🛍️';
}

// 5. DOM ELEMENT REFERENCES
const loadingEl = byId('loading');
const productsGridEl = byId('products-grid', 'homeProductsGrid');

// 6. FETCH PRODUCTS FROM SUPABASE DATABASE
async function fetchProducts() {
  if (!productsGridEl) {
    console.warn('ZUNE Warning: Hakuna #products-grid au #homeProductsGrid iliyopatikana kwenye DOM.');
    return;
  }

  if (loadingEl) {
    loadingEl.style.display = 'block';
    loadingEl.textContent = 'Inapakia bidhaa kutoka mtandaoni...';
  }

  productsGridEl.setAttribute('aria-busy', 'true');

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProducts = Array.isArray(data) ? data : [];
    applyProductFilters();

    if (loadingEl) loadingEl.style.display = 'none';
  } catch (error) {
    console.error('ZUNE Products Fetch Error:', error);
    if (loadingEl) {
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Imeshindikana kupakia bidhaa. Tafadhali angalia mtandao wako.';
    }
  } finally {
    productsGridEl.setAttribute('aria-busy', 'false');
  }
}

// 7. RENDER PRODUCTS ENGINE
function renderProducts(productsToRender) {
  if (!productsGridEl) return;

  productsGridEl.replaceChildren();

  if (!productsToRender.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'col-span-full text-center py-12 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm';
    emptyState.innerHTML = `
      <div class="text-6xl mb-3 animate-bounce">🛍️</div>
      <h3 class="font-bold text-slate-800 text-lg">Hakuna bidhaa zilizopatikana</h3>
      <p class="text-sm text-slate-500 mt-1">Jaribu kutafuta kwa neno lingine au badilisha kitengo chako cha utafutaji.</p>
    `;
    productsGridEl.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  productsToRender.forEach(product => {
    const id = String(product.id);
    const title = productTitle(product);
    const description = product.description || 'Bidhaa bora kutoka ZUNE Marketplace';
    const price = Number(product.price || 0);
    const isSaved = wishlist.some(itemId => String(itemId) === id);

    const card = document.createElement('article');
    card.className = 'bg-white rounded-2xl border border-slate-100 p-3.5 flex flex-col justify-between hover:border-blue-400 hover:shadow-xl transition-all duration-300 group';

    card.innerHTML = `
      <div>
        <div class="relative h-40 rounded-xl mb-3 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:bg-blue-50/50 transition">
          <span class="text-6xl select-none group-hover:scale-110 transition-transform duration-300" aria-hidden="true">${getProductIcon(product)}</span>
          <button
            type="button"
            data-action="wishlist"
            data-id="${escapeHTML(id)}"
            aria-pressed="${isSaved}"
            aria-label="${isSaved ? 'Ondoa kwenye vipendwa' : 'Ongeza kwenye vipendwa'}"
            class="absolute top-2.5 right-2.5 bg-white text-rose-500 h-9 w-9 rounded-full shadow-md flex items-center justify-center hover:bg-rose-50 active:scale-95 transition"
          >
            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart text-base"></i>
          </button>
        </div>
        <h3 class="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-blue-600 transition">${escapeHTML(title)}</h3>
        <p class="text-xs text-slate-500 my-1.5 line-clamp-2">${escapeHTML(description)}</p>
      </div>
      <div class="mt-3 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-slate-400 font-medium">Bei</span>
          <span class="text-blue-600 font-extrabold text-sm">TZS ${money(price)}</span>
        </div>
        <button
          type="button"
          data-action="cart"
          data-id="${escapeHTML(id)}"
          class="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition"
        >
          <i class="fa-solid fa-cart-plus text-sm"></i> Ongeza Kikapu
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  productsGridEl.appendChild(fragment);
}
// 8. SEARCH & CATEGORY FILTERS LOGIC
function applyProductFilters() {
  let filtered = [...allProducts];

  if (searchQuery) {
    filtered = filtered.filter(product => {
      const title = String(productTitle(product)).toLowerCase();
      const description = String(product.description || '').toLowerCase();
      return title.includes(searchQuery) || description.includes(searchQuery);
    });
  }

  if (currentCategory) {
    filtered = filtered.filter(product => productCategory(product) === currentCategory);
  }

  renderProducts(filtered);
}

function setupSearchAndFilters() {
  const searchInput = byId('productSearch', 'searchInput') || document.querySelector('input[placeholder*="Tafuta"]');
  const searchButton = byId('searchBtn') || document.querySelector('header button:has(.fa-magnifying-glass)');
  const clearButton = byId('clearFilters');

  if (searchInput && !searchInput.dataset.zuneSearchReady) {
    searchInput.dataset.zuneSearchReady = 'true';
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyProductFilters();
    });
  }

  if (searchButton && searchInput && !searchButton.dataset.zuneSearchReady) {
    searchButton.dataset.zuneSearchReady = 'true';
    searchButton.addEventListener('click', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyProductFilters();
    });
  }

  document.querySelectorAll('[data-category]').forEach(element => {
    if (element.dataset.zuneCategoryReady) return;
    element.dataset.zuneCategoryReady = 'true';
    element.addEventListener('click', () => {
      currentCategory = String(element.dataset.category || '').trim().toLowerCase();
      applyProductFilters();
    });
  });

  if (clearButton && !clearButton.dataset.zuneClearReady) {
    clearButton.dataset.zuneClearReady = 'true';
    clearButton.addEventListener('click', () => {
      currentCategory = '';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      applyProductFilters();
    });
  }
}

// 9. SHOPPING CART MANAGEMENT ENGINE
window.addToCart = function(id) {
  const product = allProducts.find(item => String(item.id) === String(id));
  if (!product) {
    alert('Samahani, bidhaa hii haipatikani kwa sasa.');
    return;
  }

  const existingItem = cart.find(item => String(item.id) === String(id));
  if (existingItem) {
    existingItem.quantity = Number(existingItem.quantity || 1) + 1;
  } else {
    cart.push({
      id: product.id,
      title: productTitle(product),
      price: Number(product.price || 0),
      quantity: 1
    });
  }

  saveStorage(cartStorageKey, cart);
  updateHeaderCounts();
  
  // Taarifa ya mafanikio ya haraka
  console.log('ZUNE: Bidhaa imeongezwa kwenye kikapu.');
};

window.removeFromCart = function(id) {
  cart = cart.filter(item => String(item.id) !== String(id));
  saveStorage(cartStorageKey, cart);
  updateHeaderCounts();
};

window.clearCart = function() {
  cart = [];
  saveStorage(cartStorageKey, cart);
  updateHeaderCounts();
};

function updateHeaderCounts() {
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

  document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = String(totalItems));
  document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = `TZS ${money(totalPrice)}`);
  document.querySelectorAll('[data-wishlist-count]').forEach(el => el.textContent = String(wishlist.length));
}

// 10. WISHLIST MANAGEMENT ENGINE
window.toggleWishlist = function(id) {
  if (id === undefined || id === null) return;
  const productId = String(id);

  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(itemId => itemId !== productId);
  } else {
    wishlist.push(productId);
  }

  saveStorage(wishlistStorageKey, wishlist);
  updateHeaderCounts();
  applyProductFilters();
};

// Global Interactive Event Delegation for Clicks
document.addEventListener('click', event => {
  const interactiveButton = event.target.closest('button[data-action]');
  if (!interactiveButton) return;

  const actionId = interactiveButton.dataset.id;
  const actionType = interactiveButton.dataset.action;

  if (actionType === 'cart') {
    window.addToCart(actionId);
  } else if (actionType === 'wishlist') {
    window.toggleWishlist(actionId);
  }
});
// 11. HERO BANNER SLIDER SYSTEM
function setupHeroSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = byId('prevSlide');
  const nextBtn = byId('nextSlide');

  if (!slides.length || slides[0].dataset.zuneSliderReady) return;
  slides[0].dataset.zuneSliderReady = 'true';

  let currentSlideIndex = 0;
  let slideTimer = null;

  function renderSlide(index) {
    currentSlideIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === currentSlideIndex);
      slide.setAttribute('aria-hidden', String(idx !== currentSlideIndex));
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('bg-blue-600', idx === currentSlideIndex);
      dot.classList.toggle('bg-slate-300', idx !== currentSlideIndex);
      dot.setAttribute('aria-current', idx === currentSlideIndex ? 'true' : 'false');
    });
  }

  function resetSlideInterval() {
    if (slideTimer) clearInterval(slideTimer);
    if (slides.length > 1) {
      slideTimer = setInterval(() => {
        renderSlide(currentSlideIndex + 1);
      }, 5000);
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      renderSlide(currentSlideIndex - 1);
      resetSlideInterval();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      renderSlide(currentSlideIndex + 1);
      resetSlideInterval();
    });
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      renderSlide(idx);
      resetSlideInterval();
    });
  });

  renderSlide(0);
  resetSlideInterval();
}

// 12. SELLER APPLICATION & REGIONAL DATABASE
const countryRegionsMap = {
  Tanzania: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Kilimanjaro', 'Tanga', 'Mbeya', 'Zanzibar', 'Morogoro', 'Iringa', 'Tabora'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu'],
  Uganda: ['Kampala', 'Gulu', 'Mbarara', 'Jinja', 'Entebbe']
};

window.toggleSellerModal = function(showModal) {
  const sellerModal = byId('sellerModal');
  if (!sellerModal) return;

  sellerModal.classList.toggle('hidden', !showModal);
  if (showModal) {
    updateRegionOptions();
    verifySellerApplicationStatus();
  }
};

function updateRegionOptions() {
  const countrySelectEl = byId('country');
  const regionSelectEl = byId('region');
  if (!countrySelectEl || !regionSelectEl) return;

  const selectedCountry = countrySelectEl.value;
  const availableRegions = countryRegionsMap[selectedCountry] || [];
  const oldRegionValue = regionSelectEl.value;

  regionSelectEl.replaceChildren();

  availableRegions.forEach(regionName => {
    const opt = document.createElement('option');
    opt.value = regionName;
    opt.textContent = regionName;
    regionSelectEl.appendChild(opt);
  });

  if (availableRegions.includes(oldRegionValue)) {
    regionSelectEl.value = oldRegionValue;
  }
}

async function verifySellerApplicationStatus() {
  const sellerPhone = localStorage.getItem('zune_seller_phone');
  const statusContainer = byId('statusCard');
  if (!sellerPhone || !statusContainer) return;

  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('status')
      .eq('phone', sellerPhone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const record = data?.[0];
    if (!record) return;

    statusContainer.classList.remove('hidden');
    const badgeEl = byId('statusBadge');
    const msgEl = byId('statusMessage');
    const iconEl = byId('statusIcon');
    if (!badgeEl || !msgEl || !iconEl) return;

    const currentStatus = String(record.status || 'pending').toLowerCase();

    if (currentStatus === 'approved') {
      badgeEl.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-700';
      badgeEl.textContent = 'APPROVED';
      msgEl.textContent = 'Hongera! Maombi yako yameidhinishwa rasmi.';
      iconEl.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-emerald-500';
      iconEl.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (currentStatus === 'rejected') {
      badgeEl.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-rose-100 text-rose-700';
      badgeEl.textContent = 'REJECTED';
      msgEl.textContent = 'Samahani, maombi yako hayakukubaliwa.';
      iconEl.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-rose-500';
      iconEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
      badgeEl.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-amber-100 text-amber-700';
      badgeEl.textContent = 'PENDING';
      msgEl.textContent = 'Maombi yako yanachunguzwa na uongozi.';
      iconEl.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-amber-500';
      iconEl.innerHTML = '<i class="fa-solid fa-clock"></i>';
    }
  } catch (err) {
    console.error('ZUNE Status Verification Error:', err);
  }
}

function setupSellerFormEventListener() {
  const countrySelectEl = byId('country');
  const sellerFormEl = byId('sellerForm');

  if (countrySelectEl && !countrySelectEl.dataset.zuneReady) {
    countrySelectEl.dataset.zuneReady = 'true';
    updateRegionOptions();
    countrySelectEl.addEventListener('change', updateRegionOptions);
  }

  if (!sellerFormEl || sellerFormEl.dataset.zuneReady) return;
  sellerFormEl.dataset.zuneReady = 'true';

  sellerFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = byId('submitBtn');
    const getVal = fieldId => byId(fieldId)?.value?.trim() || '';

    const payload = {
      business_name: getVal('bizName'),
      category: getVal('bizCategory'),
      phone: getVal('phone'),
      email: getVal('email') || null,
      id_type: getVal('idType'),
      id_number: getVal('idNumber'),
      tin_number: getVal('tinNumber') || null,
      country: getVal('country'),
      region: getVal('region'),
      district: getVal('district'),
      street: getVal('street'),
      status: 'pending'
    };

    if (!payload.business_name || !payload.phone || !payload.id_number) {
      alert('Tafadhali jaza sehemu zote muhimu za lazima.');
      return;
    }

    if (submitBtn?.disabled) return;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Inatuma maombi...';
    }

    try {
      const { data: authSession, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!authSession.user) {
        alert('Tafadhali ingia kwenye akaunti yako kwanza.');
        return;
      }

      const { error: insertErr } = await supabase.from('seller_applications').insert([payload]);
      if (insertErr) throw insertErr;

      localStorage.setItem('zune_seller_phone', payload.phone);
      alert('Maombi yako yametumwa kikamilifu!');
      window.toggleSellerModal(false);
      await verifySellerApplicationStatus();
    } catch (error) {
      console.error('ZUNE Seller Form Error:', error);
      alert('Imeshindikana kutuma ombi: ' + (error.message || 'Jaribu tena baadaye.'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tuma Maombi Sasa';
      }
    }
  });
}

// 13. APP INITIALIZATION & AUTH LISTENER
async function initializeZuneApp() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    initializeCustomerStorage(data.user?.id || null);
  } catch {
    initializeCustomerStorage(null);
  }

  setupSearchAndFilters();
  setupHeroSlider();
  setupSellerFormEventListener();
  await fetchProducts();
}

supabase.auth.onAuthStateChange((_event, session) => {
  const newUserId = session?.user?.id || null;
  if (newUserId !== currentUserId) {
    initializeCustomerStorage(newUserId);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeZuneApp, { once: true });
} else {
  initializeZuneApp();
}
