const { net } = require('electron'); // Use electron's net module for CORS/cookie bypassed requests
const repository = require('../../infrastructure/database/ChannelRepository');

class CheckChannelHealth {
    /**
     * @param {number} batchSize 
     */
    static async execute(batchSize = 20) {
        console.log(`[HealthChecker] Running partial health check...`);
        // We'll fetch channels that either have no state yet, or just fetch all and periodically update.
        // For simplicity, let's grab channels where state IS NULL or state IS "OK" (to check if they died).
        // Since we don't want to lock the DB, let's grab random or strictly ordered rows.
        try {
            // Pick some channels that haven't been checked recently (we are just selecting random 20 for this implementation to avoid complex timestamping)
            const channels = await repository.allQuery(`SELECT * FROM channels ORDER BY RANDOM() LIMIT ?`, [batchSize]);

            for (const channel of channels) {
                if (!channel.link) continue;

                try {
                    const isAlive = await this.pingStream(channel.link, channel.referer);
                    const newState = isAlive ? "OK" : "NO";
                    if (channel.state !== newState) {
                        await repository.updateChannelState(channel.id, newState);
                    }
                } catch (e) {
                    if (channel.state !== "NO") {
                        await repository.updateChannelState(channel.id, "NO");
                    }
                }
            }
            console.log(`[HealthChecker] Finished checking ${channels.length} channels.`);
        } catch (e) {
            console.error(`[HealthChecker] Error:`, e);
        }
    }

    /**
     * Checks if a stream URL is reachable
     * @param {string} url 
     * @param {string} referer 
     * @returns {Promise<boolean>}
     */
    static pingStream(url, referer) {
        return new Promise((resolve) => {
            const request = net.request({
                url,
                method: 'HEAD',
                redirect: 'follow'
            });

            if (referer) {
                request.setHeader('Referer', referer);
            }

            request.on('response', (response) => {
                // Some streams return 401/403 but the auth happens later, or 302
                // We'll consider 200, 204, 206, 301, 302 as OK.
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            request.on('error', (err) => {
                resolve(false);
            });

            // Set timeout
            request.setTimeout(5000, () => {
                request.abort();
                resolve(false);
            });

            request.end();
        });
    }

    static async executeFullScan() {
        console.log(`[HealthChecker] Running FULL health scan...`);
        try {
            // Fetch all channels that either don't have a state, or we just want to re-scan
            // Let's explicitly check ones we haven't confirmed working yet to speed up
            let channels = await repository.allQuery(`SELECT * FROM channels WHERE state IS NULL OR state = 'NO'`);

            // If all are fine, let's just do a blanket re-verify
            if (channels.length === 0) {
                channels = await repository.allQuery(`SELECT * FROM channels`);
            }

            // Batch them to prevent network stalling (e.g. 5 concurrent)
            const concurrencyLimit = 5;
            for (let i = 0; i < channels.length; i += concurrencyLimit) {
                const batch = channels.slice(i, i + concurrencyLimit);
                await Promise.all(batch.map(async (channel) => {
                    if (!channel.link) return;

                    try {
                        const isAlive = await this.pingStream(channel.link, channel.referer);
                        const newState = isAlive ? "OK" : "NO";
                        if (channel.state !== newState) {
                            await repository.updateChannelState(channel.id, newState);
                        }
                    } catch (e) {
                        if (channel.state !== "NO") {
                            await repository.updateChannelState(channel.id, "NO");
                        }
                    }
                }));
            }
            console.log(`[HealthChecker] Finished FULL health scan of ${channels.length} channels.`);
        } catch (e) {
            console.error(`[HealthChecker] Full Scan Error:`, e);
        }
    }

    static startBackgroundService(intervalMs = 60000) {
        // Run immediately
        this.execute();
        // And then on interval
        setInterval(() => {
            this.execute();
        }, intervalMs);
    }
}

module.exports = CheckChannelHealth;
