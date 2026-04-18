-- Add quote column to characters table
ALTER TABLE characters ADD COLUMN quote VARCHAR(200) NULL DEFAULT NULL AFTER name;
