/**
 * Allow users to download stats.json file
 */

const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '..', 'stats.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('downloadstats')
        .setDescription('Downloads the stats file.'),
    async execute(interaction) {
        if (!fs.existsSync(statsPath)) {
            return interaction.reply({ content: 'No stats file exists yet.', flags: MessageFlags.Ephemeral });
        }
        const file = new AttachmentBuilder(statsPath, { name: 'stats.json' });
        await interaction.reply({ files: [file], flags: MessageFlags.Ephemeral });
    }
};