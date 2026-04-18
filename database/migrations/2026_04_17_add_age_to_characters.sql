-- Round 3: add age column to characters (sanity-check user skill experience inputs)
ALTER TABLE characters ADD COLUMN age TINYINT UNSIGNED NULL AFTER name;
