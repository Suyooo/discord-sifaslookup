CREATE TABLE "1" (
    "id"        INTEGER NOT NULL, -- same as the School Idol No. in-game
    "rarity"	INTEGER NOT NULL, -- 1-indexed: R, SR, UR
    "attr"      INTEGER NOT NULL, -- 1-indexed: Smile, Pure, Cool, Active, Natural, Elegant
    "role"      INTEGER NOT NULL, -- 1-indexed: Vo, Sp, Gd, Sk
    "is_fes"	INTEGER NOT NULL, -- 0 or 1
    "is_party"	INTEGER NOT NULL, -- 0 or 1
    "is_event"	INTEGER NOT NULL, -- 0 or 1
    "name"      TEXT    NOT NULL, -- JP card name (unidolized and idolized)
    PRIMARY KEY ("id")
)

-- one table is created for each member, with the table name being the member's ID
-- The member ID is the character's 1-indexed position in official order, plus a number for the group they're in:
-- 0: µ's, 100: Aqours, 200: Nijigaku
-- So for example, Kanan is the third member in Aqours => 100 + 3 = 103

-- Indexes are created for each table for each key to speed up lookups