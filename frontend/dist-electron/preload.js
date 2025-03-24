"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // File operations
  openFile: () => electron.ipcRenderer.invoke("open-file"),
  saveFile: (content) => electron.ipcRenderer.invoke("save-file", content),
  selectSolverPath: () => electron.ipcRenderer.invoke("select-solver-path"),
  getSolverPath: () => electron.ipcRenderer.invoke("get-solver-path"),
  selectFile: (options) => electron.ipcRenderer.invoke("select-file", options),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  // Python bridge operations
  initSolver: (solverPath) => electron.ipcRenderer.invoke("init-solver", solverPath),
  executeCommand: (solverPath, command, args) => electron.ipcRenderer.invoke("execute-command", solverPath, command, args),
  getCommands: () => electron.ipcRenderer.invoke("get-commands"),
  sendInputToPython: (input) => electron.ipcRenderer.invoke("send-input-to-python", input),
  // Store operations
  saveFolderPath: (params) => electron.ipcRenderer.invoke("save-folder-path", params),
  getFolderPath: (params) => electron.ipcRenderer.invoke("get-folder-path", params),
  // Python event listeners
  onPythonOutput: (callback) => {
    const listener = (_, output) => callback(output);
    electron.ipcRenderer.on("python:output", listener);
    return () => electron.ipcRenderer.removeListener("python:output", listener);
  },
  onPythonError: (callback) => {
    const listener = (_, error) => callback(error);
    electron.ipcRenderer.on("python:error", listener);
    return () => electron.ipcRenderer.removeListener("python:error", listener);
  },
  onPythonStepUpdate: (callback) => {
    const listener = (_, step) => callback(step);
    electron.ipcRenderer.on("python:step-update", listener);
    return () => electron.ipcRenderer.removeListener("python:step-update", listener);
  },
  onPythonRequestInput: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("python:request-input", listener);
    return () => electron.ipcRenderer.removeListener("python:request-input", listener);
  },
  onPythonInitComplete: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("python:init-complete", listener);
    return () => electron.ipcRenderer.removeListener("python:init-complete", listener);
  },
  onPythonCommandComplete: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("python:command-complete", listener);
    return () => electron.ipcRenderer.removeListener("python:command-complete", listener);
  },
  onPythonCommands: (callback) => {
    const listener = (_, commands) => callback(commands);
    electron.ipcRenderer.on("python:commands", listener);
    return () => electron.ipcRenderer.removeListener("python:commands", listener);
  },
  onPythonInputReceived: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("python:input-received", listener);
    return () => electron.ipcRenderer.removeListener("python:input-received", listener);
  },
  // Menu event listeners
  onMenuSelectSolver: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("menu:select-solver", listener);
    return () => electron.ipcRenderer.removeListener("menu:select-solver", listener);
  },
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
