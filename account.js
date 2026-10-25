// ============================================
// ZUNE ACCOUNT — PART 1/4
// Supabase, navigation, helpers
// ============================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

const LOGIN_PAGE = './login.html';
const PROFILE_TABLE = 'profiles';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let currentUser = null;
let currentProfile = null;
let authListener = null;
let isSavingProfile = false;

// Vitambulisho vya kurasa vilivyopo kwenye account.html
const ACCOUNT_VIEWS = {
  main: 'accountHomeView',
  profile: 'profileView',
  orders: 'ordersView',
  wallet: 'walletView',
  cart: 'cartView',
  saved: 'savedView',
  verification: 'verificationView',
  seller: 'sellerView',
  settings: 'settingsView',
  support: 'supportView'
};

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? '';
}

function showMessage(selector, message, type = 'info') {
  const element = $(selector);
  if (!element) return;

  element.textContent = message;
  element.classList.add('show');
  element.dataset.type = type;
}

function hideMessage(selector) {
  const element = $(selector);
  if (!element) return;

  element.textContent = '';
  element.classList.remove('show');
  delete element.dataset.type;
}

function setButtonLoading(button, loading, loadingText = 'Inasubiri...') {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent.trim();
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function getFriendlyError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('rls')
  ) {
    return 'Huna ruhusa ya kufanya kitendo hiki. Hakiki ruhusa za akaunti.';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'Imeshindikana kuunganisha. Hakiki intaneti kisha jaribu tena.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Taarifa za kuingia si sahihi. Ingia tena.';
  }

  return error?.message || 'Hitilafu imetokea. Tafadhali jaribu tena.';
}

