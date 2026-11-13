/**
 * @file updateUsers.js
 * @description Utility to link a Discord user to a Riot account in users.json.
 */

const path = require('path');
const { readJson, updateJson } = require('./jsonStore.js');

const usersPath = path.join(__dirname, '..', 'users.json');

const ALREADY_LINKED_MESSAGE = 'You already have a linked Riot account. Use /unlink first to link a different one.';
const ACCOUNT_TAKEN_MESSAGE = 'This Riot account is already linked to another Discord account.';

/** Thrown when a Discord user already has a linked Riot account. The message is user-facing. */
class AlreadyLinkedError extends Error {
    constructor(message = ALREADY_LINKED_MESSAGE) {
        super(message);
        this.name = 'AlreadyLinkedError';
    }
}

/** Thrown when a Riot account is already linked to a different Discord user. The message is user-facing. */
class AccountTakenError extends Error {
    constructor(message = ACCOUNT_TAKEN_MESSAGE) {
        super(message);
        this.name = 'AccountTakenError';
    }
}

/**
 * Checks whether a Discord user already has a linked Riot account.
 * @param {string} discordId - The Discord user ID.
 * @returns {boolean} True if the user is linked. Throws if users.json cannot be read/parsed.
 */
function isLinked(discordId) {
    const users = readJson(usersPath);
    return Object.hasOwn(users, discordId) && Boolean(users[discordId]?.puuid);
}

/**
 * Checks whether a Riot account is linked to a different Discord user.
 * @param {string} puuid - The Riot account PUUID.
 * @param {string} discordId - The Discord user ID asking (excluded from the check).
 * @returns {boolean} True if another Discord user owns the account. Throws if users.json cannot be read/parsed.
 */
function isAccountTaken(puuid, discordId) {
    const users = readJson(usersPath);
    return Object.keys(users).some(id => id !== discordId && users[id]?.puuid === puuid);
}

/**
 * Links a Discord user to a Riot account.
 * @param {string} discordId - The Discord user ID.
 * @param {{discord_username: string, riot_username: string, puuid: string, lp: number, override: boolean}} info - The account details.
 * @returns {Promise<Record<string, Object>>} The updated users object (rejects with AlreadyLinkedError, AccountTakenError, or on I/O failure).
 */
function linkUser(discordId, { discord_username, riot_username, puuid, lp, override }) {
    return updateJson(usersPath, users => {
        const existing = Object.hasOwn(users, discordId) ? users[discordId] : {};

        if (existing?.puuid) {
            throw new AlreadyLinkedError();
        }

        if (Object.keys(users).some(id => id !== discordId && users[id]?.puuid === puuid)) {
            throw new AccountTakenError();
        }

        Object.defineProperty(users, discordId, {
            value: { ...existing, discord_username, riot_username, puuid, lp, override, offset: existing.offset ?? 0, fetchedAt: new Date().toISOString() },
            enumerable: true,
            writable: true,
            configurable: true
        });
    });
}

/**
 * Removes a Discord user's link (their whole entry).
 * @param {string} discordId - The Discord user ID.
 * @returns {Promise<boolean>} True if an entry was removed, false if the user had none.
 */
async function unlinkUser(discordId) {
    let removed = false;

    await updateJson(usersPath, users => {
        if (Object.hasOwn(users, discordId)) {
            delete users[discordId];
            removed = true;
        }
    });

    return removed;
}

module.exports = {
    linkUser,
    unlinkUser,
    isLinked,
    isAccountTaken,
    AlreadyLinkedError,
    AccountTakenError,
    ALREADY_LINKED_MESSAGE,
    ACCOUNT_TAKEN_MESSAGE
};
