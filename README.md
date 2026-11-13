# League of Legends Discord Bot

A simple Discord bot designed to track and analyze League of Legends scoreboard statistics.

## Features

- **Automated Scoreboard Analysis**: Post a screenshot of a League of Legends scoreboard, and the bot will automatically extract player stats.
- **Player Stats**: Retrieve comprehensive statistics for any player using the `/stats` command.
- **Leaderboards**: View top performers in categories like Kills, Deaths, Assists, Wins, and KA/D with the `/leaderboard` command.
- **Data Storage**: Local persistent storage in `stats.json`.

---

## Setup Instructions

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v16.11.0 or higher)
- A Discord Bot Token (from the [Discord Developer Portal](https://discord.com/developers))
- A Google Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
APPLICATION_ID=your_application_id
CHANNEL_ID=your_target_channel_id
GEMINI_API_KEY=your_gemini_api_key
```

- **DISCORD_BOT_TOKEN**: Your bot's secret token.
- **APPLICATION_ID**: Your Discord Application ID (found in General Information).
- **CHANNEL_ID**: The ID of the channel where the bot should listen for scoreboard images.
- **GEMINI_API_KEY**: Your Google Gemini API key for image analysis.

### 4. Deploy Commands

Before running the bot, you must register the slash commands with Discord:

```bash
node deploy-commands.js
```

### 5. Running the Bot

Start the bot using Node:

```bash
node index.js
```

---

## How to Use

1. **Track Stats**: Simply upload a screenshot of a League of Legends scoreboard in the designated Discord channel. The bot will process the image and ask for confirmation before updating the stats.
2. **View Stats**: Use `/stats username:[name]` to see a player's historical data.
3. **Check Leaderboards**: Use `/leaderboard category:[category]` to see the top 10 players in various categories.
4. **Download Data**: Admins can use `/downloadstats` to get a JSON copy of the current statistics.

Oracle Lens isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

