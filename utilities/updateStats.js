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
 * @returns {Promise<Array<Object>>} The updated stats array.
 */
function updateStats(manualData) {
    // Chain onto the existing lock so updates run sequentially
    writeLock = writeLock.then(() => performUpdate(manualData)).catch(err => {
        console.error('Error during stats update:', err);
    });
    return writeLock;
}

/**
 * Internal function that performs the actual read-modify-write.
 * @param {Array<Object>|undefined} manualData
 * @returns {Array<Object>} The updated stats array.
 */
function performUpdate(manualData) {
    // Read existing stats
    let existingStats = [];
    try {
        if (fs.existsSync(statsPath)) {
            const data = fs.readFileSync(statsPath, 'utf8');
            existingStats = JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading stats.json, starting with empty stats:', err);
        existingStats = [];
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
        const existingPlayer = existingStats.find(
            s => s.username.toLowerCase() === player.username.toLowerCase()
        );

        if (existingPlayer) {
            // Update existing player stats
            existingPlayer.kills = (existingPlayer.kills || 0) + player.kills;
            existingPlayer.deaths = (existingPlayer.deaths || 0) + player.deaths;
            existingPlayer.assists = (existingPlayer.assists || 0) + player.assists;
            existingPlayer.wins = (existingPlayer.wins || 0) + (player.win ? 1 : 0);
            existingPlayer.losses = (existingPlayer.losses || 0) + (player.win ? 0 : 1);
        } else {
            // Add new player
            existingStats.push({
                username: player.username,
                kills: player.kills,
                deaths: player.deaths,
                assists: player.assists,
                wins: player.win ? 1 : 0,
                losses: player.win ? 0 : 1
            });
        }
    }

    // Write updated stats back to file
    fs.writeFileSync(statsPath, JSON.stringify(existingStats, null, 4), 'utf8');
    return existingStats;
}

module.exports = { updateStats };