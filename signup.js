
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

function showMessage(text, type = "error") {
  if (!message) {
    alert(text);
    return;
  }

  message.textContent = text;
  message.className = `form-message show ${type}`;
  message.setAttribute("role", "status");
}

function clearMessage() {
  if (!message) return;

  message.textContent = "";
  message.className = "form-message";
}

function setBusy(button, busy, text = "Tafadhali subiri...") {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent.trim();
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = text;
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
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

function validateSignup() {
  if (getName().length < 2) {
    showMessage("Tafadhali andika jina lako kamili.");
    fullName?.focus();
    return false;
  }

  if (getSignupMethod() === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getEmail())) {
      showMessage("Tafadhali ingiza barua pepe sahihi.");
      emailInput?.focus();
      return false;
    }
  } else if (!/^\+?[0-9\s()-]{8,20}$/.test(getPhone())) {
    showMessage("Tafadhali ingiza namba ya simu sahihi.");
    phoneInput?.focus();
    return false;
  }

  if (getPassword().length < 8) {
    showMessage("Nenosiri liwe na angalau herufi au tarakimu 8.");
    passwordInput?.focus();
    return false;
  }

  if (getPassword() !== getConfirmPassword()) {
    showMessage("Nenosiri na uthibitisho wake havifanani.");
    confirmInput?.focus();
    return false;
  }

  if (!consent?.checked) {
    showMessage("Tafadhali kubali Masharti ya Matumizi na Sera ya Faragha.");
    consent?.focus();
    return false;
  }

  return true;
}

function readableAuthError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("provider is not enabled")) {
    return "Huduma hii haijawezeshwa kwenye Supabase.";
  }

  if (raw.includes("redirect") || raw.includes("url")) {
    return "Tatizo la Redirect URL. Kagua URL Configuration ya Supabase.";
  }

  if (raw.includes("already registered") || raw.includes("already exists")) {
    return "Akaunti hii tayari ipo. Tafadhali ingia.";
  }

  if (raw.includes("rate limit") || raw.includes("too many requests")) {
    return "Umejaribu mara nyingi. Subiri kidogo ujaribu tena.";
  }

  if (raw.includes("network") || raw.includes("fetch")) {
    return "Tatizo la mtandao. Kagua internet yako.";
  }

  return error?.message || "Ombi limeshindwa. Tafadhali jaribu tena.";
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
    window.location.assign(ACCOUNT_URL);
    return;
  }

  showMessage(
    "Usajili umepokelewa. Angalia barua pepe yako kwa uthibitisho.",
    "success"
  );
}

async function signupWithPhone() {
  const phone = getPhone();

  const { data, error } = await supabase.auth.signUp({
    phone,
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
    window.location.assign(ACCOUNT_URL);
    return;
  }

  const otp = window.prompt(
    "Ingiza OTP uliyopokea kwa SMS:"
  );

  if (!otp?.trim()) {
    showMessage("Uthibitisho wa namba ya simu bado haujakamilika.");
    return;
  }

  const { error: verifyError } =
    await supabase.auth.verifyOtp({
      phone,
      token: otp.trim(),
      type: "sms"
    });

  if (verifyError) throw verifyError;

  window.location.assign(ACCOUNT_URL);
}

async function startOAuth(provider, button) {
  clearMessage();

  if (!consent?.checked) {
    showMessage(
      "Tafadhali kubali Masharti ya Matumizi na Sera ya Faragha kwanza."
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
          skipBrowserRedirect: true,
          queryParams: provider === "google"
            ? { prompt: "select_account" }
            : undefined
        }
      });

    if (error) throw error;

    if (!data?.url) {
      throw new Error(
        "Supabase haikurudisha anwani ya kuingia. Kagua OAuth provider."
      );
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error(`ZUNE ${provider} OAuth error:`, error);
    showMessage(readableAuthError(error));
    setBusy(button, false);
  }
}

if (googleButton) {
  googleButton.addEventListener("click", (event) => {
    event.preventDefault();
    startOAuth("google", googleButton);
  });
} else {
  console.error("ZUNE: Kitufe googleSignupBtn hakipo kwenye signup.html.");
}

if (facebookButton) {
  facebookButton.addEventListener("click", (event) => {
    event.preventDefault();
    startOAuth("facebook", facebookButton);
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!validateSignup()) return;

    setBusy(submitButton, true);

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
}

$("emailMethodBtn")?.addEventListener("click", () => {
  if (methodInput) methodInput.value = "email";
  clearMessage();
});

$("phoneMethodBtn")?.addEventListener("click", () => {
  if (methodInput) methodInput.value = "phone";
  clearMessage();
});

function checkPasswordMatch() {
  if (!confirmInput || !passwordInput) return;

  confirmInput.setCustomValidity(
    !confirmInput.value ||
    confirmInput.value === passwordInput.value
      ? ""
      : "Nenosiri hazifanani."
  );
}

passwordInput?.addEventListener("input", checkPasswordMatch);
confirmInput?.addEventListener("input", checkPasswordMatch);

const yearElement = $("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

async function checkExistingSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn("ZUNE session check:", error.message);
    return;
  }

  if (data.session?.user) {
    console.info("ZUNE: Session ya mtumiaji ipo.");
  }
}

checkExistingSession();

console.info("ZUNE signup.js imeanzishwa.");
