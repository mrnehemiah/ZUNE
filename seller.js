
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ============================================
// ZUNE SELLER APPLICATION — PART 1/2
// SUPABASE + LOCATION DROPDOWNS
// ============================================

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wO3V1uf';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const LOCATION_API =
  'https://api.openadmindata.org/api/v1/countries/';

const $ = (id) => document.getElementById(id);

const getValue = (id) =>
  String($(id)?.value || '').trim();

const sellerForm = $('sellerForm');
const countrySelect = $('country');
const regionSelect = $('region');
const originalDistrict = $('district');
const statusCard = $('statusCard');

let locationData = null;
let locationLevels = [];
let locationReady = false;
let locationLoading = false;
let locationError = '';

const locationSelects = [];

const COUNTRY_CONFIG = {
  tz: {
    name: 'Tanzania',
    code: 'tz',
    levels: ['region', 'district', 'ward'],
    labels: ['Mkoa', 'Wilaya', 'Kata']
  },
  ke: {
    name: 'Kenya',
    code: 'ke',
    levels: ['county', 'subcounty', 'ward'],
    labels: ['County', 'Sub-county', 'Ward']
  },
  ug: {
    name: 'Uganda',
    code: 'ug',
    levels: ['region', 'district', 'county', 'subcounty'],
    labels: ['Region', 'District', 'County', 'Sub-county']
  }
};

function normalizeCountry(value) {
  const v = String(value || '').trim().toLowerCase();

  if (['tz', 'tza', 'tanzania', 'united republic of tanzania'].includes(v)) {
    return COUNTRY_CONFIG.tz;
  }

  if (['ke', 'ken', 'kenya'].includes(v)) {
    return COUNTRY_CONFIG.ke;
  }

  if (['ug', 'uga', 'uganda'].includes(v)) {
    return COUNTRY_CONFIG.ug;
  }

  return null;
}

function showMessage(message) {
  alert(message);
}

function setSubmitButton(loading) {
  const button = $('submitBtn');
  if (!button) return;

  button.disabled = loading;
  button.innerHTML = loading
    ? '<i class="fa-solid fa-spinner fa-spin"></i> Inatuma...'
    : '<i class="fa-solid fa-paper-plane"></i> Tuma Maombi Sasa';
}

function resetSelect(select, label) {
  if (!select) return;

  select.replaceChildren();

  const option = document.createElement('option');
  option.value = '';
  option.textContent = label;
  select.appendChild(option);

  select.disabled = true;
}

function makeSelect(id, label, afterElement) {
  let select = $(id);

  if (!select) {
    select = document.createElement('select');
    select.id = id;
    select.name = id;
    select.className =
      'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800';

    const wrapper = document.createElement('div');
    wrapper.className = 'mt-3';

    const caption = document.createElement('label');
    caption.htmlFor = id;
    caption.className = 'mb-2 block text-sm font-semibold';
    caption.textContent = label;

    wrapper.append(caption, select);

    if (afterElement?.parentElement) {
      afterElement.insertAdjacentElement('afterend', wrapper);
    } else if (sellerForm) {
      sellerForm.appendChild(wrapper);
    }
  } else {
    const labelElement = document.querySelector(
      `label[for="${id}"]`
    );

    if (labelElement) labelElement.textContent = label;
  }

  select.required = true;
  return select;
}

