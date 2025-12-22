/**
 * @file ready.js
 * @description Event handler for when the client is ready.
 */

const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	/**
	 * Executes the ready event.
	 * @param {import('discord.js').Client} client - The Discord client.
	 */
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};