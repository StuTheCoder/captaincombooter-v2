const config = require('../config');
const { MessageEmbed, DataResolver, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');

emojis = undefined;
choosenEmojis = []
mentionedRoleId = undefined;

blocklist = "./data/blocklist.json"

const buttons = {
    yesButton: "notificationYesButton",
    noButton: "notificationNoButton",
    blockButton: "notificationBlockButton"
}

module.exports = {
    name: 'messageCreate',
    execute: async function (message) {
        if (fs.existsSync(blocklist)) {
            allBlockUsers = JSON.parse(fs.readFileSync((blocklist)))
            if (allBlockUsers.includes(message.author.id)) {
                return false;
            }
        }

        mentionedRoleId = message.mentions.roles.keys().next().value;
        const channelId = message.channelId;

        const roleRules = await config.MENTION_ROLE_RULES;

        if (!roleRules || channelId !== roleRules.channelId) {
            return false;
        }

        emojis = roleRules.reactions

        roleRules.reactions.forEach((currentEmoji) => {
            message.react(currentEmoji)
        })
    }
}