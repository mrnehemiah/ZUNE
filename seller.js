// ============================================
// ZUNE SELLER APPLICATION
// SEHEMU YA 3/4
// SUPABASE, AUTHENTICATION NA MAENEO
// ============================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const form = document.getElementById('sellerApplicationForm');
const messageBox = document.getElementById('formMessage');
const submitButton = document.getElementById('submitSellerApplication');

const regionSelect = document.getElementById('region');
const districtSelect = document.getElementById('district');
const wardSelect = document.getElementById('ward');

let currentUser = null;
let locationRequestNumber = 0;

// Chanzo cha data za maeneo.
// Muundo halisi wa API lazima ulingane na huduma inayopatikana.
const LOCATION_API =
  'https://api.openadmindata.org/api/v1/countries/';

const COUNTRY_CONFIG = {
  Tanzania: {
    code: 'tz',
    regionLabel: 'Mkoa',
    districtLabel: 'Wilaya',
    wardLabel: 'Kata'
  },
  Kenya: {
    code: 'ke',
    regionLabel: 'Kaunti',
    districtLabel: 'Sub-county',
    wardLabel: 'Wadi'
  },
  Uganda: {
    code: 'ug',
    regionLabel: 'Eneo / Mkoa',
    districtLabel: 'Wilaya',
    wardLabel: 'Kaunti / eneo'
  }
};

function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = `message show ${type}`;
  messageBox.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
}

function clearMessage() {
  messageBox.textContent = '';
  messageBox.className = 'message';
}

function setOptions(select, records, placeholder) {
  select.replaceChildren();

  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);

  for (const record of records) {
    const option = document.createElement('option');

    if (typeof record === 'string') {
      option.value = record;
      option.textContent = record;
    } else {
      const name =
        record.name ??
        record.name_en ??
        record.title ??
        record.label ??
        record.region ??
        record.district ??
        record.ward;

      const value =
        record.id ??
        record.code ??
        record.slug ??
        name;

      if (!name || value === undefined || value === null) {
        continue;
      }

      option.value = String(value);
      option.textContent = String(name);
    }

    select.appendChild(option);
  }
}

function resetLocationSelects(countryName = '') {
  const config = COUNTRY_CONFIG[countryName];

  regionSelect.disabled = true;
  districtSelect.disabled = true;
  wardSelect.disabled = true;

  setOptions(
    regionSelect,
    [],
    config ? `Inapakia ${config.regionLabel}...` : 'Chagua nchi kwanza'
  );

  setOptions(
    districtSelect,
    [],
    config ? `Chagua ${config.regionLabel.toLowerCase()} kwanza` :
      'Chagua nchi kwanza'
  );

  setOptions(
    wardSelect,
    [],
    config ? `Chagua ${config.districtLabel.toLowerCase()} kwanza` :
      'Chagua nchi kwanza'
  );
}

function extractRecords(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    for (const key of [
      'data',
      'results',
      'records',
      'items',
      'regions',
      'districts',
      'wards',
      'states',
      'counties'
    ]) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }

  return [];
}

