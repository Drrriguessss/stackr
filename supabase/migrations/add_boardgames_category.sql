-- Migration: Add 'boardgames' to the category constraint
-- This allows board games to be saved as a distinct category from video games

-- Drop the existing constraint
ALTER TABLE public.library_items 
DROP CONSTRAINT IF EXISTS library_items_category_check;

-- Add the new constraint with 'boardgames' included
ALTER TABLE public.library_items 
ADD CONSTRAINT library_items_category_check 
CHECK (category IN ('games', 'movies', 'music', 'books', 'boardgames'));

-- Confirm the change
SELECT 'Boardgames category added successfully!' as message;