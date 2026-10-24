
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==================================================
// 1. SUPABASE CONFIGURATION
// ==================================================
const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// 2. SYSTEM STATE
// ==================================================
let allProducts = [];
let cart = readStorage('zune_cart', []);
let wishlist = readStorage('zune_wishlist', []);
let searchQuery = '';
let currentCategory = '';

// ==================================================
// 3. HELPER FUNCTIONS
// ==================================================
function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('ZUNE storage error:', error);
  }
}

function byId(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function money(value) {
  return Number(value || 0).toLocaleString('en-TZ');
}

function productTitle(product) {
  return product.title || product.name || 'Bidhaa';
}

function productCategory(product) {
  return String(
    product.category_name ||
    product.category ||
    ''
  ).trim().toLowerCase();
}

function getProductIcon(product) {
  const category = productCategory(product);

  if (category.includes('simu') || category.includes('phone')) return '📱';
  if (category.includes('nguo') || category.includes('fashion')) return '👕';
  if (category.includes('kiatu') || category.includes('shoe')) return '👟';
  if (category.includes('chakula') || category.includes('food')) return '🍎';
  if (category.includes('nyumba') || category.includes('home')) return '🏠';
  if (category.includes('urembo') || category.includes('beauty')) return '🧴';
  if (category.includes('computer') || category.includes('laptop')) return '💻';
  if (category.includes('vitabu') || category.includes('book')) return '📚';

  return '🛍️';
}

// ==================================================
// 4. DOM ELEMENTS
// ==================================================
const loadingEl = byId('loading');
const productsGridEl = byId('products-grid', 'homeProductsGrid');

// ==================================================
// 5. LOAD PRODUCTS FROM SUPABASE
// ==================================================
async function fetchProducts() {
  if (!productsGridEl) {
    console.warn(
      'ZUNE: Hakuna #products-grid au #homeProductsGrid kwenye HTML.'
    );
    return;
  }

  if (loadingEl) {
    loadingEl.style.display = '';
    loadingEl.textContent = 'Inapakia bidhaa...';
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
    console.error('ZUNE products error:', error);

    if (loadingEl) {
      loadingEl.style.display = '';
      loadingEl.textContent =
        'Bidhaa hazijapakia. Tafadhali jaribu tena.';
    }
  } finally {
    productsGridEl.setAttribute('aria-busy', 'false');
  }
}

// ==================================================
// 6. DISPLAY PRODUCTS WITHOUT IMAGES
// ==================================================
function renderProducts(products) {
  if (!productsGridEl) return;

  productsGridEl.replaceChildren();

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className =
      'col-span-full text-center p-8 bg-white rounded-2xl border border-slate-100';

    empty.innerHTML = `
      <div class="text-5xl mb-3">🛍️</div>
      <h3 class="font-bold text-slate-800">Hakuna bidhaa zilizopatikana</h3>
      <p class="text-sm text-slate-500 mt-2">
        Jaribu kutafuta bidhaa nyingine.
      </p>
    `;

    productsGridEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  products.forEach(product => {
    const id = String(product.id);
    const title = productTitle(product);
    const description =
      product.description || 'Bidhaa kutoka ZUNE Marketplace';
    const price = Number(product.price || 0);
    const saved = wishlist.some(item => String(item) === id);

    const card = document.createElement('article');

    card.className =
      'bg-white rounded-2xl border border-slate-100 p-3 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg transition';

    card.innerHTML = `
      <div>
        <div class="relative h-36 rounded-xl mb-3 bg-slate-50 flex items-center justify-center">
          <span class="text-6xl" aria-hidden="true">
            ${getProductIcon(product)}
          </span>

          <button
            type="button"
            data-action="wishlist"
            data-id="${escapeHTML(id)}"
            aria-pressed="${saved}"
            aria-label="${saved ? 'Ondoa kwenye vipendwa' : 'Ongeza kwenye vipendwa'}"
            class="absolute top-2 right-2 bg-white text-rose-500 h-9 w-9 rounded-full shadow"
          >
            <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>

        <h3 class="font-bold text-sm text-slate-800 line-clamp-2">
          ${escapeHTML(title)}
        </h3>

        <p class="text-xs text-slate-500 my-2 line-clamp-2">
          ${escapeHTML(description)}
        </p>
      </div>

      <div class="mt-2">
        <p class="text-blue-600 font-extrabold text-sm mb-2">
          TZS ${money(price)}
        </p>

        <button
          type="button"
          data-action="cart"
          data-id="${escapeHTML(id)}"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-xl font-bold"
        >
          <i class="fa-solid fa-cart-plus"></i>
          Ongeza Kikapu
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  productsGridEl.appendChild(fragment);
}

// ==================================================
// 7. SEARCH AND CATEGORY FILTERS
// ==================================================
function applyProductFilters() {
  let filtered = [...allProducts];

  if (searchQuery) {
    filtered = filtered.filter(product => {
      const title = String(productTitle(product)).toLowerCase();
      const description = String(product.description || '').toLowerCase();

      return title.includes(searchQuery) ||
        description.includes(searchQuery);
    });
  }

  if (currentCategory) {
    filtered = filtered.filter(product => {
      return productCategory(product) === currentCategory;
    });
  }

  renderProducts(filtered);
}

function setupSearchAndFilters() {
  const searchInput =
    byId('productSearch', 'searchInput') ||
    document.querySelector(
      'input[placeholder="Tafuta bidhaa unayotaka..."]'
    );

  const searchButton =
    byId('searchBtn') ||
    document.querySelector('header button:has(.fa-magnifying-glass)');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyProductFilters();
    });

    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchQuery = searchInput.value.trim().toLowerCase();
        applyProductFilters();
      }
    });
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyProductFilters();
    });
  }

  document.querySelectorAll('[data-category]').forEach(element => {
    element.addEventListener('click', () => {
      currentCategory = String(element.dataset.category || '')
        .trim()
        .toLowerCase();

      applyProductFilters();
    });
  });

  const clearButton = byId('clearFilters');

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      currentCategory = '';
      searchQuery = '';

      if (searchInput) searchInput.value = '';

      applyProductFilters();
    });
  }
}

// ==================================================
// 8. SHOPPING CART
// ==================================================
window.addToCart = function(id) {
  const product = allProducts.find(
    item => String(item.id) === String(id)
  );

  if (!product) {
    alert('Bidhaa haijapatikana. Jaribu tena.');
    return;
  }

  const existing = cart.find(
    item => String(item.id) === String(id)
  );

  if (existing) {
    existing.quantity = Number(existing.quantity || 1) + 1;
  } else {
    cart.push({
      id: product.id,
      title: productTitle(product),
      price: Number(product.price || 0),
      quantity: 1
    });
  }

  saveStorage('zune_cart', cart);
  updateHeaderCounts();

  alert('Bidhaa imeongezwa kwenye kikapu cha ZUNE.');
};

window.removeFromCart = function(id) {
  cart = cart.filter(item => String(item.id) !== String(id));
  saveStorage('zune_cart', cart);
  updateHeaderCounts();
};

window.clearCart = function() {
  cart = [];
  saveStorage('zune_cart', cart);
  updateHeaderCounts();
};

function updateHeaderCounts() {
  const itemCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0
  );

  const totalPrice = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  document.querySelectorAll('[data-cart-count]').forEach(element => {
    element.textContent = String(itemCount);
  });

  document.querySelectorAll('[data-cart-total]').forEach(element => {
    element.textContent = `TZS ${money(totalPrice)}`;
  });

  // Support existing cart badges.
  document.querySelectorAll('.fa-cart-shopping + span').forEach(element => {
    element.textContent = String(itemCount);
  });

  document.querySelectorAll('[data-wishlist-count]').forEach(element => {
    element.textContent = String(wishlist.length);
  });
}

// ==================================================
// 9. WISHLIST
// ==================================================
window.toggleWishlist = function(id) {
  if (id === undefined || id === null) return;

  const productId = String(id);
  const exists = wishlist.some(item => String(item) === productId);

  if (exists) {
    wishlist = wishlist.filter(item => String(item) !== productId);
  } else {
    wishlist.push(productId);
  }

  saveStorage('zune_wishlist', wishlist);
  updateHeaderCounts();
  applyProductFilters();
};

// Handle cart and wishlist clicks.
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === 'cart') {
    window.addToCart(id);
  } else if (button.dataset.action === 'wishlist') {
    window.toggleWishlist(id);
  }
});

// ==================================================
// 10. HERO SLIDER
// ==================================================
function setupHeroSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');

  const prevButton = byId('prevSlide');
  const nextButton = byId('nextSlide');

  if (!slides.length) return;

  let currentSlide = 0;
  let timer;

  function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
      slide.setAttribute('aria-hidden', String(i !== currentSlide));
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('bg-blue-600', i === currentSlide);
      dot.classList.toggle('bg-slate-300', i !== currentSlide);
    });
  }

  function restartTimer() {
    clearInterval(timer);

    timer = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 4000);
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      showSlide(currentSlide - 1);
      restartTimer();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      showSlide(currentSlide + 1);
      restartTimer();
    });
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      restartTimer();
    });
  });

  showSlide(0);
  restartTimer();
}

// ==================================================
// 11. SELLER APPLICATION SYSTEM
// ==================================================
const countryRegions = {
  Tanzania: [
    'Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza',
    'Kilimanjaro', 'Tanga', 'Mbeya', 'Zanzibar',
    'Morogoro', 'Iringa', 'Kagera', 'Tabora',
    'Ruvuma', 'Shinyanga', 'Mara', 'Lindi', 'Mtwara'
  ],

  Kenya: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru',
    'Eldoret', 'Kiambu', 'Machakos', 'Kajiado', 'Garissa'
  ],

  Uganda: [
    'Kampala', 'Gulu', 'Lira', 'Mbarara',
    'Jinja', 'Entebbe', 'Mbale', 'Kasese'
  ]
};

// ==================================================
// 12. OPEN AND CLOSE SELLER MODAL
// ==================================================
window.toggleSellerModal = function(show) {
  const modal = byId('sellerModal');
  if (!modal) return;

  modal.classList.toggle('hidden', !show);

  if (show) {
    updateRegions();
    checkApplicationStatus();
  }
};

// ==================================================
// 13. UPDATE REGIONS BY COUNTRY
// ==================================================
function updateRegions() {
  const countrySelect = byId('country');
  const regionSelect = byId('region');

  if (!countrySelect || !regionSelect) return;

  const regions = countryRegions[countrySelect.value] || [];
  const previousRegion = regionSelect.value;

  regionSelect.replaceChildren();

  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });

  if (regions.includes(previousRegion)) {
    regionSelect.value = previousRegion;
  }
}

// ==================================================
// 14. CHECK SELLER APPLICATION STATUS
// ==================================================
async function checkApplicationStatus() {
  const phone = localStorage.getItem('zune_seller_phone');
  const statusCard = byId('statusCard');

  if (!phone || !statusCard) return;

  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('status')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const application = data?.[0];
    if (!application) return;

    statusCard.classList.remove('hidden');

    const badge = byId('statusBadge');
    const message = byId('statusMessage');
    const icon = byId('statusIcon');

    if (!badge || !message || !icon) return;

    const status = String(application.status || 'pending')
      .toLowerCase();

    if (status === 'approved') {
      badge.className =
        'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-700';

      badge.textContent = 'APPROVED';
      message.textContent =
        'Hongera! Maombi yako yamekubaliwa.';

      icon.className =
        'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-emerald-500';

      icon.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (status === 'rejected') {
      badge.className =
        'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-rose-100 text-rose-700';

      badge.textContent = 'REJECTED';
      message.textContent =
        'Maombi yako hayakukubaliwa. Wasiliana na Admin.';

      icon.className =
        'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-rose-500';

      icon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
      badge.className =
        'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-amber-100 text-amber-700';

      badge.textContent = 'PENDING';
      message.textContent =
        'Maombi yako yanasubiri kukaguliwa na Admin.';

      icon.className =
        'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-amber-500';

      icon.innerHTML = '<i class="fa-solid fa-clock"></i>';
    }
  } catch (error) {
    console.error('ZUNE application status error:', error);
  }
}

// ==================================================
// 15. SELLER APPLICATION FORM
// ==================================================
function setupSellerForm() {
  const countrySelect = byId('country');
  const sellerForm = byId('sellerForm');

  if (countrySelect) {
    updateRegions();
    countrySelect.addEventListener('change', updateRegions);
  }

  if (!sellerForm) return;

  sellerForm.addEventListener('submit', async event => {
    event.preventDefault();

    const submitButton = byId('submitBtn');

    const getValue = id =>
      byId(id)?.value?.trim() || '';

    const formData = {
      business_name: getValue('bizName'),
      category: getValue('bizCategory'),
      phone: getValue('phone'),
      email: getValue('email') || null,
      id_type: getValue('idType'),
      id_number: getValue('idNumber'),
      tin_number: getValue('tinNumber') || null,
      country: getValue('country'),
      region: getValue('region'),
      district: getValue('district'),
      street: getValue('street'),
      status: 'pending'
    };

    const requiredFields = [
      'business_name',
      'category',
      'phone',
      'id_type',
      'id_number',
      'country',
      'region',
      'district',
      'street'
    ];

    if (requiredFields.some(field => !formData[field])) {
      alert('Tafadhali jaza sehemu zote zinazohitajika.');
      return;
    }

    if (submitButton?.disabled) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Inatuma...';
    }

    try {
      const { error } = await supabase
        .from('seller_applications')
        .insert([formData]);

      if (error) throw error;

      localStorage.setItem('zune_seller_phone', formData.phone);

      alert(
        'Maombi yako yametumwa kikamilifu. Yanasubiri kukaguliwa na Admin.'
      );

      window.toggleSellerModal(false);
      await checkApplicationStatus();
    } catch (error) {
      console.error('ZUNE seller application error:', error);

      alert(
        'Imeshindikana kutuma maombi: ' +
        (error.message || 'Tafadhali jaribu tena.')
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Tuma Maombi Sasa';
      }
    }
  });
}

// ==================================================
// 16. INITIALIZE ZUNE MARKETPLACE
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderCounts();
  setupSearchAndFilters();
  setupHeroSlider();
  setupSellerForm();
  fetchProducts();
});
