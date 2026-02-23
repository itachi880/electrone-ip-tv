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
                    link TEXT NOT NULL UNIQUE,
                    state TEXT,
                    is_favorite BOOLEAN DEFAULT 0
                )`, (err) => {
                if (err) reject(err);

                // Add is_favorite if migration from old table is needed
                this.db.run(`ALTER TABLE channels ADD COLUMN is_favorite BOOLEAN DEFAULT 0`, (err) => {
                    // Ignore error if column already exists
                    resolve();
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

    async insertChannels(channels) {
        let inserted = 0;
        for (const channel of channels) {
            try {
                await this.runQuery(
                    `INSERT INTO channels (name, referer, link, state, is_favorite) VALUES (?, ?, ?, ?, ?)`,
                    [channel.name, channel.referer || null, channel.link, channel.state, channel.is_favorite ? 1 : 0]
                );
                inserted++;
            } catch (error) {
                // E.g. UNIQUE constraint failed
                continue;
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
