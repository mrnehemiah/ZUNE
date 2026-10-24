
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ============================================
// ZUNE - SELLER APPLICATION SYSTEM
// Supabase + Authentication + Application Status
// ============================================

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co'

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

// ============================================
// 2. COUNTRY AND REGION DATA
// ============================================

const countryRegions = {
  Tanzania: [
    'Dar es Salaam',
    'Arusha',
    'Dodoma',
    'Mwanza',
    'Kilimanjaro',
    'Tanga',
    'Mbeya',
    'Zanzibar',
    'Morogoro',
    'Iringa',
    'Kagera',
    'Tabora',
    'Ruvuma',
    'Shinyanga',
    'Mara',
    'Lindi',
    'Mtwara'
  ],

  Kenya: [
    'Nairobi',
    'Mombasa',
    'Kisumu',
    'Nakuru',
    'Eldoret',
    'Kiambu',
    'Machakos',
    'Kajiado',
    'Garissa'
  ],

  Uganda: [
    'Kampala',
    'Gulu',
    'Lira',
    'Mbarara',
    'Jinja',
    'Entebbe',
    'Mbale',
    'Kasese'
  ]
}

// ============================================
// 3. DOM ELEMENTS
// ============================================

const countrySelect = document.getElementById('country')
const regionSelect = document.getElementById('region')
const sellerForm = document.getElementById('sellerForm')
const statusCard = document.getElementById('statusCard')

const getElement = (id) => document.getElementById(id)

const getValue = (id) => {
  const element = getElement(id)
  return element ? element.value.trim() : ''
}

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function showMessage(message) {
  alert(message)
}

function setSubmitButton(loading) {
  const button = getElement('submitBtn')

  if (!button) return

  button.disabled = loading

  button.innerHTML = loading
    ? '<i class="fa-solid fa-spinner fa-spin"></i> Inatuma...'
    : '<i class="fa-solid fa-paper-plane"></i> Tuma Maombi Sasa'
}

function getErrorMessage(error) {
  if (!error) return 'Hitilafu isiyojulikana.'

  if (error.code === '23505') {
    return 'Ombi lenye taarifa hizi linaweza kuwa tayari lipo.'
  }

  if (error.code === '23502') {
    return 'Kuna taarifa muhimu ambayo haijatumwa. Tafadhali kagua fomu.'
  }

  if (error.code === '42501') {
    return 'Huna ruhusa ya kufanya kitendo hiki. Kagua sera za usalama za Supabase.'
  }

  if (error.code === 'PGRST204') {
    return 'Muundo wa database haujaendana na fomu. Kagua columns za seller_applications.'
  }

  return error.message || 'Jaribu tena baada ya muda.'
}

// ============================================
// 5. UPDATE REGIONS
// ============================================

function updateRegions() {
  if (!countrySelect || !regionSelect) return

  const selectedCountry = countrySelect.value
  const regions = countryRegions[selectedCountry] || []

  regionSelect.innerHTML = ''

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = 'Chagua mkoa'
  regionSelect.appendChild(placeholder)

  regions.forEach((region) => {
    const option = document.createElement('option')

    option.value = region
    option.textContent = region

    regionSelect.appendChild(option)
  })
}

// ============================================
// 6. GET AUTHENTICATED USER
// ============================================

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(
      'Imeshindikana kuthibitisha akaunti yako. Ingia tena.'
    )
  }

  if (!data.user) {
    throw new Error(
      'Tafadhali ingia kwenye akaunti yako kabla ya kuomba kuwa muuzaji.'
    )
  }

  return data.user
}

// ============================================
// 7. GET OWNER NAME
// ============================================

async function getOwnerName(user) {
  // Kwanza jaribu jina lililohifadhiwa kwenye profiles.
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!error && data?.full_name?.trim()) {
    return data.full_name.trim()
  }

  // Tumia jina la akaunti ikiwa profile haisomeki.
  const metadataName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    ''

  return String(metadataName).trim()
}

// ============================================
// 8. DISPLAY APPLICATION STATUS
// ============================================

function displayApplicationStatus(application) {
  if (!statusCard || !application) return

  const badge = getElement('statusBadge')
  const message = getElement('statusMessage')
  const icon = getElement('statusIcon')

  const status = String(
    application.status || 'pending'
  ).toLowerCase()

  statusCard.classList.remove('hidden')

  if (badge) {
    badge.className =
      'text-xs font-bold px-3 py-1 rounded-full uppercase'
  }

  if (icon) {
    icon.className =
      'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold'
  }

  if (status === 'approved') {
    if (badge) {
      badge.classList.add(
        'bg-emerald-100',
        'text-emerald-700'
      )
      badge.textContent = 'APPROVED'
    }

    if (message) {
      message.textContent =
        'Hongera! Maombi yako yamekubaliwa. Sasa unaweza kuanza kuweka bidhaa.'
    }

    if (icon) {
      icon.classList.add('bg-emerald-500')
      icon.innerHTML = '<i class="fa-solid fa-check"></i>'
    }

    return
  }

  if (status === 'rejected') {
    if (badge) {
      badge.classList.add(
        'bg-rose-100',
        'text-rose-700'
      )
      badge.textContent = 'REJECTED'
    }

    if (message) {
      message.textContent =
        'Pole, maombi yako hayakukubaliwa na Admin. Tafadhali wasiliana na Admin kwa maelezo zaidi.'
    }

    if (icon) {
      icon.classList.add('bg-rose-500')
      icon.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    }

    return
  }

  if (badge) {
    badge.classList.add(
      'bg-amber-100',
      'text-amber-700'
    )
    badge.textContent = 'PENDING'
  }

  if (message) {
    message.textContent =
      'Maombi yako yamepokelewa na yanasubiri kukaguliwa na Admin.'
  }

  if (icon) {
    icon.classList.add('bg-amber-500')
    icon.innerHTML = '<i class="fa-solid fa-clock"></i>'
  }
}

