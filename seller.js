// ================================================
// ZUNE SELLER.JS
// SEHEMU YA 1/4 — SUPABASE NA MIPANGILIO
// ================================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// API ya data za mikoa na wilaya za Tanzania.
const LOCATION_API =
  'https://api.openadmindata.org/api/v1/countries/tz.json';

const form = document.getElementById('sellerApplicationForm');
const regionSelect = document.getElementById('region');
const districtSelect = document.getElementById('district');
const submitButton = document.getElementById('submitSellerApplication');
const submitButtonText = document.getElementById('submitButtonText');

let locationData = null;
let isSubmitting = false;
let currentUser = null;

// Ujumbe wa fomu.
function showFormMessage(text, type = 'error') {
  if (window.zuneSellerForm?.showMessage) {
    window.zuneSellerForm.showMessage(text, type);
    return;
  }

  const box = document.getElementById('formMessage');

  if (box) {
    box.textContent = text;
    box.className = `form-message ${type}`;
    box.hidden = false;
  }
}

function clearFormMessage() {
  window.zuneSellerForm?.clearMessage();

  const box = document.getElementById('formMessage');

  if (box) {
    box.textContent = '';
    box.hidden = true;
  }
}

// Hali ya kitufe wakati wa kutuma.
function setSubmitting(value) {
  isSubmitting = value;

  if (submitButton) {
    submitButton.disabled = value;
    submitButton.setAttribute(
      'aria-busy',
      value ? 'true' : 'false'
    );
  }

  if (submitButtonText) {
    submitButtonText.textContent = value
      ? 'Inatuma maombi...'
      : 'Tuma maombi';
  }
}

// Chagua option ya kawaida ndani ya select.
function setSelectMessage(select, text) {
  if (!select) return;

  select.replaceChildren();

  const option = document.createElement('option');
  option.value = '';
  option.textContent = text;

  select.appendChild(option);
}

// Safisha thamani ya maandishi.
function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Hali ya awali ya fomu.
setSelectMessage(regionSelect, 'Inapakia mikoa...');
setSelectMessage(districtSelect, 'Chagua mkoa kwanza');

if (districtSelect) {
  districtSelect.disabled = true;
}// ================================================
// SEHEMU YA 2/4 — AKAUNTI NA MAENEO
// ================================================

// Mtumiaji lazima awe ameingia.
async function checkSignedInUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    showFormMessage(
      'Imeshindikana kuthibitisha akaunti yako. Tafadhali jaribu tena.'
    );
    return false;
  }

  currentUser = data.session?.user ?? null;

  if (currentUser) {
    return true;
  }

  const returnTo = encodeURIComponent('./seller.html');

  window.location.replace(
    `./login.html?redirect=${returnTo}`
  );

  return false;
}

// Hakikisha jibu la API ni sahihi.
async function fetchLocationData() {
  const response = await fetch(LOCATION_API, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'default'
  });

  if (!response.ok) {
    throw new Error(
      `Huduma ya maeneo imerudisha hitilafu (${response.status}).`
    );
  }

  const payload = await response.json();

  const regions = payload?.data?.region;
  const districts = payload?.data?.district;

  if (!Array.isArray(regions) || !Array.isArray(districts)) {
    throw new Error(
      'Muundo wa data za mikoa na wilaya haujatambulika.'
    );
  }

  return { regions, districts };
}

// Onyesha mikoa kwenye select.
async function loadRegions() {
  setSelectMessage(regionSelect, 'Inapakia mikoa...');
  regionSelect.disabled = true;

  try {
    if (!locationData) {
      locationData = await fetchLocationData();
    }

    const regions = [...locationData.regions].sort(
      (a, b) => getLocationName(a).localeCompare(
        getLocationName(b),
        'en'
      )
    );

    regionSelect.replaceChildren();

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Chagua mkoa';
    regionSelect.appendChild(placeholder);

    for (const region of regions) {
      const name = getLocationName(region);

      if (!name || !region.id) continue;

      const option = document.createElement('option');
      option.value = String(region.id);
      option.textContent = name;
      option.dataset.name = name;

      regionSelect.appendChild(option);
    }

    regionSelect.disabled = false;
    setSelectMessage(districtSelect, 'Chagua mkoa kwanza');
    districtSelect.disabled = true;
  } catch (error) {
    console.error('ZUNE locations:', error);

    setSelectMessage(
      regionSelect,
      'Imeshindikana kupakia mikoa — jaribu tena'
    );

    regionSelect.disabled = true;

    showFormMessage(
      'Imeshindikana kupakia mikoa ya Tanzania. Kagua intaneti kisha ujaribu tena.',
      'error'
    );
  }
}

