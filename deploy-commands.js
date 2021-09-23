const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v8');
const { clientId, guildId, token } = require('./config.json');

const testCommands = [];
const publicCommands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        if (command.public) publicCommands.push(command.data.toJSON());
        else testCommands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '8' }).setToken(token);

(async () => {
    try {
        if (publicCommands.length > 0)
            console.log("Public", await rest.put(
                Routes.applicationCommands(clientId),
                { body: publicCommands },
            ));
        if (testCommands.length > 0) {
            console.log("Test", await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: testCommands },
            ));
        }

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
})();
