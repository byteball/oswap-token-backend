const { SlashCommandBuilder } = require('discord.js');

const { getExchangeRates } = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gbyte_price')
        .setDescription('Request the current price per GBYTE'),
    async execute(interaction) {
        const rates = await getExchangeRates();

        // the hub does not always know the rate
        if (!rates['GBYTE_USD']) {
            return interaction.reply('The GBYTE price is not available right now, please try again later.');
        }

        await interaction.reply(`${rates['GBYTE_USD']} USD for GBYTE`);
    },
};