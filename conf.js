exports.bServeAsHub = false;
exports.bLight = true;
exports.bNoPassphrase = true;

exports.testnet = process.env.testnet == "1";
exports.hub = process.env.testnet ? "obyte.org/bb-test" : "obyte.org/bb";

exports.project_db_prefix = "OSWAP_TOKEN_STATS";

console.error("finished server conf");
