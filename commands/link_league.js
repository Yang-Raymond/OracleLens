/**
 * @file link_league.js
 * @description Slash command to link a League of Legends summoner name and role preferences
 * (primary and secondary roles) to a user's Discord account.
 */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'users.json');

/**
 * Reads and parses the users.json file fresh each time.
 * If the file does not exist, creates it with an empty array.
 * @returns {Array<Object>} The parsed users array.
 */
function readUsers() {
    try {
        if (!fs.existsSync(usersPath)) {
            fs.writeFileSync(usersPath, JSON.stringify([], null, 4));
            return [];
        }
        const data = fs.readFileSync(usersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users.json:', error);
        return [];
    }
}

/**
 * Writes the users array to users.json with formatting.
 * @param {Array<Object>} users - The array of user objects to persist.
 */
function writeUsers(users) {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 4));
}

/**
 * List of available League of Legends roles.
 * Used for role choice definitions and autocomplete filtering.
 * @type {Array<{name: string, value: string}>}
 */
const ROLES = [
    { name: 'TOP', value: 'TOP' },
    { name: 'JUNGLE', value: 'JUNGLE' },
    { name: 'MID', value: 'MID' },
    { name: 'ADC', value: 'ADC' },
    { name: 'SUPP', value: 'SUPP' }
];

module.exports = {
    /**
     * Slash command registration schema and option configuration.
     * @type {SlashCommandBuilder}
     */
    data: new SlashCommandBuilder()
        .setName('link_league')
        .setDescription('Link your league account to your discord account and set your preferred role')
        .addStringOption(option =>
            option.setName('league_username')
                .setDescription('The username of the player')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('preferred_role')
                .setDescription('The preferred role of the player')
                .setRequired(true)
                .addChoices(
                    { name: 'TOP', value: 'TOP' },
                    { name: 'JUNGLE', value: 'JUNGLE' },
                    { name: 'MID', value: 'MID' },
                    { name: 'ADC', value: 'ADC' },
                    { name: 'SUPP', value: 'SUPP' }
                )
        )
        .addStringOption(option =>
            option.setName('secondary_role')
                .setDescription('The secondary role of the player')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    /**
     * Handles autocomplete interactions for the secondary role option.
     * Dynamically filters out the role already selected in 'preferred_role'
     * and filters remaining choices by whatever text the user has typed.
     * 
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction.
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const preferredRole = interaction.options.getString('preferred_role');

        // Exclude the role currently selected as preferred role and filter by typed prefix
        const availableRoles = ROLES
            .filter(role => role.value !== preferredRole)
            .filter(role => role.name.toLowerCase().startsWith(focusedValue));

        await interaction.respond(availableRoles);
    },

    /**
     * Executes the link_league command.
     * Validates that primary and secondary roles differ, ensures the League account
     * isn't claimed by someone else, and creates or updates the user entry in users.json.
     * 
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The chat input interaction.
     */
    async execute(interaction) {
        const leagueUsername = interaction.options.getString('league_username');
        const preferredRole = interaction.options.getString('preferred_role');
        const secondaryRole = interaction.options.getString('secondary_role');

        // Disallow selecting the same role for primary and secondary
        if (preferredRole === secondaryRole) {
            return interaction.reply({ content: 'Secondary role cannot be the same as your preferred role.', ephemeral: true });
        }

        const users = readUsers();

        // Prevent linking if the League username is already claimed by a different Discord user
        if (users.find(user => user.riot_username === leagueUsername && user.discord_uid !== interaction.user.id)) {
            return interaction.reply({ content: 'This league account is already linked to another discord account.', ephemeral: true });
        }

        // If the Discord user already exists, update their linked League account and roles
        const existingUser = users.find(user => user.discord_uid === interaction.user.id);
        if (existingUser) {
            existingUser.riot_username = leagueUsername;
            existingUser.preferred_role = preferredRole;
            existingUser.secondary_role = secondaryRole;
            writeUsers(users);
            return interaction.reply({ content: 'Successfully updated your league account!', ephemeral: true });
        }

        // If new user, create and append their record
        users.push({
            discord_uid: interaction.user.id,
            discord_username: interaction.user.username,
            riot_username: leagueUsername,
            preferred_role: preferredRole,
            secondary_role: secondaryRole
        });

        writeUsers(users);

        await interaction.reply({ content: 'Successfully linked your league account!', ephemeral: true });
    }
};