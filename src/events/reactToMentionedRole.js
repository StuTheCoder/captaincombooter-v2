const config = require("../config")
const { MessageEmbed, DataResolver, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, Embed } = require('discord.js');
const fs = require('fs')

emojis = undefined
choosenEmojis = []
mentionedRoleId = undefined

blocklist = "./data/blocklist.json"

const buttons = {
    yesButton: "notificationYesButton",
    noButton: "notificationNoButton",
    blockButton: "notificationBlockButton"
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Filter opt-outed people
        if (fs.existsSync(blocklist)) {
            allBlockedUsers = JSON.parse(fs.readFileSync((blocklist)))
            if (allBlockedUsers.includes(message.author.id)) return
        }
        // Get id of mentioned role in a message
        // ToDo check all mentioned roles/not just the first
        mentionedRoleId = message.mentions.roles.keys().next().value
        const channelId = message.channelId

        const roleRules = await config.MENTION_ROLE_RULES(mentionedRoleId);

        // Check if rules are existing and channel id the set one from config
        if (!roleRules || channelId !== roleRules.channelId) return

        emojis = roleRules.reactions

        // React with all emojis given in config
        roleRules.reactions.forEach((currentEmoji) => {
            message.react(currentEmoji)
        })

        // Ask for notification if enabled
        if (config.NOTIFICATION_RULES.askForNotifications === false) return

        const destructionTimer = config.NOTIFICATION_RULES().askForNotificationsTimout

        const embed = getNotificationEmbed(destructionTimer)


        // Preparing buttons for embed
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(buttons.yesButton)
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success),
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(buttons.noButton)
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger),
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(buttons.blockButton)
                    .setLabel('Don\'t ask me again')
                    .setStyle(ButtonStyle.Danger),
            );

        await message.reply({ embeds: [embed], components: [row] });

    },
    async emit(interaction, message) {
        if (interaction.customId === buttons.noButton) interaction.message.delete();

        let embed = askForReactionNotification();
        if (interaction.customId === buttons.yesButton) {
            const row = new ActionRowBuilder()
            emojis.forEach((currentEmoji) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`notificationHandler-${currentEmoji}`)
                        .setLabel(`${currentEmoji}`)
                        .setStyle(ButtonStyle.Primary),
                )
            })
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId("notificationHandler-save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success)
            )

            interaction.update({ embeds: [embed], components: [row]})
        } else if (interaction.customId === buttons.blockButton) {


            const user = message.author.id
            if (!fs.existsSync(blocklist)) {
                fs.mkdirSync("data")
                fs.writeFileSync(blocklist, "[]")
            }

            // Put userid in blocklist
            allBlockedUsers = JSON.parse(fs.readFileSync((blocklist)))
            allBlockedUsers.push(user)
            fs.writeFileSync(blocklist, JSON.stringify(allBlockedUsers))


            await message.author.send("Okay, I'll dont ask again. (Nah I'm lying tbh)")
            await interaction.message.delete()
        }

        if (interaction.customId === "notificationHandler-save") {
            if (choosenEmojis.length > 0) {
                message.react("🗑️")

                // To have a full list of all users who reacted to the message
                // ToDo Users should be removed from this list if they revoke their reaction
                let reactionsWithUsers = {}
                choosenEmojis.forEach(emoji => {
                    reactionsWithUsers[emoji] = []
                })

                // Actually wait for the reactions and notify the user if reactions are added
                let notifyUser = true
                const notificationTimeout = config.NOTIFICATION_RULES().timeoutForNotifications
                let notifyCollector = message.createReactionCollector({ time: notificationTimeout })

                notifyCollector.on('collect', (reaction, user) => {
                    if (user.id === message.author.id && reaction._emoji.name === "🗑️") {
                        notifyUser = false
                        message.author.send("Notifications deactivated!")
                    }

                    if (!notifyUser) return

                    // This prevents users from spamming with readding their reaction
                    if (!choosenEmojis.includes(reaction._emoji.name) || (reactionsWithUsers[reaction._emoji.name].includes(user.id))) return

                    reactionsWithUsers[reaction._emoji.name].push(user.id)
                    const reportEmbed = getReportEmbed(reaction, user, message, reactionsWithUsers, mentionedRoleId)
                    message.author.send({ embeds: [reportEmbed] })


                })
            }
            interaction.message.delete()

        } else if (interaction.customId.startsWith("notificationHandler-")) {
            let emote = interaction.customId.split("-")[1]
            choosenEmojis.push(emote)

            // Updating view
            embed.addFields({ name: "Reactions where to notificate:", value: `${choosenEmojis.join(", ")}`})
            interaction.update({ embeds: [embed]})
        }


    }
};


function getNotificationEmbed(timeout) {
    const embed = new EmbedBuilder()
        .setColor('#141014')
        .setTitle('Notifications on reactions')
        .setDescription('Do you want to get notifications if some has reacted to?')
    return embed
}

function askForReactionNotification() {
    return emed = new EmbedBuilder()
        .setColor('#141014')
        .setTitle('Notifications on reactions')
        .setDescription('On which reactions you want to get notified?')
}

function getReportEmbed(reaction, collector, message, reactionsWithUsers, roleID) {
    const messageContent = message.content.replace(`<\@\&${roleID}>`, "@some-role") // Removes that @deleted-role from notification messages

    const embed = new EmbedBuilder()
        .setColor('#141014')
        .addFields(
            { name: 'Someone reacted to your message', value: `<@${collector.id}> reacted with ${reaction._emoji.name}`, inline: false},
            { name: "Your message", value: `\> ${messageContent}`}
        )
        .setFooter({ text: "Captain Coalition", iconURL: "https://cdn.discordapp.com/icons/329211845720276992/52734b508929961e0731c00dd2c9f4ae.webp?size=96"})

    Object.keys(reactionsWithUsers).forEach(currentEmoji => {
        if (reactionsWithUsers[currentEmoji].length === 0) return

        let usersString = ""
        for (let i = 0; i <= reactionsWithUsers[currentEmoji].length - 1; i++) {
            usersString = usersString + `<@${reactionsWithUsers[currentEmoji][i]}>`

            // only add ", " if current user isn't the last one
            if (!(i === reactionsWithUsers[currentEmoji].length - 1)) {
                usersString = usersString + ", "
            }
        }

        embed.addFields({
            name: `Reacted with ${currentEmoji}`, value: `${usersString}`
        })
    })

    return embed
}
