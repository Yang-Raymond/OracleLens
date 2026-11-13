/**
 * @file link_league.js
 * @description Slash command to link a Riot Games account to a Discord user.
 */

const { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isLinked, ALREADY_LINKED_MESSAGE } = require('../utilities/updateUsers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link_league')
        .setDescription('Link your Riot Games account to your Discord.'),
    async execute(interaction) {
        if (isLinked(interaction.user.id)) {
            await interaction.reply({ content: ALREADY_LINKED_MESSAGE, flags: MessageFlags.Ephemeral });
            return;
        }

        const modal = new ModalBuilder().setCustomId('LinkRiot').setTitle('Link Riot Account');

        const riotUsernameInput = new TextInputBuilder()
            .setCustomId('riotUsernameInput')
            .setMinLength(3)
            .setMaxLength(16)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your Riot username')
            .setRequired(true);

        const riotUsernameLabel = new LabelBuilder()
            .setLabel('Riot Username')
            .setDescription('Your Riot Games username')
            .setTextInputComponent(riotUsernameInput);

        const riotHashtagInput = new TextInputBuilder()
            .setCustomId('riotHashtagInput')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your Riot hashtag (exclude the # symbol) eg. NA1')
            .setRequired(true);

        const riotHashtagLabel = new LabelBuilder()
            .setLabel('Riot Hashtag (Exclude the # symbol)')
            .setDescription('Your Riot Games hashtag')
            .setTextInputComponent(riotHashtagInput);

        modal.addLabelComponents(riotUsernameLabel);
        modal.addLabelComponents(riotHashtagLabel);

        await interaction.showModal(modal);
    }
}
