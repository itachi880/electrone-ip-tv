const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Fetch all channels
  getChannels: () => ipcRenderer.invoke("get-channels"),

  // Fetch paginated channels
  getPaginatedChannels: (limit, offset) =>
    ipcRenderer.invoke("get-channels-paginated", { limit, offset }),

  // Search channels
  searchForChannelByName: (query) =>
    ipcRenderer.invoke("search-channels-db", query),

  // Insert new channels 
  insertChannels: (channels) => ipcRenderer.invoke("insert-channels", channels),

  // Parse an M3U8 file 
  addChannelsfile: (fileData) =>
    ipcRenderer.invoke("channel-group-parse", fileData),

  // Favorites
  getFavorites: () => ipcRenderer.invoke("get-favorites"),
  toggleFavorite: (id, is_favorite) => ipcRenderer.invoke("toggle-favorite", { id, is_favorite }),

  // Deletion
  // Clean up
  deleteDeadChannels: () => ipcRenderer.invoke("delete-dead-channels"),
  triggerChannelScan: () => ipcRenderer.invoke("trigger-channel-scan"),
});
