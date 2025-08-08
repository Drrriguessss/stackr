-- Migration: Add 'boardgames' to the media_shares item_type constraint
-- This allows board game sharing to work properly

-- Drop the existing constraint
ALTER TABLE public.media_shares 
DROP CONSTRAINT IF EXISTS media_shares_item_type_check;

-- Add the new constraint with 'boardgames' included
ALTER TABLE public.media_shares 
ADD CONSTRAINT media_shares_item_type_check 
CHECK (item_type IN ('games', 'movies', 'music', 'books', 'boardgames'));

-- Confirm the change
SELECT 'Boardgames item_type added to media_shares successfully!' as message;