async function fetchLocationList(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Huduma ya maeneo imerudisha ${response.status}`);
  }

  const json = await response.json();
  return extractRecords(json);
}

function selectedCountry() {
  return form.querySelector('input[name="country"]:checked')?.value || '';
}

async function loadRegions(countryName) {
  const config = COUNTRY_CONFIG[countryName];

  resetLocationSelects(countryName);

  if (!config) return;

  const requestId = ++locationRequestNumber;

  try {
    // Endpoint hii inategemea muundo unaotolewa na API.
    const records = await fetchLocationList(
      `${LOCATION_API}${encodeURIComponent(config.code)}/regions`
    );

    if (requestId !== locationRequestNumber) return;

    if (!records.length) {
      setOptions(regionSelect, [], 'Orodha ya mikoa haipatikani');
      showMessage(
        'Orodha ya maeneo haijapatikana kutoka huduma ya data. ' +
        'Hatuwezi kuendelea hadi chanzo cha maeneo kithibitishwe.',
        'error'
      );
      return;
    }

    setOptions(
      regionSelect,
      records,
      `Chagua ${config.regionLabel.toLowerCase()}`
    );

    regionSelect.disabled = false;
    clearMessage();
  } catch (error) {
    console.error('ZUNE location error:', error);

    if (requestId !== locationRequestNumber) return;

    setOptions(regionSelect, [], 'Maeneo hayajapakiwa');
    showMessage(
      'Imeshindikana kupakia mikoa/maeneo. Chanzo cha API kinaweza ' +
      'kutumia anwani tofauti. Hakikisha URL ya huduma ya maeneo ni sahihi.',
      'error'
    );
  }
}

async function loadChildren(parentSelect, childSelect, level) {
  const countryName = selectedCountry();
  const config = COUNTRY_CONFIG[countryName];
  const parentValue = parentSelect.value;

  childSelect.disabled = true;

  if (level === 'district') {
    setOptions(districtSelect, [], 'Inapakia wilaya...');
    setOptions(wardSelect, [], 'Chagua wilaya kwanza');
    wardSelect.disabled = true;
  } else {
    setOptions(wardSelect, [], 'Inapakia kata/eneo...');
  }

  if (!config || !parentValue) return;

  const requestId = ++locationRequestNumber;

  try {
    const parentRecord =
      parentSelect.options[parentSelect.selectedIndex];

    const parentName = parentRecord?.textContent || parentValue;

    const url =
      `${LOCATION_API}${encodeURIComponent(config.code)}/` +
      `${level === 'district' ? 'regions' : 'districts'}/` +
      `${encodeURIComponent(parentValue)}/` +
      `${level === 'district' ? 'districts' : 'wards'}`;

    const records = await fetchLocationList(url);

    if (requestId !== locationRequestNumber) return;

    if (!records.length) {
      setOptions(
        childSelect,
        [],
        `Orodha ya maeneo haipatikani kwa ${parentName}`
      );
      showMessage(
        'Orodha ya wilaya au kata haikupatikana. Hakikisha endpoint ' +
        'ya API inaendana na huduma ya maeneo unayotumia.',
        'error'
      );
      return;
    }

    const placeholder = level === 'district'
      ? `Chagua ${config.districtLabel.toLowerCase()}`
      : `Chagua ${config.wardLabel.toLowerCase()}`;

    setOptions(childSelect, records, placeholder);
    childSelect.disabled = false;
    clearMessage();
  } catch (error) {
    console.error('ZUNE child location error:', error);

    if (requestId !== locationRequestNumber) return;

    setOptions(childSelect, [], 'Maeneo hayajapakiwa');
    showMessage(
      'Imeshindikana kupakia ngazi inayofuata ya eneo. ' +
      'API ya maeneo inahitaji kuthibitishwa.',
      'error'
    );
  }
}// ============================================
// ZUNE SELLER APPLICATION
// SEHEMU YA 4/4
// AUTH, VALIDATION NA SUBMISSION
// ============================================

async function checkSignedInUser() {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    currentUser = null;
    showMessage(
      'Tafadhali ingia kwenye akaunti yako ya ZUNE kabla ya kutuma maombi.',
      'error'
    );

    submitButton.disabled = true;
    return false;
  }

  currentUser = session.user;

  const emailInput = document.getElementById('email');

  if (!emailInput.value && currentUser.email) {
    emailInput.value = currentUser.email;
  }

  submitButton.disabled = false;
  return true;
}

form.querySelectorAll('input[name="country"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    clearMessage();
    loadRegions(radio.value);
  });
});

regionSelect.addEventListener('change', async () => {
  const config = COUNTRY_CONFIG[selectedCountry()];

  setOptions(
    districtSelect,
    [],
    config ? `Chagua ${config.districtLabel.toLowerCase()}` :
      'Chagua mkoa kwanza'
  );

  setOptions(
    wardSelect,
    [],
    config ? `Chagua ${config.wardLabel.toLowerCase()}` :
      'Chagua wilaya kwanza'
  );

  districtSelect.disabled = true;
  wardSelect.disabled = true;

  if (regionSelect.value) {
    await loadChildren(regionSelect, districtSelect, 'district');
  }
});

districtSelect.addEventListener('change', async () => {
  const config = COUNTRY_CONFIG[selectedCountry()];

  setOptions(
    wardSelect,
    [],
    config ? `Chagua ${config.wardLabel.toLowerCase()}` :
      'Chagua wilaya kwanza'
  );

  wardSelect.disabled = true;

  if (districtSelect.value) {
    await loadChildren(districtSelect, wardSelect, 'ward');
  }
});

function getFormValue(name) {
  return String(new FormData(form).get(name) || '').trim();
}

function validateApplication() {
  const requiredFields = [
    ['store_name', 'Jina la duka'],
    ['owner_name', 'Jina la mmiliki'],
    ['phone', 'Namba ya simu'],
    ['category', 'Aina ya biashara'],
    ['region', 'Mkoa/eneo'],
    ['district', 'Wilaya'],
    ['ward', 'Kata/eneo']
  ];

  for (const [fieldName, label] of requiredFields) {
    if (!getFormValue(fieldName)) {
      showMessage(`Tafadhali jaza au chagua: ${label}.`, 'error');
      document.getElementById(fieldName).focus();
      return false;
    }
  }

  if (!selectedCountry()) {
    showMessage('Tafadhali chagua nchi.', 'error');
    return false;
  }

  const email = getFormValue('email');

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('Tafadhali weka barua pepe sahihi.', 'error');
    document.getElementById('email').focus();
    return false;
  }

  return true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (submitButton.disabled) return;

  const signedIn = await checkSignedInUser();

  if (!signedIn) return;

  if (!validateApplication()) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Inatuma ombi...';

  try {
    // Hakikisha columns hizi zipo kwenye seller_applications.
    // Hatuingizi user_id kwa sababu schema yako ya awali
    // haikuwa na column hiyo.
    const application = {
      store_name: getFormValue('store_name'),
      owner_name: getFormValue('owner_name'),
      phone: getFormValue('phone'),
      country: selectedCountry(),
      city: getFormValue('region'),
      region: getFormValue('region'),
      district: getFormValue('district'),
      address: [
        getFormValue('ward'),
        getFormValue('street')
      ].filter(Boolean).join(', '),
      category: getFormValue('category'),
      tin_number: getFormValue('tin_number') || null,
      email: getFormValue('email') || currentUser.email || null,
      id_type: getFormValue('id_type') || null,
      id_number: getFormValue('id_number') || null,
      status: 'pending'
    };

    const { error } = await supabase
      .from('seller_applications')
      .insert(application);

    if (error) {
      console.error('ZUNE seller application error:', error);
      throw error;
    }

    showMessage(
      'Ombi lako limetumwa. Subiri timu ya ZUNE ilikague.',
      'success'
    );

    form.reset();
    resetLocationSelects('');
  } catch (error) {
    console.error(error);

    let friendlyMessage =
      'Ombi halikutumwa. Tafadhali jaribu tena.';

    if (error?.code === '42501') {
      friendlyMessage =
        'Ruhusa ya kutuma ombi imekataliwa na sera ya RLS ya Supabase. ' +
        'Sera ya INSERT inahitaji kukaguliwa.';
    } else if (error?.code === 'PGRST204' || error?.code === '42703') {
      friendlyMessage =
        'Kuna column kwenye code ambayo haipo kwenye jedwali ' +
        'seller_applications. Linganisha majina ya columns na schema.';
    } else if (error?.message) {
      friendlyMessage += ` Maelezo: ${error.message}`;
    }

    showMessage(friendlyMessage, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Tuma Maombi';
  }
});

resetLocationSelects('');

checkSignedInUser().catch((error) => {
  console.error('ZUNE auth check error:', error);
  showMessage(
    'Imeshindikana kuthibitisha akaunti. Jaribu kuingia tena.',
    'error'
  );
});