"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // File operations
  selectSolverPath: () => electron.ipcRenderer.invoke("select-solver-path"),
  selectFile: (options) => electron.ipcRenderer.invoke("select-file", options),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  // Store operations
  saveFolderPath: (params) => electron.ipcRenderer.invoke("save-folder-path", params),
  getFolderPath: (params) => electron.ipcRenderer.invoke("get-folder-path", params),
  getSolverPath: () => electron.ipcRenderer.invoke("get-solver-path"),
  // Python bridge operations
  sendSolverPath: (path) => electron.ipcRenderer.send("send-solver-path", path)
});
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element)
      element.innerText = text;
  };
  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency] || "unknown");
  }
});
