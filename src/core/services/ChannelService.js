/**
 * This service directly interacts with the window.api exposed via preload.js.
 * This is the Core Service layer for the frontend logic.
 */

class ChannelService {
    static async getPaginatedChannels(limit, offset) {
        return await window.api.getPaginatedChannels(limit, offset);
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

    static async getFavorites() {
        return await window.api.getFavorites();
    }

    static async toggleFavorite(id, is_favorite) {
        return await window.api.toggleFavorite(id, is_favorite);
    }
}

export default ChannelService;
