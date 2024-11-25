-- SELECT * FROM `item_simulator`.`Accounts` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`Classes` LIMIT 1000;
SELECT * FROM `item_simulator`.`Items` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`Characters` LIMIT 1000;

-- DESC Accounts;
-- DESC Classes;
-- DESC Characters;
-- DESC Items;


-- INSERT INTO Classes
-- (className, classHp, classPower, classSpeed)
-- VALUES
-- ('전사', 1000, 100, 10)
-- , ('도적', 700, 110, 12)
-- , ('마법사', 850, 120, 8)
-- , ('사제', 900, 90, 9)

-- INSERT INTO Items
-- (itemName, itemStat, itemPrice, classId)
-- VALUES
-- ('강철심장', '{"hp": 900, "power": 12}', 3000, 1)
-- , ('밤의 끝자락', '{"hp": 250, "power": 70}', 3000, 2)
-- , ('라바돈의 죽음 모자', '{"hp":0, "power": 120}', 3600, 3)
-- , ('불타는 향로', '{"hp": 100, "power": 45}', 2200, 4)

-- INSERT INTO BasicItems
-- (itemId, classId)
-- VALUES
-- (1, 1)
-- , (2, 2)
-- , (3, 3)
-- , (4, 4)

-- DROP TABLE Classes, BasicItems, Items, Characters, CharacterInventory, CharacterItems;
-- DROP TABLE Items;

-- UPDATE Items
-- SET itemCode = 2
-- WHERE itemId = 2