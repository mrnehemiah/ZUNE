// ============================================
// ZUNE NOTIFICATION.JS
// SEHEMU YA 1/4: SUPABASE NA MAANDALIZI
// ============================================

const SUPABASE_URL =
  'https://rpkogiieegqgxqbzwxwo.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';

let supabaseClient = null;
let currentUser = null;
let currentOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    showMessage(
      'notificationMessage',
      'Supabase haijapakiwa. Angalia script kwenye notification.html.',
      'error'
    );
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const refreshButton =
    document.getElementById('refreshOrdersBtn');

  if (refreshButton) {
    refreshButton.addEventListener('click', loadOrders);
  }

  await loadOrders();
});

// ============================================
// KUBADILI KATI YA ODA NA TAARIFA
// ============================================

window.switchNotifTab = function (tab) {
  const ordersSection =
    document.getElementById('section-orders');

  const notificationsSection =
    document.getElementById('section-notifs');

  const ordersButton =
    document.getElementById('tabOrdersBtn');

  const notificationsButton =
    document.getElementById('tabNotifsBtn');

  const showOrders = tab === 'orders';

  if (ordersSection) {
    ordersSection.classList.toggle('hidden', !showOrders);
  }

  if (notificationsSection) {
    notificationsSection.classList.toggle('hidden', showOrders);
  }

  if (ordersButton) {
    ordersButton.classList.toggle('active', showOrders);
  }

  if (notificationsButton) {
    notificationsButton.classList.toggle('active', !showOrders);
  }
};

// ============================================
// UJUMBE WA HALI YA UKURASA
// ============================================

function showMessage(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.classList.remove('hidden');

  element.classList.remove(
    'text-red-600',
    'text-green-600',
    'text-blue-600'
  );

  if (type === 'error') {
    element.classList.add('text-red-600');
  } else if (type === 'success') {
    element.classList.add('text-green-600');
  } else {
    element.classList.add('text-blue-600');
  }
}

function hideMessage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
}

// ============================================
// VIFAA VYA KUUNDA HTML KWA USALAMA
// ============================================

function makeElement(tag, className = '', text = '') {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== '') {
    element.textContent = String(text);
  }

  return element;
}

function formatMoney(amount) {
  const value = Number(amount || 0);

  return 'TZS ' + value.toLocaleString('en-TZ', {
    maximumFractionDigits: 2
  });
}

function formatDate(dateValue) {
  if (!dateValue) return 'Tarehe haijulikani';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Tarehe haijulikani';
  }

  return date.toLocaleString('sw-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}// ============================================
// SEHEMU YA 2/4: KUPAKIA ODA
// ============================================

async function loadOrders() {
  const ordersContainer =
    document.getElementById('orders-container');

  if (ordersContainer) {
    ordersContainer.replaceChildren(
      makeElement(
        'p',
        'text-center text-slate-500 py-6',
        'Inapakia oda zako...'
      )
    );
  }

  hideMessage('notificationMessage');

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError) throw authError;

    currentUser = authData?.user || null;

    if (!currentUser) {
      currentOrders = [];

      renderLoginRequired();
      renderNotifications([]);

      showMessage(
        'notificationMessage',
        'Ingia kwenye akaunti yako ili kuona oda zako.',
        'info'
      );

      return;
    }

    const { data, error } = await supabaseClient
      .from('orders')
      .select(`
        id,
        buyer_id,
        product_id,
        quantity,
        total_price,
        commission_fee,
        status,
        created_at
      `)
      .eq('buyer_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentOrders = data || [];

    const productNames = await loadProductNames(
      currentOrders.map(order => order.product_id)
    );

    renderOrders(currentOrders, productNames);
    renderNotifications(currentOrders);

    showMessage(
      'notificationMessage',
      'Oda zimepakiwa.',
      'success'
    );

  } catch (error) {
    console.error('ZUNE loadOrders error:', error);

    currentOrders = [];

    renderOrdersError();

    showMessage(
      'notificationMessage',
      'Imeshindikana kupakia oda. Angalia muunganisho au ruhusa za Supabase.',
      'error'
    );

    renderNotifications([]);
  }
}

// ============================================
// KUPATA MAJINA YA BIDHAA
// ============================================

async function loadProductNames(productIds) {
  const uniqueIds = [
    ...new Set(productIds.filter(Boolean))
  ];

  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseClient
    .from('products')
    .select('id, title')
    .in('id', uniqueIds);

  if (error) {
    console.error('ZUNE product names error:', error);
    return {};
  }

  const names = {};

  (data || []).forEach(product => {
    names[product.id] = product.title || 'Bidhaa ya ZUNE';
  });

  return names;
}

