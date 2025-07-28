// src/components/ImageFormatComparison.tsx - Comparaison des formats d'images

'use client'

import { useState, useEffect } from 'react'
import SteamImageService from '@/services/steamImageService'

interface GameExample {
  name: string
  steamAppId: string
  rawgBackground?: string
}

const GAME_EXAMPLES: GameExample[] = [
  {
    name: 'Cyberpunk 2077',
    steamAppId: '1091500',
    rawgBackground: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg'
  },
  {
    name: 'Elden Ring', 
    steamAppId: '1245620',
    rawgBackground: 'https://media.rawg.io/media/games/5ec/5ecac5cb35e5b1c2a7b489b2b5b86337.jpg'
  },
  {
    name: 'Baldur\'s Gate 3',
    steamAppId: '1086940',
    rawgBackground: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg'
  },
  {
    name: 'GTA V',
    steamAppId: '271590',
    rawgBackground: 'https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg'
  }
]

export default function ImageFormatComparison() {
  const [selectedGame, setSelectedGame] = useState<GameExample>(GAME_EXAMPLES[0])
  const [imageLoadingStatus, setImageLoadingStatus] = useState<Record<string, boolean>>({})

  const handleImageLoad = (format: string) => {
    setImageLoadingStatus(prev => ({ ...prev, [format]: true }))
  }

  const handleImageError = (format: string) => {
    setImageLoadingStatus(prev => ({ ...prev, [format]: false }))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-6">🎮 Comparaison des formats d'images</h2>
      
      {/* Sélecteur de jeu */}
      <div className="mb-8">
        <label className="block text-lg font-medium mb-3">Choisir un jeu :</label>
        <div className="flex flex-wrap gap-2">
          {GAME_EXAMPLES.map((game) => (
            <button
              key={game.steamAppId}
              onClick={() => setSelectedGame(game)}
              className={`px-4 py-2 rounded font-medium transition-all ${
                selectedGame.steamAppId === game.steamAppId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {game.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Format horizontal actuel (problématique) */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3 text-red-400">
            ❌ Format actuel (Header - Horizontal)
          </h3>
          <div className="aspect-[460/215] bg-gray-700 rounded overflow-hidden mb-3">
            <img
              src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.steamAppId}/header.jpg`}
              alt={`${selectedGame.name} header`}
              className="w-full h-full object-cover"
              onLoad={() => handleImageLoad('header')}
              onError={() => handleImageError('header')}
            />
          </div>
          <div className="text-sm text-gray-400">
            <p><strong>Ratio :</strong> ~2.1:1 (horizontal)</p>
            <p><strong>Problème :</strong> Ne correspond pas aux posters de films</p>
            <p><strong>Status :</strong> {imageLoadingStatus.header !== undefined 
              ? (imageLoadingStatus.header ? '✅ Disponible' : '❌ Indisponible')
              : '⏳ Chargement...'
            }</p>
          </div>
        </div>

        {/* Format portrait idéal (solution) */}
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-green-500">
          <h3 className="text-xl font-bold mb-3 text-green-400">
            ✅ Format IDÉAL (Library - Portrait)
          </h3>
          <div className="aspect-[600/900] bg-gray-700 rounded overflow-hidden mb-3 max-h-80">
            <img
              src={SteamImageService.getBestPortraitImage(selectedGame.steamAppId)}
              alt={`${selectedGame.name} portrait`}
              className="w-full h-full object-cover"
              onLoad={() => handleImageLoad('portrait')}
              onError={() => handleImageError('portrait')}
            />
          </div>
          <div className="text-sm text-gray-400">
            <p><strong>Ratio :</strong> 2:3 (portrait)</p>
            <p><strong>Avantage :</strong> ✨ Identique aux posters de films</p>
            <p><strong>Status :</strong> {imageLoadingStatus.portrait !== undefined 
              ? (imageLoadingStatus.portrait ? '✅ Disponible' : '❌ Indisponible')
              : '⏳ Chargement...'
            }</p>
          </div>
        </div>

        {/* Format RAWG (comparaison) */}
        {selectedGame.rawgBackground && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-3 text-yellow-400">
              ⚠️ Format RAWG (Background)
            </h3>
            <div className="aspect-[16/9] bg-gray-700 rounded overflow-hidden mb-3">
              <img
                src={selectedGame.rawgBackground}
                alt={`${selectedGame.name} RAWG background`}
                className="w-full h-full object-cover"
                onLoad={() => handleImageLoad('rawg')}
                onError={() => handleImageError('rawg')}
              />
            </div>
            <div className="text-sm text-gray-400">
              <p><strong>Ratio :</strong> 16:9 (horizontal)</p>
              <p><strong>Problème :</strong> Screenshots, pas des couvertures</p>
              <p><strong>Status :</strong> {imageLoadingStatus.rawg !== undefined 
                ? (imageLoadingStatus.rawg ? '✅ Disponible' : '❌ Indisponible')
                : '⏳ Chargement...'
              }</p>
            </div>
          </div>
        )}
      </div>

      {/* Comparaison côte à côte */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold mb-6">📊 Comparaison côte à côte</h3>
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex justify-center items-end gap-6 flex-wrap">
            
            {/* Carte film (référence) */}
            <div className="text-center">
              <h4 className="text-lg font-medium mb-3 text-blue-400">📽️ Film (référence)</h4>
              <div className="w-48 aspect-[2/3] bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
                POSTER FILM
                <br />
                (2:3 ratio)
              </div>
            </div>

            {/* Carte jeu - format horizontal (problème) */}
            <div className="text-center">
              <h4 className="text-lg font-medium mb-3 text-red-400">🎮 Jeu actuel (problème)</h4>
              <div className="w-48 bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.steamAppId}/header.jpg`}
                  alt="Format actuel"
                  className="w-full h-auto"
                />
                <div className="p-2 text-sm text-red-300">
                  Format étiré/déformé
                </div>
              </div>
            </div>

            {/* Carte jeu - format portrait (solution) */}
            <div className="text-center">
              <h4 className="text-lg font-medium mb-3 text-green-400">🎮 Jeu corrigé (solution)</h4>
              <div className="w-48 aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={SteamImageService.getBestPortraitImage(selectedGame.steamAppId)}
                  alt="Format corrigé"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-400">
            <p className="text-lg">
              🎯 <strong>Objectif :</strong> Tous les éléments doivent avoir la même forme (ratio 2:3)
            </p>
          </div>
        </div>
      </div>

      {/* Informations techniques */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">🔧 Informations techniques</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-400 mb-2">✅ Solution implémentée :</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Utilisation du format Steam <code>library_600x900.jpg</code></li>
              <li>• Ratio 2:3 identique aux posters de films</li>
              <li>• Pas de redimensionnement (qualité préservée)</li>
              <li>• Fallback intelligent vers autres formats</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-2">🛠️ Modifications apportées :</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <code>steamSpyService.ts</code> - Nouveau format d'image</li>
              <li>• <code>rawgService.ts</code> - Détection Steam App ID</li>
              <li>• <code>steamImageService.ts</code> - Service dédié aux images</li>
              <li>• Interface visuelle cohérente pour tous les médias</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}