// ============================================
// ZUNE CATEGORY.JS
// SEHEMU YA 1/3: SUPABASE NA HELPERS
// ============================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CATEGORY_NAMES = [
  'Simu na Vifaa',
  'Vifaa vya Nyumbani',
  'Mavazi na Viatu',
  'Vipodozi na Urembo',
  'Laptop',
  'Mifuko'
];

let allProducts = [];
let activeCategory = '';
let searchTerm = '';
let minimumPrice = '';
let maximumPrice = '';

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function formatPrice(value) {
  const price = Number(value) || 0;

  return 'TZS ' + price.toLocaleString('en-US');
}

function getProductCategory(product) {
  return String(product.category || '').trim();
}

function getProductPrice(product) {
  return Number(product.price) || 0;
}

function getProductImage(product) {
  return product.image_url || '';
}// ============================================
// SEHEMU YA 2/3: KUPATA NA KUONYESHA BIDHAA
// ============================================

async function loadProducts() {
  const grid = $('#category-products-grid');
  const message = $('#filterMessage');

  if (grid) {
    grid.innerHTML = `
      <div class="col-span-full py-8 text-center">
        Inapakia bidhaa za ZUNE...
      </div>
    `;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProducts = Array.isArray(data) ? data : [];

    if (message) {
      message.textContent = '';
    }

    renderProducts();
  } catch (error) {
    console.error('ZUNE products error:', error);

    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <p class="font-semibold">
            Imeshindikana kupakia bidhaa.
          </p>
          <p class="mt-2 text-sm">
            Tafadhali hakikisha intaneti inafanya kazi,
            kisha jaribu tena.
          </p>
          <button
            type="button"
            id="retryProductsBtn"
            class="mt-4 rounded-lg bg-green-700 px-4 py-2 text-white"
          >
            Jaribu tena
          </button>
        </div>
      `;
    }

    if (message) {
      message.textContent =
        'Bidhaa hazijapakiwa. Jaribu tena.';
    }

    $('#retryProductsBtn')?.addEventListener(
      'click',
      loadProducts
    );
  }
}

function getFilteredProducts() {
  return allProducts.filter((product) => {
    // Kategoria iliyochaguliwa na muuzaji.
    if (
      activeCategory &&
      getProductCategory(product) !== activeCategory
    ) {
      return false;
    }

    const title = String(product.title || '').toLowerCase();
    const description = String(
      product.description || ''
    ).toLowerCase();

    if (
      searchTerm &&
      !title.includes(searchTerm) &&
      !description.includes(searchTerm)
    ) {
      return false;
    }

    const price = getProductPrice(product);

    if (
      minimumPrice !== '' &&
      price < Number(minimumPrice)
    ) {
      return false;
    }

    if (
      maximumPrice !== '' &&
      price > Number(maximumPrice)
    ) {
      return false;
    }

    return true;
  });
}

function renderProducts() {
  const grid = $('#category-products-grid');
  const heading = $('#selected-category-title');
  const count = $('#product-count');
  const message = $('#filterMessage');

  if (!grid) return;

  const products = getFilteredProducts();

  if (heading) {
    if (searchTerm) {
      heading.textContent = `Matokeo ya: ${searchTerm}`;
    } else if (activeCategory) {
      heading.textContent = `Kategoria: ${activeCategory}`;
    } else {
      heading.textContent = 'Bidhaa Zote';
    }
  }

  if (count) {
    count.textContent =
      `${products.length} zimepatikana`;
  }

  if (message) {
    message.textContent = products.length
      ? ''
      : 'Hakuna bidhaa zinazolingana na utafutaji au vichujio vyako.';
  }

  if (!products.length) {
    grid.innerHTML = `
      <div class="col-span-full py-10 text-center">
        <p class="text-lg font-semibold">
          Hakuna bidhaa zilizopatikana
        </p>
        <p class="mt-2 text-sm">
          Jaribu kategoria nyingine au badilisha vichujio vya bei.
        </p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map((product) => {
    const id = escapeHTML(product.id || '');
    const title = escapeHTML(
      product.title || 'Bidhaa ya ZUNE'
    );
    const category = escapeHTML(
      getProductCategory(product) || 'Bidhaa'
    );
    const price = formatPrice(getProductPrice(product));
    const image = getProductImage(product);
    const description = escapeHTML(
      product.description || 'Hakuna maelezo ya bidhaa.'
    );

    const imageMarkup = image
      ? `
        <img
          src="${escapeHTML(image)}"
          alt="${title}"
          loading="lazy"
          class="h-full w-full object-cover"
        >
      `
      : `
        <div class="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
          Picha haipo
        </div>
      `;

    return `
      <article
        class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        <div class="aspect-square overflow-hidden bg-gray-100">
          ${imageMarkup}
        </div>

        <div class="p-3">
          <p class="mb-1 text-xs text-gray-500">
            ${category}
          </p>

          <h3 class="line-clamp-2 font-semibold">
            ${title}
          </h3>

          <p class="mt-2 font-bold text-green-700">
            ${price}
          </p>

          <p class="mt-2 line-clamp-2 text-sm text-gray-600">
            ${description}
          </p>

          <button
            type="button"
            class="mt-3 w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            data-add-cart="${id}"
          >
            Ongeza Kikapuni
          </button>
        </div>
      </article>
    `;
  }).join('');
}// ============================================
// SEHEMU YA 3/3: EVENTS, FILTERS NA CART
// ============================================

function setActiveCategory(category) {
  activeCategory = CATEGORY_NAMES.includes(category)
    ? category
    : '';

  renderProducts();
}

function resetFilters() {
  activeCategory = '';
  searchTerm = '';
  minimumPrice = '';
  maximumPrice = '';

  const search = $('#catSearchInput');
  const minPrice = $('#minPriceInput');
  const maxPrice = $('#maxPriceInput');

  if (search) search.value = '';
  if (minPrice) minPrice.value = '';
  if (maxPrice) maxPrice.value = '';

  renderProducts();
}

function addProductToCart(productId) {
  const product = allProducts.find(
    (item) => String(item.id) === String(productId)
  );

  if (!product) {
    alert('Bidhaa haijapatikana. Tafadhali jaribu tena.');
    return;
  }

  try {
    let cart = [];

    const savedCart = localStorage.getItem('zune_cart');

    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      cart = Array.isArray(parsedCart) ? parsedCart : [];
    }

    // Kama bidhaa ipo tayari, ongeza idadi yake.
    const existingItem = cart.find((item) =>
      String(item.id || item.product_id) ===
      String(product.id)
    );

    if (existingItem) {
      existingItem.quantity =
        (Number(existingItem.quantity) || 1) + 1;
    } else {
      cart.push({
        ...product,
        product_id: product.id,
        quantity: 1
      });
    }

    localStorage.setItem('zune_cart', JSON.stringify(cart));

    alert(
      `"${product.title || 'Bidhaa ya ZUNE'}" imeongezwa kwenye kikapu!`
    );
  } catch (error) {
    console.error('ZUNE cart error:', error);

    alert(
      'Imeshindikana kuongeza bidhaa kwenye kikapu. Jaribu tena.'
    );
  }
}

