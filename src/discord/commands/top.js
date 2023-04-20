const { SlashCommandBuilder } = require('discord.js');
const moment = require("moment");
const dag = require('aabot/dag.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Request top 10 stakers of OSWAP token'),
    async execute(interaction) {
        const usersData = await dag.readAAStateVars(process.env.AA_ADDRESS, `user_`);

        let users = [];

        Object.entries(usersData).forEach(([key, data]) => {
            const split = key.split("_");
            if (split.length === 2) {
                const address = split[1];

                users.push({ address, balance: data.balance, expiry: moment.unix(data.expiry_ts).format("LL") })
            }
        });

        const fields = users
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10)
            .map((u) => ({
                name: ' ',
                value: `${u.address} staked ${+(u.balance / 10 ** 9).toFixed(9)} OSWAP until ${u.expiry}`
            }));

        const exampleEmbed = {
            title: 'Top 10 stakers',
            color: 2711295,
            fields,
            thumbnail: {
                url: 'https://token.oswap.io/logo.png',
            },
        };

        await interaction.reply({ embeds: [exampleEmbed] });
    },
};