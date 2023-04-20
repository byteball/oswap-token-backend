const dag = require('aabot/dag.js');
const token_registry = require('aabot/token_registry.js');
const conf = require("ocore/conf.js");
const moment = require('moment');

const { getDataByTriggerUnit, getResponseVarsByResponseObj } = require("../utils");
const DiscordService = require("../discord");
const { DbService } = require("../db");

exports.poolListedHandler = async (triggerUnit, responseObj) => {
    const { pool_asset } = getDataByTriggerUnit(triggerUnit);
    const { message } = getResponseVarsByResponseObj(responseObj);

    const poolInfo = await dag.readAAStateVars(process.env.AA_ADDRESS, `pool_${pool_asset}`).then((data) => data[`pool_${pool_asset}`]);

    const symbol = await token_registry.getSymbolByAsset(pool_asset);

    const objJoint = await dag.readJoint(pool_asset);

    const defMsg = objJoint.unit.messages.find(({ app }) => app === "definition");

    let address;

    if (defMsg) {
        address = defMsg.payload.definition[1]?.params?.pool_aa;
    }

    let name = null;

    if (!symbol && address) {
        const poolDef = await dag.readAADefinition(address);

        const xAsset = poolDef[1].params.x_asset;
        const yAsset = poolDef[1].params.y_asset;

        const xSymbol = await token_registry.getSymbolByAsset(xAsset) || (`${xAsset.slice(0, 5)}...`);
        const ySymbol = await token_registry.getSymbolByAsset(yAsset) || (`${yAsset.slice(0, 5)}...`);

        name = `${xSymbol}-${ySymbol}`;
    }

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

    const symbol = await token_registry.getSymbolByAsset(pool_asset);
    const objJoint = await dag.readJoint(pool_asset);

    const defMsg = objJoint.unit.messages.find(({ app }) => app === "definition");

    let address;

    if (defMsg) {
        address = defMsg.payload.definition[1]?.params?.pool_aa;
    }

    let name = null;

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
        .setTitle(`Whitelist: Pool was ${message}`)
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/#/${triggerUnit.unit}`)
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .addFields({ value: `**Pool name:** [${address ? symbol || name : '`NOT AN OSWAP POOL`'}](${address ? `https://oswap.io/#/swap/${address}` : `https://explorer.obyte.org/asset/${pool_asset}`})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .setFooter({ text: 'You can add pool or vote at token.oswap.io' })

    DiscordService.send(embed);
}