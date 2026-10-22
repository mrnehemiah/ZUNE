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

// 1. VUTA BIDHAA KUTOKA SUPABASE
async function fetchProducts() {
  if (!loadingEl || !productsGridEl) return

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    loadingEl.innerHTML = '<p class="text-red-500 text-sm font-medium">Kuna tatizo la kupakia bidhaa za Supabase.</p>'
    console.error('Error fetching products:', error)
    return
  }

  loadingEl.style.display = 'none'
  allProducts = products || []
  renderProducts(allProducts)
}

// 2. ONYESHA BIDHAA KWENYE SCREEN
function renderProducts(productsToDisplay) {
  if (!productsGridEl) return
  productsGridEl.innerHTML = ''

  if (productsToDisplay.length === 0) {
    productsGridEl.innerHTML = `
      <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <i class="fa-solid fa-box-open text-slate-300 text-4xl mb-3"></i>
        <p class="text-slate-600 font-semibold text-sm">Hakuna bidhaa zilizopatikana kwenye ZUNE.</p>
        <p class="text-xs text-slate-400 mt-1">Jaribu kutafuta kwa jina jingine au chagua kategoria tofauti.</p>
      </div>
    `
    return
  }

  productsToDisplay.forEach(product => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-2xl border border-slate-100 p-3 flex flex-col justify-between hover:border-blue-300 hover:shadow-xl transition duration-300 relative group'
    
    const priceFormatted = Number(product.price).toLocaleString()
    
    card.innerHTML = `
      <div>
        <div class="relative overflow-hidden rounded-xl mb-3 h-36 bg-slate-50 flex items-center justify-center">
          <img src="${product.image_url || 'https://via.placeholder.com/200'}" alt="${product.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <button onclick="toggleWishlist()" class="absolute top-2 right-2 bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500 h-8 w-8 rounded-full flex items-center justify-center shadow-sm transition">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
        <h4 class="font-bold text-xs md:text-sm text-slate-800 line-clamp-1">${product.title}</h4>
        <p class="text-[11px] text-slate-400 my-1 line-clamp-2">${product.description || 'Bidhaa bora kutoka ZUNE Marketplace'}</p>
      </div>
      <div class="mt-2">
        <p class="text-blue-600 font-brand font-extrabold text-sm mb-2">TZS ${priceFormatted}</p>
        <button onclick="addToCart('${product.id}', '${product.title.replace(/'/g, "\\'")}', ${product.price})" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-sm">
          <i class="fa-solid fa-cart-plus"></i> Ongeza Kikapu
        </button>
      </div>
    `
    productsGridEl.appendChild(card)
  })
}

// 3. SYSTEM YA KIKAPU (CART) NA VIPENDWA (WISHLIST)
window.addToCart = function(id, title, price) {
  cart.push({ id, title, price })
  updateHeaderCounts()
  alert(`"${title}" imeongezwa kwenye kikapu cha ZUNE!`)
}

window.toggleWishlist = function() {
  wishlistCount++
  updateHeaderCounts()
}

function updateHeaderCounts() {
  const cartBadges = document.querySelectorAll('.fa-cart-shopping + span')
  cartBadges.forEach(badge => badge.innerText = cart.length)

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0)
  const cartPriceElements = document.querySelectorAll('header p.font-bold')
  cartPriceElements.forEach(el => {
    if (el.innerText.includes('TZS') || el.innerText.includes('0')) {
      el.innerText = `TZS ${totalPrice.toLocaleString()}`
    }
  })

  const wishlistBadges = document.querySelectorAll('.fa-heart + span')
  wishlistBadges.forEach(badge => badge.innerText = wishlistCount)
}

// 4. SEARCH NA CATEGORY FILTER
function setupSearchAndFilters() {
  const searchInput = document.querySelector('input[placeholder="Tafuta bidhaa unayotaka..."]')
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
  if (searchInput) searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch() })

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
// 5. HERO AUTO SLIDER
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

  setInterval(() => {
    showSlide(currentSlide + 1)
  }, 4000)
}

