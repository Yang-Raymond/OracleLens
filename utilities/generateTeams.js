/**
 * @file generateTeams.js
 * @description Core team generation algorithm for League of Legends custom matches.
 * Computes regularized skill scores, evaluates role-preference satisfaction,
 * and picks a balanced-but-random split from the top-K combinations.
 */

const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '..', 'stats.json');
const usersPath = path.join(__dirname, '..', 'users.json');

// ============================================================
// TUNABLE CONSTANTS
// ============================================================

// Prior strength for regularization (virtual games)
const K_PRIOR = 10;

// Default pool fallbacks when no experienced players exist in the lobby
const DEFAULT_POOL_WIN_RATE = 0.5;
const DEFAULT_POOL_KDA = 3.0;
const DEFAULT_PLAYER_ELO = 1000;

// Skill score component weights
const W_WR = 100;    // Win-rate weight
const W_KDA = 10;    // KDA weight
const W_ELO = 0.5;   // Elo weight (scales ~1000 elo to ~500 points)

// ============================================================
// SKILL SCORE FORMULA TOGGLE
// Comment/uncomment ONE of the following lines to switch modes:
const USE_ELO = false; // Formula A: Win-rate + KDA only
// const USE_ELO = true;  // Formula B: Win-rate + KDA + Elo
// ============================================================

// Balance & Selection Constants
const TOP_K = 10;                     // Pool size of best splits to randomly choose from
const ROLE_SATISFACTION_WEIGHT = 2.0; // Multiplier for role satisfaction in combined score
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPP'];

/**
 * Reads users.json fresh from disk.
 * @returns {Record<string, { discord_username: string, riot_username: string, preferred_role: string, secondary_role: string }>}
 */
