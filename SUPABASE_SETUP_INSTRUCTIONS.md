# 🚀 Supabase Setup Instructions for Stackr App

## Problem Identified
Your current Supabase project is returning "Invalid API key" errors, which is why cross-device sync isn't working. The app falls back to localStorage-only mode.

## Solution: Create Fresh Supabase Project

### Step 1: Create New Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose a project name (e.g., "stackr-library")
4. Select a region close to you
5. Create a secure database password
6. Wait for the project to initialize (2-3 minutes)

### Step 2: Set Up Database Schema
1. In your new Supabase project, go to **SQL Editor**
2. Copy the contents of `supabase-setup.sql` 
3. Paste it in the SQL editor and click **Run**
4. You should see "Database setup complete!" message

### Step 3: Get New API Keys
1. Go to **Settings** → **API**
2. Copy the **Project URL** 
3. Copy the **anon public** key

### Step 4: Update Your App
Replace the values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_NEW_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

### Step 5: Test the Connection
Run this to verify everything works:
```bash
npm run dev
```

Open browser console and look for:
- ✅ "Supabase connected successfully!"
- 📡 "Real-time database change detected"

## What This Fixes

✅ **Real-time cross-device sync**
✅ **Proper error handling** 
✅ **Database persistence**
✅ **All library operations**

## Migration of Existing Data

If you have data in localStorage that you want to keep:

1. Before updating `.env.local`, export your current library:
   - Open browser console
   - Run: `JSON.stringify(JSON.parse(localStorage.getItem('stackr_library')))`
   - Save the output to a file

2. After setting up new Supabase, manually add important items back

## Testing Cross-Device Sync

1. Open app on mobile and PC
2. Add an item on mobile
3. Check PC - should appear within 5 seconds
4. Browser console should show sync logs

## Troubleshooting

If sync still doesn't work:
- Check browser console for errors
- Verify the database table exists in Supabase
- Test with `node test-supabase.js` script
- Ensure both devices have internet connection

The real-time sync system is already implemented in your code - it just needs a working Supabase backend!