// 6. SELLER APPLICATION & STATUS MANAGEMENT
const countryRegions = {
  Tanzania: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Kilimanjaro', 'Tanga', 'Mbeya', 'Zanzibar', 'Morogoro', 'Iringa', 'Kagera', 'Tabora', 'Ruvuma', 'Shinyanga', 'Mara', 'Lindi', 'Mtwara'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado', 'Garissa'],
  Uganda: ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Entebbe', 'Mbale', 'Kasese']
}

window.toggleSellerModal = function(show) {
  const modal = document.getElementById('sellerModal')
  if (modal) {
    if (show) {
      modal.classList.remove('hidden')
      checkApplicationStatus()
    } else {
      modal.classList.add('hidden')
    }
  }
}

function updateRegions() {
  const countrySelect = document.getElementById('country')
  const regionSelect = document.getElementById('region')
  if (!countrySelect || !regionSelect) return

  const regions = countryRegions[countrySelect.value] || []
  regionSelect.innerHTML = ''
  regions.forEach(r => {
    const opt = document.createElement('option')
    opt.value = r
    opt.textContent = r
    regionSelect.appendChild(opt)
  })
}

async function checkApplicationStatus() {
  const userPhone = localStorage.getItem('zune_seller_phone')
  const statusCard = document.getElementById('statusCard')
  if (!userPhone || !statusCard) return

  const { data, error } = await supabase
    .from('seller_applications')
    .select('*')
    .eq('phone', userPhone)
    .single()

  if (data) {
    statusCard.classList.remove('hidden')
    const badge = document.getElementById('statusBadge')
    const msg = document.getElementById('statusMessage')
    const icon = document.getElementById('statusIcon')

    if (data.status === 'approved') {
      badge.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-700'
      badge.innerText = 'APPROVED'
      msg.innerText = 'Hongera! Maombi yako yamekubaliwa. Sasa unaweza kuanza kuweka bidhaa.'
      icon.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-emerald-500'
      icon.innerHTML = '<i class="fa-solid fa-check"></i>'
    } else if (data.status === 'rejected') {
      badge.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-rose-100 text-rose-700'
      badge.innerText = 'REJECTED'
      msg.innerText = 'Pole, maombi yako hayakukubaliwa na Admin. Hakiki taarifa zako.'
      icon.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-rose-500'
      icon.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    } else {
      badge.className = 'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-amber-100 text-amber-700'
      badge.innerText = 'PENDING'
      msg.innerText = 'Maombi yako yamepokelewa na yanasubiri kukaguliwa na Admin.'
      icon.className = 'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold bg-amber-500'
      icon.innerHTML = '<i class="fa-solid fa-clock"></i>'
    }
  }
}

function setupSellerForm() {
  const countrySelect = document.getElementById('country')
  const sellerForm = document.getElementById('sellerForm')

  if (countrySelect) {
    updateRegions()
    countrySelect.addEventListener('change', updateRegions)
  }

  if (sellerForm) {
    sellerForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      const submitBtn = document.getElementById('submitBtn')
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Inatuma...'

      const formData = {
        business_name: document.getElementById('bizName').value,
        category: document.getElementById('bizCategory').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value || null,
        id_type: document.getElementById('idType').value,
        id_number: document.getElementById('idNumber').value,
        tin_number: document.getElementById('tinNumber').value || null,
        country: document.getElementById('country').value,
        region: document.getElementById('region').value,
        district: document.getElementById('district').value,
        street: document.getElementById('street').value,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('seller_applications')
        .insert([formData])

      if (error) {
        alert('Kuna tatizo wakati wa kutuma maombi: ' + error.message)
        submitBtn.disabled = false
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tuma Maombi Sasa'
      } else {
        localStorage.setItem('zune_seller_phone', formData.phone)
        alert('Maombi yako yametumwa kikamilifu! Utapata taarifa pindi admin atakapoyakagua.')
        toggleSellerModal(false)
        window.location.reload()
      }
    })
  }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts()
  setupSearchAndFilters()
  setupHeroSlider()
  setupSellerForm()
})
