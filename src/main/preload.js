const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboard', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (update) => ipcRenderer.invoke('config:save', update),
  getTideStations: () => ipcRenderer.invoke('tides:stations'),
  getTideData: (stationId) => ipcRenderer.invoke('tides:data', stationId),
  getSurfSpots: () => ipcRenderer.invoke('surf:spots'),
  getSurfReport: (spotId) => ipcRenderer.invoke('surf:report', spotId),
  getNewsItems: () => ipcRenderer.invoke('news:list'),
  connectGmail: () => ipcRenderer.invoke('email:connectGmail'),
  connectOutlook: () => ipcRenderer.invoke('email:connectOutlook'),
  getEmailSummaries: () => ipcRenderer.invoke('email:list'),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
});
