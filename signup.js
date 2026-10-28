
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

const ACCOUNT_URL =
  "https://mrnehemiah.github.io/ZUNE/account.html";

const LOGIN_URL =
  "https://mrnehemiah.github.io/ZUNE/login.html";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  }
);

const $ = (id) => document.getElementById(id);

// Fomu na sehemu zake
const form = $("signupForm");
const message = $("signupMessage");

const fullName = $("fullName");
const emailInput = $("signupEmail");
const phoneInput = $("signupPhone");
const passwordInput = $("signupPassword");
const confirmInput = $("confirmPassword");

const consent = $("acceptPolicies");
const methodInput = $("signupMethod");

const submitButton = $("signupSubmitBtn");
const googleButton = $("googleSignupBtn");
const facebookButton = $("facebookSignupBtn");

const emailMethodButton = $("emailMethodBtn");
const phoneMethodButton = $("phoneMethodBtn");

const emailGroup = $("emailGroup");
const phoneGroup = $("phoneGroup");

const yearElement = $("currentYear") || $("year");

function showMessage(text, type = "error") {
  if (!message) {
    alert(text);
    return;
  }

  message.textContent = text;

  message.className =
    `signup-message show ${type}`;

  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
}

function clearMessage() {
  if (!message) return;

  message.textContent = "";
  message.className = "signup-message";
}

function setBusy(button, busy, text) {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent.trim();
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    if (text) button.textContent = text;
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");

    if (button.dataset.originalText) {
      button.textContent =
        button.dataset.originalText;

      delete button.dataset.originalText;
    }
  }
}

function getSignupMethod() {
  return (
    methodInput?.value || "email"
  ).trim().toLowerCase() === "phone"
    ? "phone"
    : "email";
}

function getName() {
  return fullName?.value.trim() || "";
}

function getEmail() {
  return emailInput?.value.trim().toLowerCase() || "";
}

function getPhone() {
  return phoneInput?.value.trim() || "";
}

function getPassword() {
  return passwordInput?.value || "";
}

function getConfirmPassword() {
  return confirmInput?.value || "";
}

function updateSignupMethod(method) {
  if (methodInput) {
    methodInput.value = method;
  }

  const useEmail = method === "email";

  if (emailGroup) {
    emailGroup.hidden = !useEmail;
  }

  if (phoneGroup) {
    phoneGroup.hidden = useEmail;
  }

  if (emailInput) {
    emailInput.required = useEmail;
  }

  if (phoneInput) {
    phoneInput.required = !useEmail;
  }

  emailMethodButton?.classList.toggle(
    "active",
    useEmail
  );

  phoneMethodButton?.classList.toggle(
    "active",
    !useEmail
  );

  clearMessage();
}

emailMethodButton?.addEventListener("click", () => {
  updateSignupMethod("email");
});

phoneMethodButton?.addEventListener("click", () => {
  updateSignupMethod("phone");
});

function validateSignup() {
  if (!form) {
    showMessage(
      "Fomu ya usajili haijapatikana. Kagua signup.html."
    );
    return false;
  }

  if (getName().length < 2) {
    showMessage("Tafadhali ingiza jina lako kamili.");
    fullName?.focus();
    return false;
  }

  if (getSignupMethod() === "email") {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getEmail())
    ) {
      showMessage("Ingiza barua pepe sahihi.");
      emailInput?.focus();
      return false;
    }
  } else {
    if (!/^\+?[0-9\s()-]{8,20}$/.test(getPhone())) {
      showMessage("Ingiza namba ya simu sahihi.");
      phoneInput?.focus();
      return false;
    }
  }

  if (getPassword().length < 8) {
    showMessage(
      "Nenosiri lazima liwe na angalau herufi au tarakimu 8."
    );
    passwordInput?.focus();
    return false;
  }

  if (getPassword() !== getConfirmPassword()) {
    showMessage("Nenosiri mbili hazifanani.");
    confirmInput?.focus();
    return false;
  }

  if (!consent?.checked) {
    showMessage(
      "Kubali Masharti ya Matumizi na Sera ya Faragha kwanza."
    );
    consent?.focus();
    return false;
  }

  return true;
}

function readableAuthError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (
    raw.includes("already registered") ||
    raw.includes("already exists") ||
    raw.includes("user already registered")
  ) {
    return "Akaunti hii inaweza kuwa tayari imesajiliwa. Jaribu kuingia.";
  }

  if (
    raw.includes("provider is not enabled") ||
    raw.includes("unsupported provider")
  ) {
    return "Njia hii haijawezeshwa kwenye mipangilio ya Supabase.";
  }

  if (
    raw.includes("redirect") ||
    raw.includes("redirect_uri") ||
    raw.includes("url")
  ) {
    return "Tatizo la URL. Kagua URL Configuration ya Supabase.";
  }

  if (
    raw.includes("rate limit") ||
    raw.includes("too many requests")
  ) {
    return "Umejaribu mara nyingi. Subiri kidogo ujaribu tena.";
  }

  if (
    raw.includes("network") ||
    raw.includes("fetch") ||
    raw.includes("failed to fetch")
  ) {
    return "Imeshindwa kuwasiliana na seva. Kagua intaneti yako.";
  }

  if (
    raw.includes("password") &&
    (raw.includes("weak") || raw.includes("short"))
  ) {
    return "Nenosiri halijakidhi masharti ya Supabase.";
  }

  if (
    raw.includes("phone") &&
    (raw.includes("disabled") || raw.includes("not enabled"))
  ) {
    return "Usajili kwa simu haujawezeshwa kwenye Supabase.";
  }

  return error?.message ||
    "Usajili umeshindwa. Tafadhali jaribu tena.";
}

