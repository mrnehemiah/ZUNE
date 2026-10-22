import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Orodha ya Mikoa kulingana na Nchi
const countryRegions = {
  Tanzania: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Kilimanjaro', 'Tanga', 'Mbeya', 'Zanzibar', 'Morogoro', 'Iringa', 'Kagera', 'Tabora', 'Ruvuma', 'Shinyanga', 'Mara', 'Lindi', 'Mtwara'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado', 'Garissa'],
  Uganda: ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Entebbe', 'Mbale', 'Kasese']
}

// Dom Elements
const countrySelect = document.getElementById('country')
const regionSelect = document.getElementById('region')
const sellerForm = document.getElementById('sellerForm')
const statusCard = document.getElementById('statusCard')

// 1. Populate Regions Dynamic
function updateRegions() {
  if (!countrySelect || !regionSelect) return
  const selectedCountry = countrySelect.value
  const regions = countryRegions[selectedCountry] || []
  
  regionSelect.innerHTML = ''
  regions.forEach(r => {
    const opt = document.createElement('option')
    opt.value = r
    opt.textContent = r
    regionSelect.appendChild(opt)
  })
}

// 2. Angalia Status ya Maombi
async function checkApplicationStatus() {
  const userPhone = localStorage.getItem('zune_seller_phone')
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
      badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase bg-emerald-100 text-emerald-700'
      badge.innerText = 'APPROVED'
      msg.innerText = 'Hongera! Maombi yako yamekubaliwa. Sasa unaweza kuanza kuweka bidhaa.'
      icon.className = 'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold bg-emerald-500'
      icon.innerHTML = '<i class="fa-solid fa-check"></i>'
    } else if (data.status === 'rejected') {
      badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase bg-rose-100 text-rose-700'
      badge.innerText = 'REJECTED'
      msg.innerText = 'Pole, maombi yako hayakukubaliwa na Admin. Tafadhali hakiki taarifa zako.'
      icon.className = 'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold bg-rose-500'
      icon.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    } else {
      badge.className = 'text-xs font-bold px-3 py-1 rounded-full uppercase bg-amber-100 text-amber-700'
      badge.innerText = 'PENDING'
      msg.innerText = 'Maombi yako yamepokelewa na yanasubiri kukaguliwa na Admin.'
      icon.className = 'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold bg-amber-500'
      icon.innerHTML = '<i class="fa-solid fa-clock"></i>'
    }
  }
}

// 3. Submit Form Kwenda Supabase
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
      alert('Maombi yako yametumwa kikamilifu! Utapata taarifa hivi karibuni.')
      window.location.reload()
    }
  })
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  updateRegions()
  if (countrySelect) countrySelect.addEventListener('change', updateRegions)
  checkApplicationStatus()
})