// ============================================
// UJUMBE KWA MTUMIAJI ASIYEINGIA
// ============================================

function renderLoginRequired() {
  const container =
    document.getElementById('orders-container');

  if (!container) return;

  container.replaceChildren();

  const card = makeElement(
    'div',
    'text-center bg-white rounded-2xl p-6 border border-slate-100'
  );

  card.appendChild(
    makeElement(
      'div',
      'text-3xl mb-3',
      '🔐'
    )
  );

  card.appendChild(
    makeElement(
      'h3',
      'font-bold text-slate-800 mb-2',
      'Ingia kwenye ZUNE'
    )
  );

  card.appendChild(
    makeElement(
      'p',
      'text-sm text-slate-500 mb-4',
      'Tafadhali ingia ili kuona oda ulizoweka kwenye akaunti yako.'
    )
  );

  const loginLink = makeElement(
    'a',
    'inline-block bg-blue-600 text-white px-5 py-3 rounded-xl font-bold',
    'Ingia sasa'
  );

  loginLink.href = './login.html';

  card.appendChild(loginLink);
  container.appendChild(card);
}

// ============================================
// UJUMBE WAKATI ODA ZINASHINDWA KUPAKIA
// ============================================

function renderOrdersError() {
  const container =
    document.getElementById('orders-container');

  if (!container) return;

  container.replaceChildren(
    makeElement(
      'p',
      'text-center text-red-600 py-6',
      'Oda hazikuweza kupakiwa. Bonyeza kitufe cha kujaribu tena.'
    )
  );
}// ============================================
// SEHEMU YA 3/4: KUONYESHA ODA
// ============================================

function getOrderStatus(status) {
  const statuses = {
    pending: {
      label: 'Inasubiri kuthibitishwa',
      color: 'bg-amber-100 text-amber-700',
      step: 1
    },
    confirmed: {
      label: 'Imethibitishwa',
      color: 'bg-blue-100 text-blue-700',
      step: 2
    },
    completed: {
      label: 'Imekamilika',
      color: 'bg-green-100 text-green-700',
      step: 3
    },
    cancelled: {
      label: 'Imeghairiwa',
      color: 'bg-red-100 text-red-700',
      step: 0
    }
  };

  return statuses[status] || {
    label: status || 'Hali haijulikani',
    color: 'bg-slate-100 text-slate-700',
    step: 0
  };
}

