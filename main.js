const fs = require("fs");
const net = require("net");
const log = require("./logger");
const { Client, Collection, Intents } = require("discord.js");
const { token } = require("./config.json");
const { loadDB, closeDB } = require("./db");

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require("./commands/" + file);
    client.commands.set(command.data.name, command);
}

client.once("ready", () => {
    log.info("BOT","Ready!");
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            log.error("BOT","Uncaught Error in command " + interaction.commandName + ": " + error.stack);
            let sendMessage = (interaction.replied || interaction.deferred ? interaction.followUp : interaction.reply).bind(interaction);
            return sendMessage({content: "There was an error while executing this command!", ephemeral: true});
        }
    } else if (interaction.isSelectMenu()) {
        const command = client.commands.get(interaction.customId.split("_")[0]);
        if (!command) return;

        try {
            await command.selection(interaction);
        } catch (error) {
            log.error("BOT","Uncaught Error in selection of command " + command + ": " + error.stack);
            let sendMessage = (interaction.replied || interaction.deferred ? interaction.followUp : interaction.reply).bind(interaction);
            return sendMessage({content: "There was an error while executing this command!", ephemeral: true});
        }
    } else if (interaction.isButton()) {
        const command = client.commands.get(interaction.customId.split("_")[0]);
        if (!command) return;

        try {
            await command.button(interaction);
        } catch (error) {
            log.error("BOT","Uncaught Error in button of command " + command + ": " + error.stack);
            let sendMessage = (interaction.replied || interaction.deferred ? interaction.followUp : interaction.reply).bind(interaction);
            return sendMessage({content: "There was an error while executing this command!", ephemeral: true});
        }
    }
});

(async function() {
    await loadDB();
    await client.login(token);
})();

let server;
const SOCKET = "/tmp/discord-sifaslookup.sock";
if (fs.existsSync(SOCKET)) fs.unlinkSync(SOCKET);
function openSocket() {
    server = net.createServer(function(stream) {
        stream.on("data", function(c) {
            c = c.toString();
            log.debug("SOCKET", "Received " + c);
            if (c.toString() === "close") {
                log.info("SOCKET", "Other process requested to close the DB");
                closeDB().then(() => stream.write("1"),() => stream.write("0")).catch(() => stream.write("0"));
            } else if (c === "open") {
                log.info("SOCKET", "Other process requested to open the DB");
                loadDB().then(() => stream.write("1"),() => stream.write("0")).catch(() => stream.write("0"));
            }
        });
        stream.on("end", function() {
            server.close();
            openSocket();
        });
    });
    server.listen(SOCKET);
}
openSocket();