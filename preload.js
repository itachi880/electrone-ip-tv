const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Fetch all channels
  getChannels: () => ipcRenderer.invoke("get-channels"),

  // Fetch paginated channels
  getPaginatedChannels: (limit, offset) =>
    ipcRenderer.invoke("get-channels-paginated", { limit, offset }),

  // Playlists
  getPlaylists: () => ipcRenderer.invoke("get-playlists"),
  getChannelsByPlaylist: (playlist, limit, offset) =>
    ipcRenderer.invoke("get-channels-by-playlist", { playlist, limit, offset }),

  // Search channels
  searchForChannelByName: (query) =>
    ipcRenderer.invoke("search-channels-db", query),

  // Insert new channels 
  insertChannels: (channels) => ipcRenderer.invoke("insert-channels", channels),

  // Update and Delete channels
  updateChannel: (id, updates) => ipcRenderer.invoke("update-channel", { id, updates }),
  deleteChannel: (id) => ipcRenderer.invoke("delete-channel", id),

  // Parse an M3U8 file 
  addChannelsfile: (fileData) =>
    ipcRenderer.invoke("channel-group-parse", fileData),

  // Favorites
  getFavorites: () => ipcRenderer.invoke("get-favorites"),
  toggleFavorite: (id, is_favorite) => ipcRenderer.invoke("toggle-favorite", { id, is_favorite }),

  // Deletion
  // Clean up
  deleteDeadChannels: () => ipcRenderer.invoke("delete-dead-channels"),
  triggerChannelScan: (limit) => ipcRenderer.invoke("trigger-channel-scan", limit),
  onScanProgress: (callback) => ipcRenderer.on("scan-progress", (event, data) => callback(data)),
  removeScanProgressListener: () => ipcRenderer.removeAllListeners("scan-progress"),

  onUploadProgress: (callback) => ipcRenderer.on("upload-progress", (event, data) => callback(data)),
  removeUploadProgressListener: () => ipcRenderer.removeAllListeners("upload-progress"),

  // State sync for frontend remounts
  getScanState: () => ipcRenderer.invoke("get-scan-state"),
  getUploadState: () => ipcRenderer.invoke("get-upload-state"),
});
