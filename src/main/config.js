const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE = 'config.json';

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function loadConfig() {
  const filePath = getConfigPath();
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveConfig(update) {
  const filePath = getConfigPath();
  const current = loadConfig();
  const next = { ...current, ...update };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  loadConfig,
  saveConfig,
};
