'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import type { MusicDetailData } from '@/types/musicTypes'
import { musicServiceV2 } from '@/services/musicServiceV2'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'

interface MusicDetailModalV4Props {
  isOpen: boolean
  onClose: () => void
  musicId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onMusicSelect?: (musicId: string) => void
}

export default function MusicDetailModalV4Clean({
  isOpen,
  onClose,
  musicId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onMusicSelect
}: MusicDetailModalV4Props): JSX.Element | null {
  const [musicDetail, setMusicDetail] = useState<MusicDetailData | null>(null)
  const [loading, setLoading] = useState(false)

  // Extract type from musicId
  const isAlbum = musicId.startsWith('album-')
  const formattedMusicId = musicId.startsWith('music-') ? musicId.replace('music-', 'track-') : musicId

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Load music detail
  const fetchMusicDetail = useCallback(async () => {
    if (!formattedMusicId) return
    
    try {
      setLoading(true)
      
      let detail: MusicDetailData | null = null
      
      if (isAlbum) {
        detail = await musicServiceV2.getAlbumDetails(formattedMusicId)
      } else {
        detail = await musicServiceV2.getTrackDetails(formattedMusicId)
        
        // Validation supplémentaire pour les tracks
        if (detail && (!detail.title || detail.title.trim() === '')) {
          console.warn('🎵 [WARNING] Track detail has invalid title, discarding')
          detail = null
        }
      }
      
      setMusicDetail(detail)
      
    } catch (error) {
      console.error('Error fetching music details:', error)
    } finally {
      setLoading(false)
    }
  }, [formattedMusicId, isAlbum])

  useEffect(() => {
    if (isOpen && formattedMusicId) {
      fetchMusicDetail()
    }
  }, [isOpen, formattedMusicId, fetchMusicDetail])

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <StackrLoadingSkeleton />
      </div>
    )
  }

  if (!musicDetail) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#0f0e17] min-h-screen pb-20 font-system overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-gray-400 px-6">
            <div className="text-6xl mb-4">🎵</div>
            <div className="text-lg mb-2">Music not found</div>
            <div className="text-sm mb-6">
              Unable to load details for this {isAlbum ? 'album' : 'track'}.
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0f0e17] min-h-screen pb-20 font-system overflow-y-auto">
      {/* Header with close button */}
      <div className="relative h-[160px] overflow-hidden">
        <img
          src={musicDetail.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1280&h=720&fit=crop&q=80'}
          alt={`${musicDetail.title} backdrop`}
          className="w-full h-full object-cover"
          loading="eager"
        />
        
        <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5">
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Music Info */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-white mb-2">{musicDetail.title}</h1>
        <p className="text-lg text-gray-400 mb-4">{musicDetail.artist}</p>
        
        {musicDetail.description && (
          <div className="text-gray-300 text-sm leading-relaxed mb-6">
            {musicDetail.description}
          </div>
        )}

        {/* Add to Library Button */}
        <div className="mt-6">
          <button
            onClick={() => {
              const musicData = {
                id: musicDetail.id,
                title: musicDetail.title,
                category: 'music' as const,
                image: musicDetail.image,
                year: musicDetail.releaseDate ? new Date(musicDetail.releaseDate).getFullYear() : 2024,
                rating: musicDetail.rating || 4.0,
                artist: musicDetail.artist,
                genre: musicDetail.genre || 'Music',
                duration: musicDetail.duration,
                type: musicDetail.type || (isAlbum ? 'album' : 'single')
              }
              onAddToLibrary(musicData, 'want-to-listen')
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Add to Library
          </button>
        </div>
      </div>
    </div>
  )
}