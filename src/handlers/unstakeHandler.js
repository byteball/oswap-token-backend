const conf = require("ocore/conf.js");

const DiscordService = require("../discord");

exports.unstakeHandler = async (triggerUnit, responseObj) => {
    const author = responseObj.trigger_address;
    const ts = triggerUnit.timestamp;
    let amount = 0;

    const messages = responseObj?.objResponseUnit?.messages;

    if (messages) {
        const msg = messages.find((m) => m.app === 'payment' && ('asset' in m.payload) && m.payload.outputs.find((o) => o.address === author));

        if (msg) {
            const output = msg.payload.outputs.find((o) => o.address === author);
            amount = output.amount;
        }
    }

    const amountView = (amount / 10 ** 9).toFixed(9)

    const embed = new DiscordService.EmbedBuilder()
        .setColor(conf.discord_primary_color)
        .setTitle('Staking: unstake OSWAP tokens')
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields({ value: `**Amount:** ${amountView} OSWAP`, name: ' ', inline: false })
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .setFooter({ text: 'You can unstake your OSWAP tokens at token.oswap.io' })

    if (amount > 0) {
        DiscordService.send(embed);
    }
}