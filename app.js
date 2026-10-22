// Kusimamia Fomu ya Maombi ya Muuzaji (Vendor Application)
function setupVendorApplication() {
  const vendorModal = document.getElementById('vendorModal')
  const vendorForm = document.getElementById('vendorForm')
  
  // Kutafuta vitufe vyote vya "Uza Bidhaa" ili vionyeshe fomu
  const sellButtons = document.querySelectorAll('a:has(.fa-plus), button:has(.fa-plus)')

  window.toggleViewModel = function(show) {
    if (vendorModal) {
      if (show) vendorModal.classList.remove('hidden')
      else vendorModal.classList.add('hidden')
    }
  }

  sellButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      toggleViewModel(true)
    })
  })

  // Close modal function for the 'X' button
  window.toggleVendorModal = function(show) {
    if (vendorModal) {
      if (show) vendorModal.classList.remove('hidden')
      else vendorModal.classList.add('hidden')
    }
  }

  // Kusubmiti fomu kwenda Supabase (Jedwali la maombi au profiles)
  if (vendorForm) {
    vendorForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const bizName = document.getElementById('bizName').value
      const bizCategory = document.getElementById('bizCategory').value
      const bizPhone = document.getElementById('bizPhone').value
      const bizDesc = document.getElementById('bizDesc').value

      // Hapa tunaweza kuhifadhi maombi kwenye table ya Supabase (mfano: profiles au vendor_requests)
      alert(`Asante ${bizName}! Maombi yako yametumwa mafanikio. Tutayafanyia kazi na kukutaarifu kupitia namba ${bizPhone}.`)
      
      vendorForm.reset()
      toggleVendorModal(false)
    })
  }
}

// Iite kwenye DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setupVendorApplication()
})
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase Configuration
const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// System State
let cart = []
let wishlistCount = 0
let allProducts = []

// Dom Elements
const loadingEl = document.getElementById('loading')
const productsGridEl = document.getElementById('products-grid')

// 1. Vuta Bidhaa kutoka Supabase
async function fetchProducts() {
  if (!loadingEl || !productsGridEl) return

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    loadingEl.innerHTML = '<p class="text-red-500 text-sm">Kuna tatizo la kupakia bidhaa za Supabase.</p>'
    console.error('Error:', error)
    return
  }

  loadingEl.style.display = 'none'
  allProducts = products || []
  
  renderProducts(allProducts)
}

