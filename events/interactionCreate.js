/**
 * @file interactionCreate.js
 * @description Event handler for when an interaction is created (e.g., slash command).
 */

const { Events, MessageFlags } = require('discord.js');
const { accountByRiotId, leagueRankByPuuid } = require('../utilities/riotService.js');
const {
	linkUser,
	isLinked,
	isAccountTaken,
	AlreadyLinkedError,
	AccountTakenError,
	ALREADY_LINKED_MESSAGE,
	ACCOUNT_TAKEN_MESSAGE
} = require('../utilities/updateUsers.js');

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
				
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					}).catch((e) => console.error('Failed to send error followUp:', e));
				} else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					}).catch((e) => console.error('Failed to send error reply:', e));
				}
			}
		} else if (interaction.isAutocomplete()) { // Handle autocomplete interactions
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
		} else if (interaction.isModalSubmit()) { // Handle modal submit interactions
			if (interaction.customId === 'LinkRiot') {
				try {
					await handleLinkRiot(interaction);
				} catch (error) {
					console.error('Error handling LinkRiot modal:', error);
					if (interaction.deferred && !interaction.replied) {
						await interaction.editReply({ content: 'Something went wrong, please try again later.' })
							.catch((e) => console.error('Failed to send LinkRiot error reply:', e));
					}
				}
			}
		}
	}
};

/**
 * Handles the LinkRiot modal: looks up the Riot account and saves it to users.json.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleLinkRiot(interaction) {
	const riotUsername = interaction.fields.getTextInputValue('riotUsernameInput');
	const riotHashtag = interaction.fields.getTextInputValue('riotHashtagInput');

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	if (isLinked(interaction.user.id)) {
		await interaction.editReply({ content: ALREADY_LINKED_MESSAGE });
		return;
	}

	const result = await accountByRiotId(riotUsername, riotHashtag);

	if (!result.ok) {
		await interaction.editReply({ content: result.message });
		return;
	}

	const { puuid, gameName } = result.account;

	if (isAccountTaken(puuid, interaction.user.id)) {
		await interaction.editReply({ content: ACCOUNT_TAKEN_MESSAGE });
		return;
	}

	const rankResult = await leagueRankByPuuid(puuid);

	if (!rankResult.ok) {
		await interaction.editReply({ content: rankResult.message });
		return;
	}

	const { rank } = rankResult;

	try {
		await linkUser(interaction.user.id, {
			discord_username: interaction.user.username,
			riot_username: `${gameName}`,
			puuid,
			lp: rank.lp,
			override: rank.override
		});
	} catch (error) {
		if (error instanceof AlreadyLinkedError || error instanceof AccountTakenError) {
			await interaction.editReply({ content: error.message });
			return;
		}

		console.error('Failed to save Riot link:', error);
		await interaction.editReply({ content: "Couldn't save your link, please try again later." });
		return;
	}

	const rankText = rank.queue
		? `${rank.tier} ${rank.division} ${rank.leaguePoints} LP (${rank.queue === 'SOLO' ? 'Solo/Duo' : 'Flex'})`
		: 'Unranked';

	await interaction.editReply({ content: `${riotUsername}#${riotHashtag} linked successfully to you. Rank: ${rankText}` });
}
