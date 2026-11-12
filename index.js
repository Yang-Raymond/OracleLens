/**
 * @file index.js
 * @description Main entry point for the Discord bot.
 * Initializes the client, loads commands and events, and logs in to Discord.
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');

/**
 * The Discord client instance.
 * @type {Client}
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates],
    allowedMentions: { parse: [] }
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

// Load commands
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

// Load events
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    const handler = async (...args) => {
        try {
            await event.execute(...args);
        } catch (error) {
            console.error(`Error in event handler ${event.name}:`, error);
        }
    };
    if (event.once) {
        client.once(event.name, handler);
    } else {
        client.on(event.name, handler);
    }
}

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

client.login(process.env.DISCORD_BOT_TOKEN);