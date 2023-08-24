const dotenv = require('dotenv').config()
const fs = require('fs')

const config = {}


module.exports = {
    BOT_TOKEN: function () {
        return process.env.BOT_TOKEN
    },
    /**
     * Returns the rules from config.json by the given role id. Returns undefined if no role found
     * @param {number} id
     * @returns roleRules
     */
    MENTION_ROLE_RULES: function (id) {
        return new Promise((resolve, reject) => {
            const config = getConfig()
            let allRules = config.rolesToReactTo.roleRules

            allRules.forEach((currentRole) => {
                if (currentRole.roleId === id) resolve(currentRole)
            })
        })
    },
    /**
    * Returns the notification rules from config.json. Returns undefined if no role found
    * @returns notificationRules
    */
    NOTIFICATION_RULES: function () {
        return getConfig().rolesToReactTo.options
    },
}

/**
 * Loads config and override it with dev config
 * @returns config
 */
function getConfig() {
    let config = require("./config.json")
    // check if override config exists and load it
    if (fs.existsSync('./config.dev.json')) {
        const overrideConfig = require('./config.dev.json')
        config = { ...config, ...overrideConfig } // merge and override config with overrideConf
    }
    return config
}