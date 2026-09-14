const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('legendaryDesktop', {
  initProjectSession: (options) => ipcRenderer.invoke('project:initSession', options),
  newProject: (options) => ipcRenderer.invoke('project:new', options),
  openProjectPath: (options) => ipcRenderer.invoke('project:openPath', options),
  saveProject: (options) => ipcRenderer.invoke('project:save', options),
  loadProject: () => ipcRenderer.invoke('project:load'),
  shareProject: (options) => ipcRenderer.invoke('project:share', options),
  chooseExportMode: () => ipcRenderer.invoke('export:chooseMode'),
  chooseExportFolder: () => ipcRenderer.invoke('export:chooseFolder'),
  savePng: (options) => ipcRenderer.invoke('export:savePng', options),
  openFolder: (options) => ipcRenderer.invoke('shell:openFolder', options)
});
