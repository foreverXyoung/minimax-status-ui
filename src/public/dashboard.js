const API_BASE = '/api';
let accounts = [];
let refreshInterval = 30000;
let refreshTimer = null;
let isAutoRefresh = true;
let currentLang = 'zh-CN';

const i18n = {
  'zh-CN': {
    title: 'MiniMax Dashboard',
    subtitle: 'Token-Plan Monitor',
    manual: '手动',
    addAccount: '+ Add Account',
    refresh: 'Refresh',
    noAccounts: 'No accounts configured',
    noAccountsHint: 'Click "Add Account" to add your first MiniMax account',
    addNewAccount: 'Add New Account',
    accountName: 'Account Name',
    apiToken: 'API Token',
    groupId: 'Group ID',
    add: 'Add',
    cancel: 'Cancel',
    remaining: 'Remaining',
    resetIn: 'Reset in',
    weekly: 'Weekly',
    expires: 'Expires',
    usage: 'Usage',
    default: 'Default',
    deleteConfirm: 'Delete this account?',
    lastUpdated: 'Last updated'
  },
  'zh-TW': {
    title: 'MiniMax Dashboard',
    subtitle: 'Token-Plan Monitor',
    manual: '手動',
    addAccount: '+ Add Account',
    refresh: 'Refresh',
    noAccounts: 'No accounts configured',
    noAccountsHint: 'Click "Add Account" to add your first MiniMax account',
    addNewAccount: 'Add New Account',
    accountName: 'Account Name',
    apiToken: 'API Token',
    groupId: 'Group ID',
    add: 'Add',
    cancel: 'Cancel',
    remaining: 'Remaining',
    resetIn: 'Reset in',
    weekly: 'Weekly',
    expires: 'Expires',
    usage: 'Usage',
    default: 'Default',
    deleteConfirm: 'Delete this account?',
    lastUpdated: 'Last updated'
  },
  'en': {
    title: 'MiniMax Dashboard',
    subtitle: 'Token-Plan Monitor',
    manual: 'Manual',
    addAccount: '+ Add Account',
    refresh: 'Refresh',
    noAccounts: 'No accounts configured',
    noAccountsHint: 'Click "Add Account" to add your first MiniMax account',
    addNewAccount: 'Add New Account',
    accountName: 'Account Name',
    apiToken: 'API Token',
    groupId: 'Group ID',
    add: 'Add',
    cancel: 'Cancel',
    remaining: 'Remaining',
    resetIn: 'Reset in',
    weekly: 'Weekly',
    expires: 'Expires',
    usage: 'Usage',
    default: 'Default',
    deleteConfirm: 'Delete this account?',
    lastUpdated: 'Last updated'
  }
};

function t(key) {
  return i18n[currentLang]?.[key] || i18n['en'][key] || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/accounts`);
  accounts = await res.json();
}

async function fetchStatus(accountId) {
  const res = await fetch(`${API_BASE}/status/${accountId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const settings = await res.json();
    const interval = settings.refreshInterval || 30;
    refreshInterval = interval * 1000;
    isAutoRefresh = interval > 0;
    currentLang = settings.language || 'zh-CN';

    const refreshSelect = document.getElementById('refreshIntervalSelect');
    if (refreshSelect) refreshSelect.value = interval.toString();

    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = currentLang;

    applyI18n();
  } catch (e) {
    console.error('Failed to fetch settings:', e);
  }
}

