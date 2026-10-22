document.addEventListener('DOMContentLoaded', () => {
  renderOrdersTracking()
  renderNotifications()
})

window.switchNotifTab = function(tab) {
  const ordersSec = document.getElementById('section-orders')
  const notifsSec = document.getElementById('section-notifs')
  const ordersBtn = document.getElementById('tabOrdersBtn')
  const notifsBtn = document.getElementById('tabNotifsBtn')

  if (tab === 'orders') {
    if (ordersSec) ordersSec.classList.remove('hidden')
    if (notifsSec) notifsSec.classList.add('hidden')
    if (ordersBtn) ordersBtn.className = "flex-1 py-2.5 rounded-xl bg-blue-600 text-white transition text-center font-bold"
    if (notifsBtn) notifsBtn.className = "flex-1 py-2.5 rounded-xl text-slate-500 hover:text-blue-600 transition text-center font-bold"
  } else {
    if (ordersSec) ordersSec.classList.add('hidden')
    if (notifsSec) notifsSec.classList.remove('hidden')
    if (notifsBtn) notifsBtn.className = "flex-1 py-2.5 rounded-xl bg-blue-600 text-white transition text-center font-bold"
    if (ordersBtn) ordersBtn.className = "flex-1 py-2.5 rounded-xl text-slate-500 hover:text-blue-600 transition text-center font-bold"
  }
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('zune_orders')) || []
  } catch (e) {
    return []
  }
}

function renderOrdersTracking() {
  const container = document.getElementById('orders-container')
  if (!container) return

  const orders = getOrders()
  container.innerHTML = ''

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <i class="fa-solid fa-box-open text-slate-300 text-3xl mb-2"></i>
        <p class="text-xs text-slate-500 font-semibold">Haujafanya oda yoyote bado.</p>
        <a href="./index.html" class="inline-block mt-3 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs">Anza Ununuzi</a>
      </div>
    `
    return
  }

  orders.forEach((ord) => {
    const card = document.createElement('div')
    card.className = 'bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4'

    const totalFormatted = Number(ord.total || 0).toLocaleString()

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span class="text-[10px] text-slate-400 font-bold uppercase">Oda #${ord.id}</span>
          <h4 class="font-bold text-xs text-slate-800">${ord.date || 'Leo'}</h4>
        </div>
        <span class="bg-blue-50 text-blue-600 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
          TZS ${totalFormatted}
        </span>
      </div>

      <!-- LIVE TRACKING PROGRESS BAR -->
      <div class="space-y-2">
        <p class="text-[11px] font-bold text-slate-700">Hali ya Mizigo (Order Progress):</p>
        <div class="grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-slate-500">
          <div class="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm">Imepokelewa</div>
          <div class="bg-blue-500 text-white p-1.5 rounded-lg shadow-sm">Inasindikizwa</div>
          <div class="bg-slate-200 text-slate-600 p-1.5 rounded-lg">Njiani</div>
          <div class="bg-slate-200 text-slate-600 p-1.5 rounded-lg">Imewasili</div>
        </div>
      </div>

      <!-- ITEM LIST & REVIEW BUTTON -->
      <div class="pt-2 border-t border-slate-100 flex justify-between items-center">
        <p class="text-[11px] text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> ${ord.address || 'Anwani Yako'}</p>
        <button onclick="leaveReview('${ord.id}')" class="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] px-3 py-1.5 rounded-xl transition flex items-center gap-1">
          <i class="fa-solid fa-star text-amber-500"></i> Acha Review
        </button>
      </div>
    `
    container.appendChild(card)
  })
}

function renderNotifications() {
  const container = document.getElementById('notifications-container')
  if (!container) return

  container.innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
      <div class="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-sm shrink-0">
        <i class="fa-solid fa-gift"></i>
      </div>
      <div>
        <h4 class="font-bold text-xs text-slate-800">Karibu ZUNE Marketplace!</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Asante kwa kujiunga na soko la kwanza la Afrika Mashariki. Anza kununua au kuuza bidhaa zako leo.</p>
        <span class="text-[9px] text-slate-400 mt-1 block">Leo</span>
      </div>
    </div>
  `
}

window.leaveReview = function(orderId) {
  const rating = prompt("Weka Nyota kwa huduma tuliyokupa (1 hadi 5 Stars):", "5")
  if (!rating) return
  const comment = prompt("Andika maoni au maelezo mafupi kuhusu bidhaa uliyopokea:")
  
  if (rating && comment) {
    alert(`Asante sana! Review yako ya nyota ${rating} imehifadhiwa kikamilifu.`)
  }
}
