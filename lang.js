// Kamusi ya Lugha za Afrika Mashariki (EAC Languages Dictionary)
const translations = {
  sw: {
    welcome: "Karibu kwenye duka lako la mtandaoni la ZUNE",
    freeDelivery: "Usafirishaji bure kwa oda zilizo zaidi ya TZS 50,000",
    searchPlaceholder: "Tafuta bidhaa unayotaka...",
    searchBtn: "Tafuta",
    myAccount: "Akaunti Yangu",
    cart: "Kikapu",
    home: "Mwanzo",
    categories: "Kategoria",
    sellProduct: "Uza Bidhaa",
    wallet: "Wallet",
    notifications: "Taarifa",
    todayDeals: "OFA ZA SIKU HII",
    addToCart: "Ongeza Kikapu"
  },
  en: {
    welcome: "Welcome to your ZUNE online marketplace",
    freeDelivery: "Free delivery on orders above TZS 50,000",
    searchPlaceholder: "Search for any product...",
    searchBtn: "Search",
    myAccount: "My Account",
    cart: "Cart",
    home: "Home",
    categories: "Categories",
    sellProduct: "Sell Product",
    wallet: "Wallet",
    notifications: "Notifications",
    todayDeals: "TODAY'S DEALS",
    addToCart: "Add to Cart"
  },
  fr: {
    welcome: "Bienvenue sur votre marché en ligne ZUNE",
    freeDelivery: "Livraison gratuite pour les commandes de plus de TZS 50,000",
    searchPlaceholder: "Rechercher un produit...",
    searchBtn: "Chercher",
    myAccount: "Mon Compte",
    cart: "Panier",
    home: "Accueil",
    categories: "Catégories",
    sellProduct: "Vendre",
    wallet: "Portefeuille",
    notifications: "Notifications",
    todayDeals: "OFFRES DU JOUR",
    addToCart: "Ajouter au panier"
  }
}

// System Function ya Kubadilisha Lugha
function setLanguage(lang) {
  localStorage.setItem('zune_lang', lang)
  const dict = translations[lang] || translations.sw

  // Badilisha Element zote zilizo na attribute ya data-lang
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.getAttribute('data-lang')
    if (dict[key]) {
      if (el.tagName === 'INPUT' && el.type === 'text') {
        el.placeholder = dict[key]
      } else {
        el.innerText = dict[key]
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('languageSelector')
  const savedLang = localStorage.getItem('zune_lang') || 'sw'

  if (selector) {
    selector.value = savedLang
    selector.addEventListener('change', (e) => {
      setLanguage(e.target.value)
    })
  }

  setLanguage(savedLang)
})
