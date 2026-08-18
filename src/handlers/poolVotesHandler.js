const dag = require('aabot/dag.js');
const conf = require("ocore/conf.js");

const DiscordService = require("../discord");
const { getDataByTriggerUnit, getCurrentVpByNormalized, getPoolAssetInfo, getUnitUrl, getAddressUrl, getAssetUrl } = require("../utils")

exports.poolVotesHandler = async (triggerUnit, responseObj) => {
    const { pool_asset, vote_whitelist, vote_blacklist } = getDataByTriggerUnit(triggerUnit);

    if (!vote_whitelist && !vote_blacklist) return;

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const userData = await dag.readAAStateVars(process.env.AA_ADDRESS, `user_${author}`).then(vars => vars[`user_${author}`]);

    if (!userData) return;

    // the var is absent until the first vote for this pool is counted
    const totalVp = await dag.readAAStateVars(process.env.AA_ADDRESS, `wl_votes_${pool_asset}`).then(vars => vars[`wl_votes_${pool_asset}`]);

    const currentVpView = +Number(getCurrentVpByNormalized(totalVp?.vp || 0) / 10 ** 9).toFixed(9)

    const currentUserVp = getCurrentVpByNormalized(userData.normalized_vp || 0);
    const currentUserVpView = +Number(currentUserVp / 10 ** 9).toFixed(9)

    const { symbol, name, address } = await getPoolAssetInfo(pool_asset);

    const embed = new DiscordService.EmbedBuilder()
        .setColor(address ? conf.discord_primary_color : conf.discord_error_color)
        .setTitle(`Whitelist: voted ${vote_whitelist ? 'for' : 'against'}`)
        .setTimestamp(ts * 1e3)
        .setURL(getUnitUrl(triggerUnit.unit))
        .addFields({ value: `**Author:** [${author}](${getAddressUrl(author)})`, name: ' ', inline: false })
        .addFields({ value: `**Vote VP:** ${currentUserVpView}`, name: ' ', inline: false })
        .addFields({ value: `**Current VP:** ${currentVpView}`, name: ' ', inline: false })
        .addFields({ value: `**Pool name:** [${address ? symbol || name || 'n/a' : '`NOT AN OSWAP POOL`'}](${address ? `https://oswap.io/#/swap/${address}` : getAssetUrl(pool_asset)})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false  });

    DiscordService.send(embed);
}