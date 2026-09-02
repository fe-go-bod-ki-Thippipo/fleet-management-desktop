const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fleetAPI', {
  info: () => ipcRenderer.invoke('app:info'),
  dashboard: () => ipcRenderer.invoke('dashboard:summary'),
  assets: (q='') => ipcRenderer.invoke('assets:list', q),
  usage: () => ipcRenderer.invoke('usage:list'),
  createUsage: (payload) => ipcRenderer.invoke('usage:create', payload),
  updateUsageStatus: (payload) => ipcRenderer.invoke('usage:update-status', payload),
  recordReturn: (payload) => ipcRenderer.invoke('usage:return', payload),
  backup: () => ipcRenderer.invoke('backup:create')
});
