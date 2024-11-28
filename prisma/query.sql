-- SELECT * FROM `item_simulator`.`Accounts` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`Classes` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`Items` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`Characters` LIMIT 1000;
-- SELECT * FROM `item_simulator`.`CharacterItems` LIMIT 1000;
SELECT * FROM `item_simulator`.`CharacterInventory` LIMIT 1000;

-- DESC Accounts;
-- DESC Classes;
-- DESC Characters;
-- DESC Items;
-- DESC CharacterInventory;

-- DROP TABLE Classes, BasicItems, Items, Characters, CharacterInventory, CharacterItems;
-- DROP TABLE Items;

-- UPDATE item_simulator.Characters
-- SET characterMoney = 10000000
-- WHERE accountId = 5

-- ALTER TABLE item_simulator.CharacterInventory
-- ADD COLUMN itemName VARCHAR(255);

-- UPDATE item_simulator.CharacterInventory ci
-- JOIN item_simulator.Items i 
-- ON ci.itemId = i.itemId
-- SET ci.itemName = i.itemName;