const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('newenkey', {
  loadShortcuts: () => ipcRenderer.invoke('shortcuts:load'),
  saveShortcuts: (d) => ipcRenderer.invoke('shortcuts:save', d),
  getPlatform: () => ipcRenderer.invoke('platform:get'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  setAutoStart: (enabled) => ipcRenderer.invoke('settings:setAutoStart', enabled),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  exportAHK: (s) => ipcRenderer.invoke('export:ahk', s),
  exportJSON: (s) => ipcRenderer.invoke('export:json', s),
  importJSON: () => ipcRenderer.invoke('import:json'),
  onExpansionFired: (cb) => ipcRenderer.on('expansion:fired', (_, d) => cb(d)),
});
