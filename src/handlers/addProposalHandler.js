const conf = require("ocore/conf.js");
const moment = require("moment");

const DiscordService = require("../discord");
const { getDataByTriggerUnit, addProposalUnitFields, findProposalByTriggerData, getUnitUrl, getAddressUrl } = require("../utils");

exports.addProposalHandler = async (triggerUnit, responseObj) => {
    const { expiry, amount, recipient, unit } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    // the hook can only match on the add_proposal key, which an earlier AA case may have
    // ignored while handling the trigger itself — no state var, no proposal, nothing to report
    const proposal = await findProposalByTriggerData({ recipient, amount, unit, expiry });

    if (!proposal) {
        console.error('[add_proposal] no matching proposal in the AA state, skipping', triggerUnit.unit);
        return;
    }

    // grants are paid out of the reserve, which is bytes (oswap.oscript: $reserve_asset = 'base')
    const amountView = +(amount / 1e9).toFixed(9);

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle(`New proposal #${proposal.num} created`)
        .setTimestamp(ts * 1e3)
        .setURL(getUnitUrl(triggerUnit.unit))
        .addFields({ name: 'Amount', value: `${amountView} GBYTE`, inline: true });

    // the AA requires a parsable expiry, but moment is stricter than parse_date(),
    // so an unparsed date is reported as such instead of rendering as garbage
    const mExpiry = expiry ? moment.utc(expiry) : null;
    if (mExpiry) {
        const expiryView = mExpiry.isValid() ? `${mExpiry.format("lll")} (${mExpiry.fromNow()})` : 'Invalid date';
        embed.addFields({ name: 'Expiry', value: expiryView, inline: true });
    }

    embed.addFields({ name: 'Recipient', value: `[${recipient}](${getAddressUrl(recipient)})`, inline: false });

    if (unit) {
        await addProposalUnitFields(embed, unit);
    }

    embed.addFields({ value: `**Author:** [${author}](${getAddressUrl(author)})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can vote at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false });

    DiscordService.send(embed);
}