// API ina name_en na name_local.
function getLocationName(item) {
  return cleanText(item?.name_en) ||
    cleanText(item?.name_local) ||
    '';
}

// Pata jina la mkoa uliochaguliwa.
function getSelectedRegionName() {
  const option = regionSelect?.selectedOptions?.[0];

  return option?.dataset?.name ||
    option?.textContent?.trim() ||
    '';
}

// Pakia wilaya zinazohusiana na mkoa uliochaguliwa.
function loadDistricts(regionId) {
  setSelectMessage(districtSelect, 'Inapakia wilaya...');
  districtSelect.disabled = true;

  if (!locationData || !regionId) {
    setSelectMessage(districtSelect, 'Chagua mkoa kwanza');
    return;
  }

  const matchingDistricts = locationData.districts
    .filter(district =>
      String(district.parent_id ?? '') === String(regionId)
    )
    .sort((a, b) =>
      getLocationName(a).localeCompare(
        getLocationName(b),
        'en'
      )
    );

  districtSelect.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = matchingDistricts.length
    ? 'Chagua wilaya'
    : 'Hakuna wilaya zilizopatikana';

  districtSelect.appendChild(placeholder);

  for (const district of matchingDistricts) {
    const name = getLocationName(district);

    if (!name || !district.id) continue;

    const option = document.createElement('option');
    option.value = String(district.id);
    option.textContent = name;
    option.dataset.name = name;

    districtSelect.appendChild(option);
  }

  districtSelect.disabled = matchingDistricts.length === 0;

  if (matchingDistricts.length === 0) {
    showFormMessage(
      'Hakuna wilaya zilizopatikana kwa mkoa huu. Tafadhali jaribu tena.',
      'error'
    );
  } else {
    clearFormMessage();
  }
}

// Mabadiliko ya mkoa hubadilisha wilaya.
regionSelect.addEventListener('change', () => {
  loadDistricts(regionSelect.value);
});

// Pata jina la wilaya iliyochaguliwa.
function getSelectedDistrictName() {
  const option = districtSelect?.selectedOptions?.[0];

  return option?.dataset?.name ||
    option?.textContent?.trim() ||
    '';
}// ================================================
// SEHEMU YA 3/4 — UKAGUZI NA DATA YA OMBI
// ================================================

function getValue(id) {
  return cleanText(document.getElementById(id)?.value);
}

// Hakikisha hatua ina taarifa zinazohitajika.
function validatePanel(stepNumber) {
  const panel = document.querySelector(
    `.step-panel[data-step="${stepNumber}"]`
  );

  if (!panel) return false;

  const requiredFields = [
    ...panel.querySelectorAll(
      'input[required], select[required], textarea[required]'
    )
  ];

  for (const field of requiredFields) {
    if (field.disabled) {
      showFormMessage(
        'Tafadhali subiri taarifa za eneo zipakiwe.'
      );
      field.focus();
      return false;
    }

    if (!field.checkValidity()) {
      field.reportValidity();
      field.focus();
      return false;
    }
  }

  return true;
}

// Ukaguzi wa taarifa zote kabla ya kutuma.
function validateAllSellerDetails() {
  if (!validatePanel(1)) {
    window.zuneSellerForm?.goToStep(1);
    return false;
  }

  if (!validatePanel(2)) {
    window.zuneSellerForm?.goToStep(2);
    return false;
  }

  if (!validatePanel(3)) {
    window.zuneSellerForm?.goToStep(3);
    return false;
  }

  if (!regionSelect.value || !districtSelect.value) {
    window.zuneSellerForm?.goToStep(2);

    showFormMessage(
      'Tafadhali chagua mkoa na wilaya ya biashara yako.'
    );

    return false;
  }

  if (!getSelectedRegionName() || !getSelectedDistrictName()) {
    window.zuneSellerForm?.goToStep(2);

    showFormMessage(
      'Mkoa au wilaya haijatambulika. Tafadhali chagua tena.'
    );

    return false;
  }

  return true;
}