function readUsers() {
    try {
        if (!fs.existsSync(usersPath)) return {};
        return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch (error) {
        console.error('Error reading users.json:', error);
        return {};
    }
}

/**
 * Reads stats.json fresh from disk.
 * @returns {Record<string, { wins: number, losses: number, kills: number, deaths: number, assists: number, elo?: number }>}
 */
function readStats() {
    try {
        if (!fs.existsSync(statsPath)) return {};
        return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch (error) {
        console.error('Error reading stats.json:', error);
        return {};
    }
}

/**
 * Computes regularized skill scores and extracts role preferences for a set of 10 Discord IDs.
 * 
 * @param {string[]} memberIds - Array of 10 Discord user IDs.
 * @param {Record<string, any>} [users] - Optional pre-loaded users map.
 * @param {Record<string, any>} [stats] - Optional pre-loaded stats map.
 * @returns {{ error?: string, missingUsers?: string[], scoredPlayers?: Array<any> }}
 */
function computeSkillScores(memberIds, users = readUsers(), stats = readStats()) {
    // 1. Check for unlinked Discord accounts
    const missingUsers = memberIds.filter(id => !users[id] || !users[id].riot_username);
    if (missingUsers.length > 0) {
        return { missingUsers };
    }

    // 2. Resolve stats for each player (case-insensitive match)
    const statsKeys = Object.keys(stats);
    const resolvedPlayers = memberIds.map(id => {
        const user = users[id];
        const riotUsername = user.riot_username;
        const matchedKey = statsKeys.find(key => key.toLowerCase() === riotUsername.toLowerCase().trim());
        const playerStats = matchedKey ? stats[matchedKey] : null;

        const wins = playerStats?.wins ?? 0;
        const losses = playerStats?.losses ?? 0;
        const kills = playerStats?.kills ?? 0;
        const deaths = playerStats?.deaths ?? 0;
        const assists = playerStats?.assists ?? 0;
        const elo = playerStats?.elo ?? DEFAULT_PLAYER_ELO;
        const gamesPlayed = wins + losses;
        const rawKDA = (kills + assists) / Math.max(deaths, 1);
        const rawWinRate = gamesPlayed > 0 ? (wins / gamesPlayed) : DEFAULT_POOL_WIN_RATE;

        return {
            discordId: id,
            discordUsername: user.discord_username || id,
            riotUsername,
            preferredRole: (user.preferred_role || '').toUpperCase(),
            secondaryRole: (user.secondary_role || '').toUpperCase(),
            wins,
            losses,
            kills,
            deaths,
            assists,
            elo,
            gamesPlayed,
            rawKDA,
            rawWinRate
        };
    });

    // 3. Compute pool averages for experienced players (gamesPlayed > 0)
    const experiencedPlayers = resolvedPlayers.filter(p => p.gamesPlayed > 0);
    let poolWinRate = DEFAULT_POOL_WIN_RATE;
    let poolKDA = DEFAULT_POOL_KDA;

    if (experiencedPlayers.length > 0) {
        const totalWins = experiencedPlayers.reduce((sum, p) => sum + p.wins, 0);
        const totalGames = experiencedPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0);
        poolWinRate = totalGames > 0 ? (totalWins / totalGames) : DEFAULT_POOL_WIN_RATE;
        poolKDA = experiencedPlayers.reduce((sum, p) => sum + p.rawKDA, 0) / experiencedPlayers.length;
    }

    // 4. Calculate regularized skill score for each player
    const scoredPlayers = resolvedPlayers.map(p => {
        const regularizedWinRate = (p.wins + K_PRIOR * poolWinRate) / (p.gamesPlayed + K_PRIOR);
        const regularizedKDA = (p.gamesPlayed * p.rawKDA + K_PRIOR * poolKDA) / (p.gamesPlayed + K_PRIOR);

        let skillScore;
        if (USE_ELO) {
            // Formula B: Win-rate + KDA + Elo
            skillScore = (regularizedWinRate * W_WR) + (regularizedKDA * W_KDA) + (p.elo * W_ELO);
        } else {
            // Formula A: Win-rate + KDA only
            skillScore = (regularizedWinRate * W_WR) + (regularizedKDA * W_KDA);
        }

        return {
            ...p,
            regularizedWinRate,
            regularizedKDA,
            skillScore
        };
    });

    return { scoredPlayers, poolWinRate, poolKDA };
}

/**
 * Generates all permutations of an array.
 * @template T
 * @param {T[]} arr 
 * @returns {T[][]}
 */
function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        const remainingPerms = getPermutations(remaining);
        for (const perm of remainingPerms) {
            result.push([current, ...perm]);
        }
    }
    return result;
}

// Pre-compute all permutations of indices [0, 1, 2, 3, 4] for 5 roles
const ROLE_PERMUTATIONS = getPermutations([0, 1, 2, 3, 4]);

/**
 * Finds the optimal assignment of 5 players to standard League roles (TOP, JUNGLE, MID, ADC, SUPP)
 * maximizing role satisfaction.
 * 
 * Preferred role = +2 points
 * Secondary role = +1 point
 * Fill role = 0 points
 * 
 * @param {Array<any>} team - Array of 5 player objects
 * @returns {{ assignments: Array<{ role: string, player: any, matchType: 'preferred' | 'secondary' | 'fill' }>, satisfactionScore: number }}
 */
function assignRoles(team) {
    let bestSatisfaction = -1;
    let bestAssignment = null;

    for (const perm of ROLE_PERMUTATIONS) {
        let currentSatisfaction = 0;
        const currentAssignment = [];

        for (let rIndex = 0; rIndex < ROLES.length; rIndex++) {
            const role = ROLES[rIndex];
            const player = team[perm[rIndex]];

            let matchType = 'fill';
            if (player.preferredRole === role) {
                currentSatisfaction += 2;
                matchType = 'preferred';
            } else if (player.secondaryRole === role) {
                currentSatisfaction += 1;
                matchType = 'secondary';
            }

            currentAssignment.push({
                role,
                player,
                matchType
            });
        }

        if (currentSatisfaction > bestSatisfaction) {
            bestSatisfaction = currentSatisfaction;
            bestAssignment = currentAssignment;
        }
    }

    return {
        assignments: bestAssignment,
        satisfactionScore: bestSatisfaction
    };
}

