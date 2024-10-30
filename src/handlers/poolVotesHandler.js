const dag = require('aabot/dag.js');
const token_registry = require('aabot/token_registry.js');
const conf = require("ocore/conf.js");

const DiscordService = require("../discord");
const { getDataByTriggerUnit, getCurrentVpByNormalized } = require("../utils")

exports.poolVotesHandler = async (triggerUnit, responseObj) => {
    const { pool_asset, vote_whitelist, vote_blacklist } = getDataByTriggerUnit(triggerUnit);

    if (!vote_whitelist && !vote_blacklist) return;

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const userData = await dag.readAAStateVars(process.env.AA_ADDRESS, `user_${author}`).then(vars => vars[`user_${author}`]);
    const totalVp = await dag.readAAStateVars(process.env.AA_ADDRESS, `wl_votes_${pool_asset}`).then(vars => vars[`wl_votes_${pool_asset}`]);

    const currentVpView = +Number(getCurrentVpByNormalized(totalVp.vp) / 10 ** 9).toFixed(9)

    if (!userData) return;

    const currentUserVp = getCurrentVpByNormalized(userData.normalized_vp || 0);
    const currentUserVpView = +Number(currentUserVp / 10 ** 9).toFixed(9)

    const symbol = await token_registry.getSymbolByAsset(pool_asset);

    const objJoint = await dag.readJoint(pool_asset);

    const defMsg = objJoint.unit.messages.find(({ app }) => app === "definition");

    let address;

    if (defMsg) {
        address = defMsg.payload.definition[1]?.params?.pool_aa;
    }

    let name;

    if (!symbol && address) {
        const poolDef = await dag.readAADefinition(address);

        const xAsset = poolDef[1].params.x_asset;
        const yAsset = poolDef[1].params.y_asset;

        const xSymbol = await token_registry.getSymbolByAsset(xAsset) || (`${xAsset.slice(0, 5)}...`);
        const ySymbol = await token_registry.getSymbolByAsset(yAsset) || (`${yAsset.slice(0, 5)}...`);

        name = `${xSymbol}-${ySymbol}`;
    }

    const embed = new DiscordService.EmbedBuilder()
        .setColor(address ? conf.discord_primary_color : conf.discord_error_color)
        .setTitle(`Whitelist: voted ${vote_whitelist ? 'for' : 'against'}`)
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .addFields({ value: `**Vote VP:** ${currentUserVpView}`, name: ' ', inline: false })
        .addFields({ value: `**Current VP:** ${currentVpView}`, name: ' ', inline: false })
        .addFields({ value: `**Pool name:** [${address ? symbol || name : '`NOT AN OSWAP POOL`'}](${address ? `https://oswap.io/#/swap/${address}` : `https://explorer.obyte.org/asset/${pool_asset}`})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false  });

    DiscordService.send(embed);
}