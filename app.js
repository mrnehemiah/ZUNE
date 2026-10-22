import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase Configuration za ZUNE
const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fetchProducts() {
  const loading = document.getElementById('loading')
  const productsGrid = document.getElementById('products-grid')

  if (!loading || !productsGrid) return

  // Vuta bidhaa kutoka Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    loading.innerText = 'Kuna tatizo la kupakia bidhaa.'
    console.error('Error fetching products:', error)
    return
  }

  loading.style.display = 'none'

  if (!products || products.length === 0) {
    productsGrid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
        <p class="text-gray-500 font-medium">Hakuna bidhaa zilizowekwa bado kwenye ZUNE.</p>
        <p class="text-xs text-gray-400 mt-1">Bidhaa za kwanza zitakazowekwa zitaonekana hapa.</p>
      </div>
    `
    return
  }

  // Onyesha bidhaa
  products.forEach(product => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-lg shadow p-3 flex flex-col justify-between'
    
    card.innerHTML = `
      <div>
        <img src="${product.image_url || 'https://via.placeholder.com/150'}" alt="${product.title}" class="w-full h-32 object-cover rounded-md mb-2">
        <h4 class="font-bold text-sm text-gray-800 line-clamp-1">${product.title}</h4>
        <p class="text-xs text-gray-500 mb-2 line-clamp-2">${product.description || ''}</p>
      </div>
      <div>
        <p class="text-blue-600 font-extrabold text-sm mb-2">TSh ${Number(product.price).toLocaleString()}</p>
        <button class="w-full bg-blue-600 text-white text-xs py-2 rounded font-semibold hover:bg-blue-700">Agiza Sasa</button>
      </div>
    `
    productsGrid.appendChild(card)
  })
}

// Anzisha kazi
fetchProducts()
