/**
 * This service directly interacts with the window.api exposed via preload.js.
 * This is the Core Service layer for the frontend logic.
 */

class ChannelService {
    static async getPaginatedChannels(limit, offset) {
        return await window.api.getPaginatedChannels(limit, offset);
    }

    static async getPlaylists() {
        return await window.api.getPlaylists();
    }

    static async createPlaylist(name) {
        return await window.api.createPlaylist(name);
    }

    static async deletePlaylist(name) {
        return await window.api.deletePlaylist(name);
    }

    static async updatePlaylist(oldName, newName) {
        return await window.api.updatePlaylist(oldName, newName);
    }

    static async getChannelsByPlaylist(playlist, limit, offset) {
        return await window.api.getChannelsByPlaylist(playlist, limit, offset);
    }

    static async searchChannels(query) {
        return await window.api.searchForChannelByName(query);
    }

    static async uploadChannelsFile(fileContent) {
        const channels = await window.api.addChannelsfile(fileContent);
        if (channels && channels.length > 0) {
            await window.api.insertChannels(channels);
            return channels;
        }
        return [];
    }

    static async updateChannel(id, updates) {
        return await window.api.updateChannel(id, updates);
    }

    static async deleteChannel(id) {
        return await window.api.deleteChannel(id);
    }

    static async getFavorites() {
        return await window.api.getFavorites();
    }

    static async toggleFavorite(id, is_favorite) {
        return await window.api.toggleFavorite(id, is_favorite);
    }
}

export default ChannelService;
