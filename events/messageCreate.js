/**
 * @file messageCreate.js
 * @description Event handler for when a message is created.
 * Checks for image attachments in a specific channel, analyzes them for League of Legends scoreboard data,
 * and updates player statistics.
 */

require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs').promises;
const { LeagueScoreboardAnalyzer } = require('../utilities/imageAnalyzer.js');
const { updateStats } = require('../utilities/updateStats.js');

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

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
            // Reject oversized files
            if (attachment.size > MAX_IMAGE_SIZE) {
                await message.reply('Image is too large (max 10 MB). Please upload a smaller image.');
                continue;
            }

            // Use a random UUID filename to prevent path traversal attacks
            const ext = path.extname(attachment.name || '.jpg').replace(/[^a-zA-Z0-9.]/g, '');
            const safeFilename = `${crypto.randomUUID()}${ext}`;
            const imagePath = path.join(__dirname, '..', 'image', safeFilename);

            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());

                await fs.writeFile(imagePath, buffer);

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
            } catch (error) {
                console.error('Error processing image attachment:', error);
                await message.reply('An error occurred while processing the image. Please try again.').catch(() => {});
            } finally {
                // Clean up temp file if it still exists (imageAnalyzer also tries to delete it)
                await fs.unlink(imagePath).catch(() => {});
            }
        }
    },
};