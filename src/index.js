const { Hooks } = require("aa-hooks");

const bootstrap = require("./bootstrap.js");

const { tradeHandler } = require("./handlers/tradeHandler.js");
const { stakeHandler } = require("./handlers/stakeHandler.js");
const { poolListedHandler, poolListedHandlerNotification } = require("./handlers/poolListedHandler.js");
const { poolVotesHandler } = require("./handlers/poolVotesHandler.js");
const { paramCommitHandler } = require("./handlers/paramCommitHandler.js");
const { paramVotesHandler } = require("./handlers/paramVotesHandler.js");
const { moveHandler } = require("./handlers/moveHandler.js");
const { unstakeHandler } = require("./handlers/unstakeHandler.js");
const { withdrawRewardHandler } = require("./handlers/withdrawRewardHandler.js");

bootstrap().then(async () => {
  require("./webserver");

  const allEventsHooks = new Hooks([process.env.AA_ADDRESS]);

  allEventsHooks.register(tradeHandler)
    .isSuccess()
    .responseContainsKey("price")
    .responseContainsKey("coef_multiplier")
    .responseContainsKey("swap_fee")
    .responseContainsKey("fee%");

  allEventsHooks.register(poolListedHandler)
    .isSuccess()
    .triggerDataContainsKey("vote_whitelist")
    .triggerDataContainsKey("pool_asset")
    .responseContainsKey("message")

  allEventsHooks.register(poolListedHandler)
    .isSuccess()
    .triggerDataContainsKey("vote_blacklist")
    .triggerDataContainsKey("pool_asset")
    .responseContainsKey("message")

  // keeps track of new events
  const newEventsHooks = new Hooks([process.env.AA_ADDRESS], { newEventsOnly: true });

  if (process.env.DISCORD_EVENT_MOVE_VOTES) {
    newEventsHooks.register(moveHandler)
      .isSuccess()
      .triggerDataContainsKey("changes")
      .triggerDataContainsKey("vote_shares")
  }

  if (process.env.DISCORD_EVENT_STAKE_TOKEN) {
    newEventsHooks.register(stakeHandler)
      .isSuccess()
      .triggerDataContainsKey("stake")
      .triggerDataContainsKey("term")
      .triggerDataContainsKey("group_key")
      .triggerDataContainsKey("percentages")
      .responseContainsKey("total_staked_balance");
  }

  if (process.env.DISCORD_EVENT_POOL_VOTES) {
    newEventsHooks.register(poolVotesHandler)
      .isSuccess()
      .triggerDataContainsKey("pool_asset")
      .not.responseContainsKey("message");
  }

  if (process.env.DISCORD_EVENT_PARAM_COMMIT) {
    newEventsHooks.register(paramCommitHandler)
      .isSuccess()
      .triggerDataContainsKey("vote_value")
      .triggerDataContainsKey("name")
      .triggerDataContainsKey("value")
      .responseContainsKey("committed");
  }

  if (process.env.DISCORD_EVENT_PARAM_VOTES) {
    newEventsHooks.register(paramVotesHandler)
      .isSuccess()
      .triggerDataContainsKey("vote_value")
      .triggerDataContainsKey("name")
      .triggerDataContainsKey("value")
      .not.responseContainsKey("committed");
  }

  if (process.env.DISCORD_EVENT_UNSTAKE_TOKEN) {
    newEventsHooks.register(unstakeHandler)
      .isSuccess()
      .triggerDataContainsKey("unstake")
      .triggerDataContainsKey("group_key")
  }

  if (process.env.DISCORD_EVENT_POOL_LISTED) {
    newEventsHooks.register(poolListedHandlerNotification)
      .isSuccess()
      .triggerDataContainsKey("vote_whitelist")
      .triggerDataContainsKey("pool_asset")
      .responseContainsKey("message")
  }

  if (process.env.DISCORD_EVENT_POOL_LISTED) {
    newEventsHooks.register(poolListedHandlerNotification)
      .isSuccess()
      .triggerDataContainsKey("vote_blacklist")
      .triggerDataContainsKey("pool_asset")
      .responseContainsKey("message")
  }

  if (process.env.DISCORD_EVENT_WITHDRAW_REWARDS) {
    newEventsHooks.register(withdrawRewardHandler)
      .isSuccess()
      .triggerDataContainsKey("withdraw_staking_reward")
  }
});
