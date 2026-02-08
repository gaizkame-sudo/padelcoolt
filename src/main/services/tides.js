const Papa = require('papaparse');

const CKAN_BASE = 'https://www.data.qld.gov.au/api/3/action';

const STATIONS = [
  {
    id: 'southport',
    label: 'Southport (Gold Coast Seaway)',
    dataset: 'southport-tide-gauge-predicted-interval-data',
  },
  {
    id: 'brisbane-bar',
    label: 'Brisbane Bar',
    dataset: 'brisbane-bar-tide-gauge-predicted-interval-data',
  },
  {
    id: 'mooloolaba',
    label: 'Mooloolaba',
    dataset: 'mooloolaba-tide-gauge-predicted-interval-data',
  },
];

const csvCache = new Map();

function getTideStations() {
  return STATIONS.map(({ id, label }) => ({ id, label }));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV request failed: ${res.status}`);
  return res.text();
}

function detectColumns(fields) {
  const lower = fields.map((f) => f.toLowerCase());

  const dateIndex = lower.findIndex((f) => f.includes('date'));
  const timeIndex = lower.findIndex((f) => f.includes('time'));
  const datetimeIndex = lower.findIndex((f) => f.includes('date') && f.includes('time'));
  const heightIndex = lower.findIndex((f) => f.includes('height') || f.includes('level') || f.includes('value'));

  return {
    dateIndex,
    timeIndex,
    datetimeIndex,
    heightIndex,
  };
}

function parseTimestamp(row, columns) {
  const { dateIndex, timeIndex, datetimeIndex } = columns;
  let raw;
  if (datetimeIndex !== -1) {
    raw = row[datetimeIndex];
  } else if (dateIndex !== -1 && timeIndex !== -1) {
    raw = `${row[dateIndex]} ${row[timeIndex]}`;
  } else if (dateIndex !== -1) {
    raw = row[dateIndex];
  } else {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseHeight(row, columns) {
  const { heightIndex } = columns;
  if (heightIndex === -1) return null;
  const value = parseFloat(String(row[heightIndex]).replace(',', '.'));
  if (Number.isNaN(value)) return null;
  return value;
}

function findLocalExtrema(points) {
  const highs = [];
  const lows = [];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (curr.height >= prev.height && curr.height >= next.height) {
      highs.push(curr);
    }

    if (curr.height <= prev.height && curr.height <= next.height) {
      lows.push(curr);
    }
  }

  return { highs, lows };
}

async function resolveResourceUrl(datasetId) {
  const year = new Date().getFullYear();
  const cacheKey = `${datasetId}-${year}`;
  if (csvCache.has(cacheKey)) return csvCache.get(cacheKey);

  const pkg = await fetchJson(`${CKAN_BASE}/package_show?id=${datasetId}`);
  const resources = pkg?.result?.resources || [];

  const resource = resources.find((res) => {
    const name = String(res.name || '').toLowerCase();
    return name.includes(String(year)) && name.includes('api') && name.includes('csv');
  }) || resources.find((res) => String(res.format || '').toLowerCase() === 'csv');

  if (!resource || !resource.url) throw new Error('CSV resource not found');

  csvCache.set(cacheKey, resource.url);
  return resource.url;
}

async function getTideData(stationId) {
  const station = STATIONS.find((s) => s.id === stationId) || STATIONS[0];
  if (!station) return { status: 'error', message: 'Station not configured.' };

  try {
    const csvUrl = await resolveResourceUrl(station.dataset);
    const rawCsv = await fetchCsv(csvUrl);
    const parsed = Papa.parse(rawCsv, { header: true, skipEmptyLines: true });

    if (parsed.errors?.length) {
      throw new Error(parsed.errors[0].message);
    }

    const fields = parsed.meta?.fields || [];
    const columns = detectColumns(fields);

    if (columns.heightIndex === -1 || (columns.datetimeIndex === -1 && (columns.dateIndex === -1 || columns.timeIndex === -1))) {
      return {
        status: 'error',
        message: 'Could not detect date/time or height columns.',
      };
    }

    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const points = parsed.data
      .map((row) => {
        const time = parseTimestamp(row, columns);
        const height = parseHeight(row, columns);
        if (!time || height === null) return null;
        return { time, height };
      })
      .filter(Boolean)
      .filter((point) => point.time >= now && point.time <= end)
      .sort((a, b) => a.time - b.time);

    if (!points.length) {
      return { status: 'error', message: 'No tide data available for the next 24 hours.' };
    }

    const { highs, lows } = findLocalExtrema(points);

    const nextHigh = highs.find((item) => item.time >= now) || null;
    const nextLow = lows.find((item) => item.time >= now) || null;

    const current = points[0];

    return {
      status: 'ok',
      station: station.label,
      current,
      nextHigh,
      nextLow,
      points: points.slice(0, 18),
      note: 'Tide times are parsed as provided by the data source.',
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = {
  getTideStations,
  getTideData,
};
