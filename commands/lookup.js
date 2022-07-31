// noinspection ExceptionCaughtLocallyJS

const {SlashCommandBuilder} = require("@discordjs/builders");
const {MessageActionRow, MessageEmbed, MessageSelectMenu} = require('discord.js');
const {query} = require("../db");
const log = require("../logger");
const {idmap, namemap, colourmap, attrs, roles, rarities} = require("../util");

function selectSummary(card) {
    let rarity = rarities[card.rarity];
    if (card.is_fes) rarity = "Fes"
    else if (card.is_party) rarity = "Party"

    let attr = attrs[card.attr];
    let role = roles[card.role];

    let number = "";
    if (card.ur_number) {
        if (card.member_id === 106) number = " (Yohane" + card.ur_number + ")" // special treatment to avoid the ~~
        else number = " (" + idmap[card.member_id].split(" ")[0] + card.ur_number + ")"
    }

    return "#" + card.id + " " + attr.substr(0,1) + role + " " + (card.is_event ? "Event " : "") + rarity + number;
}

function makeEmbed(card) {
    return [
        new MessageEmbed().setTitle("[" + attrs[card.attr].substr(0,1) + roles[card.role] + "] " + (card.is_event ? "Event " : "") +
            (card.is_fes ? "Fes" : (card.is_party ? "Party" : rarities[card.rarity])) + " " + idmap[card.member_id])
            .setThumbnail("https://suyo.be/sifas/wiki/images/card_thumb_idlz/" + card.id + ".png")
            .setColor(colourmap[card.member_id])
            .setDescription("https://allstars.kirara.ca/card/" + card.id)
    ];
}

async function gotLookupResult(interaction, number, err, rows) {
    if (err) {
        log.error("LOOKUP", "Database Error: " + err);
        await interaction.reply({
            content: "**ERROR:** There was a database error during your lookup. It's probably not your fault, so try yelling at <@81125477607014400>.",
            ephemeral: true
        });
        return;
    }
    if (rows === undefined) {
        await interaction.reply({
            content: "The database is currently being updated, please try again in a minute!",
            ephemeral: true
        });
    } else if (rows.length === 0) {
        await interaction.reply({
            content: "**Lookup Failed:** There were no matching cards for this lookup.",
            ephemeral: true
        });
    } else if (number !== undefined) {
        if (number >= rows.length) {
            await interaction.reply({
                content: "**Lookup Failed:** There " + (rows.length === 1 ? "was" : "were") + " " + rows.length + " matching card" + (rows.length === 1 ? "" : "s") + " for this lookup, but you requested card #" + (number + 1) + ".",
                ephemeral: true
            });
        } else {
            await interaction.reply({embeds: makeEmbed(rows[number]), ephemeral: true});
        }
    } else if (rows.length === 1) {
        await interaction.reply({embeds: makeEmbed(rows[0]), ephemeral: true});
    } else {
        await interaction.reply({
            content: "There are multiple results. Please choose:",
            ephemeral: true,
            components: [new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId("lookup")
                        .setPlaceholder(rows.length + " results")
                        .addOptions(rows.map(row => {
                            return {
                                label: selectSummary(row),
                                value: row.member_id + "_" + row.id
                            }
                        })),
                )]
        });

    }
}

