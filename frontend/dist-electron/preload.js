"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // File operations
  selectSolverPath: () => electron.ipcRenderer.invoke("select-solver-path"),
  getSolverPath: () => electron.ipcRenderer.invoke("get-solver-path"),
  selectFile: (options) => electron.ipcRenderer.invoke("select-file", options),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  // Solver operations
  runSolverCommand: (params) => electron.ipcRenderer.invoke("run-solver-command", params),
  // Store operations
  saveFolderPath: (params) => electron.ipcRenderer.invoke("save-folder-path", params),
  getFolderPath: (params) => electron.ipcRenderer.invoke("get-folder-path", params),
  // Event listeners
  onSolverOutput: (callback) => {
    electron.ipcRenderer.on("solver-output", (_event, data) => callback(data));
  },
  onSolverError: (callback) => {
    electron.ipcRenderer.on("solver-error", (_event, data) => callback(data));
  }
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
