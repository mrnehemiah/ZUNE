import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function loadUserNotifications() {
  const listEl = document.getElementById('notifications-list')
  const countEl = document.getElementById('notif-count')
  if (!listEl) return

  const userPhone = localStorage.getItem('zune_seller_phone')
  let notifications = []

  // 1. Angalia Hali ya Ombi la Muuzaji (Pending, Approved, Rejected) kutoka Supabase
  if (userPhone) {
    const { data: sellerApp } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('phone', userPhone)
      .single()

    if (sellerApp) {
      let statusClass = 'bg-amber-100 text-amber-700'
      let statusText = 'PENDING'
      let icon = 'fa-clock text-amber-500'

      if (sellerApp.status === 'approved') {
        statusClass = 'bg-emerald-100 text-emerald-700'
        statusText = 'APPROVED'
        icon = 'fa-circle-check text-emerald-500'
      } else if (sellerApp.status === 'rejected') {
        statusClass = 'bg-rose-100 text-rose-700'
        statusText = 'REJECTED'
        icon = 'fa-circle-xmark text-rose-500'
      }

      notifications.push({
        title: `Ombi la Duka: ${sellerApp.business_name}`,
        desc: `Hali ya maombi yako ya uuzaji iko katika hatua ya: ${sellerApp.status.toUpperCase()}`,
        badge: statusText,
        badgeClass: statusClass,
        icon: icon,
        time: 'Hivi karibuni'
      })
    }
  }

  // 2. Angalia Oda Zilizowekwa na Mteja (Local Storage / Shughuli za Manunuzi)
  const savedOrders = JSON.parse(localStorage.getItem('zune_orders') || '[]')
  savedOrders.forEach(order => {
    notifications.push({
      title: `Oda Mpya #${order.id || 'ZUNE'}`,
      desc: `Umetuma oda ya bidhaa yenye thamani ya TZS ${Number(order.total).toLocaleString()}`,
      badge: 'SUCCESS',
      badgeClass: 'bg-blue-100 text-blue-700',
      icon: 'fa-cart-shopping text-blue-500',
      time: order.date || 'Leo'
    })
  })

  // Kama hakuna taarifa yoyote
  if (notifications.length === 0) {
    listEl.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center py-12">
        <i class="fa-solid fa-bell-slash text-slate-300 text-3xl mb-3"></i>
        <p class="text-slate-600 text-sm font-semibold">Hakuna taarifa au shughuli yoyote kwa sasa.</p>
        <p class="text-xs text-slate-400 mt-1">Ukishafanya oda au kutuma maombi ya uuzaji yataonekana hapa moja kwa moja.</p>
      </div>
    `
    if (countEl) countEl.innerText = '0 Mpya'
    return
  }

  if (countEl) countEl.innerText = `${notifications.length} Mpya`
  listEl.innerHTML = ''

  // Kupanga na kuonyesha taarifa zote
  notifications.forEach(n => {
    const item = document.createElement('div')
    item.className = 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3.5 hover:shadow-md transition'
    item.innerHTML = `
      <div class="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-lg">
        <i class="fa-solid ${n.icon}"></i>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-brand font-bold text-xs md:text-sm text-slate-800">${n.title}</h4>
          <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${n.badgeClass}">${n.badge}</span>
        </div>
        <p class="text-xs text-slate-500">${n.desc}</p>
        <span class="text-[10px] text-slate-400 mt-2 block">${n.time}</span>
      </div>
    `
    listEl.appendChild(item)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserNotifications()
})
