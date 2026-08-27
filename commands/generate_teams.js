/**
 * Generates 2 random balanced teams of 5s from players in a specific vc
 */

const { SlashCommandBuilder } = require('discord.js');
const { formTeams } = require('../utilities/generateTeams');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate_teams')
        .setDescription('Generates 2 random balanced teams of 5s'),
    async execute(interaction) {
        const currentVoiceChannel = interaction?.member?.voice?.channel;

        if (!currentVoiceChannel) {
            await interaction.reply("You must be in a voice channel to use this command");
            return;
        }

        const members = currentVoiceChannel.members;
        const memberNames = members.map(m => m.user.id);

        formTeams(memberNames);

        await interaction.reply("Hello");
    }
}
