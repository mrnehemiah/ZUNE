
/* ==========================================
   ZUNE ACCOUNT.JS
   SEHEMU YA 1/5: SUPABASE NA FUNCTIONS ZA MSINGI
   ========================================== */

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://rpkogiieegqgxqbzwxwo.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

  const LOGIN_PAGE = "./login.html";
  const PROFILE_TABLE = "profiles";
  const VERIFICATION_TABLE = "verification_applications";

  const MAX_FILE_SIZE = 8 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 420;
  const IMAGE_QUALITY = 0.75;
  const IMAGE_STORAGE_PREFIX = "zune_profile_picture_";

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let latestVerificationApplication = null;
  let isSubmittingVerification = false;
  let isSavingProfile = false;
  let isSavingPhoto = false;
  let authListener = null;

  const $ = (id) => document.getElementById(id);

  function showMessage(message, type = "info") {
    const element = $("accountMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");

    element.classList.remove(
      "text-red-700",
      "text-green-700",
      "text-blue-700",
      "bg-red-50",
      "bg-green-50",
      "bg-blue-50"
    );

    const styles = {
      error: ["text-red-700", "bg-red-50"],
      success: ["text-green-700", "bg-green-50"],
      info: ["text-blue-700", "bg-blue-50"]
    };

    (styles[type] || styles.info).forEach((className) => {
      element.classList.add(className);
    });
  }

  function hideMessage() {
    const element = $("accountMessage");
    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
  }

  function setButtonState(button, disabled, label, originalLabel) {
    if (!button) return;

    if (disabled) {
      if (!button.dataset.originalLabel) {
        button.dataset.originalLabel =
          originalLabel || button.textContent.trim();
      }

      button.disabled = true;

      if (label) button.textContent = label;
      return;
    }

    button.disabled = false;

    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  }

  function setEditMessage(message, type = "info") {
    const element = $("profileEditMessage");
    if (!element) {
      showMessage(message, type);
      return;
    }

    element.textContent = message;
    element.classList.remove("hidden");
    element.classList.remove(
      "text-red-700",
      "text-green-700",
      "text-blue-700"
    );

    const color = {
      error: "text-red-700",
      success: "text-green-700",
      info: "text-blue-700"
    };

    element.classList.add(color[type] || color.info);
  }

  function getRoleLabel(role) {
    const labels = {
      buyer: "Mteja",
      vendor: "Muuzaji",
      admin: "Msimamizi"
    };

    return labels[role] || "Mtumiaji";
  }

  function getInitial(name) {
    const cleanName = String(name || "").trim();

    return cleanName
      ? cleanName.charAt(0).toUpperCase()
      : "Z";
  }

  function getDisplayName(user, profile) {
    return (
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "Mtumiaji wa ZUNE"
    );
  }

  function getPictureKey(userId) {
    return IMAGE_STORAGE_PREFIX + userId;
  }

  function getStoredPicture(userId) {
    try {
      return localStorage.getItem(getPictureKey(userId));
    } catch (error) {
      console.warn("Imeshindikana kusoma picha:", error);
      return null;
    }
  }

  function saveStoredPicture(userId, dataUrl) {
    try {
      localStorage.setItem(getPictureKey(userId), dataUrl);
      return true;
    } catch (error) {
      console.error("Imeshindikana kuhifadhi picha:", error);
      return false;
    }
  }

  function removeStoredPicture(userId) {
    try {
      localStorage.removeItem(getPictureKey(userId));
      return true;
    } catch (error) {
      console.error("Imeshindikana kufuta picha:", error);
      return false;
    }
  }

  function initializeSupabase() {
    if (window.zuneSupabase) {
      client = window.zuneSupabase;
      return true;
    }

    if (!window.supabase?.createClient) {
      showMessage(
        "Supabase haijapakia. Angalia internet na Supabase CDN kwenye account.html.",
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

  function getFriendlyError(error) {
    const message = String(
      error?.message || error?.error_description || ""
    );

    if (/row-level security|rls|permission denied/i.test(message)) {
      return "Ruhusa ya Supabase imezuia kitendo hiki. Kagua sera za RLS.";
    }

    if (/verification_applications/i.test(message) &&
        /does not exist|schema cache|could not find/i.test(message)) {
      return "Jedwali la verification_applications halijapatikana. Kagua kama lipo Supabase.";
    }

    if (/network|fetch/i.test(message)) {
      return "Imeshindikana kuwasiliana na Supabase. Kagua internet kisha ujaribu tena.";
    }

    return message || "Kuna tatizo lisilotarajiwa. Jaribu tena.";
  }

  
/* ==========================================
   SEHEMU YA 2/5: WASIFU NA PICHA
   ========================================== */

  function displayProfile(user, profile) {
    const name = getDisplayName(user, profile);
    const role = profile?.role || "buyer";

    const nameDisplay = $("userNameDisplay");
    const emailDisplay = $("userEmailDisplay");
    const emailDetail = $("accountEmailDetail");
    const phoneDisplay = $("userPhoneDisplay");
    const roleBadge = $("accountRoleBadge");
    const nameInput = $("editFullName");
    const initial = $("profileInitial");

    if (nameDisplay) nameDisplay.textContent = name;
    if (emailDisplay) emailDisplay.textContent = user.email || "Hakuna email";
    if (emailDetail) emailDetail.textContent = user.email || "Hakuna email";
    if (phoneDisplay) {
      phoneDisplay.textContent =
        profile?.phone_number || user.phone || "Haijawekwa";
    }

    if (roleBadge) roleBadge.textContent = getRoleLabel(role);
    if (nameInput) nameInput.value = profile?.full_name || "";

    if (initial) {
      initial.textContent = getInitial(name);
    }

    const adminLink = $("adminMenuLink");

    if (adminLink) {
      if (role === "admin") {
        adminLink.classList.remove("hidden");
      } else {
        adminLink.classList.add("hidden");
      }
    }

    renderProfilePhoto(user.id);
    renderVerificationBadge(profile);
  }

  function renderProfilePhoto(userId) {
    const image = $("profileImage");
    const initial = $("profileInitial");
    const savedPicture = getStoredPicture(userId);

    if (savedPicture && image) {
      image.src = savedPicture;
      image.classList.remove("hidden");

      if (initial) initial.classList.add("hidden");
      return;
    }

    if (image) {
      image.removeAttribute("src");
      image.classList.add("hidden");
    }

    if (initial) initial.classList.remove("hidden");
  }

  function readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(
        new Error("Imeshindikana kusoma picha hii.")
      );

      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(
        new Error("Picha haiwezi kufunguliwa.")
      );

      image.src = dataUrl;
    });
  }

  async function prepareProfileImage(file) {
    if (!file) {
      throw new Error("Chagua picha kwanza.");
    }

    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("Faili ulilochagua si picha.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Picha isizidi MB 8.");
    }

    const originalDataUrl = await readImageAsDataURL(file);
    const image = await loadImage(originalDataUrl);

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

  async function handlePhotoSave() {
    if (!currentUser) {
      showMessage("Ingia kwenye akaunti yako kwanza.", "error");
      return;
    }

    if (isSavingPhoto) return;

    const input = $("profileImageInput");
    const button = $("saveProfilePhotoBtn");
    const file = input?.files?.[0];

    if (!file) {
      showMessage("Tafadhali chagua picha kwanza.", "error");
      return;
    }

    isSavingPhoto = true;
    setButtonState(button, true, "Inaandaa picha...");

    try {
      const dataUrl = await prepareProfileImage(file);
      const saved = saveStoredPicture(currentUser.id, dataUrl);

      if (!saved) {
        throw new Error(
          "Hifadhi ya simu imejaa au haipatikani. Jaribu picha ndogo."
        );
      }

      renderProfilePhoto(currentUser.id);

      if (input) input.value = "";

      showMessage("Picha ya wasifu imehifadhiwa kwenye kifaa hiki.", "success");
    } catch (error) {
      showMessage(getFriendlyError(error), "error");
    } finally {
      isSavingPhoto = false;
      setButtonState(button, false);
    }
  }

  function handlePhotoRemove() {
    if (!currentUser) {
      showMessage("Ingia kwenye akaunti yako kwanza.", "error");
      return;
    }

    removeStoredPicture(currentUser.id);
    renderProfilePhoto(currentUser.id);

    const input = $("profileImageInput");
    if (input) input.value = "";

    showMessage("Picha ya wasifu imeondolewa kwenye kifaa hiki.", "success");
  }

  async function handleNameSubmit(event) {
    event.preventDefault();
    hideMessage();

    if (!client || !currentUser || !currentProfile) {
      showMessage("Taarifa za akaunti bado hazijapakia.", "error");
      return;
    }

    if (isSavingProfile) return;

    const input = $("editFullName");
    const button = $("saveNameBtn");
    const fullName = String(input?.value || "").trim();

    if (fullName.length < 2 || fullName.length > 80) {
      setEditMessage(
        "Jina liwe na herufi angalau 2 na lisizidi herufi 80.",
        "error"
      );
      return;
    }

    isSavingProfile = true;
    setButtonState(button, true, "Inahifadhi...");

    try {
      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError) throw authError;

      if (!authData?.user ||
          authData.user.id !== currentUser.id) {
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

      // Kusasisha metadata ni kwa ajili ya urahisi tu.
      // profiles ndiyo chanzo kikuu cha jina la akaunti.
      const { error: metadataError } =
        await client.auth.updateUser({
          data: { full_name: fullName }
        });

      if (metadataError) {
        console.warn(
          "Jina limehifadhiwa kwenye profiles, lakini metadata haijasasishwa:",
          metadataError.message
        );
      }

      displayProfile(currentUser, currentProfile);
      setEditMessage("Jina limehifadhiwa kikamilifu.", "success");
    } catch (error) {
      setEditMessage(getFriendlyError(error), "error");
    } finally {
      isSavingProfile = false;
      setButtonState(button, false);
    }
  }

 