module.exports = {
    public: true,
    data: new SlashCommandBuilder()
        .setName("lookup")
        .setDescription("Look up a SIFAS card by number, attribute or type.")
        .addStringOption(option =>
            option.setName("card")
                .setDescription("The card you want to look up. Type \"help\" to see some examples.")
                .setRequired(true)
        ),
    async execute(interaction) {
        let s = interaction.options.getString("card");
        if (s === "help") {
            log.info("LOOKUP", interaction.user.tag + " requested examples");
            await interaction.reply({
                content: "Look up Nozomi's third UR: `/lookup nozomi3`\n" +
                    "Look up all of Nozomi's URs: `/lookup nozo`\n" +
                    " \n" +
                    "Look up Chika's Pure Vo-type URs:\n" +
                    "`/lookup pure vo chika`\n" +
                    "`/lookup p vo chika`\n" +
                    "`/lookup pvo chika`\n" +
                    " \n" +
                    "Look up You's Sk-type URs: `/lookup sk you`\n" +
                    "Look up You's Sk-type SRs: `/lookup you sr sk`\n" +
                    "Look up You's Sk-type Rs: `/lookup r you sk`\n" +
                    " \n" +
                    "Look up Ayumu's Elegant URs:\n" +
                    "`/lookup elegant ayumu`\n" +
                    "`/lookup e pomu`\n" +
                    " \n" +
                    "Look up Kasumi's second Fes UR:\n" +
                    "`/lookup fes kasu 2`\n" +
                    "`/lookup kasumi fes2`\n" +
                    "\n" +
                    "Look up Ai's Party URs: `/lookup party ai`\n" +
                    "Look up Kanan's Event URs: `/lookup event kanan`\n" +
                    "Look up using shorthands: `/lookup Kasumi F2` `/lookup aiP` `/lookup kanane`\n" +
                    "\n" +
                    "All lookups are case-insensitive!\n" +
                    "You must specify a character - this is a lookup tool, not a search engine. [Use the search function on Kirara instead!](<https://allstars.kirara.ca/cards/search>)",
                ephemeral: true
            });
        } else {
            try {
                log.info("LOOKUP", interaction.user.tag + " looks up " + s);

                let memberId = undefined;
                let number = undefined;
                let rarity = undefined;
                let attr = undefined;
                let role = undefined;
                let fesPartyEvent = undefined;

                let m;
                let leftovers = s.split(" ").flatMap(k => {
                    let kk = [k.toLowerCase()];
                    if (kk[0].length === 3 && ["s", "p", "c", "a", "n", "e"].indexOf(kk[0].substring(0, 1)) !== -1 && ["vo", "sp", "gd", "sk"].indexOf(kk[0].substring(1, 3)) !== -1) {
                        // Split up combined Short Attribute + Type keywords
                        kk = [kk[0].substring(0, 1), kk[0].substring(1, 3)];
                    } else if (((m = kk[0].match(/^([efp])(.+?)(\d+)?$/)) !== null && namemap.hasOwnProperty(m[2])) ||
                        ((m = kk[0].match(/^(.+?)([efp])(\d+)?$/)) !== null && namemap.hasOwnProperty(m[1]))) {
                        log.debug("MATCH1", m);
                        // Split up combined Character Name + Card Source (+ optional Number) keywords
                        kk = [namemap.hasOwnProperty(m[1]) ? m[1] : m[2]];
                        let source = namemap.hasOwnProperty(m[1]) ? m[2] : m[1];
                        if (source !== undefined) {
                            kk.push(source === "e" ? "event" : (source === "f" ? "fes" : "party"));
                        }
                        if (m[3] !== undefined) {
                            kk.push(m[3]);
                        }
                    } else if ((m = kk[0].match(/^([efp])(\d+)$/)) !== null) {
                        log.debug("MATCH2", m);
                        // Split up other combined Card Source + Number keywords
                        kk = [m[1] === "e" ? "event" : (m[1] === "f" ? "fes" : "party"),m[2]];
                    } else if ((m = kk[0].match(/^(.+?)(\d+)$/)) !== null) {
                        log.debug("MATCH3", m);
                        // Split up other combined query + Number keywords
                        kk = [m[1],m[2]];
                    }
                    return kk;
                }).filter(k => {
                    if (Number.isInteger(Number(k))) {
                        if (number !== undefined && number !== Number(k)) throw Error("There are two or more conflicting Number filters in your lookup term.");
                        number = Number(k) - 1;
                        if (number < 0) throw Error("The number in your Number filter is invalid.")
                        return false;
                    }

                    if (k === "r") {
                        if (rarity !== undefined && rarity !== 1) throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        rarity = 1;
                        return false;
                    }
                    if (k === "sr") {
                        if (rarity !== undefined && rarity !== 2) throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        rarity = 2;
                        return false;
                    }
                    if (k === "ur") {
                        if (rarity !== undefined && rarity !== 3) throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        rarity = 3;
                        return false;
                    }
                    if (k === "fes") {
                        if ((rarity !== undefined && rarity !== 3) || (fesPartyEvent !== undefined && fesPartyEvent !== "is_fes")) throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        rarity = 3;
                        fesPartyEvent = "is_fes";
                        return false;
                    }
                    if (k === "party") {
                        if ((rarity !== undefined && rarity !== 3) || (fesPartyEvent !== undefined && fesPartyEvent !== "is_party")) throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        rarity = 3;
                        fesPartyEvent = "is_party";
                        return false;
                    }
                    if (k === "event") {
                        if (fesPartyEvent !== undefined && fesPartyEvent !== "is_party") throw Error("There are two or more conflicting Rarity filters in your lookup term.");
                        fesPartyEvent = "is_event";
                        return false;
                    }

                    if (k === "vo") {
                        if (role !== undefined && role !== 1) throw Error("There are two or more conflicting Type filters in your lookup term.");
                        role = 1;
                        return false;
                    }
                    if (k === "sp") {
                        if (role !== undefined && role !== 2) throw Error("There are two or more conflicting Type filters in your lookup term.");
                        role = 2;
                        return false;
                    }
                    if (k === "gd") {
                        if (role !== undefined && role !== 3) throw Error("There are two or more conflicting Type filters in your lookup term.");
                        role = 3;
                        return false;
                    }
                    if (k === "sk") {
                        if (role !== undefined && role !== 4) throw Error("There are two or more conflicting Type filters in your lookup term.");
                        role = 4;
                        return false;
                    }

                    if (k === "s" || k === "smile") {
                        if (role !== undefined && attr !== 1) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 1;
                        return false;
                    }
                    if (k === "p" || k === "pure") {
                        if (role !== undefined && attr !== 2) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 2;
                        return false;
                    }
                    if (k === "c" || k === "cool") {
                        if (role !== undefined && attr !== 3) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 3;
                        return false;
                    }
                    if (k === "a" || k === "active") {
                        if (role !== undefined && attr !== 4) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 4;
                        return false;
                    }
                    if (k === "n" || k === "natural") {
                        if (role !== undefined && attr !== 5) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 5;
                        return false;
                    }
                    if (k === "e" || k === "elegant") {
                        if (role !== undefined && attr !== 6) throw Error("There are two or more conflicting Attribute filters in your lookup term.");
                        attr = 6;
                        return false;
                    }

                    if (namemap.hasOwnProperty(k)) {
                        if (memberId !== undefined && memberId !== mid) throw Error("There are two or more conflicting Character filters in your lookup term.");
                        memberId = namemap[k];
                        return false;
                    }

                    return true; // unrecognized keyword - keep it for error message
                });

                if (leftovers.length === 1) {
                    throw Error("There is an unrecognized keyword in your lookup term: " + leftovers[0]);
                } else if (leftovers.length > 1) {
                    throw Error("There are unrecognized keywords in your lookup term: " + leftovers.join(", "));
                }

                if (memberId === undefined) {
                    throw Error("There is no character name in your lookup term.");
                }
                if (rarity === undefined) rarity = 3; // default to URs only

                let q = 'SELECT *, ' + memberId + ' as member_id FROM "' + memberId + '" WHERE rarity=' + rarity;
                if (attr) q += " AND attr=" + attr;
                if (role) q += " AND role=" + role;
                if (fesPartyEvent) q += " AND " + fesPartyEvent + "=1";

                query(q, gotLookupResult.bind(this, interaction, number));
            } catch (e) {
                await interaction.reply({content: "**Lookup Failed:** " + e.message, ephemeral: true});
            }
        }
    },
    async selection(interaction) {
        log.info("LOOKUP", interaction.user.tag + " made a selection: " + interaction.values[0]);
        let ids = interaction.values[0].split("_");
        await query('SELECT *, ' + Number(ids[0]) + ' AS member_id FROM "' + Number(ids[0]) + '" WHERE id=' + Number(ids[1]), (err, rows) => {
            try {
                interaction.update({
                    content: " ", embeds: makeEmbed(rows[0]), ephemeral: true, components: []
                });
            } catch (e) {
                log.debug("LOOKUP", interaction.user.tag + " made a selection after interaction token expired");
            }
        });
    }
};
