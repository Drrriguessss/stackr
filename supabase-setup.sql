-- Stackr App Database Schema
-- Run this in your Supabase SQL editor

-- Create the library_items table
CREATE TABLE IF NOT EXISTS public.library_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('games', 'movies', 'music', 'books')),
    status TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    year INTEGER,
    rating NUMERIC,
    image TEXT,
    author TEXT,
    artist TEXT,
    director TEXT,
    developer TEXT,
    genre TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    date_started TIMESTAMPTZ,
    date_completed TIMESTAMPTZ,
    
    -- Game-specific fields
    developers TEXT, -- JSON array
    publishers TEXT, -- JSON array
    genres TEXT, -- JSON array
    background_image TEXT,
    released TEXT,
    
    -- Movie/TV-specific fields
    type TEXT,
    is_movie BOOLEAN,
    is_series BOOLEAN,
    total_seasons INTEGER,
    display_title TEXT,
    overview TEXT,
    runtime TEXT,
    actors TEXT,
    language TEXT,
    country TEXT,
    awards TEXT,
    
    -- Additional info
    additional_info TEXT, -- JSON object
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict later)
CREATE POLICY "Enable all operations for library_items" ON public.library_items
    FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time subscriptions for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_items;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_library_items_updated_at
    BEFORE UPDATE ON public.library_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Test the table
INSERT INTO public.library_items (id, title, category, status) 
VALUES ('test-1', 'Test Game', 'games', 'want-to-play')
ON CONFLICT (id) DO NOTHING;

SELECT 'Database setup complete!' as message;