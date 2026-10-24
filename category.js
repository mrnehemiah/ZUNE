/* =====================================================
ZUNE CATEGORY.JS
Supabase + Utafutaji + Vichujio + Cart
===================================================== */

const SUPABASE_URL =
'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let supabaseClient = null;
let allCategoryProducts = [];
let activeCategory = '';

const CART_KEY = 'zune_cart';

// Maneno yanayotumika kutambua kila kategoria.
// Hii husaidia hata bidhaa ikiwa haina column ya category.
const CATEGORY_KEYWORDS = {
'Simu na Vifaa': [
'simu', 'phone', 'smartphone', 'iphone', 'samsung',
'tecno', 'infinix', 'redmi', 'chaja', 'charger',
'earphone', 'headphone', 'cover', 'power bank'
],

'Vifaa vya Nyumbani': [
'nyumbani', 'home', 'jikoni', 'kitchen', 'tv',
'television', 'subwoofer', 'friji', 'fridge',
'sofa', 'couch', 'meza', 'table', 'kiti', 'chair',
'blender', 'feni', 'fan', 'speaker'
],

'Mavazi na Viatu': [
'mavazi', 'clothes', 'clothing', 'viatu', 'shoes',
'shati', 'shirt', 'suruali', 'trouser', 'dress',
'gauni', 'jacket', 'jaketi', 'soksi', 'socks',
'watoto', 'kids', 'sandal', 'sneaker'
],

'Vipodozi na Urembo': [
'vipodozi', 'urembo', 'beauty', 'cosmetic',
'lotion', 'perfume', 'manukato', 'cream',
'makeup', 'make-up', 'soap', 'sabuni',
'shampoo', 'mafuta ya nywele'
],

'Laptop': [
'laptop', 'kompyuta', 'computer', 'hp', 'dell',
'macbook', 'lenovo', 'asus', 'acer', 'keyboard',
'mouse', 'monitor', 'printer'
],

'Mifuko': [
'mfuko', 'mifuko', 'mkoba', 'mikoba', 'bag',
'bags', 'handbag', 'backpack', 'suitcase',
'travel bag', 'wallet'
]
};

// -----------------------------------------------------
// 1. KUANZISHA SUPABASE
// -----------------------------------------------------

if (window.supabase) {
supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);
}

// -----------------------------------------------------
// 2. KUANZISHA UKURASA
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
bindFilters();
bindCategoryButtons();
loadProducts();
});

// -----------------------------------------------------
// 3. KUSIKILIZA SEARCH NA BEI
// -----------------------------------------------------

function bindFilters() {
const searchInput = document.getElementById('catSearchInput');
const minInput = document.getElementById('minPriceInput');
const maxInput = document.getElementById('maxPriceInput');

if (searchInput) {
searchInput.addEventListener('input', applyFilters);
}

if (minInput) {
minInput.addEventListener('input', applyFilters);
}

if (maxInput) {
maxInput.addEventListener('input', applyFilters);
}
}

// Ondoa kategoria iliyochaguliwa kwa kugusa eneo la kategoria.
// Vitufe vya HTML vinaendelea kufanya kazi kwa onclick.
function bindCategoryButtons() {
const buttons = document.querySelectorAll(
'#categories-grid button'
);

buttons.forEach(button => {
button.addEventListener('click', () => {
buttons.forEach(item => {
item.classList.remove(
'ring-2',
'ring-blue-500',
'border-blue-500'
);
});

  button.classList.add(
    'ring-2',
    'ring-blue-500',
    'border-blue-500'
  );
});

});
}

// -----------------------------------------------------
// 4. KUPAKIA BIDHAA KUTOKA SUPABASE
// -----------------------------------------------------

async function loadProducts() {
const grid = document.getElementById('category-products-grid');

showLoading();

if (!supabaseClient) {
showError(
'Supabase haijaanzishwa. Hakikisha CDN ya Supabase imepakiwa.'
);
return;
}

try {
const { data, error } = await supabaseClient
.from('products')
.select('*')
.order('created_at', { ascending: false });

if (error) {
  console.error('ZUNE products error:', error);
  showError('Imeshindikana kupakia bidhaa. Tafadhali jaribu tena.');
  return;
}

allCategoryProducts = Array.isArray(data) ? data : [];

applyFilters();

} catch (error) {
console.error('ZUNE loading error:', error);
showError('Tatizo la mtandao limetokea. Tafadhali jaribu tena.');
}
}

// -----------------------------------------------------
// 5. KUTAFUTA, KUCHUJA KATEGORIA NA BEI
// -----------------------------------------------------

