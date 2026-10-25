
// ============================================
// ZUNE STORE
// PART 1/4 — SUPABASE + INITIALIZATION
// File: store.js
// ============================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

// Tumia publishable key ile ile ya ZUNE app.js.
// Usitumie service_role key kwenye browser.
const SUPABASE_ANON_KEY =
  'WEKA_SUPABASE_PUBLISHABLE_KEY_HAPA';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// HTML helper
const $ = (id) => document.getElementById(id);

// Kitambulisho cha muuzaji kutoka store.html?id=UUID
const params = new URLSearchParams(window.location.search);
const vendorId = params.get('id');

// Hali ya ukurasa
let storeProfile = null;
let products = [];
let selectedCategory = 'all';
let searchQuery = '';
let sellerPhone = '';
let isStoreLoading = false;

const CATEGORY_LIST = [
  { label: 'Zote', value: 'all' },
  { label: 'Simu', value: 'simu' },
  { label: 'Elektroniki', value: 'elektroniki' },
  { label: 'Mavazi', value: 'mavazi' },
  { label: 'Urembo', value: 'urembo' },
  { label: 'Nyumbani', value: 'nyumbani' }
];

// Hakikisha kipengele kipo kabla ya kukitumia
function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? '';
}

function showMessage(message) {
  const element = $('pageMessage');
  if (!element) {
    console.warn('ZUNE Store:', message);
    return;
  }

  element.textContent = message;
  element.classList.remove('hidden');
}

function hideMessage() {
  $('pageMessage')?.classList.add('hidden');
}

