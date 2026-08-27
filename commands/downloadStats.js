/**
 * Allow users to download stats.json file
 */

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('downloadstats')
        .setDescription('Downloads the stats file.'),
    async execute(interaction) {
        const file = new AttachmentBuilder('./stats.json');
        await interaction.reply({ files: [file], ephemeral: true });
    }
};