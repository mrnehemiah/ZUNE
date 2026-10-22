document.addEventListener('DOMContentLoaded', () => {
  renderCart()

  const checkoutForm = document.getElementById('checkoutForm')
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckout)
  }
})

function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem('zune_cart')) || []
  } catch (e) {
    return []
  }
}

function renderCart() {
  const container = document.getElementById('cart-items-container')
  const subtotalEl = document.getElementById('subtotal-price')
  const totalEl = document.getElementById('total-price')
  
  if (!container) return

  const cartItems = getCartItems()
  container.innerHTML = ''

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-solid fa-cart-arrow-down text-slate-300 text-3xl mb-2"></i>
        <p class="text-xs text-slate-500 font-semibold">Kikapu chako kiko wazi kwa sasa.</p>
        <a href="./index.html" class="inline-block mt-3 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs">Anza Ununuzi</a>
      </div>
    `
    if (subtotalEl) subtotalEl.innerText = 'TZS 0'
    if (totalEl) totalEl.innerText = 'TZS 0'
    return
  }

  let grandTotal = 0

  cartItems.forEach((item, index) => {
    const qty = item.quantity || 1
    const itemTotal = Number(item.price || 0) * qty
    grandTotal += itemTotal

    const row = document.createElement('div')
    row.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 gap-3'
    row.innerHTML = `
      <div class="flex-1">
        <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${item.title || 'Bidhaa'}</h4>
        <p class="text-[11px] text-blue-600 font-extrabold mt-0.5">TZS ${Number(item.price || 0).toLocaleString()}</p>
      </div>

      <div class="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
        <button onclick="changeQty(${index}, -1)" class="text-slate-500 hover:text-blue-600 font-bold px-1.5">-</button>
        <span class="text-xs font-bold px-1">${qty}</span>
        <button onclick="changeQty(${index}, 1)" class="text-slate-500 hover:text-blue-600 font-bold px-1.5">+</button>
      </div>

      <button onclick="removeItem(${index})" class="text-rose-500 hover:text-rose-700 text-xs p-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `
    container.appendChild(row)
  })

  const formattedTotal = `TZS ${grandTotal.toLocaleString()}`
  if (subtotalEl) subtotalEl.innerText = formattedTotal
  if (totalEl) totalEl.innerText = formattedTotal
}

window.changeQty = function(index, change) {
  let cartItems = getCartItems()
  if (!cartItems[index]) return

  cartItems[index].quantity = (cartItems[index].quantity || 1) + change

  if (cartItems[index].quantity <= 0) {
    cartItems.splice(index, 1)
  }

  localStorage.setItem('zune_cart', JSON.stringify(cartItems))
  renderCart()
}

window.removeItem = function(index) {
  let cartItems = getCartItems()
  cartItems.splice(index, 1)
  localStorage.setItem('zune_cart', JSON.stringify(cartItems))
  renderCart()
}

window.clearCart = function() {
  if (confirm("Je, una uhakika unataka kusafisha kikapu vyote?")) {
    localStorage.removeItem('zune_cart')
    renderCart()
  }
}

function handleCheckout(e) {
  e.preventDefault()

  const cartItems = getCartItems()
  if (cartItems.length === 0) {
    alert("Kikapu chako kiko wazi! Ongeza bidhaa kwanza.")
    return
  }

  const orderTotal = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0)

  const newOrder = {
    id: Math.floor(100000 + Math.random() * 900000),
    customer: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    address: document.getElementById('custAddress').value,
    payment: document.getElementById('paymentMethod').value,
    total: orderTotal,
    date: new Date().toLocaleDateString('sw-TZ'),
    items: cartItems
  }

  let existingOrders = []
  try {
    existingOrders = JSON.parse(localStorage.getItem('zune_orders')) || []
  } catch (err) {
    existingOrders = []
  }

  existingOrders.unshift(newOrder)
  localStorage.setItem('zune_orders', JSON.stringify(existingOrders))
  localStorage.removeItem('zune_cart')

  alert(`Hongera ${newOrder.customer}! Oda yako #${newOrder.id} imepokelewa kikamilifu.`)
  window.location.href = './notification.html'
}
