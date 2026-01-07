/**
 * @file interactionCreate.js
 * @description Event handler for when an interaction is created (e.g., slash command).
 */

const { Events, MessageFlags } = require('discord.js');
const { updateStats } = require('../utilities/updateStats.js');

module.exports = {
	name: Events.InteractionCreate,
	/**
	 * Executes the interaction create event.
	 * Handles both Chat Input Commands and Autocomplete interactions.
	 * @param {import('discord.js').Interaction} interaction - The interaction object.
	 */
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				// Check if the interaction has already been replied to or deferred
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					});
				}
			}
		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
		} else if (interaction.isButton()) {
			if (interaction.customId === 'confirm') {
				updateStats();
				await interaction.update({ content: 'Stats have been updated successfully!', components: [] });
			} else if (interaction.customId === 'cancel') {
				await interaction.update({ content: 'Operation cancelled. Stats were not updated.', components: [] });
			}
		}
	}

};