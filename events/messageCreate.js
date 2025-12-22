require('dotenv').config();
const { Events } = require('discord.js');
const fs = require('fs');
const { LeagueScoreboardAnalyzer } = require('../utilities/imageAnalyzer.js');
const { updateStats } = require('../utilities/updateStats.js');

module.exports = {
    name: Events.MessageCreate,
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
                updateStats(analysisResponse);
                message.send(`Image processed and stats updated!`);
            }

            message.send(`Image can't be processed. Please ensure it's a clear League of Legends scoreboard.`);
        }
    },
};