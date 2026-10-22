document.addEventListener('DOMContentLoaded', () => {
  const userNameEl = document.getElementById('user-name')
  const userPhoneEl = document.getElementById('user-phone')

  // Kusoma namba ya simu au jina kutoka LocalStorage kama ipo
  const savedPhone = localStorage.getItem('zune_seller_phone') || localStorage.getItem('zune_user_phone')

  if (savedPhone) {
    if (userPhoneEl) userPhoneEl.innerText = savedPhone
    if (userNameEl) userNameEl.innerText = "Mteja wa ZUNE"
  }
})

window.logoutUser = function() {
  if (confirm("Je, una uhakika unataka kutoka kwenye akaunti yako ya ZUNE?")) {
    localStorage.removeItem('zune_seller_phone')
    localStorage.removeItem('zune_user_phone')
    alert("Umetoka kwenye akaunti kikamilifu.")
    window.location.href = "./index.html"
  }
}
