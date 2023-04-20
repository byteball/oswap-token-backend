const conf = require("ocore/conf.js");

const DiscordService = require("../discord");
const { getDataByTriggerUnit } = require("../utils");

exports.paramCommitHandler = async (triggerUnit, responseObj) => {
    const { name, value } = getDataByTriggerUnit(triggerUnit);

    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle(`Parameters: New value committed`)
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/#/${triggerUnit.unit}`)
        .addFields({ name: 'Parameter', value: name, inline: true })
        .addFields({ name: 'Value', value: String(value), inline: true })
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .setFooter({ text: 'You can vote at token.oswap.io' })

    DiscordService.send(embed);
}