// ============================================
// 9. CHECK APPLICATION STATUS
// ============================================

async function checkApplicationStatus() {
  if (!statusCard) return

  try {
    const user = await getAuthenticatedUser()

    // Tumia simu iliyohifadhiwa kwa mtumiaji huyu.
    const savedPhone = localStorage.getItem(
      `zune_seller_phone_${user.id}`
    )

    if (!savedPhone) return

    const { data, error } = await supabase
      .from('seller_applications')
      .select('id, store_name, status, phone')
      .eq('phone', savedPhone)
      .maybeSingle()

    if (error) {
      console.warn(
        'Application status could not be loaded:',
        error.message
      )
      return
    }

    if (data) {
      displayApplicationStatus(data)
    }
  } catch (error) {
    console.warn(
      'Status check:',
      error.message
    )
  }
}

// ============================================
// 10. VALIDATE APPLICATION FORM
// ============================================

function validateApplication(formData) {
  const requiredFields = [
    ['store_name', 'Jina la duka'],
    ['owner_name', 'Jina la mmiliki'],
    ['phone', 'Namba ya simu'],
    ['country', 'Nchi'],
    ['city', 'Jiji au eneo la biashara']
  ]

  for (const [field, label] of requiredFields) {
    if (
      typeof formData[field] !== 'string' ||
      !formData[field].trim()
    ) {
      throw new Error(
        `Tafadhali jaza sehemu ya: ${label}.`
      )
    }
  }

  if (!formData.category) {
    throw new Error(
      'Tafadhali chagua aina ya biashara.'
    )
  }

  if (!formData.id_type || !formData.id_number) {
    throw new Error(
      'Tafadhali jaza aina na namba ya kitambulisho.'
    )
  }
}

// ============================================
// 11. SUBMIT SELLER APPLICATION
// ============================================

async function submitSellerApplication(event) {
  event.preventDefault()

  setSubmitButton(true)

  try {
    // A. Hakikisha mtumiaji ameingia.
    const user = await getAuthenticatedUser()

    // B. Pata taarifa za fomu.
    const businessName = getValue('bizName')
    const ownerName = await getOwnerName(user)
    const phone = getValue('phone')
    const country = getValue('country')
    const region = getValue('region')
    const district = getValue('district')
    const street = getValue('street')

    // C. Tumia city field ikiwa ipo.
    // Kama haipo, tumia district kama eneo la biashara.
    const city = getValue('city') || district

    if (!ownerName) {
      throw new Error(
        'Jina la mmiliki halijapatikana. Tafadhali jaza jina lako kwenye profile ya akaunti, kisha ujaribu tena.'
      )
    }

    // D. Tengeneza data kulingana na database.
    const formData = {
      store_name: businessName,
      owner_name: ownerName,
      phone: phone,
      country: country,
      city: city,

      business_name: businessName,
      category: getValue('bizCategory'),
      region: region || null,
      district: district || null,
      street: street || null,
      address: street || null,

      email:
        getValue('email') ||
        user.email ||
        null,

      id_type: getValue('idType'),
      id_number: getValue('idNumber'),
      tin_number: getValue('tinNumber') || null,

      status: 'pending'
    }

    // E. Hakiki taarifa muhimu kabla ya kutuma.
    validateApplication(formData)

    // F. Tuma ombi kwenye Supabase.
    const { data, error } = await supabase
      .from('seller_applications')
      .insert([formData])
      .select('id, store_name, status, phone')
      .single()

    if (error) {
      throw error
    }

    // G. Hifadhi simu kwa status check ya mtumiaji huyu.
    localStorage.setItem(
      `zune_seller_phone_${user.id}`,
      phone
    )

    // H. Onyesha taarifa ya mafanikio.
    if (data) {
      displayApplicationStatus(data)
    }

    showMessage(
      'Hongera! Maombi yako yametumwa kikamilifu. Yanasubiri kukaguliwa na Admin.'
    )

    // Usilazimishe reload ili status ionekane.
    sellerForm.reset()

    updateRegions()

    setSubmitButton(false)

  } catch (error) {
    console.error(
      'Seller application submission failed:',
      error
    )

    showMessage(
      'Kuna tatizo wakati wa kutuma maombi: ' +
      getErrorMessage(error)
    )

    setSubmitButton(false)
  }
}

// ============================================
// 12. INITIALIZE APPLICATION PAGE
// ============================================

function initializeSellerApplication() {
  updateRegions()

  if (countrySelect) {
    countrySelect.addEventListener(
      'change',
      updateRegions
    )
  }

  if (sellerForm) {
    sellerForm.addEventListener(
      'submit',
      submitSellerApplication
    )
  }

  checkApplicationStatus()
}

// Hakikisha initialization inafanya kazi
// hata script ikipakiwa baada ya DOMContentLoaded.
if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeSellerApplication,
    { once: true }
  )
} else {
  initializeSellerApplication()
}
