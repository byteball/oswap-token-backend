const moment = require("moment");
const dag = require('aabot/dag.js');
const conf = require("ocore/conf.js");

const { DbService } = require("../db");
const DiscordService = require("../discord");
const { getDataByTriggerUnit } = require("../utils")

exports.stakeHandler = async (triggerUnit, responseObj) => {
    const payload = getDataByTriggerUnit(triggerUnit);
    const author = payload?.to || responseObj.trigger_address;
    const ts = triggerUnit.timestamp;
    const poolKeys = Object.keys(payload.percentages);
    const untilDate = moment.unix(ts).add(payload.term, 'days').format("LL");
    const tokenAsset = await dag.readAAStateVars(process.env.AA_ADDRESS, `constants`).then((vars) => vars.constants.asset);

    let amount = 0;

    const msg = triggerUnit?.messages?.find(({ app, payload }) => app === 'payment' && payload && payload?.asset === tokenAsset && payload?.outputs.find(({ address }) => address === process.env.AA_ADDRESS));

    if (msg) {
        amount += msg.payload.outputs.find(({ address }) => address === process.env.AA_ADDRESS)?.amount
    }

    const amountView = +(amount / 1e9).toFixed(9);

    const pools = [];
    let hasNotOswapPool = false;

    for (asset_key of poolKeys) {
        const poolInfo = await DbService.getPoolInfoByKeys(payload.group_key, asset_key);

        pools.push({
            percent: payload.percentages[asset_key],
            view: poolInfo?.symbol || poolInfo?.name || "NOT AN OSWAP POOL",
            address: poolInfo?.address,
            asset: poolInfo?.asset,
        })

        if (!(poolInfo?.address)) {
            hasNotOswapPool = true
        }
    }

    const name = ' ';
    const fields = pools.map(({ view, percent, address, asset }) => ({ value: address ? `[${String(view)}](https://oswap.io/#/swap/${address}) — ${String(percent)}%` : `${`[\`NOT AN OSWAP POOL\`](https://explorer.obyte.org/asset/${asset}})`} — ${String(percent)}%`, name, inline: false }));

    const amountFields = amount > 0 ? [{ value: `**Amount:** ${amountView} OSWAP`, name, inline: false }] : [];


    const embed = new DiscordService.EmbedBuilder()
        .setColor(!hasNotOswapPool ? conf.discord_primary_color : conf.discord_error_color)
        .setTitle(`Staking: ${amount > 0 ? "stake" : "re-stake"} OSWAP tokens`)
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields(amountFields)
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .addFields({ value: `**Term:** ${payload.term} days (until ${untilDate})`, name, inline: false })
        .addFields({ value: "**Pool list**", name })
        .addFields(fields)
        .setThumbnail('https://token.oswap.io/logo.png')
        .setFooter({ text: 'You can stake OSWAP token at token.oswap.io' });

    DiscordService.send(embed);

}