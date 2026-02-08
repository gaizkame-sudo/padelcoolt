const $ = (selector) => document.querySelector(selector);

const clock = $('#clock');
const tideSelect = $('#tide-station');
const surfSelect = $('#surf-spot');
const tidesContent = $('#tides-content');
const surfContent = $('#surf-content');
const emailContent = $('#email-content');
const newsContent = $('#news-content');
const surfProviderTag = $('#surf-provider');

const settingsCard = $('#settings-card');
const openSettingsBtn = $('#open-settings');
const closeSettingsBtn = $('#close-settings');

const stormglassKeyInput = $('#stormglass-key');
const surfProviderSelect = $('#surf-provider-select');
const swellcloudKeyInput = $('#swellcloud-key');
const swellcloudModelSelect = $('#swellcloud-model');
const swellcloudUnitsSelect = $('#swellcloud-units');
const gmailIdInput = $('#gmail-client-id');
const gmailSecretInput = $('#gmail-client-secret');
const outlookIdInput = $('#outlook-client-id');
const outlookTenantInput = $('#outlook-tenant-id');

const saveStormglassBtn = $('#save-stormglass');
const saveEmailBtn = $('#save-email');
const connectGmailBtn = $('#connect-gmail');
const connectOutlookBtn = $('#connect-outlook');

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: 'short',
  timeZone: 'Australia/Brisbane',
});

function formatTime(date) {
  return timeFormatter.format(date);
}

function setClock() {
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Brisbane',
  }).format(now);
}

function updateProviderTag() {
  surfProviderTag.textContent = surfProviderSelect.value === 'swellcloud' ? 'Swellcloud' : 'Stormglass';
}

async function loadConfig() {
  const config = await window.dashboard.getConfig();
  stormglassKeyInput.value = config.stormglassApiKey || '';
  surfProviderSelect.value = config.surfProvider || 'stormglass';
  swellcloudKeyInput.value = config.swellcloudApiKey || '';
  swellcloudModelSelect.value = config.swellcloudModel || 'gfs';
  swellcloudUnitsSelect.value = config.swellcloudUnits || 'si';
  gmailIdInput.value = config.gmailClientId || '';
  gmailSecretInput.value = config.gmailClientSecret || '';
  outlookIdInput.value = config.outlookClientId || '';
  outlookTenantInput.value = config.outlookTenantId || '';

  updateProviderTag();
}

function renderMetric(label, value, suffix = '') {
  return `
    <div class="metric">
      <strong>${value}</strong>
      <span>${label}${suffix}</span>
    </div>
  `;
}

async function loadTides() {
  const stationId = tideSelect.value;
  tidesContent.innerHTML = '<p class="muted">Loading tide data...</p>';
  const data = await window.dashboard.getTideData(stationId);

  if (data.status !== 'ok') {
    tidesContent.innerHTML = `<p class="muted">${data.message}</p>`;
    return;
  }

  const current = data.current;
  const nextHigh = data.nextHigh;
  const nextLow = data.nextLow;

  tidesContent.innerHTML = `
    ${renderMetric('Current height (m)', current.height.toFixed(2))}
    <div class="list">
      <div class="list-item">
        <div>
          <div class="muted">Next high</div>
          <div>${nextHigh ? formatTime(new Date(nextHigh.time)) : 'Not available'}</div>
        </div>
        <div>${nextHigh ? `${nextHigh.height.toFixed(2)} m` : '--'}</div>
      </div>
      <div class="list-item">
        <div>
          <div class="muted">Next low</div>
          <div>${nextLow ? formatTime(new Date(nextLow.time)) : 'Not available'}</div>
        </div>
        <div>${nextLow ? `${nextLow.height.toFixed(2)} m` : '--'}</div>
      </div>
    </div>
    <p class="muted">${data.note}</p>
  `;
}

