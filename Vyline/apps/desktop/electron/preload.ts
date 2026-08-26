import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("vylineDesktop", {
  platform: process.platform,
  version: process.versions.app,
  updater: {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
  },
});
