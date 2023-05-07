exports.bServeAsHub = false;
exports.bLight = true;
exports.bNoPassphrase = true;

exports.testnet = process.env.testnet == "1";
exports.hub = process.env.testnet ? "obyte.org/bb-test" : "obyte.org/bb";

exports.project_db_prefix = "OSWAP_TOKEN_STATS";
exports.discord_bot_name = "OSWAP TOKEN";
exports.discord_primary_color = "#295eff";
exports.discord_error_color = "#FF1519";

exports.discord_withdraw_reward_min_tracking_amount = 0.005;
console.error("finished server conf");
