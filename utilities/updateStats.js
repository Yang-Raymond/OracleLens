/**
 * @file updateStats.js
 * @description Utility to update the stats.json file with new player data.
 * Uses a simple in-process mutex to prevent race conditions on concurrent writes.
 */

const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '..', 'stats.json');

// Simple in-process mutex to serialize concurrent writes
let writeLock = Promise.resolve();

/**
 * Updates the stats.json file with the provided analysis response.
 * Queues updates so only one write happens at a time.
 * @param {Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>} [manualData] - The data to update. If not provided, reads from gameStats.json.
 * @returns {Promise<Record<string, Object>>} The updated stats object (rejects on failure).
 */
function updateStats(manualData) {
    // Chain onto the existing lock so updates run sequentially
    const result = writeLock.then(() => performUpdate(manualData));
    // Keep the lock chain alive even if this update fails
    writeLock = result.catch(err => {
        console.error('Error during stats update:', err);
    });
    return result;
}

/**
 * Atomically writes data to a file (temp file in same dir + rename).
 * @param {string} target
 * @param {string} data
 */
function atomicWrite(target, data) {
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, target);
}

/**
 * Internal function that performs the actual read-modify-write.
 * @param {Array<Object>|undefined} manualData
 * @returns {Record<string, Object>} The updated stats object.
 */
function performUpdate(manualData) {
    // Read existing stats: missing file => empty; read/parse error => throw (do not overwrite)
    let existingStats = {};
    if (fs.existsSync(statsPath)) {
        const data = fs.readFileSync(statsPath, 'utf8');
        existingStats = JSON.parse(data);
    }

    let analysisResponse = manualData;

    // Fallback to reading from file if no data passed (backward compatibility)
    if (!analysisResponse) {
        const gameStatsPath = path.join(__dirname, '..', 'gameStats.json');
        if (fs.existsSync(gameStatsPath)) {
            const gameStatsData = fs.readFileSync(gameStatsPath, 'utf8');
            analysisResponse = JSON.parse(gameStatsData);
        } else {
            console.error('No data provided and gameStats.json not found.');
            return existingStats;
        }
    }

    // Update stats for each player in the game stats
    for (const player of analysisResponse) {
        const existingKey = Object.keys(existingStats).find(
            k => k.toLowerCase() === player.username.toLowerCase()
        );

        const key = existingKey || player.username;

        if (Object.hasOwn(existingStats, key)) {
            // Update existing player stats
            existingStats[key].kills = (existingStats[key].kills || 0) + player.kills;
            existingStats[key].deaths = (existingStats[key].deaths || 0) + player.deaths;
            existingStats[key].assists = (existingStats[key].assists || 0) + player.assists;
            existingStats[key].wins = (existingStats[key].wins || 0) + (player.win ? 1 : 0);
            existingStats[key].losses = (existingStats[key].losses || 0) + (player.win ? 0 : 1);
        } else {
            // Add new player (defineProperty so keys like __proto__ become own data properties)
            Object.defineProperty(existingStats, key, {
                value: {
                    kills: player.kills,
                    deaths: player.deaths,
                    assists: player.assists,
                    wins: player.win ? 1 : 0,
                    losses: player.win ? 0 : 1,
                    elo: 1000
                },
                enumerable: true,
                writable: true,
                configurable: true
            });
        }
    }

    // Write updated stats back to file atomically
    atomicWrite(statsPath, JSON.stringify(existingStats, null, 4));
    return existingStats;
}

module.exports = { updateStats };
