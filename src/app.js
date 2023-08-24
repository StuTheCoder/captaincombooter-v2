const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const fs = require("fs")

const config = require("./config");
const reactToRolesMentioned = require('/events/reactToMentionedRole');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions] })

// Add all events files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}



const TOKEN = config.BOT_TOKEN();

client.login(TOKEN)

client.once('ready', () => {
    console.info(`Logged in as ${client.user.tag}!`)

    client.user.setPresence({
        activities: [{ name: `VALORANT`, type: ActivityType.Playing }],
        status: 'online',
    });

})

client.on(Events.InteractionCreate, interaction => {
    interaction.message.channel.messages.fetch(interaction.message.reference.messageId)
    .then((message) => {
        if (!interaction.isButton()) return;
        if (interaction.customId.startsWith("notification")) {
            reactToRolesMentioned.emit(interaction, message)
        }
    })
    .catch(e => console.log(e))
});