// Fungua ukurasa mmoja tu kwa wakati mmoja.
function openAccountView(viewName = 'main') {
  const targetId = ACCOUNT_VIEWS[viewName];

  if (!targetId) {
    console.warn('Account view haijapatikana:', viewName);
    return;
  }

  Object.values(ACCOUNT_VIEWS).forEach((id) => {
    const view = document.getElementById(id);
    if (view) view.hidden = true;
  });

  const target = document.getElementById(targetId);

  if (target) {
    target.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (viewName === 'profile') {
    fillProfileForm();
  }

  if (viewName === 'verification') {
    renderVerificationStatus();
  }

  if (viewName === 'settings') {
    loadAccountSettings();
  }

  if (viewName === 'support') {
    loadMySupportTickets();
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function redirectToLogin() {
  window.location.replace(LOGIN_PAGE);
}

function getDisplayName() {
  return (
    currentProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'Mtumiaji wa ZUNE'
  );
}

function getInitial(name) {
  return String(name || 'Z').trim().charAt(0).toUpperCase() || 'Z';
}

function getRoleLabel(role) {
  const labels = {
    buyer: 'Mteja',
    vendor: 'Muuzaji',
    admin: 'Admin'
  };

  return labels[role] || 'Mwanachama';
}// ============================================
// ZUNE ACCOUNT — PART 2/4
// Profile, photo, verification badge
// ============================================

function displayProfile() {
  if (!currentUser) return;

  const name = getDisplayName();
  const email = currentUser.email || 'Barua pepe haipo';
  const phone = currentProfile?.phone_number || 'Haijawekwa';
  const role = currentProfile?.role || 'buyer';

  setText('#userNameDisplay', name);
  setText('#userEmailDisplay', email);
  setText('#accountEmailDetail', email);
  setText('#userPhoneDisplay', phone);
  setText('#accountRoleBadge', getRoleLabel(role));
  setText('#profileInitial', getInitial(name));

  const adminLink = $('#adminMenuLink');

  if (adminLink) {
    adminLink.hidden = role !== 'admin';
  }

  renderProfilePhoto();
  renderVerificationBadge();
}

function fillProfileForm() {
  const nameInput = $('#editFullName');

  if (nameInput) {
    nameInput.value = currentProfile?.full_name ||
      currentUser?.user_metadata?.full_name || '';
  }

  setText(
    '#accountEmailDetail',
    currentUser?.email || 'Barua pepe haipo'
  );

  setText(
    '#userPhoneDisplay',
    currentProfile?.phone_number || 'Haijawekwa'
  );
}

function getPhotoStorageKey() {
  return currentUser?.id
    ? `zune_profile_photo_${currentUser.id}`
    : null;
}

function renderProfilePhoto() {
  const image = $('#profileImage');
  const initial = $('#profileInitial');
  const key = getPhotoStorageKey();

  if (!image || !initial || !key) return;

  let photo = null;

  try {
    photo = localStorage.getItem(key);
  } catch (error) {
    console.warn('Picha haikuweza kusomwa kwenye kifaa.', error);
  }

  if (photo) {
    image.src = photo;
    image.alt = 'Picha ya wasifu';
    image.classList.add('visible');
    initial.hidden = true;
  } else {
    image.removeAttribute('src');
    image.classList.remove('visible');
    initial.hidden = false;
    initial.textContent = getInitial(getDisplayName());
  }
}

function renderVerificationBadge() {
  const badge = $('#verificationBadge');

  if (!badge) return;

  const verified = currentProfile?.is_verified === true;
  badge.classList.toggle('visible', verified);
  badge.setAttribute(
    'aria-label',
    verified ? 'Akaunti imethibitishwa' : 'Akaunti haijathibitishwa'
  );
}

function fileToCompressedDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Chagua faili la picha.'));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Picha isiwe kubwa kuliko MB 8.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(
      new Error('Imeshindikana kusoma picha.')
    );

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(
        new Error('Picha uliyochagua haiwezi kufunguliwa.')
      );

      image.onload = () => {
        const maxSize = 420;
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Imeshindikana kuchakata picha.'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

async function handleProfilePhotoChange(event) {
  const file = event.target.files?.[0];

  if (!file || !currentUser) return;

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    showMessage(
      '#profileEditMessage',
      'Tumia picha ya JPG, PNG au WEBP.',
      'error'
    );
    event.target.value = '';
    return;
  }

  try {
    const dataURL = await fileToCompressedDataURL(file);
    const key = getPhotoStorageKey();

    // Picha ya wasifu pekee; hakuna nyaraka za NIDA hapa.
    localStorage.setItem(key, dataURL);

    renderProfilePhoto();

    showMessage(
      '#profileEditMessage',
      'Picha imehifadhiwa kwenye kifaa hiki.',
      'success'
    );
  } catch (error) {
    showMessage(
      '#profileEditMessage',
      getFriendlyError(error),
      'error'
    );
  }

  event.target.value = '';
}

function handleProfilePhotoRemove() {
  const key = getPhotoStorageKey();

  if (!key) return;

  try {
    localStorage.removeItem(key);
    renderProfilePhoto();

    showMessage(
      '#profileEditMessage',
      'Picha imeondolewa kwenye kifaa hiki.',
      'success'
    );
  } catch (error) {
    showMessage(
      '#profileEditMessage',
      'Imeshindikana kuondoa picha.',
      'error'
    );
  }
}

async function handleNameSubmit(event) {
  event.preventDefault();

  if (!currentUser || isSavingProfile) return;

  const input = $('#editFullName');
  const button = $('#saveNameBtn');
  const fullName = input?.value.trim();

  hideMessage('#profileEditMessage');

  if (!fullName || fullName.length < 2) {
    showMessage(
      '#profileEditMessage',
      'Andika jina lenye angalau herufi 2.',
      'error'
    );
    return;
  }

  isSavingProfile = true;
  setButtonLoading(button, true, 'Inahifadhi...');

  try {
    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .update({ full_name: fullName })
      .eq('id', currentUser.id)
      .select('id, full_name, phone_number, role, is_verified')
      .single();

    if (error) throw error;

    currentProfile = data;

    // Jaribu kusawazisha jina kwenye metadata pia.
    // Database ya profiles ndiyo chanzo kikuu cha jina hapa.
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    displayProfile();

    showMessage(
      '#profileEditMessage',
      metadataError
        ? 'Jina limehifadhiwa kwenye wasifu. Metadata haikusasishwa.'
        : 'Mabadiliko ya jina yamehifadhiwa.',
      'success'
    );
  } catch (error) {
    console.error('Profile update failed:', error);

    showMessage(
      '#profileEditMessage',
      getFriendlyError(error),
      'error'
    );
  } finally {
    isSavingProfile = false;
    setButtonLoading(button, false);
  }
}

async function refreshProfileFromSupabase() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id, full_name, phone_number, role, is_verified')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) throw error;

  currentProfile = data || null;
  displayProfile();
}// ============================================
// ZUNE ACCOUNT — PART 3/4
// Settings, verification, customer support
// ============================================

// ---------- MIPANGILIO ----------

const SETTINGS_KEY = 'zune_account_settings_v1';

function getDefaultSettings() {
  return {
    language: 'sw',
    theme: 'light',
    fontSize: 'normal',
    notifications: true
  };
}

function getSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);

    return {
      ...getDefaultSettings(),
      ...(saved ? JSON.parse(saved) : {})
    };
  } catch {
    return getDefaultSettings();
  }
}

