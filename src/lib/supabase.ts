// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test de connexion (optionnel)
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('library_items').select('*').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 = table n'existe pas encore
      console.error('Supabase connection error:', error)
      return false
    }
    console.log('✅ Supabase connected successfully!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}