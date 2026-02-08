const { loadConfig } = require('../config');

const SPOTS = [
  { id: 'burleigh', label: 'Burleigh Heads', lat: -28.1066, lng: 153.4557 },
  { id: 'noosa', label: 'Noosa Heads', lat: -26.3881, lng: 153.0925 },
  { id: 'snapper', label: 'Snapper Rocks', lat: -28.1695, lng: 153.5462 },
];

function getSurfSpots() {
  return SPOTS.map(({ id, label }) => ({ id, label }));
}

function pickUnits(units) {
  if (units === 'uk') return { height: 'ft', speed: 'mph' };
  return { height: 'm', speed: 'm/s' };
}

function toFloat(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseSwellcloudRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      time: row.time ? new Date(row.time) : null,
      waveHeight: toFloat(row.hs ?? row.wave_height),
      wavePeriod: toFloat(row.tp ?? row.wave_period),
      waveDirection: toFloat(row.dp ?? row.wave_direction),
      swellHeight: toFloat(row.ss_hs ?? row.swell_height),
      swellPeriod: toFloat(row.ss_tp ?? row.swell_period),
      swellDirection: toFloat(row.ss_dp ?? row.swell_direction),
      windSpeed: toFloat(row.wndspd ?? row.wind_speed),
      windDirection: toFloat(row.wnddir ?? row.wind_direction),
      waterTemperature: toFloat(row.wtemp ?? row.water_temperature),
    }))
    .filter((item) => item.time && !Number.isNaN(item.time.getTime()));
}

async function getStormglassReport(spot, apiKey) {
  const params = [
    'waveHeight',
    'wavePeriod',
    'waveDirection',
    'swellHeight',
    'swellPeriod',
    'swellDirection',
    'windSpeed',
    'windDirection',
    'waterTemperature',
  ].join(',');

  const url = new URL('https://api.stormglass.io/v2/weather/point');
  url.searchParams.set('lat', spot.lat);
  url.searchParams.set('lng', spot.lng);
  url.searchParams.set('params', params);
  url.searchParams.set('source', 'sg');

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      return { status: 'error', message: `Stormglass error: ${res.status}` };
    }

    const json = await res.json();
    const hours = json?.hours || [];

    if (!hours.length) {
      return { status: 'error', message: 'No surf data returned.' };
    }

    const now = new Date();
    const next = hours
      .map((hour) => ({
        time: new Date(hour.time),
        waveHeight: hour.waveHeight?.sg ?? null,
        wavePeriod: hour.wavePeriod?.sg ?? null,
        waveDirection: hour.waveDirection?.sg ?? null,
        swellHeight: hour.swellHeight?.sg ?? null,
        swellPeriod: hour.swellPeriod?.sg ?? null,
        swellDirection: hour.swellDirection?.sg ?? null,
        windSpeed: hour.windSpeed?.sg ?? null,
        windDirection: hour.windDirection?.sg ?? null,
        waterTemperature: hour.waterTemperature?.sg ?? null,
      }))
      .filter((item) => item.time >= now)
      .slice(0, 8);

    const current = next[0];

    return {
      status: 'ok',
      spot: spot.label,
      current,
      forecast: next,
      provider: 'Stormglass',
      units: pickUnits('si'),
      note: 'Stormglass marine model (source: sg).',
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function getSwellcloudReport(spot, apiKey, model, units) {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const url = new URL('https://api.swellcloud.net/v1/point');
  url.searchParams.set('lat', spot.lat);
  url.searchParams.set('lon', spot.lng);
  url.searchParams.set('vars', 'hs,tp,dp,ss_hs,ss_tp,ss_dp,wndspd,wnddir,wtemp');
  url.searchParams.set('model', model || 'gfs');
  url.searchParams.set('units', units || 'si');
  url.searchParams.set('start', now.toISOString());
  url.searchParams.set('end', end.toISOString());

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-API-Key': apiKey },
    });

    if (!res.ok) {
      return { status: 'error', message: `Swellcloud error: ${res.status}` };
    }

    const json = await res.json();
    const rows =
      json?.data ||
      json?.hours ||
      json?.points ||
      json?.forecast ||
      json?.result?.data ||
      [];

    const parsed = parseSwellcloudRows(rows);
    if (!parsed.length) {
      return { status: 'error', message: 'No surf data returned.' };
    }

    const upcoming = parsed.filter((item) => item.time >= now).slice(0, 8);
    const current = upcoming[0];

    return {
      status: 'ok',
      spot: spot.label,
      current,
      forecast: upcoming,
      provider: 'Swellcloud',
      units: pickUnits(units),
      note: 'Swellcloud marine forecast.',
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function getSurfReport(spotId) {
  const spot = SPOTS.find((s) => s.id === spotId) || SPOTS[0];
  const config = loadConfig();
  const provider = config?.surfProvider || 'stormglass';

  if (provider === 'swellcloud') {
    const apiKey = config?.swellcloudApiKey;
    if (!apiKey) {
      return {
        status: 'missing_key',
        message: 'Add a Swellcloud API key to enable surf data.',
        provider: 'Swellcloud',
      };
    }
    return getSwellcloudReport(spot, apiKey, config?.swellcloudModel, config?.swellcloudUnits);
  }

  const apiKey = config?.stormglassApiKey;
  if (!apiKey) {
    return {
      status: 'missing_key',
      message: 'Add a Stormglass API key to enable surf data.',
      provider: 'Stormglass',
    };
  }
  return getStormglassReport(spot, apiKey);
}

module.exports = {
  getSurfSpots,
  getSurfReport,
};
