const { SlashCommandBuilder } = require('discord.js');
const db = require("ocore/db.js");
const conf = require("ocore/conf.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Request up-to-date information about OSWAP token'),
	async execute(interaction) {
		const [last_trade] = await db.query(
			`SELECT * FROM ${conf.project_db_prefix || ""}_trades ORDER BY timestamp DESC LIMIT 1`
		);

		const { price, supply, reserve } = last_trade;

		const priceView = price.toFixed(4);
		const supplyView = (supply / 1e9).toFixed(9);
		const reserveView = (reserve / 1e9).toFixed(9);

		const exampleEmbed = {
			title: 'OSWAP token info',
			color: 2711295,
			fields: [
				{ name: 'Price', value: `${priceView} GBYTE`, inline: false },
				{ name: 'Supply', value: `${supplyView} OSWAP`, inline: true },
				{ name: 'Reserve', value: `${reserveView} GBYTE`, inline: true },
				{ name: "\u200B", value: `You can get current info at [token.oswap.io](https://token.oswap.io).`, inline: false }
			],
			thumbnail: {
				url: 'https://token.oswap.io/logo.png',
			},
			
		};

		await interaction.reply({ embeds: [exampleEmbed] });
	},
};