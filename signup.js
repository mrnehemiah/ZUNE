import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

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
function validateSignup() {
  const name = getName();
  const method = getSignupMethod();
  const password = getPassword();
  const confirmPassword = getConfirmPassword();

  if (!name || name.length < 2) {
    showMessage("Tafadhali andika jina lako kamili.");
    fullName?.focus();
    return false;
  }

  if (method === "email") {
    const email = getEmail();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailPattern.test(email)) {
      showMessage("Tafadhali ingiza barua pepe sahihi.");
      emailInput?.focus();
      return false;
    }
  } else {
    const phone = getPhone();

    if (!phone || !/^\+?[0-9\s()-]{8,20}$/.test(phone)) {
      showMessage(
        "Tafadhali ingiza namba sahihi ya simu yenye country code."
      );
      phoneInput?.focus();
      return false;
    }
  }

  if (password.length < 8) {
    showMessage(
      "Nenosiri lazima liwe na angalau herufi au tarakimu 8."
    );
    passwordInput?.focus();
    return false;
  }

  if (password !== confirmPassword) {
    showMessage("Nenosiri na uthibitisho wake havifanani.");
    confirmInput?.focus();
    return false;
  }

  if (!consent?.checked) {
    showMessage(
      "Tafadhali kubali Masharti ya Matumizi na Sera ya Faragha."
    );
    consent?.focus();
    return false;
  }

  return true;
}

function readableAuthError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (
    raw.includes("user already registered") ||
    raw.includes("already been registered") ||
    raw.includes("already exists")
  ) {
    return "Akaunti hii tayari ipo. Tafadhali ingia au tumia akaunti nyingine.";
  }

  if (raw.includes("invalid email")) {
    return "Barua pepe si sahihi.";
  }

  if (raw.includes("password") &&
      (raw.includes("weak") || raw.includes("short"))) {
    return "Nenosiri ni dhaifu. Tumia nenosiri lenye angalau herufi au tarakimu 8.";
  }

  if (
    raw.includes("provider is not enabled") ||
    raw.includes("unsupported provider")
  ) {
    return "Huduma hii haijawezeshwa kwenye Supabase.";
  }

  if (
    raw.includes("rate limit") ||
    raw.includes("too many requests")
  ) {
    return "Umejaribu mara nyingi. Subiri kidogo ujaribu tena.";
  }

  if (raw.includes("network") || raw.includes("fetch")) {
    return "Tatizo la mtandao. Kagua internet yako ujaribu tena.";
  }

  return error?.message ||
    "Usajili umeshindikana. Tafadhali jaribu tena.";
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
      emailRedirectTo:"https://mrnehemiah.github.io/ZUNE/account.html"
    }
  });

  if (error) throw error;

  if (data.session) {
    showMessage(
      "Akaunti imetengenezwa. Tunafungua akaunti yako...",
      "success"
    );

    window.location.assign(ACCOUNT_URL);
    return;
  }

  showMessage(
    "Usajili umepokelewa. Angalia barua pepe yako kuthibitisha akaunti, kisha ingia ZUNE.",
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
    showMessage(
      "Akaunti imetengenezwa. Tunafungua akaunti yako...",
      "success"
    );

    window.location.assign(ACCOUNT_URL);
    return;
  }

  const otp = window.prompt(
    "Ingiza OTP uliyopokea kwa SMS ili kuthibitisha namba yako:"
  );

  if (!otp?.trim()) {
    showMessage(
      "Akaunti inahitaji uthibitisho wa namba ya simu kabla ya kuingia."
    );
    return;
  }

  const { error: verifyError } =
    await supabase.auth.verifyOtp({
      phone,
      token: otp.trim(),
      type: "sms"
    });

  if (verifyError) throw verifyError;

  showMessage(
    "Namba imethibitishwa. Tunafungua akaunti yako...",
    "success"
  );

  window.location.assign(ACCOUNT_URL);
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

const ACCOUNT_URL = new URL(
  "./account.html",
  window.location.href
).href;

const LOGIN_URL = new URL(
  "./login.html",
  window.location.href
).href;

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

function setBusy(button, busy) {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent.trim();
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Tafadhali subiri...";
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
  const value = (
    methodInput?.value || "email"
  ).trim().toLowerCase();

  return value === "phone" ? "phone" : "email";
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

async function startOAuth(provider, button) {
  clearMessage();

  if (!consent?.checked) {
    showMessage(
      "Tafadhali kubali Masharti ya Matumizi na Sera ya Faragha kwanza."
    );

    consent?.focus();
    return;
  }

  setBusy(button, true);

  try {
    const options = {
      redirectTo: ACCOUNT_URL
    };

    if (provider === "google") {
      options.queryParams = {
        prompt: "select_account"
      };
    }

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider,
        options
      });

    if (error) throw error;
  } catch (error) {
    console.error(
      `ZUNE ${provider} OAuth error:`,
      error
    );

    showMessage(readableAuthError(error));
    setBusy(button, false);
  }
}

if (googleButton) {
  googleButton.addEventListener("click", (event) => {
    event.preventDefault();
    startOAuth("google", googleButton);
  });
}

if (facebookButton) {
  facebookButton.addEventListener("click", (event) => {
    event.preventDefault();
    startOAuth("facebook", facebookButton);
  });
}

const emailMethodButton = $("emailMethodBtn");
const phoneMethodButton = $("phoneMethodBtn");

if (emailMethodButton) {
  emailMethodButton.addEventListener("click", () => {
    if (methodInput) {
      methodInput.value = "email";
    }

    clearMessage();
  });
}

if (phoneMethodButton) {
  phoneMethodButton.addEventListener("click", () => {
    if (methodInput) {
      methodInput.value = "phone";
    }

    clearMessage();
  });
}

function checkPasswordMatch() {
  if (!confirmInput || !passwordInput) return;

  if (!confirmInput.value) {
    confirmInput.setCustomValidity("");
    return;
  }

  confirmInput.setCustomValidity(
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
const yearElement = $("year");

if (yearElement) {
  yearElement.textContent =
    new Date().getFullYear();
}

if (!form) {
  console.error(
    "ZUNE: signupForm haijapatikana kwenye signup.html."
  );
}

if (!submitButton) {
  console.warn(
    "ZUNE: signupSubmitBtn haijapatikana."
  );
}

if (!consent) {
  console.warn(
    "ZUNE: acceptPolicies haijapatikana."
  );
}

[
  fullName,
  emailInput,
  phoneInput,
  passwordInput,
  confirmInput
].forEach((element) => {
  element?.addEventListener("input", () => {
    if (message?.textContent) {
      clearMessage();
    }
  });
});

async function checkExistingSession() {
  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) {
      console.warn(
        "ZUNE session check:",
        error.message
      );
      return;
    }

    if (data.session?.user) {
      console.info(
        "ZUNE: Supabase session already exists."
      );
    }
  } catch (error) {
    console.error(
      "ZUNE session initialization error:",
      error
    );
  }
}
checkExistingSession();

console.info("ZUNE signup.js imeanzishwa.");