const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

let currentAdmin = null

window.addEventListener('load', () => {
  const loginForm = document.getElementById('adminLoginForm')
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin)
  }

  // Angalia kama admin alishaingia kabla
  const savedAdmin = localStorage.getItem('zune_admin_session')
  if (savedAdmin) {
    try {
      currentAdmin = JSON.parse(savedAdmin)
      showDashboard(currentAdmin)
    } catch (e) {
      localStorage.removeItem('zune_admin_session')
    }
  }
})

function handleAdminLogin(e) {
  e.preventDefault()
  const emailInput = document.getElementById('adminEmail')
  const passwordInput = document.getElementById('adminPassword')

  if (!emailInput || !passwordInput) return

  const email = emailInput.value.trim().toLowerCase()
  const password = passwordInput.value.trim()

  // 1. Hakiki Super Admin ya Awali (Inafanya kazi mara moja)
  if (email === 'admin@zune.com' && password === 'admin123') {
    currentAdmin = {
      id: 'super-1',
      full_name: 'Super Admin Mkuu',
      email: 'admin@zune.com',
      role: 'super_admin'
    }
    localStorage.setItem('zune_admin_session', JSON.stringify(currentAdmin))
    showDashboard(currentAdmin)
    return
  }

  // 2. Angalia kama kuna ma-admin wa ziada uliowaongeza kwenye LocalStorage
  let customAdmins = []
  try {
    customAdmins = JSON.parse(localStorage.getItem('zune_custom_admins') || '[]')
  } catch (err) {
    customAdmins = []
  }

  const foundAdmin = customAdmins.find(a => a.email.toLowerCase() === email && a.password_hash === password)
  if (foundAdmin) {
    currentAdmin = foundAdmin
    localStorage.setItem('zune_admin_session', JSON.stringify(currentAdmin))
    showDashboard(currentAdmin)
    return
  }

  alert("Email au Password siyo sahihi! Jaribu tena (Mfano: admin@zune.com na admin123).")
}

function showDashboard(admin) {
  const loginSec = document.getElementById('loginSection')
  const dashSec = document.getElementById('dashboardSection')

  if (loginSec) loginSec.classList.add('hidden')
  if (dashSec) dashSec.classList.remove('hidden')
  
  const roleBadge = document.getElementById('roleBadge')
  if (roleBadge) {
    roleBadge.innerText = (admin.role || 'SUPER_ADMIN').toUpperCase().replace('_', ' ')
  }

  // Ficha menu ya Manage Admin kama siyo Super Admin
  if (admin.role !== 'super_admin') {
    const btnAdmins = document.getElementById('btnAdmins')
    if (btnAdmins) btnAdmins.classList.add('hidden')
  }

  loadDashboardStats()
}

window.switchTab = function(tabName) {
  const tabs = ['overview', 'admins', 'sellers', 'withdrawals']
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`)
    if (el) el.classList.add('hidden')
  })

  const selected = document.getElementById(`tab-${tabName}`)
  if (selected) selected.classList.remove('hidden')

  if (tabName === 'admins') loadAdminsList()
  if (tabName === 'sellers') loadSellersList()
}

// Super Admin: Ongeza Admin Mpya
window.openAddAdminModal = function() {
  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    alert("Super Admin pekee ndiye anayeweza kuongeza ma-admin wengine!")
    return
  }

  const name = prompt("Ingiza Jina Kamili la Admin Mpya:")
  if (!name) return
  const email = prompt("Ingiza Email ya Admin Mpya:")
  if (!email) return
  const pass = prompt("Ingiza Password ya Admin Mpya:")
  if (!pass) return
  const role = prompt("Chagua Role ('super_admin', 'financial', 'support', 'moderator'):", "moderator")

  if (name && email && pass && role) {
    let adminsList = JSON.parse(localStorage.getItem('zune_custom_admins') || '[]')
    adminsList.push({ id: Date.now().toString(), full_name: name, email, password_hash: pass, role })
    localStorage.setItem('zune_custom_admins', JSON.stringify(adminsList))
    alert("Admin mpya ameongezwa kikamilifu!")
    loadAdminsList()
  }
}

function loadAdminsList() {
  const tbody = document.getElementById('adminsTableBody')
  if (!tbody) return

  let admins = [
    { full_name: 'Super Admin Mkuu', email: 'admin@zune.com', role: 'super_admin' }
  ]

  const customAdmins = JSON.parse(localStorage.getItem('zune_custom_admins') || '[]')
  admins = admins.concat(customAdmins)

  const statAdmins = document.getElementById('stat-admins')
  if (statAdmins) statAdmins.innerText = admins.length
  tbody.innerHTML = ''

  admins.forEach((a, index) => {
    const tr = document.createElement('tr')
    tr.className = 'border-b border-slate-100 hover:bg-slate-50'
    tr.innerHTML = `
      <td class="p-4 font-bold text-slate-800">${a.full_name}</td>
      <td class="p-4 text-slate-500">${a.email}</td>
      <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">${a.role}</span></td>
      <td class="p-4">
        ${a.role !== 'super_admin' ? `<button onclick="deleteCustomAdmin(${index - 1})" class="text-rose-500 font-bold hover:underline">Futa</button>` : '-'}
      </td>
    `
    tbody.appendChild(tr)
  })
}

window.deleteCustomAdmin = function(index) {
  if (confirm("Je, una uhakika unataka kumfuta admin huyu?")) {
    let customAdmins = JSON.parse(localStorage.getItem('zune_custom_admins') || '[]')
    customAdmins.splice(index, 1)
    localStorage.setItem('zune_custom_admins', JSON.stringify(customAdmins))
    loadAdminsList()
  }
}

async function loadDashboardStats() {
  try {
    if (window.supabase) {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data } = await client.from('seller_applications').select('*')
      if (data) {
        const statSellers = document.getElementById('stat-sellers')
        const statPending = document.getElementById('stat-pending')
        if (statSellers) statSellers.innerText = data.length
        if (statPending) statPending.innerText = data.filter(s => s.status === 'pending').length
      }
    }
  } catch (e) {
    console.log("Error stats:", e)
  }
}

async function loadSellersList() {
  const container = document.getElementById('sellersList')
  if (!container) return

  container.innerHTML = `<p class="text-xs text-slate-400">Inapakia maombi ya wauzaji...</p>`

  try {
    if (window.supabase) {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data, error } = await client.from('seller_applications').select('*')

      if (data && data.length > 0) {
        container.innerHTML = ''
        data.forEach(s => {
          const card = document.createElement('div')
          card.className = 'bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between'
          card.innerHTML = `
            <div>
              <h4 class="font-bold text-xs text-slate-800">${s.business_name}</h4>
              <p class="text-[10px] text-slate-500">${s.phone} • ${s.country || 'Tanzania'}</p>
            </div>
            <span class="text-[10px] font-extrabold px-3 py-1 rounded-full uppercase ${s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${s.status}</span>
          `
          container.appendChild(card)
        })
        return
      }
    }
  } catch (e) {}

  container.innerHTML = `<p class="text-xs text-slate-500">Hakuna maombi ya wauzaji kwa sasa.</p>`
}

window.logoutAdmin = function() {
  localStorage.removeItem('zune_admin_session')
  window.location.reload()
}
