const conf = require("ocore/conf.js");

const DiscordService = require("../discord");
const { getDataByTriggerUnit, addProposalUnitFields, getProposal, getUnitUrl, getAddressUrl } = require("../utils");

exports.paramCommitHandler = async (triggerUnit, responseObj) => {
    const { name, value, num } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    // grant proposals are committed under the fixed name 'proposal' plus a mandatory num
    // (oswap.oscript: response['committed'] = 'proposal_' || $num)
    const isProposal = name === 'proposal';
    const proposal = isProposal ? await getProposal(num) : null;
    const title = isProposal ? `Proposal #${num} decision committed` : 'Parameters: New value committed';

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle(title)
        .setTimestamp(ts * 1e3)
        .setURL(getUnitUrl(triggerUnit.unit))
        .addFields({ name: isProposal ? 'Proposal' : 'Parameter', value: isProposal ? `#${num}` : name, inline: true })
        .addFields({ name: isProposal ? 'Decision' : 'Value', value: String(value), inline: true });

    if (proposal?.unit) {
        await addProposalUnitFields(embed, proposal.unit);
    }

    embed.addFields({ value: `**Author:** [${author}](${getAddressUrl(author)})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false });

    DiscordService.send(embed);
}