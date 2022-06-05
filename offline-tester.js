const mapdb = require("./commands/mapdb.js");
const log = require("./logger");
const {loadDB} = require("./db");

const stdin = process.openStdin();

stdin.addListener("data", function(d) {
    mapdb.execute({
        options: {
            getString: () => d.toString().trim()        },
        user: {
            tag: "OfflineTester#0000"
        },
        reply: (reply) => {
            if (reply.components && reply.components.length > 0) {
                for (let i in reply.components[0].components[0].options) {
                    log.debug("TEST", reply.components[0].components[0].options[i].label);
                }
            } else if (reply.content && reply.content !== "") log.debug("TEST", reply.content);
            else log.debug("TEST", reply.embeds[0].title);
        }
    });
});

(async function() {
    await loadDB();
    console.log("You can now enter a lookup term.")
})();