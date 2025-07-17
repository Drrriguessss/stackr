// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Variables en dur pour éviter les problèmes d'environnement
const supabaseUrl = 'https://jumpxvlqnzyxifsakzit.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bXB4dmxxbnp5eGlmc2Freml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTg2NTgsImV4cCI6MjA2ODI5NDY1OH0.kYJ0g4bwaZr690Hy6KsUstv5NA5Ac5YBZZFKJeFU5CA'

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Test de connexion
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('library_items').select('*').limit(1)
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase connection error:', error)
      return false
    }
    console.log('✅ Supabase connected successfully!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}