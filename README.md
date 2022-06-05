# SIFAS Card and Map Lookup for Discord

This bot offers two Slash Commands, `/lookup` and `/mapdb` in your server, allowing users to look up SIFAS cards and
maps. This can be useful if others reference cards in ways you are not familiar with, or you're a mobile user who
doesn't want to switch off the app. Replies are ephemeral, so they're only visible to the command user, and you don't
have to worry about spamming the channel if you look up a lot of cards or maps.

Just want to add this to your server? [Have Aran join your Discord server!](https://discord.com/oauth2/authorize?client_id=884344571402780703&scope=applications.commands)  
(Since these are Slash Commands instead of a Bot, Aran will not show up in your user list - only as an Integration, and
when replying to a command.)

## Command Examples

### Card Lookup

*(Also available from the command if you use `/lookup help`)*

Look up Nozomi's third UR: `/lookup nozomi3`  
Look up all of Nozomi's URs: `/lookup nozo`

Look up Chika's Pure Vo-type URs:  
`/lookup pure vo chika`  
`/lookup p vo chika`  
`/lookup pvo chika`

Look up You's Sk-type URs: `/lookup sk you`  
Look up You's Sk-type SRs: `/lookup you sr sk`  
Look up You's Sk-type Rs: `/lookup r you sk`

Look up Ayumu's Elegant URs:  
`/lookup elegant ayumu`  
`/lookup e pomu`

Look up Kasumi's second Fes UR:  
`/lookup fes kasu 2`  
`/lookup kasumi fes2`

Look up Ai's Party URs: `/lookup party ai`  
Look up Kanan's Event URs: `/lookup event kanan`  
Look up using shorthands: `/lookup KasumiF2` `/lookup aiP` `/lookup kanane`

### Map Lookup

`/mapdb CHASE!`  
`/mapdb Arashi` (partial matches work)  
`/mapdb music start` (symbols and case aren't important)  
`/mapdb nsnm` `/mapdb miraboku` `/mapdb OLP` (abbreviations work too)  

## What This Does Not Do

This command is not a search engine. As such, it does not support queries lacking a character name - it is meant to be
used when a certain card is being discussed, but you are unfamiliar with the reference used. It is not supposed to be
used to find cards with a certain trait - there are enough sites with complete search features that can be used for
that. Trying to expand the query syntax and database enough to cover all kinds of possible search filters like Skills or
Abilities would be overkill for a simple command like this.

## Setup

If you want to run this yourself you need to:

* Create a `config.json` file with two keys, `clientId` and `token` (being your app's client ID and bot token)
  * The `guildId` key is optional, if you want to register as a Guild command instead of a Global command
* Have a `lookup.db` SQLite3 database matching the scheme in [database_scheme.sql](database_scheme.sql)
* The `searchindex.js` file required for the Map Lookup is generated from the [Map DB](https://github.com/Suyooo/sifas-mapdb).
* If you're not on Unix/Linux, you probaby need to mess with the socket thing, no idea how other OSes will handle that
  * At least you'll need to change the `SOCKET_FILE` constant in [main.js](main.js) 
  * You can also just comment the entire thing out if you don't need it - it can be used if you want to automatically
    update the database like Aran does. Using the socket you can reload the database without restarting
  * Map Lookup doesn't update the same way because of how the Map DB works - it just loads the file for each request.
