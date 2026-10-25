
 // ============================================
 // ZUNE VERIFICATION — PART 1/2
 // Supabase Auth + Verification Requests
 // ============================================

(() => {
  'use strict';

  const SUPABASE_URL =
    'https://rpkogiieegqgxqbzwxwo.supabase.co';

  const SUPABASE_ANON_KEY =
    'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

  const $ = (id) => document.getElementById(id);

  const elements = {
    message: $('verificationMessage'),
    loginRequired: $('loginRequired'),
    content: $('verificationContent'),
    profileName: $('profileName'),
    profileRole: $('profileRole'),
    profileEmail: $('profileEmail'),
    statusBadge: $('statusBadge'),
    statusDescription: $('statusDescription'),
    verifiedPanel: $('verifiedPanel'),
    form: $('verificationForm'),
    name: $('verificationName'),
    reason: $('verificationReason'),
    submit: $('submitVerification'),
    submitText: $('submitText'),
    pendingPanel: $('pendingPanel'),
    requestDate: $('requestDate'),
    rejectedPanel: $('rejectedPanel'),
    rejectedReason: $('rejectedReason'),
    badgePreviewName: $('badgePreviewName'),
    badgePreview: $('badgePreview')
  };

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;
  let latestRequest = null;
  let submitting = false;

  function showMessage(message, type = 'info') {
    if (!elements.message) return;

    elements.message.hidden = false;
    elements.message.className =
      `notice notice-${type} mb-5`;
    elements.message.textContent = message;
  }

  function hideMessage() {
    if (!elements.message) return;

    elements.message.hidden = true;
    elements.message.textContent = '';
  }

  function setStatus(label, color = 'gray') {
    if (!elements.statusBadge) return;

    const styles = {
      gray: 'bg-gray-100 text-gray-700',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      gold: 'bg-yellow-100 text-yellow-900'
    };

    elements.statusBadge.className =
      `status-pill ${styles[color] || styles.gray}`;

    elements.statusBadge.textContent = `● ${label}`;
  }

  function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('sw-TZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function resetPanels() {
    if (elements.form) elements.form.hidden = true;
    if (elements.pendingPanel) elements.pendingPanel.hidden = true;
    if (elements.rejectedPanel) elements.rejectedPanel.hidden = true;
    if (elements.verifiedPanel) elements.verifiedPanel.hidden = true;
    if (elements.badgePreview) elements.badgePreview.hidden = true;
  }

  function displayVerified() {
    resetPanels();

    setStatus('Akaunti imethibitishwa', 'gold');

    elements.statusDescription.textContent =
      'Hongera! Akaunti yako imeidhinishwa na ZUNE.';

    elements.verifiedPanel.hidden = false;
    elements.badgePreview.hidden = false;
  }

  function displayPending(request) {
    resetPanels();

    setStatus('Ombi linasubiri ukaguzi', 'blue');

    elements.statusDescription.textContent =
      'Ombi lako limepokelewa. Subiri timu ya ZUNE ikague taarifa zako.';

    elements.pendingPanel.hidden = false;

    elements.requestDate.textContent = request.created_at
      ? `Tarehe ya ombi: ${formatDate(request.created_at)}`
      : '';
  }

  function displayRejected(request) {
    resetPanels();

    setStatus('Ombi halijaidhinishwa', 'red');

    elements.statusDescription.textContent =
      'Ombi lako halijaidhinishwa. Soma maelezo na urekebishe taarifa zako kabla ya kuomba tena.';

    elements.rejectedPanel.hidden = false;

    elements.rejectedReason.textContent =
      request.admin_note ||
      'Hakuna maelezo yaliyowekwa na msimamizi.';

    elements.form.hidden = false;
  }

  function displayNotRequested() {
    resetPanels();

    setStatus('Bado hujaomba uthibitishaji', 'gray');

    elements.statusDescription.textContent =
      'Jaza fomu hapa chini ili kuomba uthibitishaji wa akaunti yako.';

    elements.form.hidden = false;
  }

  function displayRole(role) {
    const roles = {
      buyer: 'Mteja',
      vendor: 'Muuzaji',
      admin: 'Msimamizi'
    };

    return roles[role] || 'Mwanachama';
  }

  // Tengeneza chaguo la aina ya hati ikiwa HTML haina.
  function ensureDocumentTypeField() {
    let field = $('documentType');

    if (field) return field;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-4';

    const label = document.createElement('label');
    label.htmlFor = 'documentType';
    label.className = 'block mb-2 font-medium';
    label.textContent = 'Aina ya hati ya utambulisho';

    field = document.createElement('select');
    field.id = 'documentType';
    field.name = 'document_type';
    field.required = true;
    field.className =
      'w-full rounded-lg border p-3';

    const options = [
      ['', 'Chagua aina ya hati'],
      ['national_id', 'Kitambulisho cha taifa'],
      ['passport', 'Pasipoti'],
      ['driving_license', 'Leseni ya udereva'],
      ['other', 'Hati nyingine']
    ];

    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      field.appendChild(option);
    });

    wrapper.append(label, field);

    if (elements.reason && elements.reason.parentElement) {
      elements.reason.parentElement.before(wrapper);
    } else {
      elements.form.prepend(wrapper);
    }

    return field;
  }

  async function loadProfile(user) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Wasifu haujapatikana kwenye profiles. Hakikisha akaunti yako ina wasifu.'
      );
    }

    currentProfile = data;

    const name =
      data.full_name ||
      user.user_metadata?.full_name ||
      user.email ||
      'Mtumiaji wa ZUNE';

    elements.profileName.textContent = name;
    elements.profileRole.textContent = displayRole(data.role);
    elements.profileEmail.textContent = user.email || '';

    if (elements.name) {
      elements.name.value = data.full_name || '';
    }

    if (elements.badgePreviewName) {
      elements.badgePreviewName.textContent = name;
    }

    return data;
  }

  async function loadLatestRequest(userId) {
    const { data, error } = await supabaseClient
      .from('verification_requests')
      .select('id, user_id, status, created_at, admin_note')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(
        'Imeshindikana kusoma maombi ya uthibitishaji: ' +
        error.message
      );
    }

    latestRequest = data?.length ? data[0] : null;

    return latestRequest;
  }

  async function renderVerificationState() {
    if (!currentUser || !currentProfile) return;

    if (currentProfile.is_verified === true) {
      displayVerified();
      return;
    }

    const request = await loadLatestRequest(currentUser.id);

    if (!request) {
      displayNotRequested();
      return;
    }

    const status = String(request.status || '').toLowerCase();

    if (status === 'pending') {
      displayPending(request);
      return;
    }

    if (status === 'approved' || status === 'verified') {
      resetPanels();

      setStatus('Ombi limeidhinishwa', 'blue');

      elements.statusDescription.textContent =
        'Ombi limeidhinishwa, lakini profiles.is_verified bado haijaonyesha uthibitishaji. Wasiliana na msimamizi wa ZUNE.';

      return;
    }

    if (status === 'rejected' || status === 'declined') {
      displayRejected(request);
      return;
    }

    displayNotRequested();
  }

  async function loadPage() {
    hideMessage();

    elements.content.hidden = true;
    elements.loginRequired.hidden = true;

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const session = data.session;

    if (!session?.user) {
      elements.loginRequired.hidden = false;
      return;
    }

    currentUser = session.user;
    elements.content.hidden = false;

    await loadProfile(currentUser);

    if (
      currentProfile.role !== 'buyer' &&
      currentProfile.role !== 'vendor'
    ) {
      resetPanels();

      setStatus('Akaunti ya msimamizi', 'gray');

      elements.statusDescription.textContent =
        'Uthibitishaji huu unapatikana kwa wateja na wauzaji.';

      return;
    }

    ensureDocumentTypeField();

    await renderVerificationState();
  }

  async function submitRequest(event) {
    event.preventDefault();

    if (submitting) return;

    hideMessage();

    if (!currentUser || !currentProfile) {
      showMessage(
        'Ingia kwenye akaunti yako kabla ya kutuma ombi.',
        'error'
      );
      return;
    }

    if (
      !['buyer', 'vendor'].includes(currentProfile.role)
    ) {
      showMessage(
        'Aina hii ya akaunti hairuhusiwi kuomba uthibitishaji.',
        'error'
      );
      return;
    }

    const fullName = elements.name.value.trim();
    const reason = elements.reason.value.trim();
    const documentType = $('documentType')?.value || '';

    if (fullName.length < 2) {
      showMessage('Weka jina lako kamili.', 'error');
      elements.name.focus();
      return;
    }

    if (!documentType) {
      showMessage('Chagua aina ya hati ya utambulisho.', 'error');
      $('documentType')?.focus();
      return;
    }

    if (reason.length < 10) {
      showMessage(
        'Eleza sababu ya ombi lako kwa angalau herufi 10.',
        'error'
      );
      elements.reason.focus();
      return;
    }

    submitting = true;
    elements.submit.disabled = true;
    elements.submitText.textContent = 'Inatuma ombi...';

    try {
      const { data, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError) throw sessionError;

      if (data.session?.user?.id !== currentUser.id) {
        throw new Error(
          'Kikao kimeisha au akaunti imebadilika. Ingia tena.'
        );
      }

      const existing = await loadLatestRequest(currentUser.id);

      if (
        existing &&
        String(existing.status).toLowerCase() === 'pending'
      ) {
        displayPending(existing);

        showMessage(
          'Tayari una ombi linalosubiri ukaguzi.',
          'info'
        );
        return;
      }

      // document_type ni lazima kwenye database.
      // role haijatumwa kwa sababu haipo kwenye schema ya awali.
      const payload = {
        user_id: currentUser.id,
        full_name: fullName,
        document_type: documentType,
        status: 'pending',
        reason: reason
      };

      const { error } = await supabaseClient
        .from('verification_requests')
        .insert(payload);

      if (error) throw error;

      elements.reason.value = '';

      await loadLatestRequest(currentUser.id);
      await renderVerificationState();

      showMessage(
        'Ombi lako limetumwa kwa mafanikio. Subiri timu ya ZUNE ikague.',
        'success'
      );
    } catch (error) {
      console.error('ZUNE verification error:', error);

      showMessage(
        'Imeshindikana kutuma ombi: ' + error.message,
        'error'
      );
    } finally {
      submitting = false;
      elements.submit.disabled = false;
      elements.submitText.textContent = '🛡 Anza Uthibitishaji';
    }
  }

  async function initialize() {
    const year = $('currentYear');

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    if (
      !window.supabase ||
      !window.supabase.createClient
    ) {
      showMessage(
        'Supabase library haijapakia. Angalia intaneti na ujaribu tena.',
        'error'
      );
      return;
    }

    if (!elements.form || !elements.message) {
      console.error(
        'ZUNE Verification: HTML haijakamilika au IDs hazilingani.'
      );
      return;
    }

    supabaseClient = window.supabase.createClient(
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

    ensureDocumentTypeField();

    elements.form.addEventListener(
      'submit',
      submitRequest
    );

    try {
      await loadPage();
    } catch (error) {
      console.error(error);

      showMessage(
        'Imeshindikana kupakia uthibitishaji: ' +
        error.message,
        'error'
      );
    }

    supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          currentUser = null;
          currentProfile = null;
          latestRequest = null;

          elements.content.hidden = true;
          elements.loginRequired.hidden = false;

          hideMessage();
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          setTimeout(() => {
            loadPage().catch((error) => {
              console.error(error);

              showMessage(
                'Imeshindikana kusasisha hali ya akaunti: ' +
                error.message,
                'error'
              );
            });
          }, 0);
        }
      }
    );
  }

  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );
})();
