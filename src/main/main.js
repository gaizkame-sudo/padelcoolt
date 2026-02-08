const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { loadConfig, saveConfig } = require('./config');
const { getTideStations, getTideData } = require('./services/tides');
const { getSurfSpots, getSurfReport } = require('./services/surf');
const { getNewsItems } = require('./services/news');
const { connectGmail, connectOutlook, getEmailSummaries } = require('./services/email');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0c0f12',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('config:get', () => loadConfig());
ipcMain.handle('config:save', (_event, update) => saveConfig(update));

ipcMain.handle('tides:stations', () => getTideStations());
ipcMain.handle('tides:data', (_event, stationId) => getTideData(stationId));

ipcMain.handle('surf:spots', () => getSurfSpots());
ipcMain.handle('surf:report', (_event, spotId) => getSurfReport(spotId));

ipcMain.handle('news:list', () => getNewsItems());

ipcMain.handle('email:connectGmail', () => connectGmail());
ipcMain.handle('email:connectOutlook', () => connectOutlook());
ipcMain.handle('email:list', () => getEmailSummaries());

ipcMain.handle('open:external', (_event, url) => shell.openExternal(url));
