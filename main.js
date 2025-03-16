const { app, BrowserWindow, session, ipcMain } = require("electron");

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const createWindow = async () => {
  // Create the browser window.
  await createTables();
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      webSecurity: false, // ❌ Disables CORS restrictions (only for dev!)
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.maximize();
  //if the app was alredy build use the build as production else use local as developement
  if (fs.existsSync(path.join(__dirname, "index.html"))) {
    mainWindow.loadFile(path.join(__dirname, "index.html"));
    mainWindow.webContents.devToolsWebContents.addListener(
      "devtools-opened",
      () => {
        mainWindow.webContents.closeDevTools();
      }
    );
    return;
  }
  console.log(path.join(__dirname, "index.html"));
  // load react app !dev
  mainWindow.loadURL("http://localhost:3000");
  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Wait until Electron is ready
app.whenReady().then(() => {
  // 🔥 Move CSP override here BEFORE opening any window
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; media-src * blob:;",
        ],
      },
    });
  });
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["Referer"] = details.requestHeaders["from"];
    delete details.requestHeaders["from"];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  createWindow();
});

// macOS behavior
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    db.close(() => {
      app.quit();
    });
  }
});

// Define database path
const dbPath = path.join(__dirname, "database.db");

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
  console.log("Database file not found. Creating a new one...");
  fs.writeFileSync(dbPath, ""); // Create empty file
}

// Open the database
const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database:", dbPath);
  }
});

// Function to create tables just in case;
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      referer TEXT,
      link TEXT NOT NULL UNIQUE,
      state TEXT 
    )`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

// Helper function to wrap database queries in Promises
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};
const allQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};
// ✅ Insert channels into the database
const insertChannels = async (channels) => {
  for (const channel of channels) {
    try {
      await runQuery(
        `INSERT INTO channels (name, referer, link, state) VALUES (?, ?, ?, ?)`,
        [channel.name, channel.referer || null, channel.link, channel.state]
      );
    } catch (error) {
      console.error("Error inserting channels:", error.message);
      continue;
    }
  }
};
// ✅ Fetch all channels
const getAllChannels = async () => {
  try {
    return await allQuery(`SELECT * FROM channels`);
  } catch (error) {
    console.error("Error fetching channels:", error.message);

    return;
  }
};
const getChannelsPaginated = async (limit, offset) => {
  console.log("paginated result");
  try {
    return await allQuery(`SELECT * FROM channels LIMIT ? OFFSET ?`, [
      limit,
      offset,
    ]);
  } catch (error) {
    console.error("Error fetching paginated channels:", error.message);
    return [];
  }
};

const searchChannelsByName = async (query) => {
  try {
    return await allQuery(`SELECT * FROM channels WHERE LOWER(name) LIKE ?`, [
      `%${query.toLowerCase()}%`,
    ]);
  } catch (error) {
    console.error("Error searching channels:", error.message);
    return [];
  }
};

// Listen for search request from renderer
ipcMain.handle("search-channels-db", async (event, query) => {
  return await searchChannelsByName(query);
});
// Listen for paginated fetch request from renderer
ipcMain.handle("get-channels-paginated", async (event, { limit, offset }) => {
  return await getChannelsPaginated(limit, offset);
});
// Listen for fetch request from renderer
ipcMain.handle("get-channels", async () => {
  return await getAllChannels();
});
// Listen for insert request from renderer
ipcMain.handle("insert-channels", async (event, channels) => {
  await insertChannels(channels);
  return { success: true };
});
ipcMain.handle("channel-group-parse", (event, file) => {
  return m3u8Parser(file);
});
function m3u8Parser(file = "") {
  const lines = file.split("\n");
  const channels = [];
  let currentChannel = null;

  for (const line of lines) {
    if (line.includes("#EXTINF")) {
      currentChannel = {
        name: line.split(",")[1],
        referer: null,
        link: null,
        quality: {},
      };
      channels.push(currentChannel);
    } else if (line.includes("http-referrer") && currentChannel) {
      currentChannel.referer = line.split("http-referrer=")[1];
    } else if (!line.startsWith("#") && currentChannel) {
      currentChannel.link = line;
    }
  }
  return channels;
}
