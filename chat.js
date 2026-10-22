document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chatForm')
  if (form) form.addEventListener('submit', handleSendMessage)

  renderChatHistory()
})

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem('zune_chat_history')) || [
      { sender: 'seller', text: 'Jambo! Karibu ZUNE. Je, unahitaji msaada gani kuhusu bidhaa hii?', time: 'Sasa hivi' }
    ]
  } catch (e) {
    return []
  }
}

function renderChatHistory() {
  const box = document.getElementById('chatBox')
  if (!box) return

  const msgs = getMessages()
  box.innerHTML = ''

  msgs.forEach(m => {
    const div = document.createElement('div')
    const isMe = m.sender === 'user'

    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`
    div.innerHTML = `
      <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}">
        <p>${m.text}</p>
        <span class="text-[9px] block text-right mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}">${m.time}</span>
      </div>
    `
    box.appendChild(div)
  })

  box.scrollTop = box.scrollHeight
}

function handleSendMessage(e) {
  e.preventDefault()
  const input = document.getElementById('chatInput')
  if (!input || !input.value.trim()) return

  const msgs = getMessages()
  const now = new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })

  msgs.push({ sender: 'user', text: input.value.trim(), time: now })
  localStorage.setItem('zune_chat_history', JSON.stringify(msgs))

  input.value = ''
  renderChatHistory()

  // Mfumo wa Auto-Reply wa Muuzaji baada ya sekunde 1.5
  setTimeout(() => {
    const updated = getMessages()
    updated.push({ sender: 'seller', text: 'Asante kwa ujumbe wako. Muuzaji anaangalia stock na atakujibu mara moja!', time: new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }) })
    localStorage.setItem('zune_chat_history', JSON.stringify(updated))
    renderChatHistory()
  }, 1500)
}
