const conf = require("ocore/conf.js");

const DiscordService = require("../discord");

exports.withdrawRewardHandler = async (triggerUnit, responseObj) => {
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
        .setTitle('Staking: withdraw rewards')
        .setTimestamp(ts * 1e3)
        .setURL(`https://explorer.obyte.org/${triggerUnit.unit}`)
        .addFields({ value: `**Amount:** ${amountView} OSWAP`, name: ' ', inline: false })
        .addFields({ value: `**Author:** [${author}](https://explorer.obyte.org/address/${author})`, name: ' ', inline: false })
        .setThumbnail('https://token.oswap.io/logo.png')
        .addFields({ value: 'You can withdraw your OSWAP rewards at [token.oswap.io](https://token.oswap.io)', name: ' ', inline: false  });

    if ((amount / 10 ** 9) >= conf.discord_withdraw_reward_threshold) {
        DiscordService.send(embed);
    }
}