// Kusanya taarifa zinazolingana na fomu mpya.
function buildSellerApplication() {
  const regionName = getSelectedRegionName();
  const districtName = getSelectedDistrictName();
  const street = getValue('street');
  const extraAddress = getValue('extra_address');

  const address = [street, extraAddress]
    .filter(Boolean)
    .join(', ');

  return {
    store_name: getValue('store_name'),
    owner_name: getValue('owner_name'),
    phone: getValue('phone'),
    country: 'Tanzania',

    // city ni NOT NULL katika schema tuliyoiona awali.
    city: regionName,
    region: regionName,
    district: districtName,
    address: address,

    category: getValue('category'),
    email: getValue('email') || null,
    tin_number: getValue('tin_number') || null,
    id_type: getValue('id_type'),
    id_number: getValue('id_number'),

    status: 'pending'
  };
}

// Thibitisha kuwa data ya ombi ina taarifa za msingi.
function validateApplicationPayload(application) {
  const requiredValues = [
    application.store_name,
    application.owner_name,
    application.phone,
    application.country,
    application.city,
    application.region,
    application.district,
    application.address,
    application.category,
    application.id_type,
    application.id_number
  ];

  return requiredValues.every(value =>
    typeof value === 'string' && value.trim().length > 0
  );
}

// Ujumbe rafiki kwa baadhi ya hitilafu za Supabase.
function getSubmissionErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (
    message.includes('row-level security') ||
    message.includes('rls') ||
    error?.code === '42501'
  ) {
    return 'Supabase imezuia ombi kwa sababu ya ruhusa za RLS. Sera ya INSERT ya seller_applications inahitaji kukaguliwa.';
  }

  if (
    message.includes('schema cache') ||
    message.includes('column') ||
    error?.code === 'PGRST204' ||
    error?.code === '42703'
  ) {
    return 'Muundo wa jedwali seller_applications hautoshelezi baadhi ya fields. Tunahitaji kulinganisha columns za jedwali na code.';
  }

  if (
    message.includes('duplicate') ||
    error?.code === '23505'
  ) {
    return 'Ombi lenye taarifa zinazofanana tayari lipo. Kagua hali ya ombi lako.';
  }

  if (
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return 'Muunganisho umeshindikana. Kagua intaneti kisha ujaribu tena.';
  }

  return error?.message
    ? `Ombi halijatumwa: ${error.message}`
    : 'Ombi halijatumwa. Tafadhali jaribu tena.';
}// ================================================
// SEHEMU YA 4/4 — SUBMISSION NA KUANZISHA
// ================================================

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (isSubmitting) return;

  clearFormMessage();

  // Hakikisha fomu nzima imekamilika.
  if (!validateAllSellerDetails()) return;

  // Hakikisha mtumiaji bado ameingia.
  setSubmitting(true);

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    currentUser = sessionData.session?.user ?? null;

    if (!currentUser) {
      const returnTo = encodeURIComponent('./seller.html');

      window.location.replace(
        `./login.html?redirect=${returnTo}`
      );

      return;
    }

    const application = buildSellerApplication();

    if (!validateApplicationPayload(application)) {
      showFormMessage(
        'Baadhi ya taarifa hazijakamilika. Kagua fomu yako.',
        'error'
      );
      return;
    }

    // Tuma ombi bila select() ili kuepuka kuhitaji
    // ruhusa ya kusoma rekodi iliyotumwa.
    const { error } = await supabase
      .from('seller_applications')
      .insert(application);

    if (error) {
      console.error('ZUNE seller application error:', error);

      showFormMessage(
        getSubmissionErrorMessage(error),
        'error'
      );

      return;
    }

    // Mafanikio huonyeshwa baada ya Supabase kukubali INSERT.
    showFormMessage(
      'Ombi lako limetumwa kwa mafanikio! Hali yake ni PENDING — linasubiri uhakiki wa timu ya ZUNE.',
      'success'
    );

    submitButtonText.textContent = 'Ombi limetumwa';
    submitButton.disabled = true;

    // Zuia kutuma tena ombi lilelile kutoka kwenye fomu hii.
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.disabled = true;
    });

    // Hifadhi hali ya kitufe baada ya kutuma kwa mafanikio.
    submitButton.disabled = true;

  } catch (error) {
    console.error('ZUNE seller submit exception:', error);

    showFormMessage(
      getSubmissionErrorMessage(error),
      'error'
    );

  } finally {
    if (!form.querySelector('.form-message.success')) {
      setSubmitting(false);
    }
  }
});

// ================================================
// KUANZISHA SELLER CENTER
// ================================================

async function initializeSellerCenter() {
  const signedIn = await checkSignedInUser();

  if (!signedIn) return;

  await loadRegions();
}

initializeSellerCenter();