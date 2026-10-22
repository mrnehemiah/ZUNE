const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

let sellerProducts = []

window.addEventListener('load', () => {
  const storeHeader = document.getElementById('storeNameHeader')
  const savedStore = localStorage.getItem('zune_seller_store') || 'Duka Langu'
  if (storeHeader) storeHeader.innerText = savedStore

  const addForm = document.getElementById('addProductForm')
  if (addForm) {
    addForm.addEventListener('submit', handleAddProduct)
  }

  loadSellerData()
})

async function loadSellerData() {
  // Chukua bidhaa zilizohifadhiwa
  try {
    sellerProducts = JSON.parse(localStorage.getItem('zune_my_seller_products')) || []
  } catch (e) {
    sellerProducts = []
  }

  renderSellerProducts()
  updateStats()
}

function handleAddProduct(e) {
  e.preventDefault()

  const newProd = {
    id: Date.now().toString(),
    title: document.getElementById('prodTitle').value,
    category: document.getElementById('prodCategory').value,
    price: Number(document.getElementById('prodPrice').value),
    stock: Number(document.getElementById('prodStock').value),
    image_url: document.getElementById('prodImage').value,
    description: document.getElementById('prodDesc').value,
    created_at: new Date().toLocaleDateString('sw-TZ')
  }

  sellerProducts.unshift(newProd)
  localStorage.setItem('zune_my_seller_products', JSON.stringify(sellerProducts))

  // Pia weka kwenye kikapu kikuu cha sokoni cha LocalStorage
  let mainProducts = []
  try {
    mainProducts = JSON.parse(localStorage.getItem('zune_all_products')) || []
  } catch (e) { mainProducts = [] }
  
  mainProducts.unshift(newProd)
  localStorage.setItem('zune_all_products', JSON.stringify(mainProducts))

  alert("Hongera! Bidhaa yako imeongezwa sokoni kikamilifu.")
  document.getElementById('addProductForm').reset()
  renderSellerProducts()
  updateStats()
}

function renderSellerProducts() {
  const container = document.getElementById('sellerProductsGrid')
  const countBadge = document.getElementById('productsCountBadge')

  if (countBadge) countBadge.innerText = `${sellerProducts.length} Bidhaa`
  if (!container) return

  container.innerHTML = ''

  if (sellerProducts.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
        <i class="fa-solid fa-box-open text-slate-300 text-2xl mb-1"></i>
        <p class="text-xs text-slate-500 font-semibold">Haujaweka bidhaa yoyote bado.</p>
      </div>
    `
    return
  }

  sellerProducts.forEach((p, index) => {
    const card = document.createElement('div')
    card.className = 'bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3'
    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <img src="${p.image_url}" class="h-12 w-12 rounded-xl object-cover border border-slate-200">
        <div>
          <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${p.title}</h4>
          <p class="text-blue-600 font-bold text-[11px]">TZS ${Number(p.price).toLocaleString()}</p>
          <p class="text-[10px] text-slate-400">Stock: ${p.stock} | ${p.category}</p>
        </div>
      </div>
      <button onclick="deleteSellerProduct(${index})" class="text-rose-500 hover:text-rose-700 text-xs p-1">
        <i class="fa-solid fa-trash"></i>
      </button>
    `
    container.appendChild(card)
  })
}

window.deleteSellerProduct = function(index) {
  if (confirm("Je, una uhakika unataka kufuta bidhaa hii dukani kwako?")) {
    sellerProducts.splice(index, 1)
    localStorage.setItem('zune_my_seller_products', JSON.stringify(sellerProducts))
    renderSellerProducts()
    updateStats()
  }
}

function updateStats() {
  const statProducts = document.getElementById('stat-products')
  if (statProducts) statProducts.innerText = sellerProducts.length
}

window.sellerLogout = function() {
  if (confirm("Je, una uhakika unataka kutoka kwenye dashibodi?")) {
    window.location.href = './index.html'
  }
}