function setLoading(isLoading) {
  isStoreLoading = isLoading;

  $('loadingProducts')?.classList.toggle(
    'hidden',
    !isLoading
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// ============================================
// MWISHO WA SEHEMU YA 1/4
// Endelea moja kwa moja na SEHEMU YA 2/4
// ============================================

// ============================================
// PART 2/4 — SELLER PROFILE + STORE ACTIONS
// ============================================

function renderStoreProfile(profile) {
  storeProfile = profile;

  const name = safeString(profile.full_name) || 'Muuzaji wa ZUNE';

  setText('storeName', name);
  setText('storeOwner', `Muuzaji: ${name}`);
  setText(
    'storeDescription',
    'Karibu kwenye duka letu la ZUNE. Chagua bidhaa unayoipenda.'
  );

  setText(
    'storeCategory',
    'Duka'
  );

  const avatar = $('storeAvatar');
  if (avatar) {
    avatar.textContent = name.charAt(0).toUpperCase() || 'Z';
  }

  // Onyesha alama tu ikiwa profile imethibitishwa.
  const verified = profile.is_verified === true;
  $('verifiedBadge')?.classList.toggle('hidden', !verified);

  setText(
    'storeStatus',
    verified
      ? '✓ Muuzaji amethibitishwa'
      : 'Duka la ZUNE'
  );

  sellerPhone = safeString(profile.phone_number);

  setText('productCount', products.length);
}

function getSellerWhatsAppNumber() {
  // WhatsApp inahitaji namba yenye country code,
  // bila alama +, nafasi au mabano.
  let phone = sellerPhone.replace(/\D/g, '');

  // Tanzania: 07XXXXXXXX -> 2557XXXXXXXX
  if (/^0[67]\d{8}$/.test(phone)) {
    phone = '255' + phone.slice(1);
  }

  // Namba ikiwa tayari imehifadhiwa na country code
  if (/^255[67]\d{8}$/.test(phone)) {
    return phone;
  }

  // Kubali namba nyingine za kimataifa zenye tarakimu 8–15.
  if (/^[1-9]\d{7,14}$/.test(phone)) {
    return phone;
  }

  return '';
}

function contactSeller(productName = '') {
  const phone = getSellerWhatsAppNumber();

  if (!phone) {
    showMessage(
      'Namba ya WhatsApp ya muuzaji haipo au si sahihi.'
    );
    return;
  }

  const message = productName
    ? `Habari, nimeiona bidhaa "${productName}" kwenye duka lako la ZUNE. Naomba maelezo zaidi.`
    : 'Habari, nimekutembelea kupitia ZUNE Marketplace. Naomba maelezo kuhusu duka lako.';

  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

async function shareStore() {
  const shareData = {
    title: `${safeString(storeProfile?.full_name) || 'Duka'} | ZUNE`,
    text: 'Tembelea duka hili kwenye ZUNE Marketplace.',
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      showMessage('Kiungo cha duka kimenakiliwa.');
      return;
    }

    window.prompt('Nakili kiungo cha duka:', shareData.url);
  } catch (error) {
    if (error.name !== 'AbortError') {
      showMessage('Imeshindikana kushiriki duka.');
    }
  }
}

function setupStoreButtons() {
  $('backButton')?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  $('shareButton')?.addEventListener('click', shareStore);

  $('contactSellerButton')?.addEventListener('click', () => {
    contactSeller();
  });

  $('viewProductsButton')?.addEventListener('click', () => {
    $('productsSection')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });

  $('productSearch')?.addEventListener('input', (event) => {
    searchQuery = safeString(event.target.value).toLowerCase();
    renderProducts();
  });
}

// ============================================
// MWISHO WA SEHEMU YA 2/4
// Endelea moja kwa moja na SEHEMU YA 3/4
// ============================================

// ============================================
// PART 3/4 — PRODUCTS + SEARCH + FILTERS
// ============================================

function getProductEmoji(title) {
  const name = safeString(title).toLowerCase();

  if (/simu|phone|iphone|samsung|tecno|infinix/.test(name)) return '📱';
  if (/laptop|computer|kompyuta|electronic|speaker|charger/.test(name)) return '💻';
  if (/nguo|shati|suruali|dress|kiatu|viatu|fashion|bag/.test(name)) return '👕';
  if (/urembo|beauty|cream|mafuta|perfume|manukato|makeup/.test(name)) return '✨';
  if (/chakula|food|mchele|unga/.test(name)) return '🍚';
  if (/saa|watch/.test(name)) return '⌚';
  if (/nyumba|home|kiti|meza|jikoni|sofa/.test(name)) return '🏠';

  return '🛍️';
}

function matchesCategory(product, category) {
  if (category === 'all') return true;

  const text = (
    safeString(product.title) + ' ' +
    safeString(product.description)
  ).toLowerCase();

  const patterns = {
    simu: /simu|phone|iphone|samsung|tecno|infinix/,
    elektroniki: /laptop|computer|kompyuta|electronic|earphone|headphone|speaker|tv|charger/,
    mavazi: /nguo|shati|suruali|dress|kiatu|viatu|clothes|fashion|bag/,
    urembo: /urembo|beauty|cream|mafuta|perfume|manukato|makeup|cosmetic/,
    nyumbani: /nyumba|home|kiti|meza|jikoni|bed|sofa/
  };

  return patterns[category]?.test(text) || false;
}

function renderFilters() {
  const container = $('categoryFilters');
  if (!container) return;

  container.replaceChildren();

  CATEGORY_LIST.forEach((category) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'filter-chip';
    button.dataset.category = category.value;
    button.textContent = category.label;

    if (selectedCategory === category.value) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      selectedCategory = category.value;

      container.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.classList.toggle(
          'active',
          chip.dataset.category === selectedCategory
        );
      });

      renderProducts();
    });

    container.appendChild(button);
  });
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const art = document.createElement('div');
  art.className = 'product-art';
  art.textContent = getProductEmoji(product.title);

  const artLabel = document.createElement('span');
  artLabel.className = 'product-art-label';
  artLabel.textContent = 'ZUNE';
  art.appendChild(artLabel);

  const info = document.createElement('div');
  info.className = 'product-info';

  const title = document.createElement('h3');
  title.className = 'product-title';
  title.textContent = safeString(product.title) || 'Bidhaa';

  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent =
    safeString(product.description) || 'Bidhaa ya ZUNE';

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = formatMoney(product.price);

  const quantity = Number(product.stock_quantity) || 0;

  const stock = document.createElement('p');
  stock.className = 'product-stock';
  stock.textContent = quantity > 0
    ? `Zilizopo: ${quantity}`
    : 'Haipo kwa sasa';

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'product-action';
  action.textContent = quantity > 0
    ? 'Ulizia bidhaa'
    : 'Haipatikani';

  action.disabled = quantity <= 0;

  if (action.disabled) {
    action.style.opacity = '0.55';
    action.style.cursor = 'not-allowed';
  } else {
    action.addEventListener('click', () => {
      contactSeller(product.title);
    });
  }

  info.append(title, description, price, stock, action);
  card.append(art, info);

  return card;
}