function prepareLocationSelects(config) {
  const firstLabel = config.labels[0];

  if (regionSelect) {
    const label = document.querySelector(
      'label[for="region"]'
    );

    if (label) label.textContent = firstLabel;
    regionSelect.required = true;
  }

  if (originalDistrict && originalDistrict.tagName !== 'SELECT') {
    const replacement = document.createElement('select');

    replacement.id = originalDistrict.id;
    replacement.name = originalDistrict.name || 'district';
    replacement.className = originalDistrict.className;
    replacement.required = true;

    const label = document.querySelector(
      'label[for="district"]'
    );

    if (label) {
      label.textContent = config.labels[1] || 'Wilaya';
    }

    originalDistrict.replaceWith(replacement);
  }

  locationSelects.length = 0;

  if (regionSelect) locationSelects.push(regionSelect);

  const districtSelect = $('district');
  if (districtSelect) locationSelects.push(districtSelect);

  let previous = districtSelect;

  for (let i = 2; i < config.levels.length; i++) {
    const id = `zuneLocationLevel${i + 1}`;

    const select = makeSelect(
      id,
      config.labels[i],
      previous
    );

    locationSelects.push(select);
    previous = select;
  }

  // Ficha dropdowns za nchi zilizokuwa na levels nyingi.
  for (let i = config.levels.length; i < 4; i++) {
    const old = $(`zuneLocationLevel${i + 1}`);

    if (old) {
      const wrapper = old.parentElement;
      if (wrapper) wrapper.remove();
    }
  }

  locationSelects.forEach((select, index) => {
    resetSelect(
      select,
      `Chagua ${config.labels[index] || 'eneo'}`
    );

    select.onchange = () => {
      updateChildLocations(index);
    };
  });
}

function getLevelRecords(levelName) {
  const records = locationData?.data?.[levelName];

  return Array.isArray(records) ? records : [];
}

function getRecordName(record) {
  return (
    record.name_local ||
    record.name_en ||
    record.name ||
    record.slug ||
    ''
  );
}

function populateSelect(select, records, placeholder) {
  if (!select) return;

  resetSelect(select, placeholder);

  records
    .slice()
    .sort((a, b) =>
      getRecordName(a).localeCompare(getRecordName(b))
    )
    .forEach((record) => {
      const option = document.createElement('option');

      option.value = record.id;
      option.textContent = getRecordName(record);

      select.appendChild(option);
    });

  select.disabled = false;
}

function getSelectedRecord(index) {
  const select = locationSelects[index];
  if (!select?.value) return null;

  const level = locationLevels[index];

  return getLevelRecords(level).find(
    (record) => String(record.id) === String(select.value)
  ) || null;
}

function updateChildLocations(changedIndex) {
  for (let i = changedIndex + 1; i < locationSelects.length; i++) {
    resetSelect(
      locationSelects[i],
      `Chagua ${COUNTRY_CONFIG[normalizeCountry(countrySelect?.value)?.code]?.labels[i] || 'eneo'}`
    );
  }

  for (
    let childIndex = changedIndex + 1;
    childIndex < locationSelects.length;
    childIndex++
  ) {
    const parent = getSelectedRecord(childIndex - 1);

    if (!parent) return;

    const level = locationLevels[childIndex];

    const children = getLevelRecords(level).filter(
      (record) => String(record.parent_id) === String(parent.id)
    );

    const label =
      normalizeCountry(countrySelect?.value)?.labels[childIndex] ||
      'eneo';

    populateSelect(
      locationSelects[childIndex],
      children,
      `Chagua ${label}`
    );
  }
}

async function loadLocationData() {
  const config = normalizeCountry(countrySelect?.value);

  locationReady = false;
  locationError = '';
  locationData = null;

  if (!config) {
    throw new Error('Tafadhali chagua Tanzania, Kenya au Uganda.');
  }

  locationLoading = true;

  try {
    const response = await fetch(
      `${LOCATION_API}${config.code}.json`,
      { cache: 'default' }
    );

    if (!response.ok) {
      throw new Error('Imeshindikana kupakua orodha ya maeneo.');
    }

    const json = await response.json();

    if (!json?.data || !Array.isArray(json.data[config.levels[0]])) {
      throw new Error('Muundo wa data ya maeneo haujakaa sawa.');
    }

    locationData = json;
    locationLevels = config.levels;

    prepareLocationSelects(config);

    populateSelect(
      locationSelects[0],
      getLevelRecords(locationLevels[0]),
      `Chagua ${config.labels[0]}`
    );

    locationReady = true;
  } catch (error) {
    locationError = error.message || 'Hitilafu ya kupakia maeneo.';
    locationReady = false;

    locationSelects.forEach((select, i) =>
      resetSelect(select, `Orodha ya ${i + 1} haijapatikana`)
    );

    throw error;
  } finally {
    locationLoading = false;
  }
}

