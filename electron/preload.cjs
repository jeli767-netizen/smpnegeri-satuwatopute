const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appRuntime', {
  isElectron: true,
  platform: process.platform
});
