/**
 * @file jsonStore.js
 * @description Shared helpers for reading and updating JSON files.
 * Uses a per-path in-process lock to prevent race conditions on concurrent writes
 * and atomic writes (temp file + rename) so a crash never leaves a half-written file.
 */

const fs = require('fs');
const path = require('path');

// Per-path lock chains so each file is serialized but different files do not block each other
const locks = new Map();

/**
 * Reads and parses a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Object} The parsed object, or {} if the file does not exist. Throws on read/parse errors.
 */
function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Atomically writes data to a file (temp file in same dir + rename).
 * @param {string} target - Destination file path.
 * @param {string} data - Contents to write.
 */
function atomicWrite(target, data) {
    const tmp = path.join(path.dirname(target), `${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);

    try {
        fs.writeFileSync(tmp, data, 'utf8');
        fs.renameSync(tmp, target);
    } catch (err) {
        fs.rmSync(tmp, { force: true });
        throw err;
    }
}

/**
 * Performs a serialized read-modify-write on a JSON file.
 * A corrupt file makes this reject without overwriting it.
 * @param {string} filePath - Path to the JSON file.
 * @param {(data: Object) => void} mutate - Mutates the parsed object in place.
 * @returns {Promise<Object>} The updated object (rejects on failure).
 */
function updateJson(filePath, mutate) {
    const previous = locks.get(filePath) || Promise.resolve();
    const result = previous.then(() => {
        const data = readJson(filePath);
        mutate(data);
        atomicWrite(filePath, JSON.stringify(data, null, 4));
        return data;
    });

    locks.set(filePath, result.catch(() => {}));
    return result;
}

module.exports = { readJson, updateJson };