function renderProducts() {
  const grid = $('productsGrid');
  if (!grid) return;

  const filteredProducts = products.filter((product) => {
    const searchable = (
      safeString(product.title) + ' ' +
      safeString(product.description)
    ).toLowerCase();

    return searchable.includes(searchQuery) &&
      matchesCategory(product, selectedCategory);
  });

  grid.replaceChildren();

  setText('visibleProductCount', `${filteredProducts.length} bidhaa`);
  setText('productCount', products.length);

  const empty = $('emptyProducts');
  if (empty) {
    empty.classList.toggle('hidden', filteredProducts.length > 0);
  }

  setText(
    'emptyProductsText',
    products.length > 0
      ? 'Hakuna bidhaa zinazolingana na utafutaji au kategoria uliyochagua.'
      : 'Muuzaji bado hajaweka bidhaa kwenye duka hili.'
  );

  const fragment = document.createDocumentFragment();

  filteredProducts.forEach((product) => {
    fragment.appendChild(createProductCard(product));
  });

  grid.appendChild(fragment);
}

// ============================================
// MWISHO WA SEHEMU YA 3/4
// Endelea moja kwa moja na SEHEMU YA 4/4
// ============================================

// ============================================
// PART 4/4 — LOAD DATA + ERROR HANDLING
// ============================================

async function loadStore() {
  if (isStoreLoading) return;

  hideMessage();

  if (!vendorId) {
    setText('storeName', 'Duka halijachaguliwa');
    setText('storeOwner', 'Kiungo cha duka hakina ID ya muuzaji.');
    setText('storeStatus', 'Kiungo hakijakamilika');

    setLoading(false);

    $('emptyProducts')?.classList.remove('hidden');
    setText(
      'emptyProductsText',
      'Fungua duka kwa kutumia kiungo chenye ?id=UUID_YA_MUUZAJI.'
    );

    if ($('contactSellerButton')) {
      $('contactSellerButton').disabled = true;
    }

    return;
  }

  setLoading(true);

  try {
    // 1. Pata wasifu wa muuzaji.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, is_verified')
      .eq('id', vendorId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      setText('storeName', 'Duka halijapatikana');
      setText('storeOwner', 'Taarifa za muuzaji hazijapatikana.');
      setText('storeStatus', 'Hakuna taarifa za duka');

      products = [];
      renderProducts();

      $('emptyProducts')?.classList.remove('hidden');
      showMessage(
        'Muuzaji hajapatikana au sera za Supabase haziruhusu kusoma wasifu.'
      );

      return;
    }

    // 2. Pata bidhaa za muuzaji huyo pekee.
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(
        'id, vendor_id, title, description, price, stock_quantity, created_at'
      )
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (productError) throw productError;

    products = productData || [];

    // 3. Onyesha taarifa na bidhaa.
    renderStoreProfile(profile);
    renderFilters();
    renderProducts();

    hideMessage();

  } catch (error) {
    console.error('ZUNE Store error:', error);

    products = [];
    renderProducts();

    showMessage(
      'Imeshindikana kupakia duka. Kagua mtandao, Supabase key na ruhusa za RLS.'
    );
  } finally {
    setLoading(false);
  }
}

// Anzisha vitufe na utafutaji mara moja.
function initializeStore() {
  setupStoreButtons();

  // Hakikisha sehemu za bidhaa zinaonyesha hali sahihi.
  $('emptyProducts')?.classList.add('hidden');

  setLoading(true);

  loadStore();
}

// Endesha baada ya HTML kuwa tayari.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStore, {
    once: true
  });
} else {
  initializeStore();
}

// ============================================
// MWISHO WA STORE.JS
// ZUNE MARKETPLACE
// ============================================
