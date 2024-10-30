const dag = require('aabot/dag.js');
const conf = require("ocore/conf.js");

const { getDataByTriggerUnit, getCurrentVpByNormalized } = require("../utils")
const DiscordService = require("../discord");

exports.paramVotesHandler = async (triggerUnit, responseObj) => {
    const { name, value } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const userData = await dag.readAAStateVars(process.env.AA_ADDRESS, `user_${author}`).then(vars => vars[`user_${author}`]);
    const leader = await dag.readAAStateVars(process.env.AA_ADDRESS, `leader_${name}`).then(vars => vars[`leader_${name}`]);
    const leaderVp = await dag.readAAStateVars(process.env.AA_ADDRESS, `value_votes_${name}_${leader.value}`).then(vars => vars[`value_votes_${name}_${leader.value}`]);
    const leaderVpView = Number(getCurrentVpByNormalized(leaderVp || 0) / 10 ** 9).toFixed(9);

    if (!userData) return;

    const voteVp = getCurrentVpByNormalized(userData.normalized_vp || 0);
    const voteVpView = +Number(voteVp / 10 ** 9).toFixed(9);

    const currentVP = await dag.readAAStateVars(process.env.AA_ADDRESS, `value_votes_${name}_${value}`).then(vars => vars[`value_votes_${name}_${value}`] || 0);
    const currentVpView = +Number(getCurrentVpByNormalized(currentVP) / 10 ** 9).toFixed(9);

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle(`Parameters: support added in ${name}`)
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields({ name: 'Value', value: String(value), inline: true })
        .addFields({ name: 'Vote VP', value: String(voteVpView), inline: true })
        .addFields({ name: 'Current VP', value: String(currentVpView), inline: true })
        .addFields({ name: 'Leader', value: String(leader.value), inline: true })
        .addFields({ name: 'Leader VP', value: String(leaderVpView), inline: true })
        .addFields({ name: '\b', value: '\b', inline: true })
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false });

    DiscordService.send(embed);
}