/* ==========================================
   SEHEMU YA 3/5: VERIFICATION BADGE
   ========================================== */

  function renderVerificationBadge(profile) {
    const badge = $("verificationBadge");
    const statusElement = $("accountVerificationStatus");

    // Beji inaamuliwa na profiles.is_verified pekee.
    const verified = profile?.is_verified === true;

    if (badge) {
      badge.classList.toggle("hidden", !verified);

      if (verified) {
        badge.classList.add("inline-flex");
      } else {
        badge.classList.remove("inline-flex");
      }
    }

    if (statusElement) {
      statusElement.textContent = verified
        ? "Akaunti imethibitishwa"
        : "Akaunti bado haijathibitishwa";
    }
  }

  function setVerificationMessage(message, type = "info") {
    const element = $("verificationMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");

    element.classList.remove(
      "text-red-700",
      "text-green-700",
      "text-blue-700",
      "bg-red-50",
      "bg-green-50",
      "bg-blue-50"
    );

    const styles = {
      error: ["text-red-700", "bg-red-50"],
      success: ["text-green-700", "bg-green-50"],
      info: ["text-blue-700", "bg-blue-50"]
    };

    (styles[type] || styles.info).forEach((className) => {
      element.classList.add(className);
    });
  }

  function hideVerificationMessage() {
    const element = $("verificationMessage");
    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
  }

  function setVerificationStatus(message) {
    const element = $("verificationCurrentStatus");
    if (!element) return;

    // textContent hutumika kuzuia HTML kutoka kwenye data za mtumiaji.
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function showVerificationForm(show) {
    const form = $("verificationApplicationForm");

    if (form) {
      form.classList.toggle("hidden", !show);
    }
  }

  function renderVerificationApplication(application) {
    latestVerificationApplication = application || null;

    const verified = currentProfile?.is_verified === true;

    if (verified) {
      showVerificationForm(false);
      setVerificationStatus(
        "Akaunti yako imethibitishwa. Beji ya dhahabu imewashwa."
      );
      return;
    }

    if (!application) {
      showVerificationForm(true);
      setVerificationStatus(
        "Bado hujatuma ombi la uthibitisho."
      );
      return;
    }

    const status = String(application.status || "").toLowerCase();

    if (status === "pending") {
      showVerificationForm(false);
      setVerificationStatus(
        "Ombi lako limepokelewa na linasubiri kukaguliwa na msimamizi."
      );
      return;
    }

    if (status === "rejected") {
      showVerificationForm(true);

      const adminNote = String(application.admin_note || "").trim();

      setVerificationStatus(
        adminNote
          ? "Ombi la awali limekataliwa. Maelezo ya msimamizi: " + adminNote
          : "Ombi la awali limekataliwa. Unaweza kusoma maelekezo na kutuma ombi jipya."
      );
      return;
    }

    if (status === "approved") {
      // Hali ya ombi haimaanishi kuwa profiles.is_verified tayari ni true.
      showVerificationForm(false);
      setVerificationStatus(
        "Ombi limeidhinishwa, lakini beji bado haijawezeshwa kwenye wasifu. Msimamizi anahitaji kukamilisha uthibitisho."
      );
      return;
    }

    showVerificationForm(true);
    setVerificationStatus(
      "Hali ya ombi haijatambulika. Unaweza kujaribu tena baadaye."
    );
  }

  async function loadVerificationApplication() {
    if (!client || !currentUser || !currentProfile) return;

    const verified = currentProfile.is_verified === true;

    if (verified) {
      renderVerificationApplication(null);
      return;
    }

    try {
      const { data, error } = await client
        .from(VERIFICATION_TABLE)
        .select(
          "id, user_id, full_name, reason, document_note, status, admin_note, created_at, updated_at"
        )
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const application =
        Array.isArray(data) && data.length > 0
          ? data[0]
          : null;

      renderVerificationApplication(application);
    } catch (error) {
      console.error(
        "Imeshindikana kupakia ombi la uthibitisho:",
        error
      );

      showVerificationForm(false);

      setVerificationStatus(
        "Imeshindikana kusoma ombi. " + getFriendlyError(error)
      );
    }
  }

  async function handleVerificationSubmit(event) {
    event.preventDefault();
    hideVerificationMessage();

    if (!client || !currentUser || !currentProfile) {
      setVerificationMessage(
        "Tafadhali ingia kwenye akaunti yako kwanza.",
        "error"
      );
      return;
    }

    if (isSubmittingVerification) return;

    if (currentProfile.is_verified === true) {
      showVerificationForm(false);
      setVerificationMessage(
        "Akaunti yako tayari imethibitishwa.",
        "success"
      );
      return;
    }

    if (
      latestVerificationApplication &&
      ["pending", "approved"].includes(
        String(latestVerificationApplication.status || "").toLowerCase()
      )
    ) {
      renderVerificationApplication(latestVerificationApplication);
      setVerificationMessage(
        "Tayari una ombi linalosubiri au lililoidhinishwa. Huwezi kutuma ombi jingine kwa sasa.",
        "info"
      );
      return;
    }

    const reasonInput = $("verificationReason");
    const documentInput = $("verificationDocumentNote");
    const button = $("submitVerificationButton");

    const reason = String(reasonInput?.value || "").trim();
    const documentNote = String(documentInput?.value || "").trim();

    if (reason.length < 10 || reason.length > 1000) {
      setVerificationMessage(
        "Eleza sababu ya kuomba uthibitisho kwa herufi 10 hadi 1000.",
        "error"
      );
      return;
    }

    if (documentNote.length > 500) {
      setVerificationMessage(
        "Maelezo ya nyaraka yasizidi herufi 500.",
        "error"
      );
      return;
    }

    isSubmittingVerification = true;
    setButtonState(button, true, "Inatuma ombi...");

    try {
      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError) throw authError;

      if (
        !authData?.user ||
        authData.user.id !== currentUser.id
      ) {
        throw new Error(
          "Session imebadilika. Ingia tena kisha ujaribu."
        );
      }

      const applicationData = {
        user_id: currentUser.id,
        full_name: getDisplayName(currentUser, currentProfile),
        reason,
        document_note: documentNote || null
      };

      // Status na sehemu za msimamizi hazitumwi na mtumiaji.
      // Supabase huweka status = pending kwa default.
      const { error } = await client
        .from(VERIFICATION_TABLE)
        .insert(applicationData);

      if (error) throw error;

      if (reasonInput) reasonInput.value = "";
      if (documentInput) documentInput.value = "";

      setVerificationMessage(
        "Ombi lako limetumwa. Linasubiri kukaguliwa na msimamizi.",
        "success"
      );

      await loadVerificationApplication();
    } catch (error) {
      console.error("Tatizo la kutuma ombi:", error);

      setVerificationMessage(
        "Ombi halikutumwa: " + getFriendlyError(error),
        "error"
      );
    } finally {
      isSubmittingVerification = false;
      setButtonState(button, false);
    }
  }

 
