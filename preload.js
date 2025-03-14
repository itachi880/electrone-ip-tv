const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Fetch all channels (not used anymore since we paginate)
  getChannels: () => ipcRenderer.invoke("get-channels"),

  // Fetch paginated channels
  getPaginatedChannels: (limit, offset) =>
    ipcRenderer.invoke("get-channels-paginated", { limit, offset }),

  // Search channels (first search locally, then fallback to DB)
  searchForChannelByName: (query) =>
    ipcRenderer.invoke("search-channels-db", query),

  // Insert new channels into the database
  insertChannels: (channels) => ipcRenderer.invoke("insert-channels", channels),

  // Parse an M3U8 file into channels
  addChannelsfile: (fileData) =>
    ipcRenderer.invoke("channel-group-parse", fileData),
});
