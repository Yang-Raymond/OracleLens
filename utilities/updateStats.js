/**
 * @file updateStats.js
 * @description Utility to update the stats.json file with new player data.
 */

const fs = require('fs');
const path = require('path');

/**
 * Updates the stats.json file with the provided analysis response in gameStats.json.
 * @param {Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>} analysisResponse - The data to update.
 * @returns {Array<Object>} The updated stats array.
 */
function updateStats() {
    const statsPath = path.join(__dirname, '..', 'stats.json');
    const gameStatsPath = path.join(__dirname, '..', 'gameStats.json');
    
    // Read existing stats
    let existingStats = [];
    if (fs.existsSync(statsPath)) {
        const data = fs.readFileSync(statsPath, 'utf8');
        existingStats = JSON.parse(data);
    }
    // Read new game stats
    const gameStatsData = fs.readFileSync(gameStatsPath, 'utf8');
    const analysisResponse = JSON.parse(gameStatsData);

    // Update stats for each player in the game stats
    for (const player of analysisResponse) {
        const existingPlayer = existingStats.find(
            s => s.username.toLowerCase() === player.username.toLowerCase()
        );

        if (existingPlayer) {
            // Update existing player stats
            existingPlayer.kills += player.kills;
            existingPlayer.deaths += player.deaths;
            existingPlayer.assists += player.assists;
            existingPlayer.wins += player.win ? 1 : 0;
            existingPlayer.losses += player.win ? 0 : 1;
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