function getSelectedLocationNames() {
  return locationSelects.map((select) => {
    if (!select?.value) return '';

    const option = select.options[select.selectedIndex];
    return option?.textContent?.trim() || '';
  });
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error(
      'Tafadhali ingia kwenye akaunti yako kabla ya kuomba kuwa muuzaji.'
    );
  }

  return data.user;
}

async function getOwnerName(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!error && data?.full_name?.trim()) {
    return data.full_name.trim();
  }

  return String(
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    getValue('owner_name')
  ).trim();
}

 // ============================================
 // ZUNE SELLER APPLICATION — PART 2/2
 // VALIDATION + SUBMISSION + STATUS
 // ============================================

function displayApplicationStatus(application) {
  if (!statusCard || !application) return;

  const badge = $('statusBadge');
  const message = $('statusMessage');
  const icon = $('statusIcon');

  const status = String(application.status || 'pending').toLowerCase();

  statusCard.classList.remove('hidden');

  if (badge) {
    badge.className =
      'text-xs font-bold px-3 py-1 rounded-full uppercase';
  }

  if (icon) {
    icon.className =
      'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold';
  }

  if (status === 'approved' || status === 'accepted') {
    badge?.classList.add('bg-emerald-100', 'text-emerald-700');
    if (badge) badge.textContent = 'APPROVED';

    if (message) {
      message.textContent =
        'Hongera! Maombi yako yamekubaliwa. Fuata maelekezo ya akaunti yako kuanza kuweka bidhaa.';
    }

    if (icon) {
      icon.classList.add('bg-emerald-500');
      icon.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
  } else if (status === 'rejected') {
    badge?.classList.add('bg-rose-100', 'text-rose-700');
    if (badge) badge.textContent = 'REJECTED';

    if (message) {
      message.textContent =
        'Maombi yako hayajakubaliwa. Tafadhali wasiliana na Admin kwa maelezo zaidi.';
    }

    if (icon) {
      icon.classList.add('bg-rose-500');
      icon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }
  } else {
    badge?.classList.add('bg-amber-100', 'text-amber-700');
    if (badge) badge.textContent = 'PENDING';

    if (message) {
      message.textContent =
        'Maombi yako yamepokelewa na yanasubiri kukaguliwa na Admin.';
    }

    if (icon) {
      icon.classList.add('bg-amber-500');
      icon.innerHTML = '<i class="fa-solid fa-clock"></i>';
    }
  }
}

async function checkApplicationStatus() {
  if (!statusCard) return;

  try {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('seller_applications')
      .select('id, store_name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Status check failed:', error.message);
      return;
    }

    if (data?.length) {
      displayApplicationStatus(data[0]);
    }
  } catch (error) {
    console.warn('Status check:', error.message);
  }
}

function validateApplication(formData) {
  const required = [
    ['store_name', 'Jina la duka'],
    ['owner_name', 'Jina la mmiliki'],
    ['phone', 'Namba ya simu'],
    ['country', 'Nchi'],
    ['city', 'Kata au eneo la mwisho'],
    ['region', 'Mkoa au eneo la kwanza'],
    ['district', 'Wilaya au eneo la pili'],
    ['category', 'Aina ya biashara'],
    ['id_type', 'Aina ya kitambulisho'],
    ['id_number', 'Namba ya kitambulisho']
  ];

  for (const [key, label] of required) {
    if (!String(formData[key] || '').trim()) {
      throw new Error(`Tafadhali chagua au jaza: ${label}.`);
    }
  }

  if (!formData.user_id) {
    throw new Error('Akaunti haijathibitishwa. Ingia tena.');
  }
}

