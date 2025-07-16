'use client'
import ContentCard from './ContentCard'
import type { ContentItem, LibraryItem, MediaCategory, MediaStatus } from '@/types'

interface ContentSectionProps {
  title: string
  items: ContentItem[]
  category: MediaCategory
  onAddToLibrary: (item: ContentItem, status: MediaStatus) => void
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
}

export default function ContentSection({ 
  title, 
  items, 
  category, 
  onAddToLibrary, 
  library, 
  onOpenGameDetail 
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
              library={library}
              onOpenGameDetail={onOpenGameDetail}
            />
          </div>
        ))}
      </div>
    </section>
  )
}