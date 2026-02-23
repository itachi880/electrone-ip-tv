class Channel {
    /**
     * @param {Object} params
     * @param {number} [params.id]
     * @param {string} params.name
     * @param {string} [params.referer]
     * @param {string} params.link
     * @param {string} [params.state] - Can be "OK", "NO", or undefined
     * @param {boolean} [params.is_favorite]
     */
    constructor({ id, name, referer, link, state, is_favorite = false }) {
        this.id = id;
        this.name = name;
        this.referer = referer || null;
        this.link = link;
        this.state = state || null;
        this.is_favorite = is_favorite;
    }
}

module.exports = Channel;
