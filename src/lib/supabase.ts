// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Variables d'environnement chargées de manière sécurisée

// Utilisation des variables d'environnement pour la sécurité
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Vérification que les variables d'environnement sont bien définies
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

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