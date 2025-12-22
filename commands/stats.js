/**
 * @file stats.js
 * @description Slash command to retrieve and display player statistics.
 */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    /**
     * The data for the slash command.
     * @type {SlashCommandBuilder}
     */
    data: new SlashCommandBuilder().setName('stats').setDescription('Get player\'s stats!').addStringOption(option =>
        option.setName('username')
            .setDescription('The username of the player')
            .setRequired(true)),
    
    /**
     * Executes the stats command.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        const stats = JSON.parse(fs.readFileSync('stats.json'));
        const username = interaction.options.getString('username');
        const player = stats.find(p => p.username.toLowerCase() === username.toLowerCase());
        
        if (player) {
            const gamesPlayed = player.wins + player.losses;
            const winrate = gamesPlayed > 0 ? (player.wins / gamesPlayed * 100).toFixed(2) : 0;
            const kad = player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(2) : 'Perfect';
            
            await interaction.reply(`Stats for **${player.username}**:\nWins: ${player.wins}\nLosses: ${player.losses}\nGames Played: ${gamesPlayed}\nWinrate: ${winrate}%\nKills: ${player.kills}\nDeaths: ${player.deaths}\nAssists: ${player.assists}\nKA/D: ${kad}`);
        } else {
            await interaction.reply(`Player **${username}** not found.`);
        }
    }
}