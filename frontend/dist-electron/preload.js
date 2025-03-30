"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  //Sends a message to the Python backend via IPC, wait for confirmation
  sendToPython: (message) => electron.ipcRenderer.invoke("send-to-python", message),
  // sets up a python listener for messages
  onPythonMessage: (callback) => {
    electron.ipcRenderer.on("python-message", (_, data) => callback(data));
  },
  //Removes a previously  listner
  removePythonMessageListener: (callback) => {
    electron.ipcRenderer.removeListener("python-message", callback);
  },
  // Gets the current connection state
  getConnectionState: () => electron.ipcRenderer.invoke("get-connection-state"),
  // sets up a listener for connection state changes
  onConnectionStateChange: (callback) => {
    electron.ipcRenderer.on("connection-state-change", (_, state) => callback(state));
  },
  //Removes the connection state lisener 
  removeConnectionStateListener: (callback) => {
    electron.ipcRenderer.removeListener("connection-state-change", callback);
  },
  // Retrieves all application settings at once
  retrieveSettings: () => electron.ipcRenderer.invoke("retrieve-settings"),
  // Updates application settings
  setSettings: (settings) => electron.ipcRenderer.invoke("set-settings", settings),
  // Store operations
  getSettings: () => {
    return electron.ipcRenderer.invoke("get-settings");
  },
  saveSettings: (settings) => {
    return electron.ipcRenderer.invoke("save-settings", settings);
  },
  // Path methods
  setSolverPath: (path) => {
    return electron.ipcRenderer.invoke("set-solver-path", path);
  },
  setResultsPath: (path) => {
    return electron.ipcRenderer.invoke("set-results-path", path);
  },
  setAccuracy: (accuracy) => {
    return electron.ipcRenderer.invoke("set-accuracy", accuracy);
  },
  onAccuracyUpdated: (callback) => {
    electron.ipcRenderer.on("accuracy-updated", (_, value) => callback(value));
  },
  removeAccuracyListener: (callback) => {
    electron.ipcRenderer.removeListener("accuracy-updated", callback);
  },
  // Opens a file or directory selection dialog
  selectPath: (options) => electron.ipcRenderer.invoke("select-path", options),
  // Error dialog operations
  showError: (message) => electron.ipcRenderer.invoke("show-error", message)
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
