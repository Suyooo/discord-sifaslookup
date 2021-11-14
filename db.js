const sqlite3 = require("sqlite3").verbose();
const {namemap} = require("./util");
const fs = require("fs");
const axios = require('axios');
const log = require("./logger");
let db = undefined;

function checkCache(err, row) {
    if (err) {
        log.error("DB", err);
        return;
    }
    if (!fs.existsSync("cache/unidlz/" + row.id + ".png")) {
        return row.id;
    } else {
        return undefined;
    }
}

async function loadUnitImagesJSON(ids, tries) {
    log.info("ICON", "Getting card information for " + ids.length + " cards (Try " + (tries + 1) + ")");
    let t = Math.pow(2, tries) * 2;
    axios
        .get("https://allstars.kirara.ca/api/private/cards/ordinal/" + ids.slice(0, 20).join() + ".json") // get max 20 at once
        .then(res => {
            if (res.data.result) {
                for (let i = 0; i < res.data.result.length; i++) {
                    ids.splice(ids.indexOf(res.data.result[i].ordinal), 1);
                    loadUnitImagesThumbnails(res.data.result[i].ordinal, res.data.result[i].normal_appearance.thumbnail_asset_path, res.data.result[i].idolized_appearance.thumbnail_asset_path, 0);
                }
            }
            if (ids.length > 0) {
                tries--;
                throw new Error(ids.length + " cards not returned in API call");
            }
        })
        .catch(error => {
            log.warn("ICON", "Getting card information (Try " + (tries + 1) + "): " + error);
            if (tries === 4) {
                log.error("ICON", "Getting card information (Try " + (tries + 1) + "): Giving up");
            } else {
                log.warn("ICON", "Getting card information (Try " + (tries + 1) + "): Retrying in " + t + "m");
                setTimeout(loadUnitImagesJSON.bind(this, ids, tries + 1), t * 60000);
            }
        })
}

async function loadUnitImagesThumbnails(id, unidlz, idlz, tries) {
    log.info("ICON", "Getting Icons for #" + id + " (Try " + (tries + 1) + "): Queued");
    await new Promise(resolve => setTimeout(resolve, Math.random() * 60000));
    log.info("ICON", "Getting Icons for #" + id + " (Try " + (tries + 1) + "): Start");
    let t = Math.pow(2, tries) * 2;
    let writer1 = fs.createWriteStream("cache/unidlz/" + id + ".png");
    let writer2 = fs.createWriteStream("cache/idlz/" + id + ".png");
    Promise.all([
        axios.get(unidlz, {responseType: 'stream'}).then(r => r.data.pipe(writer1)),
        axios.get(idlz, {responseType: 'stream'}).then(r => r.data.pipe(writer2))
    ]).then(() => log.info("INFO", "Icons for #" + id + " saved")).catch(error => {
        log.warn("ICON", "Getting Icons for #" + id + " (Try " + (tries + 1) + "): " + error);
        if (tries === 4) {
            log.error("ICON", "Getting Icons for #" + id + " (Try " + (tries + 1) + "): Giving up");
        } else {
            log.warn("ICON", "Getting Icons for #" + id + " (Try " + (tries + 1) + "): Retrying in " + t + "m");
            setTimeout(loadUnitImagesThumbnails.bind(this, id, unidlz, idlz, tries + 1), t * 60000);
        }
    });
}

module.exports = {
    closeDB: async function () {
        if (db !== undefined) {
            let p = db.close();
            db = undefined;
            return p;
        }
    },
    loadDB: async function () {
        if (db !== undefined) db.close();
        db = new sqlite3.Database("lookup.db");

        let promises = [];
        let ids = [];
        Object.values(namemap).filter((v, i, arr) => arr.indexOf(v) === i).forEach(i => {
            promises.push(new Promise(((resolve) => {
                db.each('SELECT id FROM "' + i + '"', (err, row) => {
                    let res = checkCache(err, row);
                    if (res !== undefined) ids.push(res);
                }, resolve);
            })));
        });

        await Promise.all(promises);
        if (ids.length > 0) loadUnitImagesJSON(ids, 0);
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