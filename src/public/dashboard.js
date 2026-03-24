const API_BASE = '/api';
let accounts = [];
let refreshInterval = 30000;
let refreshTimer = null;
let isAutoRefresh = true;

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

    const select = document.getElementById('refreshIntervalSelect');
    if (select) {
      select.value = interval.toString();
    }
  } catch (e) {
    console.error('Failed to fetch settings:', e);
  }
}

async function saveRefreshInterval(interval) {
  try {
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshInterval: interval })
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

  document.getElementById('lastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
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
      ${account.isDefault ? '<span class="default-badge">Default</span>' : ''}
      <button class="btn-delete" onclick="deleteAccount('${account.id}')" title="Delete">&times;</button>
    </div>
    <div class="card-body">
      <div class="model-name">${escapeHtml(status.modelName)}</div>
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">Usage</span>
          <span class="progress-value ${colorClass}">${pct}%</span>
        </div>
        <div class="progress-bar ${colorClass}">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="usage-details">
        <div class="detail-row">
          <span>Remaining</span>
          <span>${status.usage.remaining} / ${status.usage.total}</span>
        </div>
        <div class="detail-row">
          <span>Reset in</span>
          <span>${status.remaining.text}</span>
        </div>
        ${weeklyPct !== null ? `
        <div class="detail-row">
          <span>Weekly</span>
          <span class="weekly-badge ${weeklyColorClass}">${weeklyPct}%</span>
        </div>
        ` : ''}
        ${expiryDays !== null ? `
        <div class="detail-row expiry-row ${expiryColorClass}">
          <span>Expires</span>
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
  if (!confirm('Delete this account?')) return;
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
  await saveRefreshInterval(interval);
  setupAutoRefresh();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeModal(); });

loadDashboard();