function normalizeText(value) {
return String(value ?? '')
.toLowerCase()
.trim();
}

function getProductText(product) {
return normalizeText([
product.title,
product.description,
product.category,
product.brand
].filter(Boolean).join(' '));
}

function matchesCategory(product, selectedCategory) {
if (!selectedCategory) return true;

const categoryText = normalizeText(product.category);
const productText = getProductText(product);
const target = normalizeText(selectedCategory);

// Ikiwa bidhaa ina kategoria iliyohifadhiwa,
// tumia kwanza taarifa hiyo.
if (categoryText && (
categoryText === target ||
categoryText.includes(target) ||
target.includes(categoryText)
)) {
return true;
}

// Tumia maneno yanayohusiana na kategoria.
const keywords = CATEGORY_KEYWORDS[selectedCategory] || [target];

return keywords.some(keyword =>
productText.includes(normalizeText(keyword))
);
}

function applyFilters() {
const searchInput = document.getElementById('catSearchInput');
const minInput = document.getElementById('minPriceInput');
const maxInput = document.getElementById('maxPriceInput');

const query = normalizeText(searchInput?.value);
const minPrice = minInput?.value !== ''
? Number(minInput.value)
: null;
const maxPrice = maxInput?.value !== ''
? Number(maxInput.value)
: null;

let filtered = allCategoryProducts.filter(product => {
const text = getProductText(product);
const price = Number(product.price);

const matchesSearch = !query || text.includes(query);
const matchesSelectedCategory = matchesCategory(
  product,
  activeCategory
);

const matchesMin = minPrice === null ||
  (Number.isFinite(price) && price >= minPrice);

const matchesMax = maxPrice === null ||
  (Number.isFinite(price) && price <= maxPrice);

return (
  matchesSearch &&
  matchesSelectedCategory &&
  matchesMin &&
  matchesMax
);

});

let heading = activeCategory
? "Kategoria: ${activeCategory}"
: 'Bidhaa Zote';

if (query) {
heading = "Matokeo ya: "${searchInput.value.trim()}"";
}

if (minPrice !== null || maxPrice !== null) {
heading += ' — Kichujio cha Bei';
}

renderProducts(filtered, heading);
}

// -----------------------------------------------------
// 6. KUCHAGUA KATEGORIA
// -----------------------------------------------------

window.filterByCategory = function(category) {
activeCategory = category || '';
applyFilters();
};

// -----------------------------------------------------
// 7. KUONYESHA BIDHAA
// -----------------------------------------------------

function renderProducts(products, heading) {
const grid = document.getElementById('category-products-grid');
const title = document.getElementById('selected-category-title');
const count = document.getElementById('product-count');

if (title) title.textContent = heading;

if (count) {
count.textContent = "${products.length} Zimepatikana";
}

if (!grid) return;

grid.replaceChildren();

if (!products.length) {
const empty = document.createElement('div');
empty.className =
'col-span-full text-center py-10 bg-white rounded-2xl border border-slate-100';

const icon = document.createElement('i');
icon.className =
  'fa-solid fa-box-open text-slate-300 text-3xl mb-2';

const message = document.createElement('p');
message.className =
  'text-xs text-slate-500 font-semibold';
message.textContent = 'Hakuna bidhaa zinazolingana na vichujio vyako.';

empty.append(icon, message);
grid.appendChild(empty);
return;

}

products.forEach(product => {
grid.appendChild(createProductCard(product));
});
}

function createProductCard(product) {
const card = document.createElement('article');
card.className =
'bg-white rounded-2xl border border-slate-100 p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition';

const content = document.createElement('div');

// Picha au nafasi ya picha.
const imageBox = document.createElement('div');
imageBox.className =
'h-28 bg-slate-50 rounded-xl overflow-hidden mb-2 flex items-center justify-center';

if (product.image_url) {
const image = document.createElement('img');
image.src = product.image_url;
image.alt = product.title || 'Bidhaa ya ZUNE';
image.loading = 'lazy';
image.className = 'w-full h-full object-cover';

image.addEventListener('error', () => {
  image.remove();

  const fallback = document.createElement('div');
  fallback.className =
    'flex flex-col items-center justify-center text-slate-300';

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-box text-3xl';

  const label = document.createElement('span');
  label.className = 'text-[10px] mt-1';
  label.textContent = 'Picha haipo';

  fallback.append(icon, label);
  imageBox.replaceChildren(fallback);
}, { once: true });

imageBox.appendChild(image);

} else {
const fallback = document.createElement('div');
fallback.className =
'flex flex-col items-center justify-center text-slate-300';

const icon = document.createElement('i');
icon.className = 'fa-solid fa-box text-3xl';

const label = document.createElement('span');
label.className = 'text-[10px] mt-1';
label.textContent = 'Bidhaa ya ZUNE';

fallback.append(icon, label);
imageBox.appendChild(fallback);

}

const name = document.createElement('h4');
name.className =
'font-bold text-xs text-slate-800 line-clamp-2';
name.textContent = product.title || 'Bidhaa ya ZUNE';

content.append(imageBox, name);

const details = document.createElement('div');
details.className = 'mt-2';

const price = document.createElement('p');
price.className =
'text-blue-600 font-brand font-extrabold text-xs mb-1.5';

const numericPrice = Number(product.price);
price.textContent = Number.isFinite(numericPrice)
? "TZS ${numericPrice.toLocaleString('en-US')}"
: 'Bei haijawekwa';

const button = document.createElement('button');
button.type = 'button';
button.className =
'w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 rounded-lg font-bold transition';
button.textContent = 'Ongeza Kikapu';

button.addEventListener('click', () => {
addToCartFromCategory(product);
});

details.append(price, button);
card.append(content, details);

return card;
}

