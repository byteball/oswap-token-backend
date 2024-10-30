const conf = require("ocore/conf.js");

const DiscordService = require("../discord");
const { getDataByTriggerUnit } = require("../utils")
const { DbService } = require("../db");

exports.moveHandler = async (triggerUnit, responseObj) => {
    const { changes, group_key1, group_key2 } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;
    const changesData = [];
    let hasNonOswapPool;

    for ([asset_key, vp] of Object.entries(changes)) {
        let poolInfo;

        poolInfo = await DbService.getPoolInfoByKeys(group_key1, asset_key);

        if (!poolInfo) {
            poolInfo = await DbService.getPoolInfoByKeys(group_key2, asset_key);
        }

        changesData.push({ symbol: poolInfo.symbol, name: poolInfo.name, change: vp, address: poolInfo.address, asset: poolInfo.asset });

        if (!poolInfo.address) hasNonOswapPool = true;
    }

    const fields = changesData.map(({ change, address, symbol, name, asset }) => {
        const nameView = symbol || name;
        const vpView = +Number(change / 10 ** 9).toFixed(9);

        return ({ value: `${vpView > 0 ? `added ${Math.abs(vpView)} to` : `removed ${Math.abs(vpView)} from`} ${address ? `[${String(nameView)}](https://oswap.io/#/swap/${address})` : `[\`NOT AN OSWAP POOL\`](https://explorer.obyte.org/asset/${asset})`}`, name: ' ', inline: false });
    });

    const embed = new DiscordService.EmbedBuilder()
        .setColor(!hasNonOswapPool ? conf.discord_primary_color : conf.discord_error_color)
        .setTitle('Staking: move votes')
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .addFields({ value: "**Changes**", name: ' ' })
        .addFields(fields)
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can move votes at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false  });

    DiscordService.send(embed);
}