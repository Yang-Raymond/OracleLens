/**
 * @file updateStats.js
 * @description Utility to update the stats.json file with new player data.
 * Serialized, atomic file I/O is delegated to jsonStore.js.
 */

const fs = require('fs');
const path = require('path');
const { readJson, updateJson } = require('./jsonStore.js');

const statsPath = path.join(__dirname, '..', 'stats.json');

/**
 * Updates the stats.json file with the provided analysis response.
 * @param {Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>} [manualData] - The data to update. If not provided, reads from gameStats.json.
 * @returns {Promise<Record<string, Object>>} The updated stats object (rejects on failure).
 */
async function updateStats(manualData) {
    const analysisResponse = manualData || readGameStats();

    if (!analysisResponse) {
        return readJson(statsPath);
    }

    return updateJson(statsPath, existingStats => applyStats(existingStats, analysisResponse));
}

/**
 * Fallback input for backward compatibility: reads gameStats.json if present.
 * @returns {Array<Object>|null}
 */
function readGameStats() {
    const gameStatsPath = path.join(__dirname, '..', 'gameStats.json');

    if (!fs.existsSync(gameStatsPath)) {
        console.error('No data provided and gameStats.json not found.');
        return null;
    }

    return JSON.parse(fs.readFileSync(gameStatsPath, 'utf8'));
}

/**
 * Merges the game data into the stats object in place.
 * @param {Record<string, Object>} existingStats - The stats object to mutate.
 * @param {Array<Object>} analysisResponse - Per-player results for one game.
 */
function applyStats(existingStats, analysisResponse) {
    for (const player of analysisResponse) {
        const existingKey = Object.keys(existingStats).find(
            k => k.toLowerCase() === player.username.toLowerCase()
        );

        const key = existingKey || player.username;

        if (Object.hasOwn(existingStats, key)) {
            existingStats[key].kills = (existingStats[key].kills || 0) + player.kills;
            existingStats[key].deaths = (existingStats[key].deaths || 0) + player.deaths;
            existingStats[key].assists = (existingStats[key].assists || 0) + player.assists;
            existingStats[key].wins = (existingStats[key].wins || 0) + (player.win ? 1 : 0);
            existingStats[key].losses = (existingStats[key].losses || 0) + (player.win ? 0 : 1);
        } else {
            Object.defineProperty(existingStats, key, {
                value: {
                    kills: player.kills,
                    deaths: player.deaths,
                    assists: player.assists,
                    wins: player.win ? 1 : 0,
                    losses: player.win ? 0 : 1,
                },
                enumerable: true,
                writable: true,
                configurable: true
            });
        }
    }
}

module.exports = { updateStats };
