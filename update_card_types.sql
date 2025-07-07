-- Update Card Types Migration Script
-- This script updates the database schema to support new card types

-- Drop existing check constraint on player_cards.card_type
ALTER TABLE player_cards DROP CONSTRAINT IF EXISTS player_cards_card_type_check;

-- Add new check constraint with expanded card types
ALTER TABLE player_cards ADD CONSTRAINT player_cards_card_type_check 
CHECK (card_type IN ('passenger', 'follower', 'hijacker', 'baby', 'couple', 'single'));

-- Update the comment for clarity
COMMENT ON COLUMN player_cards.card_type IS 'Card type: passenger, follower, hijacker, baby, couple, single';

-- Show confirmation
SELECT 'Card types updated successfully' AS message; 