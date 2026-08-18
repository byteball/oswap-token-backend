const dag = require('aabot/dag.js');
const conf = require("ocore/conf.js");

const { getDataByTriggerUnit, getCurrentVpByNormalized, addProposalUnitFields, getProposal, getUnitUrl, getAddressUrl } = require("../utils")
const DiscordService = require("../discord");

exports.paramVotesHandler = async (triggerUnit, responseObj) => {
    const { name, value, num } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const userData = await dag.readAAStateVars(process.env.AA_ADDRESS, `user_${author}`).then(vars => vars[`user_${author}`]);

    if (!userData) return;

    // grant proposals are voted on under the fixed name 'proposal' plus a mandatory num,
    // and tallied under proposal<num> (oswap.oscript: $full_name = $name || $num)
    const isProposal = name === 'proposal';
    const fullName = isProposal ? `${name}${num}` : name;
    const proposal = isProposal ? await getProposal(num) : null;

    const leader = await dag.readAAStateVars(process.env.AA_ADDRESS, `leader_${fullName}`).then(vars => vars[`leader_${fullName}`]);

    // there may be no leader yet (first vote for this parameter), in which case there is no
    // value_votes_ var to read either — value can legitimately be 0, so compare with undefined
    const hasLeader = leader?.value !== undefined;

    const leaderVp = hasLeader
        ? await dag.readAAStateVars(process.env.AA_ADDRESS, `value_votes_${fullName}_${leader.value}`).then(vars => vars[`value_votes_${fullName}_${leader.value}`])
        : null;

    const leaderVpView = hasLeader ? Number(getCurrentVpByNormalized(leaderVp || 0) / 10 ** 9).toFixed(9) : 'N/A';

    const voteVp = getCurrentVpByNormalized(userData.normalized_vp || 0);
    const voteVpView = +Number(voteVp / 10 ** 9).toFixed(9);

    const currentVP = await dag.readAAStateVars(process.env.AA_ADDRESS, `value_votes_${fullName}_${value}`).then(vars => vars[`value_votes_${fullName}_${value}`] || 0);
    const currentVpView = +Number(getCurrentVpByNormalized(currentVP) / 10 ** 9).toFixed(9);

    const title = isProposal ? `New vote for proposal #${num}` : `Parameter vote: ${name}`;

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle(title)
        .setTimestamp(ts * 1e3)
        .setURL(getUnitUrl(triggerUnit.unit))
        .addFields({ name: isProposal ? 'Vote' : 'Value', value: String(value), inline: true })
        .addFields({ name: 'Vote VP', value: String(voteVpView), inline: true })
        .addFields({ name: 'Current VP', value: String(currentVpView), inline: true })
        .addFields({ name: 'Leader', value: hasLeader ? String(leader.value) : 'N/A', inline: true })
        .addFields({ name: 'Leader VP', value: String(leaderVpView), inline: true })
        .addFields({ name: '\b', value: '\b', inline: true });

    if (proposal?.unit) {
        await addProposalUnitFields(embed, proposal.unit);
    }

    embed.addFields({ value: `**Author:** [${author}](${getAddressUrl(author)})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false });

    DiscordService.send(embed);
}