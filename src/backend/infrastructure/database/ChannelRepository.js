const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Channel = require('../../core/entities/Channel');

class ChannelRepository {
    constructor() {
        const dbPath = path.join(__dirname, '..', '..', '..', '..', 'database.db');

        if (!fs.existsSync(dbPath)) {
            console.log("Database file not found. Creating a new one...");
            fs.writeFileSync(dbPath, "");
        }

        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("Error opening database:", err.message);
            } else {
                console.log("Connected to SQLite database:", dbPath);
                this.initTables();
            }
        });
    }

    initTables() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    referer TEXT,
                    user_agent TEXT,
                    link TEXT NOT NULL UNIQUE,
                    state TEXT,
                    is_favorite BOOLEAN DEFAULT 0,
                    playlist TEXT
                )`, (err) => {
                if (err) return reject(err);

                // Migrations for channels
                this.db.run(`ALTER TABLE channels ADD COLUMN is_favorite BOOLEAN DEFAULT 0`, (err) => { });
                this.db.run(`ALTER TABLE channels ADD COLUMN user_agent TEXT`, (err) => { });
                this.db.run(`ALTER TABLE channels ADD COLUMN playlist TEXT`, (err) => { });

                // Create dedicated playlists table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS playlists (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL
                    )`, (err) => {
                    if (err) return reject(err);

                    // Migrate existing distinct playlists from channels into playlists
                    this.db.run(`INSERT OR IGNORE INTO playlists (name) SELECT DISTINCT playlist FROM channels WHERE playlist IS NOT NULL AND playlist != ''`, (err) => {
                        resolve();
                    });
                });
            });
        });
    }

    runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    allQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getUploadState() {
        return {
            isUploading: this.isUploading,
            ...this.uploadProgress
        };
    }

    async insertChannels(channels, sender = null) {
        if (this.isUploading) {
            console.log(`[Repository] Upload already in progress. Syncing UI...`);
            this.activeUploadSender = sender;
            if (this.activeUploadSender) {
                this.activeUploadSender.send('upload-progress', {
                    current: this.uploadProgress.current,
                    total: this.uploadProgress.total,
                    channelName: this.uploadProgress.channelName,
                    isComplete: false
                });
            }
            return 0; // Return 0 inserted for the concurrent call
        }

        this.isUploading = true;
        this.activeUploadSender = sender;
        const total = channels.length;
        this.uploadProgress = { current: 0, total, channelName: '' };

        let inserted = 0;

        try {
            for (let i = 0; i < total; i++) {
                const channel = channels[i];
                this.uploadProgress.current = i + 1;
                this.uploadProgress.channelName = channel.name;

                try {
                    await this.runQuery(
                        `INSERT INTO channels (name, referer, user_agent, link, state, is_favorite, playlist) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [channel.name, channel.referer || null, channel.user_agent || null, channel.link, channel.state, channel.is_favorite ? 1 : 0, channel.playlist || null]
                    );

                    if (channel.playlist) {
                        await this.runQuery(`INSERT OR IGNORE INTO playlists (name) VALUES (?)`, [channel.playlist]);
                    }

                    inserted++;
                } catch (error) {
                    // E.g. UNIQUE constraint failed
                }

                // Report progress every 5 items for a smoother UI, or at the end
                if (this.activeUploadSender && (i % 5 === 0 || i === total - 1)) {
                    this.activeUploadSender.send('upload-progress', {
                        current: this.uploadProgress.current,
                        total: this.uploadProgress.total,
                        channelName: this.uploadProgress.channelName,
                        isComplete: false // We will send true in the finally block
                    });
                }
            }
        } finally {
            this.isUploading = false;
            if (this.activeUploadSender) {
                this.activeUploadSender.send('upload-progress', {
                    current: this.uploadProgress.current,
                    total: this.uploadProgress.total,
                    channelName: this.uploadProgress.channelName,
                    isComplete: true
                });
            }
        }

        return inserted;
    }

    async getAllChannels() {
        try {
            const rows = await this.allQuery(`SELECT * FROM channels`);
            return rows.map(row => new Channel(row));
        } catch (error) {
            console.error("Error fetching channels:", error.message);
            return [];
        }
    }

    async getChannelsPaginated(limit, offset) {
        try {
            const rows = await this.allQuery(`SELECT * FROM channels LIMIT ? OFFSET ?`, [limit, offset]);
            return rows.map(row => new Channel(row));
        } catch (error) {
            console.error("Error fetching paginated channels:", error.message);
            return [];
        }
    }

    async getPlaylists() {
        try {
            // Get from the dedicated table
            const rows = await this.allQuery(`SELECT name FROM playlists ORDER BY name ASC`);
            return rows.map(row => row.name);
        } catch (error) {
            console.error("Error fetching playlists:", error.message);
            return [];
        }
    }

    async createPlaylist(name) {
        try {
            if (!name) return false;
            await this.runQuery(`INSERT OR IGNORE INTO playlists (name) VALUES (?)`, [name]);
            return true;
        } catch (error) {
            console.error("Error creating playlist:", error.message);
            return false;
        }
    }

    async deletePlaylist(name) {
        try {
            await this.runQuery(`DELETE FROM playlists WHERE name = ?`, [name]);
            // Optional: Set channel playlists to null if they belonged to this?
            // User usually wants channels kept, just not in playlist, or we don't care about orphans
            await this.runQuery(`UPDATE channels SET playlist = NULL WHERE playlist = ?`, [name]);
            return true;
        } catch (error) {
            console.error("Error deleting playlist:", error.message);
            return false;
        }
    }

    async updatePlaylist(oldName, newName) {
        try {
            if (!oldName || !newName) return false;

            // 1. Update the playlist name in the playlists table
            await this.runQuery(`UPDATE playlists SET name = ? WHERE name = ?`, [newName, oldName]);

            // 2. Update all channels that were in the old playlist
            await this.runQuery(`UPDATE channels SET playlist = ? WHERE playlist = ?`, [newName, oldName]);

            return true;
        } catch (error) {
            console.error("Error updating playlist:", error.message);
            return false;
        }
    }

    async getChannelsByPlaylist(playlist, limit, offset) {
        try {
            const rows = await this.allQuery(`SELECT * FROM channels WHERE playlist = ? LIMIT ? OFFSET ?`, [playlist, limit, offset]);
            return rows.map(row => new Channel(row));
        } catch (error) {
            console.error("Error fetching channels by playlist:", error.message);
            return [];
        }
    }

    async searchByName(query) {
        try {
            const rows = await this.allQuery(`SELECT * FROM channels WHERE LOWER(name) LIKE ?`, [`%${query.toLowerCase()}%`]);
            return rows.map(row => new Channel(row));
        } catch (error) {
            console.error("Error searching channels:", error.message);
            return [];
        }
    }

    async getFavorites() {
        try {
            const rows = await this.allQuery(`SELECT * FROM channels WHERE is_favorite = 1`);
            return rows.map(row => new Channel(row));
        } catch (error) {
            console.error("Error fetching favorites:", error.message);
            return [];
        }
    }

    async toggleFavorite(id, is_favorite) {
        try {
            await this.runQuery(`UPDATE channels SET is_favorite = ? WHERE id = ?`, [is_favorite ? 1 : 0, id]);
            return true;
        } catch (error) {
            console.error("Error toggling favorite:", error.message);
            return false;
        }
    }

    async updateChannelState(id, state) {
        try {
            await this.runQuery(`UPDATE channels SET state = ? WHERE id = ?`, [state, id]);
            return true;
        } catch (error) {
            console.error("Error updating channel state:", error.message);
            return false;
        }
    }

    async updateChannel(id, updates) {
        try {
            const { name, link, user_agent, referer, playlist } = updates;
            await this.runQuery(
                `UPDATE channels SET name = ?, link = ?, user_agent = ?, referer = ?, playlist = ? WHERE id = ?`,
                [name, link, user_agent, referer, playlist, id]
            );
            return true;
        } catch (error) {
            console.error("Error updating channel:", error.message);
            return false;
        }
    }

    async deleteChannel(id) {
        try {
            await this.runQuery(`DELETE FROM channels WHERE id = ?`, [id]);
            return true;
        } catch (error) {
            console.error("Error deleting channel:", error.message);
            return false;
        }
    }

    async deleteDeadChannels() {
        try {
            await this.runQuery(`DELETE FROM channels WHERE state = 'NO'`, []);
            return true;
        } catch (error) {
            console.error("Error deleting dead channels:", error.message);
            return false;
        }
    }
}

module.exports = new ChannelRepository();
