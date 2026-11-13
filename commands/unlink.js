/**
 * @file unlink.js
 * @description Slash command that removes the caller's Riot account link from users.json.
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { unlinkUser } = require('../utilities/updateUsers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your Riot account from your Discord.'),
        
    /**
     * Deletes only the caller's users.json entry.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        let removed;

        try {
            removed = await unlinkUser(interaction.user.id);
        } catch (error) {
            console.error('Failed to unlink Riot account:', error);
            return interaction.reply({ content: "Couldn't unlink your account, please try again later.", flags: MessageFlags.Ephemeral });
        }

        const content = removed ? 'Your Riot account has been unlinked.' : "You don't have a linked Riot account.";
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
};
