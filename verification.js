
/* ==========================================
   ZUNE — ACCOUNT VERIFICATION
   SEHEMU YA 1/2
   Supabase + Account + Verification Status
========================================== */

(() => {
  'use strict';

  const SUPABASE_URL =
    'https://rpkogiieegqgxqbzwxwo.supabase.co';

  const SUPABASE_ANON_KEY =
    'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

  const $ = (id) => document.getElementById(id);

  let supabase;
  let currentUser = null;
  let currentProfile = null;
  let latestRequest = null;
  let isSubmitting = false;

  const setMessage = (message, type = 'info') => {
    const el = $('verificationMessage');
    if (!el) return;

    el.textContent = message;
    el.style.display = message ? 'block' : 'none';

    const colors = {
      info: '#1d4ed8',
      success: '#15803d',
      error: '#b91c1c',
      warning: '#a16207'
    };

    el.style.color = colors[type] || colors.info;
  };

  const showElement = (id, visible) => {
    const el = $(id);
    if (el) el.style.display = visible ? '' : 'none';
  };

  const formatDate = (value) => {
    if (!value) return 'Haijulikani';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Haijulikani';
    }

    return date.toLocaleString('sw-TZ', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  function ensureDocumentTypeField() {
    const form = $('verificationForm');
    if (!form || $('documentType')) return;

    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const label = document.createElement('label');
    label.htmlFor = 'documentType';
    label.textContent = 'Aina ya kitambulisho';
    label.style.display = 'block';
    label.style.marginBottom = '6px';

    const select = document.createElement('select');
    select.id = 'documentType';
    select.name = 'document_type';
    select.required = true;
    select.style.width = '100%';
    select.style.padding = '12px';
    select.style.border = '1px solid #d1d5db';
    select.style.borderRadius = '8px';
    select.style.background = '#fff';

    const options = [
      ['', 'Chagua aina ya kitambulisho'],
      ['national_id', 'Kitambulisho cha taifa'],
      ['passport', 'Pasipoti'],
      ['driving_license', 'Leseni ya udereva'],
      ['other', 'Nyingine']
    ];

    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    wrapper.append(label, select);

    const reasonField = $('verificationReason');

    if (reasonField && reasonField.parentElement) {
      reasonField.parentElement.before(wrapper);
    } else {
      const submitButton = $('submitVerification');
      if (submitButton && submitButton.parentElement) {
        submitButton.parentElement.before(wrapper);
      } else {
        form.appendChild(wrapper);
      }
    }
  }

  function showLoginRequired() {
    showElement('loginRequired', true);
    showElement('verificationContent', false);
  }

  function showVerificationContent() {
    showElement('loginRequired', false);
    showElement('verificationContent', true);
  }

  function renderProfile() {
    if (!currentProfile) return;

    if ($('profileName')) {
      $('profileName').textContent =
        currentProfile.full_name || currentUser.email || 'Mtumiaji';
    }

    if ($('profileRole')) {
      $('profileRole').textContent =
        currentProfile.role || 'buyer';
    }

    if ($('profileEmail')) {
      $('profileEmail').textContent = currentUser.email || '—';
    }

    if ($('verificationName')) {
      $('verificationName').value =
        currentProfile.full_name || '';
    }

    if ($('badgePreviewName')) {
      $('badgePreviewName').textContent =
        currentProfile.full_name || 'Mtumiaji';
    }
  }

  function renderRequestStatus() {
    const verified = currentProfile?.is_verified === true;
    const status = String(latestRequest?.status || '').toLowerCase();

    showElement('verifiedPanel', verified);
    showElement('pendingPanel', !verified && status === 'pending');
    showElement(
      'rejectedPanel',
      !verified && ['rejected', 'declined'].includes(status)
    );

    showElement(
      'verificationForm',
      !verified && status !== 'pending'
    );

    if ($('statusBadge')) {
      $('statusBadge').textContent = verified
        ? 'Imethibitishwa'
        : status === 'pending'
          ? 'Inasubiri'
          : ['rejected', 'declined'].includes(status)
            ? 'Imekataliwa'
            : 'Haijathibitishwa';
    }

    if ($('statusDescription')) {
      $('statusDescription').textContent = verified
        ? 'Akaunti yako imethibitishwa.'
        : status === 'pending'
          ? 'Ombi lako limepokelewa na linasubiri kukaguliwa.'
          : ['rejected', 'declined'].includes(status)
            ? 'Ombi lako halikukubaliwa. Kagua maelezo na ujaribu tena.'
            : 'Jaza fomu ili kuomba uthibitishaji wa akaunti.';
    }

    if ($('requestDate')) {
      $('requestDate').textContent =
        formatDate(latestRequest?.created_at);
    }

    if ($('rejectedReason')) {
      $('rejectedReason').textContent =
        latestRequest?.admin_note || 'Hakuna maelezo yaliyotolewa.';
    }

    showElement('badgePreview', verified);
  }

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Wasifu haujapatikana. Hakikisha akaunti yako ina rekodi kwenye profiles.'
      );
    }

    currentProfile = data;
    renderProfile();
  }

  async function loadLatestRequest() {
    const { data, error } = await supabase
      .from('verification_requests')
      .select(
        'id, user_id, full_name, document_type, document_number, document_url, status, created_at, updated_at, admin_note, reason, role'
      )
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    latestRequest = data?.[0] || null;
    renderRequestStatus();
  }

  /* ==========================================
     SEHEMU YA 2/2
     Submit + Authentication + Initialization
  ========================================== */

  async function submitVerification(event) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!currentUser || !currentProfile) {
      setMessage('Tafadhali ingia kwenye akaunti yako kwanza.', 'error');
      return;
    }

    if (currentProfile.is_verified === true) {
      setMessage('Akaunti yako tayari imethibitishwa.', 'success');
      return;
    }

    if (String(latestRequest?.status || '').toLowerCase() === 'pending') {
      setMessage('Tayari una ombi linalosubiri kukaguliwa.', 'warning');
      return;
    }

    const fullName =
      $('verificationName')?.value.trim() ||
      currentProfile.full_name ||
      '';

    const documentType = $('documentType')?.value || '';
    const documentNumber =
      $('documentNumber')?.value.trim() || null;

    const reason =
      $('verificationReason')?.value.trim() || null;

    if (!fullName) {
      setMessage('Tafadhali jaza jina lako kamili.', 'error');
      $('verificationName')?.focus();
      return;
    }

    if (!documentType) {
      setMessage('Tafadhali chagua aina ya kitambulisho.', 'error');
      $('documentType')?.focus();
      return;
    }

    isSubmitting = true;

    const button = $('submitVerification');
    const buttonText = $('submitText');

    if (button) button.disabled = true;
    if (buttonText) buttonText.textContent = 'Inatuma ombi...';

    setMessage('Tafadhali subiri, ombi lako linatumwa.', 'info');

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const session = sessionData?.session;

      if (!session || session.user.id !== currentUser.id) {
        throw new Error('Kikao chako kimeisha. Ingia tena.');
      }

      const requestData = {
        user_id: currentUser.id,
        full_name: fullName,
        document_type: documentType,
        status: 'pending',
        role: currentProfile.role || 'buyer'
      };

      if (documentNumber) {
        requestData.document_number = documentNumber;
      }

      if (reason) {
        requestData.reason = reason;
      }

      const { error } = await supabase
        .from('verification_requests')
        .insert(requestData);

      if (error) throw error;

      setMessage(
        'Ombi lako limetumwa kikamilifu. Linasubiri kukaguliwa.',
        'success'
      );

      await loadLatestRequest();
    } catch (error) {
      console.error('ZUNE verification error:', error);

      let message = error?.message ||
        'Imeshindikana kutuma ombi. Jaribu tena.';

      if (error?.code === '42501') {
        message =
          'Huna ruhusa ya kutuma ombi. Sera za RLS za verification_requests zinahitaji kukaguliwa.';
      } else if (error?.code === '23505') {
        message =
          'Ombi kama hili tayari lipo. Sasisha ukurasa na angalia hali ya ombi lako.';
      } else if (error?.code === 'PGRST116') {
        message = 'Imeshindikana kusoma taarifa za ombi.';
      }

      setMessage(message, 'error');
    } finally {
      isSubmitting = false;

      if (button) button.disabled = false;
      if (buttonText) buttonText.textContent = 'Tuma Ombi';
    }
  }

  async function initializeVerification() {
    try {
      if (!window.supabase?.createClient) {
        throw new Error(
          'Supabase SDK haijapakiwa. Hakikisha script ya Supabase imewekwa kwenye HTML kabla ya verification.js.'
        );
      }

      supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

      ensureDocumentTypeField();

      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      currentUser = data?.session?.user || null;

      if (!currentUser) {
        showLoginRequired();
        return;
      }

      showVerificationContent();

      await loadProfile();
      await loadLatestRequest();

      const form = $('verificationForm');

      if (form) {
        form.addEventListener('submit', submitVerification);
      }

      if ($('currentYear')) {
        $('currentYear').textContent = new Date().getFullYear();
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          currentUser = null;
          showLoginRequired();
        }
      });
    } catch (error) {
      console.error('ZUNE initialization error:', error);

      setMessage(
        error?.message ||
          'Imeshindikana kufungua ukurasa wa uthibitishaji.',
        'error'
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initializeVerification,
      { once: true }
    );
  } else {
    initializeVerification();
  }
})();
