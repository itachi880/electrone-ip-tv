class Channel {
    /**
     * @param {Object} params
     * @param {number} [params.id]
     * @param {string} params.name
     * @param {string} [params.referer]
     * @param {string} [params.user_agent]
     * @param {string} params.link
     * @param {string} [params.state] - Can be "OK", "NO", or undefined
     * @param {boolean} [params.is_favorite]
     * @param {string} [params.playlist]
     */
    constructor({ id, name, referer, user_agent, link, state, is_favorite = false, playlist }) {
        this.id = id;
        this.name = name;
        this.referer = referer || null;
        this.user_agent = user_agent || null;
        this.link = link;
        this.state = state || null;
        this.is_favorite = is_favorite;
        this.playlist = playlist || null;
    }
}

module.exports = Channel;
