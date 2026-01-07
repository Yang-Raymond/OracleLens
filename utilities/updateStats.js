/**
 * @file updateStats.js
 * @description Utility to update the stats.json file with new player data.
 */

const fs = require('fs');
const path = require('path');

/**
 * Updates the stats.json file with the provided analysis response.
 * @param {Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>} [manualData] - The data to update. If not provided, reads from gameStats.json.
 * @returns {Array<Object>} The updated stats array.
 */
function updateStats(manualData) {
    const statsPath = path.join(__dirname, '..', 'stats.json');
    
    // Read existing stats
    let existingStats = [];
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
}

module.exports = { updateStats };