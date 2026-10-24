// ============================================
// ZUNE CHAT SYSTEM
// File: chat.js
// Version: 2.0
// ============================================

"use strict";

const ZUNE_CHAT_STORAGE_KEY = "zune_chat_history";

const ZUNE_DEFAULT_MESSAGE = {
  sender: "seller",
  text: "Jambo! Karibu ZUNE. Je, unahitaji msaada gani kuhusu bidhaa hii?",
  time: "Sasa hivi"
};

// ============================================
// 1. INITIALIZE CHAT
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chatForm");

  if (form) {
    form.addEventListener("submit", handleSendMessage);
  }

  renderChatHistory();
});

// ============================================
// 2. GET CHAT HISTORY
// ============================================

function getMessages() {
  try {
    const saved = localStorage.getItem(ZUNE_CHAT_STORAGE_KEY);

    if (!saved) {
      return [{ ...ZUNE_DEFAULT_MESSAGE }];
    }

    const messages = JSON.parse(saved);

    if (!Array.isArray(messages)) {
      return [{ ...ZUNE_DEFAULT_MESSAGE }];
    }

    return messages.filter(message => {
      return (
        message &&
        typeof message.text === "string" &&
        typeof message.sender === "string"
      );
    });
  } catch (error) {
    console.error("ZUNE Chat: Imeshindwa kusoma historia.", error);
    return [{ ...ZUNE_DEFAULT_MESSAGE }];
  }
}

// ============================================
// 3. SAVE CHAT HISTORY
// ============================================

function saveMessages(messages) {
  try {
    localStorage.setItem(
      ZUNE_CHAT_STORAGE_KEY,
      JSON.stringify(messages)
    );

    return true;
  } catch (error) {
    console.error("ZUNE Chat: Imeshindwa kuhifadhi ujumbe.", error);
    showChatNotice(
      "Imeshindikana kuhifadhi ujumbe. Angalia nafasi ya hifadhi ya simu."
    );

    return false;
  }
}

// ============================================
// 4. SAFE MESSAGE ELEMENT
// ============================================

function createMessageElement(message) {
  const isMe = message.sender === "user";

  const wrapper = document.createElement("div");

  wrapper.className = isMe
    ? "flex justify-end"
    : "flex justify-start";

  const bubble = document.createElement("div");

  bubble.className = [
    "max-w-[80%]",
    "rounded-2xl",
    "px-4",
    "py-2.5",
    "text-xs",
    "shadow-sm",
    isMe
      ? "bg-blue-600 text-white rounded-br-none"
      : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
  ].join(" ");

  const text = document.createElement("p");

  // textContent huzuia ujumbe kutafsiriwa kama HTML.
  text.textContent = message.text;
  text.className = "whitespace-pre-wrap break-words";

  const time = document.createElement("span");

  time.className = [
    "text-[9px]",
    "block",
    "text-right",
    "mt-1",
    isMe ? "text-blue-200" : "text-slate-400"
  ].join(" ");

  time.textContent = message.time || "";

  bubble.appendChild(text);
  bubble.appendChild(time);
  wrapper.appendChild(bubble);

  return wrapper;
}

// ============================================
// 5. RENDER CHAT HISTORY
// ============================================

function renderChatHistory() {
  const box = document.getElementById("chatBox");

  if (!box) {
    return;
  }

  const messages = getMessages();
  const fragment = document.createDocumentFragment();

  messages.forEach(message => {
    fragment.appendChild(createMessageElement(message));
  });

  box.replaceChildren(fragment);
  box.scrollTop = box.scrollHeight;
}

// ============================================
// 6. GET CURRENT TIME
// ============================================

function getChatTime() {
  try {
    return new Intl.DateTimeFormat("sw-TZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Africa/Dar_es_Salaam"
    }).format(new Date());
  } catch (error) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

// ============================================
// 7. SHOW NOTICE
// ============================================

function showChatNotice(message) {
  const notice = document.getElementById("chatNotice");

  if (notice) {
    notice.textContent = message;
    notice.classList.remove("hidden");
  } else {
    console.warn("ZUNE Chat:", message);
  }
}

// ============================================
// 8. HANDLE SEND MESSAGE
// ============================================

function handleSendMessage(event) {
  event.preventDefault();

  const input = document.getElementById("chatInput");

  if (!input) {
    return;
  }

  const text = input.value.trim();

  if (!text) {
    return;
  }

  const messages = getMessages();

  messages.push({
    sender: "user",
    text: text,
    time: getChatTime()
  });

  if (!saveMessages(messages)) {
    return;
  }

  input.value = "";
  renderChatHistory();

  // Auto-reply ya majaribio.
  // Hii si ujumbe halisi kutoka kwa muuzaji.
  window.setTimeout(() => {
    const updatedMessages = getMessages();

    updatedMessages.push({
      sender: "seller",
      text: "Asante kwa ujumbe wako. Huu ni ujumbe wa kiotomatiki wa majaribio. Muuzaji halisi atahitaji kujibu kupitia mfumo wa chat uliounganishwa.",
      time: getChatTime()
    });

    if (saveMessages(updatedMessages)) {
      renderChatHistory();
    }
  }, 1500);
}

// ============================================
// 9. OPTIONAL: CLEAR CHAT HISTORY
// ============================================

function clearChatHistory() {
  const confirmed = window.confirm(
    "Una uhakika unataka kufuta historia ya mazungumzo kwenye kifaa hiki?"
  );

  if (!confirmed) {
    return;
  }

  try {
    localStorage.removeItem(ZUNE_CHAT_STORAGE_KEY);

    const box = document.getElementById("chatBox");

    if (box) {
      box.replaceChildren();
    }

    renderChatHistory();
  } catch (error) {
    showChatNotice("Imeshindikana kufuta historia ya mazungumzo.");
  }
}