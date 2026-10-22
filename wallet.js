let currentBalance = 150000
let isHidden = false

const balanceText = document.getElementById('balanceText')
const toggleBtn = document.getElementById('toggleBalance')
const eyeIcon = document.getElementById('eyeIcon')

// 1. Ficha / Onyesha Salio
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    isHidden = !isHidden
    if (isHidden) {
      balanceText.innerText = 'TZS ••••••••'
      eyeIcon.className = 'fa-regular fa-eye-slash text-lg'
    } else {
      balanceText.innerText = `TZS ${currentBalance.toLocaleString()}`
      eyeIcon.className = 'fa-regular fa-eye text-lg'
    }
  })
}

// 2. Modals za Weka na Toa Pesa
window.openDepositModal = function() {
  const amount = prompt("Ingiza kiasi unachotaka kuweka kwenye ZUNE Wallet (TZS):", "10000")
  if (amount && !isNaN(amount)) {
    currentBalance += Number(amount)
    balanceText.innerText = `TZS ${currentBalance.toLocaleString()}`
    alert(`Hongera! TZS ${Number(amount).toLocaleString()} zimeongezwa kwenye Wallet yako kupitia M-Pesa.`)
  }
}

window.openWithdrawModal = function() {
  const amount = prompt("Ingiza kiasi unachotaka kutoa kutoka ZUNE Wallet kwenda kwenye Simu/Benki (TZS):", "5000")
  if (amount && !isNaN(amount)) {
    if (Number(amount) > currentBalance) {
      alert("Salio lako halitoshi kufanya mwamala huu.")
    } else {
      currentBalance -= Number(amount)
      balanceText.innerText = `TZS ${currentBalance.toLocaleString()}`
      alert(`Ombi la kutoa TZS ${Number(amount).toLocaleString()} limepokelewa. Pesa zitafika kwenye namba yako hivi karibuni!`)
    }
  }
}
