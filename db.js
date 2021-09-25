const sqlite3 = require("sqlite3").verbose();
const {namemap} = require("./util");
const fs = require("fs");
const axios = require('axios');
const log = require("./logger");
let db = undefined;

async function checkCache(err, row) {
    if (err) {
        log.error("DB", err);
        return;
    }
    if (!fs.existsSync("cache/" + row.id + ".png")) {
        loadUnitImage(row.id, 0);
    }
}

async function loadUnitImage(id, tries) {
    log.info("ICON","Getting Icon for #" + id + " (Try " + (tries + 1) + "): Queued");
    await new Promise(resolve => setTimeout(resolve, Math.random() * 60000));
    log.info("ICON","Getting Icon for #" + id + " (Try " + (tries + 1) + "): Start");
    let t = Math.pow(2, tries) * 2;
    axios
        .get("https://allstars.kirara.ca/api/private/cards/ordinal/" + id + ".json")
        .then(res => {
            let writer = fs.createWriteStream("cache/" + id + ".png");
            axios.get(res.data.result[0].idolized_appearance.thumbnail_asset_path, { responseType: 'stream' })
                .then(r => r.data.pipe(writer)).then(() => log.info("INFO", "Icon for #" + id + " saved"));
        })
        .catch(error => {
            log.warn("ICON","Getting Icon for #" + id + " (Try " + (tries + 1) + "): " + error);
            if (tries === 4) {
                log.error("ICON","Getting Icon for #" + id + " (Try " + (tries + 1) + "): Giving up");
            } else {
                log.warn("ICON","Getting Icon for #" + id + " (Try " + (tries + 1) + "): Retrying in " + t + "m");
                setTimeout(loadUnitImage.bind(this, id, tries + 1), t * 60000);
            }
        })
}

module.exports = {
    closeDB: async function () {
        if (db !== undefined) {
            let p = db.close();
            db = undefined;
            return p;
        }
        return new Promise((resolve) => { resolve() });
    },
    loadDB: async function () {
        if (db !== undefined) db.close();
        db = new sqlite3.Database("lookup.db");

        let promises = [];
        Object.values(namemap).filter((v, i, arr) => arr.indexOf(v) === i).forEach(i => {
            promises.push(db.each('SELECT id FROM "' + i + '"', checkCache));
        });

        return Promise.all(promises);
    },
    query: async function (query, callback) {
        if (db === undefined) {
            callback(undefined, undefined);
        } else {
            log.debug("DB", "Executing Query: " + query);
            db.all(query, callback);
        }
    }
}