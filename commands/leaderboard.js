const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

/**
 * Leaderboard command module.
 * Allows users to view top 10 rankings for various statistics including
 * raw stats (Kills, Deaths, Assists) and calculated stats (Win Rate, KA/D).
 */
module.exports = {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('Displays the top 10 in selected category').addStringOption(option =>
        option.setName('category')
            .setDescription('The category to display')
            .setRequired(true)
            .addChoices(
                { name: 'Kills', value: 'kills' },
                { name: 'Deaths', value: 'deaths' },
                { name: 'Assists', value: 'assists' },
                { name: 'Wins', value: 'wins' },
                { name: 'Losses', value: 'losses' },
                { name: 'Win Rate', value: 'winRate' },
                { name: 'KA/D', value: 'kaD' },
                { name: 'Games Played', value: 'gamesPlayed' }
            )),

    /**
     * Executes the leaderboard command.
     * 
     * Reads stats from 'stats.json', calculates derived metrics (Win Rate, KA/D, Games Played),
     * sorts the players based on the selected category, and replies with the top 10 list.
     * 
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        const category = interaction.options.getString('category');
        const stats = JSON.parse(fs.readFileSync('stats.json'));

        const processedStats = stats.map(player => {
            const totalGames = player.wins + player.losses;
            return {
                ...player,
                winRate: totalGames > 0 ? (player.wins / totalGames) * 100 : 0,
                kaD: player.deaths > 0 ? (player.kills + player.assists) / player.deaths : (player.kills + player.assists),
                gamesPlayed: totalGames
            };
        });

        const sorted = [...processedStats].sort((a, b) => b[category] - a[category]);
        const topPlayers = sorted.slice(0, 10);

        let response = `### Top 10 in ${category === 'kaD' ? 'KA/D' : category === 'winRate' ? 'Win Rate' : category === 'gamesPlayed' ? 'Games Played' : category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        topPlayers.forEach((player, index) => {
            let value = player[category];
            if (category === 'winRate') value = `${value.toFixed(2)}%`;
            else if (category === 'kaD') value = value.toFixed(2);
            else if (category === 'gamesPlayed') value = value;

            response += `${index + 1}. **${player.username}**: ${value}\n`;
        });

        await interaction.reply(response);
    }
}