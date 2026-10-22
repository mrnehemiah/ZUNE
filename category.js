const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

let supabaseClient = null
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

let allCategoryProducts = []

document.addEventListener('DOMContentLoaded', () => {
  loadProducts()

  const searchInput = document.getElementById('catSearchInput')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim()
      const filtered = allCategoryProducts.filter(p => 
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      )
      renderProducts(filtered, query ? `Matokeo ya: "${query}"` : "Bidhaa Zote")
    })
  }
})

async function loadProducts() {
  if (!supabaseClient) {
    renderProducts([], "Bidhaa Zote")
    return
  }

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error loading products:", error)
    renderProducts([], "Bidhaa Zote")
    return
  }

  allCategoryProducts = data || []
  renderProducts(allCategoryProducts, "Bidhaa Zote")
}

function renderProducts(products, categoryTitle) {
  const gridEl = document.getElementById('category-products-grid')
  const titleEl = document.getElementById('selected-category-title')
  const countEl = document.getElementById('product-count')

  if (titleEl) titleEl.innerText = categoryTitle
  if (countEl) countEl.innerText = `${products.length} Zimepatikana`
  if (!gridEl) return

  gridEl.innerHTML = ''

  if (products.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full text-center py-10 bg-white rounded-2xl border border-slate-100">
        <i class="fa-solid fa-box-open text-slate-300 text-3xl mb-2"></i>
        <p class="text-xs text-slate-500 font-semibold">Hakuna bidhaa zilizopatikana.</p>
      </div>
    `
    return
  }

  products.forEach(p => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-2xl border border-slate-100 p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition'
    
    const priceFormatted = Number(p.price || 0).toLocaleString()

    card.innerHTML = `
      <div>
        <div class="h-28 bg-slate-50 rounded-xl overflow-hidden mb-2">
          <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.title || 'Bidhaa'}" class="w-full h-full object-cover">
        </div>
        <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${p.title || 'Bidhaa ya ZUNE'}</h4>
      </div>
      <div class="mt-2">
        <p class="text-blue-600 font-brand font-extrabold text-xs mb-1.5">TZS ${priceFormatted}</p>
        <button onclick="addToCartFromCategory('${p.id}', '${(p.title || '').replace(/'/g, "\\'")}', ${p.price})" class="w-full bg-blue-600 text-white text-[10px] py-1.5 rounded-lg font-bold">
          Ongeza Kikapu
        </button>
      </div>
    `
    gridEl.appendChild(card)
  })
}

window.filterByCategory = function(category) {
  const filtered = allCategoryProducts.filter(p => {
    const cat = (p.category || '').toLowerCase()
    const title = (p.title || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    const target = category.toLowerCase()

    return cat.includes(target) || title.includes(target) || desc.includes(target)
  })

  renderProducts(filtered.length > 0 ? filtered : allCategoryProducts, `Kategoria: ${category}`)
}

window.addToCartFromCategory = function(id, title, price) {
  let cart = []
  try {
    cart = JSON.parse(localStorage.getItem('zune_cart')) || []
  } catch (e) {
    cart = []
  }

  const existing = cart.find(item => item.id === id)
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1
  } else {
    cart.push({ id, title, price, quantity: 1 })
  }

  localStorage.setItem('zune_cart', JSON.stringify(cart))
  alert(`"${title}" imeongezwa kwenye kikapu!`)
}
