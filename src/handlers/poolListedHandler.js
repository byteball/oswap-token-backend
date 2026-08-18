const dag = require('aabot/dag.js');
const conf = require("ocore/conf.js");
const moment = require('moment');

const { getDataByTriggerUnit, getResponseVarsByResponseObj, getPoolAssetInfo, getUnitUrl, getAddressUrl, getAssetUrl } = require("../utils");
const DiscordService = require("../discord");
const { DbService } = require("../db");

exports.poolListedHandler = async (triggerUnit, responseObj) => {
    const { pool_asset } = getDataByTriggerUnit(triggerUnit);
    const { message } = getResponseVarsByResponseObj(responseObj);

    const poolInfo = await dag.readAAStateVars(process.env.AA_ADDRESS, `pool_${pool_asset}`).then((data) => data[`pool_${pool_asset}`]);

    const { symbol, name, address } = await getPoolAssetInfo(pool_asset);

    if (poolInfo && poolInfo.asset_key) {
        await DbService.savePool({
            asset: pool_asset,
            asset_key: poolInfo.asset_key,
            group_key: poolInfo.group_key,
            address: address || null,
            symbol,
            name,
            status: message,
            updated_symbol_ts: moment.utc().unix()
        });
    }
}

exports.poolListedHandlerNotification = async (triggerUnit, responseObj) => {
    const { pool_asset } = getDataByTriggerUnit(triggerUnit);
    const { message } = getResponseVarsByResponseObj(responseObj);
    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const { symbol, name, address } = await getPoolAssetInfo(pool_asset);

    const embed = new DiscordService.EmbedBuilder()
        .setColor(address ? conf.discord_primary_color : conf.discord_error_color)
        .setTitle(`Whitelist: Pool was ${message}`)
        .setTimestamp(ts * 1e3)
        .setURL(getUnitUrl(triggerUnit.unit))
        .addFields({ value: `**Author:** [${author}](${getAddressUrl(author)})`, name: ' ', inline: false })
        .addFields({ value: `**Pool name:** [${address ? symbol || name || 'n/a' : '`NOT AN OSWAP POOL`'}](${address ? `https://oswap.io/#/swap/${address}` : getAssetUrl(pool_asset)})`, name: ' ', inline: false })
        .addFields({ value: 'You can add pool or vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')

    DiscordService.send(embed);
}