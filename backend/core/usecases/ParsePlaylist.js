const Channel = require('../entities/Channel');

class ParsePlaylist {
    /**
     * Parses an M3U/M3U8 string into an array of Channel entities
     * @param {string} fileContent 
     * @returns {Channel[]}
     */
    static execute(fileContent = "") {
        const lines = fileContent.split("\n");
        const channels = [];
        let currentChannelData = null;

        for (const line of lines) {
            if (line.includes("#EXTINF")) {
                let name = line.split(",")[1];
                if (name) name = name.trim();

                // Try to extract group-title
                let playlist = null;
                const groupTitleMatch = line.match(/group-title="([^"]+)"/);
                if (groupTitleMatch) {
                    playlist = groupTitleMatch[1].trim();
                }

                currentChannelData = {
                    name: name || "Unknown Channel",
                    referer: null,
                    link: null,
                    playlist: playlist
                };
                channels.push(currentChannelData);
            } else if (line.includes("http-referrer") && currentChannelData) {
                currentChannelData.referer = line.split("http-referrer=")[1].trim();
            } else if (line.includes("http-user-agent") && currentChannelData) {
                currentChannelData.user_agent = line.split("http-user-agent=")[1].trim();
            } else if (!line.startsWith("#") && line.trim() !== "" && currentChannelData) {
                currentChannelData.link = line.trim();
            }
        }

        // Map raw data into Channel entities
        return channels.filter(c => c.link).map(
            (data) => new Channel({
                name: data.name,
                referer: data.referer,
                user_agent: data.user_agent || null,
                link: data.link,
                state: null,
                playlist: data.playlist
            })
        );
    }
}

module.exports = ParsePlaylist;