function applyTheme(theme) {
  // Theme itatumika kwenye ukurasa huu.
  // CSS dark theme kamili inaweza kuongezwa baada ya muundo kuthibitishwa.
  document.documentElement.dataset.theme = theme;
}

function applyFontSize(size) {
  const sizes = {
    normal: '14px',
    large: '16px',
    larger: '18px'
  };

  document.documentElement.style.fontSize =
    sizes[size] || sizes.normal;
}

function loadAccountSettings() {
  const settings = getSettings();

  if ($('#languageSetting')) {
    $('#languageSetting').value = settings.language;
  }

  if ($('#themeSetting')) {
    $('#themeSetting').value = settings.theme;
  }

  if ($('#fontSizeSetting')) {
    $('#fontSizeSetting').value = settings.fontSize;
  }

  if ($('#notificationPreference')) {
    $('#notificationPreference').checked =
      settings.notifications;
  }

  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);
}

function handleSettingsSave() {
  const settings = {
    language: $('#languageSetting')?.value || 'sw',
    theme: $('#themeSetting')?.value || 'light',
    fontSize: $('#fontSizeSetting')?.value || 'normal',
    notifications: Boolean(
      $('#notificationPreference')?.checked
    )
  };

  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(settings)
    );

    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);

    showMessage(
      '#accountSettingsMessage',
      'Mipangilio imehifadhiwa kwenye kifaa hiki.',
      'success'
    );
  } catch (error) {
    showMessage(
      '#accountSettingsMessage',
      'Imeshindikana kuhifadhi mipangilio.',
      'error'
    );
  }
}

// ---------- VERIFIED BADGE ----------

function renderVerificationStatus() {
  const statusElement = $('#verificationCurrentStatus');

  if (!statusElement) return;

  if (currentProfile?.is_verified === true) {
    statusElement.textContent =
      'Akaunti yako imethibitishwa. Verified Badge imeidhinishwa.';
  } else {
    statusElement.textContent =
      'Hali ya ombi lako itathibitishwa baada ya kuunganisha mfumo wa maombi.';
  }
}

function handleVerificationSubmit(event) {
  event.preventDefault();

  const nidaNumber = $('#verificationNidaNumber')?.value.trim();
  const frontFile = $('#nidaFrontImage')?.files?.[0];
  const backFile = $('#nidaBackImage')?.files?.[0];
  const reason = $('#verificationReason')?.value.trim();
  const consent = $('#verificationConsent')?.checked;

  hideMessage('#verificationMessage');

  if (!nidaNumber || !frontFile || !backFile || !reason || !consent) {
    showMessage(
      '#verificationMessage',
      'Jaza sehemu zote zinazohitajika na ukubali ridhaa.',
      'error'
    );
    return;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  for (const file of [frontFile, backFile]) {
    if (!allowedTypes.includes(file.type)) {
      showMessage(
        '#verificationMessage',
        'Nyaraka lazima ziwe picha za JPG, PNG au WEBP.',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        '#verificationMessage',
        'Kila picha lazima iwe MB 5 au chini.',
        'error'
      );
      return;
    }
  }

  // Usihifadhi NIDA kwenye localStorage wala kuituma kwenye
  // endpoint isiyothibitishwa. Hifadhi binafsi itasanidiwa baadaye.
  showMessage(
    '#verificationMessage',
    'Fomu imekaguliwa, lakini haijatumwa. Tunahitaji kwanza kuunganisha hifadhi binafsi na mfumo salama wa maombi.',
    'info'
  );
}

// ---------- MSAADA KWA WATEJA ----------

function handleSupportSubmit(event) {
  event.preventDefault();

  const category = $('#supportCategory')?.value;
  const subject = $('#supportSubject')?.value.trim();
  const description = $('#supportDescription')?.value.trim();

  hideMessage('#supportTicketMessage');

  if (!category || !subject || !description) {
    showMessage(
      '#supportTicketMessage',
      'Tafadhali jaza sehemu zote zinazohitajika.',
      'error'
    );
    return;
  }

  showMessage(
    '#supportTicketMessage',
    'Taarifa zimekaguliwa, lakini tiketi haijatumwa kwa sababu mfumo wa tiketi haujaunganishwa bado.',
    'info'
  );
}

function loadMySupportTickets() {
  const container = $('#mySupportTickets');

  if (!container) return;

  container.textContent =
    'Tiketi na majibu ya Admin yataonekana baada ya kuunganisha mfumo wa msaada.';
}// ============================================
// ZUNE ACCOUNT — PART 4/4
// Events, authentication, initialization
// ============================================

function attachNavigationEvents() {
  // Fungua ukurasa unaolingana na menyu iliyoguswa.
  $$('[data-open-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const viewName = button.dataset.openView;
      openAccountView(viewName);
    });
  });

  // Vitufe vyote vya kurudi kwenye ukurasa mkuu.
  $$('[data-back-home]').forEach((button) => {
    button.addEventListener('click', () => {
      openAccountView('main');
    });
  });
}