/* ==========================================
   SEHEMU YA 4/5: EVENTS, LOGIN NA LOGOUT
   ========================================== */

  function attachEvents() {
    const photoInput = $("profileImageInput");
    const savePhotoButton = $("saveProfilePhotoBtn");
    const removePhotoButton = $("removeProfilePhotoBtn");
    const editNameForm = $("editNameForm");
    const verificationForm = $("verificationApplicationForm");
    const retryButton = $("retryAccountButton");
    const logoutButton = $("logoutButton");

    if (photoInput) {
      photoInput.addEventListener("change", () => {
        hideMessage();

        const file = photoInput.files?.[0];

        if (file && file.size > MAX_FILE_SIZE) {
          photoInput.value = "";
          showMessage("Picha isizidi MB 8.", "error");
        }
      });
    }

    if (savePhotoButton) {
      savePhotoButton.addEventListener("click", handlePhotoSave);
    }

    if (removePhotoButton) {
      removePhotoButton.addEventListener("click", handlePhotoRemove);
    }

    if (editNameForm) {
      editNameForm.addEventListener("submit", handleNameSubmit);
    }

    if (verificationForm) {
      verificationForm.addEventListener(
        "submit",
        handleVerificationSubmit
      );
    }

    if (retryButton) {
      retryButton.addEventListener("click", () => {
        loadAccount();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", logoutUser);
    }
  }

  async function logoutUser() {
    if (!client) {
      redirectToLogin();
      return;
    }

    const button = $("logoutButton");
    setButtonState(button, true, "Unatoka...");

    try {
      const { error } = await client.auth.signOut();

      if (error) throw error;

      currentUser = null;
      currentProfile = null;
      latestVerificationApplication = null;

      redirectToLogin();
    } catch (error) {
      console.error("Tatizo la kutoka:", error);

      showMessage(
        "Imeshindikana kutoka: " + getFriendlyError(error),
        "error"
      );

      setButtonState(button, false);
    }
  }

  function attachAuthListener() {
    if (!client || authListener) return;

    const { data } = client.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          currentUser = null;
          currentProfile = null;
          latestVerificationApplication = null;

          redirectToLogin();
        }
      }
    );

    authListener = data?.subscription || null;
  }

 
