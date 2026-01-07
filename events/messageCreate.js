/**
 * @file messageCreate.js
 * @description Event handler for when a message is created.
 * Checks for image attachments in a specific channel, analyzes them for League of Legends scoreboard data,
 * and updates player statistics.
 */

require('dotenv').config();
const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const { LeagueScoreboardAnalyzer } = require('../utilities/imageAnalyzer.js');
const path = require('path');
const { updateStats } = require('../utilities/updateStats.js');

module.exports = {
    name: Events.MessageCreate,
    /**
     * Executes the message create event.
     * @param {import('discord.js').Message} message - The message object.
     */
    async execute(message) {
        if (message.author.bot) return;
        if (message.channel.id !== process.env.CHANNEL_ID) return;

        // Check if there is at least one image attachment
        const imageAttachments = message.attachments.filter(att =>
            att.contentType && att.contentType.startsWith('image/')
        );

        if (imageAttachments.size === 0) return; // No image found

        for (const attachment of imageAttachments.values()) {
            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            const imagePath = `./image/${attachment.name}`;

            fs.writeFileSync(imagePath, buffer);

            const analysisResponse = await LeagueScoreboardAnalyzer(imagePath);

            // Skip if the image couldn't be analyzed
            if (analysisResponse) {
                const confirmBtn = new ButtonBuilder().setCustomId('confirm').setLabel('Update').setStyle(ButtonStyle.Success);
                const cancelBtn = new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

                const reply = await message.reply({ 
                    content: `Image processed! Please confirm to update stats.\n${JSON.stringify(analysisResponse)}`, 
                    components: [row] 
                });

                const filter = i => (i.customId === 'confirm' || i.customId === 'cancel') && i.user.id === message.author.id;

                try {
                    const confirmation = await reply.awaitMessageComponent({ filter, time: 60000 });

                    if (confirmation.customId === 'confirm') {
                        updateStats(analysisResponse);
                        await confirmation.update({ content: 'Stats have been updated successfully!', components: [] });
                    } else if (confirmation.customId === 'cancel') {
                        await confirmation.update({ content: 'Operation cancelled. Stats were not updated.', components: [] });
                    }
                } catch (e) {
                    await reply.edit({ content: 'Confirmation timed out. Stats were not updated.', components: [] });
                }

            } else {
                await message.reply(`Image can't be processed. Please ensure it's a clear League of Legends scoreboard.`);
            }
        }
    },
};