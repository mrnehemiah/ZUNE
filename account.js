
/* =====================================================
   ZUNE ACCOUNT.JS
   - Supabase authentication
   - Profile loading and editing
   - Profile picture stored in LocalStorage
   - User-specific picture keys
   - Admin menu protection in the UI
===================================================== */

(() => {
  "use strict";

  // ==========================================
  // 1. SUPABASE CONFIGURATION
  // ==========================================

  const SUPABASE_URL =
    "https://rpkogiieegqgxqbzwxwo.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

  const LOGIN_PAGE = "./login.html";
  const PROFILE_TABLE = "profiles";

  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
  const MAX_IMAGE_DIMENSION = 420;
  const IMAGE_QUALITY = 0.75;
  const IMAGE_STORAGE_PREFIX = "zune_profile_picture_";

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;
  let pendingPicture = undefined;
  let isSavingName = false;
  let isSavingPicture = false;
  let authListener = null;

  // ==========================================
  // 2. HELPERS
  // ==========================================

  const $ = (id) => document.getElementById(id);

  function showMessage(message, type = "info") {
    const box = $("accountMessage");
    if (!box) return;

    const styles = {
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
      info: "border-blue-200 bg-blue-50 text-blue-800"
    };

    box.className =
      "rounded-2xl border p-4 text-sm " +
      (styles[type] || styles.info);

    box.textContent = message;
    box.classList.remove("hidden");
  }

  function hideMessage() {
    $("accountMessage")?.classList.add("hidden");
  }

  function setButtonState(button, disabled, text) {
    if (!button) return;

    button.disabled = disabled;

    if (text !== undefined) {
      button.textContent = text;
    }
  }

  function setEditMessage(message, isError = false) {
    let box = $("profileEditMessage");
    if (!box) return;

    box.textContent = message;
    box.className = isError
      ? "text-sm text-red-600"
      : "text-sm text-green-700";

    box.classList.remove("hidden");
  }

  function escapeText(value) {
    return String(value ?? "");
  }

  function getPictureKey(userId) {
    return IMAGE_STORAGE_PREFIX + userId;
  }

  function getRoleLabel(role) {
    const labels = {
      buyer: "Mteja",
      vendor: "Muuzaji",
      admin: "Msimamizi"
    };

    return labels[role] || "Mtumiaji wa ZUNE";
  }

  function getInitial(name) {
    const cleaned = String(name || "").trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() : "";
  }

  // ==========================================
  // 3. INITIALIZE SUPABASE
  // ==========================================

  function initializeSupabase() {
    if (supabaseClient) return supabaseClient;

    if (!window.supabase?.createClient) {
      throw new Error(
        "Supabase SDK haijapakiwa. Kagua account.html."
      );
    }

    // Tumia client iliyopo ikiwa app.js/account.js nyingine
    // tayari imeanzisha client hiyo.
    if (window.zuneSupabase?.auth) {
      supabaseClient = window.zuneSupabase;
      return supabaseClient;
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

    window.zuneSupabase = supabaseClient;
    return supabaseClient;
  }

  // ==========================================
  // 4. AUTHENTICATION
  // ==========================================

  async function getAuthenticatedUser() {
    const client = initializeSupabase();

    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      return null;
    }

    return data.user;
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  // ==========================================
  // 5. PROFILE PICTURE
  // ==========================================

  function renderPicture(dataUrl, name = "") {
    const image = $("profileImage");
    const initial = $("profileInitial");

    if (!image || !initial) return;

    if (dataUrl) {
      image.src = dataUrl;
      image.classList.remove("hidden");
      initial.classList.add("hidden");
    } else {
      image.removeAttribute("src");
      image.classList.add("hidden");

      initial.textContent = getInitial(name);
      initial.classList.remove("hidden");

      if (!name) {
        initial.innerHTML =
          '<i class="fa-solid fa-user" aria-hidden="true"></i>';
      }
    }
  }

  function loadProfilePicture(userId, name = "") {
    if (!userId) {
      renderPicture(null, name);
      return;
    }

    try {
      const saved = localStorage.getItem(getPictureKey(userId));
      renderPicture(saved, name);
    } catch (error) {
      console.warn("ZUNE: LocalStorage haipatikani.", error);
      renderPicture(null, name);
    }
  }

  function savePictureToLocalStorage(userId, dataUrl) {
    try {
      const key = getPictureKey(userId);

      if (dataUrl === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, dataUrl);
      }

      return true;
    } catch (error) {
      console.error("ZUNE: Picha haijahifadhiwa.", error);

      throw new Error(
        "Nafasi ya kuhifadhi picha inaweza kuwa imejaa. " +
        "Ondoa picha nyingine au chagua picha ndogo."
      );
    }
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Chagua picha kwanza."));
        return;
      }

      const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!supportedTypes.includes(file.type)) {
        reject(new Error(
          "Tumia picha ya JPG, PNG au WebP."
        ));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(
          "Picha ni kubwa sana. Chagua picha isiyozidi MB 8."
        ));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        try {
          const scale = Math.min(
            1,
            MAX_IMAGE_DIMENSION /
              Math.max(image.width, image.height)
          );

          const canvas = document.createElement("canvas");

          canvas.width = Math.max(
            1,
            Math.round(image.width * scale)
          );

          canvas.height = Math.max(
            1,
            Math.round(image.height * scale)
          );

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Imeshindikana kuchakata picha."
            );
          }

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const dataUrl = canvas.toDataURL(
            "image/jpeg",
            IMAGE_QUALITY
          );

          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        reject(new Error(
          "Picha haikuweza kusomwa. Jaribu picha nyingine."
        ));
      };

      image.src = objectUrl;
    });
  }

  async function handlePictureSelection(event) {
    const file = event.target.files?.[0];

    // Ruhusu mtumiaji kuchagua faili lilelile tena.
    event.target.value = "";

    if (!file) return;

    try {
      showMessage("Tunachakata picha yako...", "info");

      const dataUrl = await resizeImage(file);

      pendingPicture = dataUrl;
      renderPicture(dataUrl, currentProfile?.full_name || "");

      showMessage(
        "Picha imechaguliwa. Bonyeza Hifadhi picha ili kuihifadhi.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.message || "Imeshindikana kuchagua picha.",
        "error"
      );
    }
  }

  async function saveProfilePicture() {
    if (isSavingPicture) return;

    if (!currentUser) {
      showMessage("Ingia kwenye akaunti yako kwanza.", "error");
      return;
    }

    if (pendingPicture === undefined) {
      showMessage(
        "Chagua picha mpya au tumia Ondoa picha.",
        "info"
      );
      return;
    }

    isSavingPicture = true;

    const button = $("saveProfilePhotoBtn");
    const originalText = button?.innerHTML;

    setButtonState(button, true, "Inahifadhi picha...");

    try {
      savePictureToLocalStorage(
        currentUser.id,
        pendingPicture
      );

      pendingPicture = undefined;

      showMessage(
        "Picha ya profile imehifadhiwa kwenye kifaa hiki.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.message || "Picha haijahifadhiwa.",
        "error"
      );
    } finally {
      isSavingPicture = false;

      if (button) {
        button.disabled = false;
        button.innerHTML = originalText ||
          '<i class="fa-solid fa-check mr-1" aria-hidden="true"></i> Hifadhi picha';
      }
    }
  }

  function removeProfilePicture() {
    if (!currentUser) {
      showMessage("Ingia kwenye akaunti yako kwanza.", "error");
      return;
    }

    const existingPicture = (() => {
      try {
        return localStorage.getItem(
          getPictureKey(currentUser.id)
        );
      } catch {
        return null;
      }
    })();

    if (!existingPicture && pendingPicture === undefined) {
      showMessage("Huna picha ya profile ya kuondoa.", "info");
      return;
    }

    try {
      savePictureToLocalStorage(currentUser.id, null);

      pendingPicture = undefined;
      renderPicture(null, currentProfile?.full_name || "");

      showMessage(
        "Picha ya profile imeondolewa kwenye kifaa hiki.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  // ==========================================
  // 6. DISPLAY PROFILE DETAILS
  // ==========================================

  function displayProfile(user, profile) {
    const metadata = user.user_metadata || {};

    const name =
      profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      "Mtumiaji wa ZUNE";

    const email = user.email || "Haijawekwa";
    const phone =
      profile?.phone_number ||
      user.phone ||
      "Haijawekwa";

    const role = profile?.role || "buyer";

    if ($("userNameDisplay")) {
      $("userNameDisplay").textContent = name;
    }

    if ($("userEmailDisplay")) {
      $("userEmailDisplay").textContent = email;
    }

    if ($("accountEmailDetail")) {
      $("accountEmailDetail").textContent = email;
    }

    if ($("userPhoneDisplay")) {
      $("userPhoneDisplay").textContent = phone;
    }

    if ($("accountRoleBadge")) {
      $("accountRoleBadge").textContent = getRoleLabel(role);
    }

    if ($("accountVerificationStatus")) {
      const verified = profile?.is_verified === true;

      $("accountVerificationStatus").textContent = verified
        ? "Imethibitishwa"
        : "Bado haijathibitishwa";
    }

    if ($("editFullName")) {
      $("editFullName").value =
        profile?.full_name || metadata.full_name || metadata.name || "";
    }

    const adminLink = $("adminMenuLink");

    if (adminLink) {
      if (role === "admin") {
        adminLink.classList.remove("hidden");
        adminLink.classList.add("flex");
      } else {
        adminLink.classList.add("hidden");
        adminLink.classList.remove("flex");
      }
    }

    loadProfilePicture(user.id, name);
  }

  // ==========================================
  // 7. LOAD PROFILE FROM SUPABASE
  // ==========================================

  async function loadAccount() {
    hideMessage();

    try {
      const client = initializeSupabase();
      const user = await getAuthenticatedUser();

      if (!user) {
        redirectToLogin();
        return;
      }

      currentUser = user;

      const { data: profile, error } = await client
        .from(PROFILE_TABLE)
        .select("id, full_name, phone_number, role, is_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("ZUNE: Profile query failed.", error);

        throw new Error(
          "Imeshindikana kupakia taarifa za profile. " +
          "Kagua ruhusa za kusoma profiles kwenye Supabase."
        );
      }

      if (!profile) {
        throw new Error(
          "Profile yako haijapatikana. Hakikisha akaunti yako " +
          "ina rekodi kwenye jedwali la profiles."
        );
      }

      // Hakikisha profile inayosomwa ni ya mtumiaji aliyeingia.
      if (profile.id !== user.id) {
        throw new Error(
          "Usalama wa akaunti umeshindwa kuthibitishwa."
        );
      }

      currentProfile = profile;

      displayProfile(user, profile);

      showMessage("Taarifa za akaunti zimepakiwa.", "success");

      $("retryAccountButton")?.classList.add("hidden");
    } catch (error) {
      console.error("ZUNE account error:", error);

      showMessage(
        error.message || "Imeshindikana kupakia akaunti.",
        "error"
      );

      $("retryAccountButton")?.classList.remove("hidden");
    }
  }

  // ==========================================
  // 8. SAVE NEW FULL NAME
  // ==========================================

  async function handleNameSubmit(event) {
    event.preventDefault();

    if (isSavingName) return;

    if (!currentUser) {
      showMessage("Ingia kwenye akaunti yako kwanza.", "error");
      return;
    }

    const input = $("editFullName");
    const newName = input?.value?.trim() || "";

    if (newName.length < 2 || newName.length > 80) {
      showMessage(
        "Jina lazima liwe na herufi 2 hadi 80.",
        "error"
      );
      return;
    }

    isSavingName = true;

    const button = $("saveNameBtn");
    const originalText = button?.innerHTML;

    setButtonState(button, true, "Inahifadhi jina...");

    try {
      const client = initializeSupabase();

      // Thibitisha kuwa session bado ni ya mtumiaji huyu.
      const user = await getAuthenticatedUser();

      if (!user || user.id !== currentUser.id) {
        throw new Error(
          "Session imebadilika. Ingia tena kwenye akaunti yako."
        );
      }

      // Update ya rekodi ya mtumiaji aliyeingia pekee.
      const { data: updatedProfile, error } = await client
        .from(PROFILE_TABLE)
        .update({ full_name: newName })
        .eq("id", user.id)
        .select("id, full_name, phone_number, role, is_verified")
        .maybeSingle();

      if (error) {
        console.error("ZUNE name update failed:", error);

        throw new Error(
          "Jina halijahifadhiwa. Kagua RLS na ruhusa ya UPDATE " +
          "kwenye profiles."
        );
      }

      if (!updatedProfile || updatedProfile.id !== user.id) {
        throw new Error(
          "Jina halikubadilishwa. Hakuna profile iliyosasishwa."
        );
      }

      currentProfile = updatedProfile;

      // Jaribu kusasisha metadata ya Auth pia.
      // Profiles ndiyo chanzo kikuu cha jina kwenye ukurasa huu.
      const { error: metadataError } =
        await client.auth.updateUser({
          data: {
            ...(user.user_metadata || {}),
            full_name: newName
          }
        });

      if (metadataError) {
        console.warn(
          "ZUNE: Jina limehifadhiwa kwenye profiles, " +
          "lakini metadata haikusasishwa.",
          metadataError.message
        );
      }

      // Onyesha jina lililohifadhiwa.
      displayProfile(
        {
          ...user,
          user_metadata: {
            ...(user.user_metadata || {}),
            full_name: newName
          }
        },
        updatedProfile
      );

      showMessage("Jina lako limebadilishwa kikamilifu.", "success");
    } catch (error) {
      console.error("ZUNE save name error:", error);

      showMessage(
        error.message || "Imeshindikana kuhifadhi jina.",
        "error"
      );
    } finally {
      isSavingName = false;

      if (button) {
        button.disabled = false;
        button.innerHTML = originalText ||
          '<i class="fa-solid fa-floppy-disk mr-2" aria-hidden="true"></i> Hifadhi jina';
      }
    }
  }

  // ==========================================
  // 9. LOG OUT
  // ==========================================

  async function logoutUser() {
    const button = $("logoutButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Inatoka...";
    }

    try {
      const client = initializeSupabase();

      const { error } = await client.auth.signOut({
        scope: "local"
      });

      if (error) throw error;

      currentUser = null;
      currentProfile = null;

      redirectToLogin();
    } catch (error) {
      console.error("ZUNE logout error:", error);

      showMessage(
        "Imeshindikana kutoka: " +
        (error.message || "Jaribu tena."),
        "error"
      );

      if (button) {
        button.disabled = false;
        button.innerHTML =
          '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Ondoka kwenye akaunti';
      }
    }
  }

  // ==========================================
  // 10. EVENT LISTENERS
  // ==========================================

  function attachEvents() {
    $("profileImageInput")?.addEventListener(
      "change",
      handlePictureSelection
    );

    $("saveProfilePhotoBtn")?.addEventListener(
      "click",
      saveProfilePicture
    );

    $("removeProfilePhotoBtn")?.addEventListener(
      "click",
      removeProfilePicture
    );

    $("editNameForm")?.addEventListener(
      "submit",
      handleNameSubmit
    );

    $("retryAccountButton")?.addEventListener(
      "click",
      loadAccount
    );

    $("logoutButton")?.addEventListener(
      "click",
      logoutUser
    );
  }

  // ==========================================
  // 11. AUTH STATE CHANGES
  // ==========================================

  function attachAuthListener() {
    const client = initializeSupabase();

    if (authListener) return;

    const { data } = client.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          currentUser = null;
          currentProfile = null;

          redirectToLogin();
        }
      }
    );

    authListener = data?.subscription || null;
  }

  // ==========================================
  // 12. START ACCOUNT PAGE
  // ==========================================

  async function init() {
    attachEvents();

    try {
      initializeSupabase();
      attachAuthListener();
      await loadAccount();
    } catch (error) {
      console.error("ZUNE initialization error:", error);

      showMessage(
        error.message || "Imeshindikana kuanzisha akaunti.",
        "error"
      );
    }
  }

  // Ruhusu HTML kutumia functions hizi.
  window.loadAccount = loadAccount;
  window.logoutUser = logoutUser;

  // Anzisha baada ya HTML kupakiwa.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();