/* ==========================================
   SEHEMU YA 5/5: LOAD ACCOUNT NA INIT
   ========================================== */

  async function loadAccount() {
    hideMessage();

    if (!client && !initializeSupabase()) {
      return;
    }

    try {
      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user) {
        redirectToLogin();
        return;
      }

      currentUser = user;

      const { data: profile, error: profileError } =
        await client
          .from(PROFILE_TABLE)
          .select(
            "id, full_name, phone_number, role, is_verified"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.id !== user.id) {
        showMessage(
          "Wasifu wa akaunti hii haujapatikana. Kagua jedwali la profiles na trigger ya Supabase.",
          "error"
        );
        return;
      }

      currentProfile = profile;

      displayProfile(currentUser, currentProfile);

      await loadVerificationApplication();

      showMessage(
        "Taarifa za akaunti zimepakiwa kikamilifu.",
        "success"
      );
    } catch (error) {
      console.error("Tatizo la kupakia akaunti:", error);

      showMessage(
        "Imeshindikana kupakia akaunti: " + getFriendlyError(error),
        "error"
      );
    }
  }

  async function init() {
    if (!initializeSupabase()) return;

    attachEvents();
    attachAuthListener();

    await loadAccount();
  }

  // Ruhusu button ya HTML yenye onclick="loadAccount()" kuitumia.
  window.loadAccount = loadAccount;
  window.logoutUser = logoutUser;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
