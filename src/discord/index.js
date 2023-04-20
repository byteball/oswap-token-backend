const { Client, GatewayIntentBits, Collection, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const conf = require("ocore/conf.js");

const token = require('./commands/token');
const gbyte = require('./commands/gbyte');
const top = require('./commands/top');

class DiscordService {
    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.EmbedBuilder = EmbedBuilder;
        this.ready = false;

        this.client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
            }
        });

        this.client.commands = new Collection();

        this.client.commands.set(token.data.name, token);
        this.client.commands.set(gbyte.data.name, gbyte);
        this.client.commands.set(top.data.name, top);
    }

    async initCommands() {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_GUILD_ID),
            { body: [token.data.toJSON(), gbyte.data.toJSON(),  top.data.toJSON()] },
        );

        console.error(`Successfully reloaded application (/) commands.`);

    }

    login() {
        this.client.on('ready', () => {
            this.ready = true;

            if (this.client.user.username !== conf.discord_bot_name) {
                this.client.user.setUsername(conf.discord_bot_name);
            }

            this.enableActivity();

            console.error(`Logged in Discord as ${this.client.user.tag}!`);
        });

        return this.client.login(process.env.DISCORD_TOKEN)
    }

    #setBotActivity() {
        return this.client.user.setActivity({ type: 3, name: process.env.AA_ADDRESS, url: "https://token.oswap.io" });
    }

    enableActivity() {
        this.#setBotActivity();
        setInterval(this.#setBotActivity.bind(this), 1000 * 60 * 24);
    }

    async send(objEmbed) {
        const channel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL);
        await channel.send({ embeds: [objEmbed] });
    }

}

module.exports = new DiscordService();