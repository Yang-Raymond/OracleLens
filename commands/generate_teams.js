/**
 * @file generate_teams.js
 * @description Slash command to pull 10 players from the invoker's voice channel,
 * calculate balanced-but-random teams with role assignments, and display the result.
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags
} = require('discord.js');

const {
    computeSkillScores,
    generateBalancedTeams,
    readUsers,
    readStats
} = require('../utilities/generateTeams');

/**
 * Builds the Discord embed displaying both teams, role assignments, and balance metrics.
 * 
 * @param {any} split - The selected split object containing teams, roles, and ba/lance stats.
 * @returns {EmbedBuilder}
 */
function buildTeamsEmbed(split) {
    const formatTeamList = (roleData) => {
        return roleData.assignments.map(a => {
            return `**${a.role}**: <@${a.player.discordId}> (${a.player.riotUsername})`;
        }).join('\n');
    };

    const team1Text = formatTeamList(split.roleA);
    const team2Text = formatTeamList(split.roleB);

    return new EmbedBuilder()
        .setTitle('League of Legends Custom Match — Teams')
        .setColor(0x5865F2)
        .addFields(
            {
                name: `Team 1 (Skill: ${split.teamASkill.toFixed(1)})`,
                value: team1Text,
                inline: true
            },
            {
                name: `Team 2 (Skill: ${split.teamBSkill.toFixed(1)})`,
                value: team2Text,
                inline: true
            }
        )
        .setFooter({
            text: `Skill Imbalance: ${split.skillImbalance.toFixed(1)} | Role Satisfaction: ${split.totalSatisfaction}/20`
        })
        .setTimestamp();
}

/**
 * Picks a random split from top-K candidates and randomly swaps team labels.
 * 
 * @param {Array<any>} topKSplits - Array of candidate splits.
 * @returns {any}
 */
function pickRandomSplit(topKSplits) {
    const chosenIndex = Math.floor(Math.random() * topKSplits.length);
    const chosenSplit = topKSplits[chosenIndex];

    const shouldSwap = Math.random() < 0.5;
    return {
        teamA: shouldSwap ? chosenSplit.teamB : chosenSplit.teamA,
        teamB: shouldSwap ? chosenSplit.teamA : chosenSplit.teamB,
        teamASkill: shouldSwap ? chosenSplit.teamBSkill : chosenSplit.teamASkill,
        teamBSkill: shouldSwap ? chosenSplit.teamASkill : chosenSplit.teamBSkill,
        roleA: shouldSwap ? chosenSplit.roleB : chosenSplit.roleA,
        roleB: shouldSwap ? chosenSplit.roleA : chosenSplit.roleB,
        skillImbalance: chosenSplit.skillImbalance,
        totalSatisfaction: chosenSplit.totalSatisfaction,
        combinedScore: chosenSplit.combinedScore
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate_teams')
        .setDescription('Generates 2 balanced-but-random teams of 5s from the current voice channel'),

    /**
     * Executes the generate_teams slash command.
     * 
     * @param {import('discord.js').ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const voiceChannel = interaction?.member?.voice?.channel;

        // 1. Validate voice channel presence
        if (!voiceChannel) {
            return interaction.reply({
                content: 'You must be in a voice channel to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        // 2. Fetch non-bot members
        const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);
        const memberIds = nonBotMembers.map(m => m.user.id);

        // 3. Validate exactly 10 players
        if (memberIds.length !== 10) {
            const detectedList = nonBotMembers.map(m => `• <@${m.user.id}>`).join('\n');
            return interaction.reply({
                content: `Found ${memberIds.length} player(s) in voice channel (need exactly 10):\n${detectedList.length > 0 ? detectedList : '• None'}`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 4. Compute skill scores & check linked accounts
        const users = readUsers();
        const stats = readStats();
        const scoreResult = computeSkillScores(memberIds, users, stats);

        if (scoreResult.missingUsers && scoreResult.missingUsers.length > 0) {
            const missingList = scoreResult.missingUsers.map(id => `• <@${id}>`).join('\n');
            return interaction.reply({
                content: `The following players have not linked their League accounts:\n${missingList}\n\nPlease use \`/link_league\` to link your accounts first.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 5. Generate balanced teams
        const { selectedSplit, topKSplits } = generateBalancedTeams(scoreResult.scoredPlayers);

        // 6. Build embed and reroll button
        const embed = buildTeamsEmbed(selectedSplit);
        const rerollButton = new ButtonBuilder()
            .setCustomId('reroll_teams')
            .setLabel('Reroll')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(rerollButton);

        // 7. Send public reply
        const response = await interaction.reply({
            embeds: [embed],
            components: [actionRow]
        });

        // 8. Attach component collector for rerolls (active for 15 minutes)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15 * 60 * 1000 // 15 minutes
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId !== 'reroll_teams') return;

            const newSplit = pickRandomSplit(topKSplits);
            const newEmbed = buildTeamsEmbed(newSplit);

            await buttonInteraction.update({
                embeds: [newEmbed],
                components: [actionRow]
            }).catch((error) => {
                console.error('Failed to update reroll interaction:', error);
            });
        });

        collector.on('end', async () => {
            // Disable the reroll button when collector expires
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reroll_teams')
                    .setLabel('Reroll')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );

            await interaction.editReply({
                components: [disabledRow]
            }).catch(() => {
            });
        });
    }
};
