
// ============================================
// ZUNE VERIFICATION
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
    elements.message.hidden = false;
    elements.message.className = `notice notice-${type} mb-5`;
    elements.message.textContent = message;
  }

  function hideMessage() {
    elements.message.hidden = true;
    elements.message.textContent = '';
  }

  function setStatus(label, color = 'gray') {
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
    elements.form.hidden = true;
    elements.pendingPanel.hidden = true;
    elements.rejectedPanel.hidden = true;
    elements.verifiedPanel.hidden = true;
    elements.badgePreview.hidden = true;
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
      'Ombi lako halijaidhinishwa. Unaweza kusoma maelezo na kutuma ombi jipya.';

    elements.rejectedPanel.hidden = false;

    elements.rejectedReason.textContent =
      request.admin_note ||
      'Hakuna maelezo yaliyowekwa. Tafadhali hakikisha taarifa zako ni sahihi kabla ya kutuma ombi jipya.';

    elements.form.hidden = false;
  }

  function displayNotRequested() {
    resetPanels();

    setStatus('Bado hujaomba uthibitishaji', 'gray');

    elements.statusDescription.textContent =
      'Akaunti yako bado haijathibitishwa. Jaza fomu hapa chini ili kuomba ukaguzi.';

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

  async function loadProfile(user) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Wasifu haujapatikana. Hakikisha akaunti yako ina rekodi kwenye profiles.'
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
    elements.name.value = data.full_name || '';
    elements.badgePreviewName.textContent = name;

    return data;
  }

  async function loadLatestRequest(userId) {
    // Table must exist in Supabase:
    // verification_requests
    const { data, error } = await supabaseClient
      .from('verification_requests')
      .select('id, user_id, status, created_at, admin_note')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(
        'Imeshindikana kusoma maombi ya uthibitishaji. Hakikisha jedwali verification_requests na sera zake za RLS zipo. Maelezo: ' +
        error.message
      );
    }

    latestRequest = data && data.length ? data[0] : null;
    return latestRequest;
  }

  async function renderVerificationState() {
    if (!currentUser || !currentProfile) return;

    const profile = currentProfile;

    // The profile's is_verified field is the final source
    // for whether the user has actually been verified.
    if (profile.is_verified === true) {
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

    if (
      status === 'approved' ||
      status === 'verified'
    ) {
      // A request status alone must not create a verified badge.
      setStatus('Ombi limeidhinishwa; wasifu unasubiri kusasishwa', 'blue');

      elements.statusDescription.textContent =
        'Ombi linaonyesha limeidhinishwa, lakini hali ya uthibitishaji kwenye wasifu bado haijasasishwa. Wasiliana na msimamizi wa ZUNE.';

      resetPanels();
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

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    const session = data.session;

    if (!session || !session.user) {
      elements.loginRequired.hidden = false;
      return;
    }

    currentUser = session.user;

    elements.content.hidden = false;

    await loadProfile(currentUser);

    // Only buyers and vendors can request a public verification badge.
    if (
      currentProfile.role !== 'buyer' &&
      currentProfile.role !== 'vendor'
    ) {
      resetPanels();

      setStatus('Akaunti ya msimamizi', 'gray');

      elements.statusDescription.textContent =
        'Ukurasa huu wa maombi ya Gold Verification ni kwa wateja na wauzaji.';

      return;
    }

    await renderVerificationState();
  }

  async function submitRequest(event) {
    event.preventDefault();

    if (submitting) return;

    hideMessage();

    if (!currentUser || !currentProfile) {
      showMessage(
        'Tafadhali ingia kwenye akaunti yako kabla ya kutuma ombi.',
        'error'
      );
      return;
    }

    if (
      currentProfile.role !== 'buyer' &&
      currentProfile.role !== 'vendor'
    ) {
      showMessage(
        'Aina hii ya akaunti hairuhusiwi kuomba badge kupitia fomu hii.',
        'error'
      );
      return;
    }

    const fullName = elements.name.value.trim();
    const reason = elements.reason.value.trim();

    if (fullName.length < 2) {
      showMessage('Tafadhali weka jina lako kamili.', 'error');
      elements.name.focus();
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
      // Recheck the authenticated session before writing.
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError) throw sessionError;

      const session = sessionData.session;

      if (!session || session.user.id !== currentUser.id) {
        throw new Error(
          'Kikao chako cha kuingia kimeisha. Ingia tena kisha ujaribu.'
        );
      }

      // Prevent multiple active pending requests.
      const existingRequest = await loadLatestRequest(currentUser.id);

      if (
        existingRequest &&
        String(existingRequest.status).toLowerCase() === 'pending'
      ) {
        displayPending(existingRequest);

        showMessage(
          'Tayari una ombi linalosubiri ukaguzi.',
          'info'
        );
        return;
      }

      // Only create a request. Never update profiles.is_verified here.
      const { error } = await supabaseClient
        .from('verification_requests')
        .insert({
          user_id: currentUser.id,
          full_name: fullName,
          role: currentProfile.role,
          reason: reason,
          status: 'pending'
        });

      if (error) throw error;

      elements.reason.value = '';

      await loadLatestRequest(currentUser.id);
      await renderVerificationState();

      showMessage(
        'Ombi lako limetumwa! Subiri timu ya ZUNE ikague taarifa zako.',
        'success'
      );
    } catch (error) {
      console.error('ZUNE verification submission error:', error);

      showMessage(
        error.message ||
        'Imeshindikana kutuma ombi. Tafadhali jaribu tena.',
        'error'
      );
    } finally {
      submitting = false;
      elements.submit.disabled = false;
      elements.submitText.textContent = '🛡 Anza Uthibitishaji';
    }
  }

  async function initialize() {
    $('currentYear').textContent = new Date().getFullYear();

    if (!window.supabase || !window.supabase.createClient) {
      showMessage(
        'Supabase library haijapakia. Angalia intaneti kisha refresh ukurasa.',
        'error'
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

    elements.form.addEventListener('submit', submitRequest);

    try {
      await loadPage();
    } catch (error) {
      console.error('ZUNE verification loading error:', error);

      showMessage(
        error.message ||
        'Imeshindikana kupakia taarifa za uthibitishaji.',
        'error'
      );
    }

    // Refresh page state when the authentication session changes.
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        currentUser = null;
        currentProfile = null;
        latestRequest = null;

        elements.content.hidden = true;
        elements.loginRequired.hidden = false;
        hideMessage();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer reload so the auth event callback does not
        // perform nested Supabase auth operations immediately.
        setTimeout(() => {
          loadPage().catch((error) => {
            console.error(error);
            showMessage(
              'Imeshindikana kusasisha hali ya akaunti.',
              'error'
            );
          });
        }, 0);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
