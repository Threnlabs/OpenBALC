-- Add fields and domains columns to modules table
ALTER TABLE modules ADD COLUMN fields TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE modules ADD COLUMN domains TEXT[] NOT NULL DEFAULT '{}';
