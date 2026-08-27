/**
 * @file stats.js
 * @description Slash command to retrieve and display player statistics.
 */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '..', 'stats.json');

/**
 * Reads and parses the stats.json file fresh each time.
 * @returns {Record<string, Object>} The parsed stats object.
 */
function readStats() {
    try {
        const data = fs.readFileSync(statsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading stats.json:', error);
        return {};
    }
}

module.exports = {
    /**
     * The data for the slash command.
     * @type {SlashCommandBuilder}
     */
    data: new SlashCommandBuilder().setName('stats').setDescription('Get player\'s stats!').addStringOption(option =>
        option.setName('username')
            .setDescription('The username of the player')
            .setRequired(true)
            .setAutocomplete(true)),


    /**
     * Handles autocomplete interactions for the username option.
     * Filters the list of available usernames based on the user's current input.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction.
     */
    async autocomplete(interaction) {
        const stats = readStats();
        const focusedValue = interaction.options.getFocused();
        const filtered = Object.keys(stats)
            .filter((choice) => choice.toLowerCase().startsWith(focusedValue.toLowerCase()))
            .slice(0, 25);
        await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
    },

    /**
     * Executes the stats command.
     * Retrieves player data from the stats file, calculates derived statistics (Winrate, KDA),
     * and sends a formatted reply to the user.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        const stats = readStats();
        const username = interaction.options.getString('username');

        const playerKey = Object.keys(stats).find(key => key.toLowerCase() === username.toLowerCase().trim());
        const player = playerKey ? stats[playerKey] : null;

        if (!player) {
            await interaction.reply(`Player **${username}** not found.`);
            return;
        }

        const gamesPlayed = player.wins + player.losses;
        const winrate = gamesPlayed > 0 ? (player.wins / gamesPlayed * 100).toFixed(2) : 0;
        const kad = player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(2) : 'Perfect';

        await interaction.reply(`Stats for **${playerKey}**:\nWins: ${player.wins}\nLosses: ${player.losses}\nGames Played: ${gamesPlayed}\nWinrate: ${winrate}%\nKills: ${player.kills}\nDeaths: ${player.deaths}\nAssists: ${player.assists}\nKA/D: ${kad}`);
    }
}