async function submitSellerApplication(event) {
  event.preventDefault();

  if (locationLoading) {
    showMessage('Subiri orodha ya maeneo imalize kupakia.');
    return;
  }

  setSubmitButton(true);

  try {
    const user = await getAuthenticatedUser();

    if (!locationReady || !locationData) {
      throw new Error(
        locationError ||
        'Orodha ya maeneo haijapakiwa. Chagua nchi tena na ujaribu.'
      );
    }

    const names = getSelectedLocationNames();

    if (names.some((name) => !name)) {
      throw new Error(
        'Tafadhali chagua kila eneo kwenye orodha kuanzia eneo la kwanza hadi la mwisho.'
      );
    }

    const ownerName = await getOwnerName(user);

    if (!ownerName) {
      throw new Error(
        'Jina la mmiliki halijapatikana. Jaza jina lako kwenye profile ya akaunti.'
      );
    }

    const config = normalizeCountry(countrySelect.value);

    // Hifadhi majina yaliyochaguliwa, si UUID za API.
    const region = names[0];
    const district = names[1];
    const finalArea = names[names.length - 1];

    const addressParts = [
      ...names.slice(2),
      getValue('street')
    ].filter(Boolean);

    const storeName = getValue('bizName');
    const phone = getValue('phone');
    const country = config.name;
    const category = getValue('bizCategory');
    const idType = getValue('idType');
    const idNumber = getValue('idNumber');

    const formData = {
      user_id: user.id,
      store_name: storeName,
      owner_name: ownerName,
      phone,
      country,
      city: finalArea,
      region,
      district,
      address: addressParts.join(', ') || null,
      street: getValue('street') || null,
      business_name: storeName,
      category,
      email: getValue('email') || user.email || null,
      id_type: idType,
      id_number: idNumber,
      tin_number: getValue('tinNumber') || null,
      status: 'pending'
    };

    validateApplication(formData);

    // Zuia ombi jipya ikiwa akaunti hii tayari ina ombi
    // linalosubiri au lililokubaliwa.
    const { data: existing, error: existingError } = await supabase
      .from('seller_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'accepted'])
      .limit(1);

    if (existingError) {
      throw new Error(
        'Imeshindikana kukagua maombi ya awali: ' +
        existingError.message
      );
    }

    if (existing?.length) {
      await checkApplicationStatus();

      throw new Error(
        'Akaunti hii tayari ina ombi linalosubiri au lililokubaliwa. Angalia hali ya ombi lako.'
      );
    }

    const { data, error } = await supabase
      .from('seller_applications')
      .insert([formData])
      .select('id, store_name, status, created_at')
      .single();

    if (error) throw error;

    displayApplicationStatus(data);

    showMessage(
      'Hongera! Maombi yako yametumwa. Yanasubiri kukaguliwa na Admin.'
    );

    sellerForm.reset();

    // Rudisha orodha ya maeneo baada ya reset.
    await loadLocationData();

  } catch (error) {
    console.error('ZUNE seller application:', error);

    let message = error.message || 'Jaribu tena baada ya muda.';

    if (error.code === '23505') {
      message = 'Ombi lenye taarifa hizi linaweza kuwa tayari lipo.';
    } else if (error.code === '23502') {
      message = 'Taarifa muhimu haijatumwa. Kagua fomu na columns za database.';
    } else if (error.code === '42501') {
      message =
        'Ruhusa ya database imekataa ombi. Kagua sera za RLS.';
    } else if (error.code === 'PGRST204') {
      message =
        'Database haijatambua column fulani. Kagua schema ya seller_applications.';
    }

    showMessage('Kuna tatizo wakati wa kutuma maombi: ' + message);
  } finally {
    setSubmitButton(false);
  }
}

async function initializeSellerApplication() {
  if (countrySelect) {
    countrySelect.addEventListener('change', async () => {
      try {
        await loadLocationData();
      } catch (error) {
        console.error('Location loading failed:', error);
        showMessage(
          'Imeshindikana kupakia maeneo: ' + error.message
        );
      }
    });
  }

  if (sellerForm) {
    sellerForm.addEventListener(
      'submit',
      submitSellerApplication
    );
  }

  try {
    if (countrySelect?.value) {
      await loadLocationData();
    } else {
      locationReady = false;
      locationError = 'Chagua nchi kwanza ili kupakia maeneo.';
    }
  } catch (error) {
    console.error('Initial location load failed:', error);
  }

  await checkApplicationStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeSellerApplication,
    { once: true }
  );
} else {
  initializeSellerApplication();
}