function attachCategoryEvents() {
  // Kuchagua kategoria bila kubadilisha picha zake.
  document.addEventListener('click', (event) => {
    const categoryButton = event.target.closest(
      '[data-category]'
    );

    if (categoryButton) {
      const category = (
        categoryButton.dataset.category || ''
      ).trim();

      if (CATEGORY_NAMES.includes(category)) {
        setActiveCategory(category);

        $('#selected-category-title')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      return;
    }

    // Kuongeza bidhaa kwenye kikapu.
    const cartButton = event.target.closest(
      '[data-add-cart]'
    );

    if (cartButton) {
      addProductToCart(cartButton.dataset.addCart);
      return;
    }

    // Kujaribu kupakia bidhaa tena.
    if (event.target.closest('#retryProductsBtn')) {
      loadProducts();
    }
  });

  // Kutafuta bidhaa.
  $('#catSearchInput')?.addEventListener(
    'input',
    (event) => {
      searchTerm = event.target.value
        .trim()
        .toLowerCase();

      renderProducts();
    }
  );

  // Bei ya chini.
  $('#minPriceInput')?.addEventListener(
    'input',
    (event) => {
      minimumPrice = event.target.value;
      renderProducts();
    }
  );

  // Bei ya juu.
  $('#maxPriceInput')?.addEventListener(
    'input',
    (event) => {
      maximumPrice = event.target.value;
      renderProducts();
    }
  );

  // Kurejesha vichujio kwenye hali ya mwanzo.
  $('#resetFiltersBtn')?.addEventListener(
    'click',
    resetFilters
  );

  // Kuonyesha bidhaa zote.
  $('#showAllCategoriesBtn')?.addEventListener(
    'click',
    () => {
      activeCategory = '';
      renderProducts();

      $('#category-products-grid')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  );
}

function initializeCategoryPage() {
  attachCategoryEvents();
  loadProducts();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeCategoryPage,
    { once: true }
  );
} else {
  initializeCategoryPage();
}