function attachProfileEvents() {
  $('#editNameForm')?.addEventListener(
    'submit',
    handleNameSubmit
  );

  $('#profileImageInput')?.addEventListener(
    'change',
    handleProfilePhotoChange
  );

  $('#removeProfilePhotoBtn')?.addEventListener(
    'click',
    handleProfilePhotoRemove
  );
}

function attachSettingsEvents() {
  $('#saveAccountSettingsBtn')?.addEventListener(
    'click',
    handleSettingsSave
  );

  // Preview ya mwonekano na ukubwa wa maandishi.
  $('#themeSetting')?.addEventListener('change', (event) => {
    applyTheme(event.target.value);
  });

  $('#fontSizeSetting')?.addEventListener('change', (event) => {
    applyFontSize(event.target.value);
  });
}

function attachVerificationAndSupportEvents() {
  $('#verificationApplicationForm')?.addEventListener(
    'submit',
    handleVerificationSubmit
  );

  $('#supportTicketForm')?.addEventListener(
    'submit',
    handleSupportSubmit
  );

  $('#refreshSupportTicketsBtn')?.addEventListener(
    'click',
    loadMySupportTickets
  );
}

async function logoutUser() {
  const button = $('#logoutButton');

  if (button) {
    button.disabled = true;
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    // Usihifadhi taarifa za mtumiaji kama kikao hai.
    currentUser = null;
    currentProfile = null;

    redirectToLogin();
  } catch (error) {
    console.error('Logout failed:', error);

    if (button) {
      button.disabled = false;
    }

    showMessage(
      '#accountMessage',
      'Imeshindikana kutoka kwenye akaunti: ' +
        getFriendlyError(error),
      'error'
    );
  }
}

function attachAuthListener() {
  if (authListener) return;

  const { data } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        currentUser = null;
        currentProfile = null;
        redirectToLogin();
      }
    }
  );

  authListener = data?.subscription || null;
}

async function loadAccount() {
  hideMessage('#accountMessage');

  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData?.user) {
      redirectToLogin();
      return;
    }

    currentUser = userData.user;

    const { data: profile, error: profileError } =
      await supabase
        .from(PROFILE_TABLE)
        .select('id, full_name, phone_number, role, is_verified')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    currentProfile = profile || null;

    displayProfile();
    loadAccountSettings();
    renderVerificationStatus();

    // Ukurasa mkuu ndiyo unaoonekana mwanzoni.
    openAccountView('main');
  } catch (error) {
    console.error('Account loading failed:', error);

    showMessage(
      '#accountMessage',
      'Imeshindikana kupakia taarifa za akaunti: ' +
        getFriendlyError(error),
      'error'
    );
  }
}

async function initAccount() {
  attachNavigationEvents();
  attachProfileEvents();
  attachSettingsEvents();
  attachVerificationAndSupportEvents();

  $('#logoutButton')?.addEventListener(
    'click',
    logoutUser
  );

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Hakikisha kikao cha Supabase kinachunguzwa kabla
  // ya kuonyesha taarifa za akaunti.
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Session check failed:', error);

    showMessage(
      '#accountMessage',
      'Imeshindikana kuthibitisha kikao. Jaribu kuingia tena.',
      'error'
    );
    return;
  }

  if (!data?.session) {
    redirectToLogin();
    return;
  }

  attachAuthListener();
  await loadAccount();
}

// Ruhusu kupakia tena taarifa kwa majaribio au baada ya mabadiliko.
window.loadAccount = loadAccount;
window.logoutUser = logoutUser;
window.zuneAccount = {
  openView: openAccountView,
  loadAccount,
  logoutUser
};

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initAccount,
    { once: true }
  );
} else {
  initAccount();
}