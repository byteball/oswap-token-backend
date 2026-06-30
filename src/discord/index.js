const { Client, GatewayIntentBits, Collection, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const conf = require("ocore/conf.js");

const token = require('./commands/token');
const gbyte = require('./commands/gbyte');
const top = require('./commands/top');

// how many times login() retries before giving up and killing the process
const MAX_LOGIN_ATTEMPTS = 10;

class DiscordService {
    constructor() {
        this.EmbedBuilder = EmbedBuilder;
        this.ready = false;
        this.activityInterval = null;

        this.#createClient();
    }

    // builds a fresh client + registers handlers.
    // called again on re-login because a failed client.login() destroys the client.
    #createClient() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

        this.client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            console.error('[discord] received command:', interaction.commandName);

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error('[discord] no handler registered for command:', interaction.commandName);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[discord] error executing ${interaction.commandName}:`, error && error.message);
                console.error(error);
            }
        });

        // surface gateway-level problems that previously vanished silently
        this.client.on(Events.Error, err => console.error('[discord] client error:', err && err.message));
        this.client.on(Events.ShardError, err => console.error('[discord] shard error:', err && err.message));

        this.client.once(Events.ClientReady, () => {
            this.ready = true;

            if (this.client.user.username !== conf.discord_bot_name) {
                // async REST call — must be caught, or a rejection becomes an
                // uncaughtException (ocore rethrows it) and crashes the process
                this.client.user.setUsername(conf.discord_bot_name)
                    .catch(err => console.error('[discord] failed to set username:', err && err.message));
            }

            this.enableActivity();

            console.error(`[discord] logged in as ${this.client.user.tag}`);
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

        console.error(`[discord] registered application (/) commands`);

    }

    // resolves once logged in. retries with capped backoff up to MAX_LOGIN_ATTEMPTS,
    // then logs a fatal error and kills the process (so a supervisor can restart cleanly)
    // instead of spinning forever. A failed login() destroys the client and nulls the
    // REST token, which used to surface much later as "Expected token to be set" in send().
    async login() {
        for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt++) {
            try {
                await this.client.login(process.env.DISCORD_TOKEN);
                return;
            } catch (err) {
                this.ready = false;
                console.error(`[discord] login failed (attempt ${attempt}/${MAX_LOGIN_ATTEMPTS}): ${err && err.message}`);

                if (attempt === MAX_LOGIN_ATTEMPTS) {
                    console.error(`[discord] giving up after ${MAX_LOGIN_ATTEMPTS} attempts — exiting process`);
                    process.exit(1);
                }

                const delay = Math.min(60000, 5000 * attempt);
                console.error(`[discord] retrying in ${delay / 1000}s`);
                await new Promise(resolve => setTimeout(resolve, delay));
                // the failed login destroyed the client; rebuild before retrying
                this.#createClient();
            }
        }
    }

    #setBotActivity() {
        // user may be null briefly around (re)connect; ?. avoids a TypeError in the interval
        return this.client.user?.setActivity({ type: 3, name: process.env.AA_ADDRESS, url: "https://token.oswap.io" });
    }

    enableActivity() {
        this.#setBotActivity();
        if (this.activityInterval) clearInterval(this.activityInterval);
        this.activityInterval = setInterval(this.#setBotActivity.bind(this), 1000 * 60 * 24);
    }

    async send(objEmbed) {
        if (!this.ready) {
            console.error('[discord] not ready — skipping notification (bot is not logged in)');
            return;
        }

        try {
            const channel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL);
            await channel.send({ embeds: [objEmbed] });
        } catch (err) {
            // never let a Discord failure bubble up into the AA event handler and crash the process
            console.error('[discord] failed to send notification:', err && err.message);
        }
    }

}

module.exports = new DiscordService();
