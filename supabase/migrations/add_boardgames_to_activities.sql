-- Migration: Add 'boardgames' to the activities item_type constraint
-- This allows board game activities to be saved

-- Drop the existing constraint
ALTER TABLE public.activities 
DROP CONSTRAINT IF EXISTS activities_item_type_check;

-- Add the new constraint with 'boardgames' included
ALTER TABLE public.activities 
ADD CONSTRAINT activities_item_type_check 
CHECK (item_type IN ('games', 'movies', 'music', 'books', 'boardgames'));

-- Confirm the change
SELECT 'Boardgames item_type added to activities successfully!' as message;