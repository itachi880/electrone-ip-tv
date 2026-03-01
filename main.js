const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const ChannelController = require("./backend/controllers/ChannelController");
const CheckChannelHealth = require("./backend/core/usecases/CheckChannelHealth");

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });
  mainWindow.maximize();

  // If the app was already built use the build as production else use local as development
  if (fs.existsSync(path.join(__dirname, "dist", "index.html"))) {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
    mainWindow.webContents.devToolsWebContents?.addListener(
      "devtools-opened",
      () => {
        mainWindow.webContents.closeDevTools();
      }
    );
    return;
  }

  // load react app (dev mode)
  mainWindow.loadURL("http://localhost:3000");
  mainWindow.webContents.openDevTools();
};
app.whenReady().then(() => {
  // Move CSP override here BEFORE opening any window
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,

      },
    });
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Referer Swap (HLS methodology)
    if (details.requestHeaders["from"]) {
      details.requestHeaders["Referer"] = details.requestHeaders["from"];
      delete details.requestHeaders["from"];
    }

    // User-Agent Swap (New Reliability Layer)
    if (details.requestHeaders["x-user-agent"]) {
      details.requestHeaders["User-Agent"] = details.requestHeaders["x-user-agent"];
      delete details.requestHeaders["x-user-agent"];
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Initialize controllers
  new ChannelController(ipcMain);

  // Start background health checking (every 2 minutes)
  CheckChannelHealth.startBackgroundService(120000);

  createWindow();
});

// macOS behavior
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
