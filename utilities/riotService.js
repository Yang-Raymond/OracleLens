/**
 * @file riotService.js
 * @description Utility to look up a Riot Games account using the Riot Games API.
 */

require('dotenv').config();
const apiKey = process.env.RIOT_API_KEY;

const GENERIC_ERROR = 'Error fetching your account. Please try again later.';

/**
 * Looks up a Riot Games account using the Riot Games API.
 * @param {string} riotUsername - The Riot Games username (game name).
 * @param {string} riotHashtag - The Riot Games hashtag (without the # symbol).
 * @returns {Promise<{ok: true, message: string, account: {puuid: string, gameName: string, tagLine: string}} | {ok: false, message: string}>}
 * The result of the lookup; on success includes the account details to save.
 */
async function accountByRiotId(riotUsername, riotHashtag) {
    if (riotHashtag.startsWith('#')) {
        return { ok: false, message: 'Please enter your Riot hashtag without the # symbol.' };
    }

    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotUsername)}/${encodeURIComponent(riotHashtag)}`;

    let response;
    let data;

    try {
        response = await fetch(url, {
            headers: {
                'X-Riot-Token': apiKey
            }
        });
        data = await response.json();
    } catch (error) {
        console.error('Error fetching Riot account:', error);
        return { ok: false, message: GENERIC_ERROR };
    }

    if (!response.ok) {
        if (response.status === 404) {
            return { ok: false, message: `Riot account not found for ${riotUsername} #${riotHashtag}.` };
        }
        console.error(`Error fetching Riot account: ${response.status} - ${data?.status?.message || 'Unknown error'}`);

        return { ok: false, message: GENERIC_ERROR };
    }

    return {
        ok: true,
        message: 'Riot account successfully linked!',
        account: {
            puuid: data.puuid,
            gameName: data.gameName ?? riotUsername,
        }
    };
}

const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
const DIVISIONS = { IV: 0, III: 1, II: 2, I: 3 };
const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

/**
 * Converts a ranked tier/division/LP into a single comparable ladder score.
 * @param {string} tier - Tier name (e.g. GOLD, MASTER).
 * @param {string} division - Division (IV, III, II, I); ignored for apex tiers.
 * @param {number} leaguePoints - League points in the current division.
 * @returns {number|null} The ladder score, or null if the tier/division is unknown.
 */
function toLadderScore(tier, division, leaguePoints) {
    if (!Number.isFinite(leaguePoints)) {
        console.error(`Invalid league points for ${tier} ${division}: ${leaguePoints}`);
        return null;
    }

    if (APEX_TIERS.includes(tier)) {
        return 2800 + leaguePoints;
    }

    const tierIndex = TIERS.indexOf(tier);

    if (tierIndex === -1 || !Object.hasOwn(DIVISIONS, division)) {
        console.error(`Unknown rank tier/division: ${tier} ${division}`);
        return null;
    }

    return tierIndex * 400 + DIVISIONS[division] * 100 + leaguePoints;
}

// Queue types in priority order.
const QUEUE_PRIORITY = [
    { queue: 'SOLO', types: ['RANKED_SOLO_5x5'] },
    { queue: 'FLEX', types: ['RANKED_FLEX_SR', 'RANKED_PREMADE_5x5', 'RANKED_TEAM_5x5'] }
];

/**
 * Picks the highest-priority ranked entry that has a scorable rank.
 * Entries with an unrecognised tier/division are skipped so a malformed
 * legacy entry falls through to the next queue instead of failing the lookup.
 * @param {Array<{queueType: string, tier: string, rank: string, leaguePoints: number}>} entries
 * @returns {{queue: 'SOLO'|'FLEX', entry: Object, lp: number} | null}
 */
function pickRankedEntry(entries) {
    for (const { queue, types } of QUEUE_PRIORITY) {
        for (const type of types) {
            const entry = entries.find(e => e?.queueType === type);
            if (!entry) continue;

            const lp = toLadderScore(entry.tier, entry.rank, entry.leaguePoints);
            if (lp !== null) {
                return { queue, entry, lp };
            }
        }
    }
    return null;
}

/**
 * Looks up a League of Legends ranked entry (Solo/Duo, else Flex) using the Riot Games API by PUUID.
 * The lp and override flag are stored. Other fields are for display.
 * @param {string} puuid - Riot Game's PUUID (unique player identifier).
 * @returns {Promise<{ok: true, rank: {queue: 'SOLO'|'FLEX'|null, tier: string, division: string|null, leaguePoints: number, lp: number, override: boolean}} | {ok: false, message: string}>}
 */
async function leagueRankByPuuid(puuid) {
    const url = `https://na1.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;

    let response;
    let data;

    try {
        response = await fetch(url, {
            headers: {
                'X-Riot-Token': apiKey
            }
        });
        data = await response.json();
    } catch (error) {
        console.error('Error fetching League account:', error);
        return { ok: false, message: GENERIC_ERROR };
    }

    if (!response.ok) {
        if (response.status === 404) {
            return { ok: false, message: 'League of Legends account not found for this Riot ID.' };
        }
        console.error(`Error fetching League account: ${response.status} - ${data?.status?.message || 'Unknown error'}`);

        return { ok: false, message: GENERIC_ERROR };
    }

    const entries = Array.isArray(data) ? data : [];
    const best = pickRankedEntry(entries);

    if (!best) {
        return {
            ok: true,
            rank: { queue: null, tier: 'UNRANKED', division: null, leaguePoints: 0, lp: 0, override: true }
        };
    }

    const { queue, entry, lp } = best;

    return {
        ok: true,
        rank: {
            queue,
            tier: entry.tier,
            division: entry.rank,
            leaguePoints: entry.leaguePoints,
            lp,
            override: false
        }
    };
}

module.exports = { accountByRiotId, leagueRankByPuuid, toLadderScore, pickRankedEntry };
