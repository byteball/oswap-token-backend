const { SlashCommandBuilder } = require('discord.js');

const { getExchangeRates } = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gbyte_price')
        .setDescription('Request the current price per GBYTE'),
    async execute(interaction) {
        const rates = await getExchangeRates();

        await interaction.reply(`${rates['GBYTE_USD']} USD for GBYTE`);
    },
};