// 2. Onyesha Bidhaa kwenye Screen
function renderProducts(productsToDisplay) {
  productsGridEl.innerHTML = ''

  if (productsToDisplay.length === 0) {
    productsGridEl.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm">
        <i class="fa-solid fa-box-open text-gray-300 text-4xl mb-3"></i>
        <p class="text-gray-500 font-semibold">Hakuna bidhaa zilizopatikana kwenye ZUNE.</p>
        <p class="text-xs text-gray-400 mt-1">Jaribu kutafuta bidhaa nyingine au chagua aina tofauti.</p>
      </div>
    `
    return
  }

  productsToDisplay.forEach(product => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-2xl border p-3 flex flex-col justify-between hover:shadow-lg transition relative group'
    
    const priceFormatted = Number(product.price).toLocaleString()
    
    card.innerHTML = `
      <div>
        <div class="relative overflow-hidden rounded-xl mb-3 h-36 bg-gray-50 flex items-center justify-center">
          <img src="${product.image_url || 'https://via.placeholder.com/200'}" alt="${product.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <button onclick="toggleWishlist()" class="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 h-8 w-8 rounded-full flex items-center justify-center shadow-sm transition">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
        <h4 class="font-bold text-sm text-gray-800 line-clamp-1">${product.title}</h4>
        <p class="text-xs text-gray-400 my-1 line-clamp-2">${product.description || 'Bidhaa bora kutoka ZUNE Marketplace'}</p>
      </div>
      <div class="mt-2">
        <p class="text-blue-600 font-extrabold text-sm mb-2">TZS ${priceFormatted}</p>
        <button onclick="addToCart('${product.id}', '${product.title.replace(/'/g, "\\'")}', ${product.price})" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition">
          <i class="fa-solid fa-cart-plus"></i> Ongeza Kikapu
        </button>
      </div>
    `
    productsGridEl.appendChild(card)
  })
}

// 3. System ya Kikapu (Cart)
window.addToCart = function(id, title, price) {
  cart.push({ id, title, price })
  updateHeaderCounts()
  
  // Taarifa ndogo ya mafanikio
  alert(`"${title}" imeongezwa kwenye kikapu cha ZUNE!`)
}

// 4. System ya Vipendwa (Wishlist)
window.toggleWishlist = function() {
  wishlistCount++
  updateHeaderCounts()
}

// 5. Update Namba za Kikapu & Vipendwa kwenye Header
function updateHeaderCounts() {
  // Update Cart Count
  const cartBadges = document.querySelectorAll('.fa-cart-shopping + span')
  cartBadges.forEach(badge => {
    badge.innerText = cart.length
  })

  // Update Cart Total Price
  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0)
  const cartPriceElements = document.querySelectorAll('header p.font-bold')
  cartPriceElements.forEach(el => {
    if (el.innerText.includes('TZS') || el.innerText.includes('0')) {
      el.innerText = `TZS ${totalPrice.toLocaleString()}`
    }
  })

  // Update Wishlist Count
  const wishlistBadges = document.querySelectorAll('.fa-heart + span')
  wishlistBadges.forEach(badge => {
    badge.innerText = wishlistCount
  })
}

// 6. Search Functionality
function setupSearch() {
  const searchInput = document.querySelector('input[placeholder="Tafuta bidhaa..."]')
  const searchBtn = document.querySelector('header button:has(.fa-magnifying-glass)')

  const performSearch = () => {
    const query = searchInput?.value.toLowerCase().trim() || ''
    const filtered = allProducts.filter(p => 
      p.title.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query))
    )
    renderProducts(filtered)
  }

  if (searchBtn) searchBtn.addEventListener('click', performSearch)
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') performSearch()
    })
  }
}

// 7. Category Filter
function setupCategoryFilters() {
  const categoryCards = document.querySelectorAll('section .grid > div')
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const categoryName = card.querySelector('p')?.innerText.toLowerCase() || ''
      
      const filtered = allProducts.filter(p => 
        p.title.toLowerCase().includes(categoryName) || 
        (p.description && p.description.toLowerCase().includes(categoryName))
      )
      renderProducts(filtered.length > 0 ? filtered : allProducts)
    })
  })
}

// Anzisha kazi ukurasa unapo-load
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts()
  setupSearch()
  setupCategoryFilters()
})
// Function ya kuendesha Slider Automatically
function setupHeroSlider() {
  const slides = document.querySelectorAll('.slide')
  const dots = document.querySelectorAll('.dot')
  const prevBtn = document.getElementById('prevSlide')
  const nextBtn = document.getElementById('nextSlide')

  if (slides.length === 0) return

  let currentSlide = 0

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove('active')
      if (dots[i]) {
        dots[i].classList.remove('bg-blue-600')
        dots[i].classList.add('bg-slate-300')
      }
    })

    currentSlide = (index + slides.length) % slides.length
    slides[currentSlide].classList.add('active')
    if (dots[currentSlide]) {
      dots[currentSlide].classList.remove('bg-slate-300')
      dots[currentSlide].classList.add('bg-blue-600')
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide - 1))
  if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide + 1))

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => showSlide(index))
  })

  // Badilisha Bango Kiotomatiki kila baada ya Sekunde 4
  setInterval(() => {
    showSlide(currentSlide + 1)
  }, 4000)
}

// Hakikisha inajiendesha ukurasa unapofunguka
document.addEventListener('DOMContentLoaded', () => {
  setupHeroSlider()
})
