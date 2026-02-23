const repository = require('../infrastructure/database/ChannelRepository');
const ParsePlaylist = require('../core/usecases/ParsePlaylist');
const CheckChannelHealth = require('../core/usecases/CheckChannelHealth');

class ChannelController {
    constructor(ipcMain) {
        this.ipcMain = ipcMain;
        this.registerHandlers();
    }

    registerHandlers() {
        this.ipcMain.handle("search-channels-db", async (event, query) => {
            return await repository.searchByName(query);
        });

        this.ipcMain.handle("get-channels-paginated", async (event, { limit, offset }) => {
            return await repository.getChannelsPaginated(limit, offset);
        });

        this.ipcMain.handle("get-channels", async () => {
            return await repository.getAllChannels();
        });

        this.ipcMain.handle("insert-channels", async (event, channels) => {
            await repository.insertChannels(channels);
            return { success: true };
        });

        this.ipcMain.handle("channel-group-parse", (event, fileContent) => {
            return ParsePlaylist.execute(fileContent);
        });

        // New handlers for favorites
        this.ipcMain.handle("get-favorites", async () => {
            return await repository.getFavorites();
        });

        this.ipcMain.handle("toggle-favorite", async (event, { id, is_favorite }) => {
            return await repository.toggleFavorite(id, is_favorite);
        });

        // New handlers for health / deletion
        this.ipcMain.handle("delete-dead-channels", async () => {
            return await repository.deleteDeadChannels();
        });

        this.ipcMain.handle("trigger-channel-scan", async () => {
            // Trigger the execution asynchronously so we don't block the frontend
            setTimeout(() => {
                CheckChannelHealth.executeFullScan();
            }, 100);
            return true;
        });
    }
}

module.exports = ChannelController;