async function signupWithEmail() {
  const { data, error } = await supabase.auth.signUp({
    email: getEmail(),
    password: getPassword(),
    options: {
      data: {
        full_name: getName(),
        signup_method: "email"
      },
      emailRedirectTo: ACCOUNT_URL
    }
  });

  if (error) throw error;

  if (data.session) {
    showMessage(
      "Usajili umefanikiwa. Tunakufungulia akaunti yako...",
      "success"
    );

    window.location.assign(ACCOUNT_URL);
    return;
  }

  showMessage(
    "Ombi la usajili limepokelewa. Angalia barua pepe yako kwa maelekezo ya uthibitisho, kisha ingia.",
    "success"
  );
}

async function signupWithPhone() {
  const { data, error } = await supabase.auth.signUp({
    phone: getPhone(),
    password: getPassword(),
    options: {
      data: {
        full_name: getName(),
        signup_method: "phone"
      }
    }
  });

  if (error) throw error;

  if (data.session) {
    showMessage(
      "Usajili umefanikiwa. Tunakufungulia akaunti yako...",
      "success"
    );

    window.location.assign(ACCOUNT_URL);
    return;
  }

  // Supabase inaweza kuhitaji uthibitisho wa SMS.
  const otp = window.prompt(
    "Ingiza msimbo wa uthibitisho uliotumwa kwa SMS:"
  );

  if (!otp?.trim()) {
    showMessage(
      "Usajili umepokelewa, lakini uthibitisho wa simu bado haujakamilika."
    );
    return;
  }

  const { data: verifiedData, error: verifyError } =
    await supabase.auth.verifyOtp({
      phone: getPhone(),
      token: otp.trim(),
      type: "sms"
    });

  if (verifyError) throw verifyError;

  if (!verifiedData.session) {
    showMessage(
      "Namba imethibitishwa, lakini hakuna session iliyorudishwa. Jaribu kuingia.",
      "success"
    );

    return;
  }

  window.location.assign(ACCOUNT_URL);
}

async function startOAuth(provider, button) {
  clearMessage();

  if (!consent?.checked) {
    showMessage(
      "Kubali Masharti ya Matumizi na Sera ya Faragha kwanza."
    );
    consent?.focus();
    return;
  }

  setBusy(button, true, "Inaunganisha...");

  try {
    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: ACCOUNT_URL,
          queryParams: provider === "google"
            ? { prompt: "select_account" }
            : undefined
        }
      });

    if (error) throw error;

    if (!data?.url) {
      throw new Error(
        "Anwani ya kuingia haikupatikana kutoka Supabase."
      );
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error("ZUNE OAuth error:", error);
    showMessage(readableAuthError(error));
    setBusy(button, false);
  }
}

googleButton?.addEventListener("click", (event) => {
  event.preventDefault();
  startOAuth("google", googleButton);
});

facebookButton?.addEventListener("click", (event) => {
  event.preventDefault();
  startOAuth("facebook", facebookButton);
});

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!validateSignup()) return;

    setBusy(
      submitButton,
      true,
      "Inatuma maombi..."
    );

    try {
      if (getSignupMethod() === "phone") {
        await signupWithPhone();
      } else {
        await signupWithEmail();
      }
    } catch (error) {
      console.error("ZUNE signup error:", error);
      showMessage(readableAuthError(error));
    } finally {
      setBusy(submitButton, false);
    }
  });
} else {
  console.error(
    "ZUNE: signupForm haijapatikana. Kagua ID kwenye signup.html."
  );
  showMessage(
    "Fomu ya usajili haijapatikana. Tafadhali kagua ukurasa wa usajili."
  );
}

function checkPasswordMatch() {
  if (!confirmInput || !passwordInput) return;

  confirmInput.setCustomValidity(
    !confirmInput.value ||
    confirmInput.value === passwordInput.value
      ? ""
      : "Nenosiri hazifanani."
  );
}

passwordInput?.addEventListener(
  "input",
  checkPasswordMatch
);

confirmInput?.addEventListener(
  "input",
  checkPasswordMatch
);

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

async function checkExistingSession() {
  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      console.info(
        "ZUNE: Mtumiaji tayari ana session."
      );
    }
  } catch (error) {
    console.warn(
      "ZUNE session check:",
      error.message
    );
  }
}

updateSignupMethod(getSignupMethod());
checkExistingSession();

console.info("ZUNE signup.js imeanzishwa.");
