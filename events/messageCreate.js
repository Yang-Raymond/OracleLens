/**
 * @file messageCreate.js
 * @description Event handler for when a message is created.
 * Checks for image attachments in a specific channel, analyzes them for League of Legends scoreboard data,
 * and updates player statistics.
 */

require('dotenv').config();
const { Events } = require('discord.js');
const fs = require('fs');
const { LeagueScoreboardAnalyzer } = require('../utilities/imageAnalyzer.js');
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
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                const imagePath = `./image/${attachment.name}`;

                fs.writeFileSync(imagePath, buffer);

                const analysisResponse = await LeagueScoreboardAnalyzer(imagePath);

                // Skip if the image couldn't be analyzed
                if (analysisResponse) {
                    updateStats(analysisResponse);
                    await message.reply(`Image processed and stats updated! Please check if stats are correct. If not contact Ricky Lao.\n${JSON.stringify(analysisResponse)}`);
                } else {
                    await message.reply(`Image can't be processed. Please ensure it's a clear League of Legends scoreboard.`);
                }
            } catch (error) {
                console.error('Error processing image:', error);
                if (error.code === 50013) {
                    console.error('Missing Permissions: Please ensure the bot has "Send Messages" and "View Channel" permissions in the channel.');
                }
            }
        }
    },
};