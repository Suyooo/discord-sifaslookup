// noinspection ExceptionCaughtLocallyJS

const {SlashCommandBuilder} = require("@discordjs/builders");
const {MessageEmbed} = require('discord.js');
const log = require("../logger");
const fs = require("fs");
const fuzzysort = require("../node_modules/fuzzysort/fuzzysort.min"); // must load minified since it mangles object property names

function makeEmbed(res) {
    if (res.length === 1) {
        return [
            new MessageEmbed().setTitle(res[0].name)
                .setThumbnail("https://suyo.be/sifas/wiki/images/song_jacket/" + res[0].lid + ".png")
                .setColor("#ffcc80")
                .setDescription("https://suyo.be/sifas/mapdb/?live" + res[0].ldid)
        ];
    } else {
        let e = new MessageEmbed().setTitle("Multiple results - only showing up to five")
            .setThumbnail("https://suyo.be/sifas/wiki/images/song_jacket/" + res[0].lid + ".png")
            .setColor("#ffcc80")
        for (const r of res) e.addField(r.name, "https://suyo.be/sifas/mapdb/?live" + r.ldid, false);
        return [e];
    }
}

module.exports = {
    public: true,
    data: new SlashCommandBuilder()
        .setName("mapdb")
        .setDescription("Look up a SIFAS song.")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("Your search term. Can be romanized, Kana/Kanji, abbreviations...")
                .setRequired(true)
        ),
    async execute(interaction) {
        let s = interaction.options.getString("query");
        log.info("MAPDB", interaction.user.tag + " looks up " + s);
        try {
            const searchindex = JSON.parse(fs.readFileSync("searchindex.js").subarray(18));
            let pluses = 0;
            while (s.charAt(s.length - 1) === "+") {
                s = s.substr(0, s.length - 1);
                pluses++;
            }

            let res = fuzzysort.go(s, searchindex, {
                "keys": ["romaji", "romaji_clean", "hiragana", "katakana", "kanji", "kanji_clean", "abbr_kn", "abbr_ro"],
                threshold: -500, limit: 5,
                scoreFn: a => Math.max(...a.map(x => x ? x.score : -10000))
            }).map(a => {
                return {
                    "lid": a.obj.lid,
                    "ldid": a.obj.ldid,
                    "ldid_advp": a.obj.ldid_advp,
                    "ldid_chal": a.obj.ldid_chal,
                    "name": a.obj.romaji.target
                }
            });

            if (pluses > 0) {
                let potentialFilteredRes = res.filter(a => (pluses === 1) ? a.ldid_advp !== undefined : a.ldid_chal !== undefined);
                if (potentialFilteredRes.length > 0) {
                    potentialFilteredRes.forEach(a => {
                        a.ldid = (pluses === 1) ? a.ldid_advp : a.ldid_chal;
                        a.name += (pluses === 1) ? " (Adv+)" : " (Challenge)";
                    });
                    res = potentialFilteredRes;
                } else {
                    potentialFilteredRes = res.filter(a => (pluses === 1) ? a.ldid_chal !== undefined : a.ldid_advp !== undefined);
                    if (potentialFilteredRes.length > 0) {
                        potentialFilteredRes.forEach(a => {
                            a.ldid = (pluses === 1) ? a.ldid_chal : a.ldid_advp;
                            a.name += (pluses === 1) ? " (Challenge)" : " (Adv+)";
                        });
                        res = potentialFilteredRes;
                    }
                }
            }

            if (res.length > 0)
                await interaction.reply({embeds: makeEmbed(res), ephemeral: true});
            else
                await interaction.reply({content: "**Lookup Failed:** No results for your query.", ephemeral: true});
        } catch (e) {
            await interaction.reply({content: "**Lookup Failed:** " + e.message, ephemeral: true});
        }
    }
};