async function loadSurf() {
  const spotId = surfSelect.value;
  surfContent.innerHTML = '<p class="muted">Loading surf report...</p>';
  const data = await window.dashboard.getSurfReport(spotId);

  if (data.provider) {
    surfProviderTag.textContent = data.provider;
  }

  if (data.status === 'missing_key') {
    surfContent.innerHTML = `
      <p class="muted">${data.message}</p>
      <button class="primary" id="open-settings-inline">Open Settings</button>
    `;

    $('#open-settings-inline').addEventListener('click', () => {
      settingsCard.classList.remove('hidden');
      settingsCard.scrollIntoView({ behavior: 'smooth' });
    });
    return;
  }

  if (data.status !== 'ok') {
    surfContent.innerHTML = `<p class="muted">${data.message}</p>`;
    return;
  }

  const current = data.current;
  const units = data.units || { height: 'm', speed: 'm/s' };
  const heightUnit = units.height || 'm';
  const speedUnit = units.speed || 'm/s';

  surfProviderTag.textContent = data.provider || 'Surf';

  surfContent.innerHTML = `
    ${renderMetric(`Wave height (${heightUnit})`, current.waveHeight?.toFixed(2) ?? '--')}
    <div class="list">
      <div class="list-item">
        <div>
          <div class="muted">Period</div>
          <div>${current.wavePeriod ? `${current.wavePeriod.toFixed(1)} s` : '--'}</div>
        </div>
        <div>${current.swellHeight ? `${current.swellHeight.toFixed(2)} ${heightUnit} swell` : '--'}</div>
      </div>
      <div class="list-item">
        <div>
          <div class="muted">Wind</div>
          <div>${current.windSpeed ? `${current.windSpeed.toFixed(1)} ${speedUnit}` : '--'}</div>
        </div>
        <div>${current.windDirection ? `${Math.round(current.windDirection)}°` : '--'}</div>
      </div>
      <div class="list-item">
        <div>
          <div class="muted">Water temp</div>
          <div>${current.waterTemperature ? `${current.waterTemperature.toFixed(1)}°C` : '--'}</div>
        </div>
        <div>${current.swellPeriod ? `${current.swellPeriod.toFixed(1)} s swell` : '--'}</div>
      </div>
    </div>
    <p class="muted">${data.note}</p>
  `;
}

async function loadNews() {
  newsContent.innerHTML = '<p class="muted">Loading news...</p>';
  const data = await window.dashboard.getNewsItems();

  if (data.status !== 'ok') {
    newsContent.innerHTML = `<p class="muted">${data.message}</p>`;
    return;
  }

  newsContent.innerHTML = `
    <div class="list">
      ${data.items
        .map(
          (item) => `
            <div class="list-item">
              <div>
                <a href="#" data-link="${item.link}">${item.title}</a>
                <div class="muted">${item.source}</div>
              </div>
              <div class="muted">${item.pubDate ? formatTime(new Date(item.pubDate)) : ''}</div>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  document.querySelectorAll('[data-link]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      window.dashboard.openExternal(el.dataset.link);
    });
  });
}

async function loadEmail() {
  emailContent.innerHTML = '<p class="muted">Checking email connections...</p>';
  const data = await window.dashboard.getEmailSummaries();

  if (data.status !== 'ok') {
    emailContent.innerHTML = `
      <p class="muted">${data.message}</p>
      <div class="list">
        <button class="ghost" id="gmail-connect-inline">Open Google Console</button>
        <button class="ghost" id="outlook-connect-inline">Open Azure Portal</button>
      </div>
    `;

    $('#gmail-connect-inline').addEventListener('click', () => window.dashboard.connectGmail());
    $('#outlook-connect-inline').addEventListener('click', () => window.dashboard.connectOutlook());
    return;
  }

  emailContent.innerHTML = '<p class="muted">Emails loaded.</p>';
}

async function boot() {
  setClock();
  setInterval(setClock, 60 * 1000);

  const stations = await window.dashboard.getTideStations();
  tideSelect.innerHTML = stations
    .map((station) => `<option value="${station.id}">${station.label}</option>`)
    .join('');

  const spots = await window.dashboard.getSurfSpots();
  surfSelect.innerHTML = spots
    .map((spot) => `<option value="${spot.id}">${spot.label}</option>`)
    .join('');

  await loadConfig();

  tideSelect.addEventListener('change', loadTides);
  surfSelect.addEventListener('change', loadSurf);
  surfProviderSelect.addEventListener('change', updateProviderTag);

  openSettingsBtn.addEventListener('click', () => settingsCard.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => settingsCard.classList.add('hidden'));

  saveStormglassBtn.addEventListener('click', async () => {
    await window.dashboard.saveConfig({
      stormglassApiKey: stormglassKeyInput.value.trim(),
      surfProvider: surfProviderSelect.value,
      swellcloudApiKey: swellcloudKeyInput.value.trim(),
      swellcloudModel: swellcloudModelSelect.value,
      swellcloudUnits: swellcloudUnitsSelect.value,
    });
    await loadSurf();
  });

  saveEmailBtn.addEventListener('click', async () => {
    await window.dashboard.saveConfig({
      gmailClientId: gmailIdInput.value.trim(),
      gmailClientSecret: gmailSecretInput.value.trim(),
      outlookClientId: outlookIdInput.value.trim(),
      outlookTenantId: outlookTenantInput.value.trim(),
    });
    await loadEmail();
  });

  connectGmailBtn.addEventListener('click', () => window.dashboard.connectGmail());
  connectOutlookBtn.addEventListener('click', () => window.dashboard.connectOutlook());

  await Promise.all([loadTides(), loadSurf(), loadNews(), loadEmail()]);
}

boot();
