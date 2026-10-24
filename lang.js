// ============================================
// ZUNE LANGUAGE SYSTEM
// Kiswahili | English | Français
// File: lang.js
// ============================================

(function () {
  "use strict";

  const STORAGE_KEY = "zune_lang";
  const DEFAULT_LANGUAGE = "sw";

  // ============================================
  // 1. TRANSLATIONS
  // ============================================

  const translations = {
    sw: {
      siteName: "ZUNE",
      home: "Nyumbani",
      products: "Bidhaa",
      categories: "Makundi",
      searchPlaceholder: "Tafuta bidhaa...",
      searchBtn: "Tafuta",
      login: "Ingia",
      signup: "Jisajili",
      logout: "Toka",
      myAccount: "Akaunti Yangu",
      cart: "Kikapu",
      wishlist: "Vipendwa",
      notifications: "Arifa",
      messages: "Ujumbe",
      seller: "Kuwa Muuzaji",
      sellerDashboard: "Dashibodi ya Muuzaji",
      admin: "Msimamizi",
      welcome: "Karibu ZUNE",
      heroTitle: "Nunua na Uze kwa Urahisi",
      heroSubtitle:
        "Jukwaa linalokutanisha wauzaji na wateja mahali pamoja.",
      newProducts: "Bidhaa Mpya",
      dailyDeals: "Ofa za Leo",
      viewAll: "Ona Zote",
      buyNow: "Nunua Sasa",
      addToCart: "Weka Kikapuni",
      price: "Bei",
      quantity: "Idadi",
      description: "Maelezo",
      category: "Kundi",
      location: "Mahali",
      noProducts: "Hakuna bidhaa zilizowekwa bado kwenye ZUNE.",
      loading: "Inapakia...",
      error: "Hitilafu imetokea. Jaribu tena.",
      success: "Imefanikiwa.",
      save: "Hifadhi",
      cancel: "Ghairi",
      submit: "Tuma",
      email: "Barua pepe",
      phone: "Namba ya simu",
      password: "Nenosiri",
      confirmPassword: "Thibitisha nenosiri",
      fullName: "Jina kamili",
      language: "Lugha",
      selectLanguage: "Chagua lugha",
      swahili: "Kiswahili",
      english: "Kiingereza",
      french: "Kifaransa",
      orders: "Oda Zangu",
      payments: "Malipo",
      wallet: "Pochi",
      settings: "Mipangilio",
      back: "Rudi",
      continue: "Endelea",
      welcomeBack: "Karibu tena",
      createAccount: "Fungua akaunti",
      forgotPassword: "Umesahau nenosiri?",
      noAccount: "Huna akaunti?",
      haveAccount: "Tayari una akaunti?",
      applyNow: "Omba Sasa",
      storeName: "Jina la duka",
      ownerName: "Jina la mmiliki",
      country: "Nchi",
      region: "Mkoa",
      district: "Wilaya",
      street: "Mtaa/Kijiji",
      chooseCountry: "Chagua nchi",
      chooseRegion: "Chagua mkoa",
      chooseDistrict: "Chagua wilaya",
      pending: "Inasubiri",
      approved: "Imeidhinishwa",
      rejected: "Imekataliwa"
    },

    en: {
      siteName: "ZUNE",
      home: "Home",
      products: "Products",
      categories: "Categories",
      searchPlaceholder: "Search products...",
      searchBtn: "Search",
      login: "Log In",
      signup: "Sign Up",
      logout: "Log Out",
      myAccount: "My Account",
      cart: "Cart",
      wishlist: "Wishlist",
      notifications: "Notifications",
      messages: "Messages",
      seller: "Become a Seller",
      sellerDashboard: "Seller Dashboard",
      admin: "Admin",
      welcome: "Welcome to ZUNE",
      heroTitle: "Buy and Sell with Ease",
      heroSubtitle:
        "A marketplace connecting sellers and customers in one place.",
      newProducts: "New Products",
      dailyDeals: "Today's Deals",
      viewAll: "View All",
      buyNow: "Buy Now",
      addToCart: "Add to Cart",
      price: "Price",
      quantity: "Quantity",
      description: "Description",
      category: "Category",
      location: "Location",
      noProducts: "No products have been listed on ZUNE yet.",
      loading: "Loading...",
      error: "An error occurred. Please try again.",
      success: "Successful.",
      save: "Save",
      cancel: "Cancel",
      submit: "Submit",
      email: "Email",
      phone: "Phone Number",
      password: "Password",
      confirmPassword: "Confirm Password",
      fullName: "Full Name",
      language: "Language",
      selectLanguage: "Select Language",
      swahili: "Swahili",
      english: "English",
      french: "French",
      orders: "My Orders",
      payments: "Payments",
      wallet: "Wallet",
      settings: "Settings",
      back: "Back",
      continue: "Continue",
      welcomeBack: "Welcome Back",
      createAccount: "Create Account",
      forgotPassword: "Forgot Password?",
      noAccount: "Don't have an account?",
      haveAccount: "Already have an account?",
      applyNow: "Apply Now",
      storeName: "Store Name",
      ownerName: "Owner's Name",
      country: "Country",
      region: "Region",
      district: "District",
      street: "Street/Village",
      chooseCountry: "Choose Country",
      chooseRegion: "Choose Region",
      chooseDistrict: "Choose District",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected"
    },

    fr: {
      siteName: "ZUNE",
      home: "Accueil",
      products: "Produits",
      categories: "Catégories",
      searchPlaceholder: "Rechercher des produits...",
      searchBtn: "Rechercher",
      login: "Se connecter",
      signup: "S'inscrire",
      logout: "Se déconnecter",
      myAccount: "Mon compte",
      cart: "Panier",
      wishlist: "Favoris",
      notifications: "Notifications",
      messages: "Messages",
      seller: "Devenir vendeur",
      sellerDashboard: "Tableau de bord vendeur",
      admin: "Administrateur",
      welcome: "Bienvenue sur ZUNE",
      heroTitle: "Achetez et vendez facilement",
      heroSubtitle:
        "Une plateforme qui réunit vendeurs et clients au même endroit.",
      newProducts: "Nouveaux produits",
      dailyDeals: "Offres du jour",
      viewAll: "Tout voir",
      buyNow: "Acheter maintenant",
      addToCart: "Ajouter au panier",
      price: "Prix",
      quantity: "Quantité",
      description: "Description",
      category: "Catégorie",
      location: "Lieu",
      noProducts: "Aucun produit n'a encore été publié sur ZUNE.",
      loading: "Chargement...",
      error: "Une erreur s'est produite. Veuillez réessayer.",
      success: "Opération réussie.",
      save: "Enregistrer",
      cancel: "Annuler",
      submit: "Envoyer",
      email: "E-mail",
      phone: "Numéro de téléphone",
      password: "Mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      fullName: "Nom complet",
      language: "Langue",
      selectLanguage: "Choisir la langue",
      swahili: "Swahili",
      english: "Anglais",
      french: "Français",
      orders: "Mes commandes",
      payments: "Paiements",
      wallet: "Portefeuille",
      settings: "Paramètres",
      back: "Retour",
      continue: "Continuer",
      welcomeBack: "Bon retour",
      createAccount: "Créer un compte",
      forgotPassword: "Mot de passe oublié ?",
      noAccount: "Vous n'avez pas de compte ?",
      haveAccount: "Vous avez déjà un compte ?",
      applyNow: "Postuler maintenant",
      storeName: "Nom du magasin",
      ownerName: "Nom du propriétaire",
      country: "Pays",
      region: "Région",
      district: "District",
      street: "Rue/Village",
      chooseCountry: "Choisir un pays",
      chooseRegion: "Choisir une région",
      chooseDistrict: "Choisir un district",
      pending: "En attente",
      approved: "Approuvé",
      rejected: "Refusé"
    }
  };

  // ============================================
  // 2. GET SAVED LANGUAGE
  // ============================================

  function getCurrentLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved && translations[saved]) {
        return saved;
      }
    } catch (error) {
      console.warn("ZUNE: Language storage unavailable.");
    }

    return DEFAULT_LANGUAGE;
  }

  // ============================================
  // 3. TRANSLATE PAGE
  // ============================================

  function translatePage(language) {
    const lang = translations[language]
      ? language
      : DEFAULT_LANGUAGE;

    const dictionary = translations[lang];

    document.documentElement.lang = lang;

    // Translate normal text without destroying child HTML.
    document.querySelectorAll("[data-lang]").forEach((element) => {
      const key = element.getAttribute("data-lang");

      if (!Object.prototype.hasOwnProperty.call(dictionary, key)) {
        return;
      }

      const translatedText = dictionary[key];

      // Use a dedicated span if the element contains icons or nested HTML.
      const target = element.querySelector("[data-lang-text]");

      if (target) {
        target.textContent = translatedText;
      } else if (
        element.children.length === 0 &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
      ) {
        element.textContent = translatedText;
      }
    });

    // Translate placeholders.
    document.querySelectorAll("[data-lang-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-lang-placeholder");

      if (dictionary[key] !== undefined) {
        element.setAttribute("placeholder", dictionary[key]);
      }
    });

    // Translate accessible labels.
    document.querySelectorAll("[data-lang-aria-label]").forEach((element) => {
      const key = element.getAttribute("data-lang-aria-label");

      if (dictionary[key] !== undefined) {
        element.setAttribute("aria-label", dictionary[key]);
      }
    });

    // Translate title tooltips.
    document.querySelectorAll("[data-lang-title]").forEach((element) => {
      const key = element.getAttribute("data-lang-title");

      if (dictionary[key] !== undefined) {
        element.setAttribute("title", dictionary[key]);
      }
    });

    // Update the language selector.
    const selector = document.getElementById("languageSelector");

    if (selector && selector.value !== lang) {
      selector.value = lang;
    }

    // Notify other ZUNE scripts.
    document.dispatchEvent(
      new CustomEvent("zune:languageChanged", {
        detail: { language: lang }
      })
    );
  }

  // ============================================
  // 4. CHANGE AND SAVE LANGUAGE
  // ============================================

  function setLanguage(language) {
    const lang = translations[language]
      ? language
      : DEFAULT_LANGUAGE;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.warn("ZUNE: Could not save language preference.");
    }

    translatePage(lang);

    return lang;
  }

  // ============================================
  // 5. INITIALIZE LANGUAGE SELECTOR
  // ============================================

  function initializeLanguageSystem() {
    const selector = document.getElementById("languageSelector");

    if (selector && !selector.dataset.zuneLanguageReady) {
      selector.dataset.zuneLanguageReady = "true";

      selector.addEventListener("change", function () {
        setLanguage(this.value);
      });
    }

    translatePage(getCurrentLanguage());
  }

  // ============================================
  // 6. PUBLIC API
  // ============================================

  window.ZUNELanguage = {
    translations: translations,
    getCurrentLanguage: getCurrentLanguage,
    setLanguage: setLanguage,
    translatePage: translatePage
  };

  // Support pages that load this file before or after HTML.
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeLanguageSystem,
      { once: true }
    );
  } else {
    initializeLanguageSystem();
  }

})();