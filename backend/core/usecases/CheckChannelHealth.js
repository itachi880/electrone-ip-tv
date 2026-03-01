const { net } = require('electron'); // Use electron's net module for CORS/cookie bypassed requests
const repository = require('../../infrastructure/database/ChannelRepository');

class CheckChannelHealth {
    static isScanning = false;
    static activeSender = null;
    static scanProgress = { current: 0, total: 0, channelName: '', debugLogs: [] };

    static getScanState() {
        return {
            isScanning: this.isScanning,
            ...this.scanProgress
        };
    }

    /**
     * @param {number} batchSize 
     */
    static async execute(batchSize = 20) {
        // ... (keep execute the same, it's the background auto-updater)
        console.log(`[HealthChecker] Running partial health check...`);
        try {
            const channels = await repository.allQuery(`SELECT * FROM channels ORDER BY RANDOM() LIMIT ?`, [batchSize]);
            for (const channel of channels) {
                if (!channel.link) continue;
                try {
                    const isAlive = await this.pingStream(channel.link, channel);
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
     * Checks if a stream URL is reachable with fallback and smarter handshake
     * @param {string} url 
     * @param {Object} channel 
     * @returns {Promise<boolean>}
     */
    static async pingStream(url, channel, debugLogs = []) {
        const headSuccess = await this._ping(url, channel, 'HEAD', false, debugLogs);
        if (headSuccess) return true;
        return await this._ping(url, channel, 'GET', true, debugLogs);
    }

    static _ping(url, channel, method, patient = false, debugLogs = []) {
        return new Promise((resolve) => {
            const request = net.request({ url, method, redirect: 'follow' });

            if (channel.user_agent) {
                request.setHeader('User-Agent', channel.user_agent);
            } else {
                request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            }

            if (channel.referer) request.setHeader('Referer', channel.referer);

            Object.entries({
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Connection': 'keep-alive'
            }).forEach(([k, v]) => request.setHeader(k, v));

            let resolved = false;
            const handleFinish = (success, reason = "") => {
                if (resolved) return;
                resolved = true;

                debugLogs.push(`[HealthChecker PING] ${method} ${success ? 'PASSED' : 'FAILED'}. Reason: ${reason}`);

                if (url.includes("2m_monde")) {
                    console.log(`[HealthChecker DEBUG] 2M Monde ${method} ${success ? 'PASSED' : 'FAILED'}. Reason: ${reason}`);
                }
                request.abort();
                resolve(success);
            };

            request.on('response', (response) => {
                const isSuccess = response.statusCode >= 200 && response.statusCode < 400;
                if (!isSuccess) {
                    handleFinish(false, `HTTP Status ${response.statusCode}`);
                    return;
                }
                if (!patient) {
                    handleFinish(true, "Response received (non-patient)");
                    return;
                }
                const timeoutId = setTimeout(() => handleFinish(true), 500);
                response.on('data', () => {
                    clearTimeout(timeoutId);
                    handleFinish(true);
                });
            });

            request.on('error', (err) => handleFinish(false, `Request Error: ${err.message}`));
            setTimeout(() => handleFinish(false, "Timeout reached (10s)"), 10000);
            request.end();
        });
    }

    static syncProgress(isComplete, status = null, channelDebugLogs = null) {
        if (!this.activeSender) return;
        const payload = {
            current: this.scanProgress.current,
            total: this.scanProgress.total,
            channelName: this.scanProgress.channelName,
            isComplete: isComplete,
            debugLogs: channelDebugLogs && channelDebugLogs.length > 0 ? channelDebugLogs : null
        };
        if (status) payload.status = status;
        this.activeSender.send('scan-progress', payload);
    }

    static async pingTcp(url, debugLogs) {
        return new Promise((resolve) => {
            try {
                const urlObj = new URL(url);
                let port = urlObj.port;

                if (!port) {
                    const protocol = urlObj.protocol.replace(':', '');
                    switch (protocol) {
                        case 'rtmp': port = 1935; break;
                        case 'rtsp': port = 554; break;
                        case 'udp': port = null; break;
                        default: port = 80;
                    }
                }

                if (!port) {
                    debugLogs.push(`[HealthChecker DEBUG] Connectionless protocol, assuming alive.`);
                    return resolve(true);
                }

                const net = require('net');
                const socket = new net.Socket();
                const timeoutMs = 5000;
                socket.setTimeout(timeoutMs);

                socket.on('connect', () => {
                    debugLogs.push(`[HealthChecker DEBUG] TCP connection established.`);
                    socket.destroy();
                    resolve(true);
                });

                socket.on('timeout', () => {
                    debugLogs.push(`[HealthChecker DEBUG] TCP connection timed out.`);
                    socket.destroy();
                    resolve(false);
                });

                socket.on('error', (err) => {
                    debugLogs.push(`[HealthChecker DEBUG] TCP error: ${err.message}`);
                    socket.destroy();
                    resolve(false);
                });

                socket.connect(port, urlObj.hostname);
            } catch (err) {
                debugLogs.push(`[HealthChecker DEBUG] URL Parse Error: ${err.message}`);
                resolve(false);
            }
        });
    }

    static async checkChannel(channel) {
        if (!channel.link) return;
        let debugLogs = [];

        try {
            let isAlive = false;

            if (!channel.link.startsWith('http://') && !channel.link.startsWith('https://')) {
                debugLogs.push(`[HealthChecker PING] TCP Socket check for protocol: ${channel.link.split('://')[0]}`);
                isAlive = await this.pingTcp(channel.link, debugLogs);
            } else {
                isAlive = await this.pingStream(channel.link, channel, debugLogs);
            }

            const newState = isAlive ? "OK" : "NO";
            if (channel.state !== newState) {
                await repository.updateChannelState(channel.id, newState);
            }
        } catch (e) {
            if (channel.state !== "NO") {
                await repository.updateChannelState(channel.id, "NO");
            }
            debugLogs.push(`Exception pinging: ${e.message}`);
        } finally {
            this.scanProgress.current++;
            this.scanProgress.channelName = channel.name;

            if (debugLogs.length > 0) {
                this.scanProgress.debugLogs.push(...debugLogs);
                if (this.scanProgress.debugLogs.length > 50) {
                    this.scanProgress.debugLogs = this.scanProgress.debugLogs.slice(-50);
                }
            }

            this.syncProgress(false, null, debugLogs);
        }
    }

    static async getScanContext() {
        let countResult = await repository.allQuery(`SELECT COUNT(*) as count FROM channels WHERE state IS NULL OR state = 'NO'`);
        let total = countResult[0].count;
        let baseQuery = `SELECT * FROM channels WHERE state IS NULL OR state = 'NO' ORDER BY id ASC LIMIT ? OFFSET ?`;

        if (total === 0) {
            countResult = await repository.allQuery(`SELECT COUNT(*) as count FROM channels`);
            total = countResult[0].count;
            baseQuery = `SELECT * FROM channels ORDER BY id ASC LIMIT ? OFFSET ?`;
        }

        return { total, baseQuery };
    }

    static async executeFullScan(sender = null, concurrencyLimit = 50) {
        if (this.isScanning) {
            console.log(`[HealthChecker] Scan already in progress. Syncing UI...`);
            this.activeSender = sender;
            this.syncProgress(false);
            return;
        }

        this.isScanning = true;
        this.activeSender = sender;
        this.scanProgress = { current: 0, total: 0, channelName: '', debugLogs: [] };
        console.log(`[HealthChecker] Running FULL health scan with concurrency ${concurrencyLimit}...`);

        try {
            const { total, baseQuery } = await this.getScanContext();

            if (total === 0) {
                this.isScanning = false;
                return;
            }

            this.scanProgress.total = total;
            this.syncProgress(false, 'Starting scan...');

            let offset = 0;
            while (offset < total && this.isScanning) {
                const batch = await repository.allQuery(baseQuery, [concurrencyLimit, offset]);
                if (batch.length === 0) break;

                await Promise.all(batch.map(channel => this.checkChannel(channel)));
                offset += concurrencyLimit;
            }

            console.log(`[HealthChecker] Finished FULL health scan of ${total} channels.`);
            this.isScanning = false;
            this.syncProgress(true, 'Scan completed');
        } catch (e) {
            console.error(`[HealthChecker] Full Scan Error:`, e);
            this.isScanning = false;
            if (this.activeSender) this.activeSender.send('scan-progress', { error: true });
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