async function saveSettings(settings) {
  try {
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

async function refreshAllAccounts() {
  const grid = document.getElementById('accountsGrid');
  const emptyState = document.getElementById('emptyState');

  if (accounts.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.querySelector('[data-i18n="noAccounts"]').textContent = t('noAccounts');
    emptyState.querySelector('[data-i18n="noAccountsHint"]').textContent = t('noAccountsHint');
    return;
  }

  emptyState.classList.add('hidden');

  const results = await Promise.allSettled(
    accounts.map(account => fetchStatus(account.id).then(s => ({ account, status: s, error: null })).catch(e => ({ account, status: null, error: e.message })))
  );

  grid.innerHTML = '';
  for (const result of results) {
    if (result.value.error) {
      renderErrorCard(result.value.account, result.value.error);
    } else {
      renderAccountCard(result.value.account, result.value.status);
    }
  }

  document.getElementById('lastUpdate').textContent = `${t('lastUpdated')}: ${new Date().toLocaleTimeString()}`;
}

function renderAccountCard(account, status) {
  const grid = document.getElementById('accountsGrid');
  const card = document.createElement('div');
  card.className = 'account-card';

  const pct = status.usage.percentage;
  const colorClass = pct >= 85 ? 'danger' : pct >= 60 ? 'warning' : 'normal';

  const weeklyPct = status.weekly && !status.weekly.unlimited ? status.weekly.percentage : null;
  const weeklyColorClass = weeklyPct !== null ? (weeklyPct >= 85 ? 'danger' : weeklyPct >= 60 ? 'warning' : 'normal') : '';

  const expiryDays = status.expiry ? status.expiry.daysRemaining : null;
  const expiryColorClass = expiryDays !== null ? (expiryDays <= 3 ? 'danger' : expiryDays <= 7 ? 'warning' : 'normal') : '';

  card.innerHTML = `
    <div class="card-header">
      <h3>${escapeHtml(account.name)}</h3>
      ${account.isDefault ? `<span class="default-badge">${t('default')}</span>` : ''}
      <button class="btn-delete" onclick="deleteAccount('${account.id}')" title="Delete">&times;</button>
    </div>
    <div class="card-body">
      <div class="model-name">${escapeHtml(status.modelName)}</div>
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">${t('usage')}</span>
          <span class="progress-value ${colorClass}">${pct}%</span>
        </div>
        <div class="progress-bar ${colorClass}">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="usage-details">
        <div class="detail-row">
          <span>${t('remaining')}</span>
          <span>${status.usage.remaining} / ${status.usage.total}</span>
        </div>
        <div class="detail-row">
          <span>${t('resetIn')}</span>
          <span>${status.remaining.text}</span>
        </div>
        ${weeklyPct !== null ? `
        <div class="detail-row">
          <span>${t('weekly')}</span>
          <span class="weekly-badge ${weeklyColorClass}">${weeklyPct}%</span>
        </div>
        ` : ''}
        ${expiryDays !== null ? `
        <div class="detail-row expiry-row ${expiryColorClass}">
          <span>${t('expires')}</span>
          <span>${status.expiry.text}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  grid.appendChild(card);
}

function renderErrorCard(account, error) {
  const grid = document.getElementById('accountsGrid');
  const card = document.createElement('div');
  card.className = 'account-card error';
  card.innerHTML = `
    <div class="card-header">
      <h3>${escapeHtml(account.name)}</h3>
      <button class="btn-delete" onclick="deleteAccount('${account.id}')" title="Delete">&times;</button>
    </div>
    <div class="error-message">
      <p>Failed: ${escapeHtml(error)}</p>
    </div>
  `;
  grid.appendChild(card);
}

async function deleteAccount(id) {
  if (!confirm(t('deleteConfirm'))) return;
  await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
  await loadDashboard();
}

function openModal() {
  document.getElementById('addModal').classList.remove('hidden');
  document.getElementById('accountName').focus();
}

function closeModal() {
  document.getElementById('addModal').classList.add('hidden');
  document.getElementById('addAccountForm').reset();
}

async function handleAddAccount(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('accountName').value.trim(),
    token: document.getElementById('accountToken').value.trim(),
    groupId: document.getElementById('accountGroupId').value.trim() || null
  };

  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to add account');
  }

  closeModal();
  await loadDashboard();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadDashboard() {
  await fetchSettings();
  await fetchAccounts();
  await refreshAllAccounts();

  setupAutoRefresh();
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (isAutoRefresh && refreshInterval > 0) {
    refreshTimer = setInterval(refreshAllAccounts, refreshInterval);
  }
}

// Init
document.getElementById('addAccountBtn').addEventListener('click', openModal);
document.getElementById('refreshBtn').addEventListener('click', refreshAllAccounts);
document.getElementById('addAccountForm').addEventListener('submit', handleAddAccount);
document.getElementById('refreshIntervalSelect').addEventListener('change', async (e) => {
  const interval = parseInt(e.target.value, 10);
  refreshInterval = interval * 1000;
  isAutoRefresh = interval > 0;
  await saveSettings({ refreshInterval: interval, language: currentLang });
  setupAutoRefresh();
});
document.getElementById('languageSelect').addEventListener('change', async (e) => {
  currentLang = e.target.value;
  await saveSettings({ refreshInterval: parseInt(document.getElementById('refreshIntervalSelect').value, 10), language: currentLang });
  applyI18n();
  await refreshAllAccounts();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeModal(); });

loadDashboard();
