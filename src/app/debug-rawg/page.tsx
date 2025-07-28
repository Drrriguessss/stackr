'use client'
import { useEffect } from 'react'
import { testRAWGAPI, testPopularGamesImages } from '@/utils/rawgApiTest'

export default function DebugRAWGPage() {
  useEffect(() => {
    // Exécuter l'audit au chargement de la page
    const runAudit = async () => {
      console.log('🚀 Démarrage de l\'audit RAWG...')
      await testRAWGAPI()
      await testPopularGamesImages()
    }
    
    runAudit()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Debug RAWG API</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Ouvrez la console du navigateur (F12)</li>
            <li>Regardez les logs détaillés de l'audit RAWG</li>
            <li>Vérifiez si les images sont disponibles</li>
            <li>Analysez les structures de données retournées</li>
          </ol>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Endpoints testés:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><code>/api/games/[id]</code> - Détails du jeu</li>
            <li><code>/api/games/[id]/screenshots</code> - Screenshots</li>
            <li><code>/api/games/[id]/movies</code> - Vidéos/trailers</li>
            <li><code>/api/games/[id]/additions</code> - DLCs</li>
          </ul>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Jeux testés:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>The Witcher 3 (ID: 3328)</li>
            <li>Red Dead Redemption 2 (ID: 28)</li>
            <li>Portal 2 (ID: 4200)</li>
            <li>Tomb Raider (ID: 5286)</li>
            <li>Portal (ID: 13536)</li>
            <li>Cyberpunk 2077 (ID: 41494)</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Les résultats de l'audit apparaissent dans la console du navigateur.
            <br />
            Appuyez sur F12 pour ouvrir les outils de développement.
          </p>
        </div>
      </div>
    </div>
  )
}