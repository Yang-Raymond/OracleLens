const fs = require('fs');
const path = require('path');
const statsPath = path.join(__dirname, '..', 'stats.json');
const usersPath = path.join(__dirname, '..', 'users.json');

async function formTeams(players) {
    if (!Array.isArray(players)) return { err: "Players is not an array" }
    
    const stats = JSON.parse(fs.readFileSync(statsPath));
    const users = JSON.parse(fs.readFileSync(usersPath));

}

module.exports = { formTeams }
