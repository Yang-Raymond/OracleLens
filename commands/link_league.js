/**
 * @file link_league.js
 * @description Slash command to link a League of Legends summoner name and role preferences
 * (primary and secondary roles) to a user's Discord account.
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'users.json');

/**
 * Reads and parses the users.json file fresh each time.
 * If the file does not exist, creates it with an empty object.
 * @returns {Record<string, Object>} The parsed users object.
 */
function readUsers() {
    // Missing file => empty; read/parse error => throw (never overwrite a corrupt file)
    if (!fs.existsSync(usersPath)) {
        return {};
    }
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
}

/**
 * Writes the users object to users.json with formatting.
 * @param {Record<string, Object>} users - The object of user records to persist.
 */
function writeUsers(users) {
    const tmp = `${usersPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(users, null, 4));
    fs.renameSync(tmp, usersPath);
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
                .setMaxLength(32)
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
        const leagueUsername = interaction.options.getString('league_username').trim();
        const preferredRole = interaction.options.getString('preferred_role');
        const secondaryRole = interaction.options.getString('secondary_role').trim().toUpperCase();

        if (leagueUsername.length === 0) {
            return interaction.reply({ content: 'League username cannot be empty.', flags: MessageFlags.Ephemeral });
        }

        if (!ROLES.some(role => role.value === secondaryRole)) {
            return interaction.reply({ content: 'Invalid secondary role. Choose one of: TOP, JUNGLE, MID, ADC, SUPP.', flags: MessageFlags.Ephemeral });
        }

        // Disallow selecting the same role for primary and secondary
        if (preferredRole === secondaryRole) {
            return interaction.reply({ content: 'Secondary role cannot be the same as your preferred role.', flags: MessageFlags.Ephemeral });
        }

        const users = readUsers();

        // Prevent linking if the League username is already claimed by a different Discord user
        const isClaimed = Object.entries(users).some(
            ([uid, user]) => typeof user?.riot_username === 'string' && user.riot_username.trim().toLowerCase() === leagueUsername.toLowerCase() && uid !== interaction.user.id
        );
        if (isClaimed) {
            return interaction.reply({ content: 'This league account is already linked to another discord account.', flags: MessageFlags.Ephemeral });
        }

        // If the Discord user already exists, update their linked League account and roles
        if (users[interaction.user.id]) {
            users[interaction.user.id].discord_username = interaction.user.username;
            users[interaction.user.id].riot_username = leagueUsername;
            users[interaction.user.id].preferred_role = preferredRole;
            users[interaction.user.id].secondary_role = secondaryRole;

            writeUsers(users);
            return interaction.reply({ content: 'Successfully updated your league account!', flags: MessageFlags.Ephemeral });
        }

        // If new user, create and set their record
        users[interaction.user.id] = {
            discord_username: interaction.user.username,
            riot_username: leagueUsername,
            preferred_role: preferredRole,
            secondary_role: secondaryRole
        };

        writeUsers(users);

        await interaction.reply({ content: 'Successfully linked your league account!', flags: MessageFlags.Ephemeral });
    }
};