// -----------------------------------------------------
// 8. KUONGEZA BIDHAA KWENYE CART
// -----------------------------------------------------

function readCart() {
try {
const cart = JSON.parse(localStorage.getItem(CART_KEY));
return Array.isArray(cart) ? cart : [];
} catch (error) {
console.error('Cart data error:', error);
return [];
}
}

function addToCartFromCategory(product) {
if (!product || !product.id) {
alert('Bidhaa hii haina kitambulisho sahihi.');
return;
}

const price = Number(product.price);

if (!Number.isFinite(price) || price < 0) {
alert('Bidhaa hii haina bei sahihi kwa sasa.');
return;
}

const cart = readCart();
const productId = String(product.id);

const existing = cart.find(item =>
String(item.product_id || item.productId || item.id) === productId
);

if (existing) {
existing.quantity = Math.max(1, Number(existing.quantity) || 1) + 1;

// Sasisha taarifa za bidhaa kutoka Supabase.
existing.product_id = product.id;
existing.title = product.title || 'Bidhaa ya ZUNE';
existing.price = price;

} else {
cart.push({
id: product.id,
product_id: product.id,
title: product.title || 'Bidhaa ya ZUNE',
price,
quantity: 1
});
}

try {
localStorage.setItem(CART_KEY, JSON.stringify(cart));
alert(""${product.title || 'Bidhaa ya ZUNE'}" imeongezwa kwenye kikapu!");
} catch (error) {
console.error('Saving cart failed:', error);
alert('Imeshindikana kuhifadhi kikapu. Angalia nafasi ya kuhifadhi kwenye kivinjari.');
}
}

// Husaidia pia kama sehemu nyingine za ukurasa zinaita jina hili.
window.addToCartFromCategory = function(id, title, price) {
const product = allCategoryProducts.find(item =>
String(item.id) === String(id)
);

if (product) {
addToCartFromCategory(product);
return;
}

alert('Bidhaa haijapatikana kwenye orodha. Tafadhali pakia ukurasa upya.');
};

// -----------------------------------------------------
// 9. UJUMBE WA KUPAKIA NA MAKOSA
// -----------------------------------------------------

function showLoading() {
const grid = document.getElementById('category-products-grid');
if (!grid) return;

const box = document.createElement('div');
box.className =
'col-span-full text-center py-10 bg-white rounded-2xl border border-slate-100';

const icon = document.createElement('i');
icon.className =
'fa-solid fa-spinner fa-spin text-blue-600 text-2xl mb-2';

const message = document.createElement('p');
message.className = 'text-xs text-slate-500 font-semibold';
message.textContent = 'Inapakia bidhaa za ZUNE...';

box.append(icon, message);
grid.replaceChildren(box);
}

function showError(message) {
const grid = document.getElementById('category-products-grid');
if (!grid) return;

const box = document.createElement('div');
box.className =
'col-span-full text-center py-8 px-4 bg-white rounded-2xl border border-red-100';

const icon = document.createElement('i');
icon.className =
'fa-solid fa-circle-exclamation text-red-500 text-2xl mb-2';

const text = document.createElement('p');
text.className = 'text-xs text-slate-600 font-semibold';
text.textContent = message;

const retry = document.createElement('button');
retry.type = 'button';
retry.className =
'mt-3 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl';
retry.textContent = 'Jaribu Tena';
retry.addEventListener('click', loadProducts);

box.append(icon, text, retry);
grid.replaceChildren(box);

const count = document.getElementById('product-count');
if (count) count.textContent = '—';
}