function renderOrders(orders, productNames = {}) {
  const container =
    document.getElementById('orders-container');

  if (!container) return;

  container.replaceChildren();

  if (!orders.length) {
    const empty = makeElement(
      'div',
      'text-center bg-white rounded-2xl border border-slate-100 p-8'
    );

    empty.appendChild(
      makeElement('div', 'text-4xl mb-3', '📦')
    );

    empty.appendChild(
      makeElement(
        'h3',
        'font-bold text-slate-800 mb-2',
        'Bado huna oda'
      )
    );

    empty.appendChild(
      makeElement(
        'p',
        'text-sm text-slate-500',
        'Oda utakazoweka zitaonekana hapa.'
      )
    );

    container.appendChild(empty);
    return;
  }

  orders.forEach(order => {
    const status = getOrderStatus(order.status);

    const card = makeElement(
      'article',
      'bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm'
    );

    const header = makeElement(
      'div',
      'flex items-start justify-between gap-3 mb-3'
    );

    const productInfo = makeElement('div', 'min-w-0');

    productInfo.appendChild(
      makeElement(
        'h3',
        'font-bold text-slate-800 break-words',
        productNames[order.product_id] || 'Bidhaa ya ZUNE'
      )
    );

    productInfo.appendChild(
      makeElement(
        'p',
        'text-xs text-slate-500 mt-1',
        'Oda: ' + String(order.id).slice(0, 8)
      )
    );

    const badge = makeElement(
      'span',
      'shrink-0 text-xs font-bold px-3 py-2 rounded-full ' + status.color,
      status.label
    );

    header.appendChild(productInfo);
    header.appendChild(badge);
    card.appendChild(header);

    const details = makeElement(
      'div',
      'grid grid-cols-2 gap-3 text-sm mb-4'
    );

    const quantityBox = makeElement('div', 'bg-slate-50 rounded-xl p-3');
    quantityBox.appendChild(
      makeElement('p', 'text-xs text-slate-500', 'Idadi')
    );
    quantityBox.appendChild(
      makeElement(
        'p',
        'font-bold text-slate-800 mt-1',
        String(order.quantity || 0)
      )
    );

    const priceBox = makeElement('div', 'bg-slate-50 rounded-xl p-3');
    priceBox.appendChild(
      makeElement('p', 'text-xs text-slate-500', 'Jumla ya oda')
    );
    priceBox.appendChild(
      makeElement(
        'p',
        'font-bold text-slate-800 mt-1',
        formatMoney(order.total_price)
      )
    );

    details.appendChild(quantityBox);
    details.appendChild(priceBox);
    card.appendChild(details);

    card.appendChild(
      makeElement(
        'p',
        'text-xs text-slate-500 mb-4',
        'Tarehe: ' + formatDate(order.created_at)
      )
    );

    if (order.status === 'cancelled') {
      card.appendChild(
        makeElement(
          'p',
          'text-sm text-red-600 bg-red-50 rounded-xl p-3',
          'Oda hii imeghairiwa. Wasiliana na huduma kwa wateja ikiwa unahitaji maelezo zaidi.'
        )
      );
    } else {
      const progress = makeElement(
        'div',
        'border-t border-slate-100 pt-4'
      );

      progress.appendChild(
        makeElement(
          'p',
          'text-xs font-bold text-slate-700 mb-3',
          'Hatua ya oda'
        )
      );

      const steps = makeElement(
        'div',
        'grid grid-cols-3 gap-2'
      );

      const labels = [
        'Imepokelewa',
        'Imethibitishwa',
        'Imekamilika'
      ];

      labels.forEach((label, index) => {
        const stepNumber = index + 1;
        const reached = status.step >= stepNumber;

        const step = makeElement(
          'div',
          'text-center'
        );

        step.appendChild(
          makeElement(
            'div',
            'mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ' +
              (reached
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 text-slate-500'),
            reached ? '✓' : String(stepNumber)
          )
        );

        step.appendChild(
          makeElement(
            'p',
            'text-[10px] mt-2 ' +
              (reached
                ? 'text-green-700 font-bold'
                : 'text-slate-500'),
            label
          )
        );

        steps.appendChild(step);
      });

      progress.appendChild(steps);
      card.appendChild(progress);
    }

    container.appendChild(card);
  });
}// ============================================
// SEHEMU YA 4/4: TAARIFA ZA ODA
// ============================================

function renderNotifications(orders) {
  const container =
    document.getElementById('notifications-container');

  if (!container) return;

  container.replaceChildren();

  const welcome = makeElement(
    'article',
    'bg-white rounded-2xl border border-slate-100 p-4 mb-3'
  );

  welcome.appendChild(
    makeElement('div', 'text-2xl mb-2', '🔔')
  );

  welcome.appendChild(
    makeElement(
      'h3',
      'font-bold text-slate-800 mb-1',
      'Karibu kwenye ZUNE'
    )
  );

  welcome.appendChild(
    makeElement(
      'p',
      'text-sm text-slate-500',
      currentUser
        ? 'Hapa unaweza kuona muhtasari wa oda zako.'
        : 'Ingia kwenye akaunti yako ili kuona taarifa za oda zako.'
    )
  );

  container.appendChild(welcome);

  if (!orders.length) {
    container.appendChild(
      makeElement(
        'p',
        'text-center text-sm text-slate-500 py-5',
        'Hakuna taarifa mpya za oda kwa sasa.'
      )
    );
    return;
  }

  orders.forEach(order => {
    const status = getOrderStatus(order.status);

    const item = makeElement(
      'article',
      'bg-white rounded-2xl border border-slate-100 p-4 mb-3'
    );

    const row = makeElement(
      'div',
      'flex items-start gap-3'
    );

    const icon = makeElement(
      'div',
      'w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0',
      order.status === 'completed'
        ? '✓'
        : order.status === 'cancelled'
          ? '!'
          : '📦'
    );

    const content = makeElement('div', 'min-w-0 flex-1');

    content.appendChild(
      makeElement(
        'h3',
        'font-bold text-sm text-slate-800',
        'Oda ' + String(order.id).slice(0, 8)
      )
    );

    content.appendChild(
      makeElement(
        'p',
        'text-sm text-slate-600 mt-1',
        'Hali: ' + status.label
      )
    );

    content.appendChild(
      makeElement(
        'p',
        'text-xs text-slate-400 mt-2',
        formatDate(order.created_at)
      )
    );

    row.appendChild(icon);
    row.appendChild(content);
    item.appendChild(row);
    container.appendChild(item);
  });

  const note = makeElement(
    'p',
    'text-xs text-slate-500 text-center py-3',
    'Taarifa hizi zinatokana na hali ya oda kwenye mfumo. Ujumbe wa kudumu utahitaji kuunganishwa na jedwali la notifications.'
  );

  container.appendChild(note);
}
