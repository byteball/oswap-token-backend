const { DbService } = require("./db");
const discordService = require("./discord/index.js");

module.exports = async () => {
  // Checking environment variables

  if (!process.env.AA_ADDRESS) {
    throw Error(
      "Please specify the agent's address in the environment variables"
    );
  }

  if (process.env.DISCORD_CHANNEL && process.env.DISCORD_APP_ID && process.env.DISCORD_GUILD_ID && process.env.DISCORD_TOKEN) {
    discordService.login();

    await discordService.initCommands();
  } else if (
    process.env.DISCORD_EVENT_MOVE_VOTES
    || process.env.DISCORD_EVENT_PARAM_COMMIT
    || process.env.DISCORD_EVENT_PARAM_VOTES
    || process.env.DISCORD_EVENT_POOL_LISTED
    || process.env.DISCORD_EVENT_POOL_VOTES
    || process.env.DISCORD_EVENT_STAKE_TOKEN
    || process.env.DISCORD_EVENT_UNSTAKE_TOKEN
    || process.env.DISCORD_EVENT_WITHDRAW_REWARDS
  ) {
    throw Error(
      "Please specify environment variables for discord"
    );
  }


  await DbService.create();
};
