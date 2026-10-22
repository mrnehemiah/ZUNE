const SUPABASE_URL = 'https://rpkogiieegqgxqbzwxwo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf'

let supabaseClient = null
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

let currentAdminRole = 'moderator'

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm')
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin)
  }

  // Angalia kama admin alishaingia
  const savedAdmin = localStorage.getItem('zune_admin_session')
  if (savedAdmin) {
    const adminData = JSON.parse(savedAdmin)
    showDashboard(adminData)
  }
})

// 1. Admin Login Function
async function handleAdminLogin(e) {
  e.preventDefault()
  const email = document.getElementById('adminEmail').value
  const password = document.getElementById('adminPassword').value

  if (!supabaseClient) return

  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password)
    .single()

  if (error || !data) {
    alert("Email au Password ni makosa!")
    return
  }

  localStorage.setItem('zune_admin_session', JSON.stringify(data))
  showDashboard(data)
}

function showDashboard(admin) {
  document.getElementById('loginSection').classList.add('hidden')
  document.getElementById('dashboardSection').classList.remove('hidden')
  
  currentAdminRole = admin.role
  document.getElementById('roleBadge').innerText = admin.role.toUpperCase().replace('_', ' ')

  // Ficha au Onyesha vipengele kulingana na Role
  if (currentAdminRole !== 'super_admin') {
    const btnAdmins = document.getElementById('btnAdmins')
    if (btnAdmins) btnAdmins.classList.add('hidden')
  }

  loadStats()
}

// 2. Tab Switcher
window.switchTab = function(tabName) {
  const tabs = ['overview', 'admins', 'sellers', 'withdrawals', 'products']
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`)
    if (el) el.classList.add('hidden')
  })

  const selectedTab = document.getElementById(`tab-${tabName}`)
  if (selectedTab) selectedTab.classList.remove('hidden')

  if (tabName === 'admins' && currentAdminRole === 'super_admin') {
    loadAdminsList()
  } else if (tabName === 'sellers') {
    loadSellersList()
  }
}

// 3. Super Admin: Ongeza Admin Mpya
window.openAddAdminModal = async function() {
  if (currentAdminRole !== 'super_admin') {
    alert("Super Admin pekee ndiye anayeweza kuongeza ma-admin wengine!")
    return
  }

  const name = prompt("Ingiza Jina Kamili la Admin Mpya:")
  const email = prompt("Ingiza Email ya Admin Mpya:")
  const pass = prompt("Ingiza Password ya Admin Mpya:")
  const role = prompt("Chagua Role: 'super_admin', 'financial', 'support', 'moderator':", "moderator")

  if (name && email && pass && role) {
    const { error } = await supabaseClient
      .from('admin_users')
      .insert([{ full_name: name, email: email, password_hash: pass, role: role }])

    if (error) {
      alert("Haikufanikiwa kuongeza admin: " + error.message)
    } else {
      alert("Admin mpya ameongezwa kikamilifu!")
      loadAdminsList()
    }
  }
}

async function loadAdminsList() {
  const tbody = document.getElementById('adminsTableBody')
  if (!tbody) return

  const { data } = await supabaseClient.from('admin_users').select('*')
  tbody.innerHTML = ''

  if (data) {
    document.getElementById('stat-admins').innerText = data.length
    data.forEach(a => {
      const tr = document.createElement('tr')
      tr.className = 'border-b border-slate-100 hover:bg-slate-50'
      tr.innerHTML = `
        <td class="p-4 font-bold text-slate-800">${a.full_name}</td>
        <td class="p-4 text-slate-500">${a.email}</td>
        <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">${a.role}</span></td>
        <td class="p-4">
          ${a.role !== 'super_admin' ? `<button onclick="deleteAdmin('${a.id}')" class="text-rose-500 font-bold hover:underline">Futa</button>` : '-'}
        </td>
      `
      tbody.appendChild(tr)
    })
  }
}

window.deleteAdmin = async function(id) {
  if (confirm("Je, una uhakika unataka kumfuta admin huyu?")) {
    await supabaseClient.from('admin_users').delete().eq('id', id)
    loadAdminsList()
  }
}

async function loadStats() {
  const { data: sellers } = await supabaseClient.from('seller_applications').select('id, status')
  if (sellers) {
    document.getElementById('stat-sellers').innerText = sellers.length
    const pending = sellers.filter(s => s.status === 'pending').length
    document.getElementById('stat-pending').innerText = pending
  }
}

window.logoutAdmin = function() {
  localStorage.removeItem('zune_admin_session')
  window.location.reload()
}