/**
 * Generates all C(n, k) combinations of an array.
 * @template T
 * @param {T[]} arr 
 * @param {number} k 
 * @returns {T[][]}
 */
function getCombinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = getCombinations(rest, k);
    return [...withFirst, ...withoutFirst];
}

/**
 * Evaluates all 126 unique unordered 5v5 splits, scores balance and role satisfaction,
 * and returns the top-K candidate splits along with a randomly selected one.
 * 
 * @param {Array<any>} scoredPlayers - 10 scored player objects
 * @param {number} [topK=TOP_K] - Number of top splits to consider for random selection
 * @returns {{ selectedSplit: any, topKSplits: any[], totalSplitsEvaluated: number }}
 */
function generateBalancedTeams(scoredPlayers, topK = TOP_K) {
    if (!scoredPlayers || scoredPlayers.length !== 10) {
        throw new Error('Exactly 10 scored players are required to generate teams.');
    }

    // Anchor player 0 to Team A. Choose 4 teammates from remaining 9 players (indices 1..9).
    const anchor = scoredPlayers[0];
    const remainingPlayers = scoredPlayers.slice(1);
    const combinationsOf4 = getCombinations(remainingPlayers, 4); // C(9, 4) = 126 splits

    const allSplits = combinationsOf4.map(combo => {
        const teamA = [anchor, ...combo];
        const teamB = remainingPlayers.filter(p => !combo.includes(p));

        const teamASkill = teamA.reduce((sum, p) => sum + p.skillScore, 0);
        const teamBSkill = teamB.reduce((sum, p) => sum + p.skillScore, 0);
        const skillImbalance = Math.abs(teamASkill - teamBSkill);

        const roleA = assignRoles(teamA);
        const roleB = assignRoles(teamB);
        const totalSatisfaction = roleA.satisfactionScore + roleB.satisfactionScore;

        // Combined score: lower is better (minimize skill imbalance, maximize role satisfaction)
        const combinedScore = skillImbalance - (ROLE_SATISFACTION_WEIGHT * totalSatisfaction);

        return {
            teamA,
            teamB,
            teamASkill,
            teamBSkill,
            skillImbalance,
            roleA,
            roleB,
            totalSatisfaction,
            combinedScore
        };
    });

    // Sort ascending by combined score
    allSplits.sort((a, b) => a.combinedScore - b.combinedScore);

    const topKSplits = allSplits.slice(0, Math.min(topK, allSplits.length));

    // Pick uniformly at random from top-K
    const chosenIndex = Math.floor(Math.random() * topKSplits.length);
    const chosenSplit = topKSplits[chosenIndex];

    // Coin-flip (50%) to swap Team A and Team B display order so anchor player isn't always Team A
    const shouldSwap = Math.random() < 0.5;
    const finalSplit = {
        teamA: shouldSwap ? chosenSplit.teamB : chosenSplit.teamA,
        teamB: shouldSwap ? chosenSplit.teamA : chosenSplit.teamB,
        teamASkill: shouldSwap ? chosenSplit.teamBSkill : chosenSplit.teamASkill,
        teamBSkill: shouldSwap ? chosenSplit.teamASkill : chosenSplit.teamBSkill,
        roleA: shouldSwap ? chosenSplit.roleB : chosenSplit.roleA,
        roleB: shouldSwap ? chosenSplit.roleA : chosenSplit.roleB,
        skillImbalance: chosenSplit.skillImbalance,
        totalSatisfaction: chosenSplit.totalSatisfaction,
        combinedScore: chosenSplit.combinedScore
    };

    return {
        selectedSplit: finalSplit,
        topKSplits,
        totalSplitsEvaluated: allSplits.length
    };
}

module.exports = {
    computeSkillScores,
    assignRoles,
    generateBalancedTeams,
    readUsers,
    readStats,
    USE_ELO,
    K_PRIOR,
    TOP_K,
    ROLES
};
