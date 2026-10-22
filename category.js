import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let allCategoryProducts = []

// 1. Vuta Bidhaa Zote Kutoka Supabase
async function loadProductsForCategories() {
  const gridEl = document.getElementById('category-products-grid')
  
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading products:', error)
    return
  }

  allCategoryProducts = products || []
  renderCategoryProducts(allCategoryProducts, "Bidhaa Zote")
}

// 2. Onyesha Bidhaa kwenye Grid
function renderCategoryProducts(products, categoryName) {
  const gridEl = document.getElementById('category-products-grid')
  const titleEl = document.getElementById('selected-category-title')
  const countEl = document.getElementById('product-count')

  if (titleEl) titleEl.innerText = `Kategoria: ${categoryName}`
  if (countEl) countEl.innerText = `${products.length} Zimepatikana`
  if (!gridEl) return

  gridEl.innerHTML = ''

  if (products.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full text-center py-10 bg-white rounded-2xl border border-slate-100">
        <i class="fa-solid fa-box-open text-slate-300 text-3xl mb-2"></i>
        <p class="text-xs text-slate-500 font-semibold">Hakuna bidhaa zilizopatikana kwenye kategoria hii.</p>
      </div>
    `
    return
  }

  products.forEach(p => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-2xl border border-slate-100 p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition'
    card.innerHTML = `
      <div>
        <div class="h-28 bg-slate-50 rounded-xl overflow-hidden mb-2">
          <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.title}" class="w-full h-full object-cover">
        </div>
        <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${p.title}</h4>
      </div>
      <div class="mt-2">
        <p class="text-blue-600 font-brand font-extrabold text-xs mb-1.5">TZS ${Number(p.price).toLocaleString()}</p>
        <button onclick="alert('Imeongezwa kwenye kikapu!')" class="w-full bg-blue-600 text-white text-[10px] py-1.5 rounded-lg font-bold">
          Nunua
        </button>
      </div>
    `
    gridEl.appendChild(card)
  })
}

// 3. Filter kulingana na Kategoria
window.filterByCategory = function(category) {
  const filtered = allCategoryProducts.filter(p => 
    p.category === category || 
    p.title.toLowerCase().includes(category.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(category.toLowerCase()))
  )
  renderCategoryProducts(filtered.length > 0 ? filtered : allCategoryProducts, category)
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadProductsForCategories()

  // Search filter
  const searchInput = document.getElementById('catSearchInput')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase()
      const filtered = allCategoryProducts.filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      )
      renderCategoryProducts(filtered, q ? `Matokeo ya: "${q}"` : "Bidhaa Zote")
    })
  }
})
