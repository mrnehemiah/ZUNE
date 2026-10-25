/* ==========================================
   ZUNE ACCOUNT PREMIUM
   SEHEMU YA 1/4
   Supabase + Helpers + UI
   ========================================== */

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://rpkogiieegqgxqbzwxwo.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

  const LOGIN_PAGE = "./login.html";
  const PROFILE_TABLE = "profiles";

  const MAX_PROFILE_IMAGE_SIZE = 8 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 420;
  const IMAGE_QUALITY = 0.78;
  const PROFILE_IMAGE_PREFIX = "zune_profile_picture_";
  const SETTINGS_KEY = "zune_account_preferences";

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let latestVerificationApplication = null;

  let isLoadingAccount = false;
  let isSavingProfile = false;
  let isSavingPhoto = false;
  let isSubmittingVerification = false;
  let isSubmittingSupport = false;

  let authSubscription = null;

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value ?? "";
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.style.display = visible ? "" : "none";
  }

  function showInlineMessage(id, message, type = "info") {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.className = "form-message show " + type;
    element.setAttribute("role", "status");
  }

  function hideInlineMessage(id) {
    const element = $(id);
    if (!element) return;

    element.textContent = "";
    element.className = "form-message";
  }

  function showMessage(message, type = "info") {
    const element = $("accountMessage");
    if (!element) return;

    element.textContent = message;
    element.className = "account-message show";

    if (type === "error") {
      element.classList.add("error");
    } else if (type === "success") {
      element.classList.add("success");
    }
  }

  function hideMessage() {
    const element = $("accountMessage");
    if (!element) return;

    element.textContent = "";
    element.className = "account-message";
  }

  function setButtonLoading(button, loading, loadingText = "Inasubiri...") {
    if (!button) return;

    if (loading) {
      if (!button.dataset.originalHtml) {
        button.dataset.originalHtml = button.innerHTML;
      }

      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = loadingText;
      return;
    }

    button.disabled = false;
    button.removeAttribute("aria-busy");

    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }

  function getFriendlyError(error) {
    const message = String(
      error?.message ||
      error?.error_description ||
      error?.details ||
      ""
    );

    if (/row.level security|rls|permission denied/i.test(message)) {
      return "Ruhusa za Supabase zimezuia kitendo hiki. Tutahitaji kukagua RLS.";
    }

    if (/schema cache|could not find.*column|does not exist/i.test(message)) {
      return "Muundo wa jedwali la Supabase hauendani na ombi hili. Schema itakaguliwa baadaye.";
    }

    if (/invalid login|jwt expired|session.*missing/i.test(message)) {
      return "Session ya akaunti imeisha. Tafadhali ingia tena.";
    }

    if (/network|fetch|failed to fetch/i.test(message)) {
      return "Imeshindikana kuwasiliana na Supabase. Kagua intaneti kisha ujaribu tena.";
    }

    if (/duplicate key|unique constraint/i.test(message)) {
      return "Taarifa hizi tayari zipo kwenye mfumo.";
    }

    return message || "Kuna tatizo lisilotarajiwa. Jaribu tena.";
  }

  function initializeSupabase() {
    if (window.zuneSupabase?.auth) {
      client = window.zuneSupabase;
      return true;
    }

    if (!window.supabase?.createClient) {
      showMessage(
        "Supabase haijapakia. Kagua intaneti na CDN kwenye account.html.",
        "error"
      );
      return false;
    }

    client = window.supabase.createClient(
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

    window.zuneSupabase = client;
    return true;
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  function getRoleLabel(role) {
    const labels = {
      buyer: "Mteja",
      vendor: "Muuzaji",
      admin: "Msimamizi"
    };

    return labels[role] || "Mwanachama wa ZUNE";
  }

  function getDisplayName(user, profile) {
    return (
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      user?.phone ||
      "Mtumiaji wa ZUNE"
    );
  }

  function getInitial(name) {
    const clean = String(name || "").trim();
    return clean ? clean.charAt(0).toUpperCase() : "Z";
  }

  function getProfileImageKey(userId) {
    return PROFILE_IMAGE_PREFIX + userId;
  }

  function getStoredProfileImage(userId) {
    try {
      return localStorage.getItem(getProfileImageKey(userId));
    } catch (error) {
      console.warn("Picha ya wasifu haikusomeka:", error);
      return null;
    }
  }

  function saveStoredProfileImage(userId, dataUrl) {
    try {
      localStorage.setItem(getProfileImageKey(userId), dataUrl);
      return true;
    } catch (error) {
      console.warn("Hifadhi ya picha imeshindwa:", error);
      return false;
    }
  }

  function removeStoredProfileImage(userId) {
    try {
      localStorage.removeItem(getProfileImageKey(userId));
      return true;
    } catch (error) {
      console.warn("Picha haikuondolewa:", error);
      return false;
    }
  }

  function getPreferences() {
    const defaults = {
      language: "sw",
      theme: "light",
      fontSize: "normal",
      notifications: true
    };

    try {
      const saved = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || "{}"
      );

      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  }

  function savePreferences(preferences) {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(preferences)
      );
      return true;
    } catch (error) {
      console.warn("Mipangilio haikuhifadhiwa:", error);
      return false;
    }
  }

  function applyTheme(theme) {
    let useDark = theme === "dark";

    if (theme === "system" && window.matchMedia) {
      useDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    }

    document.body.classList.toggle("dark-theme", useDark);
  }

  function applyFontSize(size) {
    const sizes = {
      normal: "14px",
      large: "16px",
      larger: "18px"
    };

    document.documentElement.style.fontSize =
      sizes[size] || sizes.normal;
  }  /* ==========================================
     SEHEMU YA 2/4
     Profile + Photo + Gold Verification Badge
     ========================================== */

  function renderProfilePhoto(userId) {
    const image = $("profileImage");
    const initial = $("profileInitial");
    if (!image || !initial) return;

    const savedImage = getStoredProfileImage(userId);

    if (savedImage) {
      image.src = savedImage;
      image.classList.add("visible");
      initial.style.display = "none";
      return;
    }

    image.removeAttribute("src");
    image.classList.remove("visible");
    initial.style.display = "";
  }

  function renderVerificationBadge(profile) {
    const badge = $("verificationBadge");
    const status = $("accountVerificationStatus");

    // Beji inaamuliwa na profiles.is_verified pekee.
    const verified = profile?.is_verified === true;

    if (badge) {
      badge.classList.toggle("visible", verified);
      badge.setAttribute(
        "aria-hidden",
        verified ? "false" : "true"
      );
    }

    if (status) {
      status.textContent = verified
        ? "Akaunti imethibitishwa na ZUNE."
        : "Akaunti bado haijathibitishwa.";
    }
  }

  function displayProfile(user, profile) {
    const name = getDisplayName(user, profile);
    const role = profile?.role || "buyer";

    setText("userNameDisplay", name);
    setText("userEmailDisplay", user.email || "Hakuna barua pepe");
    setText("accountEmailDetail", user.email || "Hakuna barua pepe");
    setText(
      "userPhoneDisplay",
      profile?.phone_number || user.phone || "Haijawekwa"
    );
    setText("profileInitial", getInitial(name));
    setText("accountRoleBadge", getRoleLabel(role));

    const nameInput = $("editFullName");
    if (nameInput) {
      nameInput.value = profile?.full_name || "";
    }

    const adminSection = $("adminAccountSection");
    if (adminSection) {
      adminSection.style.display = role === "admin" ? "" : "none";
    }

    const adminLink = $("adminMenuLink");
    if (adminLink) {
      adminLink.style.display = role === "admin" ? "" : "none";
    }

    renderProfilePhoto(user.id);
    renderVerificationBadge(profile);
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(
        new Error("Imeshindikana kusoma picha.")
      );

      reader.readAsDataURL(file);
    });
  }

  function loadBrowserImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(
        new Error("Picha uliyochagua haiwezi kufunguliwa.")
      );

      image.src = dataUrl;
    });
  }

  async function prepareProfileImage(file) {
    if (!file) {
      throw new Error("Chagua picha kwanza.");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tumia picha ya JPG, PNG au WEBP.");
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      throw new Error("Picha ya wasifu isizidi MB 8.");
    }

    const source = await readFileAsDataURL(file);
    const image = await loadBrowserImage(source);

    const longestSide = Math.max(image.width, image.height);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / longestSide
    );

    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Imeshindikana kuandaa picha.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
  }

  async function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    hideMessage();

    if (!currentUser) {
      event.target.value = "";
      showMessage("Ingia kwenye akaunti kwanza.", "error");
      return;
    }

    if (isSavingPhoto) return;

    isSavingPhoto = true;

    const button = $("chooseProfilePhotoBtn");
    setButtonLoading(button, true, "Inaandaa picha...");

    try {
      const dataUrl = await prepareProfileImage(file);

      if (!saveStoredProfileImage(currentUser.id, dataUrl)) {
        throw new Error(
          "Hifadhi ya simu imejaa. Jaribu picha ndogo."
        );
      }

      renderProfilePhoto(currentUser.id);

      showMessage(
        "Picha ya wasifu imehifadhiwa kwenye kifaa hiki.",
        "success"
      );
    } catch (error) {
      showMessage(getFriendlyError(error), "error");
    } finally {
      isSavingPhoto = false;
      event.target.value = "";
      setButtonLoading(button, false);
    }
  }

  function handleProfilePhotoRemove() {
    if (!currentUser) {
      showMessage("Ingia kwenye akaunti kwanza.", "error");
      return;
    }

    if (!removeStoredProfileImage(currentUser.id)) {
      showMessage(
        "Imeshindikana kuondoa picha kwenye kifaa hiki.",
        "error"
      );
      return;
    }

    renderProfilePhoto(currentUser.id);
    showMessage("Picha ya wasifu imeondolewa.", "success");
  }

  async function handleNameSubmit(event) {
    event.preventDefault();
    hideInlineMessage("profileEditMessage");

    if (!client || !currentUser || !currentProfile) {
      showInlineMessage(
        "Taarifa za akaunti hazijapakia. Jaribu kupakia upya.",
        "error"
      );
      return;
    }

    if (isSavingProfile) return;

    const input = $("editFullName");
    const button = $("saveNameBtn");
    const fullName = String(input?.value || "").trim();

    if (fullName.length < 2 || fullName.length > 80) {
      showInlineMessage(
        "Jina lazima liwe na herufi 2 hadi 80.",
        "error"
      );
      return;
    }

    isSavingProfile = true;
    setButtonLoading(button, true, "Inahifadhi...");

    try {
      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError) throw authError;

      if (authData?.user?.id !== currentUser.id) {
        throw new Error("Session imebadilika. Ingia tena.");
      }

      const { data, error } = await client
        .from(PROFILE_TABLE)
        .update({ full_name: fullName })
        .eq("id", currentUser.id)
        .select("id, full_name, phone_number, role, is_verified")
        .single();

      if (error) throw error;

      currentProfile = data;

      // Metadata ni ya ziada; profiles ndiyo chanzo cha jina hapa.
      const { error: metadataError } =
        await client.auth.updateUser({
          data: { full_name: fullName }
        });

      if (metadataError) {
        console.warn(
          "Jina limehifadhiwa kwenye profiles; metadata haijasasishwa."
        );
      }

      displayProfile(currentUser, currentProfile);

      showInlineMessage(
        "Jina lako limehifadhiwa kikamilifu.",
        "success"
      );
    } catch (error) {
      console.error("Kuhifadhi jina kumeshindwa:", error);

      showInlineMessage(
        getFriendlyError(error),
        "error"
      );
    } finally {
      isSavingProfile = false;
      setButtonLoading(button, false);
    }
  }

  async function refreshProfileFromSupabase() {
    if (!client || !currentUser) return;

    const { data, error } = await client
      .from(PROFILE_TABLE)
      .select("id, full_name, phone_number, role, is_verified")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (!data || data.id !== currentUser.id) {
      throw new Error("Wasifu wa akaunti haujapatikana.");
    }

    currentProfile = data;
    displayProfile(currentUser, currentProfile);
  }  /* ==========================================
     SEHEMU YA 3/4
     Verification + Settings + Customer Support
     ========================================== */

  function setVerificationStatus(message) {
    const element = $("verificationCurrentStatus");
    if (!element) return;

    element.textContent = message;
    element.className = "account-message show";
  }

  function setVerificationFormVisible(visible) {
    const form = $("verificationApplicationForm");
    if (form) form.style.display = visible ? "" : "none";
  }

  function renderVerificationApplication(application) {
    latestVerificationApplication = application || null;

    if (currentProfile?.is_verified === true) {
      setVerificationFormVisible(false);
      setVerificationStatus(
        "Akaunti yako imethibitishwa. Beji ya dhahabu imewezeshwa."
      );
      return;
    }

    if (!application) {
      setVerificationFormVisible(true);
      setVerificationStatus(
        "Hali ya ombi itaonekana hapa baada ya kuunganishwa na Supabase."
      );
      return;
    }

    const status = String(application.status || "")
      .trim()
      .toLowerCase();

    if (status === "pending") {
      setVerificationFormVisible(false);
      setVerificationStatus(
        "Ombi lako linasubiri kukaguliwa na Admin."
      );
      return;
    }

    if (status === "approved") {
      setVerificationFormVisible(false);
      setVerificationStatus(
        "Ombi limeidhinishwa. Hali ya beji itategemea uthibitisho wa wasifu kwenye Supabase."
      );
      return;
    }

    if (status === "rejected") {
      setVerificationFormVisible(true);
      setVerificationStatus(
        "Ombi la awali limekataliwa. Rekebisha taarifa baada ya kusoma maelekezo ya Admin."
      );
      return;
    }

    setVerificationFormVisible(true);
    setVerificationStatus(
      "Hali ya ombi haijatambulika. Itakaguliwa wakati wa kuunganisha Supabase."
    );
  }

  function validateVerificationForm() {
    const nidaNumber = String(
      $("verificationNidaNumber")?.value || ""
    ).trim();

    const frontFile = $("nidaFrontImage")?.files?.[0];
    const backFile = $("nidaBackImage")?.files?.[0];
    const reason = String(
      $("verificationReason")?.value || ""
    ).trim();
    const note = String(
      $("verificationDocumentNote")?.value || ""
    ).trim();
    const consent = $("verificationConsent")?.checked === true;

    if (nidaNumber.length < 5 || nidaNumber.length > 30) {
      throw new Error(
        "Ingiza namba ya NIDA iliyo sahihi."
      );
    }

    if (!frontFile || !backFile) {
      throw new Error(
        "Chagua picha ya mbele na nyuma ya NIDA."
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    for (const file of [frontFile, backFile]) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Picha za NIDA lazima ziwe JPG, PNG au WEBP."
        );
      }

      if (file.size > MAX_PROFILE_IMAGE_SIZE) {
        throw new Error(
          "Kila picha ya NIDA isizidi MB 8."
        );
      }
    }

    if (reason.length < 10 || reason.length > 1000) {
      throw new Error(
        "Sababu ya ombi iwe na herufi 10 hadi 1000."
      );
    }

    if (note.length > 500) {
      throw new Error(
        "Maelezo ya ziada yasizidi herufi 500."
      );
    }

    if (!consent) {
      throw new Error(
        "Kubali masharti na sera ya faragha kabla ya kuendelea."
      );
    }

    return {
      nidaNumber,
      frontFile,
      backFile,
      reason,
      note
    };
  }

  async function handleVerificationSubmit(event) {
    event.preventDefault();
    hideInlineMessage("verificationMessage");

    if (!currentUser || !currentProfile) {
      showInlineMessage(
        "Ingia kwenye akaunti yako kwanza.",
        "error"
      );
      return;
    }

    if (currentProfile.is_verified === true) {
      renderVerificationApplication(null);
      showInlineMessage(
        "Akaunti yako tayari imethibitishwa.",
        "success"
      );
      return;
    }

    if (isSubmittingVerification) return;

    const button = $("submitVerificationButton");

    try {
      // Thibitisha fomu bila kuweka nyaraka nyeti kwenye browser.
      validateVerificationForm();

      isSubmittingVerification = true;
      setButtonLoading(button, true, "Inakagua...");

      /*
       * HATUA YA USALAMA:
       * Upload na INSERT hazijawezeshwa hadi tutakapokagua:
       * 1. Jedwali halisi na columns zake.
       * 2. Private Storage bucket.
       * 3. RLS ya mtumiaji na Admin.
       * 4. Utaratibu wa idhini wa Admin.
       *
       * Usihifadhi NIDA kwenye localStorage wala kutuma picha
       * kama public URL.
       */
      showInlineMessage(
        "Fomu imekaguliwa, lakini kutuma ombi la NIDA bado kunasubiri muunganisho salama wa Supabase. Taarifa zako hazijahifadhiwa wala kutumwa.",
        "info"
      );

      setVerificationStatus(
        "Muunganisho salama wa NIDA unasubiri kusanidiwa. Beji haijabadilika."
      );
    } catch (error) {
      showInlineMessage(error.message, "error");
    } finally {
      isSubmittingVerification = false;
      setButtonLoading(button, false);
    }
  }

  function loadAccountSettings() {
    const preferences = getPreferences();

    const language = $("languageSetting");
    const theme = $("themeSetting");
    const fontSize = $("fontSizeSetting");
    const notifications = $("notificationPreference");

    if (language) language.value = preferences.language;
    if (theme) theme.value = preferences.theme;
    if (fontSize) fontSize.value = preferences.fontSize;

    if (notifications) {
      notifications.checked = preferences.notifications !== false;
    }

    applyTheme(preferences.theme);
    applyFontSize(preferences.fontSize);
  }

  function handleSettingsSave() {
    const preferences = {
      language: $("languageSetting")?.value || "sw",
      theme: $("themeSetting")?.value || "light",
      fontSize: $("fontSizeSetting")?.value || "normal",
      notifications:
        $("notificationPreference")?.checked !== false
    };

    if (!savePreferences(preferences)) {
      showInlineMessage(
        "Imeshindikana kuhifadhi mipangilio kwenye kifaa hiki.",
        "error"
      );
      return;
    }

    applyTheme(preferences.theme);
    applyFontSize(preferences.fontSize);

    showInlineMessage(
      "Mipangilio imehifadhiwa kwenye kifaa hiki.",
      "success"
    );
  }

  function attachPreferencePreview() {
    const theme = $("themeSetting");
    const fontSize = $("fontSizeSetting");

    if (theme) {
      theme.addEventListener("change", () => {
        applyTheme(theme.value);
      });
    }

    if (fontSize) {
      fontSize.addEventListener("change", () => {
        applyFontSize(fontSize.value);
      });
    }
  }

  function handleSupportSubmit(event) {
    event.preventDefault();
    hideInlineMessage("supportTicketMessage");

    if (!currentUser) {
      showInlineMessage(
        "Ingia kwenye akaunti yako kwanza.",
        "error"
      );
      return;
    }

    if (isSubmittingSupport) return;

    const category = $("supportCategory")?.value || "";
    const subject = String(
      $("supportSubject")?.value || ""
    ).trim();
    const message = String(
      $("supportDescription")?.value || ""
    ).trim();

    if (!category) {
      showInlineMessage(
        "Chagua aina ya tatizo.",
        "error"
      );
      return;
    }

    if (subject.length < 3 || subject.length > 120) {
      showInlineMessage(
        "Kichwa kiwe na herufi 3 hadi 120.",
        "error"
      );
      return;
    }

    if (message.length < 10 || message.length > 3000) {
      showInlineMessage(
        "Maelezo ya tatizo yawe na herufi 10 hadi 3000.",
        "error"
      );
      return;
    }

    /*
     * Ticket haitahifadhiwa kwenye localStorage au kuonyeshwa
     * kana kwamba imetumwa. Jedwali na RLS vitasanidiwa baadaye.
     */
    showInlineMessage(
      "Fomu imekaguliwa, lakini mfumo wa kutuma tiketi na kupokea majibu ya Admin bado haujaunganishwa na Supabase. Ombi halijatumwa.",
      "info"
    );
  }

  function loadMySupportTickets() {
    const container = $("mySupportTickets");
    if (!container) return;

    container.replaceChildren();

    const message = document.createElement("div");
    message.className = "account-message show";
    message.textContent =
      "Orodha ya maombi na majibu ya Admin itaonekana hapa baada ya kuunganisha mfumo wa tiketi na Supabase.";

    container.appendChild(message);
  }  /* ==========================================
     SEHEMU YA 4/4
     Events + Auth + Load Account + Logout
     ========================================== */

  function attachEvents() {
    const photoInput = $("profileImageInput");
    const removePhotoButton = $("removeProfilePhotoBtn");
    const editNameForm = $("editNameForm");
    const verificationForm = $("verificationApplicationForm");
    const settingsButton = $("saveAccountSettingsBtn");
    const supportForm = $("supportTicketForm");
    const refreshTicketsButton = $("refreshSupportTicketsBtn");
    const logoutButton = $("logoutButton");

    if (photoInput) {
      photoInput.addEventListener(
        "change",
        handleProfilePhotoChange
      );
    }

    if (removePhotoButton) {
      removePhotoButton.addEventListener(
        "click",
        handleProfilePhotoRemove
      );
    }

    if (editNameForm) {
      editNameForm.addEventListener(
        "submit",
        handleNameSubmit
      );
    }

    if (verificationForm) {
      verificationForm.addEventListener(
        "submit",
        handleVerificationSubmit
      );
    }

    if (settingsButton) {
      settingsButton.addEventListener(
        "click",
        handleSettingsSave
      );
    }

    if (supportForm) {
      supportForm.addEventListener(
        "submit",
        handleSupportSubmit
      );
    }

    if (refreshTicketsButton) {
      refreshTicketsButton.addEventListener(
        "click",
        loadMySupportTickets
      );
    }

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        logoutUser
      );
    }

    attachPreferencePreview();
  }

  async function loadAccount() {
    if (isLoadingAccount) return;

    isLoadingAccount = true;
    hideMessage();

    try {
      if (!client && !initializeSupabase()) return;

      const {
        data: authData,
        error: authError
      } = await client.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user) {
        redirectToLogin();
        return;
      }

      currentUser = user;

      const {
        data: profile,
        error: profileError
      } = await client
        .from(PROFILE_TABLE)
        .select(
          "id, full_name, phone_number, role, is_verified"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.id !== user.id) {
        showMessage(
          "Wasifu wa akaunti haujapatikana. Kagua profiles na trigger ya Supabase.",
          "error"
        );
        return;
      }

      currentProfile = profile;

      displayProfile(currentUser, currentProfile);
      renderVerificationApplication(null);
      loadAccountSettings();
      loadMySupportTickets();

      showMessage(
        "Akaunti imepakiwa kikamilifu.",
        "success"
      );
    } catch (error) {
      console.error("ZUNE account load error:", error);

      showMessage(
        "Imeshindikana kupakia akaunti: " +
          getFriendlyError(error),
        "error"
      );
    } finally {
      isLoadingAccount = false;
    }
  }

  async function logoutUser() {
    if (!client) {
      redirectToLogin();
      return;
    }

    const button = $("logoutButton");
    setButtonLoading(button, true, "Unatoka...");

    try {
      const { error } = await client.auth.signOut();

      if (error) throw error;

      currentUser = null;
      currentProfile = null;
      latestVerificationApplication = null;

      redirectToLogin();
    } catch (error) {
      console.error("ZUNE logout error:", error);

      showMessage(
        "Imeshindikana kutoka: " +
          getFriendlyError(error),
        "error"
      );

      setButtonLoading(button, false);
    }
  }

  function attachAuthListener() {
    if (!client || authSubscription) return;

    const { data, error } = client.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          currentUser = null;
          currentProfile = null;
          latestVerificationApplication = null;

          redirectToLogin();
        }
      }
    );

    if (error) {
      console.error("ZUNE auth listener error:", error);
      return;
    }

    authSubscription = data?.subscription || null;
  }

  async function init() {
    loadAccountSettings();
    attachEvents();

    if (!initializeSupabase()) return;

    attachAuthListener();
    await loadAccount();
  }

  // Functions zinazoweza kuitwa na sehemu nyingine za ukurasa.
  window.zuneAccount = {
    reload: loadAccount,
    logout: logoutUser,
    refreshProfile: refreshProfileFromSupabase
  };

  // Utangamano na vitufe vya zamani kama vipo kwenye ukurasa.
  window.loadAccount = loadAccount;
  window.logoutUser = logoutUser;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();