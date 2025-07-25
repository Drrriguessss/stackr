'use client'
import ContentCard from './ContentCard'
import type { ContentItem, LibraryItem, MediaCategory, MediaStatus } from '@/types'

interface ContentSectionProps {
  title: string
  items: ContentItem[]
  category: MediaCategory
  onAddToLibrary: (item: ContentItem | LibraryItem, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void // ✅ NOUVELLE PROP
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
}

export default function ContentSection({ 
  title, 
  items, 
  category, 
  onAddToLibrary, 
  onDeleteItem, // ✅ NOUVELLE PROP
  library, 
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail
}: ContentSectionProps) {
  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
          See all
        </button>
      </div>
      
      {/* Carrousel horizontal */}
      <div className="flex space-x-4 overflow-x-auto pb-4 horizontal-scroll">
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-32">
            <ContentCard
              item={item}
              category={category}
              onAddToLibrary={onAddToLibrary}
              onDeleteItem={onDeleteItem} // ✅ NOUVELLE PROP PASSÉE
              library={library}
              onOpenGameDetail={onOpenGameDetail}
              onOpenMovieDetail={onOpenMovieDetail}
              onOpenBookDetail={onOpenBookDetail}
              onOpenMusicDetail={onOpenMusicDetail}
            />
          </div>
        ))}
      </div>